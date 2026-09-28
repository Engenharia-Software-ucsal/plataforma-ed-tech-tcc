import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import {
	CONNECTED_ACCOUNTS,
	CURRENT_USER,
} from "@/features/perfil/perfil.model";

export type PerfilViewModelDeps = {
	onSignOut?: () => void;
};

const notificationsEnabledAtom = atom(true);

export function usePerfilViewModel({ onSignOut }: PerfilViewModelDeps = {}) {
	const [notificationsEnabled, setNotificationsEnabled] = useAtom(
		notificationsEnabledAtom,
	);

	const toggleNotifications = useCallback(() => {
		setNotificationsEnabled((current) => !current);
	}, [setNotificationsEnabled]);

	const signOut = useCallback(() => {
		onSignOut?.();
	}, [onSignOut]);

	return {
		profile: CURRENT_USER,
		accounts: CONNECTED_ACCOUNTS,
		notificationsEnabled,
		toggleNotifications,
		signOut,
	} as const;
}
