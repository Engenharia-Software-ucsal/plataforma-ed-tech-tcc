import { act, renderHook } from "@testing-library/react-native";
import { Provider } from "jotai";
import { usePerfilViewModel } from "@/features/perfil/perfil.viewmodel";
import { isInstitutionalEmail } from "@/features/perfil/perfil.model";

jest.mock("expo-secure-store", () => ({
	deleteItemAsync: jest.fn().mockResolvedValue(undefined),
	getItemAsync: jest.fn().mockResolvedValue(null),
	setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

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

	it("o e-mail de exemplo usa o domínio institucional certo", async () => {
		const { result } = await renderHook(() => usePerfilViewModel(), {
			wrapper: Provider,
		});
		expect(result.current.profile.email).toBe("joao.silva@ucsal.edu.br");
		expect(result.current.isInstitutional).toBe(true);
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

	it("calls the injected sign-out callback after cleaning the device", async () => {
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

	it("ao sair, zera o horário da última sincronização", async () => {
		const { result } = await renderHook(() => usePerfilViewModel(), {
			wrapper: Provider,
		});
		await act(async () => {
			await result.current.syncClassroom();
		});
		expect(result.current.lastSyncedAt).not.toBeNull();
		await act(async () => result.current.signOut());
		expect(result.current.lastSyncedAt).toBeNull();
	});

	it("lista as 6 permissões do Google, todas somente leitura", async () => {
		const { result } = await renderHook(() => usePerfilViewModel(), {
			wrapper: Provider,
		});
		expect(result.current.scopes).toHaveLength(6);
		expect(
			result.current.scopes.every((scope) => scope.url.endsWith(".readonly")),
		).toBe(true);
	});
});

describe("isInstitutionalEmail", () => {
	it("aceita só o domínio @ucsal.edu.br", () => {
		expect(isInstitutionalEmail("ana@ucsal.edu.br")).toBe(true);
		expect(isInstitutionalEmail("  Ana@UCSAL.EDU.BR ")).toBe(true);
		expect(isInstitutionalEmail("ana@ucsal.br")).toBe(false);
		expect(isInstitutionalEmail("ana@gmail.com")).toBe(false);
		expect(isInstitutionalEmail("ana@outra.ucsal.edu.br.fake.com")).toBe(false);
	});
});
