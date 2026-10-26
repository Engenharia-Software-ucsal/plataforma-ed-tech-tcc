import { type Href, useRouter } from "expo-router";
import {
	ChevronLeft,
	Clock3,
	Download,
	GraduationCap,
	Lightbulb,
	MapPin,
	PenLine,
	User,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";
import { Container } from "@/components/container";
import { FileRow } from "@/components/molecules/FileRow";
import { TabSwitcher } from "@/components/molecules/TabSwitcher";
import { InsightCard } from "@/components/organisms/InsightCard";
import { useAulaDetalhesViewModel } from "@/features/aula-detalhes/aulaDetalhes.viewmodel";

const FILE_ICON: Record<string, React.ReactNode> = {
	"file-text": <Download size={16} color="#582CFF" />,
	"file-spreadsheet": <Download size={16} color="#582CFF" />,
	video: <Download size={16} color="#582CFF" />,
	link: <Download size={16} color="#582CFF" />,
};

export function AulaDetalhesScreen() {
	const router = useRouter();
	const { data, activeTab, setActiveTab } = useAulaDetalhesViewModel();

	return (
		<Container className="bg-surface-primary">
			<View className="gap-6 p-5">
				<View className="flex-row items-center gap-3">
					<Pressable
						testID="back-button"
						onPress={() => router.back()}
						className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
					>
						<ChevronLeft size={18} color="#FFFFFF" />
					</Pressable>
					<AppText
						variant="heading"
						tone="primary"
						className="font-bold text-lg"
					>
						Detalhes da Aula
					</AppText>
				</View>

				<View className="gap-2">
					<AppText
						variant="heading"
						tone="primary"
						className="font-bold text-[22px]"
					>
						{data.subject}
					</AppText>
					<View className="flex-row flex-wrap items-center gap-3">
						<View className="flex-row items-center gap-1">
							<User size={12} color="#A1A1AA" />
							<AppText variant="body" tone="muted" className="text-xs">
								{data.professor}
							</AppText>
						</View>
						<View className="flex-row items-center gap-1">
							<Clock3 size={12} color="#A1A1AA" />
							<AppText variant="body" tone="muted" className="text-xs">
								{data.schedule}
							</AppText>
						</View>
						<View className="flex-row items-center gap-1">
							<MapPin size={12} color="#A1A1AA" />
							<AppText variant="body" tone="muted" className="text-xs">
								{data.room}
							</AppText>
						</View>
					</View>
					<View className="flex-row gap-1.5">
						{data.topics.map((topic) => (
							<Chip key={topic} label={topic} tone="accent" />
						))}
					</View>
					<AppText variant="caption" tone="muted" className="text-[11px]">
						{data.syncedAgo}
					</AppText>
				</View>

				<TabSwitcher
					tabs={[
						{
							key: "materiais",
							label: "Materiais",
							icon: <Download size={14} color="#A1A1AA" />,
						},
						{
							key: "ia",
							label: "IA",
							icon: <GraduationCap size={14} color="#A1A1AA" />,
						},
					]}
					activeKey={activeTab}
					onChange={(key) => setActiveTab(key as "materiais" | "ia")}
				/>

				{activeTab === "materiais" ? (
					<View className="gap-3">
						<AppText
							variant="heading"
							tone="primary"
							className="font-semibold text-base"
						>
							Materiais do Classroom
						</AppText>
						<View className="gap-2.5">
							{data.files.map((file) => (
								<FileRow
									key={file.id}
									icon={FILE_ICON[file.iconName]}
									name={file.name}
									meta={file.meta}
									badge={file.badge}
								/>
							))}
						</View>
						<AppButton
							label="Baixar todos os materiais"
							variant="outline"
							onPress={() => {}}
							icon={<Download size={14} color="#FFFFFF" />}
						/>
					</View>
				) : (
					<View className="gap-4">
						<View
							testID="anti-offloading-banner"
							className="gap-3 rounded-lg-card border border-warning/40 bg-warning/10 p-4"
						>
							<View className="flex-row items-start gap-2.5">
								<Lightbulb size={18} color="#F59E0B" className="mt-0.5" />
								<View className="flex-1 gap-1">
									<AppText
										variant="caption"
										tone="warning"
										className="font-bold text-xs uppercase tracking-wider"
									>
										Pausa Reflexiva Anti-Offloading
									</AppText>
									<AppText
										variant="body"
										tone="secondary"
										className="text-xs leading-relaxed"
									>
										Antes de consultar os resumos da IA, registre suas próprias
										anotações na aba Notas para consolidar os esquemas mentais e
										evitar o cognitive offloading.
									</AppText>
								</View>
							</View>
							<AppButton
								label="Criar Nota desta Aula"
								variant="outline"
								onPress={() =>
									router.push(
										`/nota-detalhes?classSessionId=${data.id}` as Href,
									)
								}
								icon={<PenLine size={14} color="#FFFFFF" />}
							/>
						</View>

						{data.insights.map((insight) => (
							<InsightCard
								key={insight.id}
								summary={insight.summary}
								coverageText={insight.coverageText}
								points={insight.points}
								sourceReference={insight.sourceReference}
								onGenerateQuiz={() => router.push("/quiz")}
							/>
						))}
					</View>
				)}
			</View>
		</Container>
	);
}
