import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Geist_400Regular, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { FunnelSans_500Medium, FunnelSans_600SemiBold } from "@expo-google-fonts/funnel-sans";
import { GeistMono_400Regular, GeistMono_700Bold } from "@expo-google-fonts/geist-mono";

export function useAppFontsLoaded(): boolean {
  const [loaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Geist: Geist_400Regular,
    Geist_600SemiBold,
    Geist_700Bold,
    FunnelSans: FunnelSans_500Medium,
    FunnelSans_600SemiBold,
    GeistMono: GeistMono_400Regular,
    GeistMono_700Bold,
  });
  return loaded;
}
