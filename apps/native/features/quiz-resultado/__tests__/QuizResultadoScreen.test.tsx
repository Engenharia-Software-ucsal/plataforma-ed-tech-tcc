import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createStore, Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { lastQuizAttemptResultAtom } from "@/features/quiz/quiz.viewmodel";
import { QuizResultadoScreen } from "@/features/quiz-resultado/QuizResultadoScreen";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
	useRouter: () => ({ replace: mockReplace }),
}));

function renderWithResult(onBack?: () => void) {
	const store = createStore();
	store.set(lastQuizAttemptResultAtom, {
		quizId: "quiz-1",
		classSessionId: "class-1",
		score: 80,
		correct: 4,
		total: 5,
		topics: [
			{ questionId: "q1", label: "Princípios SOLID", correct: true },
			{ questionId: "q2", label: "Circuit Breaker", correct: true },
			{
				questionId: "q3",
				label: "Arquitetura de microsserviços",
				correct: false,
			},
		],
	});
	return render(
		<SafeAreaProvider>
			<Provider store={store}>
				<QuizResultadoScreen onBack={onBack} />
			</Provider>
		</SafeAreaProvider>,
	);
}

describe("QuizResultadoScreen", () => {
	beforeEach(() => {
		mockReplace.mockClear();
	});

	it("renders the score, title and topic breakdown", async () => {
		await renderWithResult();
		expect(screen.getByText("4/5")).toBeTruthy();
		expect(screen.getByText("Mandou bem!")).toBeTruthy();
		expect(screen.getByText("Princípios SOLID")).toBeTruthy();
	});

	it("shows an empty state when there is no recent result", async () => {
		await render(
			<SafeAreaProvider>
				<Provider>
					<QuizResultadoScreen />
				</Provider>
			</SafeAreaProvider>,
		);
		expect(screen.getByText("Nenhum resultado recente")).toBeTruthy();
	});

	it("navigates to retry the same quiz without generating a new one", async () => {
		await renderWithResult();
		await act(async () => {
			fireEvent.press(screen.getByText("Refazer quiz"));
		});
		expect(mockReplace).toHaveBeenCalledWith("/quiz?quizId=quiz-1");
	});

	it("calls the back handler when its button is pressed", async () => {
		const onBack = jest.fn();
		await renderWithResult(onBack);
		await act(async () => {
			fireEvent.press(screen.getByText("Voltar para a aula"));
		});
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});
