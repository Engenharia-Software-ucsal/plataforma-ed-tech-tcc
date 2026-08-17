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

export const CURRENT_USER: UserProfile = {
  name: "João Silva",
  email: "joao.silva@ucsal.br",
  initials: "JS",
};

export const CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  { id: "classroom", name: "Google Classroom", connected: true, icon: "graduation-cap" },
];
