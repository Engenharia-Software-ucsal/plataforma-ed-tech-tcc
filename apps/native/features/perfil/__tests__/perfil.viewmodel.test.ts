import { act, renderHook } from "@testing-library/react-native";
import { Provider } from "jotai";
import { usePerfilViewModel } from "@/features/perfil/perfil.viewmodel";

describe("usePerfilViewModel", () => {
	it("exposes the user profile and a single connected account (Classroom)", async () => {
		const { result } = await renderHook(() => usePerfilViewModel(), {
			wrapper: Provider,
		});
		expect(result.current.profile.name).toBe("João Silva");
		expect(result.current.accounts).toHaveLength(1);
		expect(result.current.accounts[0].name).toBe("Google Classroom");
		expect(result.current.accounts[0].connected).toBe(true);
	});

	it("toggles notifications", async () => {
		const { result } = await renderHook(() => usePerfilViewModel(), {
			wrapper: Provider,
		});
		expect(result.current.notificationsEnabled).toBe(true);
		await act(async () => result.current.toggleNotifications());
		expect(result.current.notificationsEnabled).toBe(false);
	});

	it("triggers Classroom sync via syncClassroom", async () => {
		const { result } = await renderHook(() => usePerfilViewModel(), {
			wrapper: Provider,
		});
		await act(async () => {
			await result.current.syncClassroom();
		});
		expect(result.current.syncStatus).toBe("synced");
		expect(result.current.lastSyncedAt).toBe(
			"Sincronizado com Classroom agora",
		);
	});

	it("calls the injected sign-out callback", async () => {
		const onSignOut = jest.fn();
		const { result } = await renderHook(
			() => usePerfilViewModel({ onSignOut }),
			{
				wrapper: Provider,
			},
		);
		await act(async () => result.current.signOut());
		expect(onSignOut).toHaveBeenCalledTimes(1);
	});
});
