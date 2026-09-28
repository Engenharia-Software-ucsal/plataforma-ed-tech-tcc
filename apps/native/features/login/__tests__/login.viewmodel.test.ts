import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Provider } from "jotai";
import { useLoginViewModel } from "@/features/login/login.viewmodel";
import { router } from "expo-router";

jest.mock("expo-router", () => ({
	router: {
		replace: jest.fn(),
	},
}));

describe("useLoginViewModel", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("starts idle", async () => {
		const { result } = await renderHook(() => useLoginViewModel(), { wrapper: Provider });
		expect(result.current.status).toBe("idle");
	});

	it("moves to authenticating then back to idle on success", async () => {
		const { result } = await renderHook(() => useLoginViewModel(), { wrapper: Provider });

		await act(async () => {
			await result.current.signInWithGoogle();
		});

		expect(router.replace).toHaveBeenCalledWith("/(tabs)/onibus");
		expect(result.current.status).toBe("idle");
	});

	it("surfaces an error message when authentication fails", async () => {
		const { GoogleSignin } = require("@react-native-google-signin/google-signin");
		(GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(new Error("network error"));

		const { result } = await renderHook(() => useLoginViewModel(), { wrapper: Provider });

		await act(async () => {
			await result.current.signInWithGoogle();
		});

		expect(result.current.status).toBe("error");
		expect(result.current.error).toBe("network error");
	});
});
