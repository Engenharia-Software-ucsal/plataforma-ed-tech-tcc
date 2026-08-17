import { useCallback, useState } from "react";
import type { AuthStatus } from "@/features/login/login.model";

export type LoginViewModelDeps = {
	authenticate: () => Promise<void>;
};

const defaultDeps: LoginViewModelDeps = {
	authenticate: () => Promise.resolve(),
};

export function useLoginViewModel(deps: LoginViewModelDeps = defaultDeps) {
	const [status, setStatus] = useState<AuthStatus>("idle");
	const [error, setError] = useState<string | null>(null);

	const signInWithGoogle = useCallback(async () => {
		setStatus("authenticating");
		setError(null);
		try {
			await deps.authenticate();
			setStatus("idle");
		} catch {
			setStatus("error");
			setError("Não foi possível entrar. Tente novamente.");
		}
	}, [deps]);

	return { status, error, signInWithGoogle } as const;
}
