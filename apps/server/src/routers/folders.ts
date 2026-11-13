import { uniqueName, validateFolderName } from "@busuucsal-v3/notes";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { folders, notes } from "../db/schema/index.js";
import {
	badRequest,
	conflict,
	isUniqueViolation,
} from "../services/notes/db.js";
import {
	assertDepthFits,
	assertFolderNameFree,
	listActiveFolders,
	requireActiveFolder,
	requireDestination,
	siblingFolderNames,
	subtreeHeight,
	subtreeIds,
} from "../services/notes/folders.service.js";
import { listNoteSummaries } from "../services/notes/notes.service.js";
import {
	compactSiblings,
	nextPosition,
	placeItem,
	reorderSiblings,
} from "../services/notes/ordering.service.js";
import { trashFolderTree } from "../services/notes/trash.service.js";
import { protectedProcedure, router } from "../trpc/index.js";

function validName(raw: string): string {
	const result = validateFolderName(raw);
	if (!result.ok) throw badRequest(result.error);
	return result.value;
}

function rethrowNameConflict(error: unknown, name: string): never {
	if (isUniqueViolation(error))
		throw conflict(`Já existe uma pasta chamada "${name}" aqui.`);
	throw error;
}

function toFolderDto(folder: typeof folders.$inferSelect) {
	return {
		id: folder.id,
		parentId: folder.parentId,
		name: folder.name,
		position: folder.position,
		createdAt: folder.createdAt,
		updatedAt: folder.updatedAt,
	};
}

export const foldersRouter = router({
	/** Árvore completa do aluno: pastas e notas ativas (sem o texto das notas, só a prévia). */
	tree: protectedProcedure.query(async ({ ctx }) => {
		const [allFolders, allNotes] = await Promise.all([
			listActiveFolders(ctx.db, ctx.user.id),
			listNoteSummaries(ctx.db, ctx.user.id),
		]);
		return {
			folders: allFolders
				.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
				.map(toFolderDto),
			notes: allNotes,
		};
	}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().max(1000),
				parentId: z.string().uuid().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			const name = validName(input.name);
			try {
				return await ctx.db.transaction(async (tx) => {
					const parentId = await requireDestination(tx, userId, input.parentId);
					const all = await listActiveFolders(tx, userId);
					assertDepthFits(
						parentId,
						1,
						new Map(all.map((folder) => [folder.id, folder])),
					);
					assertFolderNameFree(name, parentId, all);
					const position = await nextPosition(tx, "folder", userId, parentId);
					const [created] = await tx
						.insert(folders)
						.values({ userId, parentId, name, position })
						.returning();
					if (!created) throw new Error("Falha ao criar a pasta");
					return toFolderDto(created);
				});
			} catch (error) {
				rethrowNameConflict(error, name);
			}
		}),

	rename: protectedProcedure
		.input(z.object({ id: z.string().uuid(), name: z.string().max(1000) }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			const name = validName(input.name);
			try {
				return await ctx.db.transaction(async (tx) => {
					const folder = await requireActiveFolder(tx, userId, input.id);
					assertFolderNameFree(
						name,
						folder.parentId,
						await listActiveFolders(tx, userId),
						folder.id,
					);
					const [updated] = await tx
						.update(folders)
						.set({ name, updatedAt: new Date() })
						.where(eq(folders.id, folder.id))
						.returning();
					if (!updated) throw new Error("Falha ao renomear a pasta");
					return toFolderDto(updated);
				});
			} catch (error) {
				rethrowNameConflict(error, name);
			}
		}),

	/** Move a pasta (com tudo dentro) para outra pasta ou para a raiz. */
	move: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				parentId: z.string().uuid().nullable(),
				position: z.number().int().min(0).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			return ctx.db.transaction(async (tx) => {
				const folder = await requireActiveFolder(tx, userId, input.id);
				const parentId = await requireDestination(tx, userId, input.parentId);
				const all = await listActiveFolders(tx, userId);

				if (
					parentId !== null &&
					subtreeIds(folder.id, all).includes(parentId)
				) {
					throw badRequest(
						"Uma pasta não pode ser movida para dentro dela mesma.",
					);
				}
				if (parentId !== folder.parentId) {
					assertDepthFits(
						parentId,
						subtreeHeight(folder.id, all),
						new Map(all.map((item) => [item.id, item])),
					);
					assertFolderNameFree(folder.name, parentId, all, folder.id);
					await tx
						.update(folders)
						.set({ parentId, updatedAt: new Date() })
						.where(eq(folders.id, folder.id));
				}
				await placeItem(
					tx,
					"folder",
					userId,
					parentId,
					folder.id,
					input.position,
				);
				if (parentId !== folder.parentId) {
					await compactSiblings(tx, "folder", userId, folder.parentId);
				}
				return { success: true, id: folder.id, parentId };
			});
		}),

	reorder: protectedProcedure
		.input(
			z.object({
				parentId: z.string().uuid().nullable(),
				orderedIds: z.array(z.string().uuid()).max(1000),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			return ctx.db.transaction(async (tx) => {
				await requireDestination(tx, userId, input.parentId);
				const orderedIds = await reorderSiblings(
					tx,
					"folder",
					userId,
					input.parentId,
					input.orderedIds,
				);
				return { orderedIds };
			});
		}),

	/**
	 * Exclui a pasta (vai para a lixeira).
	 * - `moveToParent`: o que está dentro sobe para a pasta-pai; só a pasta vai para a lixeira.
	 * - `trashAll`: a pasta e tudo dentro vão para a lixeira juntos.
	 */
	delete: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				mode: z.enum(["moveToParent", "trashAll"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user.id;
			return ctx.db.transaction(async (tx) => {
				const folder = await requireActiveFolder(tx, userId, input.id);
				const parentId = folder.parentId;

				if (input.mode === "moveToParent") {
					const all = await listActiveFolders(tx, userId);
					const children = all
						.filter((item) => item.parentId === folder.id)
						.sort((a, b) => a.position - b.position);
					const taken = siblingFolderNames(parentId, all, folder.id);
					let folderPosition = await nextPosition(
						tx,
						"folder",
						userId,
						parentId,
					);
					for (const child of children) {
						// Pasta com o mesmo nome na pasta-pai: a que sobe ganha " 2", " 3"...
						const name = uniqueName(child.name, taken);
						taken.push(name);
						await tx
							.update(folders)
							.set({
								parentId,
								name,
								position: folderPosition++,
								updatedAt: new Date(),
							})
							.where(eq(folders.id, child.id));
					}

					const childNotes = await tx
						.select({ id: notes.id })
						.from(notes)
						.where(and(eq(notes.folderId, folder.id), isNull(notes.deletedAt)))
						.orderBy(asc(notes.position), asc(notes.title));
					let notePosition = await nextPosition(tx, "note", userId, parentId);
					for (const note of childNotes) {
						await tx
							.update(notes)
							.set({ folderId: parentId, position: notePosition++ })
							.where(eq(notes.id, note.id));
					}
					await trashFolderTree(tx, userId, folder.id);
				} else {
					await trashFolderTree(tx, userId, folder.id);
				}

				await compactSiblings(tx, "folder", userId, parentId);
				return { success: true, id: folder.id };
			});
		}),
});

export type FolderDto = ReturnType<typeof toFolderDto>;
