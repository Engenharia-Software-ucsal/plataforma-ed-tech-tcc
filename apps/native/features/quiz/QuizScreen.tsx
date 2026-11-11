import { useRouter } from "expo-router";
import { ArrowRight, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";
import { Container } from "@/components/container";
import { QuizOptionRow } from "@/components/molecules/QuizOptionRow";
import { OPTION_LETTERS } from "@/features/quiz/quiz.model";
import { useQuizViewModel } from "@/features/quiz/quiz.viewmodel";

export function QuizScreen({
	classSessionId,
	materialId,
	quizId,
}: {
	classSessionId?: string;
	materialId?: string;
	quizId?: string;
}) {
	const router = useRouter();
	const {
		status,
		errorMessage,
		question,
		index,
		total,
		isLast,
		selectedOptionId,
		selectOption,
		goNext,
		submitting,
	} = useQuizViewModel({ classSessionId, materialId, quizId });

	async function handleNext() {
		const outcome = await goNext();
		if (outcome === "submitted") {
			router.replace("/quiz-resultado");
		}
	}

	if (status === "loading") {
		return (
			<Container className="bg-surface-primary">
				<View className="flex-1 items-center justify-center gap-4 p-5">
					<ActivityIndicator color="#582CFF" />
					<AppText variant="body" tone="muted">
						Preparando o quiz da aula...
					</AppText>
				</View>
			</Container>
		);
	}

	if (status === "error" || !question) {
		return (
			<Container className="bg-surface-primary">
				<View className="flex-1 items-center justify-center gap-4 p-5">
					<AppText
						variant="heading"
						tone="primary"
						className="text-center font-semibold"
					>
						Não foi possível gerar o quiz
					</AppText>
					<AppText variant="body" tone="muted" className="text-center text-sm">
						{errorMessage ?? "Tente novamente em alguns instantes."}
					</AppText>
					<AppButton
						label="Voltar"
						variant="outline"
						onPress={() => router.back()}
					/>
				</View>
			</Container>
		);
	}

	const progressPercent = ((index + 1) / total) * 100;

	return (
		<Container className="bg-surface-primary">
			<View className="gap-5 p-5">
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-3">
						<Pressable
							testID="close-button"
							onPress={() => router.back()}
							className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
						>
							<X size={16} color="#FFFFFF" />
						</Pressable>
						<AppText
							variant="heading"
							tone="primary"
							className="font-bold text-base"
						>
							Quiz de Revisão
						</AppText>
					</View>
					<AppText variant="mono" tone="muted" className="text-[13px]">
						{index + 1} / {total}
					</AppText>
				</View>

				<View className="h-1.5 rounded-full bg-border-subtle">
					<View
						className="h-1.5 rounded-full bg-accent-primary"
						style={{ width: `${progressPercent}%` }}
					/>
				</View>

				<View className="gap-4 rounded-lg-card border border-border-subtle bg-surface-secondary p-5">
					<Chip label={question.topic} tone="accent" />
					<AppText
						variant="heading"
						tone="primary"
						className="font-semibold text-[17px]"
					>
						{question.text}
					</AppText>
					<View className="gap-2.5">
						{question.options.map((option, optionIndex) => (
							<QuizOptionRow
								key={option.id}
								letter={OPTION_LETTERS[optionIndex] ?? "?"}
								text={option.text}
								selected={option.id === selectedOptionId}
								onPress={() => selectOption(option.id)}
							/>
						))}
					</View>
				</View>

				<AppButton
					label={
						submitting
							? "Enviando..."
							: isLast
								? "Ver resultado"
								: "Próxima pergunta"
					}
					onPress={handleNext}
					icon={<ArrowRight size={16} color="#FFFFFF" />}
					disabled={!selectedOptionId || submitting}
				/>
			</View>
		</Container>
	);
}
