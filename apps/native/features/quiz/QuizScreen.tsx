import { ArrowRight, X } from "lucide-react-native";
import { View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";
import { Container } from "@/components/container";
import { QuizOptionRow } from "@/components/molecules/QuizOptionRow";
import { useQuizViewModel } from "@/features/quiz/quiz.viewmodel";

export function QuizScreen() {
	const { question, index, total, selectedOptionId, selectOption, goNext } =
		useQuizViewModel();
	const progressPercent = ((index + 1) / total) * 100;

	return (
		<Container className="bg-surface-primary">
			<View className="gap-5 p-5">
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-3">
						<View className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary">
							<X size={16} color="#FFFFFF" />
						</View>
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
						{question.options.map((option) => (
							<QuizOptionRow
								key={option.id}
								letter={option.letter}
								text={option.text}
								selected={option.id === selectedOptionId}
								onPress={() => selectOption(option.id)}
							/>
						))}
					</View>
				</View>

				<AppButton
					label="Próxima pergunta"
					onPress={goNext}
					icon={<ArrowRight size={16} color="#FFFFFF" />}
					disabled={!selectedOptionId}
				/>
			</View>
		</Container>
	);
}
