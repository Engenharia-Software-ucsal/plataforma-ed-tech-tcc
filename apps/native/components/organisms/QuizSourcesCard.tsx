import {
	Ban,
	Brain,
	ChevronDown,
	ChevronUp,
	FileText,
	Play,
	RotateCw,
	TriangleAlert,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import type { IngestionReason, IngestionStatus } from "@/utils/trpc";

export type QuizSource = {
	id: string;
	name: string;
	/** Sem status (ainda não consultado), o arquivo é tratado como pronto. */
	status?: IngestionStatus;
	reason?: IngestionReason | null;
};

export type QuizSourcesCardProps = {
	sources: QuizSource[];
	onGenerateAll: () => void;
	onGenerateFromSource: (sourceId: string) => void;
	/** Reprocessa os arquivos que falharam. */
	onRetry?: () => void;
};

const UNSUPPORTED_LABEL: Record<IngestionReason, string> = {
	no_file: "Sem arquivo no Drive",
	scanned: "PDF escaneado",
	format: "Formato não suportado",
	error: "Não suportado",
};

// Prontos primeiro; depois o que ainda está sendo lido; por último o que falhou.
const ORDER_RANK: Partial<Record<IngestionStatus, number>> = {
	ready: 0,
	processing: 1,
	pending: 2,
	failed: 3,
};

function isReady(source: QuizSource) {
	return source.status === undefined || source.status === "ready";
}

function rankOf(source: QuizSource) {
	return isReady(source) ? 0 : (ORDER_RANK[source.status as IngestionStatus] ?? 4);
}

function pdfCount(total: number) {
	return total === 1 ? "1 PDF" : `${total} PDFs`;
}

function SourceStatus({ source }: Readonly<{ source: QuizSource }>) {
	switch (source.status) {
		case "pending":
			return (
				<AppText variant="caption" tone="muted" className="text-[11px]">
					Na fila
				</AppText>
			);
		case "processing":
			return (
				<View className="flex-row items-center gap-1.5">
					<ActivityIndicator size="small" color="#582CFF" />
					<AppText variant="caption" tone="muted" className="text-[11px]">
						Lendo…
					</AppText>
				</View>
			);
		case "failed":
			return (
				<AppText variant="caption" tone="warning" className="text-[11px]">
					Falhou ao ler
				</AppText>
			);
		case "unsupported":
			return (
				<AppText variant="caption" tone="muted" className="text-[11px]">
					{UNSUPPORTED_LABEL[source.reason ?? "error"]}
				</AppText>
			);
		default:
			return (
				<AppText variant="caption" tone="success" className="text-[11px]">
					● Pronto
				</AppText>
			);
	}
}

function SourceAction({ source }: Readonly<{ source: QuizSource }>) {
	if (isReady(source)) {
		return (
			<View className="min-h-10 flex-row items-center gap-1.5 rounded-full bg-accent-primary px-3.5">
				<Play size={12} color="#FFFFFF" fill="#FFFFFF" />
				<AppText variant="heading" className="font-semibold text-xs">
					Gerar
				</AppText>
			</View>
		);
	}
	if (source.status === "failed") {
		return (
			<View className="min-h-10 flex-row items-center gap-1.5 rounded-full border border-warning px-3.5">
				<RotateCw size={12} color="#F59E0B" />
				<AppText variant="heading" tone="warning" className="font-semibold text-xs">
					Tentar de novo
				</AppText>
			</View>
		);
	}
	return null;
}

function SourceRow({
	source,
	onPress,
}: Readonly<{ source: QuizSource; onPress: () => void }>) {
	const actionable = isReady(source) || source.status === "failed";
	let icon = <FileText size={16} color="#BF40FF" />;
	if (source.status === "failed") icon = <TriangleAlert size={16} color="#F59E0B" />;
	else if (source.status === "unsupported") icon = <Ban size={16} color="#A1A1AA" />;

	return (
		<Pressable
			testID={`quiz-source-${source.id}`}
			disabled={!actionable}
			onPress={onPress}
			className={`min-h-16 flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3 ${
				actionable ? "active:opacity-80" : "opacity-70"
			}`}
		>
			<View className="size-9 items-center justify-center rounded-lg-card bg-accent-light">
				{icon}
			</View>
			<View className="flex-1 gap-0.5">
				<AppText
					variant="body"
					className="text-[13px]"
					numberOfLines={2}
				>
					{source.name}
				</AppText>
				<SourceStatus source={source} />
			</View>
			<SourceAction source={source} />
		</Pressable>
	);
}

export function QuizSourcesCard({
	sources,
	onGenerateAll,
	onGenerateFromSource,
	onRetry,
}: Readonly<QuizSourcesCardProps>) {
	const [showUnsupported, setShowUnsupported] = useState(false);

	const hasStatus = sources.some((source) => source.status !== undefined);
	const supported = sources.filter((source) => source.status !== "unsupported");
	const unsupported = sources.filter((source) => source.status === "unsupported");
	const ready = supported.filter(isReady);
	const pendingCount = supported.filter(
		(source) => source.status === "pending" || source.status === "processing",
	).length;
	const processing = supported.some((source) => source.status === "processing");
	const percent =
		supported.length === 0 ? 0 : (ready.length / supported.length) * 100;
	const waitingToStart =
		hasStatus && ready.length === 0 && pendingCount > 0 && !processing;
	const ordered = [...supported].sort((a, b) => rankOf(a) - rankOf(b));

	function handlePress(source: QuizSource) {
		if (isReady(source)) onGenerateFromSource(source.id);
		else if (source.status === "failed") onRetry?.();
	}

	const allLabel = `Quiz com todos · ${pdfCount(ready.length)}`;

	return (
		<View className="gap-4">
			<View className="gap-3 rounded-lg-card border border-accent-primary bg-accent-light p-4.5">
				<View className="gap-1">
					<AppText variant="heading" tone="primary" className="font-bold text-sm">
						Quiz de revisão
					</AppText>
					<AppText variant="body" tone="secondary" className="text-xs">
						5 perguntas sorteadas de um banco criado pela IA a partir dos PDFs da
						aula. Priorizamos as que você ainda não respondeu, mas elas podem se
						repetir.
					</AppText>
				</View>

				{hasStatus && supported.length > 0 && (
					<View testID="ingestion-progress" className="gap-1.5">
						<AppText variant="caption" tone="secondary" className="text-[11px]">
							{ready.length} de {supported.length} materiais prontos
							{pendingCount > 0 ? ` · lendo ${pendingCount}…` : ""}
						</AppText>
						<View className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
							<View
								className="h-full rounded-full bg-accent-primary"
								style={{ width: `${percent}%` }}
							/>
						</View>
					</View>
				)}

				{waitingToStart && (
					<AppText variant="caption" tone="muted" className="text-[11px]">
						A leitura começa ao sincronizar com o Classroom. Se demorar, sincronize
						de novo.
					</AppText>
				)}

				<AppButton
					label={allLabel}
					onPress={onGenerateAll}
					disabled={hasStatus && ready.length === 0}
					icon={<Brain size={14} color="#FFFFFF" />}
				/>
				{hasStatus && ready.length > 0 && pendingCount > 0 && (
					<AppText variant="caption" tone="muted" className="text-[11px]">
						Ainda estamos lendo alguns PDFs. O quiz usa só os que já estão prontos.
					</AppText>
				)}
			</View>

			<View className="gap-2">
				<View className="flex-row items-baseline justify-between px-1">
					<AppText variant="heading" className="font-semibold text-xs">
						Quiz por arquivo
					</AppText>
					<AppText variant="caption" tone="muted" className="text-[11px]">
						toque em Gerar
					</AppText>
				</View>

				{ordered.map((source) => (
					<SourceRow
						key={source.id}
						source={source}
						onPress={() => handlePress(source)}
					/>
				))}

				{unsupported.length > 0 && (
					<>
						<Pressable
							testID="toggle-unsupported"
							onPress={() => setShowUnsupported((open) => !open)}
							className="min-h-10 flex-row items-center justify-between rounded-lg-card border border-border-subtle border-dashed px-3 active:opacity-80"
						>
							<AppText variant="caption" tone="muted" className="text-xs">
								{unsupported.length === 1
									? "1 arquivo não suportado"
									: `${unsupported.length} arquivos não suportados`}
							</AppText>
							<View className="flex-row items-center gap-1">
								<AppText variant="caption" tone="muted" className="text-xs">
									{showUnsupported ? "Ocultar" : "Ver"}
								</AppText>
								{showUnsupported ? (
									<ChevronUp size={14} color="#A1A1AA" />
								) : (
									<ChevronDown size={14} color="#A1A1AA" />
								)}
							</View>
						</Pressable>
						{showUnsupported &&
							unsupported.map((source) => (
								<SourceRow
									key={source.id}
									source={source}
									onPress={() => handlePress(source)}
								/>
							))}
					</>
				)}
			</View>
		</View>
	);
}
