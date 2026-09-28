import { atom, useAtom } from "jotai";
import { useCallback } from "react";
import { QUIZ_QUESTIONS } from "@/features/quiz/quiz.model";

const quizIndexAtom = atom(0);
const quizSelectedOptionAtom = atom<string | null>(null);

export function useQuizViewModel() {
	const [index, setIndex] = useAtom(quizIndexAtom);
	const [selectedOptionId, setSelectedOptionId] = useAtom(
		quizSelectedOptionAtom,
	);

	const question = QUIZ_QUESTIONS[index];
	const total = QUIZ_QUESTIONS.length;

	const selectOption = useCallback((id: string) => {
		setSelectedOptionId(id);
	}, []);

	const goNext = useCallback(() => {
		setIndex((current) => Math.min(current + 1, QUIZ_QUESTIONS.length - 1));
		setSelectedOptionId(null);
	}, []);

	const isLast = index === total - 1;

	return {
		question,
		index,
		total,
		isLast,
		selectedOptionId,
		selectOption,
		goNext,
	} as const;
}
