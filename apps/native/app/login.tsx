import { useRouter } from "expo-router";
import { LoginScreen } from "@/features/login/LoginScreen";

export default function Login() {
	const router = useRouter();

	async function authenticate() {
		router.replace("/(tabs)/onibus");
	}

	return <LoginScreen authenticate={authenticate} />;
}
