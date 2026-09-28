import { View } from "react-native";
import { AppText } from "@/components/atoms/AppText";

type Tone = "accent" | "warning" | "danger";

const ICON_BG: Record<Tone, string> = {
	accent: "bg-accent-light",
	warning: "bg-warning/15",
	danger: "bg-danger/15",
};

export type NotificationRowProps = {
	icon: React.ReactNode;
	iconTone: Tone;
	title: string;
	description: string;
	timeAgo: string;
	read: boolean;
	testID?: string;
};

export function NotificationRow({
	icon,
	iconTone,
	title,
	description,
	timeAgo,
	read,
	testID,
}: NotificationRowProps) {
	return (
		<View
			testID={testID}
			className={
				read
					? "flex-row gap-3 rounded-lg-card border border-border-subtle bg-surface-primary p-3.5"
					: "flex-row gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
			}
		>
			<View
				className={`h-9 w-9 items-center justify-center rounded-sm-card ${ICON_BG[iconTone]}`}
			>
				{icon}
			</View>
			<View className="flex-1 gap-0.5">
				<View className="flex-row items-center justify-between">
					<AppText variant="body" tone="primary" className="font-semibold text-[13px]">
						{title}
					</AppText>
					<AppText variant="caption" tone="muted" className="text-[10px]">
						{timeAgo}
					</AppText>
				</View>
				<AppText variant="body" tone="muted" className="text-xs">
					{description}
				</AppText>
			</View>
			{!read && (
				<View
					testID="unread-dot"
					className="h-2 w-2 self-start rounded-full bg-accent-primary"
				/>
			)}
		</View>
	);
}
