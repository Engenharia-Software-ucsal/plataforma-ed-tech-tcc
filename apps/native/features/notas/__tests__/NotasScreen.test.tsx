import { fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotasScreen } from "@/features/notas/NotasScreen";
import { trpc } from "@/utils/trpc";

jest.mock("expo-router", () => ({
	useRouter: jest.fn(),
}));

async function renderScreen() {
	await render(
		<SafeAreaProvider>
			<Provider>
				<NotasScreen />
			</Provider>
		</SafeAreaProvider>,
	);
	await screen.findByTestId("folder-row-folder-arq");
}

describe("NotasScreen", () => {
	const mockPush = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		(useRouter as jest.Mock).mockReturnValue({
			push: mockPush,
			back: jest.fn(),
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("mostra as pastas e as notas da raiz", async () => {
		await renderScreen();
		expect(screen.getByText("Minhas Notas")).toBeTruthy();
		expect(screen.getByTestId("folder-row-folder-arq")).toBeTruthy();
		expect(screen.getByTestId("folder-row-folder-bd")).toBeTruthy();
		expect(screen.getByText("Normalização de Banco de Dados")).toBeTruthy();
		// Notas dentro de pastas não aparecem na raiz.
		expect(screen.queryByText("Clean Architecture")).toBeNull();
		// A tag da matéria aparece no filtro e no cartão da nota.
		expect(screen.getAllByText("#banco-de-dados-ii")).toHaveLength(2);
	});

	it("abre uma pasta e volta pelo breadcrumb", async () => {
		await renderScreen();
		await fireEvent.press(screen.getByTestId("folder-row-folder-arq-abrir"));
		expect(screen.getByText("Clean Architecture")).toBeTruthy();
		expect(screen.getByTestId("folder-row-folder-solid")).toBeTruthy();
		expect(screen.getByTestId("breadcrumb-folder-arq")).toBeTruthy();

		await fireEvent.press(screen.getByTestId("breadcrumb-raiz"));
		expect(screen.queryByText("Clean Architecture")).toBeNull();
	});

	it("abre a nota ao tocar no cartão", async () => {
		await renderScreen();
		await fireEvent.press(screen.getByTestId("note-card-note-4-abrir"));
		expect(mockPush).toHaveBeenCalledWith({
			pathname: "/nota-detalhes",
			params: { id: "note-4" },
		});
	});

	it("cria uma nota na pasta aberta e abre a nota criada", async () => {
		const create = jest.spyOn(trpc.notes.create, "mutate");
		await renderScreen();
		await fireEvent.press(screen.getByTestId("folder-row-folder-bd-abrir"));
		await fireEvent.press(screen.getByTestId("btn-criar-nota"));

		expect(create).toHaveBeenCalledWith({
			title: "Nova nota",
			content: "",
			folderId: "folder-bd",
		});
		expect(mockPush).toHaveBeenCalledWith({
			pathname: "/nota-detalhes",
			params: { id: expect.stringMatching(/^note-/) },
		});
	});

	it("cria uma pasta pela caixa de nome", async () => {
		await renderScreen();
		await fireEvent.press(screen.getByTestId("btn-criar-pasta"));
		await fireEvent.changeText(
			screen.getByTestId("nome-pasta-input"),
			"Provas",
		);
		await fireEvent.press(screen.getByTestId("nome-pasta-confirmar"));
		expect(await screen.findByText("Provas")).toBeTruthy();
	});

	it("move uma nota para outra pasta pelo menu de ações", async () => {
		const move = jest.spyOn(trpc.notes.move, "mutate");
		await renderScreen();
		await fireEvent.press(screen.getByTestId("note-card-note-4-acoes"));
		await fireEvent.press(screen.getByTestId("acoes-item-mover"));
		await fireEvent.press(screen.getByTestId("move-to-sheet-folder-bd"));

		expect(move).toHaveBeenCalledWith({ id: "note-4", folderId: "folder-bd" });
		expect(screen.queryByTestId("note-card-note-4")).toBeNull();
	});

	it("pergunta o que fazer com o conteúdo ao excluir uma pasta", async () => {
		const remove = jest.spyOn(trpc.folders.delete, "mutate");
		await renderScreen();
		await fireEvent.press(screen.getByTestId("folder-row-folder-arq-acoes"));
		await fireEvent.press(screen.getByTestId("acoes-item-excluir"));
		await fireEvent.press(screen.getByTestId("excluir-pasta-tudo"));

		expect(remove).toHaveBeenCalledWith({ id: "folder-arq", mode: "trashAll" });
		expect(screen.queryByTestId("folder-row-folder-arq")).toBeNull();
	});

	it("busca em todas as pastas e mostra onde cada nota está", async () => {
		await renderScreen();
		await fireEvent.changeText(
			screen.getByTestId("input-busca-notas"),
			"Clean",
		);
		// A nota 3 pelo título; a nota 1 porque cita [[Clean Architecture]] no texto.
		expect(await screen.findByText("2 notas encontradas")).toBeTruthy();
		expect(screen.getByTestId("note-card-note-3")).toBeTruthy();
		expect(screen.getByTestId("note-card-note-1")).toBeTruthy();
		expect(screen.getAllByText("Arquitetura de Software")).toHaveLength(2);
	});

	it("abre a lixeira", async () => {
		await renderScreen();
		await fireEvent.press(screen.getByTestId("btn-abrir-lixeira"));
		expect(mockPush).toHaveBeenCalledWith("/lixeira");
	});
});
