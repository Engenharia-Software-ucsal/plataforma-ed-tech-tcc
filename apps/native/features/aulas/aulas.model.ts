import type { DifficultyLevel } from "@/components/molecules/DifficultyTag";

export type ClassDifficulty = {
	level: DifficultyLevel;
	score: number;
	reviewCount: number;
};

export type ClassSession = {
	id: string;
	semester?: string;
	startTime: string;
	endTime: string;
	subject: string;
	professor: string;
	room: string;
	difficulty: ClassDifficulty;
};

export const CLASS_SESSIONS: ClassSession[] = [
	{
		id: "class-eng-sw",
		semester: "2026.2",
		startTime: "08:00",
		endTime: "09:30",
		subject: "Engenharia de Software",
		professor: "Prof. Ana Silva",
		room: "Sala 302 · BL-A-302",
		difficulty: { level: "dificil", score: 4.3, reviewCount: 142 },
	},
	{
		id: "class-bd2",
		semester: "2026.2",
		startTime: "10:00",
		endTime: "11:30",
		subject: "Banco de Dados II",
		professor: "Prof. Carlos Melo",
		room: "Sala 415 · BL-B-415",
		difficulty: { level: "dificil", score: 4.6, reviewCount: 97 },
	},
	{
		id: "class-redes",
		semester: "2026.2",
		startTime: "13:00",
		endTime: "14:30",
		subject: "Redes de Computadores",
		professor: "Prof. Maria Santos",
		room: "Lab 201 · BL-C-201",
		difficulty: { level: "medio", score: 3.1, reviewCount: 64 },
	},
	{
		id: "class-ia",
		semester: "2026.2",
		startTime: "15:00",
		endTime: "16:30",
		subject: "Inteligência Artificial",
		professor: "Prof. João Lima",
		room: "Sala 108 · BL-A-108",
		difficulty: { level: "dificil", score: 4.1, reviewCount: 110 },
	},
	{
		id: "class-projeto",
		semester: "2026.2",
		startTime: "17:00",
		endTime: "18:30",
		subject: "Projeto Integrador",
		professor: "Prof. Renata Costa",
		room: "Sala 510 · BL-D-510",
		difficulty: { level: "facil", score: 2.0, reviewCount: 38 },
	},
	{
		id: "class-ed-2026-1",
		semester: "2026.1",
		startTime: "08:00",
		endTime: "09:30",
		subject: "Estrutura de Dados",
		professor: "Prof. Marcos Oliveira",
		room: "Sala 204 · BL-A-204",
		difficulty: { level: "medio", score: 3.6, reviewCount: 84 },
	},
	{
		id: "class-arq-comp-2026-1",
		semester: "2026.1",
		startTime: "10:00",
		endTime: "11:30",
		subject: "Arquitetura de Computadores",
		professor: "Prof. Roberto Mendes",
		room: "Lab 102 · BL-B-102",
		difficulty: { level: "medio", score: 3.4, reviewCount: 72 },
	},
];
