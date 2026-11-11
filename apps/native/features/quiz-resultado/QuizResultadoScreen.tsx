import { type Href, useRouter } from "expo-router";
import { RotateCw } from "lucide-react-native";
import { View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Container } from "@/components/container";
import { ScoreRing } from "@/components/molecules/ScoreRing";
import { TopicResultRow } from "@/components/molecules/TopicResultRow";
import { useQuizResultadoViewModel } from "@/features/quiz-resultado/quizResultado.viewmodel";

export function QuizResultadoScreen({ onBack }: { onBack?: (classSessionId?: string) => void } = {}) {
	const router = useRouter();
	const { result } = useQuizResultadoViewModel();

	if (!result) {
		return (
			<Container className="bg-surface-primary" isScrollable={false}>
				<View className="flex-1 items-center justify-center gap-4 px-7">
					<AppText
						variant="heading"
						tone="primary"
						className="text-center font-semibold"
					>
						Nenhum resultado recente
					</AppText>
					<AppButton
						label="Voltar para a aula"
						variant="outline"
						onPress={() => onBack?.(classSessionId)}
					/>
				</View>
			</Container>
		);
	}

	const { correct, total, title, subtitle, topics, quizId, classSessionId } =
		result;

	return (
		<Container className="bg-surface-primary" isScrollable={false}>
			<View className="flex-1 items-center justify-center gap-6 px-7">
				<ScoreRing correct={correct} total={total} />

				<View className="items-center gap-2">
					<AppText
						variant="heading"
						tone="primary"
						className="font-bold text-[22px]"
					>
						{title}
					</AppText>
					<AppText
						variant="body"
						tone="muted"
						className="text-center text-[13px]"
					>
						{subtitle}
					</AppText>
				</View>

				<View className="w-full gap-2.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
					{topics.map((topic) => (
						<TopicResultRow
							key={topic.questionId}
							label={topic.label}
							correct={topic.correct}
						/>
					))}
				</View>

				<View className="w-full gap-2.5">
					<AppButton
						label="Refazer quiz"
						onPress={() => router.replace(`/quiz?quizId=${quizId}` as Href)}
						icon={<RotateCw size={14} color="#FFFFFF" />}
					/>
					<AppButton
						label="Voltar para a aula"
						variant="outline"
						onPress={() => onBack?.()}
					/>
				</View>
			</View>
		</Container>
	);
}
