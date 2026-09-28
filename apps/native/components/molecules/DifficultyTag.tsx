import { Flame, Gauge } from "lucide-react-native";
import { Chip } from "@/components/atoms/Chip";

export type DifficultyLevel = "facil" | "medio" | "dificil";

const LABEL: Record<DifficultyLevel, string> = {
	facil: "Fácil",
	medio: "Médio",
	dificil: "Difícil",
};

const TONE: Record<DifficultyLevel, "success" | "warning" | "danger"> = {
	facil: "success",
	medio: "warning",
	dificil: "danger",
};

const ICON_COLOR: Record<DifficultyLevel, string> = {
	facil: "#10B981",
	medio: "#F59E0B",
	dificil: "#EF4444",
};

export type DifficultyTagProps = {
	level: DifficultyLevel;
	score: number;
	reviewCount: number;
};

export function DifficultyTag({ level, score, reviewCount }: DifficultyTagProps) {
	const Icon = level === "dificil" ? Flame : Gauge;
	return (
		<Chip
			label={`${LABEL[level]} · ${score.toFixed(1)}/5 (${reviewCount} avaliações)`}
			tone={TONE[level]}
			icon={<Icon size={11} color={ICON_COLOR[level]} />}
		/>
	);
}
