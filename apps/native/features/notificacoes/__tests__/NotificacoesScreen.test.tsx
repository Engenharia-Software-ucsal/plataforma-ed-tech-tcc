import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificacoesScreen } from "@/features/notificacoes/NotificacoesScreen";

describe("NotificacoesScreen", () => {
	it("renders every notification's title", async () => {
		await render(
			<SafeAreaProvider>
				<NotificacoesScreen />
			</SafeAreaProvider>,
		);
		expect(screen.getByText("Ônibus a 5 min")).toBeTruthy();
		expect(screen.getByText("Insight pronto")).toBeTruthy();
		expect(screen.getByText("Ônibus atrasado")).toBeTruthy();
		expect(screen.getByText("Novo material")).toBeTruthy();
		expect(screen.getByText("Aula marcada como difícil")).toBeTruthy();
	});
});
