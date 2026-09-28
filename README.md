# Busu UCSAL v3 - Plataforma Ed-Tech 🚀

Este é o repositório principal da versão v3 do aplicativo **Busu UCSAL**, uma plataforma educacional desenvolvida como Trabalho de Conclusão de Curso (TCC) com base nos princípios da **Teoria da Carga Cognitiva**. O objetivo é reduzir a carga extrínseca dos alunos centralizando informações essenciais (como horários de ônibus e detalhes das aulas) e fornecendo ferramentas de aprendizagem (como Quizzes).

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura **Monorepo** gerenciada pelo [Turborepo](https://turbo.build/repo), dividida nas seguintes áreas:

- **`apps/native`**: Aplicativo Mobile construído com **React Native** + **Expo** e roteamento via Expo Router. A interface é feita utilizando `heroui-native` e TailwindCSS.
- **`apps/server`**: Backend de alta performance construído com **Fastify** + **tRPC**.
- **`packages/api`**: Pacote compartilhado que exporta as rotas e tipos do tRPC, garantindo segurança de tipos de ponta a ponta (End-to-End Type Safety).
- **`packages/env`**: Validação rigorosa de variáveis de ambiente usando Zod.
- **Banco de Dados**: PostgreSQL manipulado através do ORM **Drizzle**.

## 🛠️ Pré-requisitos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas na sua máquina:

- [Node.js](https://nodejs.org/en/) (Versão LTS recomendada, ex: v20)
- [pnpm](https://pnpm.io/installation) (Gerenciador de pacotes exclusivo do projeto, versão 9+)
- [Docker](https://www.docker.com/) (Para rodar o banco de dados localmente)
- [Android Studio](https://developer.android.com/studio) (Com um emulador configurado para rodar o app)

## ⚙️ Configuração Inicial (Setup)

1. **Clone o repositório e instale as dependências:**
   ```bash
   git clone https://github.com/Engenharia-Software-ucsal/plataforma-ed-tech-tcc.git
   cd plataforma-ed-tech-tcc
   pnpm install
   ```

2. **Configuração de Variáveis de Ambiente (.env):**
   O projeto requer chaves de ambiente para funcionar. Elas não são versionadas por segurança.
   
   - Copie os arquivos de exemplo para criar seus próprios arquivos `.env`:
     ```bash
     cp apps/server/.env.example apps/server/.env
     cp apps/native/.env.example apps/native/.env
     ```
   - Abra os arquivos `.env` recém-criados e preencha com as credenciais reais do time (peça ao líder do projeto as chaves do Google Cloud).

3. **Subindo o Banco de Dados:**
   Inicie o contêiner do PostgreSQL via Docker:
   ```bash
   pnpm run db:up
   ```

4. **Aplicando Migrações do Banco:**
   Crie as tabelas do Drizzle no seu banco local:
   ```bash
   pnpm --filter server run db:migrate
   ```

## ▶️ Rodando a Aplicação

### 1. Inicie o Servidor e o Metro Bundler
Para ligar o backend (tRPC) e o empacotador JavaScript do Expo (Metro) simultaneamente, rode na raiz do projeto:
```bash
pnpm run dev
```

### 2. Compilando o App no Emulador (Android)
Como o app possui código nativo (como o Google Sign-In), você não pode usar o aplicativo padrão "Expo Go". Você precisa compilar o app e instalá-lo no seu emulador.

Abra um novo terminal e rode:
```bash
pnpm -F native run android
```
Isso vai construir o `.apk` e instalar automaticamente no seu emulador. Sempre que adicionar uma biblioteca que exija links nativos no futuro, rode este comando novamente.

## 🧪 Comandos Úteis (CI / Qualidade de Código)

O projeto usa **Biome** para linting/formatação e **Vitest/Jest** para testes. O GitHub Actions rodará estes comandos a cada push. Você pode rodá-los localmente:

- **Formatar todo o código:** `turbo run check`
- **Checar tipagem estrita:** `turbo run check-types`
- **Rodar os testes unitários:** `turbo run test`
- **Forçar um Build completo:** `turbo run build`

## 🤝 Documentação e Padrões
- **Commits:** Utilizamos a convenção de *Conventional Commits* (`feat:`, `fix:`, `chore:`, etc).
- **Google Auth:** A autenticação funciona recebendo o código do Google no celular e repassando para o Backend tRPC, que gera uma sessão em banco e retorna os cookies/tokens apropriados.
