import "@/global.css";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { Provider as JotaiProvider } from "jotai";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { useAppFontsLoaded } from "@/hooks/use-fonts";

export const unstable_settings = {
	initialRouteName: "(drawer)",
};

function StackLayout() {
	return (
		<Stack screenOptions={{}}>
			<Stack.Screen name="(drawer)" options={{ headerShown: false }} />
			<Stack.Screen
				name="login"
				options={{ headerShown: false, presentation: "fullScreenModal" }}
			/>
			<Stack.Screen
				name="modal"
				options={{ title: "Modal", presentation: "modal" }}
			/>
			<Stack.Screen name="aula-detalhes" options={{ headerShown: false }} />
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
