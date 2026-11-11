import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider } from "jotai";
import { Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AulaDetalhesScreen } from "@/features/aula-detalhes/AulaDetalhesScreen";
import { AULA_DETALHES_MOCK } from "@/features/aula-detalhes/aulaDetalhes.model";
import { classDetailsMapAtom } from "@/state/classroom";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({
		push: mockPush,
		back: mockBack,
	}),
	useLocalSearchParams: () => ({}),
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

	it("renders the subject and the file list by default and opens material link on press", async () => {
		const openUrlSpy = jest
			.spyOn(Linking, "openURL")
			.mockResolvedValueOnce(true);

		await renderScreen();
		expect(screen.getByText("Engenharia de Software")).toBeTruthy();
		expect(screen.getByText("Slides - Aula 04.pdf")).toBeTruthy();

		await act(async () => {
			fireEvent.press(screen.getByTestId("file-row-f1"));
		});
		expect(openUrlSpy).toHaveBeenCalledWith(
			"https://classroom.google.com/c/ucsal-eng-sw/m/slides-aula-04",
		);

		await act(async () => {
			fireEvent.press(screen.getByTestId("back-button"));
		});
		expect(mockBack).toHaveBeenCalledTimes(1);
	});

	it("allows editing the class schedule and room locally", async () => {
		await renderScreen();

		await act(async () => {
			fireEvent.press(screen.getByTestId("edit-schedule-button"));
		});

		expect(screen.getByTestId("schedule-edit-modal")).toBeTruthy();

		await act(async () => {
			fireEvent.changeText(screen.getByTestId("input-start-time"), "19:00");
		});
		await act(async () => {
			fireEvent.changeText(screen.getByTestId("input-end-time"), "20:40");
		});
		await act(async () => {
			fireEvent.changeText(
				screen.getByTestId("input-room"),
				"Lab 104 · Bloco C",
			);
		});

		await act(async () => {
			fireEvent.press(screen.getByTestId("save-schedule-button"));
		});

		expect(screen.getByText("19:00 - 20:40")).toBeTruthy();
		expect(screen.getByText("Lab 104 · Bloco C")).toBeTruthy();
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
		await act(async () => {
			fireEvent.press(createNoteButton);
		});
		expect(mockPush).toHaveBeenCalledWith(
			"/nota-detalhes?classSessionId=aula-eng-soft-04",
		);

		expect(
			screen.getByText("Fonte: Slide 08 - Arquitetura de Software"),
		).toBeTruthy();
		expect(screen.getByText("Fonte: Apostila p. 12")).toBeTruthy();

		const quizButtons = screen.getAllByText("Gerar quiz de revisão");
		expect(quizButtons.length).toBeGreaterThanOrEqual(1);
		await act(async () => {
			fireEvent.press(quizButtons[0]);
		});
		expect(mockPush).toHaveBeenCalledWith(
			"/quiz?classSessionId=aula-eng-soft-04",
		);

		expect(screen.queryByText("Slides - Aula 04.pdf")).toBeNull();
	});

	it("com PDFs reais, a aba IA oferece o quiz de todos os materiais ou de um arquivo", async () => {
		const store = createStore();
		store.set(classDetailsMapAtom, {
			"aula-eng-soft-04": {
				...AULA_DETALHES_MOCK,
				files: [
					{
						id: "mat-pdf-1",
						name: "Slides BPMN.pdf",
						meta: "Classroom · PDF",
						iconName: "file-text",
						materialType: "pdf",
					},
					{
						id: "mat-video-1",
						name: "Aula gravada",
						meta: "Classroom · VIDEO",
						iconName: "video",
						materialType: "video",
					},
				],
			},
		});
		await render(
			<SafeAreaProvider>
				<Provider store={store}>
					<AulaDetalhesScreen />
				</Provider>
			</SafeAreaProvider>,
		);
		await act(async () => {
			fireEvent.press(screen.getByTestId("tab-ia"));
		});

		expect(screen.queryByText("Fonte: Apostila p. 12")).toBeNull();
		expect(screen.queryByTestId("quiz-source-mat-video-1")).toBeNull();

		await act(async () => {
			fireEvent.press(screen.getByText("Quiz com todos os materiais"));
		});
		expect(mockPush).toHaveBeenCalledWith("/quiz?classSessionId=aula-eng-soft-04");

		await act(async () => {
			fireEvent.press(screen.getByTestId("quiz-source-mat-pdf-1"));
		});
		expect(mockPush).toHaveBeenCalledWith(
			"/quiz?classSessionId=aula-eng-soft-04&materialId=mat-pdf-1",
		);
	});
});
