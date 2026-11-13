import { Check, Folder, Home, X } from "lucide-react-native";
import { useMemo } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import type { NoteFolder } from "@/features/notas/notas.model";
import { cn } from "@/lib/cn";

export type MoveToSheetProps = {
	visible: boolean;
	/** Nome do item que está sendo movido. */
	itemName: string;
	folders: NoteFolder[];
	/** Onde o item está hoje (null = raiz). */
	currentParentId: string | null;
	/** Pastas que não podem ser destino (ao mover uma pasta: ela e as descendentes). */
	disabledFolderIds?: string[];
	onSelect: (folderId: string | null) => void;
	onClose: () => void;
	testID?: string;
};

type Row = { folder: NoteFolder; depth: number };

/** Pastas em ordem de árvore (pai antes das filhas), com a profundidade de cada uma. */
export function flattenFolderTree(folders: NoteFolder[]): Row[] {
	const children = new Map<string | null, NoteFolder[]>();
	for (const folder of folders) {
		const list = children.get(folder.parentId) ?? [];
		list.push(folder);
		children.set(folder.parentId, list);
	}
	for (const list of children.values()) {
		list.sort(
			(a, b) => a.position - b.position || a.name.localeCompare(b.name),
		);
	}
	const rows: Row[] = [];
	const visit = (parentId: string | null, depth: number) => {
		for (const folder of children.get(parentId) ?? []) {
			rows.push({ folder, depth });
			visit(folder.id, depth + 1);
		}
	};
	visit(null, 0);
	return rows;
}

/** "Mover para…": escolhe a pasta de destino (ou a raiz). */
export function MoveToSheet({
	visible,
	itemName,
	folders,
	currentParentId,
	disabledFolderIds = [],
	onSelect,
	onClose,
	testID = "move-to-sheet",
}: MoveToSheetProps) {
	const rows = useMemo(() => flattenFolderTree(folders), [folders]);
	const disabled = new Set(disabledFolderIds);

	const option = (
		id: string | null,
		label: string,
		depth: number,
		icon: React.ReactNode,
	) => {
		const isCurrent = id === currentParentId;
		const isDisabled = isCurrent || (id !== null && disabled.has(id));
		return (
			<Pressable
				key={id ?? "root"}
				testID={`${testID}-${id ?? "raiz"}`}
				disabled={isDisabled}
				onPress={() => onSelect(id)}
				style={{ paddingLeft: 8 + depth * 16 }}
				className={cn(
					"flex-row items-center gap-2.5 rounded-sm-card py-3 pr-2 active:bg-surface-secondary",
					isDisabled && "opacity-40",
				)}
			>
				{icon}
				<AppText
					variant="body"
					tone="primary"
					className="flex-1 text-[15px]"
					numberOfLines={1}
				>
					{label}
				</AppText>
				{isCurrent ? (
					<View className="flex-row items-center gap-1">
						<Check size={14} color="#A1A1AA" />
						<AppText variant="caption" tone="muted" className="text-[11px]">
							Atual
						</AppText>
					</View>
				) : null}
			</Pressable>
		);
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<Pressable className="flex-1 justify-end bg-black/70" onPress={onClose}>
				<Pressable
					testID={testID}
					onPress={(event) => event.stopPropagation()}
					className="max-h-[75%] gap-2 rounded-t-lg-card border border-border-subtle bg-surface-primary p-4 pb-8"
				>
					<View className="flex-row items-center justify-between gap-3">
						<View className="flex-1">
							<AppText
								variant="heading"
								tone="primary"
								className="font-bold text-base"
							>
								Mover para…
							</AppText>
							<AppText
								variant="caption"
								tone="muted"
								className="text-[12px]"
								numberOfLines={1}
							>
								{itemName}
							</AppText>
						</View>
						<Pressable
							testID={`${testID}-fechar`}
							onPress={onClose}
							hitSlop={8}
						>
							<X size={20} color="#A1A1AA" />
						</Pressable>
					</View>
					<ScrollView>
						{option(
							null,
							"Minhas notas (raiz)",
							0,
							<Home size={16} color="#A1A1AA" />,
						)}
						{rows.map(({ folder, depth }) =>
							option(
								folder.id,
								folder.name,
								depth + 1,
								<Folder size={16} color="#582CFF" />,
							),
						)}
					</ScrollView>
				</Pressable>
			</Pressable>
		</Modal>
	);
}
