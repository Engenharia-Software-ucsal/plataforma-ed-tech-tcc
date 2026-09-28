import { useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { GoogleSignin, statusCodes, isErrorWithCode } from "@react-native-google-signin/google-signin";
import { statusAtom, errorAtom } from "@/state/auth";
import { trpc } from "@/utils/trpc";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

GoogleSignin.configure({
	webClientId: process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID,
	offlineAccess: true,
	forceCodeForRefreshToken: true,
	scopes: ["https://www.googleapis.com/auth/classroom.courses.readonly", "https://www.googleapis.com/auth/drive.readonly"]
});

export function useLoginViewModel() {
	const [status, setStatus] = useAtom(statusAtom);
	const [error, setError] = useAtom(errorAtom);
	
	// @ts-expect-error - auth router is being implemented in parallel
	const loginMutation = trpc.auth.loginWithGoogle.useMutation();

	const signInWithGoogle = useCallback(async () => {
		setStatus("authenticating");
		setError(null);
		try {
			await GoogleSignin.hasPlayServices();
			const response = await GoogleSignin.signIn();
			
			if (!response.data?.serverAuthCode) {
				throw new Error("No server auth code returned");
			}
			
			const result = await loginMutation.mutateAsync({ 
				serverAuthCode: response.data.serverAuthCode 
			});
			
			await SecureStore.setItemAsync("session_id", result.sessionId);
			setStatus("idle");
			router.replace("/(tabs)/onibus");
			
		} catch (err: any) {
			setStatus("error");
			if (isErrorWithCode(err)) {
				if (err.code === statusCodes.SIGN_IN_CANCELLED) {
					setError("Login cancelado.");
				} else {
					setError("Erro no login do Google.");
				}
			} else {
				setError(err.message || "Não foi possível entrar. Tente novamente.");
			}
		}
	}, [loginMutation, setStatus, setError]);

	return { status, error, signInWithGoogle } as const;
}
