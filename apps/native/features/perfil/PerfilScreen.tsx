import {
	Bell,
	ChevronDown,
	ChevronUp,
	CircleCheck,
	ClipboardList,
	Eye,
	GraduationCap,
	Lock,
	LogOut,
	RefreshCw,
	ShieldCheck,
	Trash2,
} from "lucide-react-native";
import { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Pressable,
	ScrollView,
	Switch,
	TextInput,
	View,
} from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { IconBadge } from "@/components/atoms/IconBadge";
import { Container } from "@/components/container";
import {
	DELETE_CONFIRMATION,
	INSTITUTIONAL_DOMAIN,
} from "@/features/perfil/perfil.model";
import { usePerfilViewModel } from "@/features/perfil/perfil.viewmodel";

export type PerfilScreenProps = {
	onSignOut?: () => void;
};

function SectionTitle({ children }: Readonly<{ children: string }>) {
	return (
		<AppText
			variant="heading"
			tone="muted"
			className="ml-0.5 font-semibold text-xs"
		>
			{children}
		</AppText>
	);
}

type InfoRowProps = Readonly<{
	icon: React.ReactNode;
	title: string;
	description?: string;
	tone?: "success";
	last?: boolean;
	right?: React.ReactNode;
	testID?: string;
	onPress?: () => void;
}>;

function InfoRow({
	icon,
	title,
	description,
	tone,
	last,
	right,
	testID,
	onPress,
}: InfoRowProps) {
	const content = (
		<>
			<IconBadge icon={icon} tone="accent" className="h-9 w-9 rounded-lg-card" />
			<View className="flex-1 gap-0.5">
				<AppText variant="body" tone="primary" className="font-medium text-[13px]">
					{title}
				</AppText>
				{description ? (
					<AppText
						variant="caption"
						tone={tone === "success" ? "success" : "muted"}
						className="text-[11px] leading-4"
					>
						{description}
					</AppText>
				) : null}
			</View>
			{right}
		</>
	);
	const className = `min-h-14 flex-row items-center gap-3 p-3 ${
		last ? "" : "border-border-subtle border-b"
	}`;
	if (onPress) {
		return (
			<Pressable
				testID={testID}
				onPress={onPress}
				className={`${className} active:opacity-80`}
			>
				{content}
			</Pressable>
		);
	}
	return (
		<View testID={testID} className={className}>
			{content}
		</View>
	);
}

type SheetProps = Readonly<{
	visible: boolean;
	onClose: () => void;
	children: React.ReactNode;
}>;

function BottomSheet({ visible, onClose, children }: SheetProps) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
		>
			{/* Sobe a folha junto com o teclado, para o botão não ficar escondido atrás dele. */}
			<KeyboardAvoidingView
				behavior="padding"
				className="flex-1 justify-end bg-black/60"
			>
				<View className="gap-3 rounded-t-2xl border border-border-subtle bg-surface-secondary p-5 pb-8">
					{children}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

type SheetButtonProps = Readonly<{
	label: string;
	onPress: () => void;
	tone: "danger" | "ghost";
	disabled?: boolean;
	loading?: boolean;
	testID?: string;
}>;

function SheetButton({
	label,
	onPress,
	tone,
	disabled,
	loading,
	testID,
}: SheetButtonProps) {
	const isDanger = tone === "danger";
	return (
		<Pressable
			testID={testID}
			onPress={disabled ? undefined : onPress}
			disabled={disabled}
			className={`min-h-12 flex-row items-center justify-center gap-2 rounded-lg-card border px-4 ${
				isDanger ? "border-danger bg-danger" : "border-border-subtle"
			} ${disabled ? "opacity-45" : "active:opacity-80"}`}
		>
			{loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
			<AppText
				variant="heading"
				tone="primary"
				className={`font-semibold text-[13px] ${isDanger ? "" : "text-foreground-secondary"}`}
			>
				{label}
			</AppText>
		</Pressable>
	);
}

export const PerfilScreen: React.FC<PerfilScreenProps> = ({ onSignOut }) => {
	const {
		profile,
		isInstitutional,
		scopes,
		scopesOpen,
		toggleScopes,
		notificationsEnabled,
		toggleNotifications,
		sheet,
		openSheet,
		closeSheet,
		busy,
		errorMessage,
		signOut,
		deleteAccount,
		syncStatus,
		lastSyncedAt,
		syncClassroom,
	} = usePerfilViewModel({ onSignOut });
	const [confirmation, setConfirmation] = useState("");
	const canDelete = confirmation === DELETE_CONFIRMATION && !busy;

	function handleCloseSheet() {
		setConfirmation("");
		closeSheet();
	}

	return (
		<Container className="bg-surface-primary">
			<ScrollView contentContainerClassName="gap-5 p-5 pb-10">
				<View className="flex-row items-center gap-3">
					<AppText
						variant="heading"
						tone="primary"
						className="font-bold text-[28px]"
					>
						Perfil
					</AppText>
				</View>

				<View className="gap-3.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
					<View className="flex-row items-center gap-3.5">
						<View className="h-14 w-14 items-center justify-center rounded-full bg-accent-primary">
							<AppText
								variant="heading"
								tone="primary"
								className="font-bold text-lg"
							>
								{profile.initials}
							</AppText>
						</View>
						<View className="flex-1 gap-0.5">
							<AppText
								variant="heading"
								tone="primary"
								className="font-semibold text-base"
							>
								{profile.name}
							</AppText>
							<AppText variant="body" tone="muted" className="text-xs">
								{profile.email}
							</AppText>
						</View>
					</View>
					{isInstitutional && (
						<View
							testID="perfil-institutional-badge"
							className="flex-row items-center gap-1.5 self-start rounded-full bg-success/15 px-2.5 py-1"
						>
							<CircleCheck size={12} color="#10B981" />
							<AppText variant="caption" tone="success" className="text-[11px]">
								Conta institucional {INSTITUTIONAL_DOMAIN}
							</AppText>
						</View>
					)}
				</View>

				<View className="gap-2">
					<SectionTitle>Sessão e Classroom</SectionTitle>
					<View className="overflow-hidden rounded-lg-card border border-border-subtle bg-surface-secondary">
						<InfoRow
							icon={<Lock size={16} color="#10B981" />}
							title="Sessão ativa neste aparelho"
							description="● Conectado · chave guardada no cofre do aparelho"
							tone="success"
						/>
						<InfoRow
							last
							icon={<GraduationCap size={16} color="#582CFF" />}
							title="Google Classroom"
							description={`● Conectado · somente leitura${lastSyncedAt ? `\n${lastSyncedAt}` : ""}`}
							tone="success"
							right={
								<Pressable
									testID="perfil-sync-classroom-button"
									onPress={() => syncClassroom()}
									className="min-h-10 flex-row items-center gap-1.5 rounded-full border border-border-subtle bg-surface-primary px-3.5 active:opacity-80"
								>
									<RefreshCw size={13} color="#582CFF" />
									<AppText
										variant="heading"
										tone="primary"
										className="font-semibold text-xs"
									>
										{syncStatus === "syncing" ? "Sincronizando..." : "Sincronizar"}
									</AppText>
								</Pressable>
							}
						/>
					</View>
				</View>

				<View className="gap-2">
					<SectionTitle>Seus direitos (LGPD, Art. 18)</SectionTitle>
					<View className="overflow-hidden rounded-lg-card border border-border-subtle bg-surface-secondary">
						<InfoRow
							icon={<Eye size={16} color="#582CFF" />}
							title="Acesso aos seus dados"
							description="O app só lê o que o Classroom já mostra para você. Nada é alterado lá."
						/>
						<InfoRow
							testID="perfil-scopes-toggle"
							icon={<ClipboardList size={16} color="#582CFF" />}
							title="O que o app lê"
							description={`${scopes.length} permissões, todas de leitura`}
							last={!scopesOpen}
							onPress={toggleScopes}
							right={
								scopesOpen ? (
									<ChevronUp size={16} color="#A1A1AA" />
								) : (
									<ChevronDown size={16} color="#A1A1AA" />
								)
							}
						/>
						{scopesOpen && (
							<View
								testID="perfil-scopes-list"
								className="gap-1.5 border-border-subtle border-b px-3 pr-3 pb-3 pl-15"
							>
								{scopes.map((scope) => (
									<View key={scope.url} className="flex-row items-baseline gap-2">
										<AppText
											variant="body"
											tone="secondary"
											className="text-[11px]"
										>
											{scope.label}
										</AppText>
										<AppText
											variant="mono"
											tone="muted"
											className="flex-1 text-[10px]"
											numberOfLines={1}
										>
											{scope.technicalName}
										</AppText>
									</View>
								))}
							</View>
						)}
						<InfoRow
							icon={<ShieldCheck size={16} color="#582CFF" />}
							title="Sem treinamento de IA"
							description="Seus materiais e notas não são usados para treinar modelos de IA."
						/>
						<InfoRow
							last
							icon={<Trash2 size={16} color="#582CFF" />}
							title="Revogação e exclusão"
							description="Você pode encerrar o acesso ou apagar sua conta e dados a qualquer momento."
						/>
					</View>
				</View>

				<View className="gap-2">
					<SectionTitle>Preferências</SectionTitle>
					<View className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3">
						<IconBadge
							icon={<Bell size={16} color="#A1A1AA" />}
							tone="muted"
							className="h-9 w-9 rounded-lg-card"
						/>
						<AppText
							variant="body"
							tone="primary"
							className="flex-1 font-medium text-[13px]"
						>
							Notificações push
						</AppText>
						<Switch
							testID="perfil-notifications-switch"
							value={notificationsEnabled}
							onValueChange={toggleNotifications}
							trackColor={{ true: "#582CFF", false: "#222233" }}
							thumbColor="#FFFFFF"
						/>
					</View>
				</View>

				<View className="gap-2.5">
					<Pressable
						testID="perfil-sign-out-button"
						onPress={() => openSheet("signOut")}
						className="min-h-12 flex-row items-center justify-center gap-2 rounded-lg-card border border-danger/40 px-4 active:opacity-80"
					>
						<LogOut size={15} color="#EF4444" />
						<AppText
							variant="heading"
							tone="danger"
							className="font-semibold text-[13px]"
						>
							Sair da conta
						</AppText>
					</Pressable>
					<AppText
						variant="caption"
						tone="muted"
						className="text-center text-[11px] leading-4"
					>
						Remove a sessão deste aparelho e limpa os dados guardados nele.
					</AppText>
					<Pressable
						testID="perfil-delete-account-button"
						onPress={() => openSheet("delete")}
						className="min-h-10 items-center justify-center active:opacity-80"
					>
						<AppText
							variant="heading"
							tone="danger"
							className="font-semibold text-xs"
						>
							Excluir minha conta e dados
						</AppText>
					</Pressable>
				</View>
			</ScrollView>

			<BottomSheet visible={sheet === "signOut"} onClose={handleCloseSheet}>
				<AppText variant="heading" tone="primary" className="font-bold text-base">
					Sair da conta?
				</AppText>
				<AppText variant="body" tone="secondary" className="text-xs leading-5">
					Neste aparelho, vamos apagar a chave da sessão guardada no cofre seguro
					e seus dados em memória no app (aulas, notas e quiz em cache). Suas
					notas e quizzes continuam salvos na sua conta.
				</AppText>
				<SheetButton
					testID="perfil-confirm-sign-out"
					label="Sair"
					tone="danger"
					onPress={signOut}
					disabled={busy}
					loading={busy}
				/>
				<SheetButton
					testID="perfil-cancel-sheet"
					label="Cancelar"
					tone="ghost"
					onPress={handleCloseSheet}
					disabled={busy}
				/>
			</BottomSheet>

			<BottomSheet visible={sheet === "delete"} onClose={handleCloseSheet}>
				<AppText variant="heading" tone="danger" className="font-bold text-base">
					Excluir conta e dados
				</AppText>
				<AppText variant="body" tone="secondary" className="text-xs leading-5">
					Isso não pode ser desfeito. Serão apagados para sempre: suas sessões de
					login, suas notas e os vínculos entre elas e suas tentativas de quiz.
					Também revogamos o acesso do app à sua conta Google.
				</AppText>
				<AppText variant="body" tone="secondary" className="text-xs">
					Para confirmar, digite {DELETE_CONFIRMATION}.
				</AppText>
				<TextInput
					testID="perfil-delete-input"
					value={confirmation}
					onChangeText={setConfirmation}
					autoCapitalize="characters"
					autoCorrect={false}
					placeholder="Digite aqui…"
					placeholderTextColor="#A1A1AA"
					editable={!busy}
					className="rounded-lg-card border border-border-subtle bg-surface-primary px-3 py-3 text-[13px] text-foreground-primary"
				/>
				{errorMessage ? (
					<AppText
						testID="perfil-delete-error"
						variant="caption"
						tone="danger"
						className="text-[11px]"
					>
						{errorMessage}
					</AppText>
				) : null}
				<SheetButton
					testID="perfil-confirm-delete"
					label={busy ? "Excluindo…" : "Excluir definitivamente"}
					tone="danger"
					onPress={() => deleteAccount(confirmation)}
					disabled={!canDelete}
					loading={busy}
				/>
				<SheetButton
					testID="perfil-cancel-sheet"
					label="Cancelar"
					tone="ghost"
					onPress={handleCloseSheet}
					disabled={busy}
				/>
			</BottomSheet>
		</Container>
	);
};
