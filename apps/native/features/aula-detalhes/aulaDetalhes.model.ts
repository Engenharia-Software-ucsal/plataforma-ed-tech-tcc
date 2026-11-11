export type ClassroomFile = {
	id: string;
	name: string;
	meta: string;
	iconName: "file-text" | "file-spreadsheet" | "video" | "link";
	badge?: "novo" | "lido";
	fileUrl?: string;
	/** Tipo do material no Classroom (só quando vem do servidor), ex.: "pdf". */
	materialType?: string;
};

export type InsightItem = {
	id: string;
	summary: string;
	coverageText: string;
	points: string[];
	sourceReference: string;
};

export type AulaDetalhesData = {
	id: string;
	subject: string;
	professor: string;
	schedule: string;
	room: string;
	topics: string[];
	syncedAgo: string;
	files: ClassroomFile[];
	insights: InsightItem[];
};

export const AULA_DETALHES_MOCK: AulaDetalhesData = {
	id: "aula-eng-soft-04",
	subject: "Engenharia de Software",
	professor: "Prof. Ana Silva",
	schedule: "08:00 - 09:30",
	room: "Sala 302 · Bloco A",
	topics: ["SOLID", "Microsserviços", "Circuit Breaker"],
	syncedAgo: "Sincronizado com Classroom há 2h",
	files: [
		{
			id: "f1",
			name: "Slides - Aula 04.pdf",
			meta: "2.4 MB · PDF",
			iconName: "file-text",
			badge: "novo",
			fileUrl: "https://classroom.google.com/c/ucsal-eng-sw/m/slides-aula-04",
		},
		{
			id: "f2",
			name: "Lista de Exercícios.xlsx",
			meta: "180 KB · Planilha",
			iconName: "file-spreadsheet",
			fileUrl: "https://classroom.google.com/c/ucsal-eng-sw/a/lista-exercicios",
		},
		{
			id: "f3",
			name: "Gravação da Aula.mp4",
			meta: "320 MB · Vídeo",
			iconName: "video",
			badge: "novo",
			fileUrl: "https://classroom.google.com/c/ucsal-eng-sw/m/gravacao-aula-04",
		},
		{
			id: "f4",
			name: "Repositório do Projeto",
			meta: "github.com/ucsal",
			iconName: "link",
			fileUrl: "https://github.com/ucsal",
		},
	],
	insights: [
		{
			id: "ins-01",
			summary:
				"IA analisou os slides e a gravação enviados pelo professor no Classroom e extraiu os pontos abaixo.",
			coverageText: "Baseado em 2 de 4 materiais analisados",
			points: [
				"Princípios SOLID aplicados a microsserviços, extraídos dos slides",
				"Padrão Circuit Breaker citado nos slides (pág. 14)",
				"3 exercícios recomendados com base na Lista de Exercícios.xlsx",
			],
			sourceReference: "Slide 08 - Arquitetura de Software",
		},
		{
			id: "ins-02",
			summary:
				"Conceitos de resiliência e isolamento de falhas para sistemas distribuídos de alta disponibilidade.",
			coverageText: "Baseado na apostila complementar",
			points: [
				"Padrão Bulkhead para evitar cascata de falhas em microsserviços",
				"Políticas de Retry com jitter e exponenciação para recuperação graciosa",
			],
			sourceReference: "Apostila p. 12",
		},
	],
};
