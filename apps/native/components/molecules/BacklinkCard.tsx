import { Link2, Sparkles, Trash2 } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";

export type BacklinkCardProps = {
	title: string;
	linkType: "manual" | "ai_suggested";
	reason: string;
	similarityScore?: string | number;
	onPress?: () => void;
	onDelete?: () => void;
	testID?: string;
};

export function BacklinkCard({
	title,
	linkType,
	reason,
	similarityScore,
	onPress,
	onDelete,
	testID,
}: BacklinkCardProps) {
	const isAi = linkType === "ai_suggested";

	return (
		<View
			testID={testID}
			className="gap-2.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
		>
			<View className="flex-row items-center justify-between">
				<Pressable
					onPress={onPress}
					className="flex-1 flex-row items-center gap-2"
					testID={testID ? `${testID}-title-btn` : undefined}
				>
					<View className="h-7 w-7 items-center justify-center rounded-sm-card bg-accent-light">
						{isAi ? (
							<Sparkles size={14} color="#BF40FF" />
						) : (
							<Link2 size={14} color="#582CFF" />
						)}
					</View>
					<AppText
						variant="body"
						tone="primary"
						className="flex-1 font-semibold text-[14px]"
						numberOfLines={1}
					>
						{title}
					</AppText>
				</Pressable>

				<View className="flex-row items-center gap-2">
					<Chip
						label={isAi ? "IA" : "Manual"}
						tone={isAi ? "accent" : "muted"}
					/>
					{onDelete && (
						<Pressable
							testID={testID ? `${testID}-delete-btn` : "delete-link-btn"}
							onPress={onDelete}
							className="p-1"
							hitSlop={8}
						>
							<Trash2 size={14} color="#EF4444" />
						</Pressable>
					)}
				</View>
			</View>

			<View className="rounded-sm-card border border-border-subtle/80 bg-surface-primary/70 p-2.5">
				<AppText
					variant="caption"
					tone="secondary"
					className="text-[12px] italic leading-4"
				>
					"{reason}"
				</AppText>
				{similarityScore !== undefined && (
					<AppText
						variant="caption"
						tone="muted"
						className="mt-1 text-[10px]"
					>
						Afinidade:{" "}
						{typeof similarityScore === "number"
							? `${Math.round(similarityScore * 100)}%`
							: similarityScore}
					</AppText>
				)}
			</View>
		</View>
	);
}
