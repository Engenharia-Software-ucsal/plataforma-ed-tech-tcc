import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import {
	CONNECTED_ACCOUNTS,
	CURRENT_USER,
	type UserProfile,
} from "@/features/perfil/perfil.model";
import { currentUserAtom } from "@/state/auth";
import {
	lastSyncedAtAtom,
	syncClassroomAtomAction,
	syncStatusAtom,
} from "@/state/classroom";

export type PerfilViewModelDeps = {
	onSignOut?: () => void;
};

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

	const signOut = useCallback(() => {
		onSignOut?.();
	}, [onSignOut]);

	return {
		profile,
		accounts: CONNECTED_ACCOUNTS,
		notificationsEnabled,
		toggleNotifications,
		signOut,
		syncStatus,
		lastSyncedAt,
		syncClassroom,
	} as const;
}
