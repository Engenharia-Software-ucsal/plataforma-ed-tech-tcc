export type NotificationIconName =
	| "navigation"
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
		iconName: "navigation",
		iconTone: "accent",
		title: "Ônibus a 5 min",
		description: "Chegando no ponto UCSAL",
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
		title: "Ônibus atrasado",
		description: "Linha UCSAL → Pituaçu, 08:30 com atraso de 5 min",
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
