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

async function callTrpcHttp<T>(
	procedure: string,
	method: "GET" | "POST",
	input: unknown,
	fallback: T,
): Promise<T> {
	const baseUrl = process.env.EXPO_PUBLIC_SERVER_URL;
	if (!baseUrl || process.env.NODE_ENV === "test") {
		return fallback;
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

		if (!response.ok) {
			return fallback;
		}

		const json = (await response.json()) as {
			result?: { data?: T };
		};
		return json?.result?.data ?? fallback;
	} catch {
		return fallback;
	}
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
};
