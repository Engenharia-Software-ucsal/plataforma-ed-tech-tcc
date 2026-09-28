import { Compass, LogIn } from "lucide-react-native";
import { View } from "react-native";
import { AppButton } from "@/components/atoms/AppButton";
import { AppText } from "@/components/atoms/AppText";
import { IconBadge } from "@/components/atoms/IconBadge";
import {
	useLoginViewModel,
} from "@/features/login/login.viewmodel";

type LoginScreenType = React.FC;

export const LoginScreen: LoginScreenType = () => {
	const { status, error, signInWithGoogle } = useLoginViewModel();

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
					Compasso UCSAL
				</AppText>
				<AppText variant="body" tone="muted" className="text-center text-sm">
					Horários, aulas e insights de IA em um só lugar
				</AppText>
			</View>

			<View className="w-full gap-3">
				<AppButton
					label="Entrar com conta UCSAL (Google)"
					onPress={signInWithGoogle}
					icon={<LogIn size={18} color="#FFFFFF" />}
					disabled={status === "authenticating"}
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
					Ao continuar, você autoriza acesso de leitura ao Google Classroom e
					Drive
				</AppText>
			</View>
		</View>
	);
};
