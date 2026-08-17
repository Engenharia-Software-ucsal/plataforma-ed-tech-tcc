import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/cn";

type Tone = "accent" | "muted";

const BG_CLASS: Record<Tone, string> = {
	accent: "bg-accent-light",
	muted: "bg-surface-secondary border border-border-subtle",
};

export type IconBadgeProps = ViewProps & {
	icon: React.ReactNode;
	tone?: Tone;
	testID?: string;
};

export function IconBadge({
	icon,
	tone = "muted",
	testID,
	className,
	...props
}: IconBadgeProps) {
	return (
		<View
			testID={testID}
			className={cn(
				"h-9 w-9 items-center justify-center rounded-sm-card",
				BG_CLASS[tone],
				className,
			)}
			{...props}
		>
			{icon}
		</View>
	);
}
