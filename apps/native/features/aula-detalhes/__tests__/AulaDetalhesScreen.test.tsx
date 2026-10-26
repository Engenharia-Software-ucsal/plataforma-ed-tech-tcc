import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AulaDetalhesScreen } from "@/features/aula-detalhes/AulaDetalhesScreen";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({
		push: mockPush,
		back: mockBack,
	}),
}));

function renderScreen() {
	return render(
		<SafeAreaProvider>
			<Provider>
				<AulaDetalhesScreen />
			</Provider>
		</SafeAreaProvider>,
	);
}

describe("AulaDetalhesScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders the subject and the file list by default", async () => {
		await renderScreen();
		expect(screen.getByText("Engenharia de Software")).toBeTruthy();
		expect(screen.getByText("Slides - Aula 04.pdf")).toBeTruthy();

		fireEvent.press(screen.getByTestId("back-button"));
		expect(mockBack).toHaveBeenCalledTimes(1);
	});

	it("switches to the IA tab, shows anti-offloading banner and insight cards with sources", async () => {
		await renderScreen();
		await act(async () => {
			fireEvent.press(screen.getByTestId("tab-ia"));
		});

		expect(
			screen.getByText(
				"Antes de consultar os resumos da IA, registre suas próprias anotações na aba Notas para consolidar os esquemas mentais e evitar o cognitive offloading.",
			),
		).toBeTruthy();

		const createNoteButton = screen.getByText("Criar Nota desta Aula");
		expect(createNoteButton).toBeTruthy();
		fireEvent.press(createNoteButton);
		expect(mockPush).toHaveBeenCalledWith(
			"/nota-detalhes?classSessionId=aula-eng-soft-04",
		);

		expect(
			screen.getByText("Fonte: Slide 08 - Arquitetura de Software"),
		).toBeTruthy();
		expect(screen.getByText("Fonte: Apostila p. 12")).toBeTruthy();

		const quizButtons = screen.getAllByText("Gerar quiz de revisão");
		expect(quizButtons.length).toBeGreaterThanOrEqual(1);
		fireEvent.press(quizButtons[0]);
		expect(mockPush).toHaveBeenCalledWith("/quiz");

		expect(screen.queryByText("Slides - Aula 04.pdf")).toBeNull();
	});
});
