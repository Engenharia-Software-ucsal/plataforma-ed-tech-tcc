import { useState } from "react";
import { Check, Compass, LogIn, X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { IconBadge } from "@/components/atoms/IconBadge";
import { useLoginViewModel } from "@/features/login/login.viewmodel";
import { cn } from "@/lib/cn";

type LoginScreenType = React.FC;

export const LoginScreen: LoginScreenType = () => {
	const { status, error, signInWithGoogle } = useLoginViewModel();
	const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
	const [showTermsModal, setShowTermsModal] = useState(false);

	return (
		<View className="flex-1 items-center justify-center gap-8 bg-surface-primary px-8">
			<IconBadge
				icon={<Compass size={32} color="#FFFFFF" />}
				tone="accent"
				className="h-18 w-18 rounded-lg-card bg-accent-primary"
			/>

			<View className="items-center gap-2">
				<AppText
					variant="heading"
					tone="primary"
					className="font-bold text-[26px]"
				>
					Plataforma EdTech
				</AppText>
				<AppText variant="body" tone="muted" className="text-center text-sm">
					Aulas, materiais e tutoria inteligente em um só lugar
				</AppText>
			</View>

			<View className="w-full gap-4">
				<View className="gap-2">
					<Pressable
						testID="terms-checkbox"
						accessibilityRole="checkbox"
						accessibilityState={{ checked: hasAcceptedTerms }}
						onPress={() => setHasAcceptedTerms((prev) => !prev)}
						className="flex-row items-center gap-2.5"
					>
						<View
							className={cn(
								"h-5 w-5 items-center justify-center rounded border",
								hasAcceptedTerms
									? "border-accent-primary bg-accent-primary"
									: "border-border-subtle bg-surface-secondary",
							)}
						>
							{hasAcceptedTerms && <Check size={14} color="#FFFFFF" />}
						</View>
						<AppText variant="caption" tone="primary" className="flex-1 text-xs">
							Li e concordo com o Termo de Consentimento (TCLE) e Tratamento de
							Dados Acadêmicos (LGPD)
						</AppText>
					</Pressable>

					<Pressable
						testID="read-terms-button"
						accessibilityRole="button"
						onPress={() => setShowTermsModal(true)}
						className="self-end"
						hitSlop={8}
					>
						<AppText variant="caption" tone="accent" className="text-xs underline">
							Ler Termos
						</AppText>
					</Pressable>
				</View>

				<AppButton
					label="Entrar com conta UCSAL (Google)"
					onPress={signInWithGoogle}
					icon={<LogIn size={18} color="#FFFFFF" />}
					disabled={!hasAcceptedTerms || status === "authenticating"}
				/>

				{error && (
					<AppText variant="body" tone="danger" className="text-center text-xs">
						{error}
					</AppText>
				)}

				<AppText
					variant="caption"
					tone="muted"
					className="text-center text-[11px]"
				>
					Ao continuar, você autoriza acesso de leitura estritamente acadêmico ao
					Google Classroom
				</AppText>
			</View>

			<Modal
				visible={showTermsModal}
				animationType="fade"
				transparent
				onRequestClose={() => setShowTermsModal(false)}
				testID="terms-modal"
			>
				<View className="flex-1 items-center justify-center bg-black/70 p-4">
					<View className="w-full max-h-[85%] rounded-lg-card border border-border-subtle bg-surface-secondary p-5 gap-4">
						<View className="flex-row items-center justify-between">
							<AppText
								variant="heading"
								tone="primary"
								className="font-bold text-lg"
							>
								Termo de Consentimento (TCLE)
							</AppText>
							<Pressable
								testID="close-terms-modal-x"
								onPress={() => setShowTermsModal(false)}
								accessibilityLabel="Fechar"
								hitSlop={8}
							>
								<X size={20} color="#c7c7d1" />
							</Pressable>
						</View>

						<ScrollView className="gap-3" showsVerticalScrollIndicator={false}>
							<View className="gap-1 mb-3">
								<AppText
									variant="body"
									tone="primary"
									className="font-semibold text-sm"
								>
									1. Finalidade Pedagógica
								</AppText>
								<AppText
									variant="body"
									tone="secondary"
									className="text-xs leading-5"
								>
									Acesso restrito em modo somente-leitura (readonly) às suas
									turmas, tópicos, avisos e atividades no Google Classroom com
									finalidade pedagógica estrita de organização e apoio acadêmico.
								</AppText>
							</View>

							<View className="gap-1 mb-3">
								<AppText
									variant="body"
									tone="primary"
									className="font-semibold text-sm"
								>
									2. Base Legal (LGPD)
								</AppText>
								<AppText
									variant="body"
									tone="secondary"
									className="text-xs leading-5"
								>
									O tratamento dos dados acadêmicos é realizado mediante o seu
									consentimento livre, informado e inequívoco, fundamentado no
									Art. 7º, I da Lei 13.709/2018 (Lei Geral de Proteção de Dados).
								</AppText>
							</View>

							<View className="gap-1 mb-3">
								<AppText
									variant="body"
									tone="primary"
									className="font-semibold text-sm"
								>
									3. Proteção e Privacidade contra Modelos de IA
								</AppText>
								<AppText
									variant="body"
									tone="secondary"
									className="text-xs leading-5"
								>
									Garantia expressa de que seus dados, produções acadêmicas e
									notas não serão utilizados para treinamento de modelos de IA nem
									redistribuídos publicamente, em observância à Lei de Direitos
									Autorais (Lei 9.610/1998).
								</AppText>
							</View>

							<View className="gap-1 mb-4">
								<AppText
									variant="body"
									tone="primary"
									className="font-semibold text-sm"
								>
									4. Direitos do Titular e Revogação
								</AppText>
								<AppText
									variant="body"
									tone="secondary"
									className="text-xs leading-5"
								>
									Você possui o direito de revogar este consentimento e solicitar
									a exclusão integral da sua conta e de todos os dados acadêmicos
									armazenados a qualquer momento, em conformidade com o Art. 18 da
									LGPD.
								</AppText>
							</View>
						</ScrollView>

						<AppButton
							label="Fechar"
							onPress={() => setShowTermsModal(false)}
							variant="primary"
						/>
					</View>
				</View>
			</Modal>
		</View>
	);
};
