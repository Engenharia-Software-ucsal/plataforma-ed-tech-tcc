import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { Provider } from "jotai";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PerfilScreen } from "@/features/perfil/PerfilScreen";
import { TrpcClientError, trpc } from "@/utils/trpc";

jest.mock("expo-secure-store", () => ({
	deleteItemAsync: jest.fn().mockResolvedValue(undefined),
	getItemAsync: jest.fn().mockResolvedValue(null),
	setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

function renderScreen(onSignOut?: () => void) {
	return render(
		<SafeAreaProvider>
			<Provider>
				<PerfilScreen onSignOut={onSignOut} />
			</Provider>
		</SafeAreaProvider>,
	);
}

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

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
			screen.getByText(/Sincronizado com Classroom agora/),
		).toBeTruthy();
	});

	it("mostra o e-mail institucional e o selo da conta @ucsal.edu.br", async () => {
		await renderScreen();
		expect(screen.getByText("joao.silva@ucsal.edu.br")).toBeTruthy();
		expect(screen.getByText("Conta institucional @ucsal.edu.br")).toBeTruthy();
	});

	it("mostra o estado da sessão e do vínculo com o Classroom", async () => {
		await renderScreen();
		expect(screen.getByText("Sessão ativa neste aparelho")).toBeTruthy();
		expect(screen.getByText(/somente leitura/)).toBeTruthy();
	});

	it("informa os direitos da LGPD e lista as 6 permissões ao abrir", async () => {
		await renderScreen();
		expect(screen.getByText("Seus direitos (LGPD, Art. 18)")).toBeTruthy();
		expect(screen.getByText("Sem treinamento de IA")).toBeTruthy();
		expect(screen.getByText("Revogação e exclusão")).toBeTruthy();
		expect(screen.queryByTestId("perfil-scopes-list")).toBeNull();

		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-scopes-toggle"));
		});

		expect(screen.getByTestId("perfil-scopes-list")).toBeTruthy();
		expect(screen.getByText("PDFs do Drive")).toBeTruthy();
		expect(screen.getByText("drive.readonly")).toBeTruthy();
		expect(screen.getByText("classroom.courses.readonly")).toBeTruthy();
	});
});

describe("PerfilScreen — sair da conta", () => {
	it("pede confirmação antes de sair e não sai ao cancelar", async () => {
		const onSignOut = jest.fn();
		await renderScreen(onSignOut);

		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-sign-out-button"));
		});
		expect(screen.getByText("Sair da conta?")).toBeTruthy();
		expect(onSignOut).not.toHaveBeenCalled();

		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-cancel-sheet"));
		});
		expect(onSignOut).not.toHaveBeenCalled();
		expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
	});

	it("ao confirmar, apaga a chave do cofre e volta ao login", async () => {
		const onSignOut = jest.fn();
		await renderScreen(onSignOut);

		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-sign-out-button"));
		});
		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-confirm-sign-out"));
		});

		await waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
		expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("session_id");
	});
});

describe("PerfilScreen — excluir conta", () => {
	async function openDeleteSheet(onSignOut?: () => void) {
		await renderScreen(onSignOut);
		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-delete-account-button"));
		});
	}

	function typeConfirmation(text: string) {
		return act(async () => {
			fireEvent.changeText(screen.getByTestId("perfil-delete-input"), text);
		});
	}

	it("só libera o botão depois de digitar EXCLUIR", async () => {
		const deleteSpy = jest.spyOn(trpc.auth.deleteAccount, "mutate");
		await openDeleteSheet();

		await typeConfirmation("excluir");
		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-confirm-delete"));
		});
		expect(deleteSpy).not.toHaveBeenCalled();

		await typeConfirmation("EXCLUIR");
		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-confirm-delete"));
		});
		expect(deleteSpy).toHaveBeenCalledWith({ confirmation: "EXCLUIR" });
	});

	it("apaga no servidor, limpa o aparelho e volta ao login", async () => {
		const onSignOut = jest.fn();
		jest
			.spyOn(trpc.auth.deleteAccount, "mutate")
			.mockResolvedValue({ deleted: true });
		await openDeleteSheet(onSignOut);

		await typeConfirmation("EXCLUIR");
		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-confirm-delete"));
		});

		await waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
		expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("session_id");
	});

	it("se o servidor falhar, avisa e NÃO limpa o aparelho nem sai", async () => {
		const onSignOut = jest.fn();
		jest
			.spyOn(trpc.auth.deleteAccount, "mutate")
			.mockRejectedValue(new TrpcClientError("sem rede"));
		await openDeleteSheet(onSignOut);

		await typeConfirmation("EXCLUIR");
		await act(async () => {
			fireEvent.press(screen.getByTestId("perfil-confirm-delete"));
		});

		await waitFor(() =>
			expect(screen.getByTestId("perfil-delete-error")).toBeTruthy(),
		);
		expect(onSignOut).not.toHaveBeenCalled();
		expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
	});
});
