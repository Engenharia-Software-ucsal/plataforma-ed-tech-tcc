import { useRouter } from "expo-router";
import { Bell, User } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { Container } from "@/components/container";
import { SegmentedFilter } from "@/components/molecules/SegmentedFilter";
import { BusTimeCard } from "@/components/organisms/BusTimeCard";
import { NextBusHero } from "@/components/organisms/NextBusHero";
import { useOnibusViewModel } from "@/features/onibus/onibus.viewmodel";
import type { BusStopFilter } from "@/state/busStopFilter";

const FILTER_OPTIONS: readonly BusStopFilter[] = ["Todos", "UCSAL", "Pituaçu"];

export function OnibusScreen() {
	const router = useRouter();
	const { next, filtered, filter, setFilter, isFavorite, toggleFavorite } = useOnibusViewModel();

	return (
		<Container className="bg-surface-primary" isScrollable>
			<View className="gap-6 p-5">
				<View className="flex-row items-center justify-between">
					<AppText variant="heading" tone="primary" className="font-bold text-[28px]">
						Ônibus
					</AppText>
					<View className="flex-row items-center gap-4">
						<Pressable
							testID="bell-button"
							onPress={() => router.push("/notificacoes")}
						>
							<Bell size={24} color="#A1A1AA" />
						</Pressable>
						<Pressable testID="profile-button" onPress={() => router.push("/perfil")}>
							<User size={24} color="#A1A1AA" />
						</Pressable>
					</View>
				</View>

				<NextBusHero departure={next} />

				<SegmentedFilter options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

				<View className="gap-3">
					<AppText variant="heading" tone="primary" className="font-semibold text-lg">
						Próximos horários
					</AppText>
					<View className="gap-2.5">
						{filtered.map((departure) => (
							<BusTimeCard
								key={departure.id}
								departure={departure}
								isFavorite={isFavorite(departure.id)}
								onToggleFavorite={toggleFavorite}
							/>
						))}
					</View>
				</View>
			</View>
		</Container>
	);
}
