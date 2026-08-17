export type ClassroomFile = {
	id: string;
	name: string;
	meta: string;
	iconName: "file-text" | "file-spreadsheet" | "video" | "link";
	badge?: "novo" | "lido";
};

export type AulaDetalhesData = {
	subject: string;
	professor: string;
	schedule: string;
	room: string;
	topics: string[];
	syncedAgo: string;
	files: ClassroomFile[];
	insightSummary: string;
	insightCoverage: string;
	insightPoints: string[];
};

export const AULA_DETALHES_MOCK: AulaDetalhesData = {
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
		},
		{
			id: "f2",
			name: "Lista de Exercícios.xlsx",
			meta: "180 KB · Planilha",
			iconName: "file-spreadsheet",
		},
		{
			id: "f3",
			name: "Gravação da Aula.mp4",
			meta: "320 MB · Vídeo",
			iconName: "video",
			badge: "novo",
		},
		{
			id: "f4",
			name: "Repositório do Projeto",
			meta: "github.com/ucsal",
			iconName: "link",
		},
	],
	insightSummary:
		"IA analisou os slides e a gravação enviados pelo professor no Classroom e extraiu os pontos abaixo.",
	insightCoverage: "Baseado em 2 de 4 materiais analisados",
	insightPoints: [
		"Princípios SOLID aplicados a microsserviços, extraídos dos slides",
		"Padrão Circuit Breaker citado nos slides (pág. 14)",
		"3 exercícios recomendados com base na Lista de Exercícios.xlsx",
	],
};
