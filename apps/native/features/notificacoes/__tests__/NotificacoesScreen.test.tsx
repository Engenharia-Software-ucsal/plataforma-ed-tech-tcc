import { render, screen } from "@testing-library/react-native";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificacoesScreen } from "@/features/notificacoes/NotificacoesScreen";

describe("NotificacoesScreen", () => {
	it("renders Google Classroom notifications and no legacy bus notifications", async () => {
		await render(
			<SafeAreaProvider>
				<Provider>
					<NotificacoesScreen />
				</Provider>
			</SafeAreaProvider>,
		);
		expect(screen.getByText("Novo aviso no Classroom")).toBeTruthy();
		expect(screen.getByText("Insight pronto")).toBeTruthy();
		expect(screen.getByText("Nova atividade no Classroom")).toBeTruthy();
		expect(screen.getByText("Novo material")).toBeTruthy();
		expect(screen.getByText("Aula marcada como difícil")).toBeTruthy();

		expect(screen.queryByText(/Ônibus/i)).toBeNull();
	});
});
