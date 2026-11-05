import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PerfilScreen } from "@/features/perfil/PerfilScreen";

function renderScreen(onSignOut?: () => void) {
	return render(
		<SafeAreaProvider>
			<Provider>
				<PerfilScreen onSignOut={onSignOut} />
			</Provider>
		</SafeAreaProvider>,
	);
}

describe("PerfilScreen", () => {
	it("renders the user name, Classroom connection, and syncs on button press", async () => {
		await renderScreen();
		expect(screen.getByText("João Silva")).toBeTruthy();
		expect(screen.getByText("Google Classroom")).toBeTruthy();

		const syncButton = screen.getByTestId("perfil-sync-classroom-button");
		expect(syncButton).toBeTruthy();

		await act(async () => {
			fireEvent.press(syncButton);
		});

		expect(
			screen.getByText("Sincronizado com Classroom agora"),
		).toBeTruthy();
	});

	it("calls onSignOut when the sign-out button is pressed", async () => {
		const onSignOut = jest.fn();
		await renderScreen(onSignOut);
		fireEvent.press(screen.getByText("Sair da conta"));
		expect(onSignOut).toHaveBeenCalledTimes(1);
	});
});
