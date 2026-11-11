import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Provider } from "jotai";
import { useQuizViewModel } from "@/features/quiz/quiz.viewmodel";
import { trpc } from "@/utils/trpc";

// Em ambiente de teste, trpc.quiz.getById devolve um quiz fixo com 2 perguntas
// (ver MOCK_QUIZ_FOR_TESTS em utils/trpc.ts) sem bater na rede.
async function renderQuizViewModel() {
	return renderHook(() => useQuizViewModel({ quizId: "mock-quiz-1" }), {
		wrapper: Provider,
	});
}

describe("useQuizViewModel", () => {
	it("carrega o quiz e começa na primeira pergunta sem seleção", async () => {
		const { result } = await renderQuizViewModel();
		await waitFor(() => expect(result.current.status).toBe("ready"));
		expect(result.current.index).toBe(0);
		expect(result.current.selectedOptionId).toBeNull();
	});

	it("seleciona uma opção", async () => {
		const { result } = await renderQuizViewModel();
		await waitFor(() => expect(result.current.status).toBe("ready"));
		const optionId = result.current.question?.options[1]?.id as string;
		await act(async () => result.current.selectOption(optionId));
		expect(result.current.selectedOptionId).toBe(optionId);
	});

	it("avança para a próxima pergunta e reseta a seleção", async () => {
		const { result } = await renderQuizViewModel();
		await waitFor(() => expect(result.current.status).toBe("ready"));
		await act(async () =>
			result.current.selectOption(
				result.current.question?.options[0]?.id as string,
			),
		);
		await act(async () => {
			await result.current.goNext();
		});
		expect(result.current.index).toBe(1);
		expect(result.current.selectedOptionId).toBeNull();
	});

	it("envia a tentativa ao responder a última pergunta", async () => {
		const { result } = await renderQuizViewModel();
		await waitFor(() => expect(result.current.status).toBe("ready"));

		await act(async () =>
			result.current.selectOption(
				result.current.question?.options[0]?.id as string,
			),
		);
		await act(async () => {
			await result.current.goNext();
		});
		expect(result.current.isLast).toBe(true);

		await act(async () =>
			result.current.selectOption(
				result.current.question?.options[0]?.id as string,
			),
		);

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.goNext();
		});
		expect(outcome).toBe("submitted");
	});

	it("gera o quiz da aula inteira quando não há arquivo escolhido", async () => {
		const spy = jest.spyOn(trpc.quiz.requestGeneration, "mutate");
		const { result } = await renderHook(
			() => useQuizViewModel({ classSessionId: "aula-1" }),
			{ wrapper: Provider },
		);
		await waitFor(() => expect(result.current.status).toBe("ready"));
		expect(spy).toHaveBeenCalledWith({
			classSessionId: "aula-1",
			materialId: undefined,
		});
	});

	it("gera o quiz de um único arquivo quando ele é escolhido", async () => {
		const spy = jest.spyOn(trpc.quiz.requestGeneration, "mutate");
		const { result } = await renderHook(
			() =>
				useQuizViewModel({ classSessionId: "aula-1", materialId: "material-9" }),
			{ wrapper: Provider },
		);
		await waitFor(() => expect(result.current.status).toBe("ready"));
		expect(spy).toHaveBeenCalledWith({
			classSessionId: "aula-1",
			materialId: "material-9",
		});
	});
});
