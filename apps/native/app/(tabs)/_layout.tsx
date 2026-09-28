import { Tabs } from "expo-router";
import { BookOpen, Bus } from "lucide-react-native";

export default function TabLayout() {
	return (
		<Tabs
			initialRouteName="onibus"
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: "#582CFF",
				tabBarInactiveTintColor: "#A1A1AA",
				tabBarStyle: { backgroundColor: "#0A0A0A", borderTopColor: "#222233" },
			}}
		>
			<Tabs.Screen
				name="onibus"
				options={{
					title: "Ônibus",
					tabBarIcon: ({ color, size }) => <Bus size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="aulas"
				options={{
					title: "Aulas",
					tabBarIcon: ({ color, size }) => (
						<BookOpen size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
