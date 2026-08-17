import { CLASS_SESSIONS } from "@/features/aulas/aulas.model";

export function useAulasViewModel() {
	return { sessions: CLASS_SESSIONS, next: CLASS_SESSIONS[0] } as const;
}
