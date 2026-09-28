import { atom, useAtom } from "jotai";
import { AULA_DETALHES_MOCK } from "@/features/aula-detalhes/aulaDetalhes.model";

export type AulaDetalhesTab = "materiais" | "ia";

const activeTabAtom = atom<AulaDetalhesTab>("materiais");

export function useAulaDetalhesViewModel() {
	const [activeTab, setActiveTab] = useAtom(activeTabAtom);
	return { data: AULA_DETALHES_MOCK, activeTab, setActiveTab } as const;
}
