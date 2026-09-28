import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
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

	it("renders the app name and the Google CTA", async () => {
		await render(
			<Provider>
				<LoginScreen />
			</Provider>,
		);
		expect(screen.getByText("Compasso UCSAL")).toBeTruthy();
		expect(screen.getByText("Entrar com conta UCSAL (Google)")).toBeTruthy();
	});

	it("shows an error message after a failed sign-in", async () => {
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

		await act(async () => {
			fireEvent.press(screen.getByText("Entrar com conta UCSAL (Google)"));
		});

		expect(await screen.findByText(/network error/)).toBeTruthy();
	});
});
