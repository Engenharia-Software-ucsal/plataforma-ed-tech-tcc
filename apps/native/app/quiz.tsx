import { useLocalSearchParams } from "expo-router";
import { QuizScreen } from "@/features/quiz/QuizScreen";

export default function Quiz() {
	const params = useLocalSearchParams<{
		classSessionId?: string;
		materialId?: string;
		quizId?: string;
	}>();
	return (
		<QuizScreen
			classSessionId={params.classSessionId}
			materialId={params.materialId}
			quizId={params.quizId}
		/>
	);
}
