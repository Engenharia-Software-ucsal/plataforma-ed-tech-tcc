import { ChevronRight, Folder, MoreHorizontal } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";

export type FolderRowProps = {
	name: string;
	/** Ex.: "3 notas · 1 pasta". */
	summary: string;
	onPress: () => void;
	onOpenActions?: () => void;
	testID?: string;
};

export function FolderRow({
	name,
	summary,
	onPress,
	onOpenActions,
	testID,
}: FolderRowProps) {
	return (
		<View
			testID={testID}
			className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
		>
			<Pressable
				testID={testID ? `${testID}-abrir` : undefined}
				onPress={onPress}
				className="flex-1 flex-row items-center gap-3"
				accessibilityRole="button"
				accessibilityLabel={`Abrir pasta ${name}`}
			>
				<View className="h-9 w-9 items-center justify-center rounded-sm-card bg-accent-light">
					<Folder size={18} color="#582CFF" />
				</View>
				<View className="flex-1 gap-0.5">
					<AppText
						variant="heading"
						tone="primary"
						className="font-semibold text-[15px]"
						numberOfLines={1}
					>
						{name}
					</AppText>
					<AppText variant="caption" tone="muted" className="text-[12px]">
						{summary}
					</AppText>
				</View>
				<ChevronRight size={18} color="#71717A" />
			</Pressable>
			{onOpenActions ? (
				<Pressable
					testID={testID ? `${testID}-acoes` : undefined}
					onPress={onOpenActions}
					hitSlop={10}
					accessibilityRole="button"
					accessibilityLabel={`Ações da pasta ${name}`}
					className="p-1"
				>
					<MoreHorizontal size={18} color="#A1A1AA" />
				</Pressable>
			) : null}
		</View>
	);
}
