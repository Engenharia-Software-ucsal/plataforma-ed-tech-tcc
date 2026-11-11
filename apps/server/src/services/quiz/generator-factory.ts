import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { createAiSdkQuizGenerator } from "./ai-sdk-generator.js";
import { createFakeQuizGenerator } from "./fake-generator.js";
import type { QuizGenerator } from "./ports.js";

// Para um novo provedor: instalar o pacote `@ai-sdk/<provedor>` e somar um case aqui.
function resolveLanguageModel(provider: string, modelId: string): LanguageModel {
	switch (provider) {
		case "google":
			return google(modelId);
		default:
			throw new Error(
				`QUIZ_AI_PROVIDER "${provider}" não é suportado. Disponíveis: google.`,
			);
	}
}

/**
 * Escolhe o gerador pelo ambiente: `QUIZ_AI_PROVIDER` + `QUIZ_AI_MODEL`.
 * Sem provedor configurado, cai no gerador de exemplo (sem IA real).
 */
export function createQuizGeneratorFromEnv(
	env: Record<string, string | undefined> = process.env,
): QuizGenerator {
	const provider = env.QUIZ_AI_PROVIDER?.trim();
	if (!provider) return createFakeQuizGenerator();

	const modelId = env.QUIZ_AI_MODEL?.trim();
	if (!modelId) {
		throw new Error(
			"QUIZ_AI_MODEL é obrigatório quando QUIZ_AI_PROVIDER está definido.",
		);
	}

	return createAiSdkQuizGenerator(
		resolveLanguageModel(provider, modelId),
		`${provider}:${modelId}`,
	);
}
