import { Check, ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";

export type FileRowProps = {
	icon: React.ReactNode;
	name: string;
	meta: string;
	badge?: "novo" | "lido";
	onPress?: () => void;
	testID?: string;
};

export function FileRow({
	icon,
	name,
	meta,
	badge,
	onPress,
	testID,
}: FileRowProps) {
	return (
		<Pressable
			testID={testID}
			onPress={onPress}
			className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
		>
			<View className="h-9 w-9 items-center justify-center rounded-sm-card bg-accent-light">
				{icon}
			</View>
			<View className="flex-1 gap-0.5">
				<AppText
					variant="body"
					tone="primary"
					className="font-semibold text-[13px]"
				>
					{name}
				</AppText>
				<AppText variant="caption" tone="muted" className="text-[11px]">
					{meta}
				</AppText>
			</View>
			{badge === "novo" && <Chip label="novo" tone="accent" />}
			{badge === "lido" && <Check size={16} color="#A1A1AA" />}
			{!badge && <ChevronRight size={16} color="#A1A1AA" />}
		</Pressable>
	);
}
