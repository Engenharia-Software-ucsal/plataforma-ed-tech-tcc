import {
	ChevronLeft,
	Clock3,
	Download,
	GraduationCap,
	MapPin,
	User,
} from "lucide-react-native";
import { View } from "react-native";
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
	const { data, activeTab, setActiveTab } = useAulaDetalhesViewModel();

	return (
		<Container className="bg-surface-primary">
			<View className="gap-6 p-5">
				<View className="flex-row items-center gap-3">
					<View className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary">
						<ChevronLeft size={18} color="#FFFFFF" />
					</View>
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
					<InsightCard
						summary={data.insightSummary}
						coverageText={data.insightCoverage}
						points={data.insightPoints}
						onGenerateQuiz={() => {}}
					/>
				)}
			</View>
		</Container>
	);
}
