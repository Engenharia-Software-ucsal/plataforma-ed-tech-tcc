import { X } from "lucide-react-native";
import { Modal, Pressable, View } from "react-native";
import { AppText } from "@/components/atoms/AppText";
import { cn } from "@/lib/cn";

export type SheetAction = {
	key: string;
	label: string;
	icon?: React.ReactNode;
	tone?: "default" | "danger";
	disabled?: boolean;
	onPress: () => void;
};

export type ActionSheetModalProps = {
	visible: boolean;
	title: string;
	subtitle?: string;
	actions: SheetAction[];
	onClose: () => void;
	testID?: string;
};

/** Lista de ações sobre um item (nota ou pasta), aberta pelo botão "⋯". */
export function ActionSheetModal({
	visible,
	title,
	subtitle,
	actions,
	onClose,
	testID,
}: ActionSheetModalProps) {
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
					className="gap-1 rounded-t-lg-card border border-border-subtle bg-surface-primary p-4 pb-8"
				>
					<View className="flex-row items-start justify-between gap-3 pb-2">
						<View className="flex-1 gap-0.5">
							<AppText
								variant="heading"
								tone="primary"
								className="font-bold text-base"
								numberOfLines={1}
							>
								{title}
							</AppText>
							{subtitle ? (
								<AppText variant="caption" tone="muted" className="text-[12px]">
									{subtitle}
								</AppText>
							) : null}
						</View>
						<Pressable
							testID={testID ? `${testID}-fechar` : undefined}
							onPress={onClose}
							hitSlop={8}
						>
							<X size={20} color="#A1A1AA" />
						</Pressable>
					</View>
					{actions.map((action) => (
						<Pressable
							key={action.key}
							testID={
								testID ? `${testID}-${action.key}` : `action-${action.key}`
							}
							disabled={action.disabled}
							onPress={action.onPress}
							className={cn(
								"flex-row items-center gap-3 rounded-sm-card px-2 py-3 active:bg-surface-secondary",
								action.disabled && "opacity-40",
							)}
						>
							{action.icon}
							<AppText
								variant="body"
								tone={action.tone === "danger" ? "danger" : "primary"}
								className="font-semibold text-[15px]"
							>
								{action.label}
							</AppText>
						</Pressable>
					))}
				</Pressable>
			</Pressable>
		</Modal>
	);
}
