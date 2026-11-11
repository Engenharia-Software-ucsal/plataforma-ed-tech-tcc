import * as ExpoRouter from "expo-router";
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
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";
import { Container } from "@/components/container";
import { FileRow } from "@/components/molecules/FileRow";
import { TabSwitcher } from "@/components/molecules/TabSwitcher";
import { InsightCard } from "@/components/organisms/InsightCard";
import { QuizSourcesCard } from "@/components/organisms/QuizSourcesCard";
import { useAulaDetalhesViewModel } from "@/features/aula-detalhes/aulaDetalhes.viewmodel";

const FILE_ICON: Record<string, React.ReactNode> = {
	"file-text": <Download size={16} color="#582CFF" />,
	"file-spreadsheet": <Download size={16} color="#582CFF" />,
	video: <Download size={16} color="#582CFF" />,
	link: <Download size={16} color="#582CFF" />,
};

export function AulaDetalhesScreen() {
	const router = useRouter();
	const params =
		typeof ExpoRouter.useLocalSearchParams === "function"
			? ExpoRouter.useLocalSearchParams<{ id?: string }>()
			: {};
	const { data, activeTab, setActiveTab, openMaterial, updateSchedule } =
		useAulaDetalhesViewModel(params?.id);

	const quizSources = data.files
		.filter((file) => file.materialType === "pdf")
		.map((file) => ({ id: file.id, name: file.name }));

	const [isEditingSchedule, setIsEditingSchedule] = useState(false);
	const [startTimeInput, setStartTimeInput] = useState(
		data.schedule.split(" - ")[0] ?? "08:00",
	);
	const [endTimeInput, setEndTimeInput] = useState(
		data.schedule.split(" - ")[1] ?? "09:30",
	);
	const [roomInput, setRoomInput] = useState(data.room);

	const handleOpenEditSchedule = () => {
		const [start, end] = data.schedule.split(" - ");
		setStartTimeInput(start ?? "08:00");
		setEndTimeInput(end ?? "09:30");
		setRoomInput(data.room);
		setIsEditingSchedule((prev) => !prev);
	};

	const handleSaveSchedule = async () => {
		await updateSchedule({
			startTime: startTimeInput.trim() || "08:00",
			endTime: endTimeInput.trim() || "09:30",
			room: roomInput.trim() || data.room,
		});
		setIsEditingSchedule(false);
	};

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
						<Pressable
							testID="edit-schedule-button"
							onPress={handleOpenEditSchedule}
							className="flex-row items-center gap-1 rounded-sm-card border border-border-subtle bg-surface-secondary px-2 py-1"
						>
							<PenLine size={11} color="#582CFF" />
							<AppText
								variant="caption"
								tone="primary"
								className="font-medium text-[11px]"
							>
								Editar horário/sala
							</AppText>
						</Pressable>
					</View>

					{isEditingSchedule && (
						<View
							testID="schedule-edit-modal"
							className="gap-2.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
						>
							<View className="flex-row gap-2">
								<TextInput
									testID="input-start-time"
									value={startTimeInput}
									onChangeText={setStartTimeInput}
									placeholder="Início (ex: 08:00)"
									placeholderTextColor="#71717A"
									className="flex-1 rounded-sm-card border border-border-subtle bg-surface-primary px-3 py-2 text-text-primary text-xs"
								/>
								<TextInput
									testID="input-end-time"
									value={endTimeInput}
									onChangeText={setEndTimeInput}
									placeholder="Fim (ex: 09:30)"
									placeholderTextColor="#71717A"
									className="flex-1 rounded-sm-card border border-border-subtle bg-surface-primary px-3 py-2 text-text-primary text-xs"
								/>
							</View>
							<TextInput
								testID="input-room"
								value={roomInput}
								onChangeText={setRoomInput}
								placeholder="Sala / Bloco"
								placeholderTextColor="#71717A"
								className="rounded-sm-card border border-border-subtle bg-surface-primary px-3 py-2 text-text-primary text-xs"
							/>
							<Pressable
								testID="save-schedule-button"
								onPress={handleSaveSchedule}
								className="items-center rounded-sm-card bg-accent-primary py-2"
							>
								<AppText
									variant="caption"
									tone="primary"
									className="font-semibold text-xs"
								>
									Salvar horário
								</AppText>
							</Pressable>
						</View>
					)}

					<View className="flex-row flex-wrap gap-1.5">
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
									testID={`file-row-${file.id}`}
									icon={FILE_ICON[file.iconName]}
									name={file.name}
									meta={file.meta}
									badge={file.badge}
									onPress={() => openMaterial(file)}
								/>
							))}
						</View>
						<AppButton
							label="Baixar todos os materiais"
							variant="outline"
							onPress={() => {
								if (data.files[0]) {
									openMaterial(data.files[0]);
								}
							}}
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

						{quizSources.length > 0 ? (
							<QuizSourcesCard
								sources={quizSources}
								onGenerateAll={() =>
									router.push(`/quiz?classSessionId=${data.id}` as Href)
								}
								onGenerateFromSource={(materialId) =>
									router.push(
										`/quiz?classSessionId=${data.id}&materialId=${materialId}` as Href,
									)
								}
							/>
						) : (
							data.insights.map((insight) => (
								<InsightCard
									key={insight.id}
									summary={insight.summary}
									coverageText={insight.coverageText}
									points={insight.points}
									sourceReference={insight.sourceReference}
									onGenerateQuiz={() =>
										router.push(`/quiz?classSessionId=${data.id}` as Href)
									}
								/>
							))
						)}
					</View>
				)}
			</View>
		</Container>
	);
}
