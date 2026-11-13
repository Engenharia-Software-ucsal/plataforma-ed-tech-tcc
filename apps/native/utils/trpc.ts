import { markdownPreview } from "@busuucsal-v3/notes";
import * as SecureStore from "expo-secure-store";
import { CLASS_SESSIONS } from "@/features/aulas/aulas.model";
import {
	type AiSuggestedLink,
	INITIAL_AI_SUGGESTIONS_MAP,
	INITIAL_NOTES_MOCK,
	MOCK_NOTES_TREE,
	MOCK_TRASH,
	type Note,
	type NoteFolder,
	type NoteLink,
	type NoteSummary,
	type NotesTree,
	resolveWikilinks,
	type TrashItem,
	type TrashItemType,
} from "@/features/notas/notas.model";
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

/** Andamento da leitura de um PDF pelo servidor (ingestão). */
export type IngestionStatus =
	| "pending"
	| "processing"
	| "ready"
	| "failed"
	| "unsupported";

/** Motivo curto devolvido pelo servidor para PDFs não suportados ou com falha. */
export type IngestionReason = "no_file" | "scanned" | "format" | "error";

export type IngestionStatusResponse = {
	totalPdfs: number;
	counts: Record<string, number>;
	materials: Array<{
		id: string;
		title: string;
		status: IngestionStatus;
		reason: IngestionReason | null;
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
			explanation:
				"Single Responsibility Principle: uma classe deve ter um único motivo para mudar.",
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
			explanation:
				"O Circuit Breaker interrompe chamadas a um serviço que está falhando.",
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

/** Resposta de `notes.create` / `notes.update`: a nota salva e as outras que mudaram junto. */
export type SavedNote = NoteSummary & {
	content: string;
	/** Notas cujo texto ou vínculos mudaram por causa deste salvamento (ex.: renomeação). */
	affectedNoteIds: string[];
};

export type NoteCreateInput = {
	title: string;
	content?: string;
	tags?: string[];
	classSessionId?: string;
	folderId?: string | null;
};

export type NoteUpdateInput = {
	id: string;
	title?: string;
	content?: string;
	tags?: string[];
	classSessionId?: string | null;
	/** Versão que o app tinha; o servidor responde CONFLICT se a nota mudou depois. */
	expectedUpdatedAt?: string;
};

function mockSavedNote(
	base: Partial<Note> & { id: string; title: string },
): SavedNote {
	const now = new Date().toISOString();
	const content = base.content ?? "";
	return {
		folderId: null,
		position: 0,
		tags: [],
		autoTags: [],
		classSessionId: null,
		linkCount: 0,
		createdAt: now,
		...base,
		content,
		preview: markdownPreview(content),
		updatedAt: now,
		affectedNoteIds: [],
	};
}

function mockNoteDetail(id: string): Note | null {
	const note = INITIAL_NOTES_MOCK.find((n) => n.id === id);
	return note
		? { ...note, wikilinks: resolveWikilinks(note.content, INITIAL_NOTES_MOCK) }
		: null;
}

const notesApi = {
	/** Busca no servidor (título e texto completo). */
	list: {
		query: async (input: {
			search?: string;
			tag?: string;
			folderId?: string | null;
		}): Promise<NoteSummary[]> => {
			const search = input.search?.trim().toLowerCase() ?? "";
			const fallback = MOCK_NOTES_TREE.notes.filter((note) => {
				const full = INITIAL_NOTES_MOCK.find((n) => n.id === note.id);
				return (
					!search ||
					note.title.toLowerCase().includes(search) ||
					(full?.content.toLowerCase().includes(search) ?? false)
				);
			});
			return callTrpcHttpOrThrow("notes.list", "GET", input, fallback);
		},
	},
	getById: {
		query: async (input: { id: string }): Promise<Note | null> =>
			callTrpcHttpOrThrow(
				"notes.getById",
				"GET",
				input,
				mockNoteDetail(input.id),
			),
	},
	create: {
		mutate: async (input: NoteCreateInput): Promise<SavedNote> =>
			callTrpcHttpOrThrow(
				"notes.create",
				"POST",
				input,
				mockSavedNote({
					id: `note-${Date.now()}`,
					title: input.title.trim(),
					content: input.content,
					tags: input.tags ?? [],
					folderId: input.folderId ?? null,
					classSessionId: input.classSessionId ?? null,
				}),
			),
	},
	update: {
		mutate: async (input: NoteUpdateInput): Promise<SavedNote> => {
			const { expectedUpdatedAt: _expectedUpdatedAt, ...changes } = input;
			const current = INITIAL_NOTES_MOCK.find((n) => n.id === input.id);
			return callTrpcHttpOrThrow(
				"notes.update",
				"POST",
				input,
				mockSavedNote({
					...current,
					...changes,
					title: changes.title?.trim() ?? current?.title ?? "Nota",
				}),
			);
		},
	},
	delete: {
		mutate: async (input: { id: string }) =>
			callTrpcHttpOrThrow("notes.delete", "POST", input, {
				success: true,
				id: input.id,
			}),
	},
	move: {
		mutate: async (input: {
			id: string;
			folderId: string | null;
			position?: number;
		}) =>
			callTrpcHttpOrThrow("notes.move", "POST", input, {
				success: true,
				id: input.id,
				folderId: input.folderId,
			}),
	},
	reorder: {
		mutate: async (input: { folderId: string | null; orderedIds: string[] }) =>
			callTrpcHttpOrThrow("notes.reorder", "POST", input, {
				orderedIds: input.orderedIds,
			}),
	},
	addLink: {
		mutate: async (input: {
			sourceNoteId: string;
			targetNoteId: string;
			reason: string;
			linkType?: "manual" | "ai_suggested";
		}): Promise<NoteLink> =>
			callTrpcHttpOrThrow("notes.addLink", "POST", input, {
				id: `link-${Date.now()}`,
				sourceNoteId: input.sourceNoteId,
				targetNoteId: input.targetNoteId,
				linkType: input.linkType ?? "manual",
				reason: input.reason.trim(),
				similarityScore: "1.00",
				createdAt: new Date().toISOString(),
			}),
	},
	removeLink: {
		mutate: async (input: { id: string }) =>
			callTrpcHttpOrThrow("notes.removeLink", "POST", input, {
				success: true,
				id: input.id,
			}),
	},
	suggestLinks: {
		query: async (input: { noteId: string }): Promise<AiSuggestedLink[]> =>
			callTrpcHttpOrThrow(
				"notes.suggestLinks",
				"GET",
				input,
				INITIAL_AI_SUGGESTIONS_MAP[input.noteId] ?? [],
			),
	},
};

const foldersApi = {
	tree: {
		query: async (): Promise<NotesTree> =>
			callTrpcHttpOrThrow("folders.tree", "GET", undefined, MOCK_NOTES_TREE),
	},
	create: {
		mutate: async (input: {
			name: string;
			parentId?: string | null;
		}): Promise<NoteFolder> =>
			callTrpcHttpOrThrow("folders.create", "POST", input, {
				id: `folder-${Date.now()}`,
				parentId: input.parentId ?? null,
				name: input.name.trim(),
				position: Number.MAX_SAFE_INTEGER,
			}),
	},
	rename: {
		mutate: async (input: {
			id: string;
			name: string;
		}): Promise<NoteFolder> => {
			const current = MOCK_NOTES_TREE.folders.find((f) => f.id === input.id);
			return callTrpcHttpOrThrow("folders.rename", "POST", input, {
				id: input.id,
				parentId: current?.parentId ?? null,
				position: current?.position ?? 0,
				name: input.name.trim(),
			});
		},
	},
	move: {
		mutate: async (input: {
			id: string;
			parentId: string | null;
			position?: number;
		}) =>
			callTrpcHttpOrThrow("folders.move", "POST", input, {
				success: true,
				id: input.id,
				parentId: input.parentId,
			}),
	},
	reorder: {
		mutate: async (input: { parentId: string | null; orderedIds: string[] }) =>
			callTrpcHttpOrThrow("folders.reorder", "POST", input, {
				orderedIds: input.orderedIds,
			}),
	},
	delete: {
		mutate: async (input: { id: string; mode: "moveToParent" | "trashAll" }) =>
			callTrpcHttpOrThrow("folders.delete", "POST", input, {
				success: true,
				id: input.id,
			}),
	},
};

const trashApi = {
	list: {
		query: async (): Promise<TrashItem[]> =>
			callTrpcHttpOrThrow("trash.list", "GET", undefined, MOCK_TRASH),
	},
	restore: {
		mutate: async (input: { id: string; type: TrashItemType }) =>
			callTrpcHttpOrThrow("trash.restore", "POST", input, {
				type: input.type,
				id: input.id,
				name: MOCK_TRASH.find((item) => item.id === input.id)?.name ?? "",
				parentId: null as string | null,
			}),
	},
	deletePermanently: {
		mutate: async (input: { id: string; type: TrashItemType }) =>
			callTrpcHttpOrThrow("trash.deletePermanently", "POST", input, {
				success: true,
				id: input.id,
			}),
	},
	empty: {
		mutate: async () =>
			callTrpcHttpOrThrow("trash.empty", "POST", undefined, { success: true }),
	},
};

export const trpc = {
	notes: notesApi,
	folders: foldersApi,
	trash: trashApi,
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
		/** `null` quando o servidor não responde ou a aula não é real (ex.: dados de exemplo). */
		ingestionStatus: {
			query: async (input: {
				classSessionId: string;
			}): Promise<IngestionStatusResponse | null> =>
				callTrpcHttp<IngestionStatusResponse | null>(
					"materials.ingestionStatus",
					"GET",
					input,
					null,
				),
		},
		startIngestion: {
			mutate: async (input: { classSessionId: string }) =>
				callTrpcHttp("materials.startIngestion", "POST", input, {
					started: false,
				}),
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
