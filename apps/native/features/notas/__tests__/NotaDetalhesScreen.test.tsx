import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotaDetalhesScreen } from "@/features/notas/NotaDetalhesScreen";
import { trpc } from "@/utils/trpc";

jest.mock("expo-router", () => ({
	useRouter: jest.fn(),
	useLocalSearchParams: jest.fn(),
}));

async function renderScreen(id = "note-1") {
	(useLocalSearchParams as jest.Mock).mockReturnValue({ id });
	await render(
		<SafeAreaProvider>
			<Provider>
				<NotaDetalhesScreen />
			</Provider>
		</SafeAreaProvider>,
	);
	await screen.findByTestId("note-markdown-content");
}

describe("NotaDetalhesScreen", () => {
	const mockPush = jest.fn();
	const mockBack = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		(useRouter as jest.Mock).mockReturnValue({
			push: mockPush,
			back: mockBack,
			replace: jest.fn(),
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("renderiza o Markdown, a tag da matéria, os links e os backlinks", async () => {
		await renderScreen();
		expect(
			screen.getByText("Arquitetura Hexagonal (Ports and Adapters)"),
		).toBeTruthy();
		expect(screen.getByText("Pendências")).toBeTruthy();
		expect(screen.getByText("portas e adaptadores")).toBeTruthy();
		expect(screen.getByTestId("auto-tag-engenharia-de-software")).toBeTruthy();
		expect(screen.getByTestId("outbound-link-link-1")).toBeTruthy();
		expect(screen.getByTestId("inbound-link-link-3")).toBeTruthy();
		expect(screen.getByText("No texto")).toBeTruthy();
		expect(screen.getByTestId("links-pendentes")).toBeTruthy();
	});

	it("abre a nota de um wikilink resolvido", async () => {
		await renderScreen();
		await fireEvent.press(
			screen.getByTestId("wikilink-Inversão de Dependência (DIP)"),
		);
		expect(mockPush).toHaveBeenCalledWith({
			pathname: "/nota-detalhes",
			params: { id: "note-2" },
		});
	});

	it("oferece criar a nota de um wikilink pendente", async () => {
		const create = jest.spyOn(trpc.notes.create, "mutate");
		await renderScreen();
		await fireEvent.press(
			screen.getByTestId("wikilink-Arquitetura em Camadas"),
		);
		expect(
			screen.getByText('"Arquitetura em Camadas" ainda não existe'),
		).toBeTruthy();

		await fireEvent.press(screen.getByTestId("criar-nota-do-link-criar"));
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Arquitetura em Camadas",
				folderId: "folder-arq",
			}),
		);
		expect(mockPush).toHaveBeenCalledWith({
			pathname: "/nota-detalhes",
			params: { id: expect.stringMatching(/^note-/) },
		});
	});

	it("edita com a barra de formatação e salva ao concluir", async () => {
		const update = jest.spyOn(trpc.notes.update, "mutate");
		await renderScreen("note-4");
		await fireEvent.press(screen.getByTestId("tab-edit"));

		await fireEvent.changeText(screen.getByTestId("input-edit-content"), "");
		await fireEvent.press(screen.getByTestId("toolbar-bold"));
		expect(screen.getByTestId("input-edit-content").props.value).toBe("****");

		await fireEvent.changeText(
			screen.getByTestId("input-edit-title"),
			"Normalização (3FN)",
		);
		await fireEvent.press(screen.getByTestId("btn-concluir-edicao"));

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "note-4",
				title: "Normalização (3FN)",
				content: "****",
			}),
		);
		expect(await screen.findByText("Normalização (3FN)")).toBeTruthy();
	});

	it("mostra sugestões de notas ao digitar [[", async () => {
		await renderScreen("note-4");
		await fireEvent.press(screen.getByTestId("tab-edit"));
		const input = screen.getByTestId("input-edit-content");
		await fireEvent.changeText(input, "ver [[Clean");
		await fireEvent(input, "selectionChange", {
			nativeEvent: { selection: { start: 11, end: 11 } },
		});

		await fireEvent.press(
			await screen.findByTestId("sugestao-wikilink-note-3"),
		);
		expect(screen.getByTestId("input-edit-content").props.value).toBe(
			"ver [[Clean Architecture]]",
		);
	});

	it("adiciona um vínculo sugerido pela IA com justificativa", async () => {
		const addLink = jest.spyOn(trpc.notes.addLink, "mutate");
		await renderScreen();
		await fireEvent.press(screen.getByTestId("btn-sugerir-ia"));
		await fireEvent.press(await screen.findByTestId("ai-suggestion-note-4"));
		await fireEvent.changeText(
			screen.getByTestId("input-justificativa-ia"),
			"Persistência relacional por trás dos adaptadores.",
		);
		await fireEvent.press(screen.getByTestId("btn-confirmar-vinculo-ia"));

		expect(addLink).toHaveBeenCalledWith({
			sourceNoteId: "note-1",
			targetNoteId: "note-4",
			reason: "Persistência relacional por trás dos adaptadores.",
			linkType: "ai_suggested",
		});
		expect(
			screen.getAllByText("Normalização de Banco de Dados").length,
		).toBeGreaterThanOrEqual(1);
	});

	it("não oferece remover vínculos que vêm do texto", async () => {
		await renderScreen("note-2");
		expect(screen.queryByTestId("outbound-link-link-3-delete-btn")).toBeNull();
	});

	it("move a nota para a lixeira e volta", async () => {
		const remove = jest.spyOn(trpc.notes.delete, "mutate");
		await renderScreen();
		await fireEvent.press(screen.getByTestId("btn-lixeira-nota"));
		await fireEvent.press(screen.getByTestId("confirmar-lixeira-confirmar"));
		expect(remove).toHaveBeenCalledWith({ id: "note-1" });
		expect(mockBack).toHaveBeenCalled();
	});

	it("mostra a tela de nota não encontrada", async () => {
		(useLocalSearchParams as jest.Mock).mockReturnValue({ id: "nao-existe" });
		await render(
			<SafeAreaProvider>
				<Provider>
					<NotaDetalhesScreen />
				</Provider>
			</SafeAreaProvider>,
		);
		expect(await screen.findByText("Nota não encontrada.")).toBeTruthy();
	});
});
