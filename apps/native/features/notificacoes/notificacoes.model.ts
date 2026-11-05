export type NotificationIconName =
	| "sparkles"
	| "triangle-alert"
	| "graduation-cap"
	| "gauge";

export type NotificationItem = {
	id: string;
	iconName: NotificationIconName;
	iconTone: "accent" | "warning" | "danger";
	title: string;
	description: string;
	timeAgo: string;
	read: boolean;
};

export const NOTIFICATIONS_MOCK: NotificationItem[] = [
	{
		id: "n1",
		iconName: "graduation-cap",
		iconTone: "accent",
		title: "Novo aviso no Classroom",
		description: "Prof. Ana Silva publicou aviso sobre a entrega da Sprint 2",
		timeAgo: "agora",
		read: false,
	},
	{
		id: "n2",
		iconName: "sparkles",
		iconTone: "accent",
		title: "Insight pronto",
		description: "IA analisou os slides de Eng. de Software",
		timeAgo: "10 min",
		read: false,
	},
	{
		id: "n3",
		iconName: "triangle-alert",
		iconTone: "warning",
		title: "Nova atividade no Classroom",
		description:
			"Lista Prática de Normalização 3FN postada em Banco de Dados II",
		timeAgo: "1h",
		read: true,
	},
	{
		id: "n4",
		iconName: "graduation-cap",
		iconTone: "accent",
		title: "Novo material",
		description: "Prof. Ana Silva enviou Slides - Aula 04.pdf",
		timeAgo: "2h",
		read: true,
	},
	{
		id: "n5",
		iconName: "gauge",
		iconTone: "danger",
		title: "Aula marcada como difícil",
		description: "Banco de Dados II recebeu novas avaliações",
		timeAgo: "1d",
		read: true,
	},
];
