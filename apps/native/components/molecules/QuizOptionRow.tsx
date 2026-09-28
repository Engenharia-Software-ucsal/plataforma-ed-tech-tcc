import { CircleCheckBig } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { cn } from "@/lib/cn";

export type QuizOptionRowProps = {
	letter: string;
	text: string;
	selected: boolean;
	onPress: () => void;
	testID?: string;
};

export function QuizOptionRow({ letter, text, selected, onPress, testID }: QuizOptionRowProps) {
	return (
		<Pressable
			testID={testID}
			onPress={onPress}
			className={cn(
				"flex-row items-center gap-3 rounded-lg-card border p-3.5",
				selected
					? "border-accent-primary bg-accent-light"
					: "border-border-subtle bg-surface-primary",
			)}
		>
			<View
				className={cn(
					"h-[26px] w-[26px] items-center justify-center rounded-sm-card",
					selected ? "bg-accent-primary" : "bg-border-subtle",
				)}
			>
				<AppText
					variant="mono"
					tone={selected ? "primary" : "muted"}
					className="font-bold text-xs"
				>
					{letter}
				</AppText>
			</View>
			<AppText
				variant="body"
				tone="primary"
				className={cn("flex-1 text-[13px]", selected && "font-semibold")}
			>
				{text}
			</AppText>
			{selected && <CircleCheckBig size={18} color="#582CFF" />}
		</Pressable>
	);
}
