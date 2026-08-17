import { MapPin } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { DifficultyTag } from "@/components/molecules/DifficultyTag";
import type { ClassSession } from "@/features/aulas/aulas.model";

export type ClassCardProps = {
	session: ClassSession;
	onPress?: () => void;
};

export function ClassCard({ session, onPress }: ClassCardProps) {
	return (
		<Pressable
			onPress={onPress}
			className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-4"
		>
			<View className="items-center gap-0.5">
				<AppText variant="mono" tone="accent" className="font-bold text-base">
					{session.startTime}
				</AppText>
				<AppText variant="mono" tone="muted" className="text-[11px]">
					{session.endTime}
				</AppText>
			</View>
			<View className="h-12 w-0.5 rounded-full bg-accent-primary" />
			<View className="flex-1 gap-0.5">
				<AppText
					variant="body"
					tone="primary"
					className="font-semibold text-sm"
				>
					{session.subject}
				</AppText>
				<AppText variant="body" tone="secondary" className="text-xs">
					{session.professor}
				</AppText>
				<View className="flex-row items-center gap-1.5">
					<MapPin size={12} color="#A1A1AA" />
					<AppText variant="body" tone="muted" className="text-xs">
						{session.room}
					</AppText>
				</View>
				<DifficultyTag {...session.difficulty} />
			</View>
		</Pressable>
	);
}
