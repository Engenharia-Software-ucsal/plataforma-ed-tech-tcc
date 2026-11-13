import {
	extractWikilinkTargets,
	markdownPreview,
	titleKey,
} from "@busuucsal-v3/notes";

export type LinkType = "manual" | "ai_suggested" | "wikilink";

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
	/** Nulo nos vínculos `wikilink`, que vêm do texto. */
	reason: string | null;
	similarityScore?: string | number | null;
	createdAt: string;
	targetNote?: NoteLinkSummary;
	sourceNote?: NoteLinkSummary;
}

export interface NoteFolder {
	id: string;
	/** Nulo = raiz. */
	parentId: string | null;
	name: string;
	position: number;
	createdAt?: string;
	updatedAt?: string;
}

/** Nota como aparece na árvore e nas listas (sem o texto completo). */
export interface NoteSummary {
	id: string;
	title: string;
	folderId: string | null;
	position: number;
	/** Tags do aluno. */
	tags: string[];
	/** Tags do sistema (matéria da aula vinculada), não removíveis. */
	autoTags: string[];
	classSessionId: string | null;
	preview: string;
	linkCount: number;
	createdAt: string;
	updatedAt: string;
}

/** Cada `[[link]]` distinto do texto e a nota que ele resolve (ou null). */
export interface ResolvedWikilink {
	title: string;
	noteId: string | null;
}

export interface Note extends NoteSummary {
	content: string;
	outboundLinks: NoteLink[];
	inboundLinks: NoteLink[];
	wikilinks: ResolvedWikilink[];
}

export interface NotesTree {
	folders: NoteFolder[];
	notes: NoteSummary[];
}

export type TrashItemType = "note" | "folder";

export interface TrashItem {
	id: string;
	type: TrashItemType;
	name: string;
	deletedAt: string;
	daysLeft: number;
	/** Pastas: quantos itens saíram junto. */
	itemCount: number;
}

export interface AiSuggestedLink {
	targetNoteId: string;
	targetNoteTitle: string;
	reason: string;
	similarityScore: string;
	linkType: "ai_suggested";
}

/** Tags exibidas: as do aluno e as automáticas (com `#`). */
export function displayTags(
	note: Pick<NoteSummary, "tags" | "autoTags">,
): string[] {
	return [...note.autoTags.map((tag) => `#${tag}`), ...note.tags];
}

export function toNoteSummary(note: Note): NoteSummary {
	const {
		content: _content,
		outboundLinks,
		inboundLinks,
		wikilinks: _wikilinks,
		...summary
	} = note;
	const linked = new Set<string>();
	for (const link of outboundLinks) linked.add(link.targetNoteId);
	for (const link of inboundLinks) linked.add(link.sourceNoteId);
	return { ...summary, linkCount: Math.max(summary.linkCount, linked.size) };
}

/** Resolve os `[[links]]` do texto contra os títulos conhecidos. */
export function resolveWikilinks(
	content: string,
	notes: Array<Pick<NoteSummary, "id" | "title">>,
): ResolvedWikilink[] {
	const byKey = new Map(notes.map((note) => [titleKey(note.title), note.id]));
	return extractWikilinkTargets(content).map((title) => ({
		title,
		noteId: byKey.get(titleKey(title)) ?? null,
	}));
}

// ---------------------------------------------------------------------------
// Dados de exemplo: usados nos testes e quando o app roda sem servidor
// (mesmo comportamento das outras telas, ver utils/trpc.ts).
// ---------------------------------------------------------------------------

export const MOCK_FOLDERS: NoteFolder[] = [
	{
		id: "folder-arq",
		parentId: null,
		name: "Arquitetura de Software",
		position: 0,
	},
	{ id: "folder-bd", parentId: null, name: "Banco de Dados", position: 1 },
	{ id: "folder-solid", parentId: "folder-arq", name: "SOLID", position: 0 },
];

type MockNote = Omit<Note, "preview" | "linkCount" | "wikilinks">;

const RAW_NOTES: MockNote[] = [
	{
		id: "note-1",
		title: "Arquitetura Hexagonal (Ports and Adapters)",
		folderId: "folder-arq",
		position: 0,
		classSessionId: "class-eng-sw",
		autoTags: ["engenharia-de-software"],
		content:
			"A arquitetura hexagonal visa isolar a lógica de domínio central das tecnologias externas (bancos de dados, UI, APIs de terceiros).\n\nPara viabilizar este desacoplamento, ela utiliza intensamente o princípio de [[Inversão de Dependência (DIP)]], fazendo com que as bordas da aplicação implementem **portas e adaptadores** definidos pelo core do sistema. Também se alinha diretamente com os preceitos de [[Clean Architecture]].\n\n## Pendências\n- [x] Ler o artigo original\n- [ ] Comparar com [[Arquitetura em Camadas]]",
		tags: ["Arquitetura", "Design"],
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
					tags: ["SOLID", "Design"],
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
				linkType: "wikilink",
				reason: null,
				similarityScore: "1.00",
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
		folderId: "folder-solid",
		position: 0,
		classSessionId: null,
		autoTags: [],
		content:
			"Módulos de alto nível não devem depender de módulos de baixo nível. Ambos devem depender de abstrações.\n\nAbstrações não devem depender de detalhes; detalhes devem depender de abstrações. É a base para a inversão de controle empregada em [[Arquitetura Hexagonal (Ports and Adapters)]].",
		tags: ["SOLID", "Design"],
		createdAt: "2026-10-20T11:00:00.000Z",
		updatedAt: "2026-10-21T11:00:00.000Z",
		outboundLinks: [
			{
				id: "link-3",
				sourceNoteId: "note-2",
				targetNoteId: "note-1",
				linkType: "wikilink",
				reason: null,
				similarityScore: "1.00",
				createdAt: "2026-10-21T11:00:00.000Z",
				targetNote: {
					id: "note-1",
					title: "Arquitetura Hexagonal (Ports and Adapters)",
					tags: ["Arquitetura", "Design"],
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
					tags: ["Arquitetura", "Design"],
					createdAt: "2026-10-20T10:00:00.000Z",
				},
			},
		],
	},
	{
		id: "note-3",
		title: "Clean Architecture",
		folderId: "folder-arq",
		position: 1,
		classSessionId: null,
		autoTags: [],
		content:
			"A arquitetura proposta por Robert C. Martin enfatiza a *Regra da Dependência*: as dependências no código-fonte devem apontar sempre para dentro, em direção às entidades e casos de uso.\n\n> Possui grande convergência conceitual com [[Arquitetura Hexagonal (Ports and Adapters)]].",
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
					tags: ["Arquitetura", "Design"],
					createdAt: "2026-10-20T10:00:00.000Z",
				},
			},
		],
	},
	{
		id: "note-4",
		title: "Normalização de Banco de Dados",
		folderId: null,
		position: 0,
		classSessionId: "class-bd2",
		autoTags: ["banco-de-dados-ii"],
		content:
			"Processo formal para estruturar esquemas relacionais minimizando redundâncias e prevenindo anomalias de atualização (1FN, 2FN, 3FN e BCNF).\n\n```sql\nSELECT * FROM alunos WHERE id = 1;\n```",
		tags: ["Banco de Dados"],
		createdAt: "2026-10-19T09:00:00.000Z",
		updatedAt: "2026-10-19T09:00:00.000Z",
		outboundLinks: [],
		inboundLinks: [],
	},
];

export const INITIAL_NOTES_MOCK: Note[] = RAW_NOTES.map((note) => ({
	...note,
	preview: markdownPreview(note.content),
	linkCount: 0,
	wikilinks: resolveWikilinks(note.content, RAW_NOTES),
})).map((note) => ({ ...note, linkCount: toNoteSummary(note).linkCount }));

export const MOCK_NOTES_TREE: NotesTree = {
	folders: MOCK_FOLDERS,
	notes: INITIAL_NOTES_MOCK.map(toNoteSummary),
};

export const MOCK_TRASH: TrashItem[] = [
	{
		id: "trash-folder-1",
		type: "folder",
		name: "Semestre 2026.1",
		deletedAt: "2026-11-05T12:00:00.000Z",
		daysLeft: 27,
		itemCount: 3,
	},
	{
		id: "trash-note-1",
		type: "note",
		name: "Rascunho de TCC",
		deletedAt: "2026-11-01T12:00:00.000Z",
		daysLeft: 23,
		itemCount: 0,
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
