import * as SecureStore from "expo-secure-store";
import { CLASS_SESSIONS } from "@/features/aulas/aulas.model";
import { NOTIFICATIONS_MOCK } from "@/features/notificacoes/notificacoes.model";

export type TrpcSyncedCourse = {
	id: string;
	googleCourseId?: string | null;
	semester?: string;
	subject: string;
	professor: string;
	startTime: string;
	endTime: string;
	room: string;
	topics?: string[];
	difficultyLevel?: "facil" | "medio" | "dificil";
	difficultyScore?: string | number;
	difficultyReviewCount?: number;
	lastSyncedAt?: string | null;
	materials?: Array<{
		id: string;
		title: string;
		fileUrl: string;
		materialType: string;
		summary?: string | null;
	}>;
};

export type SyncFromClassroomResponse = {
	syncedCourses: number;
	syncedMaterials: number;
	usedFallbackSeed: boolean;
	syncedAt: string;
	courses?: TrpcSyncedCourse[];
};

export type QuizDifficulty = "facil" | "medio" | "dificil";

/** O gabarito e a explicação vêm junto; a tela decide quando mostrá-los. */
export type TrpcQuizOption = { id: string; text: string; correct: boolean };
export type TrpcQuizQuestion = {
	id: string;
	topic: string;
	text: string;
	explanation: string;
	options: TrpcQuizOption[];
};
export type TrpcQuiz = {
	id: string;
	classSessionId: string;
	difficulty: QuizDifficulty;
	questionsJson: TrpcQuizQuestion[];
};

export type RequestGenerationResponse = {
	quizId: string;
};

export type SubmitAttemptResponse = {
	attemptId: string;
	score: number;
	correct: number;
	total: number;
	results: Array<{ questionId: string; correct: boolean; explanation: string }>;
};

const MOCK_QUIZ_FOR_TESTS: TrpcQuiz = {
	id: "mock-quiz-1",
	classSessionId: "mock-class-1",
	difficulty: "medio",
	questionsJson: [
		{
			id: "q1",
			topic: "SOLID",
			text: "Qual princípio SOLID afirma que uma classe deve ter apenas um motivo para mudar?",
			explanation: "Single Responsibility Principle: uma classe deve ter um único motivo para mudar.",
			options: [
				{ id: "q1-a", text: "Open/Closed Principle", correct: false },
				{ id: "q1-b", text: "Single Responsibility Principle", correct: true },
				{ id: "q1-c", text: "Liskov Substitution Principle", correct: false },
				{ id: "q1-d", text: "Dependency Inversion Principle", correct: false },
			],
		},
		{
			id: "q2",
			topic: "Resiliência",
			text: "Qual padrão evita chamadas repetidas a um serviço que está falhando?",
			explanation: "O Circuit Breaker interrompe chamadas a um serviço que está falhando.",
			options: [
				{ id: "q2-a", text: "Circuit Breaker", correct: true },
				{ id: "q2-b", text: "Singleton", correct: false },
				{ id: "q2-c", text: "Observer", correct: false },
				{ id: "q2-d", text: "Factory Method", correct: false },
			],
		},
	],
};

/**
 * Erro de uma chamada tRPC que falhou de verdade (ex.: limite diário
 * atingido, não autenticado) — ao contrário de `callTrpcHttp`, que engole
 * qualquer erro e devolve o fallback, isso é usado onde um erro silencioso
 * seria enganoso para o usuário (ex.: achar que gerou um quiz quando na
 * verdade a geração falhou).
 */
export class TrpcClientError extends Error {
	code?: string;
	constructor(message: string, code?: string) {
		super(message);
		this.name = "TrpcClientError";
		this.code = code;
	}
}

type TrpcHttpResult<T> =
	| { ok: true; data: T }
	| { ok: false; code?: string; message: string };

async function callTrpcHttpResult<T>(
	procedure: string,
	method: "GET" | "POST",
	input: unknown,
	fallback: T,
): Promise<TrpcHttpResult<T>> {
	const baseUrl = process.env.EXPO_PUBLIC_SERVER_URL;
	if (!baseUrl || process.env.NODE_ENV === "test") {
		return { ok: true, data: fallback };
	}

	try {
		const sessionId = await SecureStore.getItemAsync("session_id");
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (sessionId) {
			headers.Authorization = `Bearer ${sessionId}`;
		}

		const url =
			method === "GET" && input !== undefined
				? `${baseUrl.replace(/\/$/, "")}/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`
				: `${baseUrl.replace(/\/$/, "")}/trpc/${procedure}`;

		const requestInit: RequestInit = {
			method,
			headers,
			body: method === "POST" ? JSON.stringify(input ?? {}) : undefined,
		};

		let response: Response;
		try {
			response = await fetch(url, requestInit);
		} catch (err) {
			if (url.includes("://localhost")) {
				response = await fetch(
					url.replace("://localhost", "://10.0.2.2"),
					requestInit,
				);
			} else {
				throw err;
			}
		}

		const json = (await response.json().catch(() => null)) as {
			result?: { data?: T };
			error?: { message?: string; data?: { code?: string } };
		} | null;

		if (!response.ok) {
			return {
				ok: false,
				code: json?.error?.data?.code,
				message: json?.error?.message ?? `Erro ${response.status}`,
			};
		}

		return { ok: true, data: json?.result?.data ?? fallback };
	} catch (err) {
		return {
			ok: false,
			message:
				err instanceof Error ? err.message : "Falha de conexão com o servidor",
		};
	}
}

async function callTrpcHttp<T>(
	procedure: string,
	method: "GET" | "POST",
	input: unknown,
	fallback: T,
): Promise<T> {
	const result = await callTrpcHttpResult(procedure, method, input, fallback);
	return result.ok ? result.data : fallback;
}

/** Mesma chamada, mas lança `TrpcClientError` em vez de mascarar a falha com o fallback. */
async function callTrpcHttpOrThrow<T>(
	procedure: string,
	method: "GET" | "POST",
	input: unknown,
	fallback: T,
): Promise<T> {
	const result = await callTrpcHttpResult(procedure, method, input, fallback);
	if (!result.ok) {
		throw new TrpcClientError(result.message, result.code);
	}
	return result.data;
}

export const trpc = {
	auth: {
		loginWithGoogle: {
			mutate: async (input: { serverAuthCode: string; idToken?: string }) =>
				callTrpcHttp("auth.loginWithGoogle", "POST", input, {
					sessionId: "mock-session-id",
					user: {
						id: "user-1",
						name: "João Silva",
						email: "joao.silva@ucsal.edu.br",
						avatarUrl: null as string | null,
					},
				}),
			useMutation: () => ({
				mutateAsync: async (input: {
					serverAuthCode: string;
					idToken?: string;
				}) => trpc.auth.loginWithGoogle.mutate(input),
			}),
		},
		me: {
			query: async () => callTrpcHttp("auth.me", "GET", undefined, null),
		},
	},
	class: {
		list: {
			query: async () =>
				callTrpcHttp("class.list", "GET", undefined, CLASS_SESSIONS),
		},
		byId: {
			query: async (input: { id: string }) =>
				callTrpcHttp("class.byId", "GET", input, null),
		},
		syncFromClassroom: {
			mutate: async (): Promise<SyncFromClassroomResponse> =>
				callTrpcHttp("class.syncFromClassroom", "POST", undefined, {
					syncedCourses: 5,
					syncedMaterials: 7,
					usedFallbackSeed: true,
					syncedAt: new Date().toISOString(),
				}),
		},
		updateSchedule: {
			mutate: async (input: {
				id: string;
				startTime: string;
				endTime: string;
				room: string;
			}) =>
				callTrpcHttp("class.updateSchedule", "POST", input, {
					id: input.id,
					startTime: input.startTime,
					endTime: input.endTime,
					room: input.room,
				}),
		},
		notifications: {
			query: async () =>
				callTrpcHttp(
					"class.notifications",
					"GET",
					undefined,
					NOTIFICATIONS_MOCK,
				),
		},
	},
	materials: {
		listByClass: {
			query: async (input: { classSessionId: string }) =>
				callTrpcHttp("materials.listByClass", "GET", input, []),
		},
	},
	quiz: {
		requestGeneration: {
			mutate: async (input: {
				classSessionId: string;
				/** Sem ele, o quiz vale para todos os materiais da aula. */
				materialId?: string;
			}): Promise<RequestGenerationResponse> =>
				callTrpcHttpOrThrow("quiz.requestGeneration", "POST", input, {
					quizId: "mock-quiz-1",
				}),
		},
		getById: {
			query: async (input: { quizId: string }): Promise<TrpcQuiz> =>
				callTrpcHttpOrThrow("quiz.getById", "GET", input, MOCK_QUIZ_FOR_TESTS),
		},
		submitAttempt: {
			mutate: async (input: {
				quizId: string;
				answers: Array<{ questionId: string; optionId: string }>;
				timeSpentSeconds: number;
			}): Promise<SubmitAttemptResponse> =>
				callTrpcHttpOrThrow("quiz.submitAttempt", "POST", input, {
					attemptId: "mock-attempt-1",
					score: 100,
					correct: input.answers.length,
					total: input.answers.length,
					results: input.answers.map((a) => ({
						questionId: a.questionId,
						correct: true,
						explanation: "Resposta de exemplo (sem backend em teste).",
					})),
				}),
		},
	},
};
