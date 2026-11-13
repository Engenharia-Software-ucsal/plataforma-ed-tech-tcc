import { useRouter } from "expo-router";
import {
	ChevronLeft,
	FileText,
	Folder,
	RefreshCw,
	RotateCcw,
	Trash2,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { Container } from "@/components/container";
import { ActionSheetModal } from "@/components/molecules/ActionSheetModal";
import { useLixeiraViewModel } from "@/features/lixeira/lixeira.viewmodel";
import type { TrashItem } from "@/features/notas/notas.model";

type Confirm = { kind: "delete"; item: TrashItem } | { kind: "empty" };

function describe(item: TrashItem): string {
	const days = item.daysLeft === 1 ? "1 dia" : `${item.daysLeft} dias`;
	const left =
		item.daysLeft === 0 ? "será apagada em breve" : `apagada de vez em ${days}`;
	if (item.type === "folder") {
		const inside =
			item.itemCount === 0
				? "vazia"
				: `${item.itemCount} ${item.itemCount === 1 ? "item dentro" : "itens dentro"}`;
		return `Pasta · ${inside} · ${left}`;
	}
	return `Nota · ${left}`;
}

export function LixeiraScreen() {
	const router = useRouter();
	const vm = useLixeiraViewModel();
	const [confirm, setConfirm] = useState<Confirm | null>(null);

	return (
		<Container className="bg-surface-primary">
			<View className="gap-5 p-5">
				<View className="flex-row items-center gap-3">
					<Pressable
						testID="btn-voltar-lixeira"
						onPress={() => router.back()}
						accessibilityRole="button"
						accessibilityLabel="Voltar"
						className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary"
					>
						<ChevronLeft size={18} color="#FFFFFF" />
					</Pressable>
					<View className="flex-1">
						<AppText
							variant="heading"
							tone="primary"
							className="font-bold text-[22px]"
						>
							Lixeira
						</AppText>
						<AppText variant="caption" tone="muted" className="text-[12px]">
							Itens ficam aqui por 30 dias e depois são apagados de vez.
						</AppText>
					</View>
				</View>

				{vm.notice ? (
					<AppText
						testID="lixeira-aviso"
						variant="caption"
						tone="success"
						className="text-[13px]"
					>
						{vm.notice}
					</AppText>
				) : null}
				{vm.error && vm.loadState === "ready" ? (
					<AppText
						testID="lixeira-erro"
						variant="caption"
						tone="danger"
						className="text-[13px]"
					>
						{vm.error}
					</AppText>
				) : null}

				{vm.loadState === "loading" ? (
					<AppText
						testID="lixeira-carregando"
						variant="body"
						tone="muted"
						className="text-center"
					>
						Carregando a lixeira...
					</AppText>
				) : vm.loadState === "error" ? (
					<View className="items-center gap-3 rounded-lg-card border border-border-subtle border-dashed p-6">
						<AppText variant="body" tone="secondary" className="text-center">
							{vm.error}
						</AppText>
						<AppButton
							testID="btn-recarregar-lixeira"
							label="Tentar de novo"
							variant="secondary"
							icon={<RefreshCw size={16} color="#FFFFFF" />}
							onPress={() => void vm.reload()}
						/>
					</View>
				) : vm.items.length === 0 ? (
					<View
						testID="lixeira-vazia"
						className="items-center gap-2 rounded-lg-card border border-border-subtle border-dashed p-8"
					>
						<Trash2 size={32} color="#71717A" />
						<AppText variant="body" tone="muted" className="text-center">
							A lixeira está vazia.
						</AppText>
					</View>
				) : (
					<View className="gap-3">
						{vm.items.map((item) => (
							<View
								key={item.id}
								testID={`lixeira-item-${item.id}`}
								className="gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-4"
							>
								<View className="flex-row items-center gap-3">
									<View className="h-9 w-9 items-center justify-center rounded-sm-card bg-border-subtle">
										{item.type === "folder" ? (
											<Folder size={18} color="#A1A1AA" />
										) : (
											<FileText size={18} color="#A1A1AA" />
										)}
									</View>
									<View className="flex-1 gap-0.5">
										<AppText
											variant="heading"
											tone="primary"
											className="font-semibold text-[15px]"
											numberOfLines={1}
										>
											{item.name}
										</AppText>
										<AppText
											variant="caption"
											tone="muted"
											className="text-[12px]"
										>
											{describe(item)}
										</AppText>
									</View>
								</View>
								<View className="flex-row gap-2">
									<View className="flex-1">
										<AppButton
											testID={`btn-restaurar-${item.id}`}
											label="Restaurar"
											variant="secondary"
											disabled={vm.busyId !== null}
											icon={<RotateCcw size={16} color="#FFFFFF" />}
											onPress={() => void vm.restore(item)}
										/>
									</View>
									<View className="flex-1">
										<AppButton
											testID={`btn-excluir-de-vez-${item.id}`}
											label="Excluir de vez"
											variant="outline"
											disabled={vm.busyId !== null}
											icon={<Trash2 size={16} color="#EF4444" />}
											onPress={() => setConfirm({ kind: "delete", item })}
										/>
									</View>
								</View>
							</View>
						))}

						<AppButton
							testID="btn-esvaziar-lixeira"
							label="Esvaziar lixeira"
							variant="outline"
							disabled={vm.busyId !== null}
							onPress={() => setConfirm({ kind: "empty" })}
						/>
					</View>
				)}
			</View>

			<ActionSheetModal
				testID="confirmar-exclusao"
				visible={confirm !== null}
				title={
					confirm?.kind === "delete"
						? `Excluir "${confirm.item.name}" de vez?`
						: "Esvaziar a lixeira?"
				}
				subtitle={
					confirm?.kind === "delete" && confirm.item.type === "folder"
						? "A pasta e o que saiu junto com ela serão apagados. Não dá para desfazer."
						: "Não dá para desfazer."
				}
				actions={[
					{
						key: "confirmar",
						label: confirm?.kind === "empty" ? "Esvaziar" : "Excluir de vez",
						tone: "danger",
						icon: <Trash2 size={18} color="#EF4444" />,
						onPress: () => {
							const current = confirm;
							setConfirm(null);
							if (current?.kind === "delete")
								void vm.deletePermanently(current.item);
							else if (current?.kind === "empty") void vm.empty();
						},
					},
				]}
				onClose={() => setConfirm(null)}
			/>
		</Container>
	);
}
