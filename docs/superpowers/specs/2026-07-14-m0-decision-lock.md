# M0 Decision Lock — Lean Solo Edition

- **Date:** 2026-07-14
- **Milestone:** M0 (Decisions, provisioning direction, threat model)
- **Repo state at lock:** branch `development`, HEAD `3c07c5f`
- **Operating context:** Solo indie developer, bootstrapped, minimal budget, shipping eventually
- **Scope decision:** **Lean M0** — lock the reversible technical decisions and produce the documents that can be generated now; defer every paid / legal / DPA provisioning item to the milestone where it is actually needed.

This document *is* the M0 deliverable. M0 produces decisions and documents, not code. The next code milestone is **M1** (platform bootstrap + one-call vertical slice), which is where a separate implementation plan applies.

---

## 1. Why "Lean M0"

The master roadmap's M0 assumes a funded, cross-functional team with contracted legal counsel. For a bootstrapped solo developer, front-loading M0's expensive and identity-binding items — a paid Apple Developer account, a paid Google Play account, a signed AI-vendor DPA, retained India-DPDP counsel — spends money and makes commitments *before* it is validated that the product will ship.

Every one of those items has a natural just-in-time trigger later (auth setup → M2; upload → M3; launch/legal → M6). Lean M0 therefore locks only the **reversible** technical decisions and records **when** each external item becomes necessary. Local development requires **zero external accounts**.

Nothing here is irreversible: the component library is hand-built, the AI layer is provider-neutral, and every hosting/vendor choice is swappable.

---

## 2. Identity & configuration (locked)

These identifiers already exist consistently in `apps/mobile/app.json` and `docs/core/architecture.md`. Locking them here means M1 code and config use them without churn.

| Item | Value | Status |
|---|---|---|
| App name | **LittleArc** | Locked (`app.json`) |
| Slug | `littlearc` | Locked |
| Deep-link scheme | `littlearc` | Locked |
| iOS bundle / Android package (prod) | `com.littlearc.app` | Locked |
| Staging bundle / package | `com.littlearc.app.staging` | Locked |
| Primary domain | `littlearc.app` | Identifier locked; **registration deferred** |
| Staging domain | `staging.littlearc.app` | Deferred |
| Email / invite link domain | `links.littlearc.app` | Deferred |

Domain registration is cheap (~$12/yr) and can optionally be done early to reserve the name; it is only *required* at deep-link testing and beta. See §6.

---

## 3. Reversible technical stack (ratified from `architecture.md`)

All choices below are already fixed in the architecture document. They are ratified here as the M0 baseline, each annotated with its just-in-time setup trigger. None require an external account or spend to begin local work.

| Concern | Choice | JIT trigger (when you set it up) |
|---|---|---|
| Auth | **better-auth** — email/password + Google + Apple; organization plugin for households; Expo client + SecureStore | Google OAuth client (free) → M2; Apple Sign-in (needs paid Apple acct + manual capability, no EAS) → M2 / distribution |
| API | **Fastify + tRPC** (private API), `@fastify/rate-limit` | M1 |
| ORM / schema | **Drizzle** owns app schema + migrations; better-auth schema generation feeds reviewed Drizzle migrations | M1 |
| Database | **PostgreSQL** (shared by app, better-auth, pg-boss) | M1 (local Docker Postgres) |
| Background jobs | **pg-boss** (same Postgres; no Redis) | M1 / as features need jobs |
| Object storage | **S3-compatible adapter** — **MinIO** locally, **Cloudflare R2** in production | MinIO → M1; R2 → M3 (upload) |
| Hosting | **Railway, Singapore region** (latency choice, *not* a data-residency claim) | Deferred — first deploy |
| Transactional email | **Resend** | M2 (verification / reset emails) |
| Observability | **Sentry + PostHog** (strict redaction: no OCR text, health values, files, secrets) | When instrumenting |
| Push | **Expo Push** | M3 / M5 (reminders) |

**Auth provider notes (ratified as intent, set up at M2):**
- **Google:** better-auth browser OAuth initially; native ID-token exchange can replace it later without changing account ownership.
- **Apple:** native `expo-apple-authentication` on iOS, then better-auth ID-token verification (state + nonce required). Apple capability/entitlement configured manually because EAS Build is not used. Requires the paid Apple Developer account.
- Account linking only via better-auth's safe, verified-email flow — never on unverified client input.

---

## 4. Smart Capture / AI direction (DEC-05 — the one M0-gated decision, resolved with no blocker)

`architecture.md` already designs Smart Capture privacy-first and **provider-neutral**. That design removes the AI-vendor DPA from M0 entirely.

**Locked direction:**
1. **On-device OCR by default** — iOS Apple Vision / VisionKit; Android Google ML Kit Document Scanner + Text Recognition v2. Free, nothing leaves the device. Initial languages: English/Latin + Hindi/Devanagari. Carries the MVP.
2. **Cloud AI extraction receives OCR *text* only**, by default, behind a **provider-neutral interface**. The concrete vendor is swappable and its selection is **deferred to M3**, and only if/when the cloud text path is actually enabled.
3. **Sending an image to a vision model** is a **separate, explicit, per-document consent** action ("Improve using secure image extraction") — deferrable entirely.
4. A parent always reviews and confirms extracted values before they become records; AI outage/timeout/quota/malformed output all degrade to OCR/manual review.

**Consequence:** No cloud AI vendor selection and **no DPA are required in M0**. The concrete vendor + DPA decision moves to M3 and only if the optional cloud path is enabled. On-device OCR is sufficient for the MVP happy path.

---

## 5. Resolved Decision Register (solo-adjusted)

| ID | Decision | Lean-solo resolution | Decided by |
|---|---|---|---|
| DEC-01 | Household/org schema (better-auth organization + fixed roles) | Ratified; dynamic custom roles deferred | M2 |
| DEC-02 | Google auth = browser OAuth first | Ratified | M2 |
| DEC-03 | Apple = native + better-auth ID-token verification | Ratified; gated on paid Apple acct | M2 |
| DEC-04 | OCR languages = English/Latin + Hindi/Devanagari only | Ratified (on-device) | M2 |
| DEC-05 | AI provider + DPA for Smart Capture | **Deferred** — on-device-first + provider-neutral interface; no vendor/DPA in M0 | M3 (only if cloud path enabled) |
| DEC-06 | pg-boss migrations strategy | Ratified | M2 |
| DEC-07 | R2 checksum on upload | Ratified | M3 |
| DEC-08 | Data-residency review owner | **You** (solo) — self-educate now, formal review before beta | Engaged M0, finalized M6 |
| DEC-09 | Analytics / legal copy | Deferred | M6 |
| DEC-10 | Share-extension signing | Deferred; gated on Apple acct | M2 |

**Zero open P0 decisions.** Every remaining item has a default and an owning milestone.

---

## 6. Deferred provisioning checklist (do it when the trigger fires)

| # | Item | Cost | Lead time | Trigger point |
|---|---|---|---|---|
| REL-01 | Apple Developer Program | $99/yr | ~24–48h enrollment | M2 (Apple Sign-in) or first TestFlight |
| REL-02 | Google Play Console | $25 once | ~1–2 days review | First Android beta |
| REL-02b | Firebase project (FCM) | free | minutes | First Android push testing |
| REL-03 | Cloud AI vendor + DPA | usage-based | vendor-dependent | Only if cloud extraction enabled (M3) — likely N/A for MVP |
| REL-04 | India DPDP legal counsel | varies | weeks | Before public beta (M6); self-educate now |
| REL-05 | Domain registration (`littlearc.app`) | ~$12/yr | minutes | Deep-link testing / launch; optional early to reserve the name |

Registering the domain now is the only item worth considering ahead of its trigger, purely to reserve the brand name. Everything else waits.

---

## 7. Tooling version snapshot (PLAT-00)

Captured from the working machine on 2026-07-14. Mobile versions are **verified installed**; backend versions are **targets** to be pinned at M1 bootstrap.

**Environment (verified):**
- Node: `v22.17.0` (LTS ≥ 22.12 ✔)
- pnpm: `11.13.0`

**Mobile app (`apps/mobile`, verified installed):**
- expo: `~57.0.4`
- react: `19.2.3`
- react-native: `0.86.0` (New Architecture enabled)
- expo-router: `~57.0.4` (typed routes on)
- react-native-unistyles: `^3.3.0`
- react-native-reanimated: `4.5.0`
- @shopify/flash-list: `2.0.2`
- expo-image: `~57.0.0`
- react-native-safe-area-context: `~5.7.0`
- typescript: `~6.0.3`
- jest: `^29.7.0`
- @testing-library/react-native: `^14.0.1`

**Backend (target, to pin at M1 — no `apps/api` yet):**
- Fastify 5+, tRPC 11+, Drizzle ORM (current stable), better-auth (current stable), pg-boss (current stable), PostgreSQL 16+, Zod (current stable), MinIO (local S3).

---

## 8. Threat model & privacy draft (OBS-01, solo scale)

A lightweight model scaled to a solo indie building a private childhood-data app. Data sensitivity is high (children's health/identity documents), so the security posture is deliberately conservative even though the operation is small.

**Assets (most→least sensitive):** children's health records & identity documents; document images/scans; OCR text; auth credentials/sessions; household membership; device-local offline snapshot.

**Trust boundaries:** device ↔ API (tRPC over HTTPS, better-auth cookie from SecureStore); API ↔ Postgres; API ↔ object storage (MinIO/R2); API ↔ optional cloud AI (OCR text only, after consent); app ↔ OS document scanner/biometric.

**Primary threats & mitigations:**
- *Data exposure via logs/telemetry* → strict Pino redaction; no OCR text, health fields, filenames, presigned URLs, prompts, or images in Sentry/PostHog/Railway logs/pg-boss payloads.
- *Unauthorized household access* → server always re-verifies membership; client-supplied active household is never trusted.
- *Prompt injection via document text* → OCR text treated as untrusted, delimited, tools prohibited, model instructed that document text cannot alter behavior.
- *Cross-border/residency* → Singapore is a latency choice, not a residency claim; formal DPDP review owned by you before beta (DEC-08).
- *Device loss* → biometric lock on offline snapshot; invalidated key clears snapshot and forces online sign-in.
- *Account-linking abuse* → only via better-auth verified-email flow.
- *Third-party data sharing* → cloud AI receives OCR text only after explicit consent; image only after a separate per-document consent.

**Deferred to M6:** full privacy-impact assessment, DPDP legal review, analytics/consent copy, deletion/export operational proofs.

---

## 9. M0 exit gate (lean solo) — status

- [x] Reversible technical decisions locked (§3)
- [x] Identity / config identifiers locked (§2)
- [x] Smart Capture / AI direction decided; vendor + DPA deferred (§4)
- [x] Decision Register resolved; zero open P0 (§5)
- [x] Deferred provisioning checklist with triggers/costs/lead-times (§6)
- [x] PLAT-00 tooling snapshot captured (§7)
- [x] Threat-model / privacy draft written (§8)

**No paid accounts, legal engagement, or DPA are required to begin building.**

→ **M0 complete. Unblocks M1** (platform bootstrap: monorepo + `apps/api` + shared packages + CI + Docker + one-call vertical slice Expo → tRPC → Fastify → Postgres). M1 gets its own implementation plan.
