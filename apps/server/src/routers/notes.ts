import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { noteLinks, notes } from "../db/schema/index.js";
import { publicProcedure, router } from "../trpc/index.js";

export const notesRouter = router({
	list: publicProcedure
		.input(
			z
				.object({
					classSessionId: z.string().uuid().optional(),
					tag: z.string().optional(),
					search: z.string().optional(),
					userId: z.string().uuid().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const userId = ctx.user?.id ?? input?.userId;
			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Usuário não autenticado",
				});
			}

			const conditions = [eq(notes.userId, userId)];

			if (input?.classSessionId) {
				conditions.push(eq(notes.classSessionId, input.classSessionId));
			}

			if (input?.search) {
				conditions.push(
					or(
						ilike(notes.title, `%${input.search}%`),
						ilike(notes.content, `%${input.search}%`),
					)!,
				);
			}

			const results = await ctx.db
				.select()
				.from(notes)
				.where(and(...conditions))
				.orderBy(desc(notes.updatedAt));

			if (input?.tag) {
				return results.filter((note) => note.tags.includes(input.tag!));
			}

			return results;
		}),

	getById: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [note] = await ctx.db
				.select()
				.from(notes)
				.where(eq(notes.id, input.id));

			if (!note) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Nota não encontrada",
				});
			}

			const outbound = await ctx.db
				.select({
					id: noteLinks.id,
					sourceNoteId: noteLinks.sourceNoteId,
					targetNoteId: noteLinks.targetNoteId,
					similarityScore: noteLinks.similarityScore,
					linkType: noteLinks.linkType,
					reason: noteLinks.reason,
					createdAt: noteLinks.createdAt,
					targetNote: {
						id: notes.id,
						title: notes.title,
						tags: notes.tags,
						createdAt: notes.createdAt,
					},
				})
				.from(noteLinks)
				.innerJoin(notes, eq(noteLinks.targetNoteId, notes.id))
				.where(eq(noteLinks.sourceNoteId, input.id));

			const inbound = await ctx.db
				.select({
					id: noteLinks.id,
					sourceNoteId: noteLinks.sourceNoteId,
					targetNoteId: noteLinks.targetNoteId,
					similarityScore: noteLinks.similarityScore,
					linkType: noteLinks.linkType,
					reason: noteLinks.reason,
					createdAt: noteLinks.createdAt,
					sourceNote: {
						id: notes.id,
						title: notes.title,
						tags: notes.tags,
						createdAt: notes.createdAt,
					},
				})
				.from(noteLinks)
				.innerJoin(notes, eq(noteLinks.sourceNoteId, notes.id))
				.where(eq(noteLinks.targetNoteId, input.id));

			return {
				...note,
				outboundLinks: outbound,
				inboundLinks: inbound,
			};
		}),

	create: publicProcedure
		.input(
			z.object({
				title: z.string().min(1, "Título é obrigatório"),
				content: z.string(),
				tags: z.array(z.string()).optional().default([]),
				classSessionId: z.string().uuid().optional(),
				userId: z.string().uuid().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user?.id ?? input.userId;
			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Usuário não autenticado",
				});
			}

			const [created] = await ctx.db
				.insert(notes)
				.values({
					userId,
					title: input.title,
					content: input.content,
					tags: input.tags,
					classSessionId: input.classSessionId,
				})
				.returning();

			return created;
		}),

	update: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				title: z.string().min(1).optional(),
				content: z.string().optional(),
				tags: z.array(z.string()).optional(),
				classSessionId: z.string().uuid().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select()
				.from(notes)
				.where(eq(notes.id, input.id));

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Nota não encontrada",
				});
			}

			const updateData: Partial<typeof notes.$inferInsert> = {
				updatedAt: new Date(),
			};
			if (input.title !== undefined) updateData.title = input.title;
			if (input.content !== undefined) updateData.content = input.content;
			if (input.tags !== undefined) updateData.tags = input.tags;
			if (input.classSessionId !== undefined)
				updateData.classSessionId = input.classSessionId;

			const [updated] = await ctx.db
				.update(notes)
				.set(updateData)
				.where(eq(notes.id, input.id))
				.returning();

			return updated;
		}),

	delete: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select()
				.from(notes)
				.where(eq(notes.id, input.id));

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Nota não encontrada",
				});
			}

			await ctx.db
				.delete(noteLinks)
				.where(
					or(
						eq(noteLinks.sourceNoteId, input.id),
						eq(noteLinks.targetNoteId, input.id),
					),
				);

			await ctx.db.delete(notes).where(eq(notes.id, input.id));

			return { success: true, id: input.id };
		}),

	addLink: publicProcedure
		.input(
			z.object({
				sourceNoteId: z.string().uuid(),
				targetNoteId: z.string().uuid(),
				reason: z
					.string()
					.min(3, "A justificativa deve ter no mínimo 3 caracteres"),
				linkType: z.enum(["manual", "ai_suggested"]).default("manual").optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.sourceNoteId === input.targetNoteId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Uma nota não pode ser vinculada a ela mesma",
				});
			}

			const [sourceNote] = await ctx.db
				.select()
				.from(notes)
				.where(eq(notes.id, input.sourceNoteId));

			if (!sourceNote) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Nota de origem não encontrada",
				});
			}

			const [targetNote] = await ctx.db
				.select()
				.from(notes)
				.where(eq(notes.id, input.targetNoteId));

			if (!targetNote) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Nota de destino não encontrada",
				});
			}

			const [existingLink] = await ctx.db
				.select()
				.from(noteLinks)
				.where(
					and(
						eq(noteLinks.sourceNoteId, input.sourceNoteId),
						eq(noteLinks.targetNoteId, input.targetNoteId),
					),
				);

			if (existingLink) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Este vínculo já existe entre as notas",
				});
			}

			const [newLink] = await ctx.db
				.insert(noteLinks)
				.values({
					sourceNoteId: input.sourceNoteId,
					targetNoteId: input.targetNoteId,
					reason: input.reason.trim(),
					linkType: input.linkType ?? "manual",
					similarityScore: "1.00",
				})
				.returning();

			return newLink;
		}),

	removeLink: publicProcedure
		.input(
			z.object({
				id: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select()
				.from(noteLinks)
				.where(eq(noteLinks.id, input.id));

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Vínculo não encontrado",
				});
			}

			await ctx.db.delete(noteLinks).where(eq(noteLinks.id, input.id));

			return { success: true, id: input.id };
		}),

	suggestLinks: publicProcedure
		.input(
			z.object({
				noteId: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [currentNote] = await ctx.db
				.select()
				.from(notes)
				.where(eq(notes.id, input.noteId));

			if (!currentNote) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Nota não encontrada",
				});
			}

			const existingLinks = await ctx.db
				.select()
				.from(noteLinks)
				.where(
					or(
						eq(noteLinks.sourceNoteId, input.noteId),
						eq(noteLinks.targetNoteId, input.noteId),
					),
				);

			const linkedNoteIds = new Set<string>();
			linkedNoteIds.add(currentNote.id);
			for (const link of existingLinks) {
				linkedNoteIds.add(link.sourceNoteId);
				linkedNoteIds.add(link.targetNoteId);
			}

			const otherNotes = await ctx.db
				.select()
				.from(notes)
				.where(eq(notes.userId, currentNote.userId));

			const suggestions: Array<{
				targetNoteId: string;
				targetNoteTitle: string;
				reason: string;
				similarityScore: string;
				linkType: "ai_suggested";
			}> = [];

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

				const currentTitleWords = new Set(
					currentNote.title
						.toLowerCase()
						.split(/\s+/)
						.filter((w) => w.length > 3),
				);
				const targetTitleWords = note.title
					.toLowerCase()
					.split(/\s+/)
					.filter((w) => w.length > 3);

				const commonWords = targetTitleWords.filter((w) =>
					currentTitleWords.has(w),
				);
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
