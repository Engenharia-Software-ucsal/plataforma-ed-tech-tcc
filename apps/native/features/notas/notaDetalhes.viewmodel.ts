import {
	completeWikilink,
	extractWikilinkTargets,
	findOpenWikilink,
	titleKey,
	validateNoteTitle,
} from "@busuucsal-v3/notes";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	applyFormat,
	type FormatKind,
	type TextSelection,
} from "@/features/notas/editor";
import {
	type AiSuggestedLink,
	displayTags,
	type LinkType,
	type Note,
	type NoteLink,
} from "@/features/notas/notas.model";
import {
	applySavedNoteAction,
	createNoteAction,
	errorMessage,
	loadNotesTreeAction,
	notesTreeAtom,
	notesTreeStatusAtom,
	trashNoteAction,
} from "@/state/notes";
import { type SavedNote, TrpcClientError, trpc } from "@/utils/trpc";

export type NoteViewMode = "view" | "edit";
export type NoteLoadState = "loading" | "ready" | "not_found" | "error";
/** saved = tudo no servidor; dirty = mudou e ainda não foi; conflict = o servidor tem versão mais nova. */
export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";

/** Espera depois da última tecla antes de salvar sozinho. */
export const AUTOSAVE_DELAY_MS = 1500;
const MAX_SUGGESTIONS = 6;

type Draft = { title: string; content: string; tags: string };

function parseTags(raw: string): string[] {
	const seen = new Set<string>();
	return raw
		.split(",")
		.map((tag) => tag.trim())
		.filter((tag) => {
			const key = tag.toLowerCase();
			if (!tag || seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

function draftOf(note: Note): Draft {
	return {
		title: note.title,
		content: note.content,
		tags: note.tags.join(", "),
	};
}

function sameDraft(a: Draft, b: Draft): boolean {
	return (
		a.title.trim() === b.title.trim() &&
		a.content === b.content &&
		parseTags(a.tags).join("\n") === parseTags(b.tags).join("\n")
	);
}

export function useNotaDetalhesViewModel(noteId?: string) {
	const tree = useAtomValue(notesTreeAtom);
	const treeStatus = useAtomValue(notesTreeStatusAtom);
	const loadTree = useSetAtom(loadNotesTreeAction);
	const applySaved = useSetAtom(applySavedNoteAction);
	const runCreateNote = useSetAtom(createNoteAction);
	const runTrashNote = useSetAtom(trashNoteAction);

	const [note, setNote] = useState<Note | null>(null);
	const [loadState, setLoadState] = useState<NoteLoadState>("loading");
	const [loadError, setLoadError] = useState<string | null>(null);
	const [mode, setModeState] = useState<NoteViewMode>("view");
	const [draft, setDraft] = useState<Draft>({
		title: "",
		content: "",
		tags: "",
	});
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
	const [saveError, setSaveError] = useState<string | null>(null);
	const [selection, setSelection] = useState<TextSelection>({
		start: 0,
		end: 0,
	});
	/** Seleção imposta ao TextInput depois de uma ação (formatação, autocomplete). */
	const [forcedSelection, setForcedSelection] = useState<
		TextSelection | undefined
	>(undefined);

	// Refs para o autosave e o salvamento ao sair da tela enxergarem o valor atual.
	const noteRef = useRef<Note | null>(null);
	const draftRef = useRef(draft);
	const savedDraftRef = useRef<Draft>(draft);
	const versionRef = useRef<string | undefined>(undefined);
	const savingRef = useRef<Promise<void> | null>(null);
	const conflictRef = useRef(false);
	draftRef.current = draft;
	noteRef.current = note;

	useEffect(() => {
		if (treeStatus === "idle") void loadTree();
	}, [treeStatus, loadTree]);

	const fetchNote = useCallback(async (id: string) => {
		return trpc.notes.getById.query({ id });
	}, []);

	const load = useCallback(async () => {
		if (!noteId) {
			setLoadState("not_found");
			return;
		}
		setLoadState("loading");
		setLoadError(null);
		try {
			const loaded = await fetchNote(noteId);
			if (!loaded) {
				setLoadState("not_found");
				return;
			}
			const fresh = draftOf(loaded);
			setNote(loaded);
			setDraft(fresh);
			savedDraftRef.current = fresh;
			versionRef.current = loaded.updatedAt;
			conflictRef.current = false;
			setSaveStatus("saved");
			setSaveError(null);
			setLoadState("ready");
		} catch (error) {
			if (error instanceof TrpcClientError && error.code === "NOT_FOUND") {
				setLoadState("not_found");
				return;
			}
			setLoadError(errorMessage(error));
			setLoadState("error");
		}
	}, [noteId, fetchNote]);

	useEffect(() => {
		setModeState("view");
		void load();
	}, [load]);

	/** Atualiza só os vínculos (depois de salvar, criar a nota de um link, etc.), sem tocar no rascunho. */
	const refreshLinks = useCallback(async () => {
		const current = noteRef.current;
		if (!current) return;
		try {
			const fresh = await fetchNote(current.id);
			if (!fresh) return;
			setNote((prev) =>
				prev && prev.id === fresh.id
					? {
							...prev,
							outboundLinks: fresh.outboundLinks,
							inboundLinks: fresh.inboundLinks,
							wikilinks: fresh.wikilinks,
						}
					: prev,
			);
		} catch {
			// Os vínculos ficam como estavam; a próxima abertura da nota recarrega.
		}
	}, [fetchNote]);

	const applySavedLocally = useCallback(
		(saved: SavedNote) => {
			setNote((prev) =>
				prev
					? {
							...prev,
							title: saved.title,
							content: saved.content,
							tags: saved.tags,
							autoTags: saved.autoTags,
							preview: saved.preview,
							updatedAt: saved.updatedAt,
						}
					: prev,
			);
			versionRef.current = saved.updatedAt;
			void applySaved(saved);
		},
		[applySaved],
	);

	/**
	 * Envia ao servidor o que mudou desde o último salvamento. `force` ignora a
	 * checagem de versão ("manter minha versão" depois de um conflito).
	 */
	const save = useCallback(
		async (options: { force?: boolean } = {}): Promise<boolean> => {
			const current = noteRef.current;
			if (!current) return false;
			if (savingRef.current) await savingRef.current;
			if (conflictRef.current && !options.force) return false;

			const snapshot = draftRef.current;
			const saved = savedDraftRef.current;
			if (sameDraft(snapshot, saved)) {
				setSaveStatus("saved");
				return true;
			}

			const titleCheck = validateNoteTitle(snapshot.title);
			if (!titleCheck.ok) {
				setSaveStatus("error");
				setSaveError(titleCheck.error);
				return false;
			}

			const changes: { title?: string; content?: string; tags?: string[] } = {};
			if (titleCheck.value !== saved.title.trim())
				changes.title = titleCheck.value;
			if (snapshot.content !== saved.content)
				changes.content = snapshot.content;
			const tags = parseTags(snapshot.tags);
			if (tags.join("\n") !== parseTags(saved.tags).join("\n"))
				changes.tags = tags;

			setSaveStatus("saving");
			setSaveError(null);
			let succeeded = false;
			const request = (async () => {
				try {
					const result = await trpc.notes.update.mutate({
						id: current.id,
						...changes,
						expectedUpdatedAt: options.force ? undefined : versionRef.current,
					});
					savedDraftRef.current = { ...snapshot, title: result.title };
					conflictRef.current = false;
					applySavedLocally(result);
					setSaveStatus(
						sameDraft(draftRef.current, savedDraftRef.current)
							? "saved"
							: "dirty",
					);
					succeeded = true;
					if (changes.content !== undefined || changes.title !== undefined)
						void refreshLinks();
				} catch (error) {
					if (error instanceof TrpcClientError && error.code === "CONFLICT") {
						conflictRef.current = true;
						setSaveStatus("conflict");
						setSaveError(error.message);
					} else {
						setSaveStatus("error");
						setSaveError(
							errorMessage(
								error,
								"Não foi possível salvar. Suas alterações continuam aqui.",
							),
						);
					}
				}
			})();
			savingRef.current = request;
			await request;
			savingRef.current = null;
			return succeeded;
		},
		[applySavedLocally, refreshLinks],
	);

	const isDirty = !sameDraft(draft, savedDraftRef.current);

	// Autosave: salva sozinho um tempo depois da última alteração.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `draft` reinicia o timer a cada tecla, para salvar só depois que o aluno para de digitar.
	useEffect(() => {
		if (mode !== "edit" || !isDirty || conflictRef.current) return;
		setSaveStatus((status) => (status === "saving" ? status : "dirty"));
		const timer = setTimeout(() => {
			void save();
		}, AUTOSAVE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [mode, isDirty, draft, save]);

	// Ao sair da tela com alterações pendentes, tenta salvar uma última vez.
	useEffect(
		() => () => {
			if (
				noteRef.current &&
				!sameDraft(draftRef.current, savedDraftRef.current) &&
				!conflictRef.current
			) {
				void save();
			}
		},
		[save],
	);

	const setMode = useCallback(
		(next: NoteViewMode) => {
			if (next === "view" && mode === "edit") void save();
			setModeState(next);
		},
		[mode, save],
	);

	const resolveConflict = useCallback(
		async (keep: "mine" | "server") => {
			if (keep === "mine") {
				await save({ force: true });
			} else {
				conflictRef.current = false;
				await load();
			}
		},
		[save, load],
	);

	// --- Wikilinks --------------------------------------------------------

	const titleIndex = useMemo(() => {
		const index = new Map<string, string>();
		for (const item of tree.notes) index.set(titleKey(item.title), item.id);
		for (const link of note?.wikilinks ?? []) {
			if (link.noteId) index.set(titleKey(link.title), link.noteId);
		}
		if (note) index.set(titleKey(note.title), note.id);
		return index;
	}, [tree.notes, note]);

	const resolveTarget = useCallback(
		(target: string): string | null => titleIndex.get(titleKey(target)) ?? null,
		[titleIndex],
	);

	/** Links do texto atual que ainda não apontam para nenhuma nota. */
	const unresolvedTargets = useMemo(
		() =>
			extractWikilinkTargets(
				mode === "edit" ? draft.content : (note?.content ?? ""),
			).filter((target) => resolveTarget(target) === null),
		[mode, draft.content, note?.content, resolveTarget],
	);

	/** Cria a nota de um link pendente na mesma pasta e devolve o id para abrir. */
	const createNoteFromLink = useCallback(
		async (title: string): Promise<{ id: string } | { error: string }> => {
			const check = validateNoteTitle(title);
			if (!check.ok) return { error: check.error };
			try {
				if (!sameDraft(draftRef.current, savedDraftRef.current)) await save();
				const created = await runCreateNote({
					title: check.value,
					content: "",
					folderId: noteRef.current?.folderId ?? null,
				});
				void refreshLinks();
				return { id: created.id };
			} catch (error) {
				return { error: errorMessage(error) };
			}
		},
		[runCreateNote, refreshLinks, save],
	);

	// --- Editor ----------------------------------------------------------

	const updateDraft = useCallback((changes: Partial<Draft>) => {
		setDraft((prev) => ({ ...prev, ...changes }));
	}, []);

	const onSelectionChange = useCallback((next: TextSelection) => {
		setSelection(next);
		setForcedSelection(undefined);
	}, []);

	const format = useCallback(
		(kind: FormatKind) => {
			const result = applyFormat(draftRef.current.content, selection, kind);
			updateDraft({ content: result.text });
			setSelection(result.selection);
			setForcedSelection(result.selection);
		},
		[selection, updateDraft],
	);

	const openWikilink = useMemo(
		() =>
			mode === "edit" ? findOpenWikilink(draft.content, selection.end) : null,
		[mode, draft.content, selection.end],
	);

	const wikilinkSuggestions = useMemo(() => {
		if (!openWikilink) return [];
		const query = openWikilink.query.trim().toLowerCase();
		return tree.notes
			.filter((item) => item.id !== note?.id)
			.filter((item) => item.title.toLowerCase().includes(query))
			.sort((a, b) => {
				const aStarts = a.title.toLowerCase().startsWith(query) ? 0 : 1;
				const bStarts = b.title.toLowerCase().startsWith(query) ? 0 : 1;
				return aStarts - bStarts || a.title.localeCompare(b.title);
			})
			.slice(0, MAX_SUGGESTIONS);
	}, [openWikilink, tree.notes, note?.id]);

	const pickWikilinkSuggestion = useCallback(
		(title: string) => {
			if (!openWikilink) return;
			const result = completeWikilink(
				draftRef.current.content,
				openWikilink.start,
				selection.end,
				title,
			);
			updateDraft({ content: result.text });
			const cursor = { start: result.cursor, end: result.cursor };
			setSelection(cursor);
			setForcedSelection(cursor);
		},
		[openWikilink, selection.end, updateDraft],
	);

	// --- Vínculos semânticos ------------------------------------------------

	const [suggestedLinks, setSuggestedLinks] = useState<AiSuggestedLink[]>([]);
	const [suggestionsLoading, setSuggestionsLoading] = useState(false);

	const loadSuggestions = useCallback(async () => {
		const current = noteRef.current;
		if (!current) return;
		setSuggestionsLoading(true);
		try {
			const linked = new Set(
				current.outboundLinks.map((link) => link.targetNoteId),
			);
			const result = await trpc.notes.suggestLinks.query({
				noteId: current.id,
			});
			setSuggestedLinks(
				result.filter((suggestion) => !linked.has(suggestion.targetNoteId)),
			);
		} catch {
			setSuggestedLinks([]);
		} finally {
			setSuggestionsLoading(false);
		}
	}, []);

	const addLink = useCallback(
		async ({
			targetNoteId,
			reason,
			linkType = "manual",
		}: {
			targetNoteId: string;
			reason: string;
			linkType?: Exclude<LinkType, "wikilink">;
		}): Promise<NoteLink> => {
			const current = noteRef.current;
			if (!current) throw new Error("Nota atual não encontrada.");
			if (targetNoteId === current.id)
				throw new Error("Uma nota não pode ser vinculada a ela mesma.");
			if (reason.trim().length < 3)
				throw new Error("A justificativa deve ter no mínimo 3 caracteres.");
			if (
				current.outboundLinks.some(
					(link) =>
						link.targetNoteId === targetNoteId && link.linkType !== "wikilink",
				)
			) {
				throw new Error("Este vínculo já existe.");
			}
			try {
				const created = await trpc.notes.addLink.mutate({
					sourceNoteId: current.id,
					targetNoteId,
					reason: reason.trim(),
					linkType,
				});
				const target = tree.notes.find((item) => item.id === targetNoteId);
				const link: NoteLink = {
					...created,
					targetNote: target
						? {
								id: target.id,
								title: target.title,
								tags: target.tags,
								createdAt: target.createdAt,
							}
						: created.targetNote,
				};
				setNote((prev) =>
					prev
						? { ...prev, outboundLinks: [link, ...prev.outboundLinks] }
						: prev,
				);
				return link;
			} catch (error) {
				throw new Error(errorMessage(error, "Erro ao criar vínculo."));
			}
		},
		[tree.notes],
	);

	const removeLink = useCallback(async (linkId: string) => {
		await trpc.notes.removeLink.mutate({ id: linkId });
		setNote((prev) =>
			prev
				? {
						...prev,
						outboundLinks: prev.outboundLinks.filter(
							(link) => link.id !== linkId,
						),
						inboundLinks: prev.inboundLinks.filter(
							(link) => link.id !== linkId,
						),
					}
				: prev,
		);
	}, []);

	const availableNotesForLink = useMemo(() => {
		if (!note) return [];
		const linked = new Set(
			note.outboundLinks
				.filter((link) => link.linkType !== "wikilink")
				.map((link) => link.targetNoteId),
		);
		return tree.notes.filter(
			(item) => item.id !== note.id && !linked.has(item.id),
		);
	}, [note, tree.notes]);

	const trashCurrent = useCallback(async (): Promise<string | null> => {
		const current = noteRef.current;
		if (!current) return null;
		try {
			// Nada a salvar numa nota que vai para a lixeira.
			savedDraftRef.current = draftRef.current;
			await runTrashNote(current.id);
			return null;
		} catch (error) {
			return errorMessage(error);
		}
	}, [runTrashNote]);

	return {
		note,
		loadState,
		loadError,
		reload: load,
		mode,
		setMode,
		draftTitle: draft.title,
		setDraftTitle: (title: string) => updateDraft({ title }),
		draftContent: draft.content,
		setDraftContent: (content: string) => updateDraft({ content }),
		draftTags: draft.tags,
		setDraftTags: (tags: string) => updateDraft({ tags }),
		/** Tags exibidas na leitura (automáticas com `#`, depois as do aluno). */
		visibleTags: note ? displayTags(note) : [],
		autoTags: note?.autoTags ?? [],
		saveStatus,
		saveError,
		isDirty,
		save,
		resolveConflict,
		selection,
		forcedSelection,
		onSelectionChange,
		format,
		wikilinkQuery: openWikilink?.query ?? null,
		wikilinkSuggestions,
		pickWikilinkSuggestion,
		resolveTarget,
		unresolvedTargets,
		createNoteFromLink,
		suggestedLinks,
		suggestionsLoading,
		loadSuggestions,
		addLink,
		removeLink,
		availableNotesForLink,
		trashCurrent,
	} as const;
}
