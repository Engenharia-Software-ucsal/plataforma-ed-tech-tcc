import { type Href, useRouter } from "expo-router";
import { QuizResultadoScreen } from "@/features/quiz-resultado/QuizResultadoScreen";

export default function QuizResultado() {
	const router = useRouter();
	return (
		<QuizResultadoScreen
			onBack={(classSessionId) =>
				classSessionId
					? router.dismissTo(`/aula-detalhes?id=${classSessionId}` as Href)
					: router.replace("/(tabs)/aulas")
			}
		/>
	);
}
