import "@/global.css";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { Provider as JotaiProvider } from "jotai";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { useAppFontsLoaded } from "@/hooks/use-fonts";

export const unstable_settings = {
	initialRouteName: "login",
};

function StackLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="login" />
			<Stack.Screen name="(tabs)" />
			<Stack.Screen name="perfil" />
			<Stack.Screen name="aula-detalhes" />
			<Stack.Screen name="quiz" />
			<Stack.Screen name="quiz-resultado" />
			<Stack.Screen name="notificacoes" />
			<Stack.Screen
				name="modal"
				options={{ headerShown: true, title: "Modal", presentation: "modal" }}
			/>
		</Stack>
	);
}

export default function Layout() {
	const fontsLoaded = useAppFontsLoaded();

	if (!fontsLoaded) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<KeyboardProvider>
				<JotaiProvider>
					<AppThemeProvider>
						<HeroUINativeProvider>
							<StackLayout />
						</HeroUINativeProvider>
					</AppThemeProvider>
				</JotaiProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
