import { Pressable, View } from "react-native";
import { Bell } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import { DelayBadge } from "@/components/molecules/DelayBadge";
import { OccupancyTag } from "@/components/molecules/OccupancyTag";
import { StopTag } from "@/components/molecules/StopTag";
import type { BusDeparture } from "@/features/onibus/onibus.model";

export type BusTimeCardProps = {
  departure: BusDeparture;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export function BusTimeCard({ departure, isFavorite, onToggleFavorite }: BusTimeCardProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
      <View className="flex-1 gap-1">
        <AppText variant="body" tone="primary" className="font-semibold">
          {departure.route}
        </AppText>
        <AppText variant="body" tone="muted" className="text-xs">
          {departure.status}
        </AppText>
        <View className="flex-row gap-1.5">
          <StopTag stop={departure.stop} />
          <OccupancyTag level={departure.occupancy} />
        </View>
      </View>
      <View className="items-end gap-1">
        <AppText variant="mono" tone="accent" className="text-2xl font-bold">
          {departure.time}
        </AppText>
        <DelayBadge minutes={departure.delayMinutes} />
      </View>
      <Pressable testID="favorite-button" onPress={() => onToggleFavorite(departure.id)}>
        <Bell size={18} color={isFavorite ? "#582CFF" : "#A1A1AA"} />
      </Pressable>
    </View>
  );
}
