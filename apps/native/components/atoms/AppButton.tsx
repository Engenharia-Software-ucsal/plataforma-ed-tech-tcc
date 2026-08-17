import { Pressable, type PressableProps } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline";

const VARIANT_CLASS: Record<Variant, string> = {
	primary: "bg-accent-primary",
	secondary: "bg-surface-secondary border border-border-subtle",
	outline: "bg-transparent border border-border-subtle",
};

export type AppButtonProps = Omit<PressableProps, "children"> & {
	label: string;
	onPress: () => void;
	variant?: Variant;
	icon?: React.ReactNode;
	disabled?: boolean;
	testID?: string;
};

export function AppButton({
	label,
	onPress,
	variant = "primary",
	icon,
	disabled = false,
	testID,
	...props
}: AppButtonProps) {
	return (
		<Pressable
			testID={testID}
			onPress={disabled ? undefined : onPress}
			disabled={disabled}
			className={cn(
				"flex-row items-center justify-center gap-2 rounded-sm-card px-5 py-3",
				VARIANT_CLASS[variant],
				disabled && "opacity-50",
			)}
			{...props}
		>
			{icon}
			<AppText variant="body" tone="primary" className="font-semibold">
				{label}
			</AppText>
		</Pressable>
	);
}
