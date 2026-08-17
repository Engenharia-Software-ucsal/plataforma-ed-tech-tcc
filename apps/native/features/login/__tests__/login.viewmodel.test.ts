import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useLoginViewModel } from "@/features/login/login.viewmodel";

describe("useLoginViewModel", () => {
	it("starts idle", async () => {
		const { result } = await renderHook(() => useLoginViewModel());
		expect(result.current.status).toBe("idle");
	});

	it("moves to authenticating then back to idle on success", async () => {
		let resolveAuth: () => void = () => {};
		const authenticate = () =>
			new Promise<void>((resolve) => {
				resolveAuth = resolve;
			});
		const { result } = await renderHook(() =>
			useLoginViewModel({ authenticate }),
		);

		await act(async () => {
			result.current.signInWithGoogle();
		});
		await waitFor(() => expect(result.current.status).toBe("authenticating"));

		await act(async () => {
			resolveAuth();
		});
		await waitFor(() => expect(result.current.status).toBe("idle"));
	});

	it("surfaces an error message when authentication fails", async () => {
		const { result } = await renderHook(() =>
			useLoginViewModel({
				authenticate: () => Promise.reject(new Error("network")),
			}),
		);
		await act(async () => {
			await result.current.signInWithGoogle();
		});
		expect(result.current.status).toBe("error");
		expect(result.current.error).toBe(
			"Não foi possível entrar. Tente novamente.",
		);
	});
});
