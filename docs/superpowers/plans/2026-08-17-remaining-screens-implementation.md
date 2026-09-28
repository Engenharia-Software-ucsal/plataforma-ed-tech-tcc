# Remaining Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four screens deferred from the first design-system plan — Detalhes da Aula (Materiais/IA tabs), Quiz, Resultado do Quiz, and Notificações — using the same atomic components, MVVM, Jotai (where state is genuinely shared), and test-per-file pattern already established in `apps/native`.

**Architecture:** Same as the prior plan: `components/atoms|molecules|organisms/` for shared UI, `features/<screen>/` for MVVM (`*.model.ts` + `*.viewmodel.ts` + `<Screen>.tsx`), thin Expo Router route files. All four screens here have state that is local to a single screen (active tab, quiz progress, selected answer) — none of it needs to survive navigation or be shared across screens, so view-models use plain `useState`/`useCallback`, not Jotai. Jotai stays reserved for state that actually crosses screens (as `state/busStopFilter.ts` and `state/favoriteBusTimes.ts` already do).

**Tech Stack:** Expo Router, React Native 0.86, `uniwind` (Tailwind v4 for RN), `lucide-react-native` icons, Jest (`jest-expo` preset) + `@testing-library/react-native` v14 (async `render`/`act`/`renderHook` — every render/act call in this plan is `await`ed, matching the pattern the first plan's execution converged on).

**Spec:** `busu-ucsal-design.pen` (screens: Tela Detalhes da Aula, Tela Detalhes da Aula - IA, Tela Quiz, Tela Resultado Quiz, Tela Notificações) — same "Violet Void" dark palette as the first plan.

## Global Constraints

- Design tokens are the same fixed hex values as the first plan, already registered in `apps/native/global.css` as Tailwind utilities — reuse them, never hardcode a hex value in a new component: `bg-surface-primary` `#0A0A0A`, `bg-surface-secondary` `#141420`, `text-foreground-primary` `#FFFFFF`, `text-foreground-secondary` `#C7C7D1`, `text-foreground-muted` `#A1A1AA`, `bg-accent-primary`/`text-accent-primary` `#582CFF`, `text-accent-secondary` `#BF40FF`, `text-accent-tertiary` `#00F2FF`, `bg-accent-light` `#582CFF26`, `border-border-subtle` `#222233`, `text-success`/`bg-success` `#10B981`, `text-warning`/`bg-warning` `#F59E0B`, `text-danger`/`bg-danger` `#EF4444`, `rounded-sm-card` 4px, `rounded-lg-card` 8px.
- Fonts: `font-heading` (Inter), `font-body` (Geist), `font-caption` (FunnelSans), `font-mono` (GeistMono) — apply via `AppText`'s `variant` prop, never set `fontFamily` directly.
- Every new atom/molecule/organism/screen/view-model gets a colocated `__tests__/*.test.tsx` (or `.test.ts` for pure logic) using `@testing-library/react-native`. `render`, `act`, and `renderHook` are async in this version — always `await` them; `fireEvent.press` that triggers an async state transition must be wrapped in `await act(async () => { ... })`.
- Screens that use `Container` (which calls `useSafeAreaInsets`) must be rendered inside `<SafeAreaProvider>` in tests — the project already registers the official mock via `jest.mock("react-native-safe-area-context", ...)` in `apps/native/jest.setup.ts`, so just wrap: `render(<SafeAreaProvider><Screen /></SafeAreaProvider>)`.
- Route files in `app/` never contain JSX beyond `return <ScreenComponent />`.
- Run `pnpm --filter native test <path>` for every test step, `pnpm --filter native exec tsc --noEmit` and `pnpm --filter native exec biome check <touched files>` before each task's commit — this workspace's jest/tsconfig only resolve correctly through the `native` filter.
- Reuse existing atoms (`AppText`, `AppButton`, `Chip`, `IconBadge`) and molecules (`DelayBadge`, `DifficultyTag`) before creating new ones — do not duplicate a chip-style component.

---

## File Structure

```
apps/native/
  components/
    molecules/
      TabSwitcher.tsx                        # CREATE — 2-way segmented tab (Materiais/IA)
      FileRow.tsx                             # CREATE — Classroom file row (icon, name, meta, badge)
      QuizOptionRow.tsx                       # CREATE — quiz answer row (letter, text, selected state)
      ScoreRing.tsx                           # CREATE — circular score display (gradient ring + number)
      TopicResultRow.tsx                      # CREATE — quiz result topic row (check/x icon + label)
      NotificationRow.tsx                     # CREATE — notification list row (icon, title, desc, time, dot)
      __tests__/
        TabSwitcher.test.tsx
        FileRow.test.tsx
        QuizOptionRow.test.tsx
        ScoreRing.test.tsx
        TopicResultRow.test.tsx
        NotificationRow.test.tsx
    organisms/
      InsightCard.tsx                         # CREATE — AI insights panel (summary, coverage, points, quiz CTA)
      __tests__/
        InsightCard.test.tsx
  features/
    aula-detalhes/
      aulaDetalhes.model.ts                   # CREATE
      aulaDetalhes.viewmodel.ts               # CREATE
      AulaDetalhesScreen.tsx                  # CREATE
      __tests__/
        aulaDetalhes.viewmodel.test.ts
        AulaDetalhesScreen.test.tsx
    quiz/
      quiz.model.ts                           # CREATE
      quiz.viewmodel.ts                       # CREATE
      QuizScreen.tsx                          # CREATE
      __tests__/
        quiz.viewmodel.test.ts
        QuizScreen.test.tsx
    quiz-resultado/
      quizResultado.model.ts                  # CREATE
      QuizResultadoScreen.tsx                 # CREATE (no view-model — pure static display, see Task 7)
      __tests__/
        QuizResultadoScreen.test.tsx
    notificacoes/
      notificacoes.model.ts                   # CREATE
      NotificacoesScreen.tsx                  # CREATE (no view-model — pure static display, see Task 9)
      __tests__/
        NotificacoesScreen.test.tsx
  app/
    aula-detalhes.tsx                         # CREATE — thin route
    quiz.tsx                                  # CREATE — thin route
    quiz-resultado.tsx                        # CREATE — thin route
    notificacoes.tsx                          # CREATE — thin route
    _layout.tsx                               # MODIFY — register the 4 new Stack.Screen entries
```

---

### Task 1: Molecules — `TabSwitcher` and `FileRow`

**Files:**
- Create: `apps/native/components/molecules/TabSwitcher.tsx`
- Create: `apps/native/components/molecules/FileRow.tsx`
- Test: `apps/native/components/molecules/__tests__/TabSwitcher.test.tsx`
- Test: `apps/native/components/molecules/__tests__/FileRow.test.tsx`

**Interfaces:**
- Consumes: `AppText` (`@/components/atoms/AppText`), `Chip` (`@/components/atoms/Chip`), `cn` (`@/lib/cn`), icons from `lucide-react-native`.
- Produces:
  - `TabSwitcher` — props `{ tabs: readonly { key: string; label: string; icon: React.ReactNode }[]; activeKey: string; onChange: (key: string) => void }`. Renders one pill per tab; the active one gets `bg-accent-primary`, inactive ones get `bg-surface-secondary border border-border-subtle`. Each pill has `testID={`tab-${key}`}`.
  - `FileRow` — props `{ icon: React.ReactNode; name: string; meta: string; badge?: "novo" | "lido"; onPress?: () => void }`. Renders an icon box, name/meta column, and a trailing badge (`"novo"` → `Chip` tone `"accent"`; `"lido"` → a small check glyph) or a chevron-right icon when no badge is given.
  - Consumed by `InsightCard` (Task 2) and `AulaDetalhesScreen` (Task 3).

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/native/components/molecules/__tests__/TabSwitcher.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { TabSwitcher } from "@/components/molecules/TabSwitcher";

const TABS = [
  { key: "materiais", label: "Materiais", icon: <Text>📁</Text> },
  { key: "ia", label: "IA", icon: <Text>✨</Text> },
] as const;

describe("TabSwitcher", () => {
  it("renders every tab label", async () => {
    await render(<TabSwitcher tabs={TABS} activeKey="materiais" onChange={jest.fn()} />);
    expect(screen.getByText("Materiais")).toBeTruthy();
    expect(screen.getByText("IA")).toBeTruthy();
  });

  it("calls onChange with the pressed tab key", async () => {
    const onChange = jest.fn();
    await render(<TabSwitcher tabs={TABS} activeKey="materiais" onChange={onChange} />);
    fireEvent.press(screen.getByTestId("tab-ia"));
    expect(onChange).toHaveBeenCalledWith("ia");
  });

  it("marks the active tab with the accent background class", async () => {
    await render(<TabSwitcher tabs={TABS} activeKey="ia" onChange={jest.fn()} />);
    expect(screen.getByTestId("tab-ia").props.className).toContain("bg-accent-primary");
  });
});
```

```tsx
// apps/native/components/molecules/__tests__/FileRow.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { FileRow } from "@/components/molecules/FileRow";

describe("FileRow", () => {
  it("renders name and meta", async () => {
    await render(
      <FileRow icon={<Text>ICON</Text>} name="Slides - Aula 04.pdf" meta="2.4 MB · PDF" />,
    );
    expect(screen.getByText("Slides - Aula 04.pdf")).toBeTruthy();
    expect(screen.getByText("2.4 MB · PDF")).toBeTruthy();
  });

  it("renders a novo badge when requested", async () => {
    await render(
      <FileRow icon={<Text>ICON</Text>} name="Lista.xlsx" meta="180 KB" badge="novo" />,
    );
    expect(screen.getByText("novo")).toBeTruthy();
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(
      <FileRow icon={<Text>ICON</Text>} name="Lista.xlsx" meta="180 KB" onPress={onPress} testID="row" />,
    );
    fireEvent.press(screen.getByTestId("row"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter native test TabSwitcher.test.tsx FileRow.test.tsx`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/native/components/molecules/TabSwitcher.tsx
import { Pressable, View } from "react-native";
import { cn } from "@/lib/cn";
import { AppText } from "@/components/atoms/AppText";

export type TabSwitcherTab = { key: string; label: string; icon: React.ReactNode };

export type TabSwitcherProps = {
  tabs: readonly TabSwitcherTab[];
  activeKey: string;
  onChange: (key: string) => void;
};

export function TabSwitcher({ tabs, activeKey, onChange }: TabSwitcherProps) {
  return (
    <View className="flex-row gap-2">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            testID={`tab-${tab.key}`}
            onPress={() => onChange(tab.key)}
            className={cn(
              "flex-1 flex-row items-center justify-center gap-1.5 rounded-sm-card border py-2.5",
              active
                ? "border-accent-primary bg-accent-primary"
                : "border-border-subtle bg-surface-secondary",
            )}
          >
            {tab.icon}
            <AppText variant="body" tone={active ? "primary" : "muted"} className="text-sm font-semibold">
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
```

```tsx
// apps/native/components/molecules/FileRow.tsx
import { Pressable, View } from "react-native";
import { Check, ChevronRight } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import { Chip } from "@/components/atoms/Chip";

export type FileRowProps = {
  icon: React.ReactNode;
  name: string;
  meta: string;
  badge?: "novo" | "lido";
  onPress?: () => void;
  testID?: string;
};

export function FileRow({ icon, name, meta, badge, onPress, testID }: FileRowProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
    >
      <View className="h-9 w-9 items-center justify-center rounded-sm-card bg-accent-light">
        {icon}
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="body" tone="primary" className="text-[13px] font-semibold">
          {name}
        </AppText>
        <AppText variant="caption" tone="muted" className="text-[11px]">
          {meta}
        </AppText>
      </View>
      {badge === "novo" && <Chip label="novo" tone="accent" />}
      {badge === "lido" && <Check size={16} color="#A1A1AA" />}
      {!badge && <ChevronRight size={16} color="#A1A1AA" />}
    </Pressable>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter native test TabSwitcher.test.tsx FileRow.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck and lint, then commit**

Run: `pnpm --filter native exec tsc --noEmit && pnpm --filter native exec biome check components/molecules/TabSwitcher.tsx components/molecules/FileRow.tsx components/molecules/__tests__/TabSwitcher.test.tsx components/molecules/__tests__/FileRow.test.tsx`

```bash
git add apps/native/components/molecules/TabSwitcher.tsx apps/native/components/molecules/FileRow.tsx apps/native/components/molecules/__tests__/TabSwitcher.test.tsx apps/native/components/molecules/__tests__/FileRow.test.tsx
git commit -m "feat: add TabSwitcher and FileRow molecules"
```

---

### Task 2: Organism — `InsightCard`

**Files:**
- Create: `apps/native/components/organisms/InsightCard.tsx`
- Test: `apps/native/components/organisms/__tests__/InsightCard.test.tsx`

**Interfaces:**
- Consumes: `AppText`, `AppButton`, `Chip`.
- Produces: `InsightCard` with props:
  ```ts
  type InsightCardProps = {
    summary: string;
    coverageText: string;
    points: string[];
    onGenerateQuiz: () => void;
  };
  ```
  Consumed by `AulaDetalhesScreen` (Task 3).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/native/components/organisms/__tests__/InsightCard.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { InsightCard } from "@/components/organisms/InsightCard";

const props = {
  summary: "IA analisou os slides e a gravação enviados pelo professor no Classroom.",
  coverageText: "Baseado em 2 de 4 materiais analisados",
  points: [
    "Princípios SOLID aplicados a microsserviços",
    "Padrão Circuit Breaker citado nos slides (pág. 14)",
  ],
  onGenerateQuiz: jest.fn(),
};

describe("InsightCard", () => {
  it("renders the summary, coverage text and every point", async () => {
    await render(<InsightCard {...props} />);
    expect(screen.getByText(props.summary)).toBeTruthy();
    expect(screen.getByText(props.coverageText)).toBeTruthy();
    for (const point of props.points) {
      expect(screen.getByText(point)).toBeTruthy();
    }
  });

  it("calls onGenerateQuiz when the quiz button is pressed", async () => {
    const onGenerateQuiz = jest.fn();
    await render(<InsightCard {...props} onGenerateQuiz={onGenerateQuiz} />);
    fireEvent.press(screen.getByText("Gerar quiz de revisão"));
    expect(onGenerateQuiz).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test InsightCard.test.tsx`
Expected: FAIL with "Cannot find module '@/components/organisms/InsightCard'".

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/native/components/organisms/InsightCard.tsx
import { View } from "react-native";
import { Brain, CircleCheckBig, Sparkles } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import { AppButton } from "@/components/atoms/AppButton";

export type InsightCardProps = {
  summary: string;
  coverageText: string;
  points: string[];
  onGenerateQuiz: () => void;
};

export function InsightCard({ summary, coverageText, points, onGenerateQuiz }: InsightCardProps) {
  return (
    <View className="gap-3 rounded-lg-card border border-accent-primary bg-accent-light p-4.5">
      <View className="flex-row items-center gap-2">
        <Sparkles size={16} color="#BF40FF" />
        <AppText variant="heading" tone="primary" className="text-sm font-bold">
          Insights dos materiais
        </AppText>
      </View>
      <AppText variant="caption" tone="muted" className="text-[11px]">
        {coverageText}
      </AppText>
      <AppText variant="body" tone="secondary" className="text-[13px]">
        {summary}
      </AppText>
      <View className="gap-1.5">
        {points.map((point) => (
          <View key={point} className="flex-row items-start gap-2">
            <CircleCheckBig size={14} color="#582CFF" />
            <AppText variant="body" tone="secondary" className="flex-1 text-xs">
              {point}
            </AppText>
          </View>
        ))}
      </View>
      <AppButton
        label="Gerar quiz de revisão"
        onPress={onGenerateQuiz}
        icon={<Brain size={14} color="#FFFFFF" />}
      />
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test InsightCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm --filter native exec tsc --noEmit
pnpm --filter native exec biome check components/organisms/InsightCard.tsx components/organisms/__tests__/InsightCard.test.tsx
git add apps/native/components/organisms/InsightCard.tsx apps/native/components/organisms/__tests__/InsightCard.test.tsx
git commit -m "feat: add InsightCard organism"
```

---

### Task 3: Aula Detalhes feature — model, view-model, view, route

**Files:**
- Create: `apps/native/features/aula-detalhes/aulaDetalhes.model.ts`
- Create: `apps/native/features/aula-detalhes/aulaDetalhes.viewmodel.ts`
- Create: `apps/native/features/aula-detalhes/AulaDetalhesScreen.tsx`
- Create: `apps/native/app/aula-detalhes.tsx`
- Modify: `apps/native/app/_layout.tsx`
- Test: `apps/native/features/aula-detalhes/__tests__/aulaDetalhes.viewmodel.test.ts`
- Test: `apps/native/features/aula-detalhes/__tests__/AulaDetalhesScreen.test.tsx`

**Interfaces:**
- Consumes: `Container`, `AppText`, `AppButton`, `TabSwitcher` (Task 1), `FileRow` (Task 1), `InsightCard` (Task 2).
- Produces: `ClassroomFile` type, `AulaDetalhesData` type, `AULA_DETALHES_MOCK: AulaDetalhesData`, `useAulaDetalhesViewModel()` returning `{ data: AulaDetalhesData; activeTab: "materiais" | "ia"; setActiveTab: (tab: "materiais" | "ia") => void }`, `<AulaDetalhesScreen />`.

- [ ] **Step 1: Write the failing view-model test**

```ts
// apps/native/features/aula-detalhes/__tests__/aulaDetalhes.viewmodel.test.ts
import { act, renderHook } from "@testing-library/react-native";
import { useAulaDetalhesViewModel } from "@/features/aula-detalhes/aulaDetalhes.viewmodel";

describe("useAulaDetalhesViewModel", () => {
  it("defaults the active tab to materiais", async () => {
    const { result } = await renderHook(() => useAulaDetalhesViewModel());
    expect(result.current.activeTab).toBe("materiais");
  });

  it("switches to the ia tab", async () => {
    const { result } = await renderHook(() => useAulaDetalhesViewModel());
    await act(async () => result.current.setActiveTab("ia"));
    expect(result.current.activeTab).toBe("ia");
  });

  it("exposes the mock class data", async () => {
    const { result } = await renderHook(() => useAulaDetalhesViewModel());
    expect(result.current.data.subject).toBe("Engenharia de Software");
    expect(result.current.data.files.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test aulaDetalhes.viewmodel.test.ts`
Expected: FAIL with "Cannot find module '@/features/aula-detalhes/aulaDetalhes.viewmodel'".

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/native/features/aula-detalhes/aulaDetalhes.model.ts
export type ClassroomFile = {
  id: string;
  name: string;
  meta: string;
  iconName: "file-text" | "file-spreadsheet" | "video" | "link";
  badge?: "novo" | "lido";
};

export type AulaDetalhesData = {
  subject: string;
  professor: string;
  schedule: string;
  room: string;
  topics: string[];
  syncedAgo: string;
  files: ClassroomFile[];
  insightSummary: string;
  insightCoverage: string;
  insightPoints: string[];
};

export const AULA_DETALHES_MOCK: AulaDetalhesData = {
  subject: "Engenharia de Software",
  professor: "Prof. Ana Silva",
  schedule: "08:00 - 09:30",
  room: "Sala 302 · Bloco A",
  topics: ["SOLID", "Microsserviços", "Circuit Breaker"],
  syncedAgo: "Sincronizado com Classroom há 2h",
  files: [
    { id: "f1", name: "Slides - Aula 04.pdf", meta: "2.4 MB · PDF", iconName: "file-text", badge: "novo" },
    { id: "f2", name: "Lista de Exercícios.xlsx", meta: "180 KB · Planilha", iconName: "file-spreadsheet" },
    { id: "f3", name: "Gravação da Aula.mp4", meta: "320 MB · Vídeo", iconName: "video", badge: "novo" },
    { id: "f4", name: "Repositório do Projeto", meta: "github.com/ucsal", iconName: "link" },
  ],
  insightSummary:
    "IA analisou os slides e a gravação enviados pelo professor no Classroom e extraiu os pontos abaixo.",
  insightCoverage: "Baseado em 2 de 4 materiais analisados",
  insightPoints: [
    "Princípios SOLID aplicados a microsserviços, extraídos dos slides",
    "Padrão Circuit Breaker citado nos slides (pág. 14)",
    "3 exercícios recomendados com base na Lista de Exercícios.xlsx",
  ],
};
```

```ts
// apps/native/features/aula-detalhes/aulaDetalhes.viewmodel.ts
import { useState } from "react";
import { AULA_DETALHES_MOCK } from "@/features/aula-detalhes/aulaDetalhes.model";

export type AulaDetalhesTab = "materiais" | "ia";

export function useAulaDetalhesViewModel() {
  const [activeTab, setActiveTab] = useState<AulaDetalhesTab>("materiais");
  return { data: AULA_DETALHES_MOCK, activeTab, setActiveTab } as const;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test aulaDetalhes.viewmodel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing view test**

```tsx
// apps/native/features/aula-detalhes/__tests__/AulaDetalhesScreen.test.tsx
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AulaDetalhesScreen } from "@/features/aula-detalhes/AulaDetalhesScreen";

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <AulaDetalhesScreen />
    </SafeAreaProvider>,
  );
}

describe("AulaDetalhesScreen", () => {
  it("renders the subject and the file list by default", async () => {
    await renderScreen();
    expect(screen.getByText("Engenharia de Software")).toBeTruthy();
    expect(screen.getByText("Slides - Aula 04.pdf")).toBeTruthy();
  });

  it("switches to the IA tab and shows the insight card", async () => {
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId("tab-ia"));
    });
    expect(screen.getByText("Gerar quiz de revisão")).toBeTruthy();
    expect(screen.queryByText("Slides - Aula 04.pdf")).toBeNull();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter native test AulaDetalhesScreen.test.tsx`
Expected: FAIL with "Cannot find module '@/features/aula-detalhes/AulaDetalhesScreen'".

- [ ] **Step 7: Write minimal implementation**

```tsx
// apps/native/features/aula-detalhes/AulaDetalhesScreen.tsx
import { View } from "react-native";
import { ChevronLeft, Download, GraduationCap, MapPin, User, Clock3 } from "lucide-react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { AppButton } from "@/components/atoms/AppButton";
import { Chip } from "@/components/atoms/Chip";
import { TabSwitcher } from "@/components/molecules/TabSwitcher";
import { FileRow } from "@/components/molecules/FileRow";
import { InsightCard } from "@/components/organisms/InsightCard";
import { useAulaDetalhesViewModel } from "@/features/aula-detalhes/aulaDetalhes.viewmodel";

const FILE_ICON: Record<string, React.ReactNode> = {
  "file-text": <Download size={16} color="#582CFF" />,
  "file-spreadsheet": <Download size={16} color="#582CFF" />,
  video: <Download size={16} color="#582CFF" />,
  link: <Download size={16} color="#582CFF" />,
};

export function AulaDetalhesScreen() {
  const { data, activeTab, setActiveTab } = useAulaDetalhesViewModel();

  return (
    <Container className="bg-surface-primary">
      <View className="gap-6 p-5">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary">
            <ChevronLeft size={18} color="#FFFFFF" />
          </View>
          <AppText variant="heading" tone="primary" className="text-lg font-bold">
            Detalhes da Aula
          </AppText>
        </View>

        <View className="gap-2">
          <AppText variant="heading" tone="primary" className="text-[22px] font-bold">
            {data.subject}
          </AppText>
          <View className="flex-row flex-wrap items-center gap-3">
            <View className="flex-row items-center gap-1">
              <User size={12} color="#A1A1AA" />
              <AppText variant="body" tone="muted" className="text-xs">{data.professor}</AppText>
            </View>
            <View className="flex-row items-center gap-1">
              <Clock3 size={12} color="#A1A1AA" />
              <AppText variant="body" tone="muted" className="text-xs">{data.schedule}</AppText>
            </View>
            <View className="flex-row items-center gap-1">
              <MapPin size={12} color="#A1A1AA" />
              <AppText variant="body" tone="muted" className="text-xs">{data.room}</AppText>
            </View>
          </View>
          <View className="flex-row gap-1.5">
            {data.topics.map((topic) => (
              <Chip key={topic} label={topic} tone="accent" />
            ))}
          </View>
          <AppText variant="caption" tone="muted" className="text-[11px]">
            {data.syncedAgo}
          </AppText>
        </View>

        <TabSwitcher
          tabs={[
            { key: "materiais", label: "Materiais", icon: <Download size={14} color="#A1A1AA" /> },
            { key: "ia", label: "IA", icon: <GraduationCap size={14} color="#A1A1AA" /> },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as "materiais" | "ia")}
        />

        {activeTab === "materiais" ? (
          <View className="gap-3">
            <AppText variant="heading" tone="primary" className="text-base font-semibold">
              Materiais do Classroom
            </AppText>
            <View className="gap-2.5">
              {data.files.map((file) => (
                <FileRow
                  key={file.id}
                  icon={FILE_ICON[file.iconName]}
                  name={file.name}
                  meta={file.meta}
                  badge={file.badge}
                />
              ))}
            </View>
            <AppButton
              label="Baixar todos os materiais"
              variant="outline"
              onPress={() => {}}
              icon={<Download size={14} color="#FFFFFF" />}
            />
          </View>
        ) : (
          <InsightCard
            summary={data.insightSummary}
            coverageText={data.insightCoverage}
            points={data.insightPoints}
            onGenerateQuiz={() => {}}
          />
        )}
      </View>
    </Container>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter native test AulaDetalhesScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Wire the route**

Create `apps/native/app/aula-detalhes.tsx`:

```tsx
import { AulaDetalhesScreen } from "@/features/aula-detalhes/AulaDetalhesScreen";

export default function AulaDetalhes() {
  return <AulaDetalhesScreen />;
}
```

Add a `Stack.Screen` entry to `apps/native/app/_layout.tsx`'s `StackLayout` function, alongside the existing `login` and `modal` entries:

```tsx
<Stack.Screen name="aula-detalhes" options={{ headerShown: false }} />
```

- [ ] **Step 10: Full local check and commit**

```bash
pnpm --filter native test
pnpm --filter native exec tsc --noEmit
pnpm --filter native exec biome check features/aula-detalhes app/aula-detalhes.tsx app/_layout.tsx
git add apps/native/features/aula-detalhes apps/native/app/aula-detalhes.tsx apps/native/app/_layout.tsx
git commit -m "feat: implement Detalhes da Aula screen (Materiais/IA tabs) with MVVM"
```

---

### Task 4: Molecules — `QuizOptionRow`

**Files:**
- Create: `apps/native/components/molecules/QuizOptionRow.tsx`
- Test: `apps/native/components/molecules/__tests__/QuizOptionRow.test.tsx`

**Interfaces:**
- Consumes: `AppText`.
- Produces: `QuizOptionRow` with props `{ letter: string; text: string; selected: boolean; onPress: () => void }`. Consumed by `QuizScreen` (Task 5).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/native/components/molecules/__tests__/QuizOptionRow.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { QuizOptionRow } from "@/components/molecules/QuizOptionRow";

describe("QuizOptionRow", () => {
  it("renders the letter and text", async () => {
    await render(
      <QuizOptionRow letter="B" text="Single Responsibility Principle" selected={false} onPress={jest.fn()} />,
    );
    expect(screen.getByText("B")).toBeTruthy();
    expect(screen.getByText("Single Responsibility Principle")).toBeTruthy();
  });

  it("applies the accent border when selected", async () => {
    await render(
      <QuizOptionRow letter="B" text="SRP" selected testID="opt" onPress={jest.fn()} />,
    );
    expect(screen.getByTestId("opt").props.className).toContain("border-accent-primary");
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(
      <QuizOptionRow letter="A" text="OCP" selected={false} onPress={onPress} testID="opt" />,
    );
    fireEvent.press(screen.getByTestId("opt"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test QuizOptionRow.test.tsx`
Expected: FAIL with "Cannot find module '@/components/molecules/QuizOptionRow'".

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/native/components/molecules/QuizOptionRow.tsx
import { Pressable, View } from "react-native";
import { CircleCheckBig } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { AppText } from "@/components/atoms/AppText";

export type QuizOptionRowProps = {
  letter: string;
  text: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

export function QuizOptionRow({ letter, text, selected, onPress, testID }: QuizOptionRowProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 rounded-lg-card border p-3.5",
        selected ? "border-accent-primary bg-accent-light" : "border-border-subtle bg-surface-primary",
      )}
    >
      <View
        className={cn(
          "h-6.5 w-6.5 items-center justify-center rounded-sm-card",
          selected ? "bg-accent-primary" : "bg-border-subtle",
        )}
      >
        <AppText variant="mono" tone={selected ? "primary" : "muted"} className="text-xs font-bold">
          {letter}
        </AppText>
      </View>
      <AppText
        variant="body"
        tone="primary"
        className={cn("flex-1 text-[13px]", selected && "font-semibold")}
      >
        {text}
      </AppText>
      {selected && <CircleCheckBig size={18} color="#582CFF" />}
    </Pressable>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test QuizOptionRow.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm --filter native exec tsc --noEmit
pnpm --filter native exec biome check components/molecules/QuizOptionRow.tsx components/molecules/__tests__/QuizOptionRow.test.tsx
git add apps/native/components/molecules/QuizOptionRow.tsx apps/native/components/molecules/__tests__/QuizOptionRow.test.tsx
git commit -m "feat: add QuizOptionRow molecule"
```

---

### Task 5: Quiz feature — model, view-model, view, route

**Files:**
- Create: `apps/native/features/quiz/quiz.model.ts`
- Create: `apps/native/features/quiz/quiz.viewmodel.ts`
- Create: `apps/native/features/quiz/QuizScreen.tsx`
- Create: `apps/native/app/quiz.tsx`
- Modify: `apps/native/app/_layout.tsx`
- Test: `apps/native/features/quiz/__tests__/quiz.viewmodel.test.ts`
- Test: `apps/native/features/quiz/__tests__/QuizScreen.test.tsx`

**Interfaces:**
- Consumes: `Container`, `AppText`, `AppButton`, `Chip`, `QuizOptionRow` (Task 4).
- Produces: `QuizOption` and `QuizQuestion` types, `QUIZ_QUESTIONS: QuizQuestion[]`, `useQuizViewModel()` returning `{ question: QuizQuestion; index: number; total: number; selectedOptionId: string | null; selectOption: (id: string) => void; goNext: () => void }`, `<QuizScreen />`.

- [ ] **Step 1: Write the failing view-model test**

```ts
// apps/native/features/quiz/__tests__/quiz.viewmodel.test.ts
import { act, renderHook } from "@testing-library/react-native";
import { useQuizViewModel } from "@/features/quiz/quiz.viewmodel";

describe("useQuizViewModel", () => {
  it("starts at the first question with nothing selected", async () => {
    const { result } = await renderHook(() => useQuizViewModel());
    expect(result.current.index).toBe(0);
    expect(result.current.selectedOptionId).toBeNull();
  });

  it("selects an option", async () => {
    const { result } = await renderHook(() => useQuizViewModel());
    const optionId = result.current.question.options[1].id;
    await act(async () => result.current.selectOption(optionId));
    expect(result.current.selectedOptionId).toBe(optionId);
  });

  it("advances to the next question and resets the selection", async () => {
    const { result } = await renderHook(() => useQuizViewModel());
    await act(async () => result.current.selectOption(result.current.question.options[0].id));
    await act(async () => result.current.goNext());
    expect(result.current.index).toBe(1);
    expect(result.current.selectedOptionId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test quiz.viewmodel.test.ts`
Expected: FAIL with "Cannot find module '@/features/quiz/quiz.viewmodel'".

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/native/features/quiz/quiz.model.ts
export type QuizOption = {
  id: string;
  letter: string;
  text: string;
  correct: boolean;
};

export type QuizQuestion = {
  id: string;
  topic: string;
  text: string;
  options: QuizOption[];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    topic: "SOLID",
    text: "Qual princípio SOLID afirma que uma classe deve ter apenas um motivo para mudar?",
    options: [
      { id: "q1-a", letter: "A", text: "Open/Closed Principle", correct: false },
      { id: "q1-b", letter: "B", text: "Single Responsibility Principle", correct: true },
      { id: "q1-c", letter: "C", text: "Liskov Substitution Principle", correct: false },
      { id: "q1-d", letter: "D", text: "Dependency Inversion Principle", correct: false },
    ],
  },
  {
    id: "q2",
    topic: "Resiliência",
    text: "Qual padrão evita chamadas repetidas a um serviço que está falhando?",
    options: [
      { id: "q2-a", letter: "A", text: "Circuit Breaker", correct: true },
      { id: "q2-b", letter: "B", text: "Singleton", correct: false },
      { id: "q2-c", letter: "C", text: "Observer", correct: false },
      { id: "q2-d", letter: "D", text: "Factory Method", correct: false },
    ],
  },
];
```

```ts
// apps/native/features/quiz/quiz.viewmodel.ts
import { useCallback, useState } from "react";
import { QUIZ_QUESTIONS } from "@/features/quiz/quiz.model";

export function useQuizViewModel() {
  const [index, setIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const question = QUIZ_QUESTIONS[index];
  const total = QUIZ_QUESTIONS.length;

  const selectOption = useCallback((id: string) => {
    setSelectedOptionId(id);
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(current + 1, QUIZ_QUESTIONS.length - 1));
    setSelectedOptionId(null);
  }, []);

  return { question, index, total, selectedOptionId, selectOption, goNext } as const;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test quiz.viewmodel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing view test**

```tsx
// apps/native/features/quiz/__tests__/QuizScreen.test.tsx
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QuizScreen } from "@/features/quiz/QuizScreen";

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <QuizScreen />
    </SafeAreaProvider>,
  );
}

describe("QuizScreen", () => {
  it("renders the first question and its options", async () => {
    await renderScreen();
    expect(
      screen.getByText("Qual princípio SOLID afirma que uma classe deve ter apenas um motivo para mudar?"),
    ).toBeTruthy();
    expect(screen.getByText("Single Responsibility Principle")).toBeTruthy();
  });

  it("selects an option and advances to the next question", async () => {
    await renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByText("Single Responsibility Principle"));
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Próxima pergunta"));
    });
    expect(
      screen.getByText("Qual padrão evita chamadas repetidas a um serviço que está falhando?"),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter native test QuizScreen.test.tsx`
Expected: FAIL with "Cannot find module '@/features/quiz/QuizScreen'".

- [ ] **Step 7: Write minimal implementation**

```tsx
// apps/native/features/quiz/QuizScreen.tsx
import { View } from "react-native";
import { ArrowRight, X } from "lucide-react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { AppButton } from "@/components/atoms/AppButton";
import { Chip } from "@/components/atoms/Chip";
import { QuizOptionRow } from "@/components/molecules/QuizOptionRow";
import { useQuizViewModel } from "@/features/quiz/quiz.viewmodel";

export function QuizScreen() {
  const { question, index, total, selectedOptionId, selectOption, goNext } = useQuizViewModel();
  const progressPercent = ((index + 1) / total) * 100;

  return (
    <Container className="bg-surface-primary">
      <View className="gap-5 p-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary">
              <X size={16} color="#FFFFFF" />
            </View>
            <AppText variant="heading" tone="primary" className="text-base font-bold">
              Quiz de Revisão
            </AppText>
          </View>
          <AppText variant="mono" tone="muted" className="text-[13px]">
            {index + 1} / {total}
          </AppText>
        </View>

        <View className="h-1.5 rounded-full bg-border-subtle">
          <View
            className="h-1.5 rounded-full bg-accent-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </View>

        <View className="gap-4 rounded-lg-card border border-border-subtle bg-surface-secondary p-5">
          <Chip label={question.topic} tone="accent" />
          <AppText variant="heading" tone="primary" className="text-[17px] font-semibold">
            {question.text}
          </AppText>
          <View className="gap-2.5">
            {question.options.map((option) => (
              <QuizOptionRow
                key={option.id}
                letter={option.letter}
                text={option.text}
                selected={option.id === selectedOptionId}
                onPress={() => selectOption(option.id)}
              />
            ))}
          </View>
        </View>

        <AppButton
          label="Próxima pergunta"
          onPress={goNext}
          icon={<ArrowRight size={16} color="#FFFFFF" />}
          disabled={!selectedOptionId}
        />
      </View>
    </Container>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter native test QuizScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Wire the route**

Create `apps/native/app/quiz.tsx`:

```tsx
import { QuizScreen } from "@/features/quiz/QuizScreen";

export default function Quiz() {
  return <QuizScreen />;
}
```

Add to `apps/native/app/_layout.tsx`'s `StackLayout`:

```tsx
<Stack.Screen name="quiz" options={{ headerShown: false }} />
```

- [ ] **Step 10: Full local check and commit**

```bash
pnpm --filter native test
pnpm --filter native exec tsc --noEmit
pnpm --filter native exec biome check features/quiz app/quiz.tsx app/_layout.tsx
git add apps/native/features/quiz apps/native/app/quiz.tsx apps/native/app/_layout.tsx
git commit -m "feat: implement Quiz screen with MVVM"
```

---

### Task 6: Molecules — `ScoreRing` and `TopicResultRow`

**Files:**
- Create: `apps/native/components/molecules/ScoreRing.tsx`
- Create: `apps/native/components/molecules/TopicResultRow.tsx`
- Test: `apps/native/components/molecules/__tests__/ScoreRing.test.tsx`
- Test: `apps/native/components/molecules/__tests__/TopicResultRow.test.tsx`

**Interfaces:**
- Consumes: `AppText`.
- Produces:
  - `ScoreRing` — props `{ correct: number; total: number }`. Renders a violet/magenta gradient ring (`View` with `bg-accent-primary` — see Note below) around an inner dark circle showing `"{correct}/{total}"` and the caption `"acertos"`.
  - `TopicResultRow` — props `{ label: string; correct: boolean }`. Renders a check (green) or x (red) icon plus the label.
  - Both consumed by `QuizResultadoScreen` (Task 7).

**Note on the gradient:** the design uses a violet→magenta gradient ring. React Native `View` has no native gradient support without `expo-linear-gradient` or `react-native-svg`, and adding a new gradient dependency is out of scope for a result screen — this task uses a flat `bg-accent-primary` ring instead (documented simplification: swap in `expo-linear-gradient` later if the flat ring reads as a regression against the mock).

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/native/components/molecules/__tests__/ScoreRing.test.tsx
import { render, screen } from "@testing-library/react-native";
import { ScoreRing } from "@/components/molecules/ScoreRing";

describe("ScoreRing", () => {
  it("renders the score fraction and caption", async () => {
    await render(<ScoreRing correct={4} total={5} />);
    expect(screen.getByText("4/5")).toBeTruthy();
    expect(screen.getByText("acertos")).toBeTruthy();
  });
});
```

```tsx
// apps/native/components/molecules/__tests__/TopicResultRow.test.tsx
import { render, screen } from "@testing-library/react-native";
import { TopicResultRow } from "@/components/molecules/TopicResultRow";

describe("TopicResultRow", () => {
  it("renders the label", async () => {
    await render(<TopicResultRow label="Princípios SOLID" correct />);
    expect(screen.getByText("Princípios SOLID")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter native test ScoreRing.test.tsx TopicResultRow.test.tsx`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/native/components/molecules/ScoreRing.tsx
import { View } from "react-native";
import { AppText } from "@/components/atoms/AppText";

export function ScoreRing({ correct, total }: { correct: number; total: number }) {
  return (
    <View className="h-[140px] w-[140px] items-center justify-center rounded-full bg-accent-primary">
      <View className="h-[112px] w-[112px] items-center justify-center rounded-full bg-surface-primary">
        <AppText variant="mono" tone="primary" className="text-[32px] font-bold">
          {correct}/{total}
        </AppText>
        <AppText variant="caption" tone="muted" className="text-[11px]">
          acertos
        </AppText>
      </View>
    </View>
  );
}
```

```tsx
// apps/native/components/molecules/TopicResultRow.tsx
import { View } from "react-native";
import { CircleCheckBig, CircleX } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";

export function TopicResultRow({ label, correct }: { label: string; correct: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      {correct ? (
        <CircleCheckBig size={15} color="#10B981" />
      ) : (
        <CircleX size={15} color="#EF4444" />
      )}
      <AppText variant="body" tone="secondary" className="text-xs">
        {label}
      </AppText>
    </View>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter native test ScoreRing.test.tsx TopicResultRow.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm --filter native exec tsc --noEmit
pnpm --filter native exec biome check components/molecules/ScoreRing.tsx components/molecules/TopicResultRow.tsx components/molecules/__tests__/ScoreRing.test.tsx components/molecules/__tests__/TopicResultRow.test.tsx
git add apps/native/components/molecules/ScoreRing.tsx apps/native/components/molecules/TopicResultRow.tsx apps/native/components/molecules/__tests__/ScoreRing.test.tsx apps/native/components/molecules/__tests__/TopicResultRow.test.tsx
git commit -m "feat: add ScoreRing and TopicResultRow molecules"
```

---

### Task 7: Resultado do Quiz feature — model, view, route

**Files:**
- Create: `apps/native/features/quiz-resultado/quizResultado.model.ts`
- Create: `apps/native/features/quiz-resultado/QuizResultadoScreen.tsx`
- Create: `apps/native/app/quiz-resultado.tsx`
- Modify: `apps/native/app/_layout.tsx`
- Test: `apps/native/features/quiz-resultado/__tests__/QuizResultadoScreen.test.tsx`

**Interfaces:**
- Consumes: `Container`, `AppText`, `AppButton`, `ScoreRing`, `TopicResultRow` (Task 6).
- Produces: `QuizResultTopic` type, `QUIZ_RESULT_MOCK: { correct: number; total: number; title: string; subtitle: string; topics: QuizResultTopic[] }`, `<QuizResultadoScreen />`.
- **No view-model file** — this screen only displays static mock data with two navigation buttons; there is no local state to manage, so a `.viewmodel.ts` would be an empty pass-through. (Ponytail: skip the empty layer — add one if this screen later needs real quiz-score input instead of a mock.)

- [ ] **Step 1: Write the failing test**

```tsx
// apps/native/features/quiz-resultado/__tests__/QuizResultadoScreen.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QuizResultadoScreen } from "@/features/quiz-resultado/QuizResultadoScreen";

describe("QuizResultadoScreen", () => {
  it("renders the score, title and topic breakdown", async () => {
    await render(
      <SafeAreaProvider>
        <QuizResultadoScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getByText("4/5")).toBeTruthy();
    expect(screen.getByText("Mandou bem!")).toBeTruthy();
    expect(screen.getByText("Princípios SOLID")).toBeTruthy();
  });

  it("calls the retry and back handlers when their buttons are pressed", async () => {
    const onRetry = jest.fn();
    const onBack = jest.fn();
    await render(
      <SafeAreaProvider>
        <QuizResultadoScreen onRetry={onRetry} onBack={onBack} />
      </SafeAreaProvider>,
    );
    fireEvent.press(screen.getByText("Refazer quiz"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText("Voltar para a aula"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test QuizResultadoScreen.test.tsx`
Expected: FAIL with "Cannot find module '@/features/quiz-resultado/QuizResultadoScreen'".

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/native/features/quiz-resultado/quizResultado.model.ts
export type QuizResultTopic = {
  label: string;
  correct: boolean;
};

export const QUIZ_RESULT_MOCK = {
  correct: 4,
  total: 5,
  title: "Mandou bem!",
  subtitle: "Você domina a maior parte do conteúdo de Engenharia de Software",
  topics: [
    { label: "Princípios SOLID", correct: true },
    { label: "Circuit Breaker", correct: true },
    { label: "Arquitetura de microsserviços", correct: false },
    { label: "Padrões de resiliência", correct: true },
  ] satisfies QuizResultTopic[],
};
```

```tsx
// apps/native/features/quiz-resultado/QuizResultadoScreen.tsx
import { View } from "react-native";
import { RotateCw } from "lucide-react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { AppButton } from "@/components/atoms/AppButton";
import { ScoreRing } from "@/components/molecules/ScoreRing";
import { TopicResultRow } from "@/components/molecules/TopicResultRow";
import { QUIZ_RESULT_MOCK } from "@/features/quiz-resultado/quizResultado.model";

export function QuizResultadoScreen({
  onRetry,
  onBack,
}: { onRetry?: () => void; onBack?: () => void } = {}) {
  const { correct, total, title, subtitle, topics } = QUIZ_RESULT_MOCK;

  return (
    <Container className="bg-surface-primary" isScrollable={false}>
      <View className="flex-1 items-center justify-center gap-6 px-7">
        <ScoreRing correct={correct} total={total} />

        <View className="items-center gap-2">
          <AppText variant="heading" tone="primary" className="text-[22px] font-bold">
            {title}
          </AppText>
          <AppText variant="body" tone="muted" className="text-center text-[13px]">
            {subtitle}
          </AppText>
        </View>

        <View className="w-full gap-2.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
          {topics.map((topic) => (
            <TopicResultRow key={topic.label} label={topic.label} correct={topic.correct} />
          ))}
        </View>

        <View className="w-full gap-2.5">
          <AppButton
            label="Refazer quiz"
            onPress={() => onRetry?.()}
            icon={<RotateCw size={14} color="#FFFFFF" />}
          />
          <AppButton label="Voltar para a aula" variant="outline" onPress={() => onBack?.()} />
        </View>
      </View>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test QuizResultadoScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the route**

Create `apps/native/app/quiz-resultado.tsx`:

```tsx
import { QuizResultadoScreen } from "@/features/quiz-resultado/QuizResultadoScreen";

export default function QuizResultado() {
  return <QuizResultadoScreen />;
}
```

Add to `apps/native/app/_layout.tsx`'s `StackLayout`:

```tsx
<Stack.Screen name="quiz-resultado" options={{ headerShown: false }} />
```

- [ ] **Step 6: Full local check and commit**

```bash
pnpm --filter native test
pnpm --filter native exec tsc --noEmit
pnpm --filter native exec biome check features/quiz-resultado app/quiz-resultado.tsx app/_layout.tsx
git add apps/native/features/quiz-resultado apps/native/app/quiz-resultado.tsx apps/native/app/_layout.tsx
git commit -m "feat: implement Resultado do Quiz screen"
```

---

### Task 8: Molecule — `NotificationRow`

**Files:**
- Create: `apps/native/components/molecules/NotificationRow.tsx`
- Test: `apps/native/components/molecules/__tests__/NotificationRow.test.tsx`

**Interfaces:**
- Consumes: `AppText`.
- Produces: `NotificationRow` with props:
  ```ts
  type NotificationRowProps = {
    icon: React.ReactNode;
    iconTone: "accent" | "warning" | "danger";
    title: string;
    description: string;
    timeAgo: string;
    read: boolean;
  };
  ```
  Consumed by `NotificacoesScreen` (Task 9).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/native/components/molecules/__tests__/NotificationRow.test.tsx
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { NotificationRow } from "@/components/molecules/NotificationRow";

describe("NotificationRow", () => {
  it("renders title, description and time", async () => {
    await render(
      <NotificationRow
        icon={<Text>ICON</Text>}
        iconTone="accent"
        title="Ônibus a 5 min"
        description="Chegando no ponto UCSAL"
        timeAgo="agora"
        read={false}
      />,
    );
    expect(screen.getByText("Ônibus a 5 min")).toBeTruthy();
    expect(screen.getByText("Chegando no ponto UCSAL")).toBeTruthy();
    expect(screen.getByText("agora")).toBeTruthy();
  });

  it("shows an unread dot when read is false", async () => {
    await render(
      <NotificationRow
        icon={<Text>ICON</Text>}
        iconTone="accent"
        title="Ônibus a 5 min"
        description="Chegando no ponto UCSAL"
        timeAgo="agora"
        read={false}
        testID="row"
      />,
    );
    expect(screen.getByTestId("unread-dot")).toBeTruthy();
  });

  it("hides the unread dot when read is true", async () => {
    await render(
      <NotificationRow
        icon={<Text>ICON</Text>}
        iconTone="accent"
        title="Novo material"
        description="Prof. Ana Silva enviou Slides"
        timeAgo="2h"
        read
      />,
    );
    expect(screen.queryByTestId("unread-dot")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test NotificationRow.test.tsx`
Expected: FAIL with "Cannot find module '@/components/molecules/NotificationRow'".

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/native/components/molecules/NotificationRow.tsx
import { View } from "react-native";
import { AppText } from "@/components/atoms/AppText";

type Tone = "accent" | "warning" | "danger";

const ICON_BG: Record<Tone, string> = {
  accent: "bg-accent-light",
  warning: "bg-warning/15",
  danger: "bg-danger/15",
};

export type NotificationRowProps = {
  icon: React.ReactNode;
  iconTone: Tone;
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
  testID?: string;
};

export function NotificationRow({
  icon,
  iconTone,
  title,
  description,
  timeAgo,
  read,
  testID,
}: NotificationRowProps) {
  return (
    <View
      testID={testID}
      className={
        read
          ? "flex-row gap-3 rounded-lg-card border border-border-subtle bg-surface-primary p-3.5"
          : "flex-row gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
      }
    >
      <View className={`h-9 w-9 items-center justify-center rounded-sm-card ${ICON_BG[iconTone]}`}>
        {icon}
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between">
          <AppText variant="body" tone="primary" className="text-[13px] font-semibold">
            {title}
          </AppText>
          <AppText variant="caption" tone="muted" className="text-[10px]">
            {timeAgo}
          </AppText>
        </View>
        <AppText variant="body" tone="muted" className="text-xs">
          {description}
        </AppText>
      </View>
      {!read && (
        <View testID="unread-dot" className="h-2 w-2 self-start rounded-full bg-accent-primary" />
      )}
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test NotificationRow.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm --filter native exec tsc --noEmit
pnpm --filter native exec biome check components/molecules/NotificationRow.tsx components/molecules/__tests__/NotificationRow.test.tsx
git add apps/native/components/molecules/NotificationRow.tsx apps/native/components/molecules/__tests__/NotificationRow.test.tsx
git commit -m "feat: add NotificationRow molecule"
```

---

### Task 9: Notificações feature — model, view, route

**Files:**
- Create: `apps/native/features/notificacoes/notificacoes.model.ts`
- Create: `apps/native/features/notificacoes/NotificacoesScreen.tsx`
- Create: `apps/native/app/notificacoes.tsx`
- Modify: `apps/native/app/_layout.tsx`
- Test: `apps/native/features/notificacoes/__tests__/NotificacoesScreen.test.tsx`

**Interfaces:**
- Consumes: `Container`, `AppText`, `NotificationRow` (Task 8).
- Produces: `NotificationItem` type, `NOTIFICATIONS_MOCK: NotificationItem[]`, `<NotificacoesScreen />`.
- **No view-model file**, same reasoning as Task 7 — this screen is a read-only list of mock data with no interaction to manage yet.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/native/features/notificacoes/__tests__/NotificacoesScreen.test.tsx
import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificacoesScreen } from "@/features/notificacoes/NotificacoesScreen";

describe("NotificacoesScreen", () => {
  it("renders every notification's title", async () => {
    await render(
      <SafeAreaProvider>
        <NotificacoesScreen />
      </SafeAreaProvider>,
    );
    expect(screen.getByText("Ônibus a 5 min")).toBeTruthy();
    expect(screen.getByText("Insight pronto")).toBeTruthy();
    expect(screen.getByText("Ônibus atrasado")).toBeTruthy();
    expect(screen.getByText("Novo material")).toBeTruthy();
    expect(screen.getByText("Aula marcada como difícil")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test NotificacoesScreen.test.tsx`
Expected: FAIL with "Cannot find module '@/features/notificacoes/NotificacoesScreen'".

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/native/features/notificacoes/notificacoes.model.ts
export type NotificationIconName = "navigation" | "sparkles" | "triangle-alert" | "graduation-cap" | "gauge";

export type NotificationItem = {
  id: string;
  iconName: NotificationIconName;
  iconTone: "accent" | "warning" | "danger";
  title: string;
  description: string;
  timeAgo: string;
  read: boolean;
};

export const NOTIFICATIONS_MOCK: NotificationItem[] = [
  {
    id: "n1",
    iconName: "navigation",
    iconTone: "accent",
    title: "Ônibus a 5 min",
    description: "Chegando no ponto UCSAL",
    timeAgo: "agora",
    read: false,
  },
  {
    id: "n2",
    iconName: "sparkles",
    iconTone: "accent",
    title: "Insight pronto",
    description: "IA analisou os slides de Eng. de Software",
    timeAgo: "10 min",
    read: false,
  },
  {
    id: "n3",
    iconName: "triangle-alert",
    iconTone: "warning",
    title: "Ônibus atrasado",
    description: "Linha UCSAL → Pituaçu, 08:30 com atraso de 5 min",
    timeAgo: "1h",
    read: true,
  },
  {
    id: "n4",
    iconName: "graduation-cap",
    iconTone: "accent",
    title: "Novo material",
    description: "Prof. Ana Silva enviou Slides - Aula 04.pdf",
    timeAgo: "2h",
    read: true,
  },
  {
    id: "n5",
    iconName: "gauge",
    iconTone: "danger",
    title: "Aula marcada como difícil",
    description: "Banco de Dados II recebeu novas avaliações",
    timeAgo: "1d",
    read: true,
  },
];
```

```tsx
// apps/native/features/notificacoes/NotificacoesScreen.tsx
import { View } from "react-native";
import {
  ChevronLeft,
  GraduationCap,
  Navigation,
  Sparkles,
  TriangleAlert,
  Gauge,
} from "lucide-react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { NotificationRow } from "@/components/molecules/NotificationRow";
import {
  NOTIFICATIONS_MOCK,
  type NotificationIconName,
} from "@/features/notificacoes/notificacoes.model";

const ICON_COLOR: Record<string, string> = {
  accent: "#582CFF",
  warning: "#F59E0B",
  danger: "#EF4444",
};

function iconFor(name: NotificationIconName, color: string) {
  switch (name) {
    case "navigation":
      return <Navigation size={16} color={color} />;
    case "sparkles":
      return <Sparkles size={16} color={color} />;
    case "triangle-alert":
      return <TriangleAlert size={16} color={color} />;
    case "graduation-cap":
      return <GraduationCap size={16} color={color} />;
    case "gauge":
      return <Gauge size={16} color={color} />;
  }
}

export function NotificacoesScreen() {
  return (
    <Container className="bg-surface-primary">
      <View className="gap-5 p-5">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-lg-card border border-border-subtle bg-surface-secondary">
            <ChevronLeft size={18} color="#FFFFFF" />
          </View>
          <AppText variant="heading" tone="primary" className="text-lg font-bold">
            Notificações
          </AppText>
        </View>

        <View className="gap-2.5">
          {NOTIFICATIONS_MOCK.map((notification) => (
            <NotificationRow
              key={notification.id}
              icon={iconFor(notification.iconName, ICON_COLOR[notification.iconTone])}
              iconTone={notification.iconTone}
              title={notification.title}
              description={notification.description}
              timeAgo={notification.timeAgo}
              read={notification.read}
            />
          ))}
        </View>
      </View>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test NotificacoesScreen.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Wire the route**

Create `apps/native/app/notificacoes.tsx`:

```tsx
import { NotificacoesScreen } from "@/features/notificacoes/NotificacoesScreen";

export default function Notificacoes() {
  return <NotificacoesScreen />;
}
```

Add to `apps/native/app/_layout.tsx`'s `StackLayout`:

```tsx
<Stack.Screen name="notificacoes" options={{ headerShown: false }} />
```

- [ ] **Step 6: Full local check and commit**

```bash
pnpm --filter native test
pnpm --filter native exec tsc --noEmit
pnpm --filter native exec biome check features/notificacoes app/notificacoes.tsx app/_layout.tsx
git add apps/native/features/notificacoes apps/native/app/notificacoes.tsx apps/native/app/_layout.tsx
git commit -m "feat: implement Notificações screen"
```

---

### Task 10: Full regression pass

**Files:** none created — verification only.

- [ ] **Step 1: Run the entire test suite**

Run: `pnpm --filter native test`
Expected: every test file from Tasks 1–9 passes alongside the first plan's suite, 0 failures.

- [ ] **Step 2: Type-check the whole app**

Run: `pnpm --filter native exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint the whole app**

Run: `pnpm --filter native exec biome check .`
Expected: no errors in files touched by this plan. (The repo has pre-existing formatter drift on files this plan doesn't touch — same situation the first plan documented; don't reformat files you didn't otherwise change.)

- [ ] **Step 4: Commit** (only if Steps 2–3 required fixes)

```bash
git add -A -- apps/native
git commit -m "fix: address type/lint issues from remaining-screens implementation"
```

---

## Deferred scope (not in this plan)

- **Empty states** (Tela Ônibus sem horários, Tela Aulas sem aula hoje) and the **filtered-Ônibus variant** from the `.pen` file are presentation variants of screens already implemented in the first plan, not new screens — add them as conditional render branches inside `OnibusScreen`/`AulasScreen`'s existing view-models (e.g. `filtered.length === 0`) in a small follow-up task, not a new screen.
- **Real navigation wiring** (`ClassCard` → `aula-detalhes`, `InsightCard`'s quiz button → `quiz`, quiz's last question → `quiz-resultado`, bell icons → `notificacoes`) is intentionally out of scope here — every screen in both plans currently renders with static/mock data reachable only by direct route name. Wiring real `expo-router` navigation with data passed via route params is a separate, smaller plan once product decides what a "class" record's real shape is (currently mocked per-screen in each `*.model.ts`).
- **Gradient ScoreRing**: Task 6 documents the flat-color simplification; swap in `expo-linear-gradient` if product flags it during review.
