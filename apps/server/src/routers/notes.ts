import {
	NOTE_CONTENT_MAX_LENGTH,
	titleKey,
	validateNoteTitle,
} from "@busuucsal-v3/notes";
import { TRPCError } from "@trpc/server";
import {
	and,
	arrayContains,
	asc,
	desc,
	eq,
	ilike,
	isNull,
	ne,
	or,
	type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { noteLinks, notes } from "../db/schema/index.js";
import {
	badRequest,
	conflict,
	escapeLike,
	isUniqueViolation,
	notFound,
} from "../services/notes/db.js";
import { requireDestination } from "../services/notes/folders.service.js";
import {
	assertTitleAvailable,
	autoTagsForClass,
	linkCounts,
	propagateRename,
	requireActiveNote,
	resolveWikilinkTargets,
	resyncNotesMentioning,
	syncWikilinks,
	toSummary,
} from "../services/notes/notes.service.js";
import {
	compactSiblings,
	nextPosition,
	placeItem,
	reorderSiblings,
} from "../services/notes/ordering.service.js";
import { trashNote } from "../services/notes/trash.service.js";
import { protectedProcedure, router } from "../trpc/index.js";

const titleInput = z.string().max(1000);
const contentInput = z
	.string()
	.max(NOTE_CONTENT_MAX_LENGTH, "A nota passou do tamanho máximo (200 KB).");
const tagsInput = z.array(z.string().trim().min(1).max(60)).max(50);

function validTitle(raw: string): string {
	const result = validateNoteTitle(raw);
	if (!result.ok) throw badRequest(result.error);
	return result.value;
}

/** Tags do aluno sem repetição (sem diferenciar caixa), na ordem em que vieram. */
function cleanTags(tags: string[]): string[] {
	const seen = new Set<string>();
	return tags.filter((tag) => {
		const key = tag.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function rethrowTitleConflict(error: unknown, title: string): never {
	if (isUniqueViolation(error))
		throw conflict(`Já existe uma nota chamada "${title}".`);
	throw error;
}

const linkedNoteFields = {
	id: notes.id,
	title: notes.title,
	tags: notes.tags,
	createdAt: notes.createdAt,
};

const linkFields = {
	id: noteLinks.id,
	sourceNoteId: noteLinks.sourceNoteId,
	targetNoteId: noteLinks.targetNoteId,
	similarityScore: noteLinks.similarityScore,
	linkType: noteLinks.linkType,
	reason: noteLinks.reason,
	createdAt: noteLinks.createdAt,
};

export const notesRouter = router({
	/** Notas ativas do aluno. Sem `folderId`, de todas as pastas; `null` = raiz. */
	list: protectedProcedure
		.input(
			z
				.object({
					folderId: z.string().uuid().nullable().optional(),
					classSessionId: z.string().uuid().optional(),
					tag: z.string().optional(),
					search: z.string().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const conditions: Array<SQL | undefined> = [
				eq(notes.userId, ctx.user.id),
				isNull(notes.deletedAt),
			];
			if (input?.folderId !== undefined) {
				conditions.push(
					input.folderId === null
						? isNull(notes.folderId)
						: eq(notes.folderId, input.folderId),
				);
			}
			if (input?.classSessionId) {
				conditions.push(eq(notes.classSessionId, input.classSessionId));
			}
			if (input?.tag) {
				conditions.push(
					or(
						arrayContains(notes.tags, [input.tag]),
						arrayContains(notes.autoTags, [input.tag]),
					),
				);
			}
			const search = input?.search?.trim();
			if (search) {
				const pattern = `%${escapeLike(search)}%`;
				conditions.push(
					or(ilike(notes.title, pattern), ilike(notes.content, pattern)),
				);
			}

			const results = await ctx.db
				.select()
				.from(notes)
				.where(and(...conditions))
				.orderBy(
					...(input?.folderId !== undefined
						? [asc(notes.position), asc(notes.title)]
						: [desc(notes.updatedAt)]),
				);
			const counts = await linkCounts(
				ctx.db,
				results.map((note) => note.id),
			);
			return results.map((note) => toSummary(note, counts.get(note.id) ?? 0));
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const note = await requireActiveNote(ctx.db, ctx.user.id, input.id);

			const outbound = (
				await ctx.db
					.select({ ...linkFields, targetNote: linkedNoteFields })
					.from(noteLinks)
					.innerJoin(notes, eq(noteLinks.targetNoteId, notes.id))
					.where(
						and(eq(noteLinks.sourceNoteId, note.id), isNull(notes.deletedAt)),
					)
			).map(({ targetNote, ...link }) => ({ ...link, targetNote }));

			const inbound = (
				await ctx.db
					.select({ ...linkFields, sourceNote: linkedNoteFields })
					.from(noteLinks)
					.innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id))
					.where(
						and(eq(noteLinks.targetNoteId, note.id), isNull(notes.deletedAt)),
					)
			).map(({ sourceNote, ...link }) => ({ ...link, sourceNote }));

			return {
				...note,
				outboundLinks: outbound,
				inboundLinks: inbound,
				wikilinks: await resolveWikilinkTargets(
					ctx.db,
					ctx.user.id,
					note.content,
				),
			};
		}),

	create: protectedProcedure
		.input(
			z.object({
				title: titleInput,
				content: contentInput.optional().default(""),
				tags: tagsInput.optional().default([]),
				classSessionId: z.string().uuid().optional(),
				folderId: z.string().uuid().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			const title = validTitle(input.title);

			try {
				return await ctx.db.transaction(async (tx) => {
					const folderId = await requireDestination(tx, userId, input.folderId);
					await assertTitleAvailable(tx, userId, title);
					const autoTags = await autoTagsForClass(
						tx,
						input.classSessionId ?? null,
					);
					const position = await nextPosition(tx, "note", userId, folderId);

					const [created] = await tx
						.insert(notes)
						.values({
							userId,
							title,
							content: input.content,
							tags: cleanTags(input.tags),
							autoTags,
							classSessionId: input.classSessionId,
							folderId,
							position,
						})
						.returning();
					if (!created) throw new Error("Falha ao criar a nota");

					await syncWikilinks(tx, userId, created.id, created.content);
					const affectedNoteIds = await resyncNotesMentioning(
						tx,
						userId,
						title,
						created.id,
					);
					return {
						...toSummary(created),
						content: created.content,
						affectedNoteIds,
					};
				});
			} catch (error) {
				rethrowTitleConflict(error, title);
			}
		}),

	/**
	 * Salva a nota. Com `expectedUpdatedAt`, recusa (CONFLICT) se a nota mudou
	 * no servidor depois dessa data — o app então pergunta qual versão manter.
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				title: titleInput.optional(),
				content: contentInput.optional(),
				tags: tagsInput.optional(),
				classSessionId: z.string().uuid().nullable().optional(),
				expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			const title =
				input.title === undefined ? undefined : validTitle(input.title);

			try {
				return await ctx.db.transaction(async (tx) => {
					const existing = await requireActiveNote(tx, userId, input.id);

					if (
						input.expectedUpdatedAt &&
						existing.updatedAt.getTime() >
							new Date(input.expectedUpdatedAt).getTime()
					) {
						throw new TRPCError({
							code: "CONFLICT",
							message:
								"Esta nota foi alterada em outro lugar depois que você começou a editar.",
						});
					}

					const titleChanged = title !== undefined && title !== existing.title;
					if (titleChanged && titleKey(title) !== titleKey(existing.title)) {
						await assertTitleAvailable(tx, userId, title, existing.id);
					}

					const updateData: Partial<typeof notes.$inferInsert> = {
						updatedAt: new Date(),
					};
					if (titleChanged) updateData.title = title;
					if (input.content !== undefined) updateData.content = input.content;
					if (input.tags !== undefined) updateData.tags = cleanTags(input.tags);
					if (input.classSessionId !== undefined) {
						updateData.classSessionId = input.classSessionId;
						updateData.autoTags = await autoTagsForClass(
							tx,
							input.classSessionId,
						);
					}

					const [updated] = await tx
						.update(notes)
						.set(updateData)
						.where(eq(notes.id, existing.id))
						.returning();
					if (!updated) throw notFound("Nota não encontrada");

					const affected = new Set<string>();
					if (
						input.content !== undefined &&
						input.content !== existing.content
					) {
						await syncWikilinks(tx, userId, updated.id, updated.content);
					}
					if (titleChanged) {
						for (const id of await propagateRename(
							tx,
							userId,
							updated.id,
							existing.title,
							updated.title,
						)) {
							affected.add(id);
						}
						for (const id of await resyncNotesMentioning(
							tx,
							userId,
							updated.title,
							updated.id,
						)) {
							affected.add(id);
						}
					}

					return {
						...toSummary(updated),
						content: updated.content,
						affectedNoteIds: [...affected],
					};
				});
			} catch (error) {
				rethrowTitleConflict(error, title ?? "");
			}
		}),

	/** Envia a nota para a lixeira. Os vínculos ficam guardados para voltar ao restaurar. */
	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.transaction(async (tx) => {
				const note = await requireActiveNote(tx, ctx.user.id, input.id);
				await trashNote(tx, note.id);
				await compactSiblings(tx, "note", ctx.user.id, note.folderId);
			});
			return { success: true, id: input.id };
		}),

	/** Move a nota para outra pasta (`null` = raiz), opcionalmente numa posição. */
	move: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				folderId: z.string().uuid().nullable(),
				position: z.number().int().min(0).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			return ctx.db.transaction(async (tx) => {
				const note = await requireActiveNote(tx, userId, input.id);
				const folderId = await requireDestination(tx, userId, input.folderId);
				if (note.folderId !== folderId) {
					await tx
						.update(notes)
						.set({ folderId, updatedAt: new Date() })
						.where(eq(notes.id, note.id));
				}
				await placeItem(tx, "note", userId, folderId, note.id, input.position);
				if (note.folderId !== folderId) {
					await compactSiblings(tx, "note", userId, note.folderId);
				}
				return { success: true, id: note.id, folderId };
			});
		}),

	/** Reordena as notas de uma pasta. */
	reorder: protectedProcedure
		.input(
			z.object({
				folderId: z.string().uuid().nullable(),
				orderedIds: z.array(z.string().uuid()).max(1000),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			return ctx.db.transaction(async (tx) => {
				await requireDestination(tx, userId, input.folderId);
				const orderedIds = await reorderSiblings(
					tx,
					"note",
					userId,
					input.folderId,
					input.orderedIds,
				);
				return { orderedIds };
			});
		}),

	/** Vínculo semântico (manual ou sugerido pela IA), com justificativa. */
	addLink: protectedProcedure
		.input(
			z.object({
				sourceNoteId: z.string().uuid(),
				targetNoteId: z.string().uuid(),
				reason: z
					.string()
					.trim()
					.min(3, "A justificativa deve ter no mínimo 3 caracteres"),
				linkType: z
					.enum(["manual", "ai_suggested"])
					.default("manual")
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.sourceNoteId === input.targetNoteId) {
				throw badRequest("Uma nota não pode ser vinculada a ela mesma");
			}
			const userId = ctx.user.id;
			await requireActiveNote(
				ctx.db,
				userId,
				input.sourceNoteId,
				"Nota de origem não encontrada",
			);
			await requireActiveNote(
				ctx.db,
				userId,
				input.targetNoteId,
				"Nota de destino não encontrada",
			);

			const [existingLink] = await ctx.db
				.select({ id: noteLinks.id })
				.from(noteLinks)
				.where(
					and(
						eq(noteLinks.sourceNoteId, input.sourceNoteId),
						eq(noteLinks.targetNoteId, input.targetNoteId),
						ne(noteLinks.linkType, "wikilink"),
					),
				);
			if (existingLink) throw conflict("Este vínculo já existe entre as notas");

			const [newLink] = await ctx.db
				.insert(noteLinks)
				.values({
					sourceNoteId: input.sourceNoteId,
					targetNoteId: input.targetNoteId,
					reason: input.reason,
					linkType: input.linkType ?? "manual",
					similarityScore: "1.00",
				})
				.returning();
			return newLink;
		}),

	removeLink: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [link] = await ctx.db
				.select({ id: noteLinks.id, linkType: noteLinks.linkType })
				.from(noteLinks)
				.innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id))
				.where(and(eq(noteLinks.id, input.id), eq(notes.userId, ctx.user.id)));
			if (!link) throw notFound("Vínculo não encontrado");
			if (link.linkType === "wikilink") {
				throw badRequest(
					"Este vínculo vem de um [[link]] no texto: remova o link da nota.",
				);
			}
			await ctx.db.delete(noteLinks).where(eq(noteLinks.id, input.id));
			return { success: true, id: input.id };
		}),

	suggestLinks: protectedProcedure
		.input(z.object({ noteId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const currentNote = await requireActiveNote(
				ctx.db,
				ctx.user.id,
				input.noteId,
			);

			const existingLinks = await ctx.db
				.select({
					source: noteLinks.sourceNoteId,
					target: noteLinks.targetNoteId,
				})
				.from(noteLinks)
				.where(
					or(
						eq(noteLinks.sourceNoteId, currentNote.id),
						eq(noteLinks.targetNoteId, currentNote.id),
					),
				);

			const linkedNoteIds = new Set<string>([currentNote.id]);
			for (const link of existingLinks) {
				linkedNoteIds.add(link.source);
				linkedNoteIds.add(link.target);
			}

			const otherNotes = await ctx.db
				.select()
				.from(notes)
				.where(
					and(eq(notes.userId, currentNote.userId), isNull(notes.deletedAt)),
				);

			const suggestions: Array<{
				targetNoteId: string;
				targetNoteTitle: string;
				reason: string;
				similarityScore: string;
				linkType: "ai_suggested";
			}> = [];

			const currentTitleWords = new Set(
				currentNote.title
					.toLowerCase()
					.split(/\s+/)
					.filter((w) => w.length > 3),
			);

			for (const note of otherNotes) {
				if (linkedNoteIds.has(note.id)) continue;

				const sharedTags = currentNote.tags.filter((t) =>
					note.tags.includes(t),
				);
				if (sharedTags.length > 0) {
					suggestions.push({
						targetNoteId: note.id,
						targetNoteTitle: note.title,
						reason: `Conexão temática identificada pelas tags compartilhadas: ${sharedTags.join(", ")}`,
						similarityScore: "0.85",
						linkType: "ai_suggested",
					});
					continue;
				}

				if (
					currentNote.classSessionId &&
					note.classSessionId &&
					currentNote.classSessionId === note.classSessionId
				) {
					suggestions.push({
						targetNoteId: note.id,
						targetNoteTitle: note.title,
						reason: "Notas associadas à mesma aula",
						similarityScore: "0.75",
						linkType: "ai_suggested",
					});
					continue;
				}

				const commonWords = note.title
					.toLowerCase()
					.split(/\s+/)
					.filter((w) => w.length > 3 && currentTitleWords.has(w));
				if (commonWords.length > 0) {
					suggestions.push({
						targetNoteId: note.id,
						targetNoteTitle: note.title,
						reason: `Possível relação conceitual baseada em termos afins: ${commonWords.join(", ")}`,
						similarityScore: "0.65",
						linkType: "ai_suggested",
					});
				}
			}

			return suggestions;
		}),
});
