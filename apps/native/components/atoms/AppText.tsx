import { Text, type TextProps } from "react-native";
import { cn } from "@/lib/cn";

type Variant = "heading" | "body" | "caption" | "mono";
type Tone =
	| "primary"
	| "secondary"
	| "muted"
	| "accent"
	| "success"
	| "warning"
	| "danger";

const VARIANT_CLASS: Record<Variant, string> = {
	heading: "font-heading",
	body: "font-body",
	caption: "font-caption",
	mono: "font-mono",
};

const TONE_CLASS: Record<Tone, string> = {
	primary: "text-foreground-primary",
	secondary: "text-foreground-secondary",
	muted: "text-foreground-muted",
	accent: "text-accent-primary",
	success: "text-success",
	warning: "text-warning",
	danger: "text-danger",
};

export type AppTextProps = TextProps & {
	variant?: Variant;
	tone?: Tone;
	className?: string;
};

export function AppText({
	variant = "heading",
	tone = "primary",
	className,
	children,
	...props
}: AppTextProps) {
	return (
		<Text
			className={cn(VARIANT_CLASS[variant], TONE_CLASS[tone], className)}
			{...props}
		>
			{children}
		</Text>
	);
}
