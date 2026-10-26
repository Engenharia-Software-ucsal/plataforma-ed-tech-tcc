export type LinkType = "manual" | "ai_suggested";

export interface NoteLinkSummary {
	id: string;
	title: string;
	tags?: string[];
	createdAt?: string;
}

export interface NoteLink {
	id: string;
	sourceNoteId: string;
	targetNoteId: string;
	linkType: LinkType;
	reason: string;
	similarityScore?: string | number;
	createdAt: string;
	targetNote?: NoteLinkSummary;
	sourceNote?: NoteLinkSummary;
}

export interface Note {
	id: string;
	userId?: string;
	title: string;
	content: string;
	tags: string[];
	classSessionId?: string | null;
	createdAt: string;
	updatedAt: string;
	outboundLinks: NoteLink[];
	inboundLinks: NoteLink[];
}

export interface AiSuggestedLink {
	targetNoteId: string;
	targetNoteTitle: string;
	reason: string;
	similarityScore: string;
	linkType: "ai_suggested";
}

export const INITIAL_NOTES_MOCK: Note[] = [
	{
		id: "note-1",
		title: "Arquitetura Hexagonal (Ports and Adapters)",
		content:
			"A arquitetura hexagonal visa isolar a lógica de domínio central das tecnologias externas (bancos de dados, UI, APIs de terceiros).\n\nPara viabilizar este desacoplamento, ela utiliza intensamente o princípio de [[Inversão de Dependência (DIP)]], fazendo com que as bordas da aplicação implementem portas e adaptadores definidos pelo core do sistema. Também se alinha diretamente com os preceitos de [[Clean Architecture]].",
		tags: ["Arquitetura", "Engenharia de Software", "Design"],
		createdAt: "2026-10-20T10:00:00.000Z",
		updatedAt: "2026-10-21T14:30:00.000Z",
		outboundLinks: [
			{
				id: "link-1",
				sourceNoteId: "note-1",
				targetNoteId: "note-2",
				linkType: "manual",
				reason:
					"DIP é o princípio fundamental que viabiliza os adaptadores da Arquitetura Hexagonal.",
				similarityScore: "0.92",
				createdAt: "2026-10-21T10:00:00.000Z",
				targetNote: {
					id: "note-2",
					title: "Inversão de Dependência (DIP)",
					tags: ["SOLID", "Design", "Engenharia de Software"],
					createdAt: "2026-10-20T11:00:00.000Z",
				},
			},
			{
				id: "link-2",
				sourceNoteId: "note-1",
				targetNoteId: "note-3",
				linkType: "ai_suggested",
				reason:
					"Ambas as abordagens compartilham o objetivo de independência de frameworks e isolamento do domínio.",
				similarityScore: "0.88",
				createdAt: "2026-10-21T12:00:00.000Z",
				targetNote: {
					id: "note-3",
					title: "Clean Architecture",
					tags: ["Arquitetura", "Design"],
					createdAt: "2026-10-20T12:00:00.000Z",
				},
			},
		],
		inboundLinks: [
			{
				id: "link-3",
				sourceNoteId: "note-2",
				targetNoteId: "note-1",
				linkType: "manual",
				reason:
					"Exemplo prático de aplicação de DIP em arquitetura de microsserviços.",
				similarityScore: "0.90",
				createdAt: "2026-10-21T11:00:00.000Z",
				sourceNote: {
					id: "note-2",
					title: "Inversão de Dependência (DIP)",
					tags: ["SOLID", "Design"],
					createdAt: "2026-10-20T11:00:00.000Z",
				},
			},
		],
	},
	{
		id: "note-2",
		title: "Inversão de Dependência (DIP)",
		content:
			"Módulos de alto nível não devem depender de módulos de baixo nível. Ambos devem depender de abstrações.\n\nAbstrações não devem depender de detalhes; detalhes devem depender de abstrações. É a base para a inversão de controle empregada em [[Arquitetura Hexagonal (Ports and Adapters)]].",
		tags: ["SOLID", "Design", "Engenharia de Software"],
		createdAt: "2026-10-20T11:00:00.000Z",
		updatedAt: "2026-10-21T11:00:00.000Z",
		outboundLinks: [
			{
				id: "link-3",
				sourceNoteId: "note-2",
				targetNoteId: "note-1",
				linkType: "manual",
				reason:
					"Exemplo prático de aplicação de DIP em arquitetura de microsserviços.",
				similarityScore: "0.90",
				createdAt: "2026-10-21T11:00:00.000Z",
				targetNote: {
					id: "note-1",
					title: "Arquitetura Hexagonal (Ports and Adapters)",
					tags: ["Arquitetura", "Engenharia de Software"],
					createdAt: "2026-10-20T10:00:00.000Z",
				},
			},
		],
		inboundLinks: [
			{
				id: "link-1",
				sourceNoteId: "note-1",
				targetNoteId: "note-2",
				linkType: "manual",
				reason:
					"DIP é o princípio fundamental que viabiliza os adaptadores da Arquitetura Hexagonal.",
				similarityScore: "0.92",
				createdAt: "2026-10-21T10:00:00.000Z",
				sourceNote: {
					id: "note-1",
					title: "Arquitetura Hexagonal (Ports and Adapters)",
					tags: ["Arquitetura", "Engenharia de Software"],
					createdAt: "2026-10-20T10:00:00.000Z",
				},
			},
		],
	},
	{
		id: "note-3",
		title: "Clean Architecture",
		content:
			"A arquitetura proposta por Robert C. Martin enfatiza a Regra da Dependência: as dependências no código-fonte devem apontar sempre para dentro, em direção às entidades e casos de uso.\n\nPossui grande convergência conceitual com [[Arquitetura Hexagonal (Ports and Adapters)]].",
		tags: ["Arquitetura", "Design"],
		createdAt: "2026-10-20T12:00:00.000Z",
		updatedAt: "2026-10-21T13:00:00.000Z",
		outboundLinks: [],
		inboundLinks: [
			{
				id: "link-2",
				sourceNoteId: "note-1",
				targetNoteId: "note-3",
				linkType: "ai_suggested",
				reason:
					"Ambas as abordagens compartilham o objetivo de independência de frameworks e isolamento do domínio.",
				similarityScore: "0.88",
				createdAt: "2026-10-21T12:00:00.000Z",
				sourceNote: {
					id: "note-1",
					title: "Arquitetura Hexagonal (Ports and Adapters)",
					tags: ["Arquitetura", "Engenharia de Software"],
					createdAt: "2026-10-20T10:00:00.000Z",
				},
			},
		],
	},
	{
		id: "note-4",
		title: "Normalização de Banco de Dados",
		content:
			"Processo formal para estruturar esquemas relacionais minimizando redundâncias e prevenindo anomalias de atualização (1FN, 2FN, 3FN e BCNF).",
		tags: ["Banco de Dados", "Engenharia de Software"],
		createdAt: "2026-10-19T09:00:00.000Z",
		updatedAt: "2026-10-19T09:00:00.000Z",
		outboundLinks: [],
		inboundLinks: [],
	},
];

export const INITIAL_AI_SUGGESTIONS_MAP: Record<string, AiSuggestedLink[]> = {
	"note-1": [
		{
			targetNoteId: "note-4",
			targetNoteTitle: "Normalização de Banco de Dados",
			reason:
				"Entidades ricas do domínio na Arquitetura Hexagonal precisam de adaptadores de persistência que mapeiem dados para esquemas relacionais normalizados.",
			similarityScore: "0.78",
			linkType: "ai_suggested",
		},
	],
	"note-2": [
		{
			targetNoteId: "note-3",
			targetNoteTitle: "Clean Architecture",
			reason:
				"A regra de dependência da Clean Architecture é viabilizada diretamente pelo princípio DIP na fronteira dos controladores e gateways.",
			similarityScore: "0.89",
			linkType: "ai_suggested",
		},
	],
	"note-3": [
		{
			targetNoteId: "note-2",
			targetNoteTitle: "Inversão de Dependência (DIP)",
			reason:
				"Clean Architecture exige que Use Cases definam interfaces para Gateways, invertendo o fluxo de dependência contra detalhes de infraestrutura.",
			similarityScore: "0.91",
			linkType: "ai_suggested",
		},
	],
	"note-4": [
		{
			targetNoteId: "note-1",
			targetNoteTitle: "Arquitetura Hexagonal (Ports and Adapters)",
			reason:
				"Repositórios e adaptadores de banco de dados lidam com esquemas relacionais normalizados mantendo o core livre de SQL.",
			similarityScore: "0.75",
			linkType: "ai_suggested",
		},
	],
};
