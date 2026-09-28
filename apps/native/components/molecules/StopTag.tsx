import { GraduationCap, TrainFront } from "lucide-react-native";
import { Chip } from "@/components/atoms/Chip";

export type StopTagProps = { stop: "UCSAL" | "PITUACU" };

export function StopTag({ stop }: StopTagProps) {
	if (stop === "UCSAL") {
		return (
			<Chip label="UCSAL" tone="accent" icon={<GraduationCap size={11} color="#582CFF" />} />
		);
	}
	return (
		<Chip label="Est. Pituaçu" tone="accent" icon={<TrainFront size={11} color="#00F2FF" />} />
	);
}
