import { router } from "expo-router";
import { atom } from "jotai";

export type AuthStatus = "idle" | "authenticating" | "error";

export const statusAtom = atom<AuthStatus>("idle");
export const errorAtom = atom<string | null>(null);

export const authenticateAtomAction = atom(null, async (_, set) => {
	set(statusAtom, "authenticating");
	set(errorAtom, null);
	try {
		router.replace("/(tabs)/onibus");
		set(statusAtom, "idle");
	} catch {
		set(statusAtom, "error");
		set(errorAtom, "Não foi possível entrar. Tente novamente.");
	}
});
