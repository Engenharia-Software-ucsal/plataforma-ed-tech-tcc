import { env } from "@busuucsal-v3/env/server";
import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { classSessions, courseMaterials } from "../db/schema/index.js";

export type ClassroomMaterialSeed = {
	googleMaterialId: string;
	title: string;
	fileUrl: string;
	materialType: "pdf" | "xlsx" | "video" | "link" | "assignment" | "announcement";
	summary: string | null;
};

export type ClassroomCourseSeed = {
	googleCourseId: string;
	semester: string;
	startTime: string;
	endTime: string;
	subject: string;
	professor: string;
	room: string;
	topics: string[];
	difficultyLevel: "facil" | "medio" | "dificil";
	difficultyScore: string;
	difficultyReviewCount: number;
	materials: ClassroomMaterialSeed[];
};

export type ClassroomFetcher = (
	refreshToken: string,
) => Promise<ClassroomCourseSeed[]>;

const SEMESTER_REGEX = /(20\d{2})\s*[./-]\s*([12])/;

export function inferCourseSemester(
	name?: string | null,
	section?: string | null,
	creationTime?: string | null,
): string {
	const combined = [name, section].filter(Boolean).join(" · ");
	const match = combined.match(SEMESTER_REGEX);
	if (match?.[1] && match?.[2]) {
		return `${match[1]}.${match[2]}`;
	}

	if (creationTime) {
		const date = new Date(creationTime);
		if (!Number.isNaN(date.getTime())) {
			const year = date.getUTCFullYear();
			const month = date.getUTCMonth();
			const period = month <= 5 ? "1" : "2";
			return `${year}.${period}`;
		}
	}

	return "2026.2";
}

const SCHEDULE_REGEX =
	/(\d{1,2})(?::(\d{2})|h(\d{2})?)\s*(?:-|–|—|às|as|a)\s*(\d{1,2})(?::(\d{2})|h(\d{2})?)/i;

function formatHourMinute(hourRaw: string, minA?: string, minB?: string): string {
	const hour = hourRaw.padStart(2, "0");
	const minute = (minA ?? minB ?? "00").padStart(2, "0");
	return `${hour}:${minute}`;
}

export function parseClassroomScheduleAndRoom(
	section?: string | null,
	room?: string | null,
): { startTime: string; endTime: string; room: string } {
	let startTime = "08:00";
	let endTime = "09:30";

	const normalizedSection = section?.trim() ?? "";
	const match = normalizedSection.match(SCHEDULE_REGEX);
	if (match && match[1] && match[4]) {
		startTime = formatHourMinute(match[1], match[2], match[3]);
		endTime = formatHourMinute(match[4], match[5], match[6]);
	} else if (/(?:^|[-·\s])(?:NOT|Noturno)(?:[-·\s]|$)/i.test(normalizedSection)) {
		startTime = "19:00";
		endTime = "21:40";
	}

	const trimmedRoom = room?.trim() ?? "";
	if (trimmedRoom.length > 0) {
		return { startTime, endTime, room: trimmedRoom };
	}

	const separatorMatch = normalizedSection.match(/(?:·|\||-)\s*((?:Sala|Lab|Bloco|BL-)[^|·]+)$/i);
	if (separatorMatch?.[1]) {
		return { startTime, endTime, room: separatorMatch[1].trim() };
	}

	return {
		startTime,
		endTime,
		room: "Sala a definir · Classroom",
	};
}

export const UCSAL_DEFAULT_CLASSES: ClassroomCourseSeed[] = [
	{
		googleCourseId: "ucsal-eng-sw",
		semester: "2026.2",
		startTime: "08:00",
		endTime: "09:30",
		subject: "Engenharia de Software",
		professor: "Prof. Ana Silva",
		room: "Sala 302 · BL-A-302",
		topics: ["SOLID", "Microsserviços", "Circuit Breaker"],
		difficultyLevel: "dificil",
		difficultyScore: "4.3",
		difficultyReviewCount: 142,
		materials: [
			{
				googleMaterialId: "ucsal-eng-sw-mat-1",
				title: "Slides - Aula 04.pdf",
				fileUrl: "https://classroom.google.com/c/ucsal-eng-sw/m/slides-aula-04",
				materialType: "pdf",
				summary:
					"Princípios SOLID aplicados a microsserviços e padrão Circuit Breaker (pág. 14).",
			},
			{
				googleMaterialId: "ucsal-eng-sw-mat-2",
				title: "Lista de Exercícios.xlsx",
				fileUrl: "https://classroom.google.com/c/ucsal-eng-sw/m/lista-exercicios",
				materialType: "xlsx",
				summary:
					"3 exercícios recomendados sobre acoplamento, coesão e resiliência.",
			},
			{
				googleMaterialId: "ucsal-eng-sw-mat-3",
				title: "Gravação da Aula.mp4",
				fileUrl: "https://classroom.google.com/c/ucsal-eng-sw/m/gravacao-aula-04",
				materialType: "video",
				summary:
					"Demonstração prática de Circuit Breaker e políticas de Retry com jitter.",
			},
			{
				googleMaterialId: "ucsal-eng-sw-mat-4",
				title: "Repositório do Projeto",
				fileUrl: "https://github.com/ucsal",
				materialType: "link",
				summary: "Repositório oficial de exemplos da disciplina no GitHub.",
			},
			{
				googleMaterialId: "ucsal-eng-sw-cw-1",
				title: "Atividade Prática: Implementar Circuit Breaker",
				fileUrl: "https://classroom.google.com/c/ucsal-eng-sw/a/circuit-breaker",
				materialType: "assignment",
				summary:
					"Entrega individual via Google Classroom aplicando tolerância a falhas.",
			},
			{
				googleMaterialId: "ucsal-eng-sw-ann-1",
				title: "Aviso da Docente: Revisão de Arquitetura",
				fileUrl: "https://classroom.google.com/c/ucsal-eng-sw/p/aviso-revisao",
				materialType: "announcement",
				summary:
					"Prof. Ana Silva: Revisem os slides sobre SOLID e Circuit Breaker antes do quiz.",
			},
		],
	},
	{
		googleCourseId: "ucsal-bd2",
		semester: "2026.2",
		startTime: "10:00",
		endTime: "11:30",
		subject: "Banco de Dados II",
		professor: "Prof. Carlos Melo",
		room: "Sala 415 · BL-B-415",
		topics: ["Indexação B-Tree", "Transações ACID", "Tuning de Queries"],
		difficultyLevel: "dificil",
		difficultyScore: "4.6",
		difficultyReviewCount: 97,
		materials: [
			{
				googleMaterialId: "ucsal-bd2-mat-1",
				title: "Plano de Execução e Índices PostgreSQL.pdf",
				fileUrl: "https://classroom.google.com/c/ucsal-bd2/m/indices-pg",
				materialType: "pdf",
				summary: "Análise de EXPLAIN ANALYZE e otimização de consultas relacionais.",
			},
			{
				googleMaterialId: "ucsal-bd2-cw-1",
				title: "Laboratório de Tuning SQL",
				fileUrl: "https://classroom.google.com/c/ucsal-bd2/a/lab-tuning",
				materialType: "assignment",
				summary: "Otimização de queries lentas em banco PostgreSQL de 1M de linhas.",
			},
		],
	},
	{
		googleCourseId: "ucsal-redes",
		semester: "2026.2",
		startTime: "13:00",
		endTime: "14:30",
		subject: "Redes de Computadores",
		professor: "Prof. Maria Santos",
		room: "Lab 201 · BL-C-201",
		topics: ["TCP/IP", "Roteamento OSPF", "VLANs"],
		difficultyLevel: "medio",
		difficultyScore: "3.1",
		difficultyReviewCount: 64,
		materials: [
			{
				googleMaterialId: "ucsal-redes-mat-1",
				title: "Guia de Sub-redes e CIDR.pdf",
				fileUrl: "https://classroom.google.com/c/ucsal-redes/m/guia-cidr",
				materialType: "pdf",
				summary: "Tabelas de máscara de sub-rede e roteamento inter-VLAN.",
			},
		],
	},
	{
		googleCourseId: "ucsal-ia",
		semester: "2026.2",
		startTime: "15:00",
		endTime: "16:30",
		subject: "Inteligência Artificial",
		professor: "Prof. João Lima",
		room: "Sala 108 · BL-A-108",
		topics: ["Busca Heurística", "Redes Neurais", "LLMs e RAG"],
		difficultyLevel: "dificil",
		difficultyScore: "4.1",
		difficultyReviewCount: 110,
		materials: [
			{
				googleMaterialId: "ucsal-ia-mat-1",
				title: "Arquitetura Transformer e Embeddings.pdf",
				fileUrl: "https://classroom.google.com/c/ucsal-ia/m/transformers",
				materialType: "pdf",
				summary: "Fundamentos de atenção multi-cabeça e busca semântica vetorial.",
			},
		],
	},
	{
		googleCourseId: "ucsal-projeto",
		semester: "2026.2",
		startTime: "17:00",
		endTime: "18:30",
		subject: "Projeto Integrador",
		professor: "Prof. Renata Costa",
		room: "Sala 510 · BL-D-510",
		topics: ["Scrum", "Entrega Contínua", "Validação com Usuários"],
		difficultyLevel: "facil",
		difficultyScore: "2.0",
		difficultyReviewCount: 38,
		materials: [
			{
				googleMaterialId: "ucsal-projeto-ann-1",
				title: "Cronograma da Sprint Review",
				fileUrl: "https://classroom.google.com/c/ucsal-projeto/p/sprint-review",
				materialType: "announcement",
				summary: "Prof. Renata Costa: Apresentação dos protótipos funcionais na próxima aula.",
			},
		],
	},
	{
		googleCourseId: "ucsal-ed-2026-1",
		semester: "2026.1",
		startTime: "08:00",
		endTime: "09:30",
		subject: "Estrutura de Dados",
		professor: "Prof. Marcos Oliveira",
		room: "Sala 204 · BL-A-204",
		topics: ["Árvores AVL", "Tabelas Hash", "Grafos"],
		difficultyLevel: "medio",
		difficultyScore: "3.6",
		difficultyReviewCount: 84,
		materials: [
			{
				googleMaterialId: "ucsal-ed-mat-1",
				title: "Apostila Árvores Balanceadas.pdf",
				fileUrl: "https://classroom.google.com/c/ucsal-ed-2026-1/m/arvores",
				materialType: "pdf",
				summary: "Implementação de rotações simples e duplas em árvores AVL.",
			},
		],
	},
	{
		googleCourseId: "ucsal-arq-comp-2026-1",
		semester: "2026.1",
		startTime: "10:00",
		endTime: "11:30",
		subject: "Arquitetura de Computadores",
		professor: "Prof. Roberto Mendes",
		room: "Lab 102 · BL-B-102",
		topics: ["Pipeline RISC-V", "Memória Cache", "Hierarquia de Memória"],
		difficultyLevel: "medio",
		difficultyScore: "3.4",
		difficultyReviewCount: 72,
		materials: [
			{
				googleMaterialId: "ucsal-arq-mat-1",
				title: "Slides Pipeline e Hazards.pdf",
				fileUrl: "https://classroom.google.com/c/ucsal-arq-comp-2026-1/m/pipeline",
				materialType: "pdf",
				summary: "Resolução de hazards de dados e controle em processadores RISC-V.",
			},
		],
	},
];

function inferFileMaterialType(
	title: string,
): "pdf" | "xlsx" | "video" | "link" {
	const lower = title.toLowerCase();
	if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
		return "xlsx";
	}
	if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) {
		return "video";
	}
	return "pdf";
}

async function requestClassroomEndpoint<T>(
	client: OAuth2Client,
	path: string,
): Promise<T | null> {
	try {
		const response = await client.request<T>({
			url: `https://classroom.googleapis.com/v1${path}`,
		});
		return response.data ?? null;
	} catch (err: any) {
		const apiMessage =
			err?.response?.data?.error?.message ?? err?.message ?? String(err);
		console.warn(`[classroom.service] ${path} failed: ${apiMessage}`);
		return null;
	}
}

export async function fetchClassroomSnapshotWithToken(
	refreshToken: string,
): Promise<ClassroomCourseSeed[]> {
	const client = new OAuth2Client(
		env.GOOGLE_SERVER_CLIENT_ID,
		env.GOOGLE_CLIENT_SECRET,
	);
	client.setCredentials({ refresh_token: refreshToken });

	const coursesRes = await requestClassroomEndpoint<{
		courses?: Array<{
			id: string;
			name: string;
			section?: string;
			descriptionHeading?: string;
			room?: string;
			creationTime?: string;
		}>;
	}>(client, "/courses?courseStates=ACTIVE");

	const activeCourses = coursesRes?.courses ?? [];
	if (activeCourses.length === 0) {
		return [];
	}

	const results: ClassroomCourseSeed[] = [];

	for (const course of activeCourses) {
		const [teachersRes, topicsRes, materialsRes, courseWorkRes, announcementsRes] =
			await Promise.all([
				requestClassroomEndpoint<{
					teachers?: Array<{ profile?: { name?: { fullName?: string } } }>;
				}>(client, `/courses/${course.id}/teachers`),
				requestClassroomEndpoint<{
					topic?: Array<{ topicId: string; name: string }>;
				}>(client, `/courses/${course.id}/topics`),
				requestClassroomEndpoint<{
					courseWorkMaterial?: Array<{
						id: string;
						title: string;
						description?: string;
						alternateLink?: string;
						materials?: Array<{
							driveFile?: {
								driveFile?: { id?: string; title?: string; alternateLink?: string };
							};
							youtubeVideo?: {
								id?: string;
								title?: string;
								alternateLink?: string;
							};
							link?: { url?: string; title?: string };
						}>;
					}>;
				}>(client, `/courses/${course.id}/courseWorkMaterials`),
				requestClassroomEndpoint<{
					courseWork?: Array<{
						id: string;
						title: string;
						description?: string;
						alternateLink?: string;
					}>;
				}>(client, `/courses/${course.id}/courseWork`),
				requestClassroomEndpoint<{
					announcements?: Array<{
						id: string;
						text?: string;
						alternateLink?: string;
					}>;
				}>(client, `/courses/${course.id}/announcements`),
			]);

		const professor =
			teachersRes?.teachers?.[0]?.profile?.name?.fullName ?? "Docente UCSAL";
		const topics = (topicsRes?.topic ?? [])
			.map((t) => t.name?.trim())
			.filter((name): name is string => Boolean(name));

		const scheduleSource = [course.section, course.descriptionHeading]
			.filter(Boolean)
			.join(" · ");
		const { startTime, endTime, room } = parseClassroomScheduleAndRoom(
			scheduleSource,
			course.room,
		);

		const mappedMaterials: ClassroomMaterialSeed[] = [];

		for (const item of materialsRes?.courseWorkMaterial ?? []) {
			const attachments = item.materials ?? [];
			if (attachments.length === 0) {
				mappedMaterials.push({
					googleMaterialId: `mat-${course.id}-${item.id}`,
					title: item.title,
					fileUrl:
						item.alternateLink ??
						`https://classroom.google.com/c/${course.id}/m/${item.id}`,
					materialType: inferFileMaterialType(item.title),
					summary: item.description ?? null,
				});
				continue;
			}

			attachments.forEach((att, idx) => {
				if (att.driveFile?.driveFile) {
					const df = att.driveFile.driveFile;
					const title = df.title ?? item.title;
					mappedMaterials.push({
						googleMaterialId: `mat-${course.id}-${item.id}-${df.id ?? idx}`,
						title,
						fileUrl:
							df.alternateLink ??
							item.alternateLink ??
							`https://classroom.google.com/c/${course.id}`,
						materialType: inferFileMaterialType(title),
						summary: item.description ?? null,
					});
				} else if (att.youtubeVideo) {
					const yt = att.youtubeVideo;
					mappedMaterials.push({
						googleMaterialId: `yt-${course.id}-${item.id}-${yt.id ?? idx}`,
						title: yt.title ?? item.title,
						fileUrl:
							yt.alternateLink ??
							item.alternateLink ??
							`https://classroom.google.com/c/${course.id}`,
						materialType: "video",
						summary: item.description ?? null,
					});
				} else if (att.link) {
					mappedMaterials.push({
						googleMaterialId: `lnk-${course.id}-${item.id}-${idx}`,
						title: att.link.title ?? item.title,
						fileUrl:
							att.link.url ??
							item.alternateLink ??
							`https://classroom.google.com/c/${course.id}`,
						materialType: "link",
						summary: item.description ?? null,
					});
				}
			});
		}

		for (const cw of courseWorkRes?.courseWork ?? []) {
			mappedMaterials.push({
				googleMaterialId: `cw-${course.id}-${cw.id}`,
				title: cw.title,
				fileUrl:
					cw.alternateLink ??
					`https://classroom.google.com/c/${course.id}/a/${cw.id}`,
				materialType: "assignment",
				summary: cw.description ?? null,
			});
		}

		for (const ann of announcementsRes?.announcements ?? []) {
			const cleanText = ann.text?.trim() ?? "Novo comunicado no Google Classroom";
			const firstLine = cleanText.split("\n")[0]?.slice(0, 72) ?? "Aviso Docente";
			mappedMaterials.push({
				googleMaterialId: `ann-${course.id}-${ann.id}`,
				title: `Aviso: ${firstLine}`,
				fileUrl:
					ann.alternateLink ??
					`https://classroom.google.com/c/${course.id}/p/${ann.id}`,
				materialType: "announcement",
				summary: cleanText,
			});
		}

		const semester = inferCourseSemester(
			course.name,
			scheduleSource,
			course.creationTime,
		);

		results.push({
			googleCourseId: course.id,
			semester,
			startTime,
			endTime,
			subject: course.name,
			professor,
			room,
			topics,
			difficultyLevel: "medio",
			difficultyScore: "3.5",
			difficultyReviewCount: 1,
			materials: mappedMaterials,
		});
	}

	return results;
}

export async function syncClassroomForUser(options: {
	db: any;
	refreshToken?: string | null;
	fetcher?: ClassroomFetcher;
}): Promise<{
	syncedCourses: number;
	syncedMaterials: number;
	usedFallbackSeed: boolean;
	syncedAt: string;
}> {
	const { db, refreshToken, fetcher = fetchClassroomSnapshotWithToken } = options;
	let coursesToSync: ClassroomCourseSeed[] = [];
	let usedFallbackSeed = false;

	if (refreshToken) {
		try {
			coursesToSync = await fetcher(refreshToken);
		} catch {
			coursesToSync = [];
		}
	}

	if (coursesToSync.length === 0) {
		coursesToSync = UCSAL_DEFAULT_CLASSES;
		usedFallbackSeed = true;
	}

	const now = new Date();
	const existingSessions: Array<typeof classSessions.$inferSelect> = await db
		.select()
		.from(classSessions);

	let syncedCourses = 0;
	let syncedMaterials = 0;

	for (const course of coursesToSync) {
		const existing = existingSessions.find(
			(s) =>
				(course.googleCourseId && s.googleCourseId === course.googleCourseId) ||
				s.subject === course.subject,
		);

		let sessionId: string;

		if (existing) {
			const [updated] = await db
				.update(classSessions)
				.set({
					googleCourseId: course.googleCourseId,
					semester: course.semester ?? "2026.2",
					professor: course.professor,
					topics: course.topics,
					lastSyncedAt: now,
					updatedAt: now,
				})
				.where(eq(classSessions.id, existing.id))
				.returning();
			sessionId = updated?.id ?? existing.id;
		} else {
			const [inserted] = await db
				.insert(classSessions)
				.values({
					googleCourseId: course.googleCourseId,
					semester: course.semester ?? "2026.2",
					startTime: course.startTime,
					endTime: course.endTime,
					subject: course.subject,
					professor: course.professor,
					room: course.room,
					topics: course.topics,
					difficultyLevel: course.difficultyLevel,
					difficultyScore: course.difficultyScore,
					difficultyReviewCount: course.difficultyReviewCount,
					lastSyncedAt: now,
				})
				.returning();
			sessionId = inserted.id;
			existingSessions.push(inserted);
		}

		syncedCourses += 1;

		const existingMaterials: Array<typeof courseMaterials.$inferSelect> = await db
			.select()
			.from(courseMaterials)
			.where(eq(courseMaterials.classSessionId, sessionId));

		for (const mat of course.materials) {
			const existingMat = existingMaterials.find(
				(m) =>
					(mat.googleMaterialId && m.googleMaterialId === mat.googleMaterialId) ||
					m.title === mat.title,
			);

			if (existingMat) {
				await db
					.update(courseMaterials)
					.set({
						googleMaterialId: mat.googleMaterialId,
						title: mat.title,
						fileUrl: mat.fileUrl,
						materialType: mat.materialType,
						summary: mat.summary,
					})
					.where(eq(courseMaterials.id, existingMat.id))
					.returning();
			} else {
				const [insertedMat] = await db
					.insert(courseMaterials)
					.values({
						googleMaterialId: mat.googleMaterialId,
						classSessionId: sessionId,
						title: mat.title,
						fileUrl: mat.fileUrl,
						materialType: mat.materialType,
						summary: mat.summary,
					})
					.returning();
				if (insertedMat) {
					existingMaterials.push(insertedMat);
				}
			}

			syncedMaterials += 1;
		}
	}

	return {
		syncedCourses,
		syncedMaterials,
		usedFallbackSeed,
		syncedAt: now.toISOString(),
	};
}
