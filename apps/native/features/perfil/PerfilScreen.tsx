import { useRouter } from "expo-router";
import {
	Bell,
	ChevronLeft,
	GraduationCap,
	LogOut,
	RefreshCw,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { IconBadge } from "@/components/atoms/IconBadge";
import { Container } from "@/components/container";
import { usePerfilViewModel } from "@/features/perfil/perfil.viewmodel";

export type PerfilScreenProps = {
	onSignOut?: () => void;
};

export const PerfilScreen: React.FC<PerfilScreenProps> = ({ onSignOut }) => {
	const router = useRouter();
	const {
		profile,
		accounts,
		notificationsEnabled,
		toggleNotifications,
		signOut,
		syncStatus,
		lastSyncedAt,
		syncClassroom,
	} = usePerfilViewModel({ onSignOut });

	return (
		<Container className="bg-surface-primary">
			<View className="gap-6 p-5">
				<View className="flex-row items-center gap-3">
					<Pressable
						testID="back-button"
						onPress={() => router.back()}
						className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
					>
						<ChevronLeft size={18} color="#FFFFFF" />
					</Pressable>
					<AppText
						variant="heading"
						tone="primary"
						className="font-bold text-[28px]"
					>
						Perfil
					</AppText>
				</View>

				<View className="flex-row items-center gap-3.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
					<IconBadge
						icon={
							<AppText
								variant="heading"
								tone="primary"
								className="font-bold text-lg"
							>
								{profile.initials}
							</AppText>
						}
						tone="accent"
						className="h-13 w-13 rounded-lg-card bg-accent-primary"
					/>
					<View className="flex-1 gap-0.5">
						<AppText
							variant="body"
							tone="primary"
							className="font-semibold text-[15px]"
						>
							{profile.name}
						</AppText>
						<AppText variant="body" tone="muted" className="text-xs">
							{profile.email}
						</AppText>
					</View>
				</View>

				<View className="gap-3">
					<AppText
						variant="heading"
						tone="muted"
						className="font-semibold text-sm"
					>
						Contas conectadas
					</AppText>
					{accounts.map((account) => (
						<View
							key={account.id}
							className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
						>
							<IconBadge
								icon={<GraduationCap size={16} color="#582CFF" />}
								tone="accent"
							/>
							<View className="flex-1 gap-0.5">
								<AppText
									variant="body"
									tone="primary"
									className="font-semibold text-[13px]"
								>
									{account.name}
								</AppText>
								<AppText variant="body" tone="success" className="text-[11px]">
									Conectado
								</AppText>
								{lastSyncedAt && (
									<AppText
										variant="caption"
										tone="muted"
										className="text-[11px]"
									>
										{lastSyncedAt}
									</AppText>
								)}
							</View>
							<Pressable
								testID="perfil-sync-classroom-button"
								onPress={() => syncClassroom()}
								className="flex-row items-center gap-1 rounded-sm-card border border-border-subtle bg-surface-primary px-2.5 py-1.5"
							>
								<RefreshCw size={12} color="#582CFF" />
								<AppText
									variant="caption"
									tone="primary"
									className="font-semibold text-[11px]"
								>
									{syncStatus === "syncing"
										? "Sincronizando..."
										: "Sincronizar"}
								</AppText>
							</Pressable>
						</View>
					))}
				</View>

				<View className="gap-3">
					<AppText
						variant="heading"
						tone="muted"
						className="font-semibold text-sm"
					>
						Preferências
					</AppText>
					<View className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5">
						<Bell size={16} color="#A1A1AA" />
						<AppText
							variant="body"
							tone="primary"
							className="flex-1 font-medium text-[13px]"
						>
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
};
