import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QuizScreen } from "@/features/quiz/QuizScreen";

import { Provider } from "jotai";

function renderScreen() {
	return render(
		<SafeAreaProvider>
			<Provider>
				<QuizScreen />
			</Provider>
		</SafeAreaProvider>,
	);
}

describe("QuizScreen", () => {
	it("renders the first question and its options", async () => {
		await renderScreen();
		expect(
			screen.getByText(
				"Qual princípio SOLID afirma que uma classe deve ter apenas um motivo para mudar?",
			),
		).toBeTruthy();
		expect(screen.getByText("Single Responsibility Principle")).toBeTruthy();
	});

	it("selects an option and advances to the next question", async () => {
		await renderScreen();
		await act(async () => {
			fireEvent.press(screen.getByText("Single Responsibility Principle"));
		});
		await act(async () => {
			fireEvent.press(screen.getByText("Próxima pergunta"));
		});
		expect(
			screen.getByText(
				"Qual padrão evita chamadas repetidas a um serviço que está falhando?",
			),
		).toBeTruthy();
	});
});
