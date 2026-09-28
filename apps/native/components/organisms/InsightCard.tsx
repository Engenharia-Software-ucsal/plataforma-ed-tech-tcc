import { Brain, CircleCheckBig, Sparkles } from "lucide-react-native";
import { View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";

export type InsightCardProps = {
	summary: string;
	coverageText: string;
	points: string[];
	onGenerateQuiz: () => void;
};

export function InsightCard({ summary, coverageText, points, onGenerateQuiz }: InsightCardProps) {
	return (
		<View className="gap-3 rounded-lg-card border border-accent-primary bg-accent-light p-[18px]">
			<View className="flex-row items-center gap-2">
				<Sparkles size={16} color="#BF40FF" />
				<AppText variant="heading" tone="primary" className="font-bold text-sm">
					Insights dos materiais
				</AppText>
			</View>
			<AppText variant="caption" tone="muted" className="text-[11px]">
				{coverageText}
			</AppText>
			<AppText variant="body" tone="secondary" className="text-[13px]">
				{summary}
			</AppText>
			<View className="gap-1.5">
				{points.map((point) => (
					<View key={point} className="flex-row items-start gap-2">
						<CircleCheckBig size={14} color="#582CFF" />
						<AppText variant="body" tone="secondary" className="flex-1 text-xs">
							{point}
						</AppText>
					</View>
				))}
			</View>
			<AppButton
				label="Gerar quiz de revisão"
				onPress={onGenerateQuiz}
				icon={<Brain size={14} color="#FFFFFF" />}
			/>
		</View>
	);
}
