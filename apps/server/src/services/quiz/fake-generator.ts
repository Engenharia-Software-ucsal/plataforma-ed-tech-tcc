import type { QuizGenerator, QuizQuestionDraft } from "./ports.js";

export const SAMPLE_GENERATOR_ID = "sample";

/**
 * Implementação provisória do `QuizGenerator`, usada quando nenhum provedor de
 * IA está configurado. Não chama API externa: gera questões de exemplo a
 * partir do contexto recebido. O provedor real implementa a mesma interface.
 */
export function createFakeQuizGenerator(): QuizGenerator {
	return {
		id: SAMPLE_GENERATOR_ID,
		async generate({ context, minQuestions }) {
			const lines = context.length > 0 ? context : ["Conteúdo geral da aula."];
			const topic = "Revisão geral";

			const questions: QuizQuestionDraft[] = [];
			for (let i = 0; i < minQuestions; i++) {
				const sourceExcerpt = lines[i % lines.length] ?? lines[0] ?? "";

				questions.push({
					topic,
					text: `[Questão de exemplo ${i + 1}] Com base no material, qual afirmação sobre "${topic}" está correta?`,
					options: [
						{ text: `Afirmação correta sobre ${topic}`, correct: true },
						{ text: `Distrator plausível 1 sobre ${topic}`, correct: false },
						{ text: `Distrator plausível 2 sobre ${topic}`, correct: false },
						{ text: `Distrator plausível 3 sobre ${topic}`, correct: false },
					],
					explanation: `Esta é uma questão de exemplo gerada sem IA real, para validar o pipeline. Trecho de origem: "${sourceExcerpt}".`,
					sourceExcerpt,
				});
			}
			return questions;
		},
	};
}
