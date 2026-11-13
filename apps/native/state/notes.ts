import { atom } from "jotai";
import type {
	NoteFolder,
	NoteSummary,
	NotesTree,
} from "@/features/notas/notas.model";
import {
	type NoteCreateInput,
	type SavedNote,
	TrpcClientError,
	trpc,
} from "@/utils/trpc";

/**
 * Árvore de pastas e notas do aluno, compartilhada pelo navegador de notas,
 * pela tela da nota e pela lixeira. O servidor é a fonte da verdade: cada ação
 * chama o tRPC e aplica o resultado localmente; quando o efeito no servidor é
 * mais amplo que o que dá para reproduzir aqui (ex.: renomear uma nota reescreve
 * outras), a árvore é recarregada.
 */

export type LoadStatus = "idle" | "loading" | "ready" | "error";

export const notesTreeAtom = atom<NotesTree>({ folders: [], notes: [] });
export const notesTreeStatusAtom = atom<LoadStatus>("idle");
export const notesTreeErrorAtom = atom<string | null>(null);

/** Mensagem legível para um erro de chamada ao servidor. */
export function errorMessage(
	error: unknown,
	fallback = "Não foi possível falar com o servidor.",
): string {
	if (error instanceof TrpcClientError) {
		if (error.code === "UNAUTHORIZED")
			return "Entre com sua conta para ver suas notas.";
		return error.message || fallback;
	}
	return error instanceof Error && error.message ? error.message : fallback;
}

export const loadNotesTreeAction = atom(null, async (_get, set) => {
	set(notesTreeStatusAtom, "loading");
	set(notesTreeErrorAtom, null);
	try {
		const tree = await trpc.folders.tree.query();
		set(notesTreeAtom, tree);
		set(notesTreeStatusAtom, "ready");
	} catch (error) {
		set(notesTreeErrorAtom, errorMessage(error));
		set(notesTreeStatusAtom, "error");
	}
});

/** Recarrega sem trocar o status para "loading" (sem piscar a tela). */
export const refreshNotesTreeAction = atom(null, async (_get, set) => {
	try {
		set(notesTreeAtom, await trpc.folders.tree.query());
	} catch {
		// Mantém a árvore atual; a próxima ação ou abertura da tela tenta de novo.
	}
});

function nextLocalPosition(items: Array<{ position: number }>): number {
	return items.reduce((max, item) => Math.max(max, item.position + 1), 0);
}

function summaryFromSaved(saved: SavedNote): NoteSummary {
	const { content: _content, affectedNoteIds: _affected, ...summary } = saved;
	return summary;
}

/** Coloca/atualiza o resumo de uma nota na árvore. */
export const upsertNoteSummaryAction = atom(
	null,
	(get, set, summary: NoteSummary) => {
		const tree = get(notesTreeAtom);
		const exists = tree.notes.some((note) => note.id === summary.id);
		set(notesTreeAtom, {
			...tree,
			notes: exists
				? tree.notes.map((note) =>
						note.id === summary.id ? { ...note, ...summary } : note,
					)
				: [...tree.notes, summary],
		});
	},
);

export const createNoteAction = atom(
	null,
	async (_get, set, input: NoteCreateInput) => {
		const saved = await trpc.notes.create.mutate(input);
		set(upsertNoteSummaryAction, summaryFromSaved(saved));
		if (saved.affectedNoteIds.length > 0) await set(refreshNotesTreeAction);
		return saved;
	},
);

/** Depois de salvar uma nota: atualiza a árvore e recarrega se outras notas mudaram junto. */
export const applySavedNoteAction = atom(
	null,
	async (_get, set, saved: SavedNote) => {
		set(upsertNoteSummaryAction, summaryFromSaved(saved));
		if (saved.affectedNoteIds.length > 0) await set(refreshNotesTreeAction);
	},
);

export const trashNoteAction = atom(null, async (get, set, noteId: string) => {
	await trpc.notes.delete.mutate({ id: noteId });
	const tree = get(notesTreeAtom);
	set(notesTreeAtom, {
		...tree,
		notes: tree.notes.filter((note) => note.id !== noteId),
	});
});

export const moveNoteAction = atom(
	null,
	async (
		get,
		set,
		{ noteId, folderId }: { noteId: string; folderId: string | null },
	) => {
		await trpc.notes.move.mutate({ id: noteId, folderId });
		const tree = get(notesTreeAtom);
		const position = nextLocalPosition(
			tree.notes.filter((note) => note.folderId === folderId),
		);
		set(notesTreeAtom, {
			...tree,
			notes: tree.notes.map((note) =>
				note.id === noteId ? { ...note, folderId, position } : note,
			),
		});
	},
);

export type SiblingKind = "note" | "folder";

/**
 * Sobe ou desce um item entre os irmãos. Aplica na hora (a lista responde ao
 * toque) e desfaz se o servidor recusar.
 */
export const shiftItemAction = atom(
	null,
	async (
		get,
		set,
		{
			kind,
			id,
			direction,
		}: { kind: SiblingKind; id: string; direction: -1 | 1 },
	) => {
		const before = get(notesTreeAtom);
		const parentOf = (item: NoteSummary | NoteFolder) =>
			"folderId" in item ? item.folderId : item.parentId;
		const items: Array<NoteSummary | NoteFolder> =
			kind === "note" ? before.notes : before.folders;
		const target = items.find((item) => item.id === id);
		if (!target) return;
		const parentId = parentOf(target);
		const siblings = items
			.filter((item) => parentOf(item) === parentId)
			.sort((a, b) => a.position - b.position);
		const index = siblings.findIndex((item) => item.id === id);
		const swapWith = index + direction;
		if (index === -1 || swapWith < 0 || swapWith >= siblings.length) return;

		const order = siblings.map((item) => item.id);
		[order[index], order[swapWith]] = [
			order[swapWith] as string,
			order[index] as string,
		];
		const positionOf = new Map(
			order.map((itemId, position) => [itemId, position]),
		);
		const reposition = <T extends { id: string; position: number }>(
			list: T[],
		) =>
			list.map((item) =>
				positionOf.has(item.id)
					? { ...item, position: positionOf.get(item.id) as number }
					: item,
			);

		set(
			notesTreeAtom,
			kind === "note"
				? { ...before, notes: reposition(before.notes) }
				: { ...before, folders: reposition(before.folders) },
		);
		try {
			if (kind === "note") {
				await trpc.notes.reorder.mutate({
					folderId: parentId,
					orderedIds: order,
				});
			} else {
				await trpc.folders.reorder.mutate({ parentId, orderedIds: order });
			}
		} catch (error) {
			set(notesTreeAtom, before);
			throw error;
		}
	},
);

export const createFolderAction = atom(
	null,
	async (
		get,
		set,
		{ name, parentId }: { name: string; parentId: string | null },
	) => {
		const created = await trpc.folders.create.mutate({ name, parentId });
		const tree = get(notesTreeAtom);
		set(notesTreeAtom, { ...tree, folders: [...tree.folders, created] });
		return created;
	},
);

export const renameFolderAction = atom(
	null,
	async (get, set, { id, name }: { id: string; name: string }) => {
		const updated = await trpc.folders.rename.mutate({ id, name });
		const tree = get(notesTreeAtom);
		set(notesTreeAtom, {
			...tree,
			folders: tree.folders.map((folder) =>
				folder.id === id ? { ...folder, name: updated.name } : folder,
			),
		});
	},
);

export const moveFolderAction = atom(
	null,
	async (
		get,
		set,
		{ id, parentId }: { id: string; parentId: string | null },
	) => {
		await trpc.folders.move.mutate({ id, parentId });
		const tree = get(notesTreeAtom);
		const position = nextLocalPosition(
			tree.folders.filter((folder) => folder.parentId === parentId),
		);
		set(notesTreeAtom, {
			...tree,
			folders: tree.folders.map((folder) =>
				folder.id === id ? { ...folder, parentId, position } : folder,
			),
		});
	},
);

/** Ids da pasta e de todas as descendentes, na árvore local. */
export function folderSubtreeIds(
	folderId: string,
	folders: NoteFolder[],
): string[] {
	const result = [folderId];
	for (let i = 0; i < result.length; i++) {
		for (const folder of folders) {
			if (folder.parentId === result[i] && !result.includes(folder.id))
				result.push(folder.id);
		}
	}
	return result;
}

export const deleteFolderAction = atom(
	null,
	async (
		get,
		set,
		{ id, mode }: { id: string; mode: "moveToParent" | "trashAll" },
	) => {
		await trpc.folders.delete.mutate({ id, mode });
		const tree = get(notesTreeAtom);
		const folder = tree.folders.find((item) => item.id === id);
		if (mode === "trashAll") {
			const removed = new Set(folderSubtreeIds(id, tree.folders));
			set(notesTreeAtom, {
				folders: tree.folders.filter((item) => !removed.has(item.id)),
				notes: tree.notes.filter(
					(note) => !note.folderId || !removed.has(note.folderId),
				),
			});
			return;
		}
		const parentId = folder?.parentId ?? null;
		set(notesTreeAtom, {
			folders: tree.folders
				.filter((item) => item.id !== id)
				.map((item) => (item.parentId === id ? { ...item, parentId } : item)),
			notes: tree.notes.map((note) =>
				note.folderId === id ? { ...note, folderId: parentId } : note,
			),
		});
		// O servidor pode ter renomeado pastas que subiram ("Listas 2"): sincroniza.
		await set(refreshNotesTreeAction);
	},
);
