import {
	numberedName,
	uniqueName,
	validateFolderName,
} from "@busuucsal-v3/notes";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	displayTags,
	type NoteFolder,
	type NoteSummary,
} from "@/features/notas/notas.model";
import {
	createFolderAction,
	createNoteAction,
	deleteFolderAction,
	errorMessage,
	folderSubtreeIds,
	loadNotesTreeAction,
	moveFolderAction,
	moveNoteAction,
	notesTreeAtom,
	notesTreeErrorAtom,
	notesTreeStatusAtom,
	renameFolderAction,
	type SiblingKind,
	shiftItemAction,
	trashNoteAction,
} from "@/state/notes";
import { trpc } from "@/utils/trpc";

/** Pasta aberta no navegador (null = raiz). Fica guardada ao abrir uma nota e voltar. */
export const currentFolderIdAtom = atom<string | null>(null);
export const notesSearchAtom = atom<string>("");
export const notesSelectedTagAtom = atom<string | null>(null);

const SEARCH_DEBOUNCE_MS = 300;

const byPosition =
	<T extends { position: number }>(name: (item: T) => string) =>
	(a: T, b: T) =>
		a.position - b.position || name(a).localeCompare(name(b));

function plural(count: number, one: string, many: string) {
	return `${count} ${count === 1 ? one : many}`;
}

export function useNotasViewModel() {
	const tree = useAtomValue(notesTreeAtom);
	const status = useAtomValue(notesTreeStatusAtom);
	const loadError = useAtomValue(notesTreeErrorAtom);
	const loadTree = useSetAtom(loadNotesTreeAction);

	const [currentFolderId, setCurrentFolderId] = useAtom(currentFolderIdAtom);
	const [search, setSearch] = useAtom(notesSearchAtom);
	const [selectedTag, setSelectedTag] = useAtom(notesSelectedTagAtom);
	const [actionError, setActionError] = useState<string | null>(null);
	const [remoteResults, setRemoteResults] = useState<NoteSummary[] | null>(
		null,
	);
	const [searching, setSearching] = useState(false);

	const runCreateNote = useSetAtom(createNoteAction);
	const runCreateFolder = useSetAtom(createFolderAction);
	const runRenameFolder = useSetAtom(renameFolderAction);
	const runDeleteFolder = useSetAtom(deleteFolderAction);
	const runMoveNote = useSetAtom(moveNoteAction);
	const runMoveFolder = useSetAtom(moveFolderAction);
	const runShift = useSetAtom(shiftItemAction);
	const runTrashNote = useSetAtom(trashNoteAction);

	useEffect(() => {
		if (status === "idle") void loadTree();
	}, [status, loadTree]);

	const foldersById = useMemo(
		() => new Map(tree.folders.map((folder) => [folder.id, folder])),
		[tree.folders],
	);

	// Se a pasta aberta sumiu (excluída, ou de outra sessão), volta para a raiz.
	useEffect(() => {
		if (
			status === "ready" &&
			currentFolderId &&
			!foldersById.has(currentFolderId)
		) {
			setCurrentFolderId(null);
		}
	}, [status, currentFolderId, foldersById, setCurrentFolderId]);

	const currentFolder = currentFolderId
		? (foldersById.get(currentFolderId) ?? null)
		: null;

	/** Caminho da raiz até a pasta (sem a raiz). */
	const pathTo = useCallback(
		(folderId: string | null): NoteFolder[] => {
			const path: NoteFolder[] = [];
			let current = folderId ? foldersById.get(folderId) : undefined;
			while (current && path.length < 50) {
				path.unshift(current);
				current = current.parentId
					? foldersById.get(current.parentId)
					: undefined;
			}
			return path;
		},
		[foldersById],
	);

	const breadcrumb = useMemo(
		() => pathTo(currentFolderId),
		[pathTo, currentFolderId],
	);

	const childFolders = useMemo(
		() =>
			tree.folders
				.filter((folder) => folder.parentId === currentFolderId)
				.sort(byPosition((folder) => folder.name)),
		[tree.folders, currentFolderId],
	);

	const childNotes = useMemo(
		() =>
			tree.notes
				.filter((note) => note.folderId === currentFolderId)
				.sort(byPosition((note) => note.title)),
		[tree.notes, currentFolderId],
	);

	const folderSummary = useCallback(
		(folderId: string) => {
			const notes = tree.notes.filter(
				(note) => note.folderId === folderId,
			).length;
			const folders = tree.folders.filter(
				(folder) => folder.parentId === folderId,
			).length;
			const parts = [plural(notes, "nota", "notas")];
			if (folders > 0) parts.push(plural(folders, "pasta", "pastas"));
			return parts.join(" · ");
		},
		[tree.notes, tree.folders],
	);

	const folderPathLabel = useCallback(
		(folderId: string | null) => {
			const path = pathTo(folderId);
			return path.length === 0
				? "Minhas notas"
				: path.map((folder) => folder.name).join(" / ");
		},
		[pathTo],
	);

	const allTags = useMemo(() => {
		const tags = new Set<string>();
		for (const note of tree.notes)
			for (const tag of displayTags(note)) tags.add(tag);
		return [...tags].sort((a, b) => {
			// Tags de matéria (#) primeiro.
			if (a.startsWith("#") !== b.startsWith("#"))
				return a.startsWith("#") ? -1 : 1;
			return a.localeCompare(b);
		});
	}, [tree.notes]);

	const query = search.trim();
	const isFiltering = query.length > 0 || selectedTag !== null;

	// Busca por texto vai ao servidor (a árvore só tem a prévia das notas).
	useEffect(() => {
		if (query.length === 0) {
			setRemoteResults(null);
			setSearching(false);
			return;
		}
		setSearching(true);
		let cancelled = false;
		const timer = setTimeout(async () => {
			try {
				const results = await trpc.notes.list.query({ search: query });
				if (!cancelled) setRemoteResults(results);
			} catch (error) {
				if (!cancelled) {
					// Sem servidor: busca pelo título e pela prévia que já estão no app.
					const lower = query.toLowerCase();
					setRemoteResults(
						tree.notes.filter(
							(note) =>
								note.title.toLowerCase().includes(lower) ||
								note.preview.toLowerCase().includes(lower),
						),
					);
					setActionError(
						errorMessage(error, "Busca feita só nas notas carregadas."),
					);
				}
			} finally {
				if (!cancelled) setSearching(false);
			}
		}, SEARCH_DEBOUNCE_MS);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [query, tree.notes]);

	const filteredNotes = useMemo(() => {
		if (!isFiltering) return [];
		const base = query.length > 0 ? (remoteResults ?? []) : tree.notes;
		const byTag = selectedTag
			? base.filter((note) => displayTags(note).includes(selectedTag))
			: base;
		return [...byTag].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}, [isFiltering, query, remoteResults, selectedTag, tree.notes]);

	/** Executa uma ação e transforma a falha em mensagem para a tela. Devolve se deu certo. */
	const attempt = useCallback(
		async <T>(action: () => Promise<T>): Promise<T | undefined> => {
			setActionError(null);
			try {
				return await action();
			} catch (error) {
				setActionError(errorMessage(error));
				return undefined;
			}
		},
		[],
	);

	const createNote = useCallback(async () => {
		const title = uniqueName(
			"Nova nota",
			tree.notes.map((note) => note.title),
			numberedName("Nova nota"),
		);
		return attempt(() =>
			runCreateNote({ title, content: "", folderId: currentFolderId }),
		);
	}, [attempt, runCreateNote, tree.notes, currentFolderId]);

	/** Cria a pasta; devolve a mensagem de erro (para a caixa de nome) ou null. */
	const createFolder = useCallback(
		async (name: string): Promise<string | null> => {
			try {
				await runCreateFolder({ name, parentId: currentFolderId });
				return null;
			} catch (error) {
				return errorMessage(error);
			}
		},
		[runCreateFolder, currentFolderId],
	);

	const renameFolder = useCallback(
		async (id: string, name: string): Promise<string | null> => {
			try {
				await runRenameFolder({ id, name });
				return null;
			} catch (error) {
				return errorMessage(error);
			}
		},
		[runRenameFolder],
	);

	const deleteFolder = useCallback(
		(id: string, mode: "moveToParent" | "trashAll") =>
			attempt(() => runDeleteFolder({ id, mode })),
		[attempt, runDeleteFolder],
	);

	const moveItem = useCallback(
		(kind: SiblingKind, id: string, destinationId: string | null) =>
			attempt(() =>
				kind === "note"
					? runMoveNote({ noteId: id, folderId: destinationId })
					: runMoveFolder({ id, parentId: destinationId }),
			),
		[attempt, runMoveNote, runMoveFolder],
	);

	const shiftItem = useCallback(
		(kind: SiblingKind, id: string, direction: -1 | 1) =>
			attempt(() => runShift({ kind, id, direction })),
		[attempt, runShift],
	);

	const trashNote = useCallback(
		(id: string) => attempt(() => runTrashNote(id)),
		[attempt, runTrashNote],
	);

	/** Pastas que não podem receber a pasta `folderId`: ela e as descendentes. */
	const blockedDestinations = useCallback(
		(folderId: string) => folderSubtreeIds(folderId, tree.folders),
		[tree.folders],
	);

	return {
		status,
		loadError,
		reload: loadTree,
		folders: tree.folders,
		notes: tree.notes,
		currentFolderId,
		currentFolder,
		breadcrumb,
		openFolder: setCurrentFolderId,
		childFolders,
		childNotes,
		folderSummary,
		folderPathLabel,
		search,
		setSearch,
		selectedTag,
		setSelectedTag,
		allTags,
		isFiltering,
		searching,
		filteredNotes,
		actionError,
		clearActionError: () => setActionError(null),
		createNote,
		createFolder,
		renameFolder,
		deleteFolder,
		moveItem,
		shiftItem,
		trashNote,
		blockedDestinations,
		validateFolderName: (name: string) => {
			const result = validateFolderName(name);
			return result.ok ? null : result.error;
		},
	} as const;
}
