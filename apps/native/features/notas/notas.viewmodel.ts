import { atom, useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { INITIAL_NOTES_MOCK, type Note } from "@/features/notas/notas.model";

export const notesAtom = atom<Note[]>(INITIAL_NOTES_MOCK);
export const notesSearchAtom = atom<string>("");
export const notesSelectedTagAtom = atom<string | null>(null);

export function useNotasViewModel() {
	const [notes, setNotes] = useAtom(notesAtom);
	const [search, setSearch] = useAtom(notesSearchAtom);
	const [selectedTag, setSelectedTag] = useAtom(notesSelectedTagAtom);

	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		for (const note of notes) {
			for (const tag of note.tags) {
				tagSet.add(tag);
			}
		}
		return Array.from(tagSet);
	}, [notes]);

	const filteredNotes = useMemo(() => {
		const query = search.trim().toLowerCase();
		return notes.filter((note) => {
			const matchesTag = selectedTag ? note.tags.includes(selectedTag) : true;
			const matchesSearch =
				query.length === 0 ||
				note.title.toLowerCase().includes(query) ||
				note.content.toLowerCase().includes(query);
			return matchesTag && matchesSearch;
		});
	}, [notes, search, selectedTag]);

	const createNote = useCallback(
		({
			title,
			content = "",
			tags = [],
		}: {
			title: string;
			content?: string;
			tags?: string[];
		}): Note => {
			const now = new Date().toISOString();
			const newNote: Note = {
				id: `note-${Date.now()}`,
				title: title.trim(),
				content,
				tags,
				createdAt: now,
				updatedAt: now,
				outboundLinks: [],
				inboundLinks: [],
			};
			setNotes((prev) => [newNote, ...prev]);
			return newNote;
		},
		[setNotes],
	);

	const deleteNote = useCallback(
		(id: string) => {
			setNotes((prev) =>
				prev
					.filter((note) => note.id !== id)
					.map((note) => ({
						...note,
						outboundLinks: note.outboundLinks.filter(
							(link) => link.targetNoteId !== id,
						),
						inboundLinks: note.inboundLinks.filter(
							(link) => link.sourceNoteId !== id,
						),
					})),
			);
		},
		[setNotes],
	);

	const resetFilters = useCallback(() => {
		setSearch("");
		setSelectedTag(null);
	}, [setSearch, setSelectedTag]);

	return {
		notes,
		filteredNotes,
		search,
		setSearch,
		selectedTag,
		setSelectedTag,
		allTags,
		createNote,
		deleteNote,
		resetFilters,
	} as const;
}
