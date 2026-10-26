import { Tabs } from "expo-router";
import { BookOpen, FileText } from "lucide-react-native";

export default function TabLayout() {
	return (
		<Tabs
			initialRouteName="aulas"
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: "#582CFF",
				tabBarInactiveTintColor: "#A1A1AA",
				tabBarStyle: { backgroundColor: "#0A0A0A", borderTopColor: "#222233" },
			}}
		>
			<Tabs.Screen
				name="aulas"
				options={{
					title: "Aulas",
					tabBarIcon: ({ color, size }) => (
						<BookOpen size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="notas"
				options={{
					title: "Notas",
					tabBarIcon: ({ color, size }) => (
						<FileText size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
