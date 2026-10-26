import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Provider } from "jotai";
import { LoginScreen } from "@/features/login/LoginScreen";

jest.mock("expo-router", () => ({
	router: {
		replace: jest.fn(),
	},
}));

describe("LoginScreen", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders the app name, terms checkbox, and keeps the Google CTA disabled initially", async () => {
		const {
			GoogleSignin,
		} = require("@react-native-google-signin/google-signin");

		await render(
			<Provider>
				<LoginScreen />
			</Provider>,
		);

		expect(screen.getByText("Compasso UCSAL")).toBeTruthy();
		expect(
			screen.getByText(
				"Li e concordo com o Termo de Consentimento (TCLE) e Tratamento de Dados Acadêmicos (LGPD)",
			),
		).toBeTruthy();
		expect(screen.getByText("Ler Termos")).toBeTruthy();
		expect(screen.getByText("Entrar com conta UCSAL (Google)")).toBeTruthy();

		// Clicking the button without accepting terms should NOT trigger sign in
		await act(async () => {
			fireEvent.press(screen.getByText("Entrar com conta UCSAL (Google)"));
		});

		expect(GoogleSignin.signIn).not.toHaveBeenCalled();
	});

	it("toggles acceptance of terms and enables Google CTA", async () => {
		const {
			GoogleSignin,
		} = require("@react-native-google-signin/google-signin");

		await render(
			<Provider>
				<LoginScreen />
			</Provider>,
		);

		const checkbox = screen.getByTestId("terms-checkbox");

		// Accept terms
		await act(async () => {
			fireEvent.press(checkbox);
		});

		// Now clicking Google CTA should trigger sign in
		await act(async () => {
			fireEvent.press(screen.getByText("Entrar com conta UCSAL (Google)"));
		});

		expect(GoogleSignin.signIn).toHaveBeenCalledTimes(1);

		// Uncheck terms
		await act(async () => {
			fireEvent.press(checkbox);
		});

		// Clicking again should not trigger another call
		await act(async () => {
			fireEvent.press(screen.getByText("Entrar com conta UCSAL (Google)"));
		});

		expect(GoogleSignin.signIn).toHaveBeenCalledTimes(1);
	});

	it("opens and closes the TCLE modal via 'Ler Termos' and the 'Fechar' button", async () => {
		await render(
			<Provider>
				<LoginScreen />
			</Provider>,
		);

		await act(async () => {
			fireEvent.press(screen.getByText("Ler Termos"));
		});

		expect(screen.getByText("Termo de Consentimento (TCLE)")).toBeTruthy();
		expect(screen.getByText("1. Finalidade Pedagógica")).toBeTruthy();
		expect(screen.getByText("2. Base Legal (LGPD)")).toBeTruthy();
		expect(
			screen.getByText("3. Proteção e Privacidade contra Modelos de IA"),
		).toBeTruthy();
		expect(screen.getByText("4. Direitos do Titular e Revogação")).toBeTruthy();

		// Close modal via "Fechar" button
		await act(async () => {
			fireEvent.press(screen.getByText("Fechar"));
		});
	});

	it("closes the TCLE modal via the close X icon", async () => {
		await render(
			<Provider>
				<LoginScreen />
			</Provider>,
		);

		await act(async () => {
			fireEvent.press(screen.getByText("Ler Termos"));
		});

		expect(screen.getByTestId("close-terms-modal-x")).toBeTruthy();

		await act(async () => {
			fireEvent.press(screen.getByTestId("close-terms-modal-x"));
		});
	});

	it("closes the TCLE modal via onRequestClose", async () => {
		await render(
			<Provider>
				<LoginScreen />
			</Provider>,
		);

		await act(async () => {
			fireEvent.press(screen.getByText("Ler Termos"));
		});

		const modal = screen.getByTestId("terms-modal");
		await act(async () => {
			modal.props.onRequestClose();
		});
	});

	it("shows an error message after a failed sign-in when terms are accepted", async () => {
		const {
			GoogleSignin,
		} = require("@react-native-google-signin/google-signin");
		(GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(
			new Error("network error"),
		);

		await render(
			<Provider>
				<LoginScreen />
			</Provider>,
		);

		// Accept terms
		await act(async () => {
			fireEvent.press(screen.getByTestId("terms-checkbox"));
		});

		await act(async () => {
			fireEvent.press(screen.getByText("Entrar com conta UCSAL (Google)"));
		});

		expect(await screen.findByText(/network error/)).toBeTruthy();
	});
});
