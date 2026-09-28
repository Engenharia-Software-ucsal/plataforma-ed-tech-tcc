import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Provider as JotaiProvider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OnibusScreen } from "@/features/onibus/OnibusScreen";

function renderScreen() {
	return render(
		<SafeAreaProvider>
			<JotaiProvider>
				<OnibusScreen />
			</JotaiProvider>
		</SafeAreaProvider>,
	);
}

describe("OnibusScreen", () => {
	it("renders the hero and the departures list", async () => {
		await renderScreen();
		expect(screen.getByText("Próximos horários")).toBeTruthy();
		expect(screen.getAllByText("UCSAL → Estação").length).toBeGreaterThan(0);
	});

	it("filters the list when the UCSAL segment is pressed", async () => {
		await renderScreen();
		fireEvent.press(screen.getByTestId("filter-UCSAL"));
		await waitFor(() => expect(screen.queryByText("Chegada no campus")).toBeNull());
	});
});
