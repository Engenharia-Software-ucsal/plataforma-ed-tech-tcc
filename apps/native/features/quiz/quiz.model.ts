export type QuizOption = {
	id: string;
	letter: string;
	text: string;
	correct: boolean;
};

export type QuizQuestion = {
	id: string;
	topic: string;
	text: string;
	options: QuizOption[];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
	{
		id: "q1",
		topic: "SOLID",
		text: "Qual princípio SOLID afirma que uma classe deve ter apenas um motivo para mudar?",
		options: [
			{
				id: "q1-a",
				letter: "A",
				text: "Open/Closed Principle",
				correct: false,
			},
			{
				id: "q1-b",
				letter: "B",
				text: "Single Responsibility Principle",
				correct: true,
			},
			{
				id: "q1-c",
				letter: "C",
				text: "Liskov Substitution Principle",
				correct: false,
			},
			{
				id: "q1-d",
				letter: "D",
				text: "Dependency Inversion Principle",
				correct: false,
			},
		],
	},
	{
		id: "q2",
		topic: "Resiliência",
		text: "Qual padrão evita chamadas repetidas a um serviço que está falhando?",
		options: [
			{ id: "q2-a", letter: "A", text: "Circuit Breaker", correct: true },
			{ id: "q2-b", letter: "B", text: "Singleton", correct: false },
			{ id: "q2-c", letter: "C", text: "Observer", correct: false },
			{ id: "q2-d", letter: "D", text: "Factory Method", correct: false },
		],
	},
];
