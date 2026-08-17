import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { cn } from "@/lib/cn";

export type SegmentedFilterProps<T extends string> = {
	options: readonly T[];
	value: T;
	onChange: (value: T) => void;
};

export function SegmentedFilter<T extends string>({
	options,
	value,
	onChange,
}: SegmentedFilterProps<T>) {
	return (
		<View className="flex-row gap-2">
			{options.map((option) => {
				const active = option === value;
				return (
					<Pressable
						key={option}
						testID={`filter-${option}`}
						onPress={() => onChange(option)}
						className={cn(
							"flex-1 items-center justify-center rounded-sm-card border py-2",
							active
								? "border-accent-primary bg-accent-primary"
								: "border-border-subtle bg-surface-secondary",
						)}
					>
						<AppText
							variant="caption"
							tone={active ? "primary" : "muted"}
							className="font-semibold text-xs"
						>
							{option}
						</AppText>
					</Pressable>
				);
			})}
		</View>
	);
}
