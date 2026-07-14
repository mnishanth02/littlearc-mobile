# LittleArc Mobile Design System

**Status:** Design baseline for MVP implementation
**Last reviewed:** 2026-07-14
**Product scope:** [LittleArc Product Plan](./plan.md)
**Architecture:** [LittleArc Mobile Architecture](./architecture.md)

---

## 1. Executive Summary

This document defines the visual and interaction design system for the LittleArc mobile app. It is the single source of truth for the styling engine, theme tokens, typography, colour, iconography, motion, component behaviour, navigation, and accessibility.

LittleArc is used by parents (and, later, the children themselves) to hold the most precious and the most urgent parts of a child's life — memories on one side, health and emergency records on the other. The design must therefore be **two things at once**: emotionally warm and delightful, yet calm, trustworthy, and instantly legible under stress.

The chosen personality is **"Modern Storybook"**: a warm off-white canvas, a friendly violet as the hero colour, gentle per-module accents (coral, mint, sun, blue), soft rounded surfaces, and one warm rounded display typeface for emotional moments over a crisp modern workhorse for the interface. It is playful and human **without being childish**, and never clinical or corporate.

Key decisions locked in this document:

- **Styling engine:** Unistyles v3 + a hand-built custom component library.
- **Theme:** Full light **and** dark from day one, driven by design tokens.
- **Typography:** Hanken Grotesk (UI) + Baloo 2 (display / emotional / Devanagari) + Noto Sans Devanagari (Hindi body).
- **Colour:** Violet-led brand ramp with five module accents; status is always communicated as colour **plus** icon **plus** label.
- **Icons:** Phosphor, rendered through `react-native-svg`.
- **Motion:** Reanimated v4 for micro-interactions; Lottie for celebratory moments only.
- **Accessibility target:** WCAG 2.1 AA.

---

## 2. Design Principles

| # | Principle | What it means in practice |
| --- | --- | --- |
| 1 | **Warm, not childish** | Rounded shapes, friendly display type, soft colour. No primary-crayon palette, no cartoon mascots, no comic fonts. A parent should feel proud to open it in public. |
| 2 | **Calm under pressure** | The emergency card, health status, and reminders must be readable in one glance, offline, with zero decoration getting in the way. Clarity beats delight whenever they conflict. |
| 3 | **One clear action per screen** | Each screen has a single obvious primary action (violet). Everything else is quieter. Reduce the parent's mental load. |
| 4 | **Colour as gentle accent** | Colour guides and categorises; it never carries meaning alone. Neutral canvas, accents used sparingly. |
| 5 | **Trust is visual** | Generous spacing, soft edges, careful typography, and restraint communicate "your child's data is safe here." |
| 6 | **Delight in the right beats** | Celebrations (first steps, a completed capsule) earn a Lottie moment and haptics. Routine actions stay fast and quiet. |
| 7 | **Bilingual by design** | English and हिन्दी are first-class. Type, spacing, and components must not break when the script or text length changes. |
| 8 | **Accessible by default** | AA contrast, ≥44pt targets, dynamic type, colour-blind-safe status, reduced-motion support — designed in, not retrofitted. |

---

## 3. Technology Decisions

| Area | Decision | Notes |
| --- | --- | --- |
| Styling engine | **Unistyles v3** (`react-native-unistyles`) | C++/Shadow-Tree theming with near-zero re-renders; type-safe TS tokens; full custom brand. Requires New Architecture (already mandated). |
| Component library | **Custom, hand-built** on top of Unistyles | No third-party UI kit. Gives us the exact "Modern Storybook" identity and avoids Material/Design-kit lock-in. |
| Animation | **Reanimated v4** (+ `react-native-worklets`) | UI-thread micro-interactions, spring transitions, the new CSS-style animation API. |
| Gestures | **`react-native-gesture-handler`** | Swipe, long-press, drag on cards and sheets. |
| Haptics | **`expo-haptics`** | Tied to key confirmations and celebrations. |
| Icons | **Phosphor** via **`react-native-svg`** | Warm, rounded, six weights. `lucide-react-native` is the approved fallback if a glyph is missing. |
| Fonts | **`expo-font`** config plugin, **static weights** | Variable fonts are not used in RN. Fonts embedded at build time. |
| Lists | **FlashList v2** | Timeline and long lists. |
| Images | **`expo-image`** | Caching, blurhash placeholders, memory efficiency. |
| Celebrations | **`lottie-react-native`** | Reserved for milestone/celebration moments only, to control bundle size. |
| Bottom sheets | **`@gorhom/bottom-sheet`** | Capture flow, pickers, contextual actions. |
| Deferred | **Skia** | Not in MVP; revisit only if we need custom canvas rendering. |

**Environment (verify exact versions at bootstrap):** Expo SDK 55+, React Native 0.83+, React 19, Hermes, **New Architecture mandatory**. These match the architecture baseline; pin exact versions in `package.json` when the project is scaffolded.

### 3.1 Why Unistyles over NativeWind

Both are viable. We chose Unistyles deliberately:

- **Performance:** theme and breakpoint changes update through the Shadow Tree in C++, avoiding React re-renders — valuable for a media-heavy timeline and instant light/dark switching.
- **Type safety:** tokens are plain TypeScript, so the theme is fully autocompleted and refactor-safe.
- **Full brand control:** no framework opinions to fight; the custom component library expresses exactly the identity in this document.
- **Trade-off accepted:** Unistyles is effectively a single-maintainer project, and `StyleSheet.configure` has had Android edge cases. We pin the version, verify on-device early, and treat NativeWind v5 as the fallback if either becomes blocking (see §13).

---

## 4. Theming Architecture

The theme is the contract every component depends on. Nothing hard-codes a hex value; components consume semantic tokens.

### 4.1 Token layers

1. **Primitive ramps** — raw brand scales (violet 50–900, coral, mint, sun, blue, neutrals). Never used directly by components.
2. **Semantic tokens** — meaning-based aliases that map to primitives per theme: `bg`, `surface`, `surfaceAlt`, `border`, `textPrimary`, `textSecondary`, `textMuted`, `primary`, `onPrimary`, `success`, `warning`, `danger`, `info`, plus module accents.
3. **Component tokens** — where useful, component-scoped values (e.g. `button.primary.bg`) that resolve to semantic tokens.

### 4.2 Light and dark

Both themes ship from day one and are defined as two token maps with identical shape. The app follows the OS setting by default (adaptive themes) with a manual override in Settings. Because tokens are swapped in the Shadow Tree, switching is instant and does not re-render the tree.

### 4.3 Structure (proposed)

```text
apps/mobile/src/theme/
├── tokens/
│   ├── palette.ts        # primitive ramps (raw hex)
│   ├── light.ts          # semantic map → primitives
│   ├── dark.ts           # semantic map → primitives
│   ├── typography.ts     # families, scale, weights
│   ├── spacing.ts        # 4-pt scale, radii
│   ├── elevation.ts      # shadows (light) / border strategy (dark)
│   └── motion.ts         # durations, easings, springs
├── breakpoints.ts
└── unistyles.ts          # StyleSheet.configure() registration
```

---

## 5. Colour System

**Accessibility rule (non-negotiable):** meaning is never carried by colour alone. Every status is **colour + icon + label**. Target contrast is WCAG AA (≥4.5:1 body text, ≥3:1 large text and UI).

### 5.1 Brand ramps (primitives)

| Role | Base hex | Notes |
| --- | --- | --- |
| Violet (primary) | `#7C5CF0` | Hero. Darker steps `#6A47DB` (600), `#5533B0` (700) for text-on-light and pressed states. |
| Coral | `#FF7355` | Warmth, memories, milestones. |
| Mint | `#16BE99` | Growth, activities, success. |
| Sun | `#F5A623` | Family, warnings, "due soon". |
| Blue | `#2E93DE` | Vault, documents, info. |

### 5.2 Module accents

Each of the five tabs owns one accent, applied to its active tab, section headers, and category tags.

| Module | Accent |
| --- | --- |
| Today | Violet `#7C5CF0` |
| Timeline | Coral `#FF7355` |
| Vault | Blue `#2E93DE` |
| Activities | Mint `#16BE99` |
| Family | Sun `#F5A623` |

### 5.3 Functional colours

| Meaning | Colour |
| --- | --- |
| Success | `#16BE99` |
| Warning / due soon | `#F5A623` |
| Danger / destructive / emergency | `#E5484D` |
| Info | `#2E93DE` |

Danger red is reserved for destructive actions and the emergency surface only — never for decoration.

### 5.4 Light neutrals

| Token | Hex |
| --- | --- |
| `bg` | `#FBF8F3` (warm off-white) |
| `surface` | `#FFFFFF` |
| `surfaceAlt` | `#F4EFE7` |
| `border` | `#EAE3D7` |
| `textPrimary` | `#241F31` |
| `textSecondary` | `#5B5568` |
| `textMuted` | `#8E8799` |

### 5.5 Dark neutrals

| Token | Hex |
| --- | --- |
| `bg` | `#131019` |
| `surface` | `#1C1826` |
| `surfaceAlt` | `#241F30` |
| `border` | `#322B42` |
| `textPrimary` | `#F4F1FA` |
| `textSecondary` | `#C2BBD4` |
| `textMuted` | `#8B8399` |
| `primary` (links/active) | `#B09BFF` (lightened violet for contrast) |
| `danger` | `#FF6B6E` (lightened for contrast) |

On dark, accents are used at slightly higher lightness and lower saturation so they sit comfortably on the deep aubergine background. Elevation is expressed with surface lightness and borders rather than shadows.

---

## 6. Typography

Two voices, one system, plus a dedicated Hindi body face.

| Role | Family | Usage | Weights |
| --- | --- | --- | --- |
| **Display / emotional** | **Baloo 2** | Greetings, memory titles, celebration moments, big warm headers. Also renders Devanagari. | 500, 600, 700 |
| **UI / body / working** | **Hanken Grotesk** | Every button, label, list, form, and paragraph of interface text. | 400, 500, 600, 700, 800 |
| **Hindi body** | **Noto Sans Devanagari** | Hindi body copy paired with the interface font. | 400, 500, 600, 700 |

All three are open-source (SIL Open Font License) and shipped as **static weights** via the `expo-font` config plugin. Variable fonts are not used in React Native.

### 6.1 Type scale

| Style | Family | Size / line | Weight |
| --- | --- | --- | --- |
| Display | Baloo 2 | 34 / 40 | 700 |
| H1 | Hanken Grotesk | 24 / 30 | 800 |
| H2 | Hanken Grotesk | 20 / 26 | 700 |
| H3 | Hanken Grotesk | 17 / 24 | 600 |
| Body | Hanken Grotesk | 16 / 24 | 400 |
| Body-emphasis | Hanken Grotesk | 16 / 24 | 600 |
| Caption | Hanken Grotesk | 13 / 18 | 500 |
| Label / overline | Hanken Grotesk | 12 / 16 | 800, uppercase, +0.12em tracking |

### 6.2 Rules

- **Emotional headers** (greeting, memory titles, celebrations) use Baloo 2. Everything structural and functional uses Hanken Grotesk.
- Support Dynamic Type / OS font scaling on body and UI text. **Cap** the multiplier at ~1.3× on decorative display text so large accessibility sizes never break layouts.
- In mixed English/Hindi UI, the interface font and Noto Sans Devanagari share a baseline; Baloo 2 covers Devanagari for headers so emotional beats feel consistent across scripts.

---

## 7. Spacing, Radius & Elevation

### 7.1 Spacing — 4-pt scale

`2, 4, 8, 12, 16, 20, 24, 32, 40, 48`. Default screen padding is 16–20. Card padding is 16–22. Generous whitespace is part of the "trust" principle.

### 7.2 Radius

| Token | Value | Use |
| --- | --- | --- |
| `sm` | 8 | Chips, small controls, inline tags |
| `md` | 14 | Inputs, icon buttons, list tiles |
| `lg` | 20 | Cards, sheets, panels |
| `xl` | 28 | Hero cards, modals |
| `pill` | 999 | Buttons, filter chips, avatars |

Generous "storybook" radii are a core identity signal — nothing sharp-cornered.

### 7.3 Elevation

- **Light:** soft, warm-tinted shadows in three steps (`sm`, `md`, `lg`), e.g. `0 8px 20px -10px rgba(90,60,40,.4)`. Warm tint (not neutral grey) keeps shadows on-brand.
- **Dark:** shadows are largely invisible; elevation is conveyed by lighter `surface`/`surfaceAlt` steps and `border`.

---

## 8. Iconography

- **Library:** Phosphor, rendered through `react-native-svg`. Fallback: `lucide-react-native` for any missing glyph.
- **Weights:** `regular` for inactive navigation and general UI; `fill` for the active tab, status chips, and emphasis; `bold` for a few structural accents.
- **Sizing:** 20 (inline/label), 22–24 (buttons, list leading icons), 26+ (tab bar, feature headers). Icons inherit the current text/token colour.
- **Consistency:** one family across the app; never mix icon sets within a screen.

---

## 9. Motion & Animation

Motion is subtle and purposeful — it confirms, orients, and occasionally celebrates. It never blocks or shows off.

| Category | Duration | Easing / model |
| --- | --- | --- |
| Micro-feedback (press, toggle) | 80–140 ms | Spring or ease-out |
| Standard transitions (expand, fade, slide) | 180–260 ms | Spring (gentle) |
| Screen / sheet transitions | 240–340 ms | Spring |
| Celebrations (milestone, capsule unlock) | 800–1200 ms | Lottie + haptics |

**Principles**

- Built with **Reanimated v4** on the UI thread; celebrations use **Lottie**, reserved for genuine milestone moments.
- **Haptics:** light tap on primary confirmations; success notification haptic on celebrations. Never on routine scrolling.
- **Respect `AccessibilityInfo.isReduceMotionEnabled`** — replace movement with simple cross-fades and skip celebratory animations when reduce-motion is on.

---

## 10. Component Inventory

The custom library lives in `apps/mobile/src/components/ui/`. Feature-specific compositions live under `apps/mobile/src/features/*`.

### 10.1 Core primitives

| Component | Variants / states | Notes |
| --- | --- | --- |
| `Button` | primary, secondary, ghost, danger; sizes sm/md/lg; states rest/pressed/disabled/loading | Pill radius. Primary = violet + soft glow. Icon-leading optional. |
| `IconButton` | default, tinted, danger | 44pt min target, `md` radius. |
| `FAB` | capture (`+`) | Violet, `xl` radius, elevated; opens capture sheet. |
| `TextField` | rest, focus, error, disabled; with label + helper/error text | 1.5px border; focus = violet border + soft ring. |
| `SearchField` | rest, active | Leading magnifier icon. |
| `Chip` | filter (selectable on/off) | Pill; selected = violet tint + border. |
| `Tag` | five module accents | Uppercase micro-label + fill icon. |
| `StatusChip` | success, due-soon, overdue, info | **colour + icon + label** always. |
| `Card` | base, memory, media | `lg`/`xl` radius, soft shadow (light) / border (dark). |
| `ListRow` | leading icon, title, subtitle, trailing (status or chevron) | Vault/health rows; ≥44pt height. |
| `InfoCard` | default (violet tint) | "Next up" nudges, tips. |
| `Avatar` | child, family member; sizes | Gradient fallback with initial. |
| `Sheet` | via `@gorhom/bottom-sheet` | Capture, pickers, contextual actions. |

### 10.2 Signature composites

| Component | Description |
| --- | --- |
| `AppHeader` | Child switcher (avatar + name + caret), emergency quick-view button, settings. Persistent across tabs. |
| `TabBar` | Five tabs; active tab wears its module accent with a `fill` icon and label; inactive = muted `regular`. |
| `EmergencyCard` | Distinct red-topped card: blood group, allergies, paediatrician, emergency contacts. Reachable in 2 taps, works fully offline. |
| `MemoryCard` | Timeline entry: media, module tag, Baloo 2 title, body, author + timestamp. |
| `CelebrationOverlay` | Lottie + haptics for milestone moments; respects reduce-motion. |

### 10.3 Component contract

Every component: consumes theme tokens (no literals), exposes a small typed prop surface, defines all interactive states, meets the ≥44pt target where tappable, and is understandable and testable in isolation.

---

## 11. Navigation & Information Architecture

Navigation follows the architecture baseline (Expo Router, five bottom tabs) and dresses it in the design system.

### 11.1 Bottom tabs

`Today · Timeline · Vault · Activities · Family` — each owning its accent (violet / coral / blue / mint / sun). The active tab shows a filled Phosphor icon + label in its accent; inactive tabs are muted.

### 11.2 Header

Persistent `AppHeader` with:

- **Child switcher** (left): avatar + child name + caret → switch between children.
- **Emergency** (right): one tap to the offline emergency quick-view.
- **Settings** (right): profile, theme override, privacy, biometric lock.

### 11.3 Capture

A central capture affordance (FAB / capture entry) opens a bottom sheet for photo, document scan, or milestone — the fast path to adding to the timeline and vault.

### 11.4 Route mapping (from architecture §7.1)

`(auth)` · `onboarding` · `(tabs)` [today, timeline, vault, activities, family] · `capture` · `emergency` · `settings`. The design system provides the shared shell (header, tab bar, theme) that all routes render inside.

---

## 12. Accessibility

- **Contrast:** WCAG 2.1 AA across both themes; verify every token pair, especially accents on tinted backgrounds and dark-mode links/danger.
- **Targets:** all interactive elements ≥44×44pt.
- **Dynamic type:** body and UI scale with the OS; display text capped ~1.3×.
- **Colour independence:** status = colour + icon + label; never colour alone (protanopia/deuteranopia safe).
- **Screen readers:** meaningful `accessibilityLabel`/`accessibilityRole` on all controls; images and media carry labels; the emergency card is fully narratable.
- **Focus & states:** visible focus/pressed states on every interactive component.
- **Reduce motion:** honour the OS setting; degrade animation to cross-fades and skip celebrations.

---

## 13. Voice & Tone

- **Warm, encouraging, plain.** "MMR dose is due in 6 days" — clear, never alarming. Celebrate wins: "First steps! 🎉".
- **Never clinical or corporate.** Avoid jargon and cold system language.
- **Bilingual.** Copy is written to work in English and हिन्दी; keep sentences short so both scripts fit the same components.
- **Respectful of stress.** Emergency and health copy is direct, calm, and unambiguous.

---

## 14. Risks & Open Questions

| # | Risk / question | Mitigation |
| --- | --- | --- |
| 1 | Unistyles is effectively single-maintainer (bus factor). | Pin the version; monitor releases; NativeWind v5 + custom components is the documented fallback. |
| 2 | Unistyles Android `StyleSheet.configure` edge cases reported. | Verify on a physical Android device in M0 before building components. |
| 3 | Baloo 2 Devanagari glyph coverage/quality. | Validate real Hindi strings on-device; if insufficient, use Noto Sans Devanagari (or a Baloo variant) for Hindi headers too. |
| 4 | NativeWind v5 / Gluestack promotion to stable could change the trade-off. | Re-evaluate at each SDK bump; decision is reversible because components are custom. |
| 5 | Lottie bundle size. | Restrict Lottie strictly to celebration moments; lazy-load animations. |
| 6 | Font licensing. | All three faces are SIL OFL; keep license files with embedded fonts. |
| 7 | Exact Expo SDK / RN versions at bootstrap. | Pin when scaffolding; New Architecture is required regardless. |

---

## 15. Implementation Notes

- Build the **theme layer first** (tokens, light/dark, `StyleSheet.configure`), verified on iOS and Android, before any component work.
- Then build **core primitives** (Button, TextField, Card, Chip, StatusChip, ListRow), then **signature composites** (AppHeader, TabBar, EmergencyCard, MemoryCard).
- Wire the **navigation shell** (tabs + header + theme provider) so feature teams build inside a consistent frame.
- Treat this document as the source of truth; changes to tokens or component contracts are made here first, then in code.

---
