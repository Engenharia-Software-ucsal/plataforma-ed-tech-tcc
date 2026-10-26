import { act, renderHook } from "@testing-library/react-native";
import { Provider } from "jotai";
import type React from "react";
import { useNotaDetalhesViewModel } from "@/features/notas/notaDetalhes.viewmodel";
import { useNotasViewModel } from "@/features/notas/notas.viewmodel";

function wrapper({ children }: { children: React.ReactNode }) {
	return <Provider>{children}</Provider>;
}

describe("notas viewmodels", () => {
	describe("useNotasViewModel", () => {
		it("initializes with mock notes and provides search/filtering", async () => {
			const { result } = await renderHook(() => useNotasViewModel(), {
				wrapper,
			});

			expect(result.current.notes.length).toBeGreaterThanOrEqual(4);
			expect(result.current.allTags).toContain("Arquitetura");

			await act(async () => {
				result.current.setSearch("Normalização");
			});
			expect(result.current.filteredNotes.length).toBe(1);
			expect(result.current.filteredNotes[0].id).toBe("note-4");

			await act(async () => {
				result.current.resetFilters();
			});
			expect(result.current.search).toBe("");
			expect(result.current.selectedTag).toBeNull();
		});

		it("creates and deletes a note", async () => {
			const { result } = await renderHook(() => useNotasViewModel(), {
				wrapper,
			});

			let createdNoteId = "";
			await act(async () => {
				const created = result.current.createNote({
					title: "Test Note",
					content: "Test Content",
					tags: ["Test"],
				});
				createdNoteId = created.id;
			});

			expect(
				result.current.notes.some((n) => n.id === createdNoteId),
			).toBe(true);

			await act(async () => {
				result.current.deleteNote(createdNoteId);
			});

			expect(
				result.current.notes.some((n) => n.id === createdNoteId),
			).toBe(false);
		});
	});

	describe("useNotaDetalhesViewModel", () => {
		it("throws when reason has less than 3 characters", async () => {
			const { result } = await renderHook(
				() => useNotaDetalhesViewModel("note-1"),
				{ wrapper },
			);

			expect(() => {
				result.current.addLink({
					targetNoteId: "note-4",
					reason: "ab",
				});
			}).toThrow("A justificativa deve ter no mínimo 3 caracteres.");
		});

		it("throws when linking to the same note", async () => {
			const { result } = await renderHook(
				() => useNotaDetalhesViewModel("note-1"),
				{ wrapper },
			);

			expect(() => {
				result.current.addLink({
					targetNoteId: "note-1",
					reason: "Mesma nota",
				});
			}).toThrow("Uma nota não pode ser vinculada a ela mesma.");
		});

		it("throws when linking to already linked target", async () => {
			const { result } = await renderHook(
				() => useNotaDetalhesViewModel("note-1"),
				{ wrapper },
			);

			expect(() => {
				result.current.addLink({
					targetNoteId: "note-2",
					reason: "Já existe vínculo",
				});
			}).toThrow("Este vínculo já existe.");
		});
	});
});
