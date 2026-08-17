import { useState } from "react";
import { AULA_DETALHES_MOCK } from "@/features/aula-detalhes/aulaDetalhes.model";

export type AulaDetalhesTab = "materiais" | "ia";

export function useAulaDetalhesViewModel() {
	const [activeTab, setActiveTab] = useState<AulaDetalhesTab>("materiais");
	return { data: AULA_DETALHES_MOCK, activeTab, setActiveTab } as const;
}
