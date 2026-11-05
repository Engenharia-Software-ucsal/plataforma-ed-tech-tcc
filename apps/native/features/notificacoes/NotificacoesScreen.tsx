import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import {
	ChevronLeft,
	Gauge,
	GraduationCap,
	Sparkles,
	TriangleAlert,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { Container } from "@/components/container";
import { NotificationRow } from "@/components/molecules/NotificationRow";
import type { NotificationIconName } from "@/features/notificacoes/notificacoes.model";
import { classroomNotificationsAtom } from "@/state/classroom";

const ICON_COLOR: Record<string, string> = {
	accent: "#582CFF",
	warning: "#F59E0B",
	danger: "#EF4444",
};

function iconFor(name: NotificationIconName, color: string) {
	switch (name) {
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
	const notifications = useAtomValue(classroomNotificationsAtom);

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
					<AppText
						variant="heading"
						tone="primary"
						className="font-bold text-lg"
					>
						Notificações
					</AppText>
				</View>

				<View className="gap-2.5">
					{notifications.map((notification) => (
						<NotificationRow
							key={notification.id}
							icon={iconFor(
								notification.iconName,
								ICON_COLOR[notification.iconTone],
							)}
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
