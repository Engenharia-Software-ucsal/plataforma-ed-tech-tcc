import { Route } from "lucide-react-native";
import { View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { DelayBadge } from "@/components/molecules/DelayBadge";
import type { BusDeparture } from "@/features/onibus/onibus.model";

export function NextBusHero({ departure }: { departure: BusDeparture }) {
	return (
		<View className="flex-row overflow-hidden rounded-lg-card border border-border-subtle bg-surface-secondary">
			<View className="w-[130px] items-center justify-center gap-1 bg-accent-primary p-5">
				<AppText variant="mono" tone="primary" className="font-bold text-2xl">
					{departure.time}
				</AppText>
				<AppText variant="body" tone="primary" className="text-xs opacity-80">
					{departure.status}
				</AppText>
			</View>
			<View className="h-full w-px bg-border-subtle" />
			<View className="flex-1 justify-center gap-2 p-5">
				<AppText
					variant="caption"
					tone="muted"
					className="font-medium text-[11px] uppercase"
				>
					Próxima saída
				</AppText>
				{departure.delayMinutes > 0 && (
					<DelayBadge minutes={departure.delayMinutes} />
				)}
				<AppText
					variant="body"
					tone="primary"
					className="font-semibold text-[15px]"
				>
					Ônibus Universitário
				</AppText>
				<View className="flex-row items-center gap-1.5">
					<Route size={12} color="#00F2FF" />
					<AppText variant="body" tone="muted" className="text-xs">
						{departure.route}
					</AppText>
				</View>
			</View>
		</View>
	);
}
