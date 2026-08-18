import NetInfo from "@react-native-community/netinfo";
import {
	focusManager,
	onlineManager,
	QueryClient,
} from "@tanstack/react-query";
import type { AppStateStatus } from "react-native";

// RN has no window focus/online events — wire TanStack Query's managers to
// AppState and NetInfo instead. See: https://tanstack.com/query/latest/docs/framework/react/react-native
onlineManager.setEventListener((setOnline) => {
	return NetInfo.addEventListener((state) => {
		setOnline(!!state.isConnected);
	});
});

export function onAppStateChange(status: AppStateStatus) {
	focusManager.setFocused(status === "active");
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 2,
			staleTime: 60 * 1000,
		},
	},
});
