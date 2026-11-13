import { useRouter } from "expo-router";
import {
	ArrowDown,
	ArrowUp,
	ChevronRight,
	FileText,
	FolderInput,
	FolderPlus,
	Link2,
	MoreHorizontal,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	X,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";
import { Container } from "@/components/container";
import {
	ActionSheetModal,
	type SheetAction,
} from "@/components/molecules/ActionSheetModal";
import { FolderRow } from "@/components/molecules/FolderRow";
import { NamePromptModal } from "@/components/molecules/NamePromptModal";
import { MoveToSheet } from "@/components/organisms/MoveToSheet";
import {
	displayTags,
	type NoteFolder,
	type NoteSummary,
} from "@/features/notas/notas.model";
import { useNotasViewModel } from "@/features/notas/notas.viewmodel";

type SelectedItem =
	| { kind: "note"; note: NoteSummary }
	| { kind: "folder"; folder: NoteFolder };

type NamePrompt = { mode: "create" } | { mode: "rename"; folder: NoteFolder };

export function NotasScreen() {
	const router = useRouter();
	const vm = useNotasViewModel();

	const [selected, setSelected] = useState<SelectedItem | null>(null);
	const [moving, setMoving] = useState<SelectedItem | null>(null);
	const [deletingFolder, setDeletingFolder] = useState<NoteFolder | null>(null);
	const [namePrompt, setNamePrompt] = useState<NamePrompt | null>(null);
	const [nameError, setNameError] = useState<string | null>(null);
	const [nameBusy, setNameBusy] = useState(false);

	const openNote = (id: string) =>
		router.push({ pathname: "/nota-detalhes", params: { id } });

	const handleCreateNote = async () => {
		const created = await vm.createNote();
		if (created) openNote(created.id);
	};

	const handleConfirmName = async (name: string) => {
		if (!namePrompt) return;
		setNameBusy(true);
		const error =
			namePrompt.mode === "create"
				? await vm.createFolder(name)
				: await vm.renameFolder(namePrompt.folder.id, name);
		setNameBusy(false);
		setNameError(error);
		if (!error) setNamePrompt(null);
	};

	const itemActions = (item: SelectedItem): SheetAction[] => {
		const kind = item.kind;
		const id = kind === "note" ? item.note.id : item.folder.id;
		const close = () => setSelected(null);
		const actions: SheetAction[] = [];
		if (kind === "folder") {
			actions.push({
				key: "renomear",
				label: "Renomear",
				icon: <Pencil size={18} color="#FFFFFF" />,
				onPress: () => {
					close();
					setNameError(null);
					setNamePrompt({ mode: "rename", folder: item.folder });
				},
			});
		}
		actions.push(
			{
				key: "mover",
				label: "Mover para…",
				icon: <FolderInput size={18} color="#FFFFFF" />,
				onPress: () => {
					close();
					setMoving(item);
				},
			},
			{
				key: "subir",
				label: "Subir",
				icon: <ArrowUp size={18} color="#FFFFFF" />,
				onPress: () => {
					close();
					void vm.shiftItem(kind, id, -1);
				},
			},
			{
				key: "descer",
				label: "Descer",
				icon: <ArrowDown size={18} color="#FFFFFF" />,
				onPress: () => {
					close();
					void vm.shiftItem(kind, id, 1);
				},
			},
			{
				key: "excluir",
				label: "Mover para a lixeira",
				tone: "danger",
				icon: <Trash2 size={18} color="#EF4444" />,
				onPress: () => {
					close();
					if (item.kind === "note") void vm.trashNote(item.note.id);
					else setDeletingFolder(item.folder);
				},
			},
		);
		return actions;
	};

	const renderNoteCard = (note: NoteSummary, showPath: boolean) => (
		<View
			key={note.id}
			testID={`note-card-${note.id}`}
			className="gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-4"
		>
			<View className="flex-row items-start gap-2">
				<Pressable
					testID={`note-card-${note.id}-abrir`}
					onPress={() => openNote(note.id)}
					className="flex-1 gap-2"
					accessibilityRole="button"
					accessibilityLabel={`Abrir nota ${note.title}`}
				>
					<View className="flex-row items-start justify-between gap-2">
						<AppText
							variant="heading"
							tone="primary"
							className="flex-1 font-semibold text-base"
						>
							{note.title}
						</AppText>
						{note.linkCount > 0 ? (
							<View className="flex-row items-center gap-1 rounded-sm-card bg-accent-light px-2 py-1">
								<Link2 size={12} color="#582CFF" />
								<AppText
									variant="caption"
									tone="accent"
									className="font-bold text-[11px]"
								>
									{note.linkCount}
								</AppText>
							</View>
						) : null}
					</View>
					{showPath ? (
						<AppText variant="caption" tone="muted" className="text-[11px]">
							{vm.folderPathLabel(note.folderId)}
						</AppText>
					) : null}
					<AppText
						variant="body"
						tone="secondary"
						numberOfLines={2}
						className="text-[13px] leading-5"
					>
						{note.preview || "Sem conteúdo."}
					</AppText>
				</Pressable>
				{!showPath ? (
					<Pressable
						testID={`note-card-${note.id}-acoes`}
						onPress={() => setSelected({ kind: "note", note })}
						hitSlop={10}
						accessibilityRole="button"
						accessibilityLabel={`Ações da nota ${note.title}`}
						className="p-1"
					>
						<MoreHorizontal size={18} color="#A1A1AA" />
					</Pressable>
				) : null}
			</View>
			<View className="flex-row flex-wrap items-center justify-between gap-2 border-border-subtle/50 border-t pt-2.5">
				<View className="flex-1 flex-row flex-wrap gap-1.5">
					{displayTags(note).map((tag) => (
						<Chip
							key={tag}
							label={tag}
							tone={tag.startsWith("#") ? "accent" : "muted"}
						/>
					))}
				</View>
				<AppText variant="caption" tone="muted" className="text-[11px]">
					{new Date(note.updatedAt).toLocaleDateString("pt-BR")}
				</AppText>
			</View>
		</View>
	);

	const isEmptyFolder =
		vm.childFolders.length === 0 && vm.childNotes.length === 0;

	return (
		<Container className="bg-surface-primary">
			<View className="gap-5 p-5">
				{/* Cabeçalho */}
				<View className="flex-row items-center justify-between gap-3">
					<View className="flex-1 gap-1">
						<AppText
							variant="heading"
							tone="primary"
							className="font-bold text-[24px]"
						>
							Minhas Notas
						</AppText>
						<AppText variant="caption" tone="muted" className="text-[12px]">
							{vm.notes.length} {vm.notes.length === 1 ? "nota" : "notas"} em{" "}
							{vm.folders.length} {vm.folders.length === 1 ? "pasta" : "pastas"}
						</AppText>
					</View>
					<Pressable
						testID="btn-abrir-lixeira"
						onPress={() => router.push("/lixeira")}
						accessibilityRole="button"
						accessibilityLabel="Abrir lixeira"
						className="h-10 w-10 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
					>
						<Trash2 size={18} color="#A1A1AA" />
					</Pressable>
				</View>

				{/* Busca */}
				<View className="flex-row items-center gap-2 rounded-lg-card border border-border-subtle bg-surface-secondary px-3.5 py-2.5">
					<Search size={18} color="#A1A1AA" />
					<TextInput
						testID="input-busca-notas"
						value={vm.search}
						onChangeText={vm.setSearch}
						placeholder="Buscar por título ou conteúdo..."
						placeholderTextColor="#71717A"
						className="flex-1 font-body text-foreground-primary text-sm"
					/>
					{vm.search.length > 0 && (
						<Pressable
							testID="btn-limpar-busca"
							onPress={() => vm.setSearch("")}
							hitSlop={8}
						>
							<X size={16} color="#A1A1AA" />
						</Pressable>
					)}
				</View>

				{/* Tags */}
				{vm.allTags.length > 0 ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ gap: 8 }}
					>
						<Pressable
							testID="tag-todas"
							onPress={() => vm.setSelectedTag(null)}
						>
							<Chip
								label="Todas"
								tone={vm.selectedTag === null ? "accent" : "muted"}
							/>
						</Pressable>
						{vm.allTags.map((tag) => (
							<Pressable
								key={tag}
								testID={`tag-${tag}`}
								onPress={() =>
									vm.setSelectedTag(vm.selectedTag === tag ? null : tag)
								}
							>
								<Chip
									label={tag}
									tone={vm.selectedTag === tag ? "accent" : "muted"}
								/>
							</Pressable>
						))}
					</ScrollView>
				) : null}

				{vm.actionError ? (
					<Pressable
						testID="notas-erro-acao"
						onPress={vm.clearActionError}
						className="flex-row items-center justify-between gap-2 rounded-lg-card border border-danger/40 bg-danger/10 p-3"
					>
						<AppText
							variant="caption"
							tone="danger"
							className="flex-1 text-[13px]"
						>
							{vm.actionError}
						</AppText>
						<X size={14} color="#EF4444" />
					</Pressable>
				) : null}

				{vm.status === "error" && vm.notes.length === 0 ? (
					<View
						testID="notas-erro-carregar"
						className="items-center gap-3 rounded-lg-card border border-border-subtle border-dashed p-6"
					>
						<AppText variant="body" tone="secondary" className="text-center">
							{vm.loadError}
						</AppText>
						<AppButton
							testID="btn-recarregar-notas"
							label="Tentar de novo"
							variant="secondary"
							icon={<RefreshCw size={16} color="#FFFFFF" />}
							onPress={() => void vm.reload()}
						/>
					</View>
				) : vm.status !== "ready" && vm.notes.length === 0 ? (
					<AppText
						testID="notas-carregando"
						variant="body"
						tone="muted"
						className="text-center"
					>
						Carregando suas notas...
					</AppText>
				) : vm.isFiltering ? (
					/* Resultados da busca, de todas as pastas */
					<View className="gap-3">
						<AppText variant="caption" tone="muted" className="text-[12px]">
							{vm.searching
								? "Buscando..."
								: `${vm.filteredNotes.length} ${vm.filteredNotes.length === 1 ? "nota encontrada" : "notas encontradas"}`}
						</AppText>
						{!vm.searching && vm.filteredNotes.length === 0 ? (
							<View
								testID="empty-notes-view"
								className="items-center gap-2 rounded-lg-card border border-border-subtle border-dashed p-8"
							>
								<FileText size={32} color="#71717A" />
								<AppText variant="body" tone="muted" className="text-center">
									Nenhuma nota encontrada para os critérios selecionados.
								</AppText>
							</View>
						) : (
							vm.filteredNotes.map((note) => renderNoteCard(note, true))
						)}
					</View>
				) : (
					/* Navegador de pastas */
					<View className="gap-4">
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							testID="breadcrumb"
						>
							<View className="flex-row items-center gap-1">
								<Pressable
									testID="breadcrumb-raiz"
									onPress={() => vm.openFolder(null)}
									hitSlop={6}
								>
									<AppText
										variant="caption"
										tone={vm.currentFolderId === null ? "primary" : "accent"}
										className="font-semibold text-[13px]"
									>
										Minhas notas
									</AppText>
								</Pressable>
								{vm.breadcrumb.map((folder) => (
									<View key={folder.id} className="flex-row items-center gap-1">
										<ChevronRight size={14} color="#71717A" />
										<Pressable
											testID={`breadcrumb-${folder.id}`}
											onPress={() => vm.openFolder(folder.id)}
											hitSlop={6}
										>
											<AppText
												variant="caption"
												tone={
													folder.id === vm.currentFolderId
														? "primary"
														: "accent"
												}
												className="font-semibold text-[13px]"
											>
												{folder.name}
											</AppText>
										</Pressable>
									</View>
								))}
							</View>
						</ScrollView>

						<View className="flex-row gap-3">
							<View className="flex-1">
								<AppButton
									testID="btn-criar-nota"
									label="Nova nota"
									icon={<Plus size={18} color="#FFFFFF" />}
									onPress={() => void handleCreateNote()}
								/>
							</View>
							<View className="flex-1">
								<AppButton
									testID="btn-criar-pasta"
									label="Nova pasta"
									variant="secondary"
									icon={<FolderPlus size={18} color="#FFFFFF" />}
									onPress={() => {
										setNameError(null);
										setNamePrompt({ mode: "create" });
									}}
								/>
							</View>
						</View>

						{isEmptyFolder ? (
							<View
								testID="empty-notes-view"
								className="items-center gap-2 rounded-lg-card border border-border-subtle border-dashed p-8"
							>
								<FileText size={32} color="#71717A" />
								<AppText variant="body" tone="muted" className="text-center">
									{vm.currentFolder
										? "Esta pasta está vazia."
										: "Você ainda não tem notas. Crie a primeira!"}
								</AppText>
							</View>
						) : (
							<View className="gap-3">
								{vm.childFolders.map((folder) => (
									<FolderRow
										key={folder.id}
										testID={`folder-row-${folder.id}`}
										name={folder.name}
										summary={vm.folderSummary(folder.id)}
										onPress={() => vm.openFolder(folder.id)}
										onOpenActions={() =>
											setSelected({ kind: "folder", folder })
										}
									/>
								))}
								{vm.childNotes.map((note) => renderNoteCard(note, false))}
							</View>
						)}
					</View>
				)}
			</View>

			<ActionSheetModal
				testID="acoes-item"
				visible={selected !== null}
				title={
					selected?.kind === "note"
						? selected.note.title
						: (selected?.folder.name ?? "")
				}
				subtitle={selected?.kind === "note" ? "Nota" : "Pasta"}
				actions={selected ? itemActions(selected) : []}
				onClose={() => setSelected(null)}
			/>

			<ActionSheetModal
				testID="excluir-pasta"
				visible={deletingFolder !== null}
				title={`Excluir "${deletingFolder?.name ?? ""}"?`}
				subtitle="O que estiver dentro pode subir para a pasta de cima ou ir junto para a lixeira. Itens na lixeira são apagados de vez em 30 dias."
				actions={
					deletingFolder
						? [
								{
									key: "mover-conteudo",
									label: "Excluir só a pasta e manter o conteúdo",
									icon: <FolderInput size={18} color="#FFFFFF" />,
									onPress: () => {
										const folder = deletingFolder;
										setDeletingFolder(null);
										void vm.deleteFolder(folder.id, "moveToParent");
									},
								},
								{
									key: "tudo",
									label: "Enviar a pasta e tudo dentro para a lixeira",
									tone: "danger",
									icon: <Trash2 size={18} color="#EF4444" />,
									onPress: () => {
										const folder = deletingFolder;
										setDeletingFolder(null);
										void vm.deleteFolder(folder.id, "trashAll");
									},
								},
							]
						: []
				}
				onClose={() => setDeletingFolder(null)}
			/>

			<MoveToSheet
				visible={moving !== null}
				itemName={
					moving?.kind === "note"
						? moving.note.title
						: (moving?.folder.name ?? "")
				}
				folders={vm.folders}
				currentParentId={
					moving?.kind === "note"
						? moving.note.folderId
						: (moving?.folder.parentId ?? null)
				}
				disabledFolderIds={
					moving?.kind === "folder"
						? vm.blockedDestinations(moving.folder.id)
						: []
				}
				onSelect={(destinationId) => {
					const item = moving;
					setMoving(null);
					if (!item) return;
					void vm.moveItem(
						item.kind,
						item.kind === "note" ? item.note.id : item.folder.id,
						destinationId,
					);
				}}
				onClose={() => setMoving(null)}
			/>

			<NamePromptModal
				testID="nome-pasta"
				visible={namePrompt !== null}
				title={namePrompt?.mode === "rename" ? "Renomear pasta" : "Nova pasta"}
				label="Nome da pasta"
				placeholder="Ex.: Banco de Dados II"
				initialValue={
					namePrompt?.mode === "rename" ? namePrompt.folder.name : ""
				}
				confirmLabel={
					namePrompt?.mode === "rename" ? "Renomear" : "Criar pasta"
				}
				validate={vm.validateFolderName}
				error={nameError}
				busy={nameBusy}
				onConfirm={(name) => void handleConfirmName(name)}
				onClose={() => setNamePrompt(null)}
			/>
		</Container>
	);
}
