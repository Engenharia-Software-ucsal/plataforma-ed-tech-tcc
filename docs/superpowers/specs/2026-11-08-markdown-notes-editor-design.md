# Editor de notas Markdown com pastas e links — Spec

- **Status:** fases 1 a 4 implementadas na branch `feat/markdown-notes-editor`; fase 5 (arrastar e soltar) pendente. Ver §8.
- **Data:** 2026-11-08 (implementação: 2026-11-12)
- **Escopo:** `apps/native` (editor, árvore de pastas), `apps/server` (schema, router), `packages/notes` (regras compartilhadas)

## 1. Objetivo

Permitir que o aluno escreva notas em Markdown, organize-as em pastas aninhadas, reordene/mova notas e crie links entre notas com a sintaxe `[[Título]]`, no estilo do Obsidian. Os links geram backlinks automáticos.

Relação com o TCC: reduz a carga cognitiva extrínseca ao centralizar anotações, organização e conexões entre conceitos no mesmo lugar em que o aluno já vê aulas e quizzes.

## 2. Estado atual (levantado no código)

| Área | Hoje |
|---|---|
| Armazenamento no app | Notas ficam num atom do jotai inicializado com `INITIAL_NOTES_MOCK` (`features/notas/notas.viewmodel.ts`). **Não há chamada ao tRPC e nada persiste.** |
| Servidor | `notesRouter` tem `list`, `getById`, `create`, `update`, `delete`, `addLink`, `removeLink`, `suggestLinks`, mas o app não o usa. |
| Auth no router de notas | Todos os procedimentos são `publicProcedure` e aceitam `userId` no input quando não há `ctx.user`. `getById`, `update`, `delete` e `addLink` **não checam dono da nota**. |
| Schema | `notes` (id, userId, classSessionId, title, content, tags, timestamps) e `note_links` (source, target, similarityScore, linkType `manual`/`ai_suggested`, `reason` NOT NULL). **Não existe conceito de pasta nem de ordem.** |
| Editor | `TextInput` multilinha simples em `NotaDetalhesScreen.tsx`. |
| Render | `WikilinkText` só entende `[[alvo]]` e `[[alvo\|alias]]`. Não renderiza Markdown (títulos, negrito, listas, código). |
| Links no texto vs. tabela | `[[wikilinks]]` no conteúdo e linhas em `note_links` são independentes: escrever `[[X]]` não cria vínculo, e `addLink` exige uma justificativa digitada. |
| Título | Não é único por usuário. |

Consequência: a feature tem dois pré-requisitos que não são "do editor" mas bloqueiam tudo: **ligar o app ao servidor** e **corrigir autorização**.

## 3. Requisitos

### 3.1 Funcionais

**Editor**
- F1. Editar título e conteúdo em Markdown, com autosave (debounce) e indicador "salvo / salvando / erro".
- F2. Alternar entre **Editar** e **Visualizar**. A visualização renderiza Markdown (títulos, ênfase, listas, listas de tarefas, citação, código, links externos) e `[[wikilinks]]` clicáveis.
- F3. Barra de formatação com ações básicas (negrito, itálico, título, lista, tarefa, código, inserir `[[link]]`).
- F4. Ao digitar `[[`, abrir sugestão de notas do usuário filtrada pelo texto digitado; escolher insere `[[Título]]`.

**Links**
- F5. Tocar em um `[[link]]` na visualização abre a nota de destino.
- F6. Se o destino não existe, o link aparece como "não resolvido" e tocar oferece **criar a nota** com aquele título.
- F7. Cada nota mostra **Backlinks** (quem aponta para ela) e **Links de saída**.
- F8. Renomear uma nota atualiza os `[[links]]` que apontam para ela nas outras notas do usuário.

**Pastas e organização**
- F9. Criar, renomear e excluir pastas, com aninhamento.
- F10. Mover nota para outra pasta (ou para a raiz).
- F11. Reordenar notas e pastas dentro da mesma pasta.
- F12. Excluir pasta com conteúdo exige confirmação e define o destino: mover o conteúdo para a pasta-pai, ou enviar a pasta e tudo dentro dela para a lixeira.
- F13. Buscar por título/conteúdo continua funcionando e mostra a pasta de cada resultado. A busca ignora itens na lixeira.

**Lixeira**
- F14. Excluir nota ou pasta **nunca apaga na hora**: o item vai para a lixeira.
- F15. A tela **Lixeira** lista notas e pastas excluídas, com data de exclusão e dias restantes até a remoção definitiva.
- F16. É possível **restaurar** um item (volta para a pasta original; se ela não existir mais ou estiver na lixeira, volta para a raiz) ou **excluir definitivamente** (com confirmação), e **esvaziar a lixeira**.
- F17. Itens na lixeira são removidos definitivamente após 30 dias (job periódico no servidor).

**Notas de aula**
- F18. Toda nota vinculada a uma aula (`classSessionId`) recebe automaticamente uma **hashtag com o nome da matéria** (ex.: aula "Engenharia de Software" → `#engenharia-de-software`). A hashtag é mantida em sincronia: muda se a nota for vinculada a outra aula e some se o vínculo for removido. O aluno pode filtrar por ela e vê-la como qualquer outra tag, mas não consegue removê-la manualmente enquanto o vínculo existir.

### 3.2 Não funcionais
- N1. Escrever não pode travar: autosave assíncrono, sem bloquear digitação.
- N2. Dados do aluno só são lidos/escritos pelo próprio aluno (ver §4.1).
- N3. Funciona com conexão ruim: a edição continua local e sincroniza ao voltar (ver §4.4, v1 é "melhor esforço", sem fila offline completa).
- N4. Seguir o padrão do repo: MVVM nas features (`*.viewmodel.ts`, `*Screen.tsx`), Biome, testes Vitest (server) e Jest (native).

### 3.3 Fora de escopo (v1)
- Edição WYSIWYG / live preview estilo Obsidian (o texto é sempre Markdown cru no modo Editar).
- Grafo visual de notas, canvas, plugins.
- Anexos e imagens embutidas.
- Colaboração em tempo real e compartilhamento de notas.
- Import/export de vault Obsidian (candidato a v2).
- Histórico de versões de uma nota (a lixeira recupera notas excluídas, não versões antigas do texto).
- Fila offline completa com resolução de conflito.

## 4. Design

### 4.1 Pré-requisito: autenticação nas notas
Trocar `publicProcedure` por um procedimento protegido (middleware que exige `ctx.user`) em todo o `notesRouter` e nos novos routers. Remover `userId` do input. Toda consulta e mutação filtra por `userId = ctx.user.id`, inclusive `getById`, `update`, `delete`, `addLink`, `removeLink`, `suggestLinks`. Testes de "não acessa nota de outro usuário" para cada procedimento.

### 4.2 Modelo de dados

**Nova tabela `folders`**
```
id            uuid pk
user_id       uuid fk users (cascade)
parent_id     uuid fk folders (null = raiz)
name          text not null
position      integer not null        -- ordem entre irmãos
deleted_at    timestamptz null        -- null = ativa; preenchido = na lixeira
delete_batch  uuid null               -- agrupa itens excluídos juntos (ver §4.3.1)
created_at, updated_at
unique (user_id, parent_id, name) where deleted_at is null
```

**Alterações em `notes`**
```
folder_id     uuid fk folders (set null)   -- null = raiz
position      integer not null default 0
deleted_at    timestamptz null
delete_batch  uuid null
auto_tags     text[] not null default '{}'  -- tags geradas pelo sistema (matéria da aula)
unique (user_id, lower(title)) where deleted_at is null   -- necessário p/ resolver [[Título]]
```
**Decisão confirmada:** o título não pode repetir por usuário (sem diferenciar maiúsculas/minúsculas). É o que permite resolver `[[Título]]` sem ambiguidade, como o Obsidian faz por nome de arquivo. A unicidade vale só entre notas **ativas** (índice parcial): uma nota na lixeira não bloqueia um título. A migration precisa tratar títulos duplicados já existentes (sufixar com " (2)").

**Tags de matéria (F18):** ficam em `auto_tags`, separadas de `tags` (as do aluno). O cliente exibe a união das duas e marca as automáticas como não removíveis. Separar evita que o aluno apague a tag sem querer e evita misturar o que o sistema controla com o que o usuário controla. O nome vem de `class_sessions.subject` normalizado em *slug* (minúsculas, sem acento, espaços → `-`), ex.: `Estrutura de Dados II` → `estrutura-de-dados-ii`. `notes.create` e `notes.update` recalculam `auto_tags` sempre que `classSessionId` mudar; uma migration de dados preenche `auto_tags` das notas já vinculadas. O filtro por tag (`notes.list`) passa a considerar `tags` e `auto_tags`.

**Alterações em `note_links`**
- Novo `linkType`: `"wikilink"` (além de `manual` e `ai_suggested`).
- `reason` deixa de ser obrigatório para `wikilink` (nullable, ou preenchido automaticamente com o trecho de contexto). Links `manual` e `ai_suggested` continuam exigindo.
- Índice único `(source_note_id, target_note_id, link_type)` para permitir que o mesmo par exista como `wikilink` e como vínculo semântico `manual`.

**Reordenação:** `position` inteiro com *renumeração do grupo de irmãos* a cada move (grupos são pequenos). Evita complexidade de índices fracionários; revisar se um grupo passar de ~500 itens.

**Limites:** profundidade máxima de pastas = 8; nome de pasta até 100 caracteres; conteúdo de nota até 200 KB. Impedir mover pasta para dentro de si mesma ou de um descendente.

### 4.3 Wikilinks: parsing, resolução e sincronização

**Sintaxe suportada:** `[[Título]]`, `[[Título|alias]]`. Âncoras `[[Título#Seção]]` ficam para v2 (o parser deve ignorar o `#...` sem quebrar).

**Parser compartilhado:** extrair a regex hoje embutida em `WikilinkText` para um módulo puro (ex.: `packages/api` ou um pacote `shared`) usado pelo app e pelo servidor, ignorando ocorrências dentro de blocos/trechos de código.

**Sincronização no salvamento (servidor):** em `notes.update` (e `create`), na mesma transação:
1. Extrair os títulos de `[[...]]` do conteúdo.
2. Resolver cada título para uma nota do usuário (case-insensitive).
3. Substituir o conjunto de `note_links` de `linkType = 'wikilink'` desta nota pelo conjunto resolvido (insere novos, remove os que sumiram do texto). Auto-link (nota apontando para si) é ignorado.
4. Links não resolvidos **não** geram linha; o cliente os identifica comparando com a lista de títulos.

Isso torna o texto a fonte da verdade para wikilinks e elimina a divergência atual entre texto e tabela. Vínculos `manual`/`ai_suggested` ficam intocados.

**Renomear (F8):** `notes.update` com mudança de título, na mesma transação, reescreve `[[Antigo]]` e `[[Antigo|alias]]` para o novo título no conteúdo das notas que apontam para ela (via `note_links` do tipo `wikilink`) e re-sincroniza. Retornar a lista de notas afetadas para o cliente atualizar o cache.

**Excluir nota (vai para a lixeira):** os `[[links]]` que apontavam para ela permanecem no texto e passam a aparecer como não resolvidos, porque a resolução e os backlinks só consideram notas ativas (`deleted_at is null`). É o comportamento do Obsidian e evita reescrever notas silenciosamente. As linhas de `note_links` da nota excluída são mantidas, só deixam de ser exibidas, para que ao **restaurar** os links voltem sem reprocessar as outras notas. Ao restaurar, o servidor re-sincroniza os wikilinks da nota.

### 4.3.1 Lixeira (exclusão lógica)

- Excluir nota ou pasta marca `deleted_at = now()`. Excluir uma pasta marca ela e todos os descendentes (pastas e notas) com o **mesmo `delete_batch`**, para que restaurar a pasta traga de volta exatamente o que saiu junto com ela. Itens que já estavam na lixeira antes (outro `delete_batch`) não são afetados.
- **Restaurar nota:** `deleted_at = null`. Se a pasta original estiver na lixeira ou não existir, vai para a raiz. Se já existir uma nota ativa com o mesmo título, a restaurada recebe o sufixo " (restaurada)" (e, se ainda colidir, " (restaurada 2)").
- **Restaurar pasta:** restaura todos os itens do mesmo `delete_batch`. Se o pai da pasta estiver na lixeira, ela volta para a raiz. Nomes que colidirem recebem sufixo, como acima.
- **Excluir definitivamente / esvaziar lixeira / expurgo de 30 dias:** `DELETE` físico, com `note_links` removidos por cascata. O expurgo roda como tarefa periódica no servidor (a definir: `setInterval` no processo Fastify ou cron externo; ver §7).
- Mover para dentro de pasta na lixeira é bloqueado. Notas na lixeira não aparecem em busca, autocomplete de `[[`, sugestões de links nem na árvore.

### 4.4 API (tRPC)

Novo `foldersRouter` e extensões em `notesRouter`. Todos protegidos (§4.1).

```
folders.tree          -> árvore completa de pastas + notas (id, title, folderId, position, updatedAt)
folders.create        { name, parentId? }
folders.rename        { id, name }
folders.move          { id, parentId | null, position }
folders.delete        { id, mode: "moveToParent" | "trashAll" }   -- exclusão lógica (lixeira)

notes.listTree        (substitui o list sem filtros para a navegação; list com filtros permanece para busca)
notes.move            { id, folderId | null, position }
notes.reorder         { folderId | null, orderedIds: uuid[] }
notes.resolveTitles   { titles: string[] } -> { title, noteId | null }[]   -- usado na pré-visualização e no autocomplete
notes.searchTitles    { query, limit }     -- autocomplete do `[[`

trash.list            -> notas e pastas excluídas (id, tipo, nome/título, deletedAt, daysLeft)
trash.restore         { id, type: "note" | "folder" }
trash.deletePermanently { id, type: "note" | "folder" }
trash.empty           -> exclui definitivamente tudo que está na lixeira do usuário
```
`notes.delete` passa a ser exclusão lógica (mantém o nome da procedure; o comportamento muda de `DELETE` para `deleted_at`). Todas as consultas de notas e pastas filtram `deleted_at is null`, exceto `trash.*`. O expurgo de 30 dias roda no servidor fora do tRPC.
`notes.update` passa a devolver também `affectedNotes` (rename) e os links resolvidos.

**Sincronização no app:** servidor é a fonte da verdade; TanStack Query (já é dependência) com update otimista para mover/reordenar e autosave com debounce (~1,5 s e ao sair da tela). Em falha de rede, manter o rascunho em memória, exibir "não salvo" e tentar de novo ao reconectar (`expo-network`/`netinfo` já estão no projeto). Resolução de conflito em v1: *last write wins* com `updatedAt` enviado pelo cliente; se o servidor tiver versão mais nova, retornar `CONFLICT` e o app pergunta "manter minha versão / usar a do servidor".

### 4.5 Frontend (`apps/native`)

**Telas / estrutura** (seguindo `features/notas/`):
- `NotasScreen`: vira **navegador de arquivos** (breadcrumb de pastas, lista de pastas + notas, ação "Nova nota / Nova pasta", modo busca).
- `NotaDetalhesScreen`: ganha abas **Editar | Visualizar**, barra de formatação, painel de backlinks e links de saída.
- Novos componentes: `FolderTree`/`FolderList`, `MoveToSheet` (bottom sheet com a árvore para escolher destino, usando `@gorhom/bottom-sheet` já presente), `WikilinkSuggestionPopover`, `MarkdownView`.
- ViewModels: `notas.viewmodel.ts` deixa de usar o atom com mock e passa a usar queries/mutations tRPC; novo `pastas.viewmodel.ts`; extração do parser de wikilink para módulo testável.

**Renderização Markdown:** adotar uma biblioteca de render Markdown para React Native com suporte a regras customizadas, e registrar uma regra/plugin para `[[wikilink]]`, em vez de estender o regex de `WikilinkText` para Markdown inteiro. `WikilinkText` pode ser reaproveitado como o nó inline do wikilink. A escolha exata da biblioteca é decisão de implementação (critérios: suporte a Expo SDK 57, sem WebView, estilização via tokens do heroui/uniwind).

**Editor:** `TextInput` multilinha controlado, com `selection` rastreada para a barra de formatação inserir/envolver trechos e para detectar `[[` antes do cursor. **Não** usar WebView/editor rich-text em v1 (peso, teclado e integração com Expo); fica registrado como evolução.

**Mover e reordenar (F10/F11), em duas fases:**
1. *Fase A (obrigatória):* menu da nota/pasta com **"Mover para…"** (sheet com a árvore) e botões **subir/descer**. É acessível e testável.
2. *Fase B:* arrastar-e-soltar para reordenar na lista, via gesture-handler + reanimated (já no projeto). Entra só depois da A estável, pois drag em listas aninhadas no RN é a parte de maior risco.

### 4.6 Tratamento de erros e casos de borda
- Título duplicado ao criar/renomear: erro claro `CONFLICT` com sugestão de nome.
- Título vazio ou só espaços: bloqueado.
- Título com caracteres que quebram o wikilink (`[`, `]`, `|`, `#`): bloquear ou sanitizar no título, já que ele precisa ser referenciável.
- Mover pasta para si mesma/descendente: `BAD_REQUEST`.
- Wikilink dentro de bloco de código: não vira link.
- `[[]]` vazio: ignorado.
- Nota enviada à lixeira enquanto aberta em outro lugar: `NOT_FOUND` tratado e volta para a lista.
- Restaurar com título já em uso por nota ativa: sufixo automático (§4.3.1), nunca falha.
- Aula sem matéria legível (`subject` vazio após normalizar): não gera tag automática.
- Duas aulas com a mesma matéria (horários diferentes): geram a mesma hashtag, que é o desejado.
- Conteúdo acima do limite: bloqueia o salvamento com mensagem.

## 5. Plano de entrega (fases)

1. **Fundação:** auth nas notas (§4.1) + ligar o app ao `notesRouter` removendo o mock + testes de isolamento entre usuários.
2. **Pastas e lixeira:** schema `folders`, `folderId`/`position`, `deleted_at`/`delete_batch`, router, navegador de arquivos, mover/renomear/excluir (Fase A), tela Lixeira (restaurar, excluir definitivamente, esvaziar) e expurgo de 30 dias. Inclui `auto_tags` e a migration de dados da hashtag de matéria.
3. **Editor Markdown:** abas Editar/Visualizar, render Markdown, barra de formatação, autosave.
4. **Links:** unicidade de título, parser compartilhado, sync de `note_links`, autocomplete `[[`, backlinks, link não resolvido → criar, rename propagado.
5. **Reordenação por arraste (Fase B)** e polimento.

Cada fase deve fechar com: `pnpm --filter server run build`, `pnpm --filter native exec tsc --noEmit` e `pnpm test` limpos (exigência do `GEMINI.md`).

## 6. Estratégia de testes

- **Server (Vitest):** autorização por usuário em cada procedimento; ciclo de vida de pastas (profundidade, ciclos, delete modes); sync de wikilinks (adiciona, remove, ignora código, ignora auto-link, não resolvido); rename propagando; unicidade de título; reorder/move renumerando irmãos.
- **Parser compartilhado:** tabela de casos (alias, `#seção`, vazio, aninhado em código, múltiplos por linha).
- **Native (Jest):** viewmodels de notas/pastas (mock de tRPC), `MarkdownView` renderizando wikilinks clicáveis e não resolvidos, popover de autocomplete, fluxo mover/reordenar, autosave com debounce e erro de rede.
- Manter e atualizar os testes existentes em `features/notas/__tests__/` que hoje dependem do mock.
- **Lixeira (Vitest):** excluir pasta marca descendentes com o mesmo `delete_batch`; restaurar pasta traz só o próprio lote; restaurar nota com pasta na lixeira vai para a raiz; restaurar com título em uso aplica sufixo; título de nota na lixeira não bloqueia criação de outro igual; busca, autocomplete e backlinks ignoram itens na lixeira; expurgo remove só itens com mais de 30 dias; isolamento entre usuários em `trash.*`.
- **Hashtag de matéria (Vitest):** `auto_tags` criada ao vincular aula, trocada ao mudar a aula, removida ao desvincular; `tags` do aluno não é alterada; filtro por tag encontra por `tags` e por `auto_tags`; normalização do slug (acentos, espaços, caixa).
- **Native (Jest):** tela da Lixeira (listar, restaurar, excluir definitivamente, esvaziar, confirmações) e tag automática exibida sem opção de remover.

## 7. Decisões e questões em aberto

**Decididas**
1. Título de nota **não pode repetir** por usuário (sem diferenciar caixa), entre notas ativas.
2. Notas ligadas a aula **ganham uma hashtag com o nome da matéria** (F18, `auto_tags`), em vez de virar pasta automática.
3. Excluir **envia para a lixeira**, com restauração e expurgo definitivo (F14–F17).

**Premissas desta spec (confirmar)**
4. A "hashtag" de matéria é uma **tag no campo de tags**, não um `#texto` inserido no conteúdo da nota. Parsear `#tag` do texto continua fora de escopo.
5. Retenção da lixeira de **30 dias**.
6. `suggestLinks` (sugestões da IA) continua coexistindo com wikilinks, como vínculo semântico separado.

**Em aberto**
7. **Offline:** v1 "melhor esforço" é suficiente, ou é requisito ter fila offline completa?
8. **Expurgo de 30 dias:** rodar como tarefa dentro do processo Fastify (simples, mas depende do servidor estar no ar) ou cron externo? Hoje o servidor não tem nenhuma tarefa agendada, e o banco aponta para `localhost` em dev.
9. **Formato da hashtag:** `#engenharia-de-software` (slug, como proposto) ou manter o nome como o Google Classroom entrega, com espaços e acentos?

## 8. Como foi implementado (v1)

Esta seção registra onde a implementação seguiu ou desviou do desenho acima. Onde há conflito, vale esta seção.

**Pacote compartilhado `packages/notes` (`@busuucsal-v3/notes`).** Funções puras usadas pelo servidor e pelo app: limites (§4.2), validação de título e nome de pasta, slug da matéria, parser de wikilinks (ignora código, aceita `|apelido` e `#seção`), reescrita de links ao renomear, autocomplete de `[[` e o parser de Markdown. Os imports internos são sem extensão para o Metro e o Jest resolverem o código-fonte direto. Testes próprios com Vitest (`pnpm --filter @busuucsal-v3/notes test`).

**Markdown: parser próprio em vez de biblioteca.** O §4.5 previa uma biblioteca de render. Optou-se por um parser do subconjunto suportado (títulos, parágrafos, listas, tarefas, citação, código, linha, negrito, itálico, código inline, links e wikilinks) no pacote compartilhado, renderizado por `components/molecules/MarkdownView.tsx` com componentes nativos. Motivos: nenhum risco de compatibilidade com o Expo SDK 57, e as mesmas regras de "wikilink dentro de código não conta" no servidor e no app. Limitação conhecida: listas aninhadas são achatadas.

**Servidor.**
- Migração `0008_add_notes_folders_trash.sql`: estrutura gerada pelo Drizzle mais passos de dados escritos à mão, que aparam títulos, desduplicam títulos com " (2)", removem vínculos repetidos e preenchem `auto_tags`. O teste `test/migration-0008.test.ts` confere que o slug em SQL bate com `slugifySubject`. Limitação conhecida: a desduplicação pode colidir se já existir uma nota chamada "X (2)".
- Regras em `src/services/notes/` (notas, pastas, ordenação, lixeira) e routers finos `notes`, `folders` e `trash`, todos com `protectedProcedure` e checagem de dono.
- **API:** `notes.searchTitles` e `notes.resolveTitles` (§4.4) não foram criados. `folders.tree` já traz todas as notas (título, prévia, tags, contagem de vínculos), e o app resolve e completa links localmente. `notes.getById` devolve `wikilinks` com cada destino resolvido. `notes.list({ search })` é usado para buscar no texto completo.
- **Vínculos de wikilinks em notas antigas:** são criados no próximo salvamento de cada nota. A renomeação reescreve links procurando no texto (não só em `note_links`), então funciona também com notas anteriores à migração.
- **Expurgo de 30 dias** (questão 8): roda dentro do processo do Fastify (`services/notes/trash-purge.ts`), ao subir e a cada 6 h.
- **Testes:** os routers de notas, pastas e lixeira rodam contra um Postgres em memória (PGlite, dependência só de desenvolvimento) com as migrações reais (`test/helpers/pglite-db.ts`). O banco falso antigo não cobre transações, índices parciais e `lower()`. O teste de materiais e quiz que estava no mesmo arquivo continua com o banco falso, em `test/materials-quiz.router.test.ts`.

**App.**
- **Estado:** o §4.4 previa TanStack Query. Foi seguido o padrão das outras telas: atoms e ações do jotai em `state/notes.ts`, chamando `utils/trpc.ts`. Nos testes e sem servidor configurado, as chamadas devolvem os dados de exemplo de `notas.model.ts`, como nas demais telas. Erros de notas não são mascarados: o app mostra a mensagem, e "Entre com sua conta" quando falta sessão.
- **Telas:** `NotasScreen` (navegador com breadcrumb, busca em todas as pastas, filtro por tag e menu "⋯" com renomear, mover, subir, descer e lixeira), `NotaDetalhesScreen` (Visualizar/Editar, barra de formatação, autocomplete de `[[`, criação da nota de um link pendente, backlinks) e `LixeiraScreen` (rota `/lixeira`).
- **Autosave:** 1,5 s depois da última tecla, ao concluir a edição e ao sair da tela. O conflito de versão mostra "Manter a minha / Usar a do servidor", e o autosave fica parado até a escolha. Falha de rede mantém o rascunho e oferece "Tentar salvar de novo".
- **Offline** (questão 7): "melhor esforço". Não há nova tentativa automática quando a conexão volta, só a manual e a do próximo salvamento.
- **Arrastar e soltar** (fase B do §4.5): não implementado. A reordenação é por "Subir/Descer".
- **Vincular nota a uma aula pela interface:** o servidor aceita `classSessionId` em `create`/`update`, mas nenhuma tela do app envia esse campo ainda. A hashtag aparece nas notas que já têm vínculo.
