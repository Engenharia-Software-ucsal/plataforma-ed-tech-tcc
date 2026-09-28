import { useAtomValue, useSetAtom } from "jotai";
import { authenticateAtomAction, errorAtom, statusAtom } from "@/state/auth";

export type LoginViewModelDeps = {
	authenticate: () => Promise<void>;
};

export function useLoginViewModel() {
	const status = useAtomValue(statusAtom);
	const error = useAtomValue(errorAtom);

	const signInWithGoogle = useSetAtom(authenticateAtomAction);

	return { status, error, signInWithGoogle: signInWithGoogle } as const;
}
