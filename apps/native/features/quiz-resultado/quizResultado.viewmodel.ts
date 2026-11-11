import { useAtomValue } from "jotai";
import { lastQuizAttemptResultAtom } from "@/features/quiz/quiz.viewmodel";

export function useQuizResultadoViewModel() {
	const result = useAtomValue(lastQuizAttemptResultAtom);

	if (!result) {
		return { result: null } as const;
	}

	const percent = result.total === 0 ? 0 : result.correct / result.total;
	const title =
		percent >= 0.8
			? "Mandou bem!"
			: percent >= 0.5
				? "Quase lá!"
				: "Vamos revisar!";
	const subtitle =
		percent >= 0.8
			? "Você domina a maior parte do conteúdo desta aula."
			: percent >= 0.5
				? "Bom progresso — revise os tópicos abaixo para fixar melhor."
				: "Revisite os materiais da aula e tente de novo quando quiser.";

	return {
		result: { ...result, title, subtitle },
	} as const;
}
