import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AulaDetalhesScreen } from "@/features/aula-detalhes/AulaDetalhesScreen";

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
	it("renders the subject and the file list by default", async () => {
		await renderScreen();
		expect(screen.getByText("Engenharia de Software")).toBeTruthy();
		expect(screen.getByText("Slides - Aula 04.pdf")).toBeTruthy();
	});

	it("switches to the IA tab and shows the insight card", async () => {
		await renderScreen();
		await act(async () => {
			fireEvent.press(screen.getByTestId("tab-ia"));
		});
		expect(screen.getByText("Gerar quiz de revisão")).toBeTruthy();
		expect(screen.queryByText("Slides - Aula 04.pdf")).toBeNull();
	});
});
