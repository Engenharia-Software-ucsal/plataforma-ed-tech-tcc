import { useRouter } from "expo-router";
import { FileText, Link2, Plus, Search, X } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";
import { Container } from "@/components/container";
import { useNotasViewModel } from "@/features/notas/notas.viewmodel";

export function NotasScreen() {
	const router = useRouter();
	const {
		filteredNotes,
		search,
		setSearch,
		selectedTag,
		setSelectedTag,
		allTags,
		createNote,
	} = useNotasViewModel();

	const handleCreateNote = () => {
		const newNote = createNote({
			title: "Nova Nota Sem Título",
			content: "Comece a escrever sua nota aqui. Use [[Título da Nota]] para conectar conceitos.",
			tags: ["Geral"],
		});
		router.push({
			pathname: "/nota-detalhes",
			params: { id: newNote.id },
		});
	};

	const formattedNotes = useMemo(() => {
		return filteredNotes.map((note) => {
			const cleanPreview = note.content
				.replace(/\[\[(.*?)(?:\|.*?)?\]\]/g, "$1")
				.trim();
			const totalLinks = note.outboundLinks.length + note.inboundLinks.length;
			return {
				...note,
				preview: cleanPreview.length > 0 ? cleanPreview : "Sem conteúdo adicional.",
				totalLinks,
			};
		});
	}, [filteredNotes]);

	return (
		<Container className="bg-surface-primary">
			<View className="gap-5 p-5">
				{/* Header */}
				<View className="flex-row items-center justify-between">
					<View className="gap-1 flex-1">
						<AppText
							variant="heading"
							tone="primary"
							className="font-bold text-[24px]"
						>
							Minhas Notas (Zettelkasten)
						</AppText>
						<AppText variant="caption" tone="muted" className="text-[12px]">
							{filteredNotes.length}{" "}
							{filteredNotes.length === 1 ? "nota encontrada" : "notas encontradas"}{" "}
							na rede de conhecimento
						</AppText>
					</View>
				</View>

				{/* Create Note Button */}
				<AppButton
					testID="btn-criar-nota"
					label="Criar Nova Nota"
					icon={<Plus size={18} color="#FFFFFF" />}
					onPress={handleCreateNote}
				/>

				{/* Search Bar */}
				<View className="flex-row items-center gap-2 rounded-lg-card border border-border-subtle bg-surface-secondary px-3.5 py-2.5">
					<Search size={18} color="#A1A1AA" />
					<TextInput
						testID="input-busca-notas"
						value={search}
						onChangeText={setSearch}
						placeholder="Buscar por título ou conteúdo..."
						placeholderTextColor="#71717A"
						className="flex-1 font-body text-foreground-primary text-sm"
					/>
					{search.length > 0 && (
						<Pressable
							testID="btn-limpar-busca"
							onPress={() => setSearch("")}
							hitSlop={8}
						>
							<X size={16} color="#A1A1AA" />
						</Pressable>
					)}
				</View>

				{/* Horizontal Tags Filter */}
				<View>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ gap: 8 }}
					>
						<Pressable
							testID="tag-todas"
							onPress={() => setSelectedTag(null)}
						>
							<Chip
								label="Todas"
								tone={selectedTag === null ? "accent" : "muted"}
							/>
						</Pressable>
						{allTags.map((tag) => (
							<Pressable
								key={tag}
								testID={`tag-${tag}`}
								onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
							>
								<Chip
									label={tag}
									tone={selectedTag === tag ? "accent" : "muted"}
								/>
							</Pressable>
						))}
					</ScrollView>
				</View>

				{/* Notes List */}
				{formattedNotes.length === 0 ? (
					<View
						testID="empty-notes-view"
						className="items-center justify-center gap-2 rounded-lg-card border border-dashed border-border-subtle p-8"
					>
						<FileText size={32} color="#71717A" />
						<AppText variant="body" tone="muted" className="text-center">
							Nenhuma nota encontrada para os critérios selecionados.
						</AppText>
					</View>
				) : (
					<View className="gap-3">
						{formattedNotes.map((note) => (
							<Pressable
								key={note.id}
								testID={`note-card-${note.id}`}
								onPress={() =>
									router.push({
										pathname: "/nota-detalhes",
										params: { id: note.id },
									})
								}
								className="gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-4 active:border-accent-primary"
							>
								<View className="flex-row items-start justify-between gap-2">
									<AppText
										variant="heading"
										tone="primary"
										className="flex-1 font-semibold text-base"
									>
										{note.title}
									</AppText>
									<View className="flex-row items-center gap-1 rounded-sm-card bg-accent-light px-2 py-1">
										<Link2 size={12} color="#582CFF" />
										<AppText
											variant="caption"
											tone="accent"
											className="font-bold text-[11px]"
										>
											{note.totalLinks} {note.totalLinks === 1 ? "vínculo" : "vínculos"}
										</AppText>
									</View>
								</View>

								<AppText
									variant="body"
									tone="secondary"
									numberOfLines={2}
									className="text-[13px] leading-5"
								>
									{note.preview}
								</AppText>

								<View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-border-subtle/50 pt-2.5">
									<View className="flex-row flex-wrap gap-1.5">
										{note.tags.map((tag) => (
											<Chip key={tag} label={tag} tone="muted" />
										))}
									</View>
									<AppText
										variant="caption"
										tone="muted"
										className="text-[11px]"
									>
										{new Date(note.updatedAt).toLocaleDateString("pt-BR")}
									</AppText>
								</View>
							</Pressable>
						))}
					</View>
				)}
			</View>
		</Container>
	);
}
