import { Brain, FileText } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";

export type QuizSource = { id: string; name: string };

export type QuizSourcesCardProps = {
	sources: QuizSource[];
	onGenerateAll: () => void;
	onGenerateFromSource: (sourceId: string) => void;
};

export function QuizSourcesCard({
	sources,
	onGenerateAll,
	onGenerateFromSource,
}: Readonly<QuizSourcesCardProps>) {
	return (
		<View className="gap-3 rounded-lg-card border border-accent-primary bg-accent-light p-4.5">
			<View className="gap-1">
				<AppText variant="heading" tone="primary" className="font-bold text-sm">
					Quiz de revisão
				</AppText>
				<AppText variant="body" tone="secondary" className="text-xs">
					5 perguntas sorteadas de um banco criado pela IA a partir dos PDFs da
					aula. Priorizamos as que você ainda não respondeu, mas elas podem se
					repetir quando o banco acabar.
				</AppText>
			</View>

			<AppButton
				label="Quiz com todos os materiais"
				onPress={onGenerateAll}
				icon={<Brain size={14} color="#FFFFFF" />}
			/>

			<AppText variant="caption" tone="muted" className="text-[11px]">
				Ou escolha um único arquivo
			</AppText>
			<View className="gap-2">
				{sources.map((source) => (
					<Pressable
						key={source.id}
						testID={`quiz-source-${source.id}`}
						onPress={() => onGenerateFromSource(source.id)}
						className="flex-row items-center gap-2.5 rounded-sm-card border border-accent-primary/40 bg-surface-primary/70 px-3 py-2.5 active:opacity-80"
					>
						<FileText size={14} color="#BF40FF" />
						<AppText
							variant="body"
							tone="secondary"
							className="flex-1 text-xs"
							numberOfLines={2}
						>
							{source.name}
						</AppText>
						<AppText
							variant="caption"
							tone="primary"
							className="font-semibold text-[11px]"
						>
							Gerar quiz
						</AppText>
					</Pressable>
				))}
			</View>
		</View>
	);
}
