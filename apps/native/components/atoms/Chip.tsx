import { View, type ViewProps } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { cn } from "@/lib/cn";

type Tone = "accent" | "success" | "warning" | "danger" | "muted";

const BG_CLASS: Record<Tone, string> = {
	accent: "bg-accent-light",
	success: "bg-success/15",
	warning: "bg-warning/15",
	danger: "bg-danger/15",
	muted: "bg-border-subtle",
};

const TEXT_TONE: Record<
	Tone,
	"accent" | "success" | "warning" | "danger" | "muted"
> = {
	accent: "accent",
	success: "success",
	warning: "warning",
	danger: "danger",
	muted: "muted",
};

export type ChipProps = ViewProps & {
	label: string;
	tone?: Tone;
	icon?: React.ReactNode;
	testID?: string;
};

export function Chip({
	label,
	tone = "accent",
	icon,
	testID,
	className,
	...props
}: ChipProps) {
	return (
		<View
			testID={testID}
			className={cn(
				"flex-row items-center gap-1 rounded-sm-card px-2 py-1",
				BG_CLASS[tone],
				className,
			)}
			{...props}
		>
			{icon}
			<AppText
				variant="caption"
				tone={TEXT_TONE[tone]}
				className="font-semibold text-[10px]"
			>
				{label}
			</AppText>
		</View>
	);
}
