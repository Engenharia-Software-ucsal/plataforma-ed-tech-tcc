export type QuizResultTopic = {
	label: string;
	correct: boolean;
};

export const QUIZ_RESULT_MOCK = {
	correct: 4,
	total: 5,
	title: "Mandou bem!",
	subtitle: "Você domina a maior parte do conteúdo de Engenharia de Software",
	topics: [
		{ label: "Princípios SOLID", correct: true },
		{ label: "Circuit Breaker", correct: true },
		{ label: "Arquitetura de microsserviços", correct: false },
		{ label: "Padrões de resiliência", correct: true },
	] satisfies QuizResultTopic[],
};
