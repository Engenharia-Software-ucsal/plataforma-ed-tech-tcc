import { atom, useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { TrpcClientError, type TrpcQuiz, trpc } from "@/utils/trpc";

export type LastQuizAttemptResult = {
	quizId: string;
	classSessionId: string;
	score: number;
	correct: number;
	total: number;
	topics: Array<{ questionId: string; label: string; correct: boolean }>;
};

/** Lido pela tela de resultado — ver quizResultado.viewmodel.ts. */
export const lastQuizAttemptResultAtom = atom<LastQuizAttemptResult | null>(
	null,
);

const quizIndexAtom = atom(0);
const quizSelectedOptionAtom = atom<string | null>(null);

type QuizLoadState =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; quiz: TrpcQuiz };

export function useQuizViewModel(params: {
	classSessionId?: string;
	materialId?: string;
	quizId?: string;
}) {
	const [index, setIndex] = useAtom(quizIndexAtom);
	const [selectedOptionId, setSelectedOptionId] = useAtom(
		quizSelectedOptionAtom,
	);
	const [state, setState] = useState<QuizLoadState>({ status: "loading" });
	const setLastResult = useSetAtom(lastQuizAttemptResultAtom);

	const answersRef = useRef<Record<string, string>>({});
	const startedAtRef = useRef(Date.now());
	const [submitting, setSubmitting] = useState(false);

	const { classSessionId, materialId, quizId } = params;

	useEffect(() => {
		let active = true;

		async function load() {
			setState({ status: "loading" });
			setIndex(0);
			setSelectedOptionId(null);
			answersRef.current = {};
			startedAtRef.current = Date.now();

			try {
				let resolvedQuizId = quizId;
				if (!resolvedQuizId) {
					if (!classSessionId) {
						throw new Error("Nenhuma aula informada para gerar o quiz.");
					}
					const generated = await trpc.quiz.requestGeneration.mutate({
						classSessionId,
						materialId,
					});
					resolvedQuizId = generated.quizId;
				}

				const quiz = await trpc.quiz.getById.query({ quizId: resolvedQuizId });
				if (!active) return;
				setState({ status: "ready", quiz });
			} catch (err) {
				if (!active) return;
				setState({
					status: "error",
					message:
						err instanceof TrpcClientError || err instanceof Error
							? err.message
							: "Não foi possível carregar o quiz.",
				});
			}
		}

		load();
		return () => {
			active = false;
		};
	}, [classSessionId, materialId, quizId, setIndex, setSelectedOptionId]);

	const question =
		state.status === "ready" ? state.quiz.questionsJson[index] : undefined;
	const total = state.status === "ready" ? state.quiz.questionsJson.length : 0;
	const isLast = index === total - 1;

	const selectOption = useCallback(
		(id: string) => {
			setSelectedOptionId(id);
		},
		[setSelectedOptionId],
	);

	const goNext = useCallback(async (): Promise<
		"next" | "submitted" | "error" | "noop"
	> => {
		if (state.status !== "ready" || !question || !selectedOptionId)
			return "noop";

		answersRef.current[question.id] = selectedOptionId;

		if (!isLast) {
			setIndex((current) => current + 1);
			setSelectedOptionId(null);
			return "next";
		}

		setSubmitting(true);
		try {
			const answers = Object.entries(answersRef.current).map(
				([questionId, optionId]) => ({
					questionId,
					optionId,
				}),
			);
			const timeSpentSeconds = Math.max(
				0,
				Math.round((Date.now() - startedAtRef.current) / 1000),
			);

			const result = await trpc.quiz.submitAttempt.mutate({
				quizId: state.quiz.id,
				answers,
				timeSpentSeconds,
			});

			const resultByQuestion = new Map(
				result.results.map((r) => [r.questionId, r.correct]),
			);
			setLastResult({
				quizId: state.quiz.id,
				classSessionId: state.quiz.classSessionId,
				score: result.score,
				correct: result.correct,
				total: result.total,
				topics: state.quiz.questionsJson.map((q) => ({
					questionId: q.id,
					label: q.topic,
					correct: resultByQuestion.get(q.id) ?? false,
				})),
			});
			return "submitted";
		} catch (err) {
			setState({
				status: "error",
				message:
					err instanceof TrpcClientError || err instanceof Error
						? err.message
						: "Não foi possível enviar suas respostas.",
			});
			return "error";
		} finally {
			setSubmitting(false);
		}
	}, [
		state,
		question,
		selectedOptionId,
		isLast,
		setIndex,
		setSelectedOptionId,
		setLastResult,
	]);

	return {
		status: state.status,
		errorMessage: state.status === "error" ? state.message : undefined,
		question,
		index,
		total,
		isLast,
		selectedOptionId,
		selectOption,
		goNext,
		submitting,
	} as const;
}
