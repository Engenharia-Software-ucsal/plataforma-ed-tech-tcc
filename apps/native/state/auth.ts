import { router } from "expo-router";
import { atom } from "jotai";
import { GoogleSignin, statusCodes, isErrorWithCode } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import { trpc } from "@/utils/trpc";

GoogleSignin.configure({
	webClientId: process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID,
	offlineAccess: true,
	forceCodeForRefreshToken: true,
	scopes: ["https://www.googleapis.com/auth/classroom.courses.readonly", "https://www.googleapis.com/auth/drive.readonly"]
});

export type AuthStatus = "idle" | "authenticating" | "error";

export const statusAtom = atom<AuthStatus>("idle");
export const errorAtom = atom<string | null>(null);

export const authenticateAtomAction = atom(null, async (_, set) => {
	set(statusAtom, "authenticating");
	set(errorAtom, null);
	try {
		await GoogleSignin.hasPlayServices();
		const response = await GoogleSignin.signIn();
		
		if (!response.data?.serverAuthCode) {
			throw new Error("No server auth code returned");
		}
		

		const result = await trpc.auth.loginWithGoogle.mutate({ 
			serverAuthCode: response.data.serverAuthCode 
		});
		
		await SecureStore.setItemAsync("session_id", result.sessionId);
		set(statusAtom, "idle");
		router.replace("/(tabs)/onibus");
	} catch (err: any) {
		set(statusAtom, "error");
		if (isErrorWithCode(err)) {
			if (err.code === statusCodes.SIGN_IN_CANCELLED) {
				set(errorAtom, "Login cancelado.");
			} else {
				set(errorAtom, "Erro no login do Google.");
			}
		} else {
			set(errorAtom, err.message || "Não foi possível entrar. Tente novamente.");
		}
	}
});
