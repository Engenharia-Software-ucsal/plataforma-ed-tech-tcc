import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { createAiSdkQuizGenerator } from "../src/services/quiz/ai-sdk-generator.js";
import { createQuizGeneratorFromEnv } from "../src/services/quiz/generator-factory.js";
import { InsufficientContextError } from "../src/services/quiz/ports.js";

function question(correctIndexes: number[] = [0], n = 1) {
	return {
		topic: "SOLID",
		text: `Pergunta ${n}: qual princípio diz que uma classe deve ter um único motivo para mudar?`,
		options: [0, 1, 2, 3].map((i) => ({
			text: `Alternativa ${i}`,
			correct: correctIndexes.includes(i),
		})),
		explanation: "É o princípio da responsabilidade única.",
		sourceExcerpt: "Single Responsibility Principle",
	};
}

function questions(count: number) {
	return Array.from({ length: count }, (_, i) => question([0], i + 1));
}

function textResult(text: string) {
	return {
		content: [{ type: "text" as const, text }],
		finishReason: { unified: "stop" as const, raw: "stop" },
		usage: {
			inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
			outputTokens: { total: 10, text: 10, reasoning: undefined },
		},
		warnings: [],
	};
}

function mockModelSequence(responses: unknown[][]) {
	return new MockLanguageModelV4({
		doGenerate: responses.map((q) => textResult(JSON.stringify({ questions: q }))),
	});
}

const input = { minQuestions: 10, maxQuestions: 20, difficulty: "medio" as const };

describe("createAiSdkQuizGenerator", () => {
	it("devolve de 10 a 20 questões validadas e envia o contexto da aula ao modelo", async () => {
		const model = mockModelSequence([questions(14)]);
		const generator = createAiSdkQuizGenerator(model, "teste:modelo");

		const drafts = await generator.generate({
			...input,
			context: ["Tópicos da aula: SOLID.", "[Slides] Resumo sobre SOLID"],
		});

		expect(generator.id).toBe("teste:modelo");
		expect(drafts).toHaveLength(14);
		const sentPrompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
		expect(sentPrompt).toContain("Resumo sobre SOLID");
		expect(sentPrompt).toContain("entre 10 e 20");
	});

	it("aceita os limites do intervalo", async () => {
		for (const count of [10, 20]) {
			const generator = createAiSdkQuizGenerator(mockModelSequence([questions(count)]), "t");
			expect(await generator.generate({ ...input, context: ["x"] })).toHaveLength(count);
		}
	});

	it("rejeita questão com mais de uma alternativa correta", async () => {
		const bad = [...questions(9), question([0, 1], 10)];
		const generator = createAiSdkQuizGenerator(mockModelSequence([bad, bad]), "t");
		await expect(generator.generate({ ...input, context: ["x"] })).rejects.toThrow(
			"A questão 10 tem 2 alternativas corretas",
		);
	});

	it("rejeita quando o modelo devolve menos de 10 questões", async () => {
		const model = mockModelSequence([questions(7), questions(7)]);
		const generator = createAiSdkQuizGenerator(model, "t");
		await expect(generator.generate({ ...input, context: ["x"] })).rejects.toThrow();
		expect(model.doGenerateCalls).toHaveLength(2);
	});

	it("fica com as 20 primeiras quando o modelo devolve mais de 20", async () => {
		const model = mockModelSequence([questions(25)]);
		const generator = createAiSdkQuizGenerator(model, "t");
		const drafts = await generator.generate({ ...input, context: ["x"] });
		expect(drafts).toHaveLength(20);
		expect(drafts[0]?.text).toContain("Pergunta 1:");
		expect(model.doGenerateCalls).toHaveLength(1);
	});

	it("não manda limite máximo no formato pedido ao modelo", async () => {
		const model = mockModelSequence([questions(12)]);
		await createAiSdkQuizGenerator(model, "t").generate({ ...input, context: ["x"] });
		const format = JSON.stringify(model.doGenerateCalls[0]?.responseFormat);
		expect(format).toContain("minItems");
		expect(format).not.toContain("\"maxItems\":20");
	});

	it("rejeita questão com número errado de alternativas", async () => {
		const bad = { ...question(), options: question().options.slice(0, 3) };
		const list = [...questions(9), bad];
		const generator = createAiSdkQuizGenerator(mockModelSequence([list, list]), "t");
		await expect(generator.generate({ ...input, context: ["x"] })).rejects.toThrow();
	});

	it("tenta de novo uma vez quando a primeira resposta vem inválida", async () => {
		const model = mockModelSequence([questions(5), questions(12)]);
		const generator = createAiSdkQuizGenerator(model, "t");

		const drafts = await generator.generate({ ...input, context: ["x"] });

		expect(drafts).toHaveLength(12);
		expect(model.doGenerateCalls).toHaveLength(2);
	});

	it("repete também quando a resposta nem é um JSON válido", async () => {
		const model = new MockLanguageModelV4({
			doGenerate: [
				textResult("isto não é json"),
				textResult(JSON.stringify({ questions: questions(10) })),
			],
		});
		const generator = createAiSdkQuizGenerator(model, "t");

		expect(await generator.generate({ ...input, context: ["x"] })).toHaveLength(10);
		expect(model.doGenerateCalls).toHaveLength(2);
	});

	it("não repete quando o erro não é de formato (ex.: provedor fora)", async () => {
		const model = new MockLanguageModelV4({
			doGenerate: async () => {
				throw new Error("provedor fora");
			},
		});
		const generator = createAiSdkQuizGenerator(model, "t");

		await expect(generator.generate({ ...input, context: ["x"] })).rejects.toThrow("provedor fora");
		expect(model.doGenerateCalls).toHaveLength(1);
	});

	it("não chama o modelo quando a aula não tem material", async () => {
		const model = mockModelSequence([questions(10)]);
		const generator = createAiSdkQuizGenerator(model, "t");
		await expect(generator.generate({ ...input, context: [] })).rejects.toBeInstanceOf(
			InsufficientContextError,
		);
		expect(model.doGenerateCalls).toHaveLength(0);
	});
});

describe("createQuizGeneratorFromEnv", () => {
	it("usa o gerador de exemplo quando nenhum provedor está configurado", async () => {
		const generator = createQuizGeneratorFromEnv({});
		const drafts = await generator.generate({ ...input, context: [] });
		expect(generator.id).toBe("sample");
		expect(drafts).toHaveLength(10);
		expect(drafts[0]?.text).toContain("Questão de exemplo");
	});

	it("exige o modelo quando o provedor está definido", () => {
		expect(() => createQuizGeneratorFromEnv({ QUIZ_AI_PROVIDER: "google" })).toThrow(
			"QUIZ_AI_MODEL",
		);
	});

	it("recusa provedor desconhecido", () => {
		expect(() =>
			createQuizGeneratorFromEnv({ QUIZ_AI_PROVIDER: "inexistente", QUIZ_AI_MODEL: "x" }),
		).toThrow("não é suportado");
	});

	it("monta o gerador do Google, identificado por provedor e modelo, sem chamar a rede", () => {
		const generator = createQuizGeneratorFromEnv({
			QUIZ_AI_PROVIDER: "google",
			QUIZ_AI_MODEL: "gemini-3.5-flash",
		});
		expect(generator.id).toBe("google:gemini-3.5-flash");
	});
});
