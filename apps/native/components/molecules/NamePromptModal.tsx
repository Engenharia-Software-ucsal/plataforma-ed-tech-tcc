import { useEffect, useState } from "react";
import { Modal, TextInput, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";

export type NamePromptModalProps = {
	visible: boolean;
	title: string;
	label: string;
	initialValue?: string;
	confirmLabel: string;
	placeholder?: string;
	/** Erro vindo de quem confirmou (ex.: nome repetido no servidor). */
	error?: string | null;
	/** Validação local antes de enviar; devolve a mensagem de erro ou null. */
	validate?: (value: string) => string | null;
	onConfirm: (value: string) => void;
	onClose: () => void;
	busy?: boolean;
	testID?: string;
};

/** Caixa para digitar um nome: criar/renomear pasta, criar nota. */
export function NamePromptModal({
	visible,
	title,
	label,
	initialValue = "",
	confirmLabel,
	placeholder,
	error,
	validate,
	onConfirm,
	onClose,
	busy = false,
	testID,
}: NamePromptModalProps) {
	const [value, setValue] = useState(initialValue);
	const [localError, setLocalError] = useState<string | null>(null);

	useEffect(() => {
		if (visible) {
			setValue(initialValue);
			setLocalError(null);
		}
	}, [visible, initialValue]);

	const submit = () => {
		const problem = validate?.(value) ?? null;
		setLocalError(problem);
		if (!problem) onConfirm(value.trim());
	};

	const shownError = localError ?? error ?? null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<View className="flex-1 items-center justify-center bg-black/80 p-5">
				<View
					testID={testID}
					className="w-full gap-4 rounded-lg-card border border-border-subtle bg-surface-primary p-5"
				>
					<AppText
						variant="heading"
						tone="primary"
						className="font-bold text-base"
					>
						{title}
					</AppText>
					<View className="gap-1.5">
						<AppText
							variant="caption"
							tone="secondary"
							className="font-semibold"
						>
							{label}
						</AppText>
						<TextInput
							testID={testID ? `${testID}-input` : undefined}
							value={value}
							onChangeText={(text) => {
								setValue(text);
								if (localError) setLocalError(null);
							}}
							onSubmitEditing={submit}
							autoFocus
							placeholder={placeholder}
							placeholderTextColor="#71717A"
							returnKeyType="done"
							className="rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5 font-body text-base text-foreground-primary"
						/>
						{shownError ? (
							<AppText
								testID={testID ? `${testID}-erro` : undefined}
								variant="caption"
								tone="danger"
								className="text-[12px]"
							>
								{shownError}
							</AppText>
						) : null}
					</View>
					<View className="flex-row gap-3">
						<View className="flex-1">
							<AppButton
								testID={testID ? `${testID}-confirmar` : undefined}
								label={busy ? "Salvando..." : confirmLabel}
								disabled={busy || value.trim().length === 0}
								onPress={submit}
							/>
						</View>
						<View className="flex-1">
							<AppButton
								label="Cancelar"
								variant="secondary"
								onPress={onClose}
							/>
						</View>
					</View>
				</View>
			</View>
		</Modal>
	);
}
