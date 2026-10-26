import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotasScreen } from "@/features/notas/NotasScreen";

jest.mock("expo-router", () => ({
	useRouter: jest.fn(),
}));

function renderScreen() {
	return render(
		<SafeAreaProvider>
			<Provider>
				<NotasScreen />
			</Provider>
		</SafeAreaProvider>,
	);
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

	it("renders header and initial mock notes", async () => {
		await renderScreen();

		expect(screen.getByText("Minhas Notas (Zettelkasten)")).toBeTruthy();
		expect(
			screen.getByText("Arquitetura Hexagonal (Ports and Adapters)"),
		).toBeTruthy();
		expect(screen.getByText("Inversão de Dependência (DIP)")).toBeTruthy();
		expect(screen.getByText("Clean Architecture")).toBeTruthy();
	});

	it("filters notes when searching", async () => {
		await renderScreen();

		const searchInput = screen.getByTestId("input-busca-notas");
		await act(async () => {
			fireEvent.changeText(searchInput, "Normalização");
		});

		expect(
			screen.getByText("Normalização de Banco de Dados"),
		).toBeTruthy();
		expect(
			screen.queryByText("Arquitetura Hexagonal (Ports and Adapters)"),
		).toBeNull();

		// Clear search
		await act(async () => {
			fireEvent.press(screen.getByTestId("btn-limpar-busca"));
		});

		expect(
			screen.getByText("Arquitetura Hexagonal (Ports and Adapters)"),
		).toBeTruthy();
	});

	it("filters notes when selecting a tag", async () => {
		await renderScreen();

		const tagChip = screen.getByTestId("tag-SOLID");
		await act(async () => {
			fireEvent.press(tagChip);
		});

		expect(screen.getByText("Inversão de Dependência (DIP)")).toBeTruthy();
		expect(
			screen.queryByText("Normalização de Banco de Dados"),
		).toBeNull();

		// Click "Todas"
		await act(async () => {
			fireEvent.press(screen.getByTestId("tag-todas"));
		});

		expect(
			screen.getByText("Normalização de Banco de Dados"),
		).toBeTruthy();
	});

	it("navigates to note details when clicking on a note card", async () => {
		await renderScreen();

		const card = screen.getByTestId("note-card-note-1");
		await act(async () => {
			fireEvent.press(card);
		});

		expect(mockPush).toHaveBeenCalledWith({
			pathname: "/nota-detalhes",
			params: { id: "note-1" },
		});
	});

	it("creates a new note and navigates to its details", async () => {
		await renderScreen();

		const createBtn = screen.getByTestId("btn-criar-nota");
		await act(async () => {
			fireEvent.press(createBtn);
		});

		expect(mockPush).toHaveBeenCalledWith(
			expect.objectContaining({
				pathname: "/nota-detalhes",
				params: expect.objectContaining({
					id: expect.stringMatching(/^note-/),
				}),
			}),
		);
	});
});
