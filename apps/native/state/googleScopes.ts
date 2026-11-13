/**
 * Permissões que o app pede ao Google. Todas são somente leitura.
 * Usadas no login (`state/auth.ts`) e na tela de Perfil, para que o que o
 * aluno lê lá seja exatamente o que foi pedido.
 */
export type GoogleScope = {
	url: string;
	/** Nome em linguagem simples, mostrado ao aluno. */
	label: string;
	/** Nome técnico curto, mostrado em letra pequena. */
	technicalName: string;
};

const BASE = "https://www.googleapis.com/auth/";

export const GOOGLE_SCOPES: GoogleScope[] = [
	{
		url: `${BASE}classroom.courses.readonly`,
		label: "Suas turmas",
		technicalName: "classroom.courses.readonly",
	},
	{
		url: `${BASE}classroom.courseworkmaterials.readonly`,
		label: "Materiais das aulas",
		technicalName: "courseworkmaterials.readonly",
	},
	{
		url: `${BASE}classroom.coursework.me.readonly`,
		label: "Suas atividades",
		technicalName: "coursework.me.readonly",
	},
	{
		url: `${BASE}classroom.announcements.readonly`,
		label: "Avisos",
		technicalName: "announcements.readonly",
	},
	{
		url: `${BASE}classroom.topics.readonly`,
		label: "Tópicos",
		technicalName: "topics.readonly",
	},
	{
		url: `${BASE}drive.readonly`,
		label: "PDFs do Drive",
		technicalName: "drive.readonly",
	},
];
