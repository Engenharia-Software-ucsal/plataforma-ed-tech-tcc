import { useCallback, useState } from "react";
import {
	CONNECTED_ACCOUNTS,
	CURRENT_USER,
} from "@/features/perfil/perfil.model";

export type PerfilViewModelDeps = {
	onSignOut?: () => void;
};

export function usePerfilViewModel({ onSignOut }: PerfilViewModelDeps = {}) {
	const [notificationsEnabled, setNotificationsEnabled] = useState(true);

	const toggleNotifications = useCallback(() => {
		setNotificationsEnabled((current) => !current);
	}, []);

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
