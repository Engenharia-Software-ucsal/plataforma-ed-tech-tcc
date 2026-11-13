import { useRouter } from "expo-router";
import { PerfilScreen } from "@/features/perfil/PerfilScreen";

export default function Perfil() {
	const router = useRouter();
	return <PerfilScreen onSignOut={() => router.replace("/login")} />;
}
