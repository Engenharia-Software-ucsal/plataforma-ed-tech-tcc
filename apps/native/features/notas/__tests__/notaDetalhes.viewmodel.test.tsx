import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Provider } from "jotai";
import type React from "react";
import {
	AUTOSAVE_DELAY_MS,
	useNotaDetalhesViewModel,
} from "@/features/notas/notaDetalhes.viewmodel";
import { INITIAL_NOTES_MOCK } from "@/features/notas/notas.model";
import { TrpcClientError, trpc } from "@/utils/trpc";

function wrapper({ children }: { children: React.ReactNode }) {
	return <Provider>{children}</Provider>;
}

async function renderNote(id = "note-1") {
	const hook = await renderHook(() => useNotaDetalhesViewModel(id), {
		wrapper,
	});
	await waitFor(() => expect(hook.result.current.loadState).toBe("ready"));
	return hook;
}

const NOTE_1 = INITIAL_NOTES_MOCK[0];

describe("useNotaDetalhesViewModel", () => {
	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it("carrega a nota com tags automáticas e links resolvidos", async () => {
		const { result } = await renderNote();
		expect(result.current.note?.title).toBe(NOTE_1?.title);
		expect(result.current.visibleTags[0]).toBe("#engenharia-de-software");
		expect(result.current.resolveTarget("clean architecture")).toBe("note-3");
		expect(result.current.unresolvedTargets).toEqual([
			"Arquitetura em Camadas",
		]);
	});

	it("indica nota inexistente", async () => {
		const { result } = await renderHook(
			() => useNotaDetalhesViewModel("nao-existe"),
			{ wrapper },
		);
		await waitFor(() => expect(result.current.loadState).toBe("not_found"));
	});

	it("salva sozinho depois de parar de digitar, enviando só o que mudou e a versão", async () => {
		jest.useFakeTimers();
		const update = jest.spyOn(trpc.notes.update, "mutate");
		const { result } = await renderNote();

		await act(async () => result.current.setMode("edit"));
		await act(async () => result.current.setDraftContent("Texto novo"));
		expect(result.current.saveStatus).toBe("dirty");
		expect(update).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(AUTOSAVE_DELAY_MS);
		});
		await waitFor(() => expect(result.current.saveStatus).toBe("saved"));
		expect(update).toHaveBeenCalledTimes(1);
		expect(update).toHaveBeenCalledWith({
			id: "note-1",
			content: "Texto novo",
			expectedUpdatedAt: NOTE_1?.updatedAt,
		});
		expect(result.current.note?.content).toBe("Texto novo");
	});

	it("salva ao concluir a edição", async () => {
		const update = jest.spyOn(trpc.notes.update, "mutate");
		const { result } = await renderNote();
		await act(async () => result.current.setMode("edit"));
		await act(async () =>
			result.current.setDraftTags("Arquitetura, Prova, prova"),
		);
		await act(async () => result.current.setMode("view"));
		await waitFor(() => expect(update).toHaveBeenCalled());
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({ id: "note-1", tags: ["Arquitetura", "Prova"] }),
		);
	});

	it("não envia título inválido e mostra o motivo", async () => {
		const update = jest.spyOn(trpc.notes.update, "mutate");
		const { result } = await renderNote();
		await act(async () =>
			result.current.setDraftTitle("Título com [colchete]"),
		);
		await act(async () => {
			await result.current.save();
		});
		expect(update).not.toHaveBeenCalled();
		expect(result.current.saveStatus).toBe("error");
		expect(result.current.saveError).toContain("[ ] | #");
	});

	it("mantém o rascunho quando o salvamento falha", async () => {
		jest
			.spyOn(trpc.notes.update, "mutate")
			.mockRejectedValue(
				new TrpcClientError("Falha de conexão com o servidor"),
			);
		const { result } = await renderNote();
		await act(async () => result.current.setDraftContent("não perder"));
		await act(async () => {
			await result.current.save();
		});
		expect(result.current.saveStatus).toBe("error");
		expect(result.current.draftContent).toBe("não perder");
		expect(result.current.isDirty).toBe(true);
	});

	it("em conflito, para o autosave e deixa escolher manter a versão local", async () => {
		const update = jest
			.spyOn(trpc.notes.update, "mutate")
			.mockRejectedValueOnce(
				new TrpcClientError(
					"Esta nota foi alterada em outro lugar.",
					"CONFLICT",
				),
			);
		const { result } = await renderNote();
		await act(async () => result.current.setDraftContent("minha versão"));
		await act(async () => {
			await result.current.save();
		});
		expect(result.current.saveStatus).toBe("conflict");

		// Sem escolher, novos salvamentos não sobrescrevem o servidor.
		await act(async () => {
			await result.current.save();
		});
		expect(update).toHaveBeenCalledTimes(1);

		await act(async () => {
			await result.current.resolveConflict("mine");
		});
		expect(update).toHaveBeenLastCalledWith({
			id: "note-1",
			content: "minha versão",
			expectedUpdatedAt: undefined,
		});
		expect(result.current.saveStatus).toBe("saved");
	});

	it("em conflito, pode descartar o rascunho e recarregar a do servidor", async () => {
		jest
			.spyOn(trpc.notes.update, "mutate")
			.mockRejectedValueOnce(
				new TrpcClientError("Alterada em outro lugar.", "CONFLICT"),
			);
		const { result } = await renderNote();
		await act(async () => result.current.setDraftContent("descartar"));
		await act(async () => {
			await result.current.save();
		});
		await act(async () => {
			await result.current.resolveConflict("server");
		});
		expect(result.current.draftContent).toBe(NOTE_1?.content);
		expect(result.current.saveStatus).toBe("saved");
	});

	it("aplica formatação na seleção", async () => {
		const { result } = await renderNote();
		await act(async () => result.current.setDraftContent("um dois"));
		await act(async () =>
			result.current.onSelectionChange({ start: 3, end: 7 }),
		);
		await act(async () => result.current.format("bold"));
		expect(result.current.draftContent).toBe("um **dois**");
		expect(result.current.forcedSelection).toEqual({ start: 5, end: 9 });
	});

	it("sugere notas ao digitar [[ e completa o link", async () => {
		const { result } = await renderNote();
		await act(async () => result.current.setMode("edit"));
		const text = "ver [[clean";
		await act(async () => result.current.setDraftContent(text));
		await act(async () =>
			result.current.onSelectionChange({
				start: text.length,
				end: text.length,
			}),
		);

		expect(result.current.wikilinkQuery).toBe("clean");
		expect(result.current.wikilinkSuggestions.map((note) => note.id)).toEqual([
			"note-3",
		]);

		await act(async () =>
			result.current.pickWikilinkSuggestion("Clean Architecture"),
		);
		expect(result.current.draftContent).toBe("ver [[Clean Architecture]]");
		expect(result.current.wikilinkQuery).toBeNull();
	});

	it("cria a nota de um link pendente na mesma pasta", async () => {
		const create = jest.spyOn(trpc.notes.create, "mutate");
		const { result } = await renderNote();
		let outcome:
			| Awaited<ReturnType<typeof result.current.createNoteFromLink>>
			| undefined;
		await act(async () => {
			outcome = await result.current.createNoteFromLink(
				"Arquitetura em Camadas",
			);
		});
		expect(create).toHaveBeenCalledWith({
			title: "Arquitetura em Camadas",
			content: "",
			folderId: "folder-arq",
		});
		expect(outcome).toEqual({ id: expect.stringMatching(/^note-/) });
	});

	it("adiciona e remove vínculos manuais, sem duplicar", async () => {
		const { result } = await renderNote("note-3");
		await act(async () => {
			await result.current.addLink({
				targetNoteId: "note-4",
				reason: "Persistência do domínio",
			});
		});
		const added = result.current.note?.outboundLinks[0];
		expect(added).toMatchObject({ targetNoteId: "note-4", linkType: "manual" });
		expect(added?.targetNote?.title).toBe("Normalização de Banco de Dados");

		await expect(
			result.current.addLink({
				targetNoteId: "note-4",
				reason: "De novo aqui",
			}),
		).rejects.toThrow("Este vínculo já existe.");

		await act(async () => {
			await result.current.removeLink(added?.id as string);
		});
		expect(result.current.note?.outboundLinks).toEqual([]);
	});
});
