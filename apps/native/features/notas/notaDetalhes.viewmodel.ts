import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type AiSuggestedLink,
	INITIAL_AI_SUGGESTIONS_MAP,
	type LinkType,
	type NoteLink,
} from "@/features/notas/notas.model";
import { notesAtom } from "@/features/notas/notas.viewmodel";

export type NoteDetailsMode = "reading" | "editing";

export function useNotaDetalhesViewModel(noteId?: string) {
	const [notes, setNotes] = useAtom(notesAtom);

	// Find active note by id or default to the first available note
	const note = useMemo(() => {
		if (!noteId) return notes[0];
		return notes.find((n) => n.id === noteId) ?? notes[0];
	}, [notes, noteId]);

	const [mode, setMode] = useState<NoteDetailsMode>("reading");
	const [draftTitle, setDraftTitle] = useState(note?.title ?? "");
	const [draftContent, setDraftContent] = useState(note?.content ?? "");
	const [draftTags, setDraftTags] = useState(note?.tags.join(", ") ?? "");

	// Keep drafts updated when switching notes in reading mode
	useEffect(() => {
		if (note && mode === "reading") {
			setDraftTitle(note.title);
			setDraftContent(note.content);
			setDraftTags(note.tags.join(", "));
		}
	}, [note?.id, mode]);

	const saveNote = useCallback(() => {
		if (!note) return;
		const trimmedTitle = draftTitle.trim() || note.title;
		const parsedTags = draftTags
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);
		const now = new Date().toISOString();

		setNotes((prev) =>
			prev.map((n) => {
				if (n.id === note.id) {
					return {
						...n,
						title: trimmedTitle,
						content: draftContent,
						tags: parsedTags,
						updatedAt: now,
					};
				}
				// Also update cached titles in links if title changed
				if (trimmedTitle !== note.title) {
					const updatedOutbound = n.outboundLinks.map((link) =>
						link.targetNoteId === note.id && link.targetNote
							? { ...link, targetNote: { ...link.targetNote, title: trimmedTitle } }
							: link,
					);
					const updatedInbound = n.inboundLinks.map((link) =>
						link.sourceNoteId === note.id && link.sourceNote
							? { ...link, sourceNote: { ...link.sourceNote, title: trimmedTitle } }
							: link,
					);
					return {
						...n,
						outboundLinks: updatedOutbound,
						inboundLinks: updatedInbound,
					};
				}
				return n;
			}),
		);

		setMode("reading");
	}, [note, draftTitle, draftContent, draftTags, setNotes]);

	const addLink = useCallback(
		({
			targetNoteId,
			reason,
			linkType = "manual",
			similarityScore,
		}: {
			targetNoteId: string;
			reason: string;
			linkType?: LinkType;
			similarityScore?: string | number;
		}) => {
			if (!note) {
				throw new Error("Nota atual não encontrada.");
			}
			if (targetNoteId === note.id) {
				throw new Error("Uma nota não pode ser vinculada a ela mesma.");
			}
			const trimmedReason = reason.trim();
			if (trimmedReason.length < 3) {
				throw new Error("A justificativa deve ter no mínimo 3 caracteres.");
			}

			const targetNote = notes.find((n) => n.id === targetNoteId);
			if (!targetNote) {
				throw new Error("Nota de destino não encontrada.");
			}

			const alreadyLinked = note.outboundLinks.some(
				(l) => l.targetNoteId === targetNoteId,
			);
			if (alreadyLinked) {
				throw new Error("Este vínculo já existe.");
			}

			const now = new Date().toISOString();
			const linkId = `link-${Date.now()}`;

			const newLink: NoteLink = {
				id: linkId,
				sourceNoteId: note.id,
				targetNoteId,
				linkType,
				reason: trimmedReason,
				similarityScore: similarityScore ?? (linkType === "manual" ? "1.00" : "0.85"),
				createdAt: now,
				targetNote: {
					id: targetNote.id,
					title: targetNote.title,
					tags: targetNote.tags,
					createdAt: targetNote.createdAt,
				},
				sourceNote: {
					id: note.id,
					title: note.title,
					tags: note.tags,
					createdAt: note.createdAt,
				},
			};

			setNotes((prev) =>
				prev.map((n) => {
					if (n.id === note.id) {
						return {
							...n,
							outboundLinks: [newLink, ...n.outboundLinks],
						};
					}
					if (n.id === targetNoteId) {
						return {
							...n,
							inboundLinks: [newLink, ...n.inboundLinks],
						};
					}
					return n;
				}),
			);

			return newLink;
		},
		[note, notes, setNotes],
	);

	const approveAiSuggestion = useCallback(
		({
			targetNoteId,
			reason,
			similarityScore,
		}: {
			targetNoteId: string;
			reason: string;
			similarityScore?: string;
		}) => {
			return addLink({
				targetNoteId,
				reason,
				linkType: "ai_suggested",
				similarityScore,
			});
		},
		[addLink],
	);

	const removeLink = useCallback(
		(linkId: string) => {
			setNotes((prev) =>
				prev.map((n) => ({
					...n,
					outboundLinks: n.outboundLinks.filter((l) => l.id !== linkId),
					inboundLinks: n.inboundLinks.filter((l) => l.id !== linkId),
				})),
			);
		},
		[setNotes],
	);

	// Other notes available for creating a manual link
	const availableNotesForLink = useMemo(() => {
		if (!note) return [];
		const linkedTargetIds = new Set(note.outboundLinks.map((l) => l.targetNoteId));
		return notes.filter(
			(n) => n.id !== note.id && !linkedTargetIds.has(n.id),
		);
	}, [notes, note]);

	// AI suggestions for this note (excluding already linked notes)
	const suggestedLinks = useMemo((): AiSuggestedLink[] => {
		if (!note) return [];
		const linkedTargetIds = new Set(note.outboundLinks.map((l) => l.targetNoteId));
		const preconfigured = INITIAL_AI_SUGGESTIONS_MAP[note.id] ?? [];

		const filteredPreconfigured = preconfigured.filter(
			(s) => !linkedTargetIds.has(s.targetNoteId),
		);

		if (filteredPreconfigured.length > 0) {
			return filteredPreconfigured;
		}

		// Fallback dynamic suggestion from available notes
		return availableNotesForLink.slice(0, 2).map((otherNote) => ({
			targetNoteId: otherNote.id,
			targetNoteTitle: otherNote.title,
			reason: `Sugestão contextual entre "${note.title}" e "${otherNote.title}" com base em conceitos e tags afins.`,
			similarityScore: "0.82",
			linkType: "ai_suggested",
		}));
	}, [note, availableNotesForLink]);

	return {
		note,
		mode,
		setMode,
		draftTitle,
		setDraftTitle,
		draftContent,
		setDraftContent,
		draftTags,
		setDraftTags,
		saveNote,
		addLink,
		approveAiSuggestion,
		removeLink,
		availableNotesForLink,
		suggestedLinks,
	} as const;
}
