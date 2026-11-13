import {
	GoogleSignin,
	isErrorWithCode,
	statusCodes,
} from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { atom } from "jotai";
import { syncClassroomAtomAction } from "@/state/classroom";
import { GOOGLE_SCOPES } from "@/state/googleScopes";
import { trpc } from "@/utils/trpc";

// Only configure Google Signin if the Client ID is provided
if (process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID) {
	GoogleSignin.configure({
		webClientId: process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID,
		offlineAccess: true,
		hostedDomain: "ucsal.edu.br",
		scopes: GOOGLE_SCOPES.map((scope) => scope.url),
	});
} else {
	console.warn("⚠️ EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID is not set! Google Auth will fail.");
}

export type AuthStatus = "idle" | "authenticating" | "error";

export type AuthenticatedUser = {
	name: string;
	email: string;
	avatarUrl?: string | null;
};

export const statusAtom = atom<AuthStatus>("idle");
export const errorAtom = atom<string | null>(null);
export const currentUserAtom = atom<AuthenticatedUser | null>(null);

export const authenticateAtomAction = atom(null, async (_, set) => {
	set(statusAtom, "authenticating");
	set(errorAtom, null);
	
	if (!process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID) {
	    set(statusAtom, "error");
	    set(errorAtom, "Configuração do Google ausente (Missing Client ID).");
	    return;
	}

	try {
		await GoogleSignin.hasPlayServices();
		const response = await GoogleSignin.signIn();
		const serverAuthCode =
			response.data?.serverAuthCode ?? response.data?.idToken;

		if (!serverAuthCode) {
			throw new Error("No server auth code returned");
		}

		const result = await trpc.auth.loginWithGoogle.mutate({
			serverAuthCode,
			idToken: response.data?.idToken ?? undefined,
		});

		await SecureStore.setItemAsync("session_id", result.sessionId);
		if (result.user) {
			set(currentUserAtom, {
				name: result.user.name,
				email: result.user.email,
				avatarUrl: result.user.avatarUrl,
			});
		}
		await set(syncClassroomAtomAction);
		set(statusAtom, "idle");
		router.replace("/(tabs)/aulas");
	} catch (err: any) {
		console.error("Google Signin Error:", err, "Code:", err?.code);
		set(statusAtom, "error");
		if (isErrorWithCode(err)) {
			if (err.code === statusCodes.SIGN_IN_CANCELLED) {
				set(errorAtom, "Login cancelado.");
			} else {
				set(errorAtom, "Erro no login do Google.");
			}
		} else {
			set(
				errorAtom,
				err.message || "Não foi possível entrar. Tente novamente.",
			);
		}
	}
});
