# PLAT-01 / PLAT-02 / MOB-01 — Root Workspace, Shared Config, and Mobile Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the existing, working `apps/mobile` Expo app into a root pnpm/Turborepo/Biome workspace — with a single root lockfile, a shared `packages/config` TypeScript/Biome baseline, and zero behavior change — so every later M1 plan (`PLAT-03` onward) has a real monorepo to build on.

**Architecture:** One root `pnpm-workspace.yaml` (`apps/*`, `packages/*`), one root `package.json` (`littlearc`, private, `packageManager` pinned), one root `turbo.json` orchestrating per-package `build`/`typecheck`/`test`, and one root `biome.json` linting/formatting the whole tree. The nested `apps/mobile/pnpm-workspace.yaml` and `apps/mobile/pnpm-lock.yaml` are removed — `apps/mobile` becomes an ordinary workspace member renamed to `@littlearc/mobile`. `packages/config` ships shared `tsconfig` bases; `apps/mobile/tsconfig.json` layers `expo/tsconfig.base` with `@littlearc/config/typescript/base.json` via TypeScript's multi-`extends`, per the approved design (§3.2). No mobile navigation, design-system, or route code changes — this plan is a structural migration, proven safe by an identical before/after regression check (typecheck, Jest, `expo-doctor`, `expo export`).

**Tech Stack:** pnpm `11.13.0`, Node.js `22.17.0`, Turborepo `2.10.5`, Biome `2.5.3`, TypeScript `6.0.3` (unchanged from the existing pin), Expo SDK `~57.0.4` (unchanged).

---

## Before you start

Read `apps/mobile/AGENTS.md` in full — it points at `docs/core/implementation-status.md` (update protocol) and requires re-reading the exact versioned Expo SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/` before writing any Expo-related code in this plan.

This is cluster plan 1 of 6 for M1. Read `docs/impl-plan/M1/README.md` first for the shared naming/ports/env contract, dependency graph, and stop/go gates that every M1 plan must honor.

All commands below assume the repo root `/Users/nishanth/zealer/projects/litlearc` unless a task says otherwise.

---

### Task 1: Capture the pre-migration baseline

**Files:** none created or modified — this task only records command output for comparison in Task 9.

- [ ] **Step 1: Record the current TypeScript baseline**

Run:

```bash
cd apps/mobile && pnpm exec tsc --noEmit
```

Expected: exits `0`, no output (the app currently type-checks cleanly).

- [ ] **Step 2: Record the current Jest baseline**

Run:

```bash
cd apps/mobile && pnpm exec jest
```

Expected: `Test Suites: 16 passed, 16 total`, `Tests: 35 passed, 35 total`, exit `0`. If a suite named `CelebrationOverlay` fails on `testID: celebration-lottie` on the first run, re-run once — that failure is a slow-machine timing flake in the lottie mock, not a real regression, and it passes on retry. Do not proceed until you see `16 passed, 16 total` twice in a row.

- [ ] **Step 3: Record the current `expo-doctor` baseline**

Run:

```bash
cd apps/mobile && npx expo-doctor
```

At plan-drafting time this reported `19/20 checks passed. 1 checks failed.` with the single failure:

```
✖ Check Expo config (app.json/ app.config.js) schema
Error validating fields in .../apps/mobile/app.json:
 should NOT have additional property 'newArchEnabled'.
```

This is a pre-existing false positive from the installed `expo-doctor` schema validator against a documented Expo SDK 57 config field (`newArchEnabled`) and is unrelated to this migration. Save the complete output from the command you actually run: because `npx expo-doctor` resolves the current doctor release, its aggregate count may change after this plan is written. Task 8 must reproduce the same findings as this recorded pre-migration run — no new findings and no lost checks — rather than hard-coding the drafting-time `19/20` count. Do not attempt to fix the `newArchEnabled` finding in this plan.

- [ ] **Step 4: Record the current `expo export` baseline**

Run:

```bash
cd apps/mobile && npx expo export --platform ios --output-dir .baseline-export-check
```

Expected: exits `0`, ends with `Exported: .baseline-export-check`.

Then delete the probe output (never commit build output):

```bash
cd apps/mobile && rm -rf .baseline-export-check
```

- [ ] **Step 5: Confirm nothing is staged**

Run:

```bash
git status --porcelain
```

Expected: empty (Task 1 is read-only).

---

### Task 2: Remove the nested mobile workspace root

**Files:**
- Delete: `apps/mobile/pnpm-workspace.yaml`
- Delete: `apps/mobile/pnpm-lock.yaml`
- Delete (untracked, not committed): `apps/mobile/node_modules/`, `apps/mobile/.expo/`

pnpm workspaces do not support a workspace root nested inside another workspace root. `apps/mobile/pnpm-workspace.yaml` currently makes `apps/mobile` its own workspace root with its own lockfile; both must go before the repo root can become the single workspace root. The `apps/mobile/pnpm-workspace.yaml` settings (`verifyDepsBeforeRun: false`, `onlyBuiltDependencies: [unrs-resolver]`) are not lost — they move to the root `pnpm-workspace.yaml` in Task 3.

- [ ] **Step 1: Confirm the two files that carry settings we must preserve**

Run:

```bash
cat apps/mobile/pnpm-workspace.yaml
```

Expected:

```yaml
verifyDepsBeforeRun: false
onlyBuiltDependencies:
  - unrs-resolver
```

- [ ] **Step 2: Remove the nested workspace root and lockfile from git**

Run:

```bash
git rm apps/mobile/pnpm-workspace.yaml apps/mobile/pnpm-lock.yaml
```

Expected: `rm 'apps/mobile/pnpm-workspace.yaml'` and `rm 'apps/mobile/pnpm-lock.yaml'` printed; both now staged for deletion.

- [ ] **Step 3: Remove the nested, pre-monorepo `node_modules` and Metro/Expo caches**

Run:

```bash
rm -rf apps/mobile/node_modules apps/mobile/.expo
```

Expected: no output, exit `0`. These directories are already git-ignored (`apps/mobile/.gitignore` lists `node_modules/` and `.expo/`), so `git status` does not change.

- [ ] **Step 4: Commit the removal**

```bash
git add -A
git commit -m "chore: remove nested mobile pnpm workspace root and lockfile"
```

---

### Task 3: Create the root workspace manifest files

**Files:**
- Create: `.node-version`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`

- [ ] **Step 1: Pin the Node.js version**

Create `.node-version`:

```
22.17.0
```

This matches the Node version already locked for the project (`docs/superpowers/specs/2026-07-14-m0-decision-lock.md` §7: `Node: v22.17.0`).

- [ ] **Step 2: Create the root `pnpm-workspace.yaml`**

```yaml
packages:
  - apps/*
  - packages/*
verifyDepsBeforeRun: false
onlyBuiltDependencies:
  - unrs-resolver
```

- [ ] **Step 3: Create the root `.gitignore`**

```
# dependencies
node_modules/

# turborepo
.turbo/

# build output
dist/

# environment
.env
.env.*
!.env.example
!.env.*.example

# logs
*.log

# OS
.DS_Store

# typescript
*.tsbuildinfo
```

`apps/mobile/.gitignore` keeps its own Expo/native-folder rules; git honors both nested and root `.gitignore` files simultaneously, so nothing there needs to change.

- [ ] **Step 4: Commit**

```bash
git add .node-version pnpm-workspace.yaml .gitignore
git commit -m "chore: add root pnpm workspace manifest and node version pin"
```

---

### Task 4: Create the root `package.json`

**Files:**
- Create: `package.json`

- [ ] **Step 1: Write the root package manifest**

```json
{
  "name": "littlearc",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@11.13.0",
  "engines": {
    "node": ">=22.17.0 <23.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.3",
    "turbo": "2.10.5"
  }
}
```

`typescript` is intentionally **not** a root devDependency: nothing at the repo root invokes `tsc` directly. Every package that runs `tsc` (including `apps/mobile`) declares its own `typescript` devDependency, all pinned to the same `6.0.3`, so pnpm's strict linking resolves one consistent version without a phantom root dependency.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add root package.json with turbo and biome tooling"
```

---

### Task 5: Rename the mobile package into the workspace

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Rename the package and add a `build` script**

In `apps/mobile/package.json`, change:

```json
{
  "name": "littlearc",
  "version": "1.0.0",
```

to:

```json
{
  "name": "@littlearc/mobile",
  "version": "1.0.0",
```

Then add a `"build"` script next to the existing scripts (needed so `turbo run build` has something to execute for this package, and so the bundle-leak check in `PLAT-05-06-07-api-contracts-types.md` has a reproducible export command):

```json
  "scripts": {
    "start": "expo start",
    "start:mcp": "EXPO_UNSTABLE_MCP_SERVER=1 pnpm expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "build": "expo export --platform ios --no-bytecode --no-minify",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
```

The `build` script intentionally passes `--no-bytecode --no-minify`: Hermes bytecode (the default native output) is a binary format that cannot be grepped for banned server-only identifiers, and minified output makes matches unreliable too. Plain, unminified JS text is what later plans grep for a bundle leak check. This does not change what ships to devices — device builds go through `expo run:ios` / `expo run:android`, not this `build` script.

- [ ] **Step 2: Verify no other file references the old package name**

Run:

```bash
grep -rn '"littlearc"' apps/mobile --include="*.json" -l
```

Expected: only `apps/mobile/package.json` (now showing `@littlearc/mobile`, so this actually returns nothing — confirm with):

```bash
grep -rn '"name": "littlearc"' apps/mobile
```

Expected: no output (empty).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json
git commit -m "chore: rename mobile package to @littlearc/mobile and add build script"
```

---

### Task 6: Install the workspace and verify a single lockfile

**Files:**
- Create (generated by pnpm, then committed): `pnpm-lock.yaml`

- [ ] **Step 1: Install from the repo root**

```bash
pnpm install
```

Expected: pnpm resolves both workspace projects (`littlearc` root, `@littlearc/mobile`), reinstalls `apps/mobile`'s dependencies under the workspace-hoisted layout, and writes `pnpm-lock.yaml` at the repo root. Exit `0`.

- [ ] **Step 2: Confirm there is exactly one lockfile in the whole repo**

```bash
git ls-files '**/pnpm-lock.yaml' 'pnpm-lock.yaml'
find . -name pnpm-lock.yaml -not -path '*/node_modules/*'
```

Expected: both commands list only `./pnpm-lock.yaml` (repo root). No `apps/mobile/pnpm-lock.yaml`.

- [ ] **Step 3: Confirm `apps/mobile` resolves as a workspace member**

```bash
pnpm list --filter @littlearc/mobile --depth -1
```

Expected: prints `@littlearc/mobile@1.0.0 /Users/nishanth/zealer/projects/litlearc/apps/mobile` (no "not found" error).

- [ ] **Step 4: Commit the lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: generate single root pnpm lockfile"
```

---

### Task 7: One-time Metro cache clear

**Files:** none — this is an operational step with no file diff.

Expo SDK 57's `getDefaultConfig(__dirname)` (already the baseline in `apps/mobile/metro.config.js`) auto-detects the pnpm workspace root and needs no custom `watchFolders` or resolver changes. The only migration-specific risk is a stale Metro transform cache built before the app moved into a monorepo path structure. Clear it once.

- [ ] **Step 1: Start Metro with `--clear` and confirm it boots clean**

```bash
pnpm --filter @littlearc/mobile exec expo start --clear
```

Expected (manual check — this is a long-running dev server, not a scriptable assertion): terminal shows `Starting Metro Bundler`, then a QR code and `Metro waiting on exp://...` with no red error banner about duplicate Haste module IDs or stale cache.

- [ ] **Step 2: Stop the dev server**

Press `Ctrl+C` in the terminal running the command from Step 1.

- [ ] **Step 3: Record the evidence**

No commit needed (no file changed). Note in your work log that the one-time cache clear was performed, per `docs/impl-plan/M1/README.md`'s evidence matrix for this plan.

---

### Task 8: Re-verify the post-migration baseline (parity check)

**Files:** none created or modified — this task re-runs Task 1's exact commands and diffs the result.

- [ ] **Step 1: Re-run TypeScript from the workspace root**

```bash
pnpm --filter @littlearc/mobile run typecheck
```

Expected: exits `0`, no errors — identical to Task 1 Step 1.

- [ ] **Step 2: Re-run Jest from the workspace root**

```bash
pnpm --filter @littlearc/mobile run test
```

Expected: `Test Suites: 16 passed, 16 total`, `Tests: 35 passed, 35 total` — identical to Task 1 Step 2.

- [ ] **Step 3: Re-run `expo-doctor`**

```bash
cd apps/mobile && npx expo-doctor
```

Expected: the same finding set and check coverage recorded in Task 1 Step 3 — identical, not fixed, not worsened. At drafting time this was `19/20` with only the `newArchEnabled` schema finding; compare against your recorded baseline if the current doctor release reports a different aggregate count.

- [ ] **Step 4: Re-run `expo export`**

```bash
pnpm --filter @littlearc/mobile run build
rm -rf apps/mobile/dist
```

Expected: exits `0`. `apps/mobile/dist/` is produced then removed (it is git-ignored via the root `.gitignore`'s `dist/` rule, so no `git status` change is expected either way).

- [ ] **Step 5: Confirm the tree is clean**

```bash
git status --porcelain
```

Expected: empty. If Steps 1–4 all matched Task 1's results and the tree is clean, the migration has proven zero behavior change. No commit needed for this verification-only task.

---

### Task 9: Add `packages/config` (PLAT-02 shared TypeScript configuration)

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/typescript/base.json`
- Create: `packages/config/typescript/node.json`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "@littlearc/config",
  "private": true,
  "version": "0.0.0",
  "files": [
    "typescript"
  ]
}
```

- [ ] **Step 2: Create the shared strict base**

`packages/config/typescript/base.json` holds only strictness flags that are additive on top of `expo/tsconfig.base` — it never redeclares `module`, `moduleResolution`, `jsx`, or `target`, since those are Expo's responsibility for the mobile app and each non-mobile package sets its own in `node.json` below.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 3: Create the Node/library configuration**

`packages/config/typescript/node.json` is for `apps/api` and every non-mobile package (`packages/db`, `packages/contracts`, `packages/api-types`, `packages/observability`). It extends `base.json` and adds the module/runtime settings mobile does not need.

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2023",
    "lib": ["ES2023"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

No `outDir`/`declaration`/`declarationMap` here: every package that extends this config only ever runs `tsc --noEmit` (a typecheck gate) — none of them compile to a `dist/` folder via `tsc`. This is a deliberate simplification confirmed necessary while drafting `PLAT-05-06-07-api-contracts-types.md`: a relative `outDir` declared in a *shared, extended* base config resolves relative to that base config file's own location (`packages/config/typescript/`), not relative to the package that extends it — verified empirically against the project's pinned TypeScript 6.0.3 by building a throwaway three-package monorepo reproducing this exact `extends` chain. A package that actually needs real compiled output must set `outDir` (and any other emit option) in its own `tsconfig.json`, never rely on inheriting one from this shared base.

- [ ] **Step 4: Install so the package is linked into the workspace**

```bash
pnpm install
```

Expected: exits `0`. `packages/config` has no dependencies of its own, so this mainly registers it as a workspace member.

- [ ] **Step 5: Commit**

```bash
git add packages/config pnpm-lock.yaml
git commit -m "feat: add packages/config shared TypeScript base and node configs"
```

---

### Task 10: Layer `apps/mobile/tsconfig.json` onto the shared base

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/tsconfig.json`

- [ ] **Step 1: Add the workspace dependency**

In `apps/mobile/package.json`, add `@littlearc/config` to `devDependencies` (alphabetical, matching the existing style):

```json
  "devDependencies": {
    "@littlearc/config": "workspace:*",
    "@testing-library/react-native": "^14.0.1",
    "@types/jest": "^29.5.14",
    "@types/react": "~19.2.2",
    "expo-mcp": "~0.2.4",
    "jest": "^29.7.0",
    "jest-expo": "~57.0.1",
    "typescript": "6.0.3"
  },
```

Note `typescript` moved from range `"~6.0.3"` to an exact `"6.0.3"` — the same version already installed (verified: `apps/mobile/node_modules/typescript/package.json` reports `"version": "6.0.3"` before this plan starts), now pinned exactly so every workspace package resolves identically under pnpm.

- [ ] **Step 2: Layer the shared base into the mobile tsconfig**

Replace `apps/mobile/tsconfig.json` in full:

```json
{
  "extends": ["expo/tsconfig.base", "@littlearc/config/typescript/base.json"],
  "compilerOptions": {
    "types": ["jest", "react"]
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

The inline `"strict": true` from the pre-migration file is removed here because it is now inherited from `@littlearc/config/typescript/base.json` (TypeScript's array-form `extends` merges configs in order, with later entries winning on conflicts — `base.json` only adds new flags, so nothing Expo already set is overridden).

- [ ] **Step 3: Install so the new devDependency resolves**

```bash
pnpm install
```

Expected: exits `0`.

- [ ] **Step 4: Re-run typecheck to confirm the layered config still resolves cleanly**

```bash
pnpm --filter @littlearc/mobile run typecheck
```

Expected: exits `0`, no errors — same result as Task 8 Step 1, now sourced from the shared config instead of an inline duplicate.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/tsconfig.json pnpm-lock.yaml
git commit -m "feat: layer apps/mobile tsconfig onto @littlearc/config shared base"
```

---

### Task 11: Add `turbo.json`

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Write the pipeline**

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "outputs": []
    },
    "test": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`lint` is deliberately not a Turbo task: Biome is already monorepo-aware (it walks the whole tree from the root `biome.json` in one pass), so `pnpm lint` calls `biome check .` directly from the root `package.json` (Task 4) instead of fanning out per package through Turbo.

- [ ] **Step 2: Run the typecheck pipeline through Turbo**

```bash
pnpm typecheck
```

Expected: Turbo runs `@littlearc/mobile`'s `typecheck` script (the only package with one so far), reports `1 successful, 1 total`, exits `0`.

- [ ] **Step 3: Run the test pipeline through Turbo**

```bash
pnpm test
```

Expected: Turbo runs `@littlearc/mobile`'s `test` script, reports `Test Suites: 16 passed, 16 total`, `1 successful, 1 total` for the Turbo task summary, exits `0`.

- [ ] **Step 4: Commit**

```bash
git add turbo.json
git commit -m "chore: add turbo.json task pipeline"
```

---

### Task 12: Add root `biome.json` and confirm it fails red on the untouched app

**Files:**
- Create: `biome.json`

This step is expected to fail (red) on its own — the existing, hand-formatted mobile app has never been run through Biome, so the very first check surfaces real, pre-existing formatting drift and two intentional-but-flaggable app patterns. Task 13 turns it green.

- [ ] **Step 1: Write the root Biome configuration**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.3/schema.json",
  "root": true,
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  },
  "overrides": [
    {
      "includes": ["**/*.test.ts", "**/*.test.tsx", "**/jest.setup.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          }
        }
      }
    }
  ]
}
```

The `overrides` entry turns off `noExplicitAny` only for test files and `jest.setup.ts`, where the existing hand-rolled `react-native-unistyles` mock and a few React Native Testing Library test doubles intentionally use permissive `any` (verified: every current `any` usage in the codebase is inside `jest.setup.ts` or a `*.test.tsx` file). Production `src/` and `app/` code keeps `noExplicitAny` active.

- [ ] **Step 2: Run the check and confirm it fails red with the expected, pre-existing findings**

```bash
pnpm lint
```

Expected: **non-zero exit**. At plan-drafting time Biome reported `89` total findings, but that aggregate can change if the mobile tree changes before execution; the load-bearing expectation is that the only non-formatting, non-import-sort findings requiring a manual fix are:

```
apps/mobile/src/components/shell/CelebrationOverlay.tsx:43:3 lint/correctness/useExhaustiveDependencies
apps/mobile/src/components/shell/EmergencyCard.tsx:57:37 lint/suspicious/noArrayIndexKey
```

Everything else in the 89 is Biome's formatter (quote style, semicolons) and `assist/source/organizeImports` disagreeing with code that predates any formatter — all auto-fixable.

- [ ] **Step 3: Commit the config only (the app is still red — that is expected and correct for this step)**

```bash
git add biome.json
git commit -m "chore: add root biome.json (app not yet reformatted)"
```

---

### Task 13: Reformat the mobile app to match Biome and turn the gate green

**Files:**
- Modify: every file Biome's `--write` touches under `apps/mobile` (formatting and import-order only — see Step 1's fixed-file count)
- Modify: `apps/mobile/src/components/shell/CelebrationOverlay.tsx` (one suppression comment)
- Modify: `apps/mobile/src/components/shell/EmergencyCard.tsx` (one suppression comment)

This is a dedicated, mechanical, formatting-only commit — it changes no runtime behavior. Reviewing it separately from any future functional change is the point of doing it now, in its own task.

- [ ] **Step 1: Auto-fix everything Biome can fix safely**

```bash
biome check --write .
```

Expected: Biome reports that it checked/fixed the current mobile files (the exact file count and timing may differ) and ends with exactly `Found 2 errors.` — the same two non-fixable findings from Task 12 Step 2, now at their post-format line numbers:

```
apps/mobile/src/components/shell/CelebrationOverlay.tsx:43:3 lint/correctness/useExhaustiveDependencies
apps/mobile/src/components/shell/EmergencyCard.tsx:89:37 lint/suspicious/noArrayIndexKey
```

- [ ] **Step 2: Suppress the `useExhaustiveDependencies` finding with a documented reason**

In `apps/mobile/src/components/shell/CelebrationOverlay.tsx`, the effect at line 43 reads `onDone` inside a `setTimeout` closure but intentionally omits it from the dependency array (adding it would restart the completion timer whenever the parent re-renders with a new inline callback identity, which is undesirable here). Add a suppression comment directly above the effect:

```tsx
  // biome-ignore lint/correctness/useExhaustiveDependencies: onDone is read inside the reduced-motion timeout by design; adding it as a dependency would restart the timer whenever the parent passes a new inline callback identity.
  useEffect(() => {
    if (!visible) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    if (reduce) {
      const t = setTimeout(() => onDone?.(), 1800)
      return () => clearTimeout(t)
    }
  }, [visible, reduce])
```

- [ ] **Step 3: Suppress the `noArrayIndexKey` finding with a documented reason**

In `apps/mobile/src/components/shell/EmergencyCard.tsx`, the contact list key combines the loop index with `ct.phone` specifically because two contacts (e.g. two grandparents sharing a landline) can have the same phone number; the index disambiguates that case. Add a suppression comment directly above the `<View key=...>` line (now at line 89 after Step 1's reformat):

```tsx
        {[paediatrician, ...contacts].map((ct, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: contacts can share the same phone number, so the loop index disambiguates otherwise-identical keys.
          <View key={`${ct.phone}-${i}`} style={styles.contactRow}>
```

- [ ] **Step 4: Re-run the check and confirm it is green**

```bash
pnpm lint
```

Expected: no fixes applied, `Found 0 errors.` (or an equivalent all-clear summary), exit `0`; exact checked-file count and timing may differ.

- [ ] **Step 5: Re-run typecheck and tests to confirm formatting-only changes did not alter behavior**

```bash
pnpm --filter @littlearc/mobile run typecheck
pnpm --filter @littlearc/mobile run test
```

Expected: identical results to Task 8 Steps 1–2 (`0` typecheck errors; `16 passed, 16 total` suites, `35 passed, 35 total` tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "style: reformat apps/mobile to match biome.json and suppress two documented findings"
```

---

### Task 14: Final workspace-level verification

**Files:** none — full-workspace confirmation before handing off to `PLAT-03-database-local-stack.md`.

- [ ] **Step 1: Frozen-lockfile install (the exact check CI will run in `PLAT-04-OBS-02-ci-observability.md`)**

```bash
pnpm install --frozen-lockfile
```

Expected: exits `0` with no lockfile changes reported.

- [ ] **Step 2: Full lint**

```bash
pnpm lint
```

Expected: exit `0`.

- [ ] **Step 3: Full typecheck**

```bash
pnpm typecheck
```

Expected: exit `0`.

- [ ] **Step 4: Full test**

```bash
pnpm test
```

Expected: exit `0`, `16 passed, 16 total` suites.

- [ ] **Step 5: Full build**

```bash
pnpm build
rm -rf apps/mobile/dist
```

Expected: exit `0`.

- [ ] **Step 6: Confirm git is clean**

```bash
git status --porcelain
```

Expected: empty.

---

## Evidence required before advancing to `PLAT-03-database-local-stack.md`

- [ ] Exactly one `pnpm-lock.yaml` exists in the repository, at the root (Task 6).
- [ ] `apps/mobile` is a workspace member named `@littlearc/mobile` (Task 5).
- [ ] `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all exit `0` from the repo root (Task 14).
- [ ] The mobile Jest suite matches its pre-migration baseline exactly: `16 passed, 16 total` (Task 1 vs. Task 8/13).
- [ ] `expo-doctor` matches the pre-migration finding set and check coverage recorded in Task 1, with no new findings (Task 1 vs. Task 8).
- [ ] The one-time Metro cache clear was performed and logged (Task 7).
- [ ] `apps/mobile/tsconfig.json` extends both `expo/tsconfig.base` and `@littlearc/config/typescript/base.json`, with no duplicated `strict` option (Task 10).
- [ ] The Biome reformat commit (Task 13) contains no logic changes — confirm with `git show --stat <that-commit-sha>` and spot-check that only formatting, import order, and the two documented suppression comments changed.
