import { atom } from "jotai";
import {
	AULA_DETALHES_MOCK,
	type AulaDetalhesData,
	type ClassroomFile,
} from "@/features/aula-detalhes/aulaDetalhes.model";
import { CLASS_SESSIONS, type ClassSession } from "@/features/aulas/aulas.model";
import {
	NOTIFICATIONS_MOCK,
	type NotificationItem,
} from "@/features/notificacoes/notificacoes.model";
import { type TrpcSyncedCourse, trpc } from "@/utils/trpc";

export type ClassroomSyncStatus = "idle" | "syncing" | "synced" | "error";

export const INITIAL_CLASS_DETAILS_MAP: Record<string, AulaDetalhesData> = {
	"aula-eng-soft-04": AULA_DETALHES_MOCK,
	"class-eng-sw": {
		...AULA_DETALHES_MOCK,
		id: "class-eng-sw",
		room: "Sala 302 · BL-A-302",
	},
	"class-bd2": {
		id: "class-bd2",
		subject: "Banco de Dados II",
		professor: "Prof. Carlos Melo",
		schedule: "10:00 - 11:30",
		room: "Sala 415 · BL-B-415",
		topics: ["Normalização 3FN", "Índices B-Tree", "Transações ACID"],
		syncedAgo: "Sincronizado com Classroom há 2h",
		files: [
			{
				id: "bd2-f1",
				name: "Apostila Indexação e Plano de Execução.pdf",
				meta: "1.8 MB · PDF",
				iconName: "file-text",
				badge: "novo",
				fileUrl: "https://classroom.google.com/c/ucsal-bd2/m/indexacao",
			},
			{
				id: "bd2-f2",
				name: "Lista Prática de Normalização 3FN",
				meta: "Atividade · Classroom",
				iconName: "file-spreadsheet",
				badge: "novo",
				fileUrl: "https://classroom.google.com/c/ucsal-bd2/a/normalizacao-3fn",
			},
		],
		insights: [
			{
				id: "bd2-ins-01",
				summary:
					"Síntese dos critérios de decomposição sem perda na Terceira Forma Normal (3FN) e impacto de índices B-Tree em consultas analíticas.",
				coverageText: "Baseado em 2 de 2 materiais analisados",
				points: [
					"Eliminação de dependências transitivas sobre chaves não-primárias",
					"Uso de EXPLAIN ANALYZE no PostgreSQL para inspecionar Seq Scan vs Index Scan",
				],
				sourceReference: "Apostila Indexação p. 06",
			},
		],
	},
	"class-redes": {
		id: "class-redes",
		subject: "Redes de Computadores",
		professor: "Prof. Maria Santos",
		schedule: "13:00 - 14:30",
		room: "Lab 201 · BL-C-201",
		topics: ["TCP/IP", "Roteamento OSPF", "DNS"],
		syncedAgo: "Sincronizado com Classroom há 2h",
		files: [
			{
				id: "redes-f1",
				name: "Guia de Laboratório Wireshark.pdf",
				meta: "1.2 MB · PDF",
				iconName: "file-text",
				fileUrl: "https://classroom.google.com/c/ucsal-redes/m/wireshark",
			},
		],
		insights: [
			{
				id: "redes-ins-01",
				summary:
					"Análise de captura de pacotes TCP Three-Way Handshake e controle de congestionamento.",
				coverageText: "Baseado em 1 de 1 material analisado",
				points: [
					"Flags SYN, SYN-ACK e ACK na abertura de conexão",
					"Cálculo de janela deslizante e retransmissão rápida",
				],
				sourceReference: "Guia Wireshark p. 04",
			},
		],
	},
	"class-ia": {
		id: "class-ia",
		subject: "Inteligência Artificial",
		professor: "Prof. João Lima",
		schedule: "15:00 - 16:30",
		room: "Sala 108 · BL-A-108",
		topics: ["RAG", "Embeddings", "Engenharia de Prompt"],
		syncedAgo: "Sincronizado com Classroom há 2h",
		files: [
			{
				id: "ia-f1",
				name: "Slides - Arquitetura RAG e Busca Vetorial.pdf",
				meta: "3.1 MB · PDF",
				iconName: "file-text",
				badge: "novo",
				fileUrl: "https://classroom.google.com/c/ucsal-ia/m/rag-slides",
			},
		],
		insights: [
			{
				id: "ia-ins-01",
				summary:
					"Fundamentos de geração aumentada por recuperação (RAG) ancorada em fontes acadêmicas para mitigar alucinações.",
				coverageText: "Baseado em 1 de 1 material analisado",
				points: [
					"Indexação semântica por chunks com citação explícita de fonte",
					"Prevenção de cognitive offloading via perguntas socráticas antes do resumo",
				],
				sourceReference: "Slides RAG - Slide 11",
			},
		],
	},
	"class-projeto": {
		id: "class-projeto",
		subject: "Projeto Integrador",
		professor: "Prof. Renata Costa",
		schedule: "17:00 - 18:30",
		room: "Sala 510 · BL-D-510",
		topics: ["Metodologia DSR", "Avaliação SUS", "Entrega TCC"],
		syncedAgo: "Sincronizado com Classroom há 2h",
		files: [
			{
				id: "proj-f1",
				name: "Roteiro de Avaliação System Usability Scale (SUS).pdf",
				meta: "950 KB · PDF",
				iconName: "file-text",
				fileUrl: "https://classroom.google.com/c/ucsal-projeto/m/roteiro-sus",
			},
		],
		insights: [
			{
				id: "proj-ins-01",
				summary:
					"Critérios de validação empírica usando Design Science Research (DSR) e cálculo do escore SUS.",
				coverageText: "Baseado em 1 de 1 material analisado",
				points: [
					"Meta de usabilidade acima de 68 pontos na escala SUS",
					"Rastreabilidade entre requisitos funcionais e artefatos desenvolvidos",
				],
				sourceReference: "Roteiro SUS p. 03",
			},
		],
	},
	"class-ed-2026-1": {
		id: "class-ed-2026-1",
		subject: "Estrutura de Dados",
		professor: "Prof. Marcos Oliveira",
		schedule: "08:00 - 09:30",
		room: "Sala 204 · BL-A-204",
		topics: ["Árvores AVL", "Tabelas Hash", "Grafos"],
		syncedAgo: "Sincronizado com Classroom há 2h",
		files: [
			{
				id: "ed-f1",
				name: "Apostila de Árvores Balanceadas e Grafos.pdf",
				meta: "2.1 MB · PDF",
				iconName: "file-text",
				fileUrl: "https://classroom.google.com/c/ucsal-ed-2026-1/m/arvores",
			},
		],
		insights: [
			{
				id: "ed-ins-01",
				summary:
					"Complexidade assintótica de busca e balanceamento em árvores AVL e tabelas de dispersão.",
				coverageText: "Baseado em 1 de 1 material analisado",
				points: [
					"Rotações simples e duplas para manter fator de balanceamento entre -1 e 1",
					"Tratamento de colisões por encadeamento separado e endereçamento aberto",
				],
				sourceReference: "Apostila Árvores p. 12",
			},
		],
	},
	"class-arq-comp-2026-1": {
		id: "class-arq-comp-2026-1",
		subject: "Arquitetura de Computadores",
		professor: "Prof. Roberto Mendes",
		schedule: "10:00 - 11:30",
		room: "Lab 102 · BL-B-102",
		topics: ["Pipeline RISC", "Memória Cache", "Hierarquia de Memória"],
		syncedAgo: "Sincronizado com Classroom há 2h",
		files: [
			{
				id: "arq-f1",
				name: "Slides - Pipeline e Hierarquia de Memória Cache.pdf",
				meta: "1.6 MB · PDF",
				iconName: "file-text",
				fileUrl: "https://classroom.google.com/c/ucsal-arq-2026-1/m/pipeline",
			},
		],
		insights: [
			{
				id: "arq-ins-01",
				summary:
					"Análise de hazards de dados e controle em pipelines de 5 estágios e políticas de escrita em cache.",
				coverageText: "Baseado em 1 de 1 material analisado",
				points: [
					"Mitigação de data hazards via forwarding (bypassing) e bolhas no pipeline",
					"Comparativo entre Write-Through e Write-Back na localidade espacial e temporal",
				],
				sourceReference: "Slides Pipeline - Slide 08",
			},
		],
	},
};

function mapMaterialTypeToIcon(
	materialType: string,
): ClassroomFile["iconName"] {
	switch (materialType) {
		case "xlsx":
		case "assignment":
			return "file-spreadsheet";
		case "video":
			return "video";
		case "link":
			return "link";
		default:
			return "file-text";
	}
}

function mapRemoteCourseToDetails(
	course: TrpcSyncedCourse,
	existing?: AulaDetalhesData,
): AulaDetalhesData {
	const files: ClassroomFile[] =
		course.materials && course.materials.length > 0
			? course.materials
					.filter((m) => m.materialType !== "announcement")
					.map((m) => ({
						id: m.id,
						name: m.title,
						meta:
							m.materialType === "assignment"
								? "Atividade · Classroom"
								: `Classroom · ${m.materialType.toUpperCase()}`,
						iconName: mapMaterialTypeToIcon(m.materialType),
						badge: "novo" as const,
						fileUrl: m.fileUrl,
					}))
			: (existing?.files ?? AULA_DETALHES_MOCK.files);

	return {
		id: course.id,
		subject: course.subject,
		professor: course.professor,
		schedule: `${course.startTime} - ${course.endTime}`,
		room: course.room,
		topics:
			course.topics && course.topics.length > 0
				? course.topics
				: (existing?.topics ?? ["Classroom"]),
		syncedAgo: "Sincronizado com Classroom agora",
		files,
		insights: existing?.insights ?? AULA_DETALHES_MOCK.insights,
	};
}

export const classSessionsAtom = atom<ClassSession[]>(CLASS_SESSIONS);

export const selectedSemesterAtom = atom<string>("2026.2");

export const availableSemestersAtom = atom<string[]>((get) => {
	const sessions = get(classSessionsAtom);
	const unique = Array.from(
		new Set(sessions.map((s) => s.semester ?? "2026.2")),
	);
	return unique.sort((a, b) => b.localeCompare(a));
});

export const filteredClassSessionsAtom = atom<ClassSession[]>((get) => {
	const sessions = get(classSessionsAtom);
	const selectedSemester = get(selectedSemesterAtom);
	if (selectedSemester === "todos") {
		return sessions;
	}
	return sessions.filter((s) => (s.semester ?? "2026.2") === selectedSemester);
});

export const classDetailsMapAtom = atom<Record<string, AulaDetalhesData>>(
	INITIAL_CLASS_DETAILS_MAP,
);

export const classroomNotificationsAtom =
	atom<NotificationItem[]>(NOTIFICATIONS_MOCK);

export const syncStatusAtom = atom<ClassroomSyncStatus>("idle");

export const lastSyncedAtAtom = atom<string | null>(
	"Sincronizado com Classroom há 2h",
);

export const syncClassroomAtomAction = atom(null, async (get, set) => {
	set(syncStatusAtom, "syncing");
	try {
		const syncResult = await trpc.class.syncFromClassroom.mutate();

		if (syncResult?.courses && syncResult.courses.length > 0) {
			const mappedSessions: ClassSession[] = syncResult.courses.map((c) => ({
				id: c.id,
				semester: c.semester ?? "2026.2",
				startTime: c.startTime,
				endTime: c.endTime,
				subject: c.subject,
				professor: c.professor,
				room: c.room,
				difficulty: {
					level: c.difficultyLevel ?? "medio",
					score: Number(c.difficultyScore ?? 3.5),
					reviewCount: c.difficultyReviewCount ?? 10,
				},
			}));
			set(classSessionsAtom, mappedSessions);

			const currentSelected = get(selectedSemesterAtom);
			const available = get(availableSemestersAtom);
			if (
				currentSelected !== "todos" &&
				!available.includes(currentSelected)
			) {
				set(selectedSemesterAtom, available[0] ?? "2026.2");
			}

			const currentMap = { ...get(classDetailsMapAtom) };
			for (const course of syncResult.courses) {
				currentMap[course.id] = mapRemoteCourseToDetails(
					course,
					currentMap[course.id],
				);
			}
			set(classDetailsMapAtom, currentMap);
		} else {
			const currentMap = get(classDetailsMapAtom);
			const updatedMap: Record<string, AulaDetalhesData> = {};
			for (const [key, value] of Object.entries(currentMap)) {
				updatedMap[key] = {
					...value,
					syncedAgo: "Sincronizado com Classroom agora",
				};
			}
			set(classDetailsMapAtom, updatedMap);
		}

		const remoteNotifications = await trpc.class.notifications.query();
		if (Array.isArray(remoteNotifications) && remoteNotifications.length > 0) {
			set(classroomNotificationsAtom, remoteNotifications);
		}

		set(lastSyncedAtAtom, "Sincronizado com Classroom agora");
		set(syncStatusAtom, "synced");
	} catch {
		set(syncStatusAtom, "error");
	}
});

export const updateClassScheduleAtomAction = atom(
	null,
	async (
		get,
		set,
		input: { id: string; startTime: string; endTime: string; room: string },
	) => {
		const { id, startTime, endTime, room } = input;
		const targetSessionId = id === "aula-eng-soft-04" ? "class-eng-sw" : id;

		const updatedSessions = get(classSessionsAtom).map((session) =>
			session.id === id || session.id === targetSessionId
				? { ...session, startTime, endTime, room }
				: session,
		);
		set(classSessionsAtom, updatedSessions);

		const currentMap = { ...get(classDetailsMapAtom) };
		const keysToUpdate =
			id === "aula-eng-soft-04" || id === "class-eng-sw"
				? ["aula-eng-soft-04", "class-eng-sw"]
				: [id];

		for (const key of keysToUpdate) {
			if (currentMap[key]) {
				currentMap[key] = {
					...currentMap[key],
					schedule: `${startTime} - ${endTime}`,
					room,
				};
			}
		}
		set(classDetailsMapAtom, currentMap);

		await trpc.class.updateSchedule.mutate({
			id,
			startTime,
			endTime,
			room,
		});
	},
);
