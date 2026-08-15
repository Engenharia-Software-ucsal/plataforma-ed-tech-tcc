# Compasso UCSAL Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `busu-ucsal-design.pen` screens (Ônibus, Aulas, Login, Perfil, plus the reusable card/hero components) into working React Native code in `apps/native`, using atomic components, MVVM per screen, Jotai for shared state, and a test for every component and page.

**Architecture:** Atomic Design (`atoms/ → molecules/ → organisms/`) for shared UI in `components/`, MVVM per screen under `features/<screen>/` (`*.model.ts` = types + mock data, `*.viewmodel.ts` = Jotai atoms + a `use<Screen>ViewModel()` hook, `<Screen>Screen.tsx` = pure view that only reads the view-model). Expo Router route files under `app/` stay thin — they just render the screen component. Existing `AppThemeProvider`/`uniwind` light-dark toggle is untouched; the design's dark violet palette is added as its own fixed token set (this design is dark-only, per the "Dark Centered Platform" style used to build it) consumed via Tailwind utility classes (`bg-surface-primary`, `text-accent-primary`, etc.) so no component ever hardcodes a hex value.

**Tech Stack:** Expo Router, React Native 0.86, `uniwind` (Tailwind v4 for RN), `heroui-native` (already a dependency — `useThemeColor` is reused, no new component APIs from it are introduced since its exact surface isn't installed/verifiable in this environment), Jotai (new dependency), Vitest + `@testing-library/react-native` run against `react-native-web`/`jsdom` (new dev dependencies — no official Vitest preset exists for React Native, see Task 1's caveat).

**Spec:** `busu-ucsal-design.pen` (Pencil design file, palette "Violet Void" / style "Dark Centered Platform") — screens: Status Bar, Tab Bar, Bus Time Card, Class Card (reusable components), Tela Ônibus, Tela Aulas, Tela Login, Tela Perfil.

## Global Constraints

- Design tokens are fixed hex values copied verbatim from the `.pen` file variables — never approximate or re-derive a color:
  `surface-primary=#0A0A0A`, `surface-secondary=#141420`, `foreground-primary=#FFFFFF`, `foreground-secondary=#C7C7D1`, `foreground-muted=#A1A1AA`, `accent-primary=#582CFF`, `accent-secondary=#BF40FF`, `accent-tertiary=#00F2FF`, `accent-light=#582CFF26`, `border-subtle=#222233`, `success=#10B981`, `warning=#F59E0B`, `danger=#EF4444`, `radius-sm=4`, `radius-lg=8`.
- Fonts per the design: headings `Inter`, body `Geist`, captions `Funnel Sans`, numeric/time values `Geist Mono`. These must be loaded as Expo fonts (Task 1) before any screen renders them.
- Every component (atom/molecule/organism) and every screen gets a colocated `__tests__/*.test.tsx` using `@testing-library/react-native`. No task is done until its test passes.
- State that is shared across more than one screen (bus stop filter, favorited bus times) lives in Jotai atoms under `state/`. State local to one screen's view-model stays inside that view-model's own `atom()` calls in its own file — do not centralize screen-local state into `state/`.
- Route files in `app/` never contain JSX beyond `return <ScreenComponent />` — all markup lives in `features/<screen>/<Screen>Screen.tsx`.
- Run `pnpm --filter native test <path>` (not bare `vitest`) for every test step — this is a pnpm workspace and `vitest.config.ts` only resolves the `@/*` alias correctly when run through the workspace filter from `apps/native`.

---

## File Structure

```
apps/native/
  global.css                              # MODIFY — add @theme tokens
  package.json                            # MODIFY — add jotai, vitest, testing-library, test script
  vitest.config.ts                        # CREATE
  vitest.setup.ts                         # CREATE
  hooks/
    use-fonts.ts                          # CREATE — loads Inter/Geist/Funnel Sans/Geist Mono
  components/
    atoms/
      AppText.tsx                         # CREATE
      AppButton.tsx                       # CREATE
      Chip.tsx                            # CREATE
      IconBadge.tsx                       # CREATE
      __tests__/
        AppText.test.tsx
        AppButton.test.tsx
        Chip.test.tsx
        IconBadge.test.tsx
    molecules/
      StopTag.tsx                         # CREATE
      OccupancyTag.tsx                    # CREATE
      DifficultyTag.tsx                   # CREATE
      DelayBadge.tsx                      # CREATE
      SegmentedFilter.tsx                 # CREATE
      __tests__/
        StopTag.test.tsx
        OccupancyTag.test.tsx
        DifficultyTag.test.tsx
        DelayBadge.test.tsx
        SegmentedFilter.test.tsx
    organisms/
      BusTimeCard.tsx                     # CREATE
      NextBusHero.tsx                     # CREATE
      ClassCard.tsx                       # CREATE
      NextClassHero.tsx                   # CREATE
      __tests__/
        BusTimeCard.test.tsx
        NextBusHero.test.tsx
        ClassCard.test.tsx
        NextClassHero.test.tsx
  state/
    busStopFilter.ts                      # CREATE — shared Jotai atom (Todos/UCSAL/Pituaçu)
    favoriteBusTimes.ts                   # CREATE — shared Jotai atom (Set<string> of favorited bus ids)
  features/
    onibus/
      onibus.model.ts                     # CREATE
      onibus.viewmodel.ts                 # CREATE
      OnibusScreen.tsx                    # CREATE
      __tests__/
        onibus.viewmodel.test.ts
        OnibusScreen.test.tsx
    aulas/
      aulas.model.ts                      # CREATE
      aulas.viewmodel.ts                  # CREATE
      AulasScreen.tsx                     # CREATE
      __tests__/
        aulas.viewmodel.test.ts
        AulasScreen.test.tsx
    login/
      login.model.ts                      # CREATE
      login.viewmodel.ts                  # CREATE
      LoginScreen.tsx                     # CREATE
      __tests__/
        login.viewmodel.test.ts
        LoginScreen.test.tsx
    perfil/
      perfil.model.ts                     # CREATE
      perfil.viewmodel.ts                 # CREATE
      PerfilScreen.tsx                    # CREATE
      __tests__/
        perfil.viewmodel.test.ts
        PerfilScreen.test.tsx
  app/
    (drawer)/(tabs)/index.tsx             # MODIFY — render OnibusScreen
    (drawer)/(tabs)/two.tsx               # MODIFY — render AulasScreen
    login.tsx                             # CREATE — thin route, renders LoginScreen
    (drawer)/perfil.tsx                   # CREATE — thin route, renders PerfilScreen
```

---

### Task 1: Design tokens, fonts, and Jotai setup

**Files:**
- Modify: `apps/native/global.css`
- Modify: `apps/native/package.json`
- Create: `apps/native/hooks/use-fonts.ts`
- Modify: `apps/native/app/_layout.tsx:1-34`

**Interfaces:**
- Produces: Tailwind utility classes `bg-surface-primary`, `bg-surface-secondary`, `text-foreground-primary`, `text-foreground-secondary`, `text-foreground-muted`, `bg-accent-primary`, `text-accent-primary`, `bg-accent-secondary`, `text-accent-secondary`, `bg-accent-tertiary`, `text-accent-tertiary`, `bg-accent-light`, `border-border-subtle`, `text-success`, `bg-success`, `text-warning`, `bg-warning`, `text-danger`, `bg-danger`, `rounded-sm-card` (4px), `rounded-lg-card` (8px). Produces `useAppFontsLoaded(): boolean` from `hooks/use-fonts.ts`.
- Consumes: nothing (foundation task).

- [ ] **Step 1: Add the design tokens to `global.css`**

Replace the full contents of `apps/native/global.css` with:

```css
@import "tailwindcss";
@import "uniwind";
@import "heroui-native/styles";

@source './node_modules/heroui-native/lib';

@theme {
  --color-surface-primary: #0A0A0A;
  --color-surface-secondary: #141420;
  --color-foreground-primary: #FFFFFF;
  --color-foreground-secondary: #C7C7D1;
  --color-foreground-muted: #A1A1AA;
  --color-accent-primary: #582CFF;
  --color-accent-secondary: #BF40FF;
  --color-accent-tertiary: #00F2FF;
  --color-accent-light: #582CFF26;
  --color-border-subtle: #222233;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --radius-sm-card: 4px;
  --radius-lg-card: 8px;
  --font-heading: "Inter";
  --font-body: "Geist";
  --font-caption: "FunnelSans";
  --font-mono: "GeistMono";
}
```

- [ ] **Step 2: Add font loading dependencies and a test script to `package.json`**

Add to `apps/native/package.json` `dependencies`:

```json
"jotai": "^2.15.0",
"@expo-google-fonts/inter": "^0.4.1",
"@expo-google-fonts/geist": "^0.4.1",
"@expo-google-fonts/funnel-sans": "^0.4.1",
"@expo-google-fonts/geist-mono": "^0.4.1"
```

Add to `apps/native/package.json` `devDependencies`:

```json
"vitest": "^3.2.4",
"@vitejs/plugin-react": "^4.3.4",
"@testing-library/react-native": "^13.4.0",
"@testing-library/jest-dom": "^6.6.3",
"jsdom": "^25.0.1",
"react-native-web": "~0.21.0"
```

`react-native-web` is already a runtime dependency (see Global Constraints stack) — this adds it as a dev dependency too only if it isn't already resolvable at the version Vitest's alias needs; skip this line if `pnpm why react-native-web` inside `apps/native` already shows `~0.21.0`.

Add to `apps/native/package.json` `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Caveat:** there is no official Vitest preset for React Native (unlike `jest-expo` for Jest) — this setup runs component tests against `react-native-web` under `jsdom` via an alias, which covers everything this plan touches (View/Text/Pressable-based UI, Jotai state, plain TS logic). It does **not** cover testing native-module-specific code (camera, native animations driven by the JS thread, etc.) — none of the components in this plan need that, but flag it if a future screen does.

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: lockfile updates, no errors.

- [ ] **Step 4: Create the font-loading hook**

Create `apps/native/hooks/use-fonts.ts`:

```ts
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Geist_400Regular, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { FunnelSans_500Medium, FunnelSans_600SemiBold } from "@expo-google-fonts/funnel-sans";
import { GeistMono_400Regular, GeistMono_700Bold } from "@expo-google-fonts/geist-mono";

export function useAppFontsLoaded(): boolean {
  const [loaded] = useFonts({
    Inter: Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Geist: Geist_400Regular,
    Geist_600SemiBold,
    Geist_700Bold,
    FunnelSans: FunnelSans_500Medium,
    FunnelSans_600SemiBold,
    GeistMono: GeistMono_400Regular,
    GeistMono_700Bold,
  });
  return loaded;
}
```

- [ ] **Step 5: Wire fonts + Jotai provider into the root layout**

Modify `apps/native/app/_layout.tsx`:

```tsx
import "@/global.css";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { Provider as JotaiProvider } from "jotai";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { useAppFontsLoaded } from "@/hooks/use-fonts";

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

function StackLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
    </Stack>
  );
}

export default function Layout() {
  const fontsLoaded = useAppFontsLoaded();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <JotaiProvider>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <StackLayout />
            </HeroUINativeProvider>
          </AppThemeProvider>
        </JotaiProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 6: Create the Vitest setup file and config**

Create `apps/native/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `apps/native/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-native": "react-native-web",
      "@": path.resolve(__dirname, "."),
    },
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".expo"],
  },
});
```

`"@": path.resolve(__dirname, ".")` mirrors the `@/*` path already configured in `apps/native/tsconfig.json` — every `@/...` import in this plan's code resolves through this alias. The `globals: true` option is what makes `describe`/`it`/`expect`/`vi` available without an explicit import in the test files below (so the test code blocks in this plan need no `import ... from "vitest"` line).

- [ ] **Step 7: Verify the app still boots**

Run: `pnpm --filter native exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 8: Commit**

```bash
git add apps/native/global.css apps/native/package.json apps/native/hooks/use-fonts.ts apps/native/app/_layout.tsx apps/native/vitest.config.ts apps/native/vitest.setup.ts pnpm-lock.yaml
git commit -m "chore: add design tokens, fonts, jotai and test infra"
```

---

### Task 2: Atom — `AppText`

**Files:**
- Create: `apps/native/components/atoms/AppText.tsx`
- Test: `apps/native/components/atoms/__tests__/AppText.test.tsx`

**Interfaces:**
- Consumes: Tailwind color/font tokens from Task 1 (`text-foreground-primary`, `font-heading`, etc.).
- Produces: `AppText` component with props `{ variant?: "heading" | "body" | "caption" | "mono"; tone?: "primary" | "secondary" | "muted" | "accent" | "success" | "warning" | "danger"; className?: string } & TextProps`. Later tasks import `AppText` from `@/components/atoms/AppText`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react-native";
import { AppText } from "@/components/atoms/AppText";

describe("AppText", () => {
  it("renders children", () => {
    render(<AppText>Próxima aula</AppText>);
    expect(screen.getByText("Próxima aula")).toBeTruthy();
  });

  it("applies the heading font by default", () => {
    render(<AppText testID="txt">Título</AppText>);
    const node = screen.getByTestId("txt");
    expect(node.props.className).toContain("font-heading");
  });

  it("applies the mono font and accent tone when requested", () => {
    render(
      <AppText testID="txt" variant="mono" tone="accent">
        08:00
      </AppText>,
    );
    const node = screen.getByTestId("txt");
    expect(node.props.className).toContain("font-mono");
    expect(node.props.className).toContain("text-accent-primary");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test AppText.test.tsx`
Expected: FAIL with "Cannot find module '@/components/atoms/AppText'".

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Text, type TextProps } from "react-native";
import { cn } from "heroui-native";

type Variant = "heading" | "body" | "caption" | "mono";
type Tone = "primary" | "secondary" | "muted" | "accent" | "success" | "warning" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  heading: "font-heading",
  body: "font-body",
  caption: "font-caption",
  mono: "font-mono",
};

const TONE_CLASS: Record<Tone, string> = {
  primary: "text-foreground-primary",
  secondary: "text-foreground-secondary",
  muted: "text-foreground-muted",
  accent: "text-accent-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  className?: string;
};

export function AppText({
  variant = "heading",
  tone = "primary",
  className,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text className={cn(VARIANT_CLASS[variant], TONE_CLASS[tone], className)} {...props}>
      {children}
    </Text>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test AppText.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/native/components/atoms/AppText.tsx apps/native/components/atoms/__tests__/AppText.test.tsx
git commit -m "feat: add AppText atom"
```

---

### Task 3: Atom — `AppButton`

**Files:**
- Create: `apps/native/components/atoms/AppButton.tsx`
- Test: `apps/native/components/atoms/__tests__/AppButton.test.tsx`

**Interfaces:**
- Consumes: `AppText` from Task 2.
- Produces: `AppButton` with props `{ label: string; onPress: () => void; variant?: "primary" | "secondary" | "outline"; icon?: React.ReactNode; disabled?: boolean; testID?: string }`. Used by every screen's primary/secondary CTAs (Login's "Entrar com conta UCSAL", Quiz's "Próxima pergunta", etc.).

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AppButton } from "@/components/atoms/AppButton";

describe("AppButton", () => {
  it("renders the label", () => {
    render(<AppButton label="Entrar" onPress={() => {}} />);
    expect(screen.getByText("Entrar")).toBeTruthy();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<AppButton label="Entrar" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId("btn"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    render(<AppButton label="Entrar" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(screen.getByTestId("btn"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test AppButton.test.tsx`
Expected: FAIL with "Cannot find module '@/components/atoms/AppButton'".

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Pressable, type PressableProps } from "react-native";
import { cn } from "heroui-native";
import { AppText } from "@/components/atoms/AppText";

type Variant = "primary" | "secondary" | "outline";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-accent-primary",
  secondary: "bg-surface-secondary border border-border-subtle",
  outline: "bg-transparent border border-border-subtle",
};

const VARIANT_TEXT_TONE: Record<Variant, "primary"> = {
  primary: "primary",
  secondary: "primary",
  outline: "primary",
};

export type AppButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  testID,
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-sm-card px-5 py-3",
        VARIANT_CLASS[variant],
        disabled && "opacity-50",
      )}
      {...props}
    >
      {icon}
      <AppText variant="body" tone={VARIANT_TEXT_TONE[variant]} className="font-semibold">
        {label}
      </AppText>
    </Pressable>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test AppButton.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/native/components/atoms/AppButton.tsx apps/native/components/atoms/__tests__/AppButton.test.tsx
git commit -m "feat: add AppButton atom"
```

---

### Task 4: Atoms — `Chip` and `IconBadge`

**Files:**
- Create: `apps/native/components/atoms/Chip.tsx`
- Create: `apps/native/components/atoms/IconBadge.tsx`
- Test: `apps/native/components/atoms/__tests__/Chip.test.tsx`
- Test: `apps/native/components/atoms/__tests__/IconBadge.test.tsx`

**Interfaces:**
- Consumes: `AppText` from Task 2.
- Produces: `Chip` with props `{ label: string; tone?: "accent" | "success" | "warning" | "danger" | "muted"; icon?: React.ReactNode }` — the small rounded pill used for "UCSAL", "Vazio", "Difícil · 4.3/5" tags. `IconBadge` with props `{ icon: React.ReactNode; size?: number; tone?: "accent" | "muted" }` — the square rounded icon container used in file rows and the Login logo.

- [ ] **Step 1: Write the failing tests**

```tsx
import { render, screen } from "@testing-library/react-native";
import { Chip } from "@/components/atoms/Chip";

describe("Chip", () => {
  it("renders the label", () => {
    render(<Chip label="UCSAL" />);
    expect(screen.getByText("UCSAL")).toBeTruthy();
  });

  it("applies the danger tone class", () => {
    render(<Chip label="Cheio" tone="danger" testID="chip" />);
    expect(screen.getByTestId("chip").props.className).toContain("bg-danger");
  });
});
```

```tsx
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { IconBadge } from "@/components/atoms/IconBadge";

describe("IconBadge", () => {
  it("renders its icon child", () => {
    render(
      <IconBadge testID="badge" icon={<Text>ICON</Text>} />,
    );
    expect(screen.getByText("ICON")).toBeTruthy();
  });

  it("defaults to a 36px square", () => {
    render(<IconBadge testID="badge" icon={<Text>ICON</Text>} />);
    expect(screen.getByTestId("badge").props.className).toContain("w-9");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter native test Chip.test.tsx IconBadge.test.tsx`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/native/components/atoms/Chip.tsx
import { View, type ViewProps } from "react-native";
import { cn } from "heroui-native";
import { AppText } from "@/components/atoms/AppText";

type Tone = "accent" | "success" | "warning" | "danger" | "muted";

const BG_CLASS: Record<Tone, string> = {
  accent: "bg-accent-light",
  success: "bg-success/15",
  warning: "bg-warning/15",
  danger: "bg-danger/15",
  muted: "bg-border-subtle",
};

const TEXT_TONE: Record<Tone, "accent" | "success" | "warning" | "danger" | "muted"> = {
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
  muted: "muted",
};

export type ChipProps = ViewProps & {
  label: string;
  tone?: Tone;
  icon?: React.ReactNode;
  testID?: string;
};

export function Chip({ label, tone = "accent", icon, testID, className, ...props }: ChipProps) {
  return (
    <View
      testID={testID}
      className={cn(
        "flex-row items-center gap-1 rounded-sm-card px-2 py-1",
        BG_CLASS[tone],
        className,
      )}
      {...props}
    >
      {icon}
      <AppText variant="caption" tone={TEXT_TONE[tone]} className="text-[10px] font-semibold">
        {label}
      </AppText>
    </View>
  );
}
```

```tsx
// apps/native/components/atoms/IconBadge.tsx
import { View, type ViewProps } from "react-native";
import { cn } from "heroui-native";

type Tone = "accent" | "muted";

const BG_CLASS: Record<Tone, string> = {
  accent: "bg-accent-light",
  muted: "bg-surface-secondary border border-border-subtle",
};

export type IconBadgeProps = ViewProps & {
  icon: React.ReactNode;
  tone?: Tone;
  testID?: string;
};

export function IconBadge({ icon, tone = "muted", testID, className, ...props }: IconBadgeProps) {
  return (
    <View
      testID={testID}
      className={cn(
        "h-9 w-9 items-center justify-center rounded-sm-card",
        BG_CLASS[tone],
        className,
      )}
      {...props}
    >
      {icon}
    </View>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter native test Chip.test.tsx IconBadge.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/native/components/atoms/Chip.tsx apps/native/components/atoms/IconBadge.tsx apps/native/components/atoms/__tests__/Chip.test.tsx apps/native/components/atoms/__tests__/IconBadge.test.tsx
git commit -m "feat: add Chip and IconBadge atoms"
```

---

### Task 5: Molecules — `StopTag`, `OccupancyTag`, `DifficultyTag`, `DelayBadge`

**Files:**
- Create: `apps/native/components/molecules/StopTag.tsx`
- Create: `apps/native/components/molecules/OccupancyTag.tsx`
- Create: `apps/native/components/molecules/DifficultyTag.tsx`
- Create: `apps/native/components/molecules/DelayBadge.tsx`
- Test: `apps/native/components/molecules/__tests__/StopTag.test.tsx`
- Test: `apps/native/components/molecules/__tests__/OccupancyTag.test.tsx`
- Test: `apps/native/components/molecules/__tests__/DifficultyTag.test.tsx`
- Test: `apps/native/components/molecules/__tests__/DelayBadge.test.tsx`

**Interfaces:**
- Consumes: `Chip` from Task 4.
- Produces:
  - `StopTag` — props `{ stop: "UCSAL" | "PITUACU" }`, renders the campus/station chip from the design (violet for UCSAL, cyan for Pituaçu).
  - `OccupancyTag` — props `{ level: "vazio" | "moderado" | "cheio" }`.
  - `DifficultyTag` — props `{ level: "facil" | "medio" | "dificil"; score: number; reviewCount: number }`.
  - `DelayBadge` — props `{ minutes: number }`, renders `null` when `minutes <= 0`.
  These are consumed by `BusTimeCard`/`ClassCard`/`NextBusHero` in Task 6.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/native/components/molecules/__tests__/StopTag.test.tsx
import { render, screen } from "@testing-library/react-native";
import { StopTag } from "@/components/molecules/StopTag";

describe("StopTag", () => {
  it("shows UCSAL label for the campus stop", () => {
    render(<StopTag stop="UCSAL" />);
    expect(screen.getByText("UCSAL")).toBeTruthy();
  });

  it("shows Est. Pituaçu label for the station stop", () => {
    render(<StopTag stop="PITUACU" />);
    expect(screen.getByText("Est. Pituaçu")).toBeTruthy();
  });
});
```

```tsx
// apps/native/components/molecules/__tests__/OccupancyTag.test.tsx
import { render, screen } from "@testing-library/react-native";
import { OccupancyTag } from "@/components/molecules/OccupancyTag";

describe("OccupancyTag", () => {
  it.each([
    ["vazio", "Vazio"],
    ["moderado", "Moderada"],
    ["cheio", "Cheio"],
  ] as const)("renders %s as %s", (level, label) => {
    render(<OccupancyTag level={level} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
```

```tsx
// apps/native/components/molecules/__tests__/DifficultyTag.test.tsx
import { render, screen } from "@testing-library/react-native";
import { DifficultyTag } from "@/components/molecules/DifficultyTag";

describe("DifficultyTag", () => {
  it("renders level, score and review count", () => {
    render(<DifficultyTag level="dificil" score={4.3} reviewCount={142} />);
    expect(screen.getByText("Difícil · 4.3/5 (142 avaliações)")).toBeTruthy();
  });
});
```

```tsx
// apps/native/components/molecules/__tests__/DelayBadge.test.tsx
import { render, screen } from "@testing-library/react-native";
import { DelayBadge } from "@/components/molecules/DelayBadge";

describe("DelayBadge", () => {
  it("renders the delay in minutes", () => {
    render(<DelayBadge minutes={5} />);
    expect(screen.getByText("Atrasado 5 min")).toBeTruthy();
  });

  it("renders nothing when there is no delay", () => {
    render(<DelayBadge minutes={0} />);
    expect(screen.queryByText(/Atrasado/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter native test StopTag.test.tsx OccupancyTag.test.tsx DifficultyTag.test.tsx DelayBadge.test.tsx`
Expected: FAIL — all four modules missing.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/native/components/molecules/StopTag.tsx
import { GraduationCap, TrainFront } from "lucide-react-native";
import { Chip } from "@/components/atoms/Chip";

export type StopTagProps = { stop: "UCSAL" | "PITUACU" };

export function StopTag({ stop }: StopTagProps) {
  if (stop === "UCSAL") {
    return <Chip label="UCSAL" tone="accent" icon={<GraduationCap size={11} color="#582CFF" />} />;
  }
  return <Chip label="Est. Pituaçu" tone="accent" icon={<TrainFront size={11} color="#00F2FF" />} />;
}
```

```tsx
// apps/native/components/molecules/OccupancyTag.tsx
import { Users } from "lucide-react-native";
import { Chip } from "@/components/atoms/Chip";

export type OccupancyLevel = "vazio" | "moderado" | "cheio";

const LABEL: Record<OccupancyLevel, string> = {
  vazio: "Vazio",
  moderado: "Moderada",
  cheio: "Cheio",
};

const TONE: Record<OccupancyLevel, "success" | "warning" | "danger"> = {
  vazio: "success",
  moderado: "warning",
  cheio: "danger",
};

const ICON_COLOR: Record<OccupancyLevel, string> = {
  vazio: "#10B981",
  moderado: "#F59E0B",
  cheio: "#EF4444",
};

export function OccupancyTag({ level }: { level: OccupancyLevel }) {
  return (
    <Chip
      label={LABEL[level]}
      tone={TONE[level]}
      icon={<Users size={11} color={ICON_COLOR[level]} />}
    />
  );
}
```

```tsx
// apps/native/components/molecules/DifficultyTag.tsx
import { Flame, Gauge } from "lucide-react-native";
import { Chip } from "@/components/atoms/Chip";

export type DifficultyLevel = "facil" | "medio" | "dificil";

const LABEL: Record<DifficultyLevel, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

const TONE: Record<DifficultyLevel, "success" | "warning" | "danger"> = {
  facil: "success",
  medio: "warning",
  dificil: "danger",
};

const ICON_COLOR: Record<DifficultyLevel, string> = {
  facil: "#10B981",
  medio: "#F59E0B",
  dificil: "#EF4444",
};

export type DifficultyTagProps = {
  level: DifficultyLevel;
  score: number;
  reviewCount: number;
};

export function DifficultyTag({ level, score, reviewCount }: DifficultyTagProps) {
  const Icon = level === "dificil" ? Flame : Gauge;
  return (
    <Chip
      label={`${LABEL[level]} · ${score.toFixed(1)}/5 (${reviewCount} avaliações)`}
      tone={TONE[level]}
      icon={<Icon size={11} color={ICON_COLOR[level]} />}
    />
  );
}
```

```tsx
// apps/native/components/molecules/DelayBadge.tsx
import { TriangleAlert } from "lucide-react-native";
import { Chip } from "@/components/atoms/Chip";

export function DelayBadge({ minutes }: { minutes: number }) {
  if (minutes <= 0) {
    return null;
  }
  return (
    <Chip
      label={`Atrasado ${minutes} min`}
      tone="warning"
      icon={<TriangleAlert size={11} color="#F59E0B" />}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter native test StopTag.test.tsx OccupancyTag.test.tsx DifficultyTag.test.tsx DelayBadge.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/native/components/molecules/StopTag.tsx apps/native/components/molecules/OccupancyTag.tsx apps/native/components/molecules/DifficultyTag.tsx apps/native/components/molecules/DelayBadge.tsx apps/native/components/molecules/__tests__
git commit -m "feat: add StopTag, OccupancyTag, DifficultyTag, DelayBadge molecules"
```

*(Note: `lucide-react-native` is not yet a dependency — add `"lucide-react-native": "^0.545.0"` to `apps/native/package.json` `dependencies` and run `pnpm install` as a Step 0 of this task if it isn't already present after Task 1.)*

---

### Task 6: Organisms — `BusTimeCard` and `NextBusHero`

**Files:**
- Create: `apps/native/components/organisms/BusTimeCard.tsx`
- Create: `apps/native/components/organisms/NextBusHero.tsx`
- Test: `apps/native/components/organisms/__tests__/BusTimeCard.test.tsx`
- Test: `apps/native/components/organisms/__tests__/NextBusHero.test.tsx`

**Interfaces:**
- Consumes: `AppText` (Task 2), `IconBadge` (Task 4), `StopTag`/`OccupancyTag`/`DelayBadge` (Task 5).
- Produces: `BusTimeCard` with props matching the `BusDeparture` model (defined in Task 7):
  ```ts
  type BusTimeCardProps = {
    departure: BusDeparture;
    isFavorite: boolean;
    onToggleFavorite: (id: string) => void;
  };
  ```
  `NextBusHero` with props `{ departure: BusDeparture }`. Both are consumed by `OnibusScreen` in Task 7.

- [ ] **Step 1: Write the failing tests**

```tsx
// apps/native/components/organisms/__tests__/BusTimeCard.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { BusTimeCard } from "@/components/organisms/BusTimeCard";
import type { BusDeparture } from "@/features/onibus/onibus.model";

const departure: BusDeparture = {
  id: "bus-0800",
  time: "08:00",
  stop: "UCSAL",
  route: "UCSAL → Estação",
  status: "Saída do campus",
  occupancy: "vazio",
  delayMinutes: 0,
};

describe("BusTimeCard", () => {
  it("renders the time, route and status", () => {
    render(<BusTimeCard departure={departure} isFavorite={false} onToggleFavorite={jest.fn()} />);
    expect(screen.getByText("08:00")).toBeTruthy();
    expect(screen.getByText("UCSAL → Estação")).toBeTruthy();
    expect(screen.getByText("Saída do campus")).toBeTruthy();
  });

  it("calls onToggleFavorite with the departure id when the bell is pressed", () => {
    const onToggleFavorite = jest.fn();
    render(
      <BusTimeCard departure={departure} isFavorite={false} onToggleFavorite={onToggleFavorite} />,
    );
    fireEvent.press(screen.getByTestId("favorite-button"));
    expect(onToggleFavorite).toHaveBeenCalledWith("bus-0800");
  });

  it("shows a delay badge when delayMinutes is positive", () => {
    render(
      <BusTimeCard
        departure={{ ...departure, delayMinutes: 5 }}
        isFavorite={false}
        onToggleFavorite={jest.fn()}
      />,
    );
    expect(screen.getByText("Atrasado 5 min")).toBeTruthy();
  });
});
```

```tsx
// apps/native/components/organisms/__tests__/NextBusHero.test.tsx
import { render, screen } from "@testing-library/react-native";
import { NextBusHero } from "@/components/organisms/NextBusHero";
import type { BusDeparture } from "@/features/onibus/onibus.model";

const departure: BusDeparture = {
  id: "bus-0730",
  time: "07:30",
  stop: "UCSAL",
  route: "UCSAL → Estação da Lapa",
  status: "em 25 min",
  occupancy: "vazio",
  delayMinutes: 3,
};

describe("NextBusHero", () => {
  it("renders the next departure time and route", () => {
    render(<NextBusHero departure={departure} />);
    expect(screen.getByText("07:30")).toBeTruthy();
    expect(screen.getByText("UCSAL → Estação da Lapa")).toBeTruthy();
  });

  it("shows the delay badge when late", () => {
    render(<NextBusHero departure={departure} />);
    expect(screen.getByText("Atrasado 3 min")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter native test BusTimeCard.test.tsx NextBusHero.test.tsx`
Expected: FAIL — modules missing (this also fails until Task 7's `onibus.model.ts` exists; create Task 7's model file first if running Task 6 standalone — see Step 0 note below).

*Step 0 (only if `apps/native/features/onibus/onibus.model.ts` does not exist yet): create it now with the content from Task 7 Step 3's model file, then continue.*

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/native/components/organisms/BusTimeCard.tsx
import { View } from "react-native";
import { Pressable } from "react-native";
import { Bell } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import { DelayBadge } from "@/components/molecules/DelayBadge";
import { OccupancyTag } from "@/components/molecules/OccupancyTag";
import { StopTag } from "@/components/molecules/StopTag";
import type { BusDeparture } from "@/features/onibus/onibus.model";

export type BusTimeCardProps = {
  departure: BusDeparture;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
};

export function BusTimeCard({ departure, isFavorite, onToggleFavorite }: BusTimeCardProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
      <View className="flex-1 gap-1">
        <AppText variant="body" tone="primary" className="font-semibold">
          {departure.route}
        </AppText>
        <AppText variant="body" tone="muted" className="text-xs">
          {departure.status}
        </AppText>
        <View className="flex-row gap-1.5">
          <StopTag stop={departure.stop} />
          <OccupancyTag level={departure.occupancy} />
        </View>
      </View>
      <View className="items-end gap-1">
        <AppText variant="mono" tone="accent" className="text-2xl font-bold">
          {departure.time}
        </AppText>
        <DelayBadge minutes={departure.delayMinutes} />
      </View>
      <Pressable testID="favorite-button" onPress={() => onToggleFavorite(departure.id)}>
        <Bell size={18} color={isFavorite ? "#582CFF" : "#A1A1AA"} />
      </Pressable>
    </View>
  );
}
```

```tsx
// apps/native/components/organisms/NextBusHero.tsx
import { View } from "react-native";
import { Route } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import { DelayBadge } from "@/components/molecules/DelayBadge";
import type { BusDeparture } from "@/features/onibus/onibus.model";

export function NextBusHero({ departure }: { departure: BusDeparture }) {
  return (
    <View className="flex-row overflow-hidden rounded-lg-card border border-border-subtle bg-surface-secondary">
      <View className="w-[130px] items-center justify-center gap-1 bg-accent-primary p-5">
        <AppText variant="mono" tone="primary" className="text-2xl font-bold">
          {departure.time}
        </AppText>
        <AppText variant="body" tone="primary" className="text-xs opacity-80">
          {departure.status}
        </AppText>
      </View>
      <View className="h-full w-px bg-border-subtle" />
      <View className="flex-1 justify-center gap-2 p-5">
        <AppText variant="caption" tone="muted" className="text-[11px] font-medium uppercase">
          Próxima saída
        </AppText>
        {departure.delayMinutes > 0 && <DelayBadge minutes={departure.delayMinutes} />}
        <AppText variant="body" tone="primary" className="text-[15px] font-semibold">
          Ônibus Universitário
        </AppText>
        <View className="flex-row items-center gap-1.5">
          <Route size={12} color="#00F2FF" />
          <AppText variant="body" tone="muted" className="text-xs">
            {departure.route}
          </AppText>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter native test BusTimeCard.test.tsx NextBusHero.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/native/components/organisms/BusTimeCard.tsx apps/native/components/organisms/NextBusHero.tsx apps/native/components/organisms/__tests__
git commit -m "feat: add BusTimeCard and NextBusHero organisms"
```

---

### Task 7: Ônibus feature — model, view-model, view, route

**Files:**
- Create: `apps/native/state/busStopFilter.ts`
- Create: `apps/native/state/favoriteBusTimes.ts`
- Create: `apps/native/features/onibus/onibus.model.ts`
- Create: `apps/native/features/onibus/onibus.viewmodel.ts`
- Create: `apps/native/features/onibus/OnibusScreen.tsx`
- Modify: `apps/native/app/(drawer)/(tabs)/index.tsx`
- Test: `apps/native/features/onibus/__tests__/onibus.viewmodel.test.ts`
- Test: `apps/native/features/onibus/__tests__/OnibusScreen.test.tsx`

**Interfaces:**
- Consumes: `BusTimeCard`, `NextBusHero` (Task 6), `AppText` (Task 2), Jotai (`atom`, `useAtom`, `useAtomValue`).
- Produces: `BusDeparture` type, `BUS_DEPARTURES: BusDeparture[]` mock data, `useOnibusViewModel()` hook returning `{ next: BusDeparture; filtered: BusDeparture[]; filter: "Todos" | "UCSAL" | "Pituaçu"; setFilter: (f) => void; isFavorite: (id) => boolean; toggleFavorite: (id) => void }`, and `<OnibusScreen />`.

- [ ] **Step 1: Write the failing view-model test**

```ts
// apps/native/features/onibus/__tests__/onibus.viewmodel.test.ts
import { act, renderHook } from "@testing-library/react-native";
import { Provider as JotaiProvider } from "jotai";
import { useOnibusViewModel } from "@/features/onibus/onibus.viewmodel";

function wrapper({ children }: { children: React.ReactNode }) {
  return <JotaiProvider>{children}</JotaiProvider>;
}

describe("useOnibusViewModel", () => {
  it("defaults the filter to Todos and exposes all departures", () => {
    const { result } = renderHook(() => useOnibusViewModel(), { wrapper });
    expect(result.current.filter).toBe("Todos");
    expect(result.current.filtered.length).toBeGreaterThan(0);
  });

  it("filters departures by stop when the filter changes", () => {
    const { result } = renderHook(() => useOnibusViewModel(), { wrapper });
    act(() => result.current.setFilter("UCSAL"));
    expect(result.current.filtered.every((d) => d.stop === "UCSAL")).toBe(true);
  });

  it("toggles a departure's favorite state", () => {
    const { result } = renderHook(() => useOnibusViewModel(), { wrapper });
    const id = result.current.filtered[0].id;
    expect(result.current.isFavorite(id)).toBe(false);
    act(() => result.current.toggleFavorite(id));
    expect(result.current.isFavorite(id)).toBe(true);
    act(() => result.current.toggleFavorite(id));
    expect(result.current.isFavorite(id)).toBe(false);
  });

  it("exposes the earliest departure as next", () => {
    const { result } = renderHook(() => useOnibusViewModel(), { wrapper });
    expect(result.current.next.id).toBe(result.current.filtered[0].id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test onibus.viewmodel.test.ts`
Expected: FAIL with "Cannot find module '@/features/onibus/onibus.viewmodel'".

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/native/state/busStopFilter.ts
import { atom } from "jotai";

export type BusStopFilter = "Todos" | "UCSAL" | "Pituaçu";

export const busStopFilterAtom = atom<BusStopFilter>("Todos");
```

```ts
// apps/native/state/favoriteBusTimes.ts
import { atom } from "jotai";

export const favoriteBusTimesAtom = atom<Set<string>>(new Set<string>());
```

```ts
// apps/native/features/onibus/onibus.model.ts
export type BusStop = "UCSAL" | "PITUACU";

export type OccupancyLevel = "vazio" | "moderado" | "cheio";

export type BusDeparture = {
  id: string;
  time: string;
  stop: BusStop;
  route: string;
  status: string;
  occupancy: OccupancyLevel;
  delayMinutes: number;
};

export const BUS_DEPARTURES: BusDeparture[] = [
  {
    id: "bus-0800",
    time: "08:00",
    stop: "UCSAL",
    route: "UCSAL → Estação",
    status: "Saída do campus",
    occupancy: "vazio",
    delayMinutes: 0,
  },
  {
    id: "bus-0830",
    time: "08:30",
    stop: "PITUACU",
    route: "Estação → UCSAL",
    status: "Chegada no campus",
    occupancy: "moderado",
    delayMinutes: 5,
  },
  {
    id: "bus-0915",
    time: "09:15",
    stop: "UCSAL",
    route: "UCSAL → Estação",
    status: "Saída do campus",
    occupancy: "cheio",
    delayMinutes: 0,
  },
  {
    id: "bus-1000",
    time: "10:00",
    stop: "PITUACU",
    route: "Estação → UCSAL",
    status: "Chegada no campus",
    occupancy: "vazio",
    delayMinutes: 0,
  },
  {
    id: "bus-1130",
    time: "11:30",
    stop: "UCSAL",
    route: "UCSAL → Estação",
    status: "Saída do campus",
    occupancy: "moderado",
    delayMinutes: 3,
  },
];
```

```ts
// apps/native/features/onibus/onibus.viewmodel.ts
import { useAtom } from "jotai";
import { useCallback, useMemo } from "react";
import { busStopFilterAtom, type BusStopFilter } from "@/state/busStopFilter";
import { favoriteBusTimesAtom } from "@/state/favoriteBusTimes";
import { BUS_DEPARTURES, type BusDeparture, type BusStop } from "@/features/onibus/onibus.model";

const FILTER_TO_STOP: Record<Exclude<BusStopFilter, "Todos">, BusStop> = {
  UCSAL: "UCSAL",
  "Pituaçu": "PITUACU",
};

export function useOnibusViewModel() {
  const [filter, setFilter] = useAtom(busStopFilterAtom);
  const [favorites, setFavorites] = useAtom(favoriteBusTimesAtom);

  const filtered = useMemo(() => {
    if (filter === "Todos") {
      return BUS_DEPARTURES;
    }
    const stop = FILTER_TO_STOP[filter];
    return BUS_DEPARTURES.filter((departure) => departure.stop === stop);
  }, [filter]);

  const next = filtered[0] ?? BUS_DEPARTURES[0];

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((current) => {
        const next = new Set(current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [setFavorites],
  );

  return { next, filtered, filter, setFilter, isFavorite, toggleFavorite } as const;
}

export type { BusDeparture };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test onibus.viewmodel.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing view test**

```tsx
// apps/native/features/onibus/__tests__/OnibusScreen.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Provider as JotaiProvider } from "jotai";
import { OnibusScreen } from "@/features/onibus/OnibusScreen";

describe("OnibusScreen", () => {
  it("renders the hero and the departures list", () => {
    render(
      <JotaiProvider>
        <OnibusScreen />
      </JotaiProvider>,
    );
    expect(screen.getByText("Próximos horários")).toBeTruthy();
    expect(screen.getByText("UCSAL → Estação")).toBeTruthy();
  });

  it("filters the list when the UCSAL segment is pressed", () => {
    render(
      <JotaiProvider>
        <OnibusScreen />
      </JotaiProvider>,
    );
    fireEvent.press(screen.getByTestId("filter-UCSAL"));
    expect(screen.queryByText("Chegada no campus")).toBeNull();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter native test OnibusScreen.test.tsx`
Expected: FAIL with "Cannot find module '@/features/onibus/OnibusScreen'".

- [ ] **Step 7: Write minimal implementation**

```tsx
// apps/native/components/molecules/SegmentedFilter.tsx
import { Pressable, View } from "react-native";
import { cn } from "heroui-native";
import { AppText } from "@/components/atoms/AppText";

export type SegmentedFilterProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange,
}: SegmentedFilterProps<T>) {
  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            testID={`filter-${option}`}
            onPress={() => onChange(option)}
            className={cn(
              "flex-1 items-center justify-center rounded-sm-card border py-2",
              active ? "border-accent-primary bg-accent-primary" : "border-border-subtle bg-surface-secondary",
            )}
          >
            <AppText variant="caption" tone={active ? "primary" : "muted"} className="text-xs font-semibold">
              {option}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
```

```tsx
// apps/native/features/onibus/OnibusScreen.tsx
import { View } from "react-native";
import { Bell } from "lucide-react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { SegmentedFilter } from "@/components/molecules/SegmentedFilter";
import { BusTimeCard } from "@/components/organisms/BusTimeCard";
import { NextBusHero } from "@/components/organisms/NextBusHero";
import { useOnibusViewModel } from "@/features/onibus/onibus.viewmodel";
import type { BusStopFilter } from "@/state/busStopFilter";

const FILTER_OPTIONS: readonly BusStopFilter[] = ["Todos", "UCSAL", "Pituaçu"];

export function OnibusScreen() {
  const { next, filtered, filter, setFilter, isFavorite, toggleFavorite } = useOnibusViewModel();

  return (
    <Container className="bg-surface-primary">
      <View className="gap-6 p-5">
        <View className="flex-row items-center justify-between">
          <AppText variant="heading" tone="primary" className="text-[28px] font-bold">
            Ônibus
          </AppText>
          <Bell size={24} color="#A1A1AA" />
        </View>

        <NextBusHero departure={next} />

        <SegmentedFilter options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

        <View className="gap-3">
          <AppText variant="heading" tone="primary" className="text-lg font-semibold">
            Próximos horários
          </AppText>
          <View className="gap-2.5">
            {filtered.map((departure) => (
              <BusTimeCard
                key={departure.id}
                departure={departure}
                isFavorite={isFavorite(departure.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </View>
        </View>
      </View>
    </Container>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter native test OnibusScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Wire the route**

Replace the contents of `apps/native/app/(drawer)/(tabs)/index.tsx`:

```tsx
import { OnibusScreen } from "@/features/onibus/OnibusScreen";

export default function Home() {
  return <OnibusScreen />;
}
```

- [ ] **Step 10: Full-suite check**

Run: `pnpm --filter native test`
Expected: all tests so far PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/native/state apps/native/features/onibus apps/native/components/molecules/SegmentedFilter.tsx apps/native/components/molecules/__tests__/SegmentedFilter.test.tsx apps/native/app/\(drawer\)/\(tabs\)/index.tsx
git commit -m "feat: implement Ônibus screen with MVVM and Jotai filter/favorites state"
```

*(Add a `SegmentedFilter.test.tsx` alongside this task following the same test-first pattern as Task 5, covering: renders all option labels, calls `onChange` with the pressed option, and marks the active option's `testID` container with the accent background class.)*

---

### Task 8: Aulas feature — model, view-model, view, route

**Files:**
- Create: `apps/native/features/aulas/aulas.model.ts`
- Create: `apps/native/features/aulas/aulas.viewmodel.ts`
- Create: `apps/native/features/aulas/AulasScreen.tsx`
- Create: `apps/native/components/organisms/ClassCard.tsx`
- Create: `apps/native/components/organisms/NextClassHero.tsx`
- Modify: `apps/native/app/(drawer)/(tabs)/two.tsx`
- Test: `apps/native/components/organisms/__tests__/ClassCard.test.tsx`
- Test: `apps/native/components/organisms/__tests__/NextClassHero.test.tsx`
- Test: `apps/native/features/aulas/__tests__/aulas.viewmodel.test.ts`
- Test: `apps/native/features/aulas/__tests__/AulasScreen.test.tsx`

**Interfaces:**
- Consumes: `AppText`, `DifficultyTag`, `IconBadge` from earlier tasks.
- Produces: `ClassSession` type, `CLASS_SESSIONS: ClassSession[]`, `useAulasViewModel()` returning `{ next: ClassSession; sessions: ClassSession[] }`, `<AulasScreen />`. Follows the exact same MVVM shape as Task 7 (no filter/favorite state needed here — Aulas has none in the spec).

- [ ] **Step 1: Write the failing organism tests**

```tsx
// apps/native/components/organisms/__tests__/ClassCard.test.tsx
import { render, screen } from "@testing-library/react-native";
import { ClassCard } from "@/components/organisms/ClassCard";
import type { ClassSession } from "@/features/aulas/aulas.model";

const session: ClassSession = {
  id: "class-eng-sw",
  startTime: "08:00",
  endTime: "09:30",
  subject: "Engenharia de Software",
  professor: "Prof. Ana Silva",
  room: "Sala 302 · BL-A",
  difficulty: { level: "dificil", score: 4.3, reviewCount: 142 },
};

describe("ClassCard", () => {
  it("renders subject, professor, room and time", () => {
    render(<ClassCard session={session} />);
    expect(screen.getByText("Engenharia de Software")).toBeTruthy();
    expect(screen.getByText("Prof. Ana Silva")).toBeTruthy();
    expect(screen.getByText("Sala 302 · BL-A")).toBeTruthy();
    expect(screen.getByText("08:00")).toBeTruthy();
  });

  it("renders the difficulty tag", () => {
    render(<ClassCard session={session} />);
    expect(screen.getByText("Difícil · 4.3/5 (142 avaliações)")).toBeTruthy();
  });
});
```

```tsx
// apps/native/components/organisms/__tests__/NextClassHero.test.tsx
import { render, screen } from "@testing-library/react-native";
import { NextClassHero } from "@/components/organisms/NextClassHero";
import type { ClassSession } from "@/features/aulas/aulas.model";

const session: ClassSession = {
  id: "class-eng-sw",
  startTime: "08:00",
  endTime: "09:30",
  subject: "Engenharia de Software",
  professor: "Prof. Ana Silva",
  room: "Sala 302 · Bloco A",
  difficulty: { level: "dificil", score: 4.3, reviewCount: 142 },
};

describe("NextClassHero", () => {
  it("renders the subject and room", () => {
    render(<NextClassHero session={session} />);
    expect(screen.getByText("Engenharia de Software")).toBeTruthy();
    expect(screen.getByText("Sala 302 · Bloco A")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter native test ClassCard.test.tsx NextClassHero.test.tsx`
Expected: FAIL — modules missing.

*Step 0 note: create `apps/native/features/aulas/aulas.model.ts` (Step 3 below) before running this, same as Task 6's Step 0.*

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/native/features/aulas/aulas.model.ts
import type { DifficultyLevel } from "@/components/molecules/DifficultyTag";

export type ClassDifficulty = {
  level: DifficultyLevel;
  score: number;
  reviewCount: number;
};

export type ClassSession = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  professor: string;
  room: string;
  difficulty: ClassDifficulty;
};

export const CLASS_SESSIONS: ClassSession[] = [
  {
    id: "class-eng-sw",
    startTime: "08:00",
    endTime: "09:30",
    subject: "Engenharia de Software",
    professor: "Prof. Ana Silva",
    room: "Sala 302 · BL-A-302",
    difficulty: { level: "dificil", score: 4.3, reviewCount: 142 },
  },
  {
    id: "class-bd2",
    startTime: "10:00",
    endTime: "11:30",
    subject: "Banco de Dados II",
    professor: "Prof. Carlos Melo",
    room: "Sala 415 · BL-B-415",
    difficulty: { level: "dificil", score: 4.6, reviewCount: 97 },
  },
  {
    id: "class-redes",
    startTime: "13:00",
    endTime: "14:30",
    subject: "Redes de Computadores",
    professor: "Prof. Maria Santos",
    room: "Lab 201 · BL-C-201",
    difficulty: { level: "medio", score: 3.1, reviewCount: 64 },
  },
  {
    id: "class-ia",
    startTime: "15:00",
    endTime: "16:30",
    subject: "Inteligência Artificial",
    professor: "Prof. João Lima",
    room: "Sala 108 · BL-A-108",
    difficulty: { level: "dificil", score: 4.1, reviewCount: 110 },
  },
  {
    id: "class-projeto",
    startTime: "17:00",
    endTime: "18:30",
    subject: "Projeto Integrador",
    professor: "Prof. Renata Costa",
    room: "Sala 510 · BL-D-510",
    difficulty: { level: "facil", score: 2.0, reviewCount: 38 },
  },
];
```

```tsx
// apps/native/components/organisms/ClassCard.tsx
import { View } from "react-native";
import { MapPin } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import { DifficultyTag } from "@/components/molecules/DifficultyTag";
import type { ClassSession } from "@/features/aulas/aulas.model";

export function ClassCard({ session }: { session: ClassSession }) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
      <View className="items-center gap-0.5">
        <AppText variant="mono" tone="accent" className="text-base font-bold">
          {session.startTime}
        </AppText>
        <AppText variant="mono" tone="muted" className="text-[11px]">
          {session.endTime}
        </AppText>
      </View>
      <View className="h-12 w-0.5 rounded-full bg-accent-primary" />
      <View className="flex-1 gap-0.5">
        <AppText variant="body" tone="primary" className="text-sm font-semibold">
          {session.subject}
        </AppText>
        <AppText variant="body" tone="secondary" className="text-xs">
          {session.professor}
        </AppText>
        <View className="flex-row items-center gap-1.5">
          <MapPin size={12} color="#A1A1AA" />
          <AppText variant="body" tone="muted" className="text-xs">
            {session.room}
          </AppText>
        </View>
        <DifficultyTag {...session.difficulty} />
      </View>
    </View>
  );
}
```

```tsx
// apps/native/components/organisms/NextClassHero.tsx
import { View } from "react-native";
import { MapPin } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import type { ClassSession } from "@/features/aulas/aulas.model";

export function NextClassHero({ session }: { session: ClassSession }) {
  return (
    <View className="flex-row overflow-hidden rounded-lg-card border border-border-subtle bg-surface-secondary">
      <View className="w-[130px] items-center justify-center gap-1 bg-accent-primary p-5">
        <AppText variant="mono" tone="primary" className="text-2xl font-bold">
          {session.startTime}
        </AppText>
        <AppText variant="mono" tone="primary" className="text-xs opacity-80">
          {session.endTime}
        </AppText>
      </View>
      <View className="h-full w-px bg-border-subtle" />
      <View className="flex-1 justify-center gap-2 p-5">
        <AppText variant="caption" tone="muted" className="text-[11px] font-medium uppercase">
          Próxima aula
        </AppText>
        <AppText variant="body" tone="primary" className="text-[15px] font-semibold">
          {session.subject}
        </AppText>
        <View className="flex-row items-center gap-1.5">
          <MapPin size={12} color="#00F2FF" />
          <AppText variant="body" tone="muted" className="text-xs">
            {session.room}
          </AppText>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter native test ClassCard.test.tsx NextClassHero.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing view-model + view tests**

```ts
// apps/native/features/aulas/__tests__/aulas.viewmodel.test.ts
import { renderHook } from "@testing-library/react-native";
import { useAulasViewModel } from "@/features/aulas/aulas.viewmodel";

describe("useAulasViewModel", () => {
  it("exposes all sessions and the first one as next", () => {
    const { result } = renderHook(() => useAulasViewModel());
    expect(result.current.sessions.length).toBe(5);
    expect(result.current.next.id).toBe(result.current.sessions[0].id);
  });
});
```

```tsx
// apps/native/features/aulas/__tests__/AulasScreen.test.tsx
import { render, screen } from "@testing-library/react-native";
import { AulasScreen } from "@/features/aulas/AulasScreen";

describe("AulasScreen", () => {
  it("renders the hero and the full class list", () => {
    render(<AulasScreen />);
    expect(screen.getByText("Todas as aulas")).toBeTruthy();
    expect(screen.getByText("Banco de Dados II")).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `pnpm --filter native test aulas.viewmodel.test.ts AulasScreen.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 7: Write minimal implementation**

```ts
// apps/native/features/aulas/aulas.viewmodel.ts
import { CLASS_SESSIONS } from "@/features/aulas/aulas.model";

export function useAulasViewModel() {
  return { sessions: CLASS_SESSIONS, next: CLASS_SESSIONS[0] } as const;
}
```

```tsx
// apps/native/features/aulas/AulasScreen.tsx
import { View } from "react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { ClassCard } from "@/components/organisms/ClassCard";
import { NextClassHero } from "@/components/organisms/NextClassHero";
import { useAulasViewModel } from "@/features/aulas/aulas.viewmodel";

export function AulasScreen() {
  const { next, sessions } = useAulasViewModel();

  return (
    <Container className="bg-surface-primary">
      <View className="gap-6 p-5">
        <AppText variant="heading" tone="primary" className="text-[28px] font-bold">
          Aulas
        </AppText>

        <NextClassHero session={next} />

        <View className="gap-3">
          <AppText variant="heading" tone="primary" className="text-lg font-semibold">
            Todas as aulas
          </AppText>
          <View className="gap-2.5">
            {sessions.map((session) => (
              <ClassCard key={session.id} session={session} />
            ))}
          </View>
        </View>
      </View>
    </Container>
  );
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm --filter native test aulas.viewmodel.test.ts AulasScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Wire the route**

Replace the contents of `apps/native/app/(drawer)/(tabs)/two.tsx`:

```tsx
import { AulasScreen } from "@/features/aulas/AulasScreen";

export default function TabTwo() {
  return <AulasScreen />;
}
```

- [ ] **Step 10: Commit**

```bash
git add apps/native/features/aulas apps/native/components/organisms/ClassCard.tsx apps/native/components/organisms/NextClassHero.tsx apps/native/components/organisms/__tests__/ClassCard.test.tsx apps/native/components/organisms/__tests__/NextClassHero.test.tsx apps/native/app/\(drawer\)/\(tabs\)/two.tsx
git commit -m "feat: implement Aulas screen with MVVM"
```

---

### Task 9: Login feature

**Files:**
- Create: `apps/native/features/login/login.model.ts`
- Create: `apps/native/features/login/login.viewmodel.ts`
- Create: `apps/native/features/login/LoginScreen.tsx`
- Create: `apps/native/app/login.tsx`
- Test: `apps/native/features/login/__tests__/login.viewmodel.test.ts`
- Test: `apps/native/features/login/__tests__/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `AppButton` (Task 3), `AppText` (Task 2).
- Produces: `AuthStatus = "idle" | "authenticating" | "error"`, `useLoginViewModel()` returning `{ status: AuthStatus; error: string | null; signInWithGoogle: () => Promise<void> }`, `<LoginScreen />`.

- [ ] **Step 1: Write the failing view-model test**

```ts
// apps/native/features/login/__tests__/login.viewmodel.test.ts
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useLoginViewModel } from "@/features/login/login.viewmodel";

describe("useLoginViewModel", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => useLoginViewModel());
    expect(result.current.status).toBe("idle");
  });

  it("moves to authenticating then back to idle on success", async () => {
    const { result } = renderHook(() =>
      useLoginViewModel({ authenticate: () => Promise.resolve() }),
    );
    act(() => {
      result.current.signInWithGoogle();
    });
    expect(result.current.status).toBe("authenticating");
    await waitFor(() => expect(result.current.status).toBe("idle"));
  });

  it("surfaces an error message when authentication fails", async () => {
    const { result } = renderHook(() =>
      useLoginViewModel({ authenticate: () => Promise.reject(new Error("network")) }),
    );
    await act(async () => {
      await result.current.signInWithGoogle();
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Não foi possível entrar. Tente novamente.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test login.viewmodel.test.ts`
Expected: FAIL with "Cannot find module '@/features/login/login.viewmodel'".

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/native/features/login/login.model.ts
export type AuthStatus = "idle" | "authenticating" | "error";
```

```ts
// apps/native/features/login/login.viewmodel.ts
import { useCallback, useState } from "react";
import type { AuthStatus } from "@/features/login/login.model";

export type LoginViewModelDeps = {
  authenticate: () => Promise<void>;
};

const defaultDeps: LoginViewModelDeps = {
  // Real Google OAuth wiring belongs here once the Classroom integration
  // is implemented; kept as a single injection point so the view-model
  // and its tests never depend on network/auth SDKs.
  authenticate: () => Promise.resolve(),
};

export function useLoginViewModel(deps: LoginViewModelDeps = defaultDeps) {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async () => {
    setStatus("authenticating");
    setError(null);
    try {
      await deps.authenticate();
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Não foi possível entrar. Tente novamente.");
    }
  }, [deps]);

  return { status, error, signInWithGoogle } as const;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test login.viewmodel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing view test**

```tsx
// apps/native/features/login/__tests__/LoginScreen.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { LoginScreen } from "@/features/login/LoginScreen";

describe("LoginScreen", () => {
  it("renders the app name and the Google CTA", () => {
    render(<LoginScreen />);
    expect(screen.getByText("Compasso UCSAL")).toBeTruthy();
    expect(screen.getByText("Entrar com conta UCSAL (Google)")).toBeTruthy();
  });

  it("shows an error message after a failed sign-in", async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText("Entrar com conta UCSAL (Google)"));
    expect(await screen.findByText(/Não foi possível entrar/)).toBeTruthy();
  });
});
```

Note: `LoginScreen`'s default `authenticate` (from Step 3) resolves successfully, so this second test only passes once `LoginScreen` accepts an optional `authenticate` override — thread it through in Step 7 below.

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter native test LoginScreen.test.tsx`
Expected: FAIL with "Cannot find module '@/features/login/LoginScreen'".

- [ ] **Step 7: Write minimal implementation**

```tsx
// apps/native/features/login/LoginScreen.tsx
import { View } from "react-native";
import { Compass, LogIn } from "lucide-react-native";
import { AppText } from "@/components/atoms/AppText";
import { AppButton } from "@/components/atoms/AppButton";
import { IconBadge } from "@/components/atoms/IconBadge";
import { useLoginViewModel, type LoginViewModelDeps } from "@/features/login/login.viewmodel";

export function LoginScreen({ authenticate }: { authenticate?: LoginViewModelDeps["authenticate"] } = {}) {
  const { status, error, signInWithGoogle } = useLoginViewModel(
    authenticate ? { authenticate } : undefined,
  );

  return (
    <View className="flex-1 items-center justify-center gap-8 bg-surface-primary px-8">
      <IconBadge
        icon={<Compass size={32} color="#FFFFFF" />}
        tone="accent"
        className="h-[72px] w-[72px] rounded-lg-card bg-accent-primary"
      />

      <View className="items-center gap-2">
        <AppText variant="heading" tone="primary" className="text-[26px] font-bold">
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
        <AppText variant="caption" tone="muted" className="text-center text-[11px]">
          Ao continuar, você autoriza acesso de leitura ao Google Classroom e Drive
        </AppText>
      </View>
    </View>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter native test LoginScreen.test.tsx`
Expected: PASS (2 tests) — the second test's `signInWithGoogle` call uses the default `authenticate`, which resolves successfully; **fix the test** to pass a rejecting `authenticate` prop instead of relying on the default:

```tsx
it("shows an error message after a failed sign-in", async () => {
  render(<LoginScreen authenticate={() => Promise.reject(new Error("x"))} />);
  fireEvent.press(screen.getByText("Entrar com conta UCSAL (Google)"));
  expect(await screen.findByText(/Não foi possível entrar/)).toBeTruthy();
});
```

Re-run: `pnpm --filter native test LoginScreen.test.tsx` — Expected: PASS (2 tests).

- [ ] **Step 9: Wire the route**

Create `apps/native/app/login.tsx`:

```tsx
import { LoginScreen } from "@/features/login/LoginScreen";

export default function Login() {
  return <LoginScreen />;
}
```

- [ ] **Step 10: Commit**

```bash
git add apps/native/features/login apps/native/app/login.tsx
git commit -m "feat: implement Login screen with MVVM"
```

---

### Task 10: Perfil feature

**Files:**
- Create: `apps/native/features/perfil/perfil.model.ts`
- Create: `apps/native/features/perfil/perfil.viewmodel.ts`
- Create: `apps/native/features/perfil/PerfilScreen.tsx`
- Create: `apps/native/app/(drawer)/perfil.tsx`
- Test: `apps/native/features/perfil/__tests__/perfil.viewmodel.test.ts`
- Test: `apps/native/features/perfil/__tests__/PerfilScreen.test.tsx`

**Interfaces:**
- Consumes: `AppText`, `AppButton`, `IconBadge`.
- Produces: `UserProfile`, `ConnectedAccount` types, `usePerfilViewModel()` returning `{ profile: UserProfile; accounts: ConnectedAccount[]; notificationsEnabled: boolean; toggleNotifications: () => void; signOut: () => void }`, `<PerfilScreen />`. Per the design, only Google Classroom is connected for now — no theme/language rows.

- [ ] **Step 1: Write the failing view-model test**

```ts
// apps/native/features/perfil/__tests__/perfil.viewmodel.test.ts
import { act, renderHook } from "@testing-library/react-native";
import { usePerfilViewModel } from "@/features/perfil/perfil.viewmodel";

describe("usePerfilViewModel", () => {
  it("exposes the user profile and a single connected account (Classroom)", () => {
    const { result } = renderHook(() => usePerfilViewModel());
    expect(result.current.profile.name).toBe("João Silva");
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe("Google Classroom");
    expect(result.current.accounts[0].connected).toBe(true);
  });

  it("toggles notifications", () => {
    const { result } = renderHook(() => usePerfilViewModel());
    expect(result.current.notificationsEnabled).toBe(true);
    act(() => result.current.toggleNotifications());
    expect(result.current.notificationsEnabled).toBe(false);
  });

  it("calls the injected sign-out callback", () => {
    const onSignOut = jest.fn();
    const { result } = renderHook(() => usePerfilViewModel({ onSignOut }));
    act(() => result.current.signOut());
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter native test perfil.viewmodel.test.ts`
Expected: FAIL with "Cannot find module '@/features/perfil/perfil.viewmodel'".

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/native/features/perfil/perfil.model.ts
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
```

```ts
// apps/native/features/perfil/perfil.viewmodel.ts
import { useCallback, useState } from "react";
import { CONNECTED_ACCOUNTS, CURRENT_USER } from "@/features/perfil/perfil.model";

export type PerfilViewModelDeps = {
  onSignOut?: () => void;
};

export function usePerfilViewModel({ onSignOut }: PerfilViewModelDeps = {}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled((current) => !current);
  }, []);

  const signOut = useCallback(() => {
    onSignOut?.();
  }, [onSignOut]);

  return {
    profile: CURRENT_USER,
    accounts: CONNECTED_ACCOUNTS,
    notificationsEnabled,
    toggleNotifications,
    signOut,
  } as const;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter native test perfil.viewmodel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing view test**

```tsx
// apps/native/features/perfil/__tests__/PerfilScreen.test.tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { PerfilScreen } from "@/features/perfil/PerfilScreen";

describe("PerfilScreen", () => {
  it("renders the user name and the Classroom connection", () => {
    render(<PerfilScreen />);
    expect(screen.getByText("João Silva")).toBeTruthy();
    expect(screen.getByText("Google Classroom")).toBeTruthy();
  });

  it("calls onSignOut when the sign-out button is pressed", () => {
    const onSignOut = jest.fn();
    render(<PerfilScreen onSignOut={onSignOut} />);
    fireEvent.press(screen.getByText("Sair da conta"));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter native test PerfilScreen.test.tsx`
Expected: FAIL with "Cannot find module '@/features/perfil/PerfilScreen'".

- [ ] **Step 7: Write minimal implementation**

```tsx
// apps/native/features/perfil/PerfilScreen.tsx
import { View } from "react-native";
import { Bell, GraduationCap, LogOut } from "lucide-react-native";
import { Container } from "@/components/container";
import { AppText } from "@/components/atoms/AppText";
import { AppButton } from "@/components/atoms/AppButton";
import { IconBadge } from "@/components/atoms/IconBadge";
import { usePerfilViewModel } from "@/features/perfil/perfil.viewmodel";

export function PerfilScreen({ onSignOut }: { onSignOut?: () => void } = {}) {
  const { profile, accounts, notificationsEnabled, toggleNotifications, signOut } =
    usePerfilViewModel({ onSignOut });

  return (
    <Container className="bg-surface-primary">
      <View className="gap-6 p-5">
        <AppText variant="heading" tone="primary" className="text-[28px] font-bold">
          Perfil
        </AppText>

        <View className="flex-row items-center gap-3.5 rounded-lg-card border border-border-subtle bg-surface-secondary p-4">
          <IconBadge
            icon={
              <AppText variant="heading" tone="primary" className="text-lg font-bold">
                {profile.initials}
              </AppText>
            }
            tone="accent"
            className="h-[52px] w-[52px] rounded-lg-card bg-accent-primary"
          />
          <View className="flex-1 gap-0.5">
            <AppText variant="body" tone="primary" className="text-[15px] font-semibold">
              {profile.name}
            </AppText>
            <AppText variant="body" tone="muted" className="text-xs">
              {profile.email}
            </AppText>
          </View>
        </View>

        <View className="gap-3">
          <AppText variant="heading" tone="muted" className="text-sm font-semibold">
            Contas conectadas
          </AppText>
          {accounts.map((account) => (
            <View
              key={account.id}
              className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5"
            >
              <IconBadge icon={<GraduationCap size={16} color="#582CFF" />} tone="accent" />
              <View className="flex-1 gap-0.5">
                <AppText variant="body" tone="primary" className="text-[13px] font-semibold">
                  {account.name}
                </AppText>
                <AppText variant="body" tone="success" className="text-[11px]">
                  Conectado
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <View className="gap-3">
          <AppText variant="heading" tone="muted" className="text-sm font-semibold">
            Preferências
          </AppText>
          <View className="flex-row items-center gap-3 rounded-lg-card border border-border-subtle bg-surface-secondary p-3.5">
            <Bell size={16} color="#A1A1AA" />
            <AppText variant="body" tone="primary" className="flex-1 text-[13px] font-medium">
              Notificações push
            </AppText>
            <AppButton
              label={notificationsEnabled ? "On" : "Off"}
              onPress={toggleNotifications}
              variant={notificationsEnabled ? "primary" : "outline"}
            />
          </View>
        </View>

        <AppButton
          label="Sair da conta"
          onPress={signOut}
          variant="outline"
          icon={<LogOut size={14} color="#EF4444" />}
        />
      </View>
    </Container>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter native test PerfilScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Wire the route**

Create `apps/native/app/(drawer)/perfil.tsx`:

```tsx
import { PerfilScreen } from "@/features/perfil/PerfilScreen";

export default function Perfil() {
  return <PerfilScreen />;
}
```

Add a matching `Drawer.Screen` entry to `apps/native/app/(drawer)/_layout.tsx` (after the existing `(tabs)` screen), following the same `drawerLabel`/`drawerIcon` pattern already used for `index` and `(tabs)` in that file — label `"Perfil"`, icon `Ionicons` name `"person-outline"`.

- [ ] **Step 10: Commit**

```bash
git add apps/native/features/perfil apps/native/app/\(drawer\)/perfil.tsx apps/native/app/\(drawer\)/_layout.tsx
git commit -m "feat: implement Perfil screen with MVVM"
```

---

### Task 11: Full regression pass

**Files:** none created — verification only.

- [ ] **Step 1: Run the entire test suite**

Run: `pnpm --filter native test`
Expected: every test file from Tasks 2–10 passes, 0 failures.

- [ ] **Step 2: Type-check the whole app**

Run: `pnpm --filter native exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm --filter native exec biome check .`
Expected: no errors (fix any reported issues in the files this plan touched before moving on).

- [ ] **Step 4: Commit** (only if Steps 2–3 required fixes)

```bash
git add -A
git commit -m "fix: address type/lint issues from design system implementation"
```

---

## Deferred scope (not in this plan)

The `.pen` file also defines **Tela Detalhes da Aula** (Materiais/IA tabs), **Tela Quiz**, **Tela Resultado Quiz**, **Tela Notificações**, plus empty-state and filtered-state variants. They follow the exact same pattern established above (one `features/<screen>/` folder with `model.ts` + `viewmodel.ts` + `Screen.tsx` + tests, built from the same atoms/molecules/organisms). They're left out of this plan to keep it shippable in one pass — re-run this same skill against those screens as a follow-up plan once Tasks 1–11 are merged, since several of their organisms (file rows, insight cards, quiz options) are net-new and deserve their own atom/molecule tasks rather than being bolted onto this one.
