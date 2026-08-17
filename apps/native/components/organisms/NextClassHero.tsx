import { View } from "react-native";
import { MapPin } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import type { ClassSession } from "@/features/aulas/aulas.model";

export function NextClassHero({ session }: { session: ClassSession }) {
  return (
    <View className="flex-row overflow-hidden rounded-lg-card border border-border-subtle bg-surface-secondary">
      <View className="w-[130px] items-center justify-center gap-1 bg-accent-primary p-5">
        <AppText variant="mono" tone="primary" className="text-2xl font-bold">
          {session.startTime}
        </AppText>
        <AppText variant="mono" tone="primary" className="text-xs opacity-80">
          {session.endTime}
        </AppText>
      </View>
      <View className="h-full w-px bg-border-subtle" />
      <View className="flex-1 justify-center gap-2 p-5">
        <AppText variant="caption" tone="muted" className="text-[11px] font-medium uppercase">
          Próxima aula
        </AppText>
        <AppText variant="body" tone="primary" className="text-[15px] font-semibold">
          {session.subject}
        </AppText>
        <View className="flex-row items-center gap-1.5">
          <MapPin size={12} color="#00F2FF" />
          <AppText variant="body" tone="muted" className="text-xs">
            {session.room}
          </AppText>
        </View>
      </View>
    </View>
  );
}
