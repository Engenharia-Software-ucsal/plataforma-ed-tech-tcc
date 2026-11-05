import { useAtomValue, useSetAtom } from "jotai";
import { CLASS_SESSIONS } from "@/features/aulas/aulas.model";
import {
	availableSemestersAtom,
	filteredClassSessionsAtom,
	lastSyncedAtAtom,
	selectedSemesterAtom,
	syncClassroomAtomAction,
	syncStatusAtom,
} from "@/state/classroom";

export function useAulasViewModel() {
	const sessions = useAtomValue(filteredClassSessionsAtom);
	const semesters = useAtomValue(availableSemestersAtom);
	const selectedSemester = useAtomValue(selectedSemesterAtom);
	const setSelectedSemester = useSetAtom(selectedSemesterAtom);
	const syncStatus = useAtomValue(syncStatusAtom);
	const lastSyncedAt = useAtomValue(lastSyncedAtAtom);
	const syncClassroom = useSetAtom(syncClassroomAtomAction);

	return {
		sessions,
		next: sessions[0] ?? CLASS_SESSIONS[0],
		semesters,
		selectedSemester,
		setSelectedSemester,
		syncStatus,
		lastSyncedAt,
		syncClassroom,
	} as const;
}
