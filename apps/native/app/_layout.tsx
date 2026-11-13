import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { Provider as JotaiProvider } from "jotai";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { useAppFontsLoaded } from "@/hooks/use-fonts";
import { onAppStateChange, queryClient } from "@/lib/query-client";

export const unstable_settings = {
	initialRouteName: "login",
};

function StackLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="login" />
			<Stack.Screen name="(tabs)" />
			<Stack.Screen name="aula-detalhes" />
			<Stack.Screen name="nota-detalhes" />
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

	useEffect(() => {
		const subscription = AppState.addEventListener(
			"change",
			(status: AppStateStatus) => onAppStateChange(status),
		);
		return () => subscription.remove();
	}, []);

	if (!fontsLoaded) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<KeyboardProvider>
				<QueryClientProvider client={queryClient}>
					<JotaiProvider>
						<AppThemeProvider>
							<HeroUINativeProvider>
								<StackLayout />
							</HeroUINativeProvider>
						</AppThemeProvider>
					</JotaiProvider>
				</QueryClientProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
