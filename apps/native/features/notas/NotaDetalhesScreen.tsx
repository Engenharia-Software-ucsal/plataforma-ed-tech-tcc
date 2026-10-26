import { useLocalSearchParams, useRouter } from "expo-router";
import {
	BookOpen,
	Check,
	ChevronLeft,
	Edit3,
	Link2,
	Sparkles,
	X,
} from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";
import { Container } from "@/components/container";
import { BacklinkCard } from "@/components/molecules/BacklinkCard";
import { TabSwitcher } from "@/components/molecules/TabSwitcher";
import { WikilinkText } from "@/components/molecules/WikilinkText";
import {
	type NoteDetailsMode,
	useNotaDetalhesViewModel,
} from "@/features/notas/notaDetalhes.viewmodel";
import { useNotasViewModel } from "@/features/notas/notas.viewmodel";

export function NotaDetalhesScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ id?: string }>();
	const { notes } = useNotasViewModel();
	const {
		note,
		mode,
		setMode,
		draftTitle,
		setDraftTitle,
		draftContent,
		setDraftContent,
		draftTags,
		setDraftTags,
		saveNote,
		addLink,
		approveAiSuggestion,
		removeLink,
		availableNotesForLink,
		suggestedLinks,
	} = useNotaDetalhesViewModel(params.id);

	// Modals state
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

	if (!note) {
		return (
			<Container className="bg-surface-primary">
				<View className="flex-1 items-center justify-center gap-4 p-5">
					<AppText variant="heading" tone="primary" className="text-lg">
						Nota não encontrada.
					</AppText>
					<AppButton
						label="Voltar para Notas"
						onPress={() => router.replace("/(tabs)/notas")}
					/>
				</View>
			</Container>
		);
	}

	const handleWikilinkPress = (targetTitle: string) => {
		const targetNote = notes.find(
			(n) => n.title.toLowerCase() === targetTitle.toLowerCase(),
		);
		if (targetNote) {
			router.push({
				pathname: "/nota-detalhes",
				params: { id: targetNote.id },
			});
		}
	};

	const handleConfirmAiSuggestion = () => {
		if (!selectedAiTargetId) {
			setAiError("Selecione uma sugestão para vincular.");
			return;
		}
		if (aiReason.trim().length < 3) {
			setAiError("A justificativa é obrigatória e deve ter pelo menos 3 caracteres.");
			return;
		}

		const suggestion = suggestedLinks.find(
			(s) => s.targetNoteId === selectedAiTargetId,
		);

		try {
			approveAiSuggestion({
				targetNoteId: selectedAiTargetId,
				reason: aiReason.trim(),
				similarityScore: suggestion?.similarityScore,
			});
			setIsAiModalOpen(false);
			setSelectedAiTargetId(null);
			setAiReason("");
			setAiError(null);
		} catch (err: any) {
			setAiError(err.message || "Erro ao adicionar vínculo.");
		}
	};

	const handleConfirmManualLink = () => {
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
			addLink({
				targetNoteId: selectedManualTargetId,
				reason: manualReason.trim(),
			});
			setIsManualModalOpen(false);
			setSelectedManualTargetId(null);
			setManualReason("");
			setManualError(null);
		} catch (err: any) {
			setManualError(err.message || "Erro ao criar vínculo.");
		}
	};

	const TABS = [
		{
			key: "reading",
			label: "Modo Leitura",
			icon: (
				<BookOpen
					size={16}
					color={mode === "reading" ? "#FFFFFF" : "#A1A1AA"}
				/>
			),
		},
		{
			key: "editing",
			label: "Modo Edição",
			icon: (
				<Edit3
					size={16}
					color={mode === "editing" ? "#FFFFFF" : "#A1A1AA"}
				/>
			),
		},
	] as const;

	return (
		<Container className="bg-surface-primary">
			<View className="gap-6 p-5">
				{/* Top Bar */}
				<View className="flex-row items-center justify-between">
					<Pressable
						testID="btn-voltar-notas"
						onPress={() => router.back()}
						className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
					>
						<ChevronLeft size={18} color="#FFFFFF" />
					</Pressable>
					<AppText
						variant="heading"
						tone="primary"
						className="font-bold text-base"
					>
						Zettelkasten Note
					</AppText>
					<View className="w-9" />
				</View>

				{/* Reading / Editing Switcher */}
				<TabSwitcher
					tabs={TABS}
					activeKey={mode}
					onChange={(key) => setMode(key as NoteDetailsMode)}
				/>

				{mode === "editing" ? (
					/* Editing Mode */
					<View className="gap-4">
						<View className="gap-1.5">
							<AppText variant="caption" tone="secondary" className="font-semibold">
								Título da Nota
							</AppText>
							<TextInput
								testID="input-edit-title"
								value={draftTitle}
								onChangeText={setDraftTitle}
								placeholder="Título da nota..."
								placeholderTextColor="#71717A"
								className="rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5 font-body text-foreground-primary text-base"
							/>
						</View>

						<View className="gap-1.5">
							<AppText variant="caption" tone="secondary" className="font-semibold">
								Tags (separadas por vírgula)
							</AppText>
							<TextInput
								testID="input-edit-tags"
								value={draftTags}
								onChangeText={setDraftTags}
								placeholder="ex: Arquitetura, SOLID, TCC"
								placeholderTextColor="#71717A"
								className="rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5 font-body text-foreground-primary text-sm"
							/>
						</View>

						<View className="gap-1.5">
							<View className="flex-row items-center justify-between">
								<AppText
									variant="caption"
									tone="secondary"
									className="font-semibold"
								>
									Conteúdo (Markdown com Wikilinks)
								</AppText>
								<AppText variant="caption" tone="accent" className="text-[11px]">
									Ex: [[Título da Nota]]
								</AppText>
							</View>
							<TextInput
								testID="input-edit-content"
								value={draftContent}
								onChangeText={setDraftContent}
								placeholder="Escreva sua reflexão atômica. Use [[Nota Alvo]] para conectar conceitos."
								placeholderTextColor="#71717A"
								multiline
								numberOfLines={8}
								textAlignVertical="top"
								className="min-h-[180px] rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5 font-body text-foreground-primary text-sm leading-5"
							/>
						</View>

						<View className="flex-row gap-3 pt-2">
							<View className="flex-1">
								<AppButton
									testID="btn-salvar-nota"
									label="Salvar Alterações"
									onPress={saveNote}
								/>
							</View>
							<View className="flex-1">
								<AppButton
									testID="btn-cancelar-edicao"
									label="Cancelar"
									variant="secondary"
									onPress={() => setMode("reading")}
								/>
							</View>
						</View>
					</View>
				) : (
					/* Reading Mode */
					<View className="gap-6">
						{/* Main Note Card */}
						<View className="gap-3.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
							<AppText
								variant="heading"
								tone="primary"
								className="font-bold text-[22px]"
							>
								{note.title}
							</AppText>

							<View className="flex-row flex-wrap gap-1.5">
								{note.tags.map((tag) => (
									<Chip key={tag} label={tag} tone="accent" />
								))}
							</View>

							<View className="border-t border-border-subtle/60 pt-3">
								<WikilinkText
									testID="note-wikilink-content"
									content={note.content}
									onPressWikilink={handleWikilinkPress}
								/>
							</View>

							<AppText variant="caption" tone="muted" className="text-[11px] pt-1">
								Última atualização:{" "}
								{new Date(note.updatedAt).toLocaleDateString("pt-BR")}{" "}
								às {new Date(note.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
							</AppText>
						</View>

						{/* Action Buttons for Semantic Links */}
						<View className="gap-2.5">
							<AppButton
								testID="btn-sugerir-ia"
								label="Sugerir Conexões (IA)"
								icon={<Sparkles size={16} color="#FFFFFF" />}
								onPress={() => {
									setIsAiModalOpen(true);
									setAiError(null);
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

						{/* Outbound Links Section */}
						<View className="gap-3">
							<View className="flex-row items-center justify-between">
								<AppText
									variant="heading"
									tone="primary"
									className="font-semibold text-base"
								>
									Notas Conectadas (Outbound)
								</AppText>
								<Chip
									label={`${note.outboundLinks.length}`}
									tone="accent"
								/>
							</View>

							{note.outboundLinks.length === 0 ? (
								<View className="rounded-lg-card border border-dashed border-border-subtle p-4">
									<AppText variant="caption" tone="muted" className="text-center">
										Nenhum vínculo direto originado desta nota. Adicione um vínculo manual ou utilize as sugestões de IA.
									</AppText>
								</View>
							) : (
								<View className="gap-2.5">
									{note.outboundLinks.map((link) => (
										<BacklinkCard
											key={link.id}
											testID={`outbound-link-${link.id}`}
											title={link.targetNote?.title ?? "Nota Conectada"}
											linkType={link.linkType}
											reason={link.reason}
											similarityScore={link.similarityScore}
											onPress={() => {
												router.push({
													pathname: "/nota-detalhes",
													params: { id: link.targetNoteId },
												});
											}}
											onDelete={() => removeLink(link.id)}
										/>
									))}
								</View>
							)}
						</View>

						{/* Inbound Links Section */}
						<View className="gap-3">
							<View className="flex-row items-center justify-between">
								<AppText
									variant="heading"
									tone="primary"
									className="font-semibold text-base"
								>
									Mencionado em (Backlinks Inbound)
								</AppText>
								<Chip
									label={`${note.inboundLinks.length}`}
									tone="muted"
								/>
							</View>

							{note.inboundLinks.length === 0 ? (
								<View className="rounded-lg-card border border-dashed border-border-subtle p-4">
									<AppText variant="caption" tone="muted" className="text-center">
										Nenhuma outra nota referencia esta nota diretamente ainda.
									</AppText>
								</View>
							) : (
								<View className="gap-2.5">
									{note.inboundLinks.map((link) => (
										<BacklinkCard
											key={link.id}
											testID={`inbound-link-${link.id}`}
											title={link.sourceNote?.title ?? "Nota de Origem"}
											linkType={link.linkType}
											reason={link.reason}
											similarityScore={link.similarityScore}
											onPress={() => {
												router.push({
													pathname: "/nota-detalhes",
													params: { id: link.sourceNoteId },
												});
											}}
										/>
									))}
								</View>
							)}
						</View>
					</View>
				)}

				{/* Modal: Sugerir Conexões (IA) */}
				<Modal
					visible={isAiModalOpen}
					transparent
					animationType="fade"
					onRequestClose={() => setIsAiModalOpen(false)}
				>
					<View className="flex-1 items-center justify-center bg-black/80 p-5">
						<View className="w-full max-h-[85%] rounded-lg-card border border-border-subtle bg-surface-primary p-5 gap-4">
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
								Selecione uma nota candidata e escreva sua justificativa conceitual para confirmar o vínculo:
							</AppText>

							{suggestedLinks.length === 0 ? (
								<View className="rounded-lg-card border border-dashed border-border-subtle p-4">
									<AppText variant="caption" tone="muted" className="text-center">
										Todas as notas disponíveis já estão conectadas a esta nota.
									</AppText>
								</View>
							) : (
								<ScrollView className="max-h-56 gap-2">
									{suggestedLinks.map((sug) => {
										const isSelected = selectedAiTargetId === sug.targetNoteId;
										return (
											<Pressable
												key={sug.targetNoteId}
												testID={`ai-suggestion-${sug.targetNoteId}`}
												onPress={() => {
													setSelectedAiTargetId(sug.targetNoteId);
													if (!aiReason) {
														setAiReason(sug.reason);
													}
												}}
												className={`gap-1.5 rounded-lg-card border p-3 mb-2 ${
													isSelected
														? "border-accent-secondary bg-accent-light"
														: "border-border-subtle bg-surface-secondary"
												}`}
											>
												<View className="flex-row items-center justify-between">
													<AppText
														variant="body"
														tone="primary"
														className="font-semibold text-sm flex-1"
													>
														{sug.targetNoteTitle}
													</AppText>
													<Chip label={`${Math.round(Number(sug.similarityScore) * 100)}% afinidade`} tone="accent" />
												</View>
												<AppText variant="caption" tone="muted" className="text-[11px] italic">
													Contexto sugerido: "{sug.reason}"
												</AppText>
											</Pressable>
										);
									})}
								</ScrollView>
							)}

							<View className="gap-1.5">
								<AppText variant="caption" tone="secondary" className="font-semibold">
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
								{aiError && (
									<AppText variant="caption" tone="danger" className="text-[11px]">
										{aiError}
									</AppText>
								)}
							</View>

							<View className="flex-row gap-3 pt-1">
								<View className="flex-1">
									<AppButton
										testID="btn-confirmar-vinculo-ia"
										label="Confirmar Vínculo (IA)"
										disabled={!selectedAiTargetId || aiReason.trim().length < 3}
										onPress={handleConfirmAiSuggestion}
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
						<View className="w-full max-h-[85%] rounded-lg-card border border-border-subtle bg-surface-primary p-5 gap-4">
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
								Selecione uma nota de destino e declare explicitamente a razão da conexão:
							</AppText>

							{availableNotesForLink.length === 0 ? (
								<View className="rounded-lg-card border border-dashed border-border-subtle p-4">
									<AppText variant="caption" tone="muted" className="text-center">
										Nenhuma outra nota disponível para vincular.
									</AppText>
								</View>
							) : (
								<ScrollView className="max-h-48 gap-2">
									{availableNotesForLink.map((target) => {
										const isSelected = selectedManualTargetId === target.id;
										return (
											<Pressable
												key={target.id}
												testID={`manual-note-${target.id}`}
												onPress={() => setSelectedManualTargetId(target.id)}
												className={`flex-row items-center justify-between rounded-lg-card border p-3 mb-2 ${
													isSelected
														? "border-accent-primary bg-accent-light"
														: "border-border-subtle bg-surface-secondary"
												}`}
											>
												<AppText
													variant="body"
													tone="primary"
													className="font-semibold text-sm flex-1"
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
								<AppText variant="caption" tone="secondary" className="font-semibold">
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
								{manualError && (
									<AppText variant="caption" tone="danger" className="text-[11px]">
										{manualError}
									</AppText>
								)}
							</View>

							<View className="flex-row gap-3 pt-1">
								<View className="flex-1">
									<AppButton
										testID="btn-salvar-vinculo-manual"
										label="Criar Vínculo"
										disabled={
											!selectedManualTargetId ||
											manualReason.trim().length < 3
										}
										onPress={handleConfirmManualLink}
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
			</View>
		</Container>
	);
}
