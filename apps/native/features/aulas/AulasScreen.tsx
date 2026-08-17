import { View } from "react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { ClassCard } from "@/components/organisms/ClassCard";
import { NextClassHero } from "@/components/organisms/NextClassHero";
import { useAulasViewModel } from "@/features/aulas/aulas.viewmodel";

export function AulasScreen() {
  const { next, sessions } = useAulasViewModel();

  return (
    <Container className="bg-surface-primary">
      <View className="gap-6 p-5">
        <AppText variant="heading" tone="primary" className="text-[28px] font-bold">
          Aulas
        </AppText>

        <NextClassHero session={next} />

        <View className="gap-3">
          <AppText variant="heading" tone="primary" className="text-lg font-semibold">
            Todas as aulas
          </AppText>
          <View className="gap-2.5">
            {sessions.map((session) => (
              <ClassCard key={session.id} session={session} />
            ))}
          </View>
        </View>
      </View>
    </Container>
  );
}
