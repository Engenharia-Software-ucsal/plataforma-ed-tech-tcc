import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QuizResultadoScreen } from "@/features/quiz-resultado/QuizResultadoScreen";

describe("QuizResultadoScreen", () => {
	it("renders the score, title and topic breakdown", async () => {
		await render(
			<SafeAreaProvider>
				<QuizResultadoScreen />
			</SafeAreaProvider>,
		);
		expect(screen.getByText("4/5")).toBeTruthy();
		expect(screen.getByText("Mandou bem!")).toBeTruthy();
		expect(screen.getByText("Princípios SOLID")).toBeTruthy();
	});

	it("calls the retry and back handlers when their buttons are pressed", async () => {
		const onRetry = jest.fn();
		const onBack = jest.fn();
		await render(
			<SafeAreaProvider>
				<QuizResultadoScreen onRetry={onRetry} onBack={onBack} />
			</SafeAreaProvider>,
		);
		await act(async () => {
			fireEvent.press(screen.getByText("Refazer quiz"));
		});
		expect(onRetry).toHaveBeenCalledTimes(1);
		await act(async () => {
			fireEvent.press(screen.getByText("Voltar para a aula"));
		});
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});
