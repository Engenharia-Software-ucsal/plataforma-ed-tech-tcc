import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { Linking } from "react-native";
import {
	AULA_DETALHES_MOCK,
	type ClassroomFile,
} from "@/features/aula-detalhes/aulaDetalhes.model";
import {
	classDetailsMapAtom,
	updateClassScheduleAtomAction,
} from "@/state/classroom";

export type AulaDetalhesTab = "materiais" | "ia";

const activeTabAtom = atom<AulaDetalhesTab>("materiais");

export function useAulaDetalhesViewModel(classId?: string) {
	const [activeTab, setActiveTab] = useAtom(activeTabAtom);
	const detailsMap = useAtomValue(classDetailsMapAtom);
	const updateScheduleAtom = useSetAtom(updateClassScheduleAtomAction);

	const effectiveId = classId || "aula-eng-soft-04";
	const data = detailsMap[effectiveId] ?? AULA_DETALHES_MOCK;

	const openMaterial = useCallback(async (file: ClassroomFile) => {
		if (file.fileUrl) {
			await Linking.openURL(file.fileUrl);
		}
	}, []);

	const updateSchedule = useCallback(
		async (input: { startTime: string; endTime: string; room: string }) => {
			await updateScheduleAtom({
				id: data.id,
				startTime: input.startTime,
				endTime: input.endTime,
				room: input.room,
			});
		},
		[data.id, updateScheduleAtom],
	);

	return {
		data,
		activeTab,
		setActiveTab,
		openMaterial,
		updateSchedule,
	} as const;
}
