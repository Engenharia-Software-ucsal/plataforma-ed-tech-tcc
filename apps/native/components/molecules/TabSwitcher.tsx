import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { cn } from "@/lib/cn";

export type TabSwitcherTab = {
	key: string;
	label: string;
	icon: React.ReactNode;
};

export type TabSwitcherProps = {
	tabs: readonly TabSwitcherTab[];
	activeKey: string;
	onChange: (key: string) => void;
};

export function TabSwitcher({ tabs, activeKey, onChange }: TabSwitcherProps) {
	return (
		<View className="flex-row gap-2">
			{tabs.map((tab) => {
				const active = tab.key === activeKey;
				return (
					<Pressable
						key={tab.key}
						testID={`tab-${tab.key}`}
						onPress={() => onChange(tab.key)}
						className={cn(
							"flex-1 flex-row items-center justify-center gap-1.5 rounded-sm-card border py-2.5",
							active
								? "border-accent-primary bg-accent-primary"
								: "border-border-subtle bg-surface-secondary",
						)}
					>
						{tab.icon}
						<AppText
							variant="body"
							tone={active ? "primary" : "muted"}
							className="font-semibold text-sm"
						>
							{tab.label}
						</AppText>
					</Pressable>
				);
			})}
		</View>
	);
}
