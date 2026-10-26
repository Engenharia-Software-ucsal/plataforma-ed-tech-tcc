import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotaDetalhesScreen } from "@/features/notas/NotaDetalhesScreen";

jest.mock("expo-router", () => ({
	useRouter: jest.fn(),
	useLocalSearchParams: jest.fn(),
}));

function renderScreen() {
	return render(
		<SafeAreaProvider>
			<Provider>
				<NotaDetalhesScreen />
			</Provider>
		</SafeAreaProvider>,
	);
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
		(useLocalSearchParams as jest.Mock).mockReturnValue({
			id: "note-1",
		});
	});

	it("renders note details, wikilinks, and outbound/inbound sections", async () => {
		await renderScreen();

		expect(
			screen.getByText("Arquitetura Hexagonal (Ports and Adapters)"),
		).toBeTruthy();
		expect(screen.getByText("Notas Conectadas (Outbound)")).toBeTruthy();
		expect(
			screen.getByText("Mencionado em (Backlinks Inbound)"),
		).toBeTruthy();

		// Check existing links via testIDs and titles
		expect(screen.getByTestId("outbound-link-link-1")).toBeTruthy();
		expect(screen.getByTestId("outbound-link-link-2")).toBeTruthy();
		expect(screen.getByTestId("inbound-link-link-3")).toBeTruthy();
		expect(screen.getAllByText("Inversão de Dependência (DIP)").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Clean Architecture")).toBeTruthy();
	});

	it("navigates when clicking a wikilink in reading mode", async () => {
		await renderScreen();

		const wikilink = screen.getByTestId(
			"wikilink-Inversão de Dependência (DIP)",
		);
		await act(async () => {
			fireEvent.press(wikilink);
		});

		expect(mockPush).toHaveBeenCalledWith({
			pathname: "/nota-detalhes",
			params: { id: "note-2" },
		});
	});

	it("switches to editing mode, changes title and saves", async () => {
		await renderScreen();

		// Switch to editing tab
		await act(async () => {
			fireEvent.press(screen.getByTestId("tab-editing"));
		});

		const titleInput = screen.getByTestId("input-edit-title");
		await act(async () => {
			fireEvent.changeText(
				titleInput,
				"Arquitetura Hexagonal Avançada (Ports & Adapters)",
			);
		});

		// Save changes
		await act(async () => {
			fireEvent.press(screen.getByTestId("btn-salvar-nota"));
		});

		// Check updated title in reading mode
		expect(
			screen.getByText("Arquitetura Hexagonal Avançada (Ports & Adapters)"),
		).toBeTruthy();
	});

	it("adds an AI-suggested link with justification reason", async () => {
		await renderScreen();

		// Open IA suggestions modal
		await act(async () => {
			fireEvent.press(screen.getByTestId("btn-sugerir-ia"));
		});

		expect(screen.getByText("Sugestões Conceituais (IA)")).toBeTruthy();

		// Select candidate note
		await act(async () => {
			fireEvent.press(screen.getByTestId("ai-suggestion-note-4"));
		});

		// Fill in semantic justification
		const justificationInput = screen.getByTestId("input-justificativa-ia");
		await act(async () => {
			fireEvent.changeText(
				justificationInput,
				"Justificativa robusta conectando persistência relacional com adaptadores.",
			);
		});

		// Confirm AI link
		await act(async () => {
			fireEvent.press(screen.getByTestId("btn-confirmar-vinculo-ia"));
		});

		// Modal should close and new link should be rendered
		expect(screen.queryByText("Sugestões Conceituais (IA)")).toBeNull();
		expect(
			screen.getByText(
				'"Justificativa robusta conectando persistência relacional com adaptadores."',
			),
		).toBeTruthy();
	});

	it("adds a manual link with required justification reason", async () => {
		(useLocalSearchParams as jest.Mock).mockReturnValue({
			id: "note-3",
		});
		await renderScreen();

		// Open Manual Link Modal
		await act(async () => {
			fireEvent.press(screen.getByTestId("btn-adicionar-vinculo-manual"));
		});

		expect(screen.getByText("Novo Vínculo Manual")).toBeTruthy();

		// Select target note
		await act(async () => {
			fireEvent.press(screen.getByTestId("manual-note-note-4"));
		});

		// Fill in reason
		const manualInput = screen.getByTestId("input-justificativa-manual");
		await act(async () => {
			fireEvent.changeText(
				manualInput,
				"Clean Architecture isola o acesso a banco de dados com Gateways.",
			);
		});

		// Submit
		await act(async () => {
			fireEvent.press(screen.getByTestId("btn-salvar-vinculo-manual"));
		});

		// Modal closes and new outbound link is visible
		expect(screen.queryByText("Novo Vínculo Manual")).toBeNull();
		expect(
			screen.getByText(
				'"Clean Architecture isola o acesso a banco de dados com Gateways."',
			),
		).toBeTruthy();
	});

	it("removes an outbound link when delete button is pressed", async () => {
		(useLocalSearchParams as jest.Mock).mockReturnValue({
			id: "note-1",
		});
		await renderScreen();

		const deleteBtn = screen.getByTestId("outbound-link-link-1-delete-btn");
		await act(async () => {
			fireEvent.press(deleteBtn);
		});

		expect(
			screen.queryByTestId("outbound-link-link-1"),
		).toBeNull();
	});

	it("handles back button click", async () => {
		await renderScreen();

		const backBtn = screen.getByTestId("btn-voltar-notas");
		await act(async () => {
			fireEvent.press(backBtn);
		});

		expect(mockBack).toHaveBeenCalledTimes(1);
	});
});
