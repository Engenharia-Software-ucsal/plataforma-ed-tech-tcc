import { useRouter } from "expo-router";
import { QuizResultadoScreen } from "@/features/quiz-resultado/QuizResultadoScreen";

export default function QuizResultado() {
	const router = useRouter();
	return (
		<QuizResultadoScreen
			onRetry={() => router.replace("/quiz")}
			onBack={() => router.replace("/(tabs)/aulas")}
		/>
	);
}
