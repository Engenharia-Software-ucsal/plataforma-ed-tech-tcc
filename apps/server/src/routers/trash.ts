import { z } from "zod";
import {
	deleteFolderPermanently,
	deleteNotePermanently,
	emptyTrash,
	listTrash,
	restoreFolder,
	restoreNote,
} from "../services/notes/trash.service.js";
import { protectedProcedure, router } from "../trpc/index.js";

const itemInput = z.object({
	id: z.string().uuid(),
	type: z.enum(["note", "folder"]),
});

/** Lixeira de notas e pastas. Ver docs/superpowers/specs/2026-11-08-markdown-notes-editor-design.md §4.3.1 */
export const trashRouter = router({
	list: protectedProcedure.query(async ({ ctx }) =>
		listTrash(ctx.db, ctx.user.id),
	),

	/** Restaura o item. Uma pasta volta com tudo que saiu junto com ela. */
	restore: protectedProcedure
		.input(itemInput)
		.mutation(async ({ ctx, input }) =>
			ctx.db.transaction(async (tx) => {
				if (input.type === "note") {
					const restored = await restoreNote(tx, ctx.user.id, input.id);
					return {
						type: input.type,
						id: restored.id,
						name: restored.name,
						parentId: restored.folderId,
					};
				}
				const restored = await restoreFolder(tx, ctx.user.id, input.id);
				return { type: input.type, ...restored };
			}),
		),

	deletePermanently: protectedProcedure
		.input(itemInput)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.transaction(async (tx) => {
				if (input.type === "note")
					await deleteNotePermanently(tx, ctx.user.id, input.id);
				else await deleteFolderPermanently(tx, ctx.user.id, input.id);
			});
			return { success: true, id: input.id };
		}),

	empty: protectedProcedure.mutation(async ({ ctx }) => {
		await ctx.db.transaction(async (tx) => emptyTrash(tx, ctx.user.id));
		return { success: true };
	}),
});
