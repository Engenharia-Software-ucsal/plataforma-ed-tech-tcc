export type UserProfile = {
	name: string;
	email: string;
	initials: string;
};

export type ConnectedAccount = {
	id: string;
	name: string;
	connected: boolean;
	icon: "graduation-cap";
};

export const INSTITUTIONAL_DOMAIN = "@ucsal.edu.br";

/** Palavra que o aluno digita para confirmar a exclusão da conta. */
export const DELETE_CONFIRMATION = "EXCLUIR";

export const CURRENT_USER: UserProfile = {
	name: "João Silva",
	email: "joao.silva@ucsal.edu.br",
	initials: "JS",
};

export const CONNECTED_ACCOUNTS: ConnectedAccount[] = [
	{
		id: "classroom",
		name: "Google Classroom",
		connected: true,
		icon: "graduation-cap",
	},
];

export function isInstitutionalEmail(email: string): boolean {
	return email.trim().toLowerCase().endsWith(INSTITUTIONAL_DOMAIN);
}
