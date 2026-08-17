import { useCallback, useState } from "react";
import { QUIZ_QUESTIONS } from "@/features/quiz/quiz.model";

export function useQuizViewModel() {
	const [index, setIndex] = useState(0);
	const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

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
