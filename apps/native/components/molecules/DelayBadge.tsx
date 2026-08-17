import { TriangleAlert } from "lucide-react-native";
import { Chip } from "@/components/atoms/Chip";

export function DelayBadge({ minutes }: { minutes: number }) {
	if (minutes <= 0) {
		return null;
	}
	return (
		<Chip
			label={`Atrasado ${minutes} min`}
			tone="warning"
			icon={<TriangleAlert size={11} color="#F59E0B" />}
		/>
	);
}
