import { type Href, useRouter } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { Container } from "@/components/container";
import { ClassCard } from "@/components/organisms/ClassCard";
import { NextClassHero } from "@/components/organisms/NextClassHero";
import { useAulasViewModel } from "@/features/aulas/aulas.viewmodel";

export function AulasScreen() {
	const router = useRouter();
	const {
		next,
		sessions,
		semesters,
		selectedSemester,
		setSelectedSemester,
		syncStatus,
		lastSyncedAt,
		syncClassroom,
	} = useAulasViewModel();
	const semesterOptions = [...semesters, "todos"];

	useEffect(() => {
		if (process.env.NODE_ENV !== "test") {
			syncClassroom();
		}
	}, [syncClassroom]);

	return (
		<Container className="bg-surface-primary">
			<View className="gap-6 p-5">
				<View className="gap-1">
					<View className="flex-row items-center justify-between">
						<AppText
							variant="heading"
							tone="primary"
							className="font-bold text-[28px]"
						>
							Aulas
						</AppText>
						<Pressable
							testID="sync-classroom-button"
							onPress={() => syncClassroom()}
							className="flex-row items-center gap-1.5 rounded-lg-card border border-border-subtle bg-surface-secondary px-3 py-2"
						>
							<RefreshCw size={14} color="#582CFF" />
							<AppText
								variant="caption"
								tone="primary"
								className="font-semibold text-xs"
							>
								{syncStatus === "syncing" ? "Sincronizando..." : "Sincronizar"}
							</AppText>
						</Pressable>
					</View>
					{lastSyncedAt && (
						<AppText variant="caption" tone="muted" className="text-xs">
							{lastSyncedAt}
						</AppText>
					)}
				</View>

				<View className="flex-row flex-wrap gap-2">
					{semesterOptions.map((sem) => {
						const isActive = selectedSemester === sem;
						const label = sem === "todos" ? "Todos" : sem;
						return (
							<Pressable
								key={sem}
								testID={`semester-chip-${sem}`}
								onPress={() => setSelectedSemester(sem)}
								className={`rounded-full border px-3.5 py-1.5 ${
									isActive
										? "border-brand-primary bg-brand-primary"
										: "border-border-subtle bg-surface-secondary"
								}`}
							>
								<AppText
									variant="caption"
									tone={isActive ? "primary" : "muted"}
									className={`font-semibold text-xs ${
										isActive ? "text-white" : ""
									}`}
								>
									{label}
								</AppText>
							</Pressable>
						);
					})}
				</View>

				<NextClassHero session={next} />

				<View className="gap-3">
					<AppText
						variant="heading"
						tone="primary"
						className="font-semibold text-lg"
					>
						Todas as aulas
					</AppText>
					<View className="gap-2.5">
						{sessions.map((session) => (
							<ClassCard
								key={session.id}
								session={session}
								onPress={() =>
									router.push(`/aula-detalhes?id=${session.id}` as Href)
								}
							/>
						))}
					</View>
				</View>
			</View>
		</Container>
	);
}
