import * as SecureStore from "expo-secure-store";
import { atom } from "jotai";
import { CLASS_SESSIONS } from "@/features/aulas/aulas.model";
import { INITIAL_NOTES_MOCK } from "@/features/notas/notas.model";
import { notesAtom } from "@/features/notas/notas.viewmodel";
import { NOTIFICATIONS_MOCK } from "@/features/notificacoes/notificacoes.model";
import { currentUserAtom, errorAtom, statusAtom } from "@/state/auth";
import {
	classDetailsMapAtom,
	classroomNotificationsAtom,
	classSessionsAtom,
	INITIAL_CLASS_DETAILS_MAP,
	lastSyncedAtAtom,
	selectedSemesterAtom,
	syncStatusAtom,
} from "@/state/classroom";

export const SESSION_STORAGE_KEY = "session_id";

/**
 * Expurgo local ao encerrar a sessão: remove a chave guardada no cofre do
 * aparelho (expo-secure-store) e devolve os átomos do Jotai ao estado inicial,
 * para que nada do aluno anterior fique na memória do app.
 */
export const clearLocalSessionAtomAction = atom(null, async (_get, set) => {
	await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);

	set(currentUserAtom, null);
	set(statusAtom, "idle");
	set(errorAtom, null);

	set(classSessionsAtom, CLASS_SESSIONS);
	set(selectedSemesterAtom, "2026.2");
	set(classDetailsMapAtom, INITIAL_CLASS_DETAILS_MAP);
	set(classroomNotificationsAtom, NOTIFICATIONS_MOCK);
	set(syncStatusAtom, "idle");
	set(lastSyncedAtAtom, null);

	set(notesAtom, INITIAL_NOTES_MOCK);
});
