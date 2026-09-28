import { useRouter } from "expo-router";
import {
	ChevronLeft,
	Gauge,
	GraduationCap,
	Navigation,
	Sparkles,
	TriangleAlert,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { Container } from "@/components/container";
import { NotificationRow } from "@/components/molecules/NotificationRow";
import {
	NOTIFICATIONS_MOCK,
	type NotificationIconName,
} from "@/features/notificacoes/notificacoes.model";

const ICON_COLOR: Record<string, string> = {
	accent: "#582CFF",
	warning: "#F59E0B",
	danger: "#EF4444",
};

function iconFor(name: NotificationIconName, color: string) {
	switch (name) {
		case "navigation":
			return <Navigation size={16} color={color} />;
		case "sparkles":
			return <Sparkles size={16} color={color} />;
		case "triangle-alert":
			return <TriangleAlert size={16} color={color} />;
		case "graduation-cap":
			return <GraduationCap size={16} color={color} />;
		case "gauge":
			return <Gauge size={16} color={color} />;
	}
}

export function NotificacoesScreen() {
	const router = useRouter();
	return (
		<Container className="bg-surface-primary">
			<View className="gap-5 p-5">
				<View className="flex-row items-center gap-3">
					<Pressable
						testID="back-button"
						onPress={() => router.back()}
						className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
					>
						<ChevronLeft size={18} color="#FFFFFF" />
					</Pressable>
					<AppText variant="heading" tone="primary" className="font-bold text-lg">
						Notificações
					</AppText>
				</View>

				<View className="gap-2.5">
					{NOTIFICATIONS_MOCK.map((notification) => (
						<NotificationRow
							key={notification.id}
							icon={iconFor(notification.iconName, ICON_COLOR[notification.iconTone])}
							iconTone={notification.iconTone}
							title={notification.title}
							description={notification.description}
							timeAgo={notification.timeAgo}
							read={notification.read}
						/>
					))}
				</View>
			</View>
		</Container>
	);
}
