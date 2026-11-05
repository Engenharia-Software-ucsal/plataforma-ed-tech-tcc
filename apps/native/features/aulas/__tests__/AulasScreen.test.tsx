import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AulasScreen } from "@/features/aulas/AulasScreen";

describe("AulasScreen", () => {
	it("renders the hero, semester chips, full class list, and syncs Classroom on button press", async () => {
		await render(
			<SafeAreaProvider>
				<Provider>
					<AulasScreen />
				</Provider>
			</SafeAreaProvider>,
		);
		expect(screen.getByText("Todas as aulas")).toBeTruthy();
		expect(screen.getByText("Banco de Dados II")).toBeTruthy();

		expect(screen.getByTestId("semester-chip-2026.2")).toBeTruthy();
		expect(screen.getByTestId("semester-chip-2026.1")).toBeTruthy();
		expect(screen.getByTestId("semester-chip-todos")).toBeTruthy();
		expect(screen.getByText("Todos")).toBeTruthy();

		await act(async () => {
			fireEvent.press(screen.getByTestId("semester-chip-2026.1"));
		});

		expect(screen.getAllByText("Estrutura de Dados").length).toBeGreaterThan(0);
		expect(screen.getByText("Arquitetura de Computadores")).toBeTruthy();

		const syncButton = screen.getByTestId("sync-classroom-button");
		expect(syncButton).toBeTruthy();

		await act(async () => {
			fireEvent.press(syncButton);
		});

		expect(
			screen.getByText("Sincronizado com Classroom agora"),
		).toBeTruthy();
	});
});
