import { fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LixeiraScreen } from "@/features/lixeira/LixeiraScreen";
import { TrpcClientError, trpc } from "@/utils/trpc";

jest.mock("expo-router", () => ({
	useRouter: jest.fn(),
}));

async function renderScreen() {
	await render(
		<SafeAreaProvider>
			<Provider>
				<LixeiraScreen />
			</Provider>
		</SafeAreaProvider>,
	);
}

describe("LixeiraScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useRouter as jest.Mock).mockReturnValue({
			back: jest.fn(),
			push: jest.fn(),
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("lista os itens com os dias restantes", async () => {
		await renderScreen();
		expect(await screen.findByText("Semestre 2026.1")).toBeTruthy();
		expect(
			screen.getByText("Pasta · 3 itens dentro · apagada de vez em 27 dias"),
		).toBeTruthy();
		expect(screen.getByText("Nota · apagada de vez em 23 dias")).toBeTruthy();
	});

	it("restaura um item", async () => {
		const restore = jest.spyOn(trpc.trash.restore, "mutate");
		await renderScreen();
		await fireEvent.press(
			await screen.findByTestId("btn-restaurar-trash-note-1"),
		);
		expect(restore).toHaveBeenCalledWith({ id: "trash-note-1", type: "note" });
		expect(screen.queryByTestId("lixeira-item-trash-note-1")).toBeNull();
		expect(screen.getByText('"Rascunho de TCC" foi restaurada.')).toBeTruthy();
	});

	it("avisa quando o item volta com outro nome", async () => {
		jest.spyOn(trpc.trash.restore, "mutate").mockResolvedValue({
			type: "note",
			id: "trash-note-1",
			name: "Rascunho de TCC (restaurada)",
			parentId: null,
		});
		await renderScreen();
		await fireEvent.press(
			await screen.findByTestId("btn-restaurar-trash-note-1"),
		);
		expect(screen.getByTestId("lixeira-aviso").props.children).toContain(
			"(restaurada)",
		);
	});

	it("exclui de vez só depois de confirmar", async () => {
		const remove = jest.spyOn(trpc.trash.deletePermanently, "mutate");
		await renderScreen();
		await fireEvent.press(
			await screen.findByTestId("btn-excluir-de-vez-trash-folder-1"),
		);
		expect(remove).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByTestId("confirmar-exclusao-confirmar"));
		expect(remove).toHaveBeenCalledWith({
			id: "trash-folder-1",
			type: "folder",
		});
		expect(screen.queryByTestId("lixeira-item-trash-folder-1")).toBeNull();
	});

	it("esvazia a lixeira", async () => {
		await renderScreen();
		await fireEvent.press(await screen.findByTestId("btn-esvaziar-lixeira"));
		await fireEvent.press(screen.getByTestId("confirmar-exclusao-confirmar"));
		expect(await screen.findByTestId("lixeira-vazia")).toBeTruthy();
	});

	it("mostra erro de carregamento com opção de tentar de novo", async () => {
		jest
			.spyOn(trpc.trash.list, "query")
			.mockRejectedValueOnce(
				new TrpcClientError("Falha de conexão com o servidor"),
			);
		await renderScreen();
		expect(
			await screen.findByText("Falha de conexão com o servidor"),
		).toBeTruthy();
		await fireEvent.press(screen.getByTestId("btn-recarregar-lixeira"));
		expect(await screen.findByText("Semestre 2026.1")).toBeTruthy();
	});
});
