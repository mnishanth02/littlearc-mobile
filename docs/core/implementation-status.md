<!--
================================================================================
 LittleArc — Implementation Status Tracker
 THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR "WHAT IS DONE / IN PROGRESS / NEXT".
 Every agent and human MUST read it before starting roadmap work and update it
 immediately when work starts, completes, blocks, or is deferred.
================================================================================
-->

# LittleArc — Implementation Status

> Live progress tracker for the MVP roadmap (`docs/core/implementation-roadmap.md`).
> Each row is a roadmap **work package (WP)**. This file mirrors roadmap §8 and §10.

**Last updated:** 2026-07-14 · **Active branch:** `development`

---

## How to use this file (update protocol)

**Read this before touching any roadmap work.** Keep it in sync — an out-of-date tracker is worse than none.

1. **Before you start a WP:** write its detailed implementation plan under `docs/impl-plan/<MILESTONE>/<WP-ID>-<slug>.md` (via `superpowers:writing-plans`; see `docs/impl-plan/README.md`). Then set its status here to `◐ In progress`, and in the Note put the date + branch (e.g. `2026-07-14 · development`). Add it to **Current focus** below. Add a **Changelog** line.
2. **When a WP is done:** set it to `✅ Done`, put the commit SHA in the Note, remove it from **Current focus**, add a **Changelog** line, and update the milestone summary count.
3. **If a WP is blocked:** set `⛔ Blocked` and write the one-line reason + what unblocks it in the Note.
4. **If a WP is intentionally not being done now:** set `⏸ Deferred` and write the trigger (when it becomes needed) in the Note.
5. **Never mark a WP `✅` without evidence** (commit, green CI, or a recorded test) — see roadmap §19 Definition of Done.
6. **Milestone status** flips to done only when its exit gate (roadmap §8) is met. A milestone can be **lean-complete** (all *active* WPs done, remainder explicitly deferred) — note this on its heading.
7. Always bump **Last updated** at the top and the milestone summary.

**Status legend:** `☐ Not started` · `◐ In progress` · `✅ Done` · `⏸ Deferred` · `⛔ Blocked`

---

## Current focus

_Nothing actively in progress. Next up: **M1 — Platform bootstrap & vertical slice** (needs its own implementation plan first)._

---

## Milestone summary

| Milestone | State | Progress (active WPs) |
|---|---|---|
| Design System (Phases 0–4) | ✅ Done | 5 / 5 |
| **M0** — Decisions / provisioning / threat groundwork | ✅ Lean-complete | 3 / 3 done · 5 deferred |
| **M1** — Platform bootstrap + vertical slice | ☐ Not started | 0 / 12 |
| **M2** — Native feasibility + auth/org/RLS | ☐ Not started | 0 / 19 |
| **M3** — Wedge (vault / smart capture / health / timeline / reminders) | ☐ Not started | 0 / 23 |
| **M4** — Family coordination | ☐ Not started | 0 / 5 |
| **M5** — Memories & activities | ☐ Not started | 0 / 5 |
| **M6** — Privacy / release hardening / beta | ☐ Not started | 0 / 14 |

---

## Design System track (Phases 0–4) — outside the WP spine, built ahead of schedule

| Phase | Deliverable | Status | Note |
|---|---|---|---|
| DS-P0 | Expo toolchain bootstrap (SDK 57, New Arch, TS strict) | ✅ Done | Built, verified, pushed |
| DS-P1 | Theme foundation (tokens, colours, typography, Unistyles) | ✅ Done | Pushed |
| DS-P2 | Component library | ✅ Done | Pushed |
| DS-P3 | Signature composites | ✅ Done | Pushed |
| DS-P4 | Navigation shell + routes | ✅ Done | tsc=0, tests pass, `expo export` ok; safe-area hardened; pushed |

---

## M0 — Kickoff, Decisions, Provisioning, Threat/Privacy Groundwork  ·  ✅ Lean-complete

Scope decided **Lean M0** (solo/bootstrapped): lock reversible decisions + produce agent-makeable docs now; defer all paid/legal/DPA provisioning to its trigger. See `docs/superpowers/specs/2026-07-14-m0-decision-lock.md`.

| WP | Deliverable | Status | Note |
|---|---|---|---|
| PLAT-00 | Tooling version snapshot | ✅ Done | Captured in decision lock §7 (Node 22.17, Expo ~57.0.4, RN 0.86) — commit `293f730` |
| OBS-01 | Threat-model + privacy-impact draft | ✅ Done | Solo-scaled draft in decision lock §8 — commit `293f730`. Refines in M2/M6 |
| DEC-ALL | Decision Register resolved, zero open P0 | ✅ Done | Resolved in decision lock §5 — commit `293f730` |
| REL-01 | Apple Developer enrollment + App IDs + capabilities | ⏸ Deferred | Trigger: M2 (Apple Sign-in) or first TestFlight. $99/yr |
| REL-02 | Google Play Console + Firebase FCM | ⏸ Deferred | Trigger: first Android beta. $25 once |
| REL-03 | AI provider selection + DPA (DEC-05) | ⏸ Deferred | On-device-first + provider-neutral; revisit only if cloud path enabled (M3) |
| REL-04 | India DPDP legal counsel engagement | ⏸ Deferred | Trigger: before public beta (M6). Self-educate now |
| REL-05 | Domain / DNS (`littlearc.app`, `links.littlearc.app`) | ⏸ Deferred | Identifiers locked; register at deep-link testing / launch (~$12/yr) |

**Exit gate (lean):** ✅ met — reversible decisions locked, zero open P0, PLAT-00 + threat draft written, deferred provisioning has documented triggers.

---

## M1 — Workspace/Platform Bootstrap and One-Call Vertical Slice  ·  ☐ Not started

Prereq: PLAT-00 (✅). **Needs an implementation plan before execution.**

| WP | Deliverable | Status | Note |
|---|---|---|---|
| PLAT-01 | pnpm workspace + Turborepo + Biome scaffold | ☐ | |
| PLAT-02 | Shared TypeScript/Biome config package (`packages/config`) | ☐ | |
| PLAT-03 | Docker Compose local stack (postgres, minio, mailpit, clamav) | ☐ | |
| PLAT-04 | CI pipeline baseline (`.github/workflows/ci.yml`) | ☐ | |
| PLAT-05 | `apps/api` skeleton: Fastify + tRPC + health + rate-limit framework | ☐ | |
| PLAT-06 | `packages/contracts` skeleton (Zod conventions, base enums) | ☐ | |
| PLAT-07 | `packages/api-types` type-only AppRouter export | ☐ | |
| PLAT-08 | One-call vertical slice (Expo → tRPC → Fastify → Postgres) | ☐ | |
| MOB-01 | Expo Router app skeleton bootstrap (New Arch confirmed) | ☐ | Note: design-system app already exists; reconcile with `app.config.ts` |
| OBS-02 | `packages/observability` skeleton (allowlist + redaction stubs) | ☐ | |
| PLAT-09 | `tooling/scripts` skeleton (`backup.sh`, `restore-drill.sh`, seeds) | ☐ | |
| PLAT-10 | Staging deploy: Railway (Singapore) + staging PG + R2 staging bucket | ☐ | Depends on PLAT-05/PLAT-08 |

**Exit gate:** CI green (install/lint/typecheck/build); healthy `docker compose up`; vertical slice returns real PG data via tRPC on iOS + Android; Fastify/tRPC compat smoke test; `start:all` deployed to Railway staging with public `/health/ready` + mobile call passing.

---

## M2 — Native Feasibility + Auth/Org/RLS Foundation  ·  ☐ Not started

Prereq: M1 exit. **Highest-risk, must-pass-before-feature-work gate.**

| WP | Deliverable | Status | Note |
|---|---|---|---|
| MOB-02 | Document-capture native spike (VisionKit / ML Kit) | ☐ | Physical-device matrix |
| MOB-03 | Share-intake native spike (iOS Share Ext + Android intents) | ☐ | |
| MOB-04 | Biometric lock spike (local-auth + encrypted MMKV) | ☐ | |
| MOB-05 | Android 16 KB page-size alignment check (in CI) | ☐ | Re-runs at every native-dep milestone |
| MOB-06 | `expo prebuild --clean` reproducibility lane | ☐ | |
| MOB-07 | Shared OS-permission rationale flow (camera/photos/notifications) | ☐ | |
| AUTH-01 | better-auth server integration (email/password + verification) | ☐ | |
| AUTH-02 | Google sign-in (better-auth browser OAuth) | ☐ | |
| AUTH-03 | Apple native Sign-In + ID-token verification | ☐ | Gated on REL-01 |
| AUTH-04 | Organization plugin + static roles (owner/parent/grandparent/guardian) | ☐ | |
| AUTH-05 | Invitation flow + HTTPS mobile-link gateway (`/links/*`) | ☐ | |
| DATA-01 | Drizzle schema baseline (auth + children/child_access/consents + household_plans) | ☐ | |
| DATA-02 | Forced RLS policies + parameter-safe tenant-transaction wrapper | ☐ | |
| DATA-03 | Automated tenant-isolation fail-closed test suite | ☐ | CI cross-tenant matrix |
| DATA-04 | Runtime DB role least-privilege verification | ☐ | Before any M3 tenant data work |
| DATA-05 | pg-boss schema migration sequencing (DEC-06) | ☐ | Upgrades PLAT-10 pre-deploy |
| MEM-01 | Curated Screen-Free Activity catalog (schema, seed, CRUD/filter) | ☐ | Low-risk parallel filler; needs AUTH-04 |
| REL-06 | Store/legal provisioning continuation (TestFlight/Play tracks, APNs/FCM keys) | ⏸ Deferred | Follows REL-01/02 when those trigger |
| OBS-07 | First encrypted backup + restore drill (isolated staging clone) | ☐ | Tail of M2 |

_OBS-01 refinement continues here (threat model)._

**Exit gate:** native deps pass physical-device matrix on pinned SDK; RLS fails closed in CI; `expo prebuild --clean` reproducible; email/Google/Apple sign-in end-to-end in staging; MOB-07 in place; OBS-07 drill succeeded.

---

## M3 — Wedge: Profile / Emergency / Vault / Upload / Smart Capture / Health / Timeline / Search / Reminders  ·  ☐ Not started

Prereq: M2 exit. **Largest milestone — the differentiating surface.**

| WP | Deliverable | Status | Note |
|---|---|---|---|
| CORE-01 | Child profile CRUD (multi-child model, one active child in UI) | ☐ | |
| CORE-02 | Offline emergency snapshot (encrypted MMKV, refresh + retention) | ☐ | |
| CORE-03 | Biometric app-lock enforcement (cold start + 30s bg, FLAG_SECURE) | ☐ | |
| VAULT-01 | Upload-intent lifecycle (quarantine, presigned PUT, quota) | ☐ | |
| VAULT-02 | Finalize worker (magic-byte/size/checksum + ClamAV + promote) | ☐ | |
| VAULT-03 | Cleanup jobs + R2 lifecycle rules (versioned/CI-applied) | ☐ | |
| VAULT-04 | Document CRUD + category taxonomy | ☐ | |
| VAULT-05 | Vaccinations CRUD (first real confirmed-record path; unblocks REM-*) | ☐ | |
| VAULT-06 | Doctor visits + prescriptions CRUD (no model dosage advice) | ☐ | |
| VAULT-07 | Growth entries CRUD | ☐ | |
| CAP-01 | On-device scan/OCR product integration | ☐ | |
| CAP-02 | Backend extraction service (AI SDK, provider by server config; feature consent) | ☐ | |
| CAP-03 | Extraction schemas per category | ☐ | |
| CAP-04 | Review-and-confirm UI (no persist without confirm) | ☐ | |
| CAP-05 | Vision-fallback per-document consent flow | ☐ | |
| CAP-06 | Prompt-injection + golden-fixture test harness | ☐ | Synthetic/de-identified fixtures only |
| CORE-04 | Timeline projection (transactional append contract) | ☐ | Shared interface FAM/MEM must reuse |
| CORE-05 | Search & retrieval (trigram/FTS on confirmed data only) | ☐ | |
| REM-01 | pg-boss setup (Drizzle transactional job adapter, dedup) | ☐ | |
| REM-02 | Reminder domain (timezone/DST-safe recurrence) | ☐ | |
| REM-03 | Notification delivery (Expo Push, non-identifying payloads) | ☐ | |
| REM-04 | Email backup via Resend | ☐ | |
| REM-05 | Dead-letter queue + redrive runbook | ☐ | |

**Exit gate:** full vaccine-card journey (scan→OCR→extract→review→confirm→save→timeline→reminder→push) on both platforms; zero unconfirmed AI values persist; offline emergency card opens after API shutdown.

---

## M4 — Family Coordination  ·  ☐ Not started

Prereq: AUTH-04, AUTH-05. Can overlap M3 tail.

| WP | Deliverable | Status | Note |
|---|---|---|---|
| FAM-01 | Today / This Week / Needs Action dashboard | ☐ | Full verification needs M3 data |
| FAM-02 | Household invitations + fixed role templates | ☐ | |
| FAM-03 | `child_access` assignment (member ↔ specific children) | ☐ | |
| FAM-04 | Shared tasks + handover notes | ☐ | |
| FAM-05 | Full role/visibility authorization test matrix + audit logs | ☐ | Write incrementally |

**Exit gate:** full role/visibility + cross-household matrix passes; dashboard populated from real data, not fixtures.

---

## M5 — Memories and Activities  ·  ☐ Not started

Prereq: VAULT-01/02, AUTH-04. No dependency on M3 Smart Capture. Can overlap M4.

| WP | Deliverable | Status | Note |
|---|---|---|---|
| MEM-02 | Activity completion + optional "create a memory" link | ☐ | |
| MEM-03 | Monthly memory capsule CRUD | ☐ | Works fully with AI disabled |
| MEM-04 | Future-unlock metadata + server-side enforcement | ☐ | Not merely UI-hidden |
| MEM-05 | Optional AI monthly summary (opt-in, reuses CAP-02 layer) | ☐ | |
| MEM-06 | Media quota enforcement (reuses VAULT-01 pattern) | ☐ | |

**Exit gate:** quotas enforced transactionally; future-unlock enforced server-side; AI opt-out path fully functional.

---

## M6 — Privacy / Recovery / Operations / Release Hardening and Beta/Go-Live  ·  ☐ Not started

Prereq: M3 exit. REL-01–06 should be substantially complete entering M6.

| WP | Deliverable | Status | Note |
|---|---|---|---|
| PRIV-01 | Data export job (JSON/CSV + manifest + media, 24h expiry, re-auth) | ☐ | |
| PRIV-02 | Deletion workflow (owner-only, tombstone + physical purge ≤24h) | ☐ | |
| PRIV-03 | Consent-versioning model + re-consent UI | ☐ | |
| OBS-03 | Sentry redaction (PII scrubbing, source-map upload) | ☐ | |
| OBS-04 | Operational dashboards (API/PG/pg-boss/upload/AI/push/R2 metrics) | ☐ | |
| OBS-05 | Backup/restore finalization (weekly dump, monthly restore drill) | ☐ | 2nd+ drill (OBS-07 was 1st) |
| OBS-06 | PostHog compile-time event allowlist (CI-enforced) | ☐ | Finalizes OBS-02 |
| REL-07 | Fastlane lanes (ios/android beta+release, signing, keystore) | ☐ | |
| REL-08 | Mobile/API compatibility gate (`/mobile-config`, 426 block) | ☐ | |
| REL-09 | Store submission (privacy labels, data safety, age rating) | ☐ | |
| REL-10 | Legal sign-off (DPDP + encryption claim, named go/no-go gate) | ☐ | |
| REL-11 | Deployment/rollback/forward-fix runbook + drill | ☐ | |
| QA-01 | Full regression pass on release build (Maestro, a11y, perf) | ☐ | |
| QA-02 | Final security/adversarial regression (BOLA/IDOR, rate-limit, injection) | ☐ | Against exact submitted build |

**Exit gate:** restore within RTO; deletion verified purged; store internal builds accepted; privacy claims match real processing; REL-11 rollback drilled.

---

## Changelog

- **2026-07-14** — Established `docs/impl-plan/` as the home for detailed WP implementation plans (convention: `docs/impl-plan/<MILESTONE>/<WP-ID>-<slug>.md`; see its README). Moved the completed `design-system-implementation-plan.md` there from `docs/core/`. Updated roadmap §0, this protocol, and `AGENTS.md` to point at it.
- **2026-07-14** — Created this tracker. M0 recorded as ✅ lean-complete (PLAT-00, OBS-01, DEC-ALL done; REL-01–05 deferred with triggers) per decision lock `293f730`. Design System Phases 0–4 recorded ✅ (already built + pushed). M1–M6 seeded as not-started.
