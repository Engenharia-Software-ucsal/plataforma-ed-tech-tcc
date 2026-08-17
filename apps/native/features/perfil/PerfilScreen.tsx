import { View } from "react-native";
import { Bell, GraduationCap, LogOut } from "lucide-react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { AppButton } from "@/components/atoms/AppButton";
import { IconBadge } from "@/components/atoms/IconBadge";
import { usePerfilViewModel } from "@/features/perfil/perfil.viewmodel";

export function PerfilScreen({ onSignOut }: { onSignOut?: () => void } = {}) {
  const { profile, accounts, notificationsEnabled, toggleNotifications, signOut } =
    usePerfilViewModel({ onSignOut });

  return (
    <Container className="bg-surface-primary">
      <View className="gap-6 p-5">
        <AppText variant="heading" tone="primary" className="text-[28px] font-bold">
          Perfil
        </AppText>

        <View className="flex-row items-center gap-3.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
          <IconBadge
            icon={
              <AppText variant="heading" tone="primary" className="text-lg font-bold">
                {profile.initials}
              </AppText>
            }
            tone="accent"
            className="h-[52px] w-[52px] rounded-lg-card bg-accent-primary"
          />
          <View className="flex-1 gap-0.5">
            <AppText variant="body" tone="primary" className="text-[15px] font-semibold">
              {profile.name}
            </AppText>
            <AppText variant="body" tone="muted" className="text-xs">
              {profile.email}
            </AppText>
          </View>
        </View>

        <View className="gap-3">
          <AppText variant="heading" tone="muted" className="text-sm font-semibold">
            Contas conectadas
          </AppText>
          {accounts.map((account) => (
            <View
              key={account.id}
              className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
            >
              <IconBadge icon={<GraduationCap size={16} color="#582CFF" />} tone="accent" />
              <View className="flex-1 gap-0.5">
                <AppText variant="body" tone="primary" className="text-[13px] font-semibold">
                  {account.name}
                </AppText>
                <AppText variant="body" tone="success" className="text-[11px]">
                  Conectado
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <View className="gap-3">
          <AppText variant="heading" tone="muted" className="text-sm font-semibold">
            Preferências
          </AppText>
          <View className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5">
            <Bell size={16} color="#A1A1AA" />
            <AppText variant="body" tone="primary" className="flex-1 text-[13px] font-medium">
              Notificações push
            </AppText>
            <AppButton
              label={notificationsEnabled ? "On" : "Off"}
              onPress={toggleNotifications}
              variant={notificationsEnabled ? "primary" : "outline"}
            />
          </View>
        </View>

        <AppButton
          label="Sair da conta"
          onPress={signOut}
          variant="outline"
          icon={<LogOut size={14} color="#EF4444" />}
        />
      </View>
    </Container>
  );
}
