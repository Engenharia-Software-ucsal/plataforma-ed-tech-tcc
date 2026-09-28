import { CircleCheckBig, CircleX } from "lucide-react-native";
import { View } from "react-native";
import { AppText } from "@/components/atoms/AppText";

export function TopicResultRow({ label, correct }: { label: string; correct: boolean }) {
	return (
		<View className="flex-row items-center gap-2">
			{correct ? (
				<CircleCheckBig size={15} color="#10B981" />
			) : (
				<CircleX size={15} color="#EF4444" />
			)}
			<AppText variant="body" tone="secondary" className="text-xs">
				{label}
			</AppText>
		</View>
	);
}
