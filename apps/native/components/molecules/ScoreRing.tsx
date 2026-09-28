import { View } from "react-native";
import { AppText } from "@/components/atoms/AppText";

export function ScoreRing({
	correct,
	total,
}: {
	correct: number;
	total: number;
}) {
	return (
		<View className="h-[140px] w-[140px] items-center justify-center rounded-full bg-accent-primary">
			<View className="h-[112px] w-[112px] items-center justify-center rounded-full bg-surface-primary">
				<AppText
					variant="mono"
					tone="primary"
					className="font-bold text-[32px]"
				>
					{correct}/{total}
				</AppText>
				<AppText variant="caption" tone="muted" className="text-[11px]">
					acertos
				</AppText>
			</View>
		</View>
	);
}
