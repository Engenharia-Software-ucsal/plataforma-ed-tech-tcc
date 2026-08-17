import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AulasScreen } from "@/features/aulas/AulasScreen";

describe("AulasScreen", () => {
	it("renders the hero and the full class list", async () => {
		await render(
			<SafeAreaProvider>
				<AulasScreen />
			</SafeAreaProvider>,
		);
		expect(screen.getByText("Todas as aulas")).toBeTruthy();
		expect(screen.getByText("Banco de Dados II")).toBeTruthy();
	});
});
