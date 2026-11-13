import { useLocalSearchParams, useRouter } from "expo-router";
import {
	Bold,
	Brackets,
	Check,
	ChevronLeft,
	Code,
	Edit3,
	Eye,
	FilePlus,
	Heading2,
	Italic,
	Link2,
	List,
	ListTodo,
	Lock,
	RefreshCw,
	Sparkles,
	Trash2,
	TriangleAlert,
	X,
} from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";
import { Container } from "@/components/container";
import { ActionSheetModal } from "@/components/molecules/ActionSheetModal";
import { BacklinkCard } from "@/components/molecules/BacklinkCard";
import { MarkdownView } from "@/components/molecules/MarkdownView";
import { TabSwitcher } from "@/components/molecules/TabSwitcher";
import type { FormatKind } from "@/features/notas/editor";
import {
	type NoteViewMode,
	type SaveStatus,
	useNotaDetalhesViewModel,
} from "@/features/notas/notaDetalhes.viewmodel";

const TOOLBAR: Array<{ kind: FormatKind; label: string; Icon: typeof Bold }> = [
	{ kind: "bold", label: "Negrito", Icon: Bold },
	{ kind: "italic", label: "Itálico", Icon: Italic },
	{ kind: "heading", label: "Título", Icon: Heading2 },
	{ kind: "bullet", label: "Lista", Icon: List },
	{ kind: "task", label: "Tarefa", Icon: ListTodo },
	{ kind: "code", label: "Código", Icon: Code },
	{ kind: "wikilink", label: "Link para nota", Icon: Brackets },
];

const SAVE_LABEL: Record<SaveStatus, string> = {
	saved: "Salvo",
	dirty: "Alterações não salvas",
	saving: "Salvando...",
	error: "Não salvo",
	conflict: "Conflito de versão",
};

export function NotaDetalhesScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const vm = useNotaDetalhesViewModel(params.id);

	const [pendingLink, setPendingLink] = useState<string | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);
	const [confirmTrash, setConfirmTrash] = useState(false);
	const [trashError, setTrashError] = useState<string | null>(null);

	const [isAiModalOpen, setIsAiModalOpen] = useState(false);
	const [selectedAiTargetId, setSelectedAiTargetId] = useState<string | null>(
		null,
	);
	const [aiReason, setAiReason] = useState("");
	const [aiError, setAiError] = useState<string | null>(null);

	const [isManualModalOpen, setIsManualModalOpen] = useState(false);
	const [selectedManualTargetId, setSelectedManualTargetId] = useState<
		string | null
	>(null);
	const [manualReason, setManualReason] = useState("");
	const [manualError, setManualError] = useState<string | null>(null);

	const openNote = (id: string) =>
		router.push({ pathname: "/nota-detalhes", params: { id } });

	if (vm.loadState === "loading") {
		return (
			<Container className="bg-surface-primary">
				<View className="flex-1 items-center justify-center p-5">
					<AppText testID="nota-carregando" variant="body" tone="muted">
						Abrindo nota...
					</AppText>
				</View>
			</Container>
		);
	}

	if (vm.loadState !== "ready" || !vm.note) {
		return (
			<Container className="bg-surface-primary">
				<View className="flex-1 items-center justify-center gap-4 p-5">
					<AppText
						variant="heading"
						tone="primary"
						className="text-center text-lg"
					>
						{vm.loadState === "error" ? vm.loadError : "Nota não encontrada."}
					</AppText>
					{vm.loadState === "error" ? (
						<AppButton
							testID="btn-recarregar-nota"
							label="Tentar de novo"
							variant="secondary"
							icon={<RefreshCw size={16} color="#FFFFFF" />}
							onPress={() => void vm.reload()}
						/>
					) : null}
					<AppButton
						label="Voltar para Notas"
						onPress={() => router.replace("/(tabs)/notas")}
					/>
				</View>
			</Container>
		);
	}

	const note = vm.note;

	const handleWikilinkPress = (target: string) => {
		const id = vm.resolveTarget(target);
		if (id) {
			if (id !== note.id) openNote(id);
			return;
		}
		setLinkError(null);
		setPendingLink(target);
	};

	const handleCreateFromLink = async () => {
		if (!pendingLink) return;
		const result = await vm.createNoteFromLink(pendingLink);
		if ("error" in result) {
			setLinkError(result.error);
			return;
		}
		setPendingLink(null);
		openNote(result.id);
	};

	const handleConfirmAiSuggestion = async () => {
		if (!selectedAiTargetId) {
			setAiError("Selecione uma sugestão para vincular.");
			return;
		}
		if (aiReason.trim().length < 3) {
			setAiError(
				"A justificativa é obrigatória e deve ter pelo menos 3 caracteres.",
			);
			return;
		}
		try {
			await vm.addLink({
				targetNoteId: selectedAiTargetId,
				reason: aiReason.trim(),
				linkType: "ai_suggested",
			});
			setIsAiModalOpen(false);
			setSelectedAiTargetId(null);
			setAiReason("");
			setAiError(null);
		} catch (err) {
			setAiError(
				err instanceof Error ? err.message : "Erro ao adicionar vínculo.",
			);
		}
	};

	const handleConfirmManualLink = async () => {
		if (!selectedManualTargetId) {
			setManualError("Selecione uma nota de destino.");
			return;
		}
		if (manualReason.trim().length < 3) {
			setManualError(
				"A justificativa é obrigatória e deve ter pelo menos 3 caracteres.",
			);
			return;
		}
		try {
			await vm.addLink({
				targetNoteId: selectedManualTargetId,
				reason: manualReason.trim(),
			});
			setIsManualModalOpen(false);
			setSelectedManualTargetId(null);
			setManualReason("");
			setManualError(null);
		} catch (err) {
			setManualError(
				err instanceof Error ? err.message : "Erro ao criar vínculo.",
			);
		}
	};

	const handleTrash = async () => {
		const error = await vm.trashCurrent();
		if (error) {
			setTrashError(error);
			return;
		}
		setConfirmTrash(false);
		router.back();
	};

	const TABS = [
		{
			key: "view",
			label: "Visualizar",
			icon: (
				<Eye size={16} color={vm.mode === "view" ? "#FFFFFF" : "#A1A1AA"} />
			),
		},
		{
			key: "edit",
			label: "Editar",
			icon: (
				<Edit3 size={16} color={vm.mode === "edit" ? "#FFFFFF" : "#A1A1AA"} />
			),
		},
	] as const;

	const autoTagChips = vm.autoTags.map((tag) => (
		<Chip
			key={`auto-${tag}`}
			testID={`auto-tag-${tag}`}
			label={`#${tag}`}
			tone="accent"
			icon={<Lock size={10} color="#582CFF" />}
		/>
	));

	return (
		<Container className="bg-surface-primary">
			<View className="gap-5 p-5">
				{/* Barra superior */}
				<View className="flex-row items-center justify-between">
					<Pressable
						testID="btn-voltar-notas"
						onPress={() => router.back()}
						accessibilityRole="button"
						accessibilityLabel="Voltar"
						className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
					>
						<ChevronLeft size={18} color="#FFFFFF" />
					</Pressable>
					<AppText
						testID="status-salvamento"
						variant="caption"
						tone={
							vm.saveStatus === "error" || vm.saveStatus === "conflict"
								? "danger"
								: "muted"
						}
						className="text-[12px]"
					>
						{vm.mode === "edit" || vm.saveStatus !== "saved"
							? SAVE_LABEL[vm.saveStatus]
							: ""}
					</AppText>
					<Pressable
						testID="btn-lixeira-nota"
						onPress={() => {
							setTrashError(null);
							setConfirmTrash(true);
						}}
						accessibilityRole="button"
						accessibilityLabel="Mover nota para a lixeira"
						className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
					>
						<Trash2 size={16} color="#A1A1AA" />
					</Pressable>
				</View>

				{vm.saveStatus === "error" && vm.saveError ? (
					<View
						testID="aviso-erro-salvar"
						className="gap-2 rounded-lg-card border border-danger/40 bg-danger/10 p-3"
					>
						<AppText variant="caption" tone="danger" className="text-[13px]">
							{vm.saveError}
						</AppText>
						<AppButton
							testID="btn-tentar-salvar"
							label="Tentar salvar de novo"
							variant="secondary"
							onPress={() => void vm.save()}
						/>
					</View>
				) : null}

				{vm.saveStatus === "conflict" ? (
					<View
						testID="aviso-conflito"
						className="gap-3 rounded-lg-card border border-warning/40 bg-warning/10 p-3"
					>
						<View className="flex-row items-center gap-2">
							<TriangleAlert size={16} color="#F59E0B" />
							<AppText
								variant="body"
								tone="warning"
								className="flex-1 font-semibold text-[13px]"
							>
								{vm.saveError ?? "Esta nota mudou em outro lugar."}
							</AppText>
						</View>
						<View className="flex-row gap-2">
							<View className="flex-1">
								<AppButton
									testID="btn-manter-minha-versao"
									label="Manter a minha"
									onPress={() => void vm.resolveConflict("mine")}
								/>
							</View>
							<View className="flex-1">
								<AppButton
									testID="btn-usar-versao-servidor"
									label="Usar a do servidor"
									variant="secondary"
									onPress={() => void vm.resolveConflict("server")}
								/>
							</View>
						</View>
					</View>
				) : null}

				<TabSwitcher
					tabs={TABS}
					activeKey={vm.mode}
					onChange={(key) => vm.setMode(key as NoteViewMode)}
				/>

				{vm.mode === "edit" ? (
					<View className="gap-4">
						<View className="gap-1.5">
							<AppText
								variant="caption"
								tone="secondary"
								className="font-semibold"
							>
								Título da nota
							</AppText>
							<TextInput
								testID="input-edit-title"
								value={vm.draftTitle}
								onChangeText={vm.setDraftTitle}
								placeholder="Título da nota..."
								placeholderTextColor="#71717A"
								className="rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5 font-body text-base text-foreground-primary"
							/>
							<AppText variant="caption" tone="muted" className="text-[11px]">
								Outras notas usam este título em [[links]]: ao renomear, elas
								são atualizadas.
							</AppText>
						</View>

						<View className="gap-1.5">
							<AppText
								variant="caption"
								tone="secondary"
								className="font-semibold"
							>
								Tags (separadas por vírgula)
							</AppText>
							<TextInput
								testID="input-edit-tags"
								value={vm.draftTags}
								onChangeText={vm.setDraftTags}
								placeholder="ex: Arquitetura, SOLID, TCC"
								placeholderTextColor="#71717A"
								className="rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5 font-body text-foreground-primary text-sm"
							/>
							{autoTagChips.length > 0 ? (
								<View className="flex-row flex-wrap items-center gap-1.5">
									{autoTagChips}
									<AppText
										variant="caption"
										tone="muted"
										className="text-[11px]"
									>
										da aula vinculada
									</AppText>
								</View>
							) : null}
						</View>

						<View className="gap-1.5">
							<AppText
								variant="caption"
								tone="secondary"
								className="font-semibold"
							>
								Conteúdo (Markdown)
							</AppText>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								keyboardShouldPersistTaps="always"
							>
								<View className="flex-row gap-1.5">
									{TOOLBAR.map(({ kind, label, Icon }) => (
										<Pressable
											key={kind}
											testID={`toolbar-${kind}`}
											onPress={() => vm.format(kind)}
											accessibilityRole="button"
											accessibilityLabel={label}
											className="h-9 w-10 items-center justify-center rounded-sm-card border border-border-subtle bg-surface-secondary active:border-accent-primary"
										>
											<Icon size={16} color="#FFFFFF" />
										</Pressable>
									))}
								</View>
							</ScrollView>
							<TextInput
								testID="input-edit-content"
								value={vm.draftContent}
								onChangeText={vm.setDraftContent}
								selection={vm.forcedSelection}
								onSelectionChange={(event) =>
									vm.onSelectionChange(event.nativeEvent.selection)
								}
								placeholder="Escreva em Markdown. Use [[Título]] para ligar a outra nota."
								placeholderTextColor="#71717A"
								multiline
								textAlignVertical="top"
								className="min-h-[240px] rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5 font-body text-foreground-primary text-sm leading-5"
							/>

							{vm.wikilinkQuery !== null ? (
								<View
									testID="sugestoes-wikilink"
									className="gap-1 rounded-lg-card border border-accent-primary/50 bg-surface-secondary p-2"
								>
									<AppText
										variant="caption"
										tone="muted"
										className="px-1 text-[11px]"
									>
										Ligar a uma nota
									</AppText>
									{vm.wikilinkSuggestions.length === 0 ? (
										<AppText
											variant="caption"
											tone="muted"
											className="px-1 py-2 text-[12px]"
										>
											Nenhuma nota com esse título. O link fica pendente até a
											nota existir.
										</AppText>
									) : (
										vm.wikilinkSuggestions.map((suggestion) => (
											<Pressable
												key={suggestion.id}
												testID={`sugestao-wikilink-${suggestion.id}`}
												onPress={() =>
													vm.pickWikilinkSuggestion(suggestion.title)
												}
												className="rounded-sm-card px-2 py-2.5 active:bg-accent-light"
											>
												<AppText
													variant="body"
													tone="primary"
													className="text-[14px]"
													numberOfLines={1}
												>
													{suggestion.title}
												</AppText>
											</Pressable>
										))
									)}
								</View>
							) : null}
						</View>

						<AppButton
							testID="btn-concluir-edicao"
							label="Concluir"
							icon={<Check size={16} color="#FFFFFF" />}
							onPress={() => vm.setMode("view")}
						/>
					</View>
				) : (
					<View className="gap-6">
						<View className="gap-3.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
							<AppText
								variant="heading"
								tone="primary"
								className="font-bold text-[22px]"
							>
								{note.title}
							</AppText>

							{vm.visibleTags.length > 0 ? (
								<View className="flex-row flex-wrap gap-1.5">
									{autoTagChips}
									{note.tags.map((tag) => (
										<Chip key={tag} label={tag} tone="muted" />
									))}
								</View>
							) : null}

							<View className="border-border-subtle/60 border-t pt-3">
								<MarkdownView
									testID="note-markdown-content"
									content={note.content}
									onPressWikilink={handleWikilinkPress}
									isWikilinkResolved={(target) =>
										vm.resolveTarget(target) !== null
									}
								/>
							</View>

							{vm.unresolvedTargets.length > 0 ? (
								<AppText
									testID="links-pendentes"
									variant="caption"
									tone="muted"
									className="text-[11px]"
								>
									Links pendentes (toque para criar a nota):{" "}
									{vm.unresolvedTargets.join(", ")}
								</AppText>
							) : null}

							<AppText
								variant="caption"
								tone="muted"
								className="pt-1 text-[11px]"
							>
								Última atualização:{" "}
								{new Date(note.updatedAt).toLocaleDateString("pt-BR")} às{" "}
								{new Date(note.updatedAt).toLocaleTimeString("pt-BR", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</AppText>
						</View>

						<View className="gap-2.5">
							<AppButton
								testID="btn-sugerir-ia"
								label="Sugerir Conexões (IA)"
								icon={<Sparkles size={16} color="#FFFFFF" />}
								onPress={() => {
									setIsAiModalOpen(true);
									setAiError(null);
									void vm.loadSuggestions();
								}}
							/>
							<AppButton
								testID="btn-adicionar-vinculo-manual"
								label="Adicionar Vínculo Manual"
								variant="secondary"
								icon={<Link2 size={16} color="#FFFFFF" />}
								onPress={() => {
									setIsManualModalOpen(true);
									setManualError(null);
								}}
							/>
						</View>

						<View className="gap-3">
							<View className="flex-row items-center justify-between">
								<AppText
									variant="heading"
									tone="primary"
									className="font-semibold text-base"
								>
									Links desta nota
								</AppText>
								<Chip label={`${note.outboundLinks.length}`} tone="accent" />
							</View>
							{note.outboundLinks.length === 0 ? (
								<View className="rounded-lg-card border border-border-subtle border-dashed p-4">
									<AppText
										variant="caption"
										tone="muted"
										className="text-center"
									>
										Nenhum link ainda. Escreva [[Título]] no texto ou adicione
										um vínculo.
									</AppText>
								</View>
							) : (
								<View className="gap-2.5">
									{note.outboundLinks.map((link) => (
										<BacklinkCard
											key={link.id}
											testID={`outbound-link-${link.id}`}
											title={link.targetNote?.title ?? "Nota conectada"}
											linkType={link.linkType}
											reason={link.reason}
											similarityScore={
												link.linkType === "wikilink"
													? undefined
													: link.similarityScore
											}
											onPress={() => openNote(link.targetNoteId)}
											onDelete={
												link.linkType === "wikilink"
													? undefined
													: () => void vm.removeLink(link.id)
											}
										/>
									))}
								</View>
							)}
						</View>

						<View className="gap-3">
							<View className="flex-row items-center justify-between">
								<AppText
									variant="heading"
									tone="primary"
									className="font-semibold text-base"
								>
									Backlinks (mencionada em)
								</AppText>
								<Chip label={`${note.inboundLinks.length}`} tone="muted" />
							</View>
							{note.inboundLinks.length === 0 ? (
								<View className="rounded-lg-card border border-border-subtle border-dashed p-4">
									<AppText
										variant="caption"
										tone="muted"
										className="text-center"
									>
										Nenhuma outra nota aponta para esta ainda.
									</AppText>
								</View>
							) : (
								<View className="gap-2.5">
									{note.inboundLinks.map((link) => (
										<BacklinkCard
											key={link.id}
											testID={`inbound-link-${link.id}`}
											title={link.sourceNote?.title ?? "Nota de origem"}
											linkType={link.linkType}
											reason={link.reason}
											similarityScore={
												link.linkType === "wikilink"
													? undefined
													: link.similarityScore
											}
											onPress={() => openNote(link.sourceNoteId)}
										/>
									))}
								</View>
							)}
						</View>
					</View>
				)}
			</View>

			{/* Link para nota que ainda não existe */}
			<ActionSheetModal
				testID="criar-nota-do-link"
				visible={pendingLink !== null}
				title={`"${pendingLink ?? ""}" ainda não existe`}
				subtitle={
					linkError ?? "Crie a nota agora; ela fica na mesma pasta desta."
				}
				actions={[
					{
						key: "criar",
						label: "Criar nota",
						icon: <FilePlus size={18} color="#FFFFFF" />,
						onPress: () => void handleCreateFromLink(),
					},
				]}
				onClose={() => setPendingLink(null)}
			/>

			<ActionSheetModal
				testID="confirmar-lixeira"
				visible={confirmTrash}
				title={`Mover "${note.title}" para a lixeira?`}
				subtitle={
					trashError ?? "Você pode restaurar pela lixeira em até 30 dias."
				}
				actions={[
					{
						key: "confirmar",
						label: "Mover para a lixeira",
						tone: "danger",
						icon: <Trash2 size={18} color="#EF4444" />,
						onPress: () => void handleTrash(),
					},
				]}
				onClose={() => setConfirmTrash(false)}
			/>

			{/* Modal: Sugerir Conexões (IA) */}
			<Modal
				visible={isAiModalOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsAiModalOpen(false)}
			>
				<View className="flex-1 items-center justify-center bg-black/80 p-5">
					<View className="max-h-[85%] w-full gap-4 rounded-lg-card border border-border-subtle bg-surface-primary p-5">
						<View className="flex-row items-center justify-between">
							<View className="flex-row items-center gap-2">
								<Sparkles size={18} color="#BF40FF" />
								<AppText
									variant="heading"
									tone="primary"
									className="font-bold text-base"
								>
									Sugestões Conceituais (IA)
								</AppText>
							</View>
							<Pressable
								testID="btn-fechar-modal-ia"
								onPress={() => setIsAiModalOpen(false)}
								hitSlop={8}
							>
								<X size={20} color="#A1A1AA" />
							</Pressable>
						</View>

						<AppText variant="caption" tone="secondary">
							Selecione uma nota candidata e escreva sua justificativa
							conceitual para confirmar o vínculo:
						</AppText>

						{vm.suggestionsLoading ? (
							<AppText variant="caption" tone="muted" className="text-center">
								Buscando sugestões...
							</AppText>
						) : vm.suggestedLinks.length === 0 ? (
							<View className="rounded-lg-card border border-border-subtle border-dashed p-4">
								<AppText variant="caption" tone="muted" className="text-center">
									Nenhuma sugestão nova para esta nota.
								</AppText>
							</View>
						) : (
							<ScrollView className="max-h-56 gap-2">
								{vm.suggestedLinks.map((sug) => {
									const isSelected = selectedAiTargetId === sug.targetNoteId;
									return (
										<Pressable
											key={sug.targetNoteId}
											testID={`ai-suggestion-${sug.targetNoteId}`}
											onPress={() => {
												setSelectedAiTargetId(sug.targetNoteId);
												if (!aiReason) setAiReason(sug.reason);
											}}
											className={`mb-2 gap-1.5 rounded-lg-card border p-3 ${
												isSelected
													? "border-accent-secondary bg-accent-light"
													: "border-border-subtle bg-surface-secondary"
											}`}
										>
											<View className="flex-row items-center justify-between">
												<AppText
													variant="body"
													tone="primary"
													className="flex-1 font-semibold text-sm"
												>
													{sug.targetNoteTitle}
												</AppText>
												<Chip
													label={`${Math.round(Number(sug.similarityScore) * 100)}% afinidade`}
													tone="accent"
												/>
											</View>
											<AppText
												variant="caption"
												tone="muted"
												className="text-[11px] italic"
											>
												Contexto sugerido: "{sug.reason}"
											</AppText>
										</Pressable>
									);
								})}
							</ScrollView>
						)}

						<View className="gap-1.5">
							<AppText
								variant="caption"
								tone="secondary"
								className="font-semibold"
							>
								Frase de Justificativa Semântica (obrigatória)
							</AppText>
							<TextInput
								testID="input-justificativa-ia"
								value={aiReason}
								onChangeText={(val) => {
									setAiReason(val);
									if (aiError) setAiError(null);
								}}
								placeholder="Por que estas notas estão conectadas? (Mín. 3 caracteres)"
								placeholderTextColor="#71717A"
								multiline
								numberOfLines={3}
								className="rounded-lg-card border border-border-subtle bg-surface-secondary p-3 font-body text-foreground-primary text-xs"
							/>
							{aiError ? (
								<AppText
									variant="caption"
									tone="danger"
									className="text-[11px]"
								>
									{aiError}
								</AppText>
							) : null}
						</View>

						<View className="flex-row gap-3 pt-1">
							<View className="flex-1">
								<AppButton
									testID="btn-confirmar-vinculo-ia"
									label="Confirmar Vínculo (IA)"
									disabled={!selectedAiTargetId || aiReason.trim().length < 3}
									onPress={() => void handleConfirmAiSuggestion()}
								/>
							</View>
							<View className="flex-1">
								<AppButton
									label="Fechar"
									variant="secondary"
									onPress={() => setIsAiModalOpen(false)}
								/>
							</View>
						</View>
					</View>
				</View>
			</Modal>

			{/* Modal: Adicionar Vínculo Manual */}
			<Modal
				visible={isManualModalOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsManualModalOpen(false)}
			>
				<View className="flex-1 items-center justify-center bg-black/80 p-5">
					<View className="max-h-[85%] w-full gap-4 rounded-lg-card border border-border-subtle bg-surface-primary p-5">
						<View className="flex-row items-center justify-between">
							<View className="flex-row items-center gap-2">
								<Link2 size={18} color="#582CFF" />
								<AppText
									variant="heading"
									tone="primary"
									className="font-bold text-base"
								>
									Novo Vínculo Manual
								</AppText>
							</View>
							<Pressable
								testID="btn-fechar-modal-manual"
								onPress={() => setIsManualModalOpen(false)}
								hitSlop={8}
							>
								<X size={20} color="#A1A1AA" />
							</Pressable>
						</View>

						<AppText variant="caption" tone="secondary">
							Selecione uma nota de destino e declare explicitamente a razão da
							conexão:
						</AppText>

						{vm.availableNotesForLink.length === 0 ? (
							<View className="rounded-lg-card border border-border-subtle border-dashed p-4">
								<AppText variant="caption" tone="muted" className="text-center">
									Nenhuma outra nota disponível para vincular.
								</AppText>
							</View>
						) : (
							<ScrollView className="max-h-48 gap-2">
								{vm.availableNotesForLink.map((target) => {
									const isSelected = selectedManualTargetId === target.id;
									return (
										<Pressable
											key={target.id}
											testID={`manual-note-${target.id}`}
											onPress={() => setSelectedManualTargetId(target.id)}
											className={`mb-2 flex-row items-center justify-between rounded-lg-card border p-3 ${
												isSelected
													? "border-accent-primary bg-accent-light"
													: "border-border-subtle bg-surface-secondary"
											}`}
										>
											<AppText
												variant="body"
												tone="primary"
												className="flex-1 font-semibold text-sm"
											>
												{target.title}
											</AppText>
											{isSelected && <Check size={16} color="#582CFF" />}
										</Pressable>
									);
								})}
							</ScrollView>
						)}

						<View className="gap-1.5">
							<AppText
								variant="caption"
								tone="secondary"
								className="font-semibold"
							>
								Frase de Justificativa Semântica (obrigatória)
							</AppText>
							<TextInput
								testID="input-justificativa-manual"
								value={manualReason}
								onChangeText={(val) => {
									setManualReason(val);
									if (manualError) setManualError(null);
								}}
								placeholder="Por que estas notas estão conectadas? (Mín. 3 caracteres)"
								placeholderTextColor="#71717A"
								multiline
								numberOfLines={3}
								className="rounded-lg-card border border-border-subtle bg-surface-secondary p-3 font-body text-foreground-primary text-xs"
							/>
							{manualError ? (
								<AppText
									variant="caption"
									tone="danger"
									className="text-[11px]"
								>
									{manualError}
								</AppText>
							) : null}
						</View>

						<View className="flex-row gap-3 pt-1">
							<View className="flex-1">
								<AppButton
									testID="btn-salvar-vinculo-manual"
									label="Criar Vínculo"
									disabled={
										!selectedManualTargetId || manualReason.trim().length < 3
									}
									onPress={() => void handleConfirmManualLink()}
								/>
							</View>
							<View className="flex-1">
								<AppButton
									label="Fechar"
									variant="secondary"
									onPress={() => setIsManualModalOpen(false)}
								/>
							</View>
						</View>
					</View>
				</View>
			</Modal>
		</Container>
	);
}
