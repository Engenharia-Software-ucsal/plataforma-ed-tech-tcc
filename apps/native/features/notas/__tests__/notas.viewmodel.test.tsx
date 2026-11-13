import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Provider } from "jotai";
import type React from "react";
import { useNotasViewModel } from "@/features/notas/notas.viewmodel";
import { TrpcClientError, trpc } from "@/utils/trpc";

function wrapper({ children }: { children: React.ReactNode }) {
	return <Provider>{children}</Provider>;
}

async function renderReady() {
	const hook = await renderHook(() => useNotasViewModel(), { wrapper });
	await waitFor(() => expect(hook.result.current.status).toBe("ready"));
	return hook;
}

const ids = (items: Array<{ id: string }>) => items.map((item) => item.id);

describe("useNotasViewModel", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("carrega a árvore e navega entre pastas com breadcrumb", async () => {
		const { result } = await renderReady();

		expect(ids(result.current.childFolders)).toEqual([
			"folder-arq",
			"folder-bd",
		]);
		expect(ids(result.current.childNotes)).toEqual(["note-4"]);
		expect(result.current.folderSummary("folder-arq")).toBe(
			"2 notas · 1 pasta",
		);

		await act(async () => result.current.openFolder("folder-solid"));
		expect(result.current.breadcrumb.map((folder) => folder.name)).toEqual([
			"Arquitetura de Software",
			"SOLID",
		]);
		expect(ids(result.current.childNotes)).toEqual(["note-2"]);
		expect(result.current.folderPathLabel("folder-solid")).toBe(
			"Arquitetura de Software / SOLID",
		);
	});

	it("mostra a mensagem de login quando o servidor recusa por falta de sessão", async () => {
		jest
			.spyOn(trpc.folders.tree, "query")
			.mockRejectedValue(
				new TrpcClientError("Usuário não autenticado", "UNAUTHORIZED"),
			);
		const { result } = await renderHook(() => useNotasViewModel(), { wrapper });
		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(result.current.loadError).toBe(
			"Entre com sua conta para ver suas notas.",
		);
	});

	it("lista as tags de matéria primeiro e filtra por elas", async () => {
		const { result } = await renderReady();
		expect(result.current.allTags.slice(0, 2)).toEqual([
			"#banco-de-dados-ii",
			"#engenharia-de-software",
		]);
		expect(result.current.allTags).toContain("Arquitetura");

		await act(async () => result.current.setSelectedTag("#banco-de-dados-ii"));
		expect(result.current.isFiltering).toBe(true);
		expect(ids(result.current.filteredNotes)).toEqual(["note-4"]);
	});

	it("busca no servidor pelo conteúdo completo, em todas as pastas", async () => {
		const list = jest.spyOn(trpc.notes.list, "query");
		const { result } = await renderReady();

		await act(async () => result.current.setSearch("SELECT"));
		await waitFor(() => expect(result.current.searching).toBe(false));
		expect(list).toHaveBeenCalledWith({ search: "SELECT" });
		expect(ids(result.current.filteredNotes)).toEqual(["note-4"]);
	});

	it("cria notas com título livre na pasta aberta", async () => {
		const create = jest.spyOn(trpc.notes.create, "mutate");
		const { result } = await renderReady();
		await act(async () => result.current.openFolder("folder-bd"));

		let first: Awaited<ReturnType<typeof result.current.createNote>>;
		await act(async () => {
			first = await result.current.createNote();
		});
		expect(create).toHaveBeenLastCalledWith({
			title: "Nova nota",
			content: "",
			folderId: "folder-bd",
		});
		expect(ids(result.current.childNotes)).toEqual([first?.id]);

		await act(async () => {
			await result.current.createNote();
		});
		expect(create).toHaveBeenLastCalledWith(
			expect.objectContaining({ title: "Nova nota 2" }),
		);
	});

	it("devolve o erro do servidor ao criar pasta com nome repetido", async () => {
		jest
			.spyOn(trpc.folders.create, "mutate")
			.mockRejectedValue(
				new TrpcClientError(
					'Já existe uma pasta chamada "SOLID" aqui.',
					"CONFLICT",
				),
			);
		const { result } = await renderReady();
		let error: string | null = null;
		await act(async () => {
			error = await result.current.createFolder("SOLID");
		});
		expect(error).toBe('Já existe uma pasta chamada "SOLID" aqui.');
	});

	it("sobe uma nota entre as irmãs e desfaz se o servidor recusar", async () => {
		const reorder = jest.spyOn(trpc.notes.reorder, "mutate");
		const { result } = await renderReady();
		await act(async () => result.current.openFolder("folder-arq"));
		expect(ids(result.current.childNotes)).toEqual(["note-1", "note-3"]);

		await act(async () => {
			await result.current.shiftItem("note", "note-3", -1);
		});
		expect(ids(result.current.childNotes)).toEqual(["note-3", "note-1"]);
		expect(reorder).toHaveBeenCalledWith({
			folderId: "folder-arq",
			orderedIds: ["note-3", "note-1"],
		});

		reorder.mockRejectedValueOnce(
			new TrpcClientError("Falhou", "INTERNAL_SERVER_ERROR"),
		);
		await act(async () => {
			await result.current.shiftItem("note", "note-3", 1);
		});
		expect(ids(result.current.childNotes)).toEqual(["note-3", "note-1"]);
		expect(result.current.actionError).toBe("Falhou");
	});

	it("move uma nota para outra pasta", async () => {
		const move = jest.spyOn(trpc.notes.move, "mutate");
		const { result } = await renderReady();
		await act(async () => {
			await result.current.moveItem("note", "note-4", "folder-bd");
		});
		expect(move).toHaveBeenCalledWith({ id: "note-4", folderId: "folder-bd" });
		expect(ids(result.current.childNotes)).toEqual([]);
		expect(result.current.folderSummary("folder-bd")).toBe("1 nota");
	});

	it("envia a pasta com tudo dentro para a lixeira", async () => {
		const remove = jest.spyOn(trpc.folders.delete, "mutate");
		const { result } = await renderReady();
		await act(async () => {
			await result.current.deleteFolder("folder-arq", "trashAll");
		});
		expect(remove).toHaveBeenCalledWith({ id: "folder-arq", mode: "trashAll" });
		expect(ids(result.current.folders)).toEqual(["folder-bd"]);
		expect(ids(result.current.notes)).toEqual(["note-4"]);
	});

	it("bloqueia mover uma pasta para ela mesma ou descendentes", async () => {
		const { result } = await renderReady();
		expect(result.current.blockedDestinations("folder-arq").sort()).toEqual(
			["folder-arq", "folder-solid"].sort(),
		);
	});

	it("envia uma nota para a lixeira", async () => {
		const { result } = await renderReady();
		await act(async () => {
			await result.current.trashNote("note-4");
		});
		expect(ids(result.current.childNotes)).toEqual([]);
	});
});
