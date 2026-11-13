import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import {
	CONNECTED_ACCOUNTS,
	CURRENT_USER,
	DELETE_CONFIRMATION,
	isInstitutionalEmail,
	type UserProfile,
} from "@/features/perfil/perfil.model";
import { currentUserAtom } from "@/state/auth";
import {
	lastSyncedAtAtom,
	syncClassroomAtomAction,
	syncStatusAtom,
} from "@/state/classroom";
import { GOOGLE_SCOPES } from "@/state/googleScopes";
import { clearLocalSessionAtomAction } from "@/state/session";
import { trpc } from "@/utils/trpc";

export type PerfilViewModelDeps = {
	onSignOut?: () => void;
};

/** Folha de confirmação aberta na tela: sair da conta ou excluí-la. */
export type PerfilSheet = "signOut" | "delete" | null;

const notificationsEnabledAtom = atom(true);

function computeInitials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

export function usePerfilViewModel({ onSignOut }: PerfilViewModelDeps = {}) {
	const [notificationsEnabled, setNotificationsEnabled] = useAtom(
		notificationsEnabledAtom,
	);
	const currentUser = useAtomValue(currentUserAtom);
	const syncStatus = useAtomValue(syncStatusAtom);
	const lastSyncedAt = useAtomValue(lastSyncedAtAtom);
	const syncClassroom = useSetAtom(syncClassroomAtomAction);
	const clearLocalSession = useSetAtom(clearLocalSessionAtomAction);

	const [sheet, setSheet] = useState<PerfilSheet>(null);
	const [scopesOpen, setScopesOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const profile: UserProfile = currentUser
		? {
				name: currentUser.name,
				email: currentUser.email,
				initials: computeInitials(currentUser.name) || CURRENT_USER.initials,
			}
		: CURRENT_USER;

	const toggleNotifications = useCallback(() => {
		setNotificationsEnabled((current) => !current);
	}, [setNotificationsEnabled]);

	const toggleScopes = useCallback(() => setScopesOpen((open) => !open), []);

	const openSheet = useCallback((next: Exclude<PerfilSheet, null>) => {
		setErrorMessage(null);
		setSheet(next);
	}, []);

	const closeSheet = useCallback(() => {
		if (busy) return;
		setErrorMessage(null);
		setSheet(null);
	}, [busy]);

	/** Termina o logout: apaga o que há no aparelho e volta ao login. */
	const finishLocally = useCallback(async () => {
		await clearLocalSession();
		setSheet(null);
		onSignOut?.();
	}, [clearLocalSession, onSignOut]);

	const signOut = useCallback(async () => {
		setBusy(true);
		try {
			// Encerrar no servidor é só um reforço: sem rede, o aparelho é limpo do mesmo jeito.
			await trpc.auth.logout.mutate();
			await finishLocally();
		} finally {
			setBusy(false);
		}
	}, [finishLocally]);

	const deleteAccount = useCallback(
		async (confirmation: string) => {
			if (confirmation !== DELETE_CONFIRMATION) return;
			setBusy(true);
			setErrorMessage(null);
			try {
				await trpc.auth.deleteAccount.mutate({ confirmation });
			} catch {
				// Só limpa o aparelho se o servidor apagou de verdade.
				setErrorMessage(
					"Não foi possível excluir agora. Verifique a conexão e tente de novo.",
				);
				setBusy(false);
				return;
			}
			try {
				await finishLocally();
			} finally {
				setBusy(false);
			}
		},
		[finishLocally],
	);

	return {
		profile,
		isInstitutional: isInstitutionalEmail(profile.email),
		accounts: CONNECTED_ACCOUNTS,
		scopes: GOOGLE_SCOPES,
		scopesOpen,
		toggleScopes,
		notificationsEnabled,
		toggleNotifications,
		sheet,
		openSheet,
		closeSheet,
		busy,
		errorMessage,
		signOut,
		deleteAccount,
		syncStatus,
		lastSyncedAt,
		syncClassroom,
	} as const;
}
