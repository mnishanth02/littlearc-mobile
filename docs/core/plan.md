# LittleArc Product Plan (Mobile)

---

## 1. Product Vision

**LittleArc** is a private, parent-first **mobile app** — a private childhood vault for a child. It helps Indian families store, manage, and preserve everything important about a child in one age-based timeline: health records, documents, memories, activities, reminders, family stories, and future-unlockable memories.

It is **not** a replacement for U-WIN, ABHA, DigiLocker, Google Photos, or school apps. It is a **warm family dashboard layer above them**: one private, child-centred space to manage childhood from birth to adulthood, always in your pocket.

**Positioning:** Encrypted at rest and in transit, private by default, no ads, no public sharing, parent-controlled access, protected behind a biometric app lock.

> Legal TODO: Counsel should review India-facing privacy and security claims before public launch.

**Core promise:**

> Parents use LittleArc to manage childhood today. Children later use it to understand their own story.

**Primary hook:** lead with the sharp, urgent value — *"the private vault for your child's health & documents: keep every record together, stay ahead of vaccine due dates, and pull up the emergency card in 2 taps, even offline."* The broader life-OS modules (memory, activities, family) round out the app but the health-and-documents wedge is the spearhead for acquisition and retention.

---

## 2. Product Problem

A child's important information is scattered across vaccination cards, prescriptions, birth documents, school forms, WhatsApp, photo galleries, emails, and physical files. This creates three high-friction problems:

1. Important information is hard to find when it is needed most.
2. Memories are captured as photos but not preserved as meaningful stories.
3. Parents carry a heavy mental load around health, activities, reminders, documents, and family coordination.

LittleArc organizes these scattered needs around one central product object: **the child's life timeline**, captured and retrieved from the phone that is already always in the parent's hand.

---

## 3. Target Users

| Segment                                | Role in product                                             | MVP relevance               |
| -------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| **Parents of children aged 0-3**       | Primary owners, daily operators, decision-makers            | Core MVP audience           |
| **Grandparents**                       | Trusted family contributors, memory/story participants      | Invite-only secondary users |
| **Guardians / nannies**                | Operational helpers for handovers, tasks, reminders         | Invite-only secondary users |
| **Children**                           | Future recipients of curated memories, stories, and letters | Future access mode, not MVP |

The MVP is optimized for one parent managing one child on their phone, while the data foundation supports multiple children and multiple trusted members. All secondary users participate through the mobile app; there is no web experience in the MVP.

---

## 4. Product Principles

1. **Child timeline first.** Every meaningful record should eventually appear in one age-based life timeline.
2. **Private by default.** No public profile, no social feed, no growth-hack sharing loops.
3. **Parent controlled.** Parents decide who can access what, when memories unlock, and whether AI is enabled.
4. **Useful weekly.** The app must reduce operational mental load, not only act as a sentimental archive.
5. **Warm but practical.** The product should feel emotionally meaningful while still being fast for urgent retrieval.
6. **Reviewable automation, integrations-later.** Smart Capture can pre-fill fields, but a parent reviews every extracted value before it becomes a record or reminder. A complete manual path always remains available, and the MVP does not depend on government, school, or WhatsApp integrations.
7. **Mobile-native and offline-ready.** Capture with the camera, get reminded by push, unlock the app with biometrics, and read the emergency card with no signal. The phone's native capabilities are the product's advantage, not an afterthought.

---

## 5. MVP Scope

The MVP ships **all six modules as thin, focused slices** on **iOS and Android** (cross-platform via React Native + Expo, equal polish on both). The Health & Document Vault is the deepest module (the wedge); the others ship lean and deepen post-MVP.

### In scope: Phase 1, ages 0-3

1. Child Profile
2. Child Timeline
3. Health & Document Vault
4. Monthly Memory Capsule
5. Screen-Free Activity Engine
6. Family Copilot

### Mobile-native capabilities in the MVP

| Capability                          | Where it lives                              |
| ----------------------------------- | ------------------------------------------- |
| Native document scan + on-device OCR | Vault                                       |
| Camera/photo capture                 | Vault, Memory Capsule                       |
| Push notifications for reminders     | Family Copilot (primary channel)            |
| Offline emergency card + core profile| Child Profile                               |
| Biometric app lock (Face ID / fingerprint) | App-level privacy gate                |
| Share-sheet import (from WhatsApp/gallery) | Vault (and Memory Capsule)            |

### Authentication

Email, Google sign-in, and **Apple Sign-In** (required by the App Store when Google sign-in is offered). No phone/SMS OTP auth.

### Out of scope for MVP

| Feature                                    | Reason                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Web app / web companion                    | MVP is mobile-only; all users (including grandparents/guardians) use the app                    |
| Active paywall / Razorpay billing          | Launches free; billing path decided later (see §11), `PAYWALL_ENABLED` stays off                |
| WhatsApp / SMS reminders                   | Push + email cover MVP; paid messaging is a future Plus channel                                  |
| ABHA / U-WIN / DigiLocker integration      | Manual capture (camera, upload, share sheet) is enough for MVP; guided import is a future item   |
| Phone / SMS OTP auth                       | Email + Google + Apple sign-in is enough                                                         |
| School command center                      | More relevant after age 3                                                                        |
| Child-facing app                           | Not required for infants/toddlers                                                                |
| Public sharing / social feed               | Conflicts with privacy-first positioning                                                         |
| Full AI companion for child                | Build only after trusted family data exists                                                      |
| Client-side E2E file encryption            | Deferred to Phase 1.5; MVP relies on access control, at-rest encryption, and biometric lock      |
| Real-time multi-device sync                | Deferred to Phase 1.5                                                                            |
| Home-screen emergency widget               | Fast-follow after the core offline emergency screen and share-sheet flow are stable             |

---

## 6. MVP Product Modules

Each module below is scoped as a **thin slice**: the smallest version that delivers the promise and links into the timeline. Anything richer is a deliberate later deepening.

### 6.1 Child Profile

**Goal:** create the child's core identity and emergency context, retrievable in a hurry and offline.

**Thin slice:** one child at MVP; the data model supports multiple children and a child switcher.

**Core flows**

- Parent signs up (email / Google / Apple) and creates a child profile.
- Parent adds date of birth, gender, blood group, allergies, health notes, pediatrician, emergency contacts, and parent/guardian details.
- Parent opens an emergency quick-view from the header in two taps, and it works **offline**.
- Parent can switch children later if more children are added.

**Acceptance**

- A parent can create a child and immediately access essential profile and emergency information.
- Emergency information (blood group, allergies, emergency contacts, pediatrician) is readable in a hurry, in two taps, with no network.

### 6.2 Child Timeline

**Goal:** make the timeline the product spine and the child's life archive.

**Thin slice:** read-focused age feed with manual add and automatic linking; no complex reordering or bulk editing.

**Core flows**

- Parent opens an age-based unified feed labelled by age, such as "4 months" or "1 year".
- Parent filters by type: health, growth, docs, photos, milestones, notes, memories.
- Parent taps "+" to add any important entry.
- Records from other modules automatically appear in the timeline.

**Acceptance**

- Opening the timeline clearly shows what happened at each life stage.
- A parent can move from a timeline entry to its source record without losing context.

### 6.3 Health & Document Vault (the wedge)

**Goal:** give parents fast, reliable retrieval of important documents and health records. This is the deepest MVP module.

**Categories**

- Identity: birth certificate, discharge summary
- Vaccinations
- Doctor visits
- Prescriptions
- Growth
- Insurance
- Emergency card
- School health forms

**Core flows**

- Parent captures a document with the **native document scanner**, uploads an image/PDF, or **imports via the share sheet** from WhatsApp, gallery, or email.
- Smart Capture performs OCR on the device, sends extracted text (not the document image) to the configured server-side AI model, and pre-fills category-specific fields.
- Parent reviews, edits, and explicitly confirms every extracted value before the app saves a typed record or schedules a reminder.
- If scanning, OCR, or AI extraction is unavailable or inaccurate, the parent can enter category, date, notes, and health details manually.
- Parent adds vaccination due/given status, which drives reminders.
- Parent records doctor visits, prescriptions, and growth entries.
- Parent searches and retrieves documents quickly.

**Acceptance**

- A parent can store and retrieve documents quickly without searching physical files, WhatsApp, email, or gallery.
- A parent can scan a supported document, review useful pre-filled fields, and save without retyping the whole record.
- No AI-extracted health value is committed or used for a reminder without parent confirmation.
- Health records link into the timeline.

### 6.4 Monthly Memory Capsule

**Goal:** preserve the meaning behind memories, not just the media file.

**Thin slice:** capsule creation with a template summary and a future-unlock flag; AI is opt-in only and not required to complete a capsule.

**Core flows**

- Parent creates a monthly capsule with photos, videos, a voice note, a parent letter, milestones, a grandparent blessing, and "what they were like this month."
- Parent generates a monthly summary using a curated template, with AI assistance only if opted in.
- Parent marks selected letters or memories to unlock at a future age or date.

**Acceptance**

- A parent can create a meaningful monthly record that feels worth revisiting years later.
- Future-unlockable content is parent-controlled and clearly marked.

### 6.5 Screen-Free Activity Engine

**Goal:** help parents find practical, safe, age-appropriate activities.

**Thin slice:** a curated, vetted static library with filters and mark-done; AI suggestions are an optional layer that can be added without blocking the module.

**Inputs**

- Child age, time available, indoor/outdoor setting, materials available, parent energy, child mood, language, skill goal.

**Skill goals**

- Speech, motor, social, sensory, creativity, parent-child bonding.

**Core flows**

- Parent browses or filters a curated, vetted activity library.
- Parent optionally asks for an AI-assisted suggestion, only after enabling AI for the feature.
- Parent sees activity name, materials, steps, safety notes, skill supported, parent-child prompt, and optional memory-capture suggestion.
- Parent marks an activity done and optionally creates a memory from it.

**Acceptance**

- A parent gets practical, safe, screen-free activities suited to their context.
- AI is an optional layer above the curated library, not the product's only source of activity suggestions.

### 6.6 Family Copilot

**Goal:** reduce family mental load and coordinate child-related work.

**Thin slice:** Today dashboard, invites with roles, and a shared task/handover list; real-time sync is deferred to Phase 1.5.

**Core flows**

- Today dashboard surfaces reminders due, medicine/vaccine tasks, pending uploads, a suggested activity, and a one-line memory prompt.
- Parent invites trusted members with roles.
- Family members collaborate through shared tasks, checklists, and handover notes.
- Parent sees Today, This Week, and Needs Action views.
- Reminders are delivered by **push (primary) and email (backup)**.

**Acceptance**

- The app helps the family coordinate responsibilities instead of becoming another passive storage app.

---

## 7. Navigation & Information Architecture

### Primary navigation — bottom tab bar

| Tab                  | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Today**            | Daily operating dashboard: reminders, due tasks, suggested activity, memory prompt |
| **Timeline**         | Age-based life feed and emotional archive                                          |
| **Vault**            | Health, documents, vaccination, prescriptions, growth, retrieval                   |
| **Activities**       | Screen-free activity discovery and completion                                      |
| **Family**           | Members, roles, tasks, handovers, needs-action view                                |

### Header

- Child avatar / child switcher
- Emergency quick-view (available offline in two taps)
- Settings

### App entry

- The app opens behind a **biometric lock** (Face ID / fingerprint), with the device credential as fallback.

### Onboarding

1. Sign up (email / Google / Apple)
2. Create child profile
3. Land on Today

---

## 8. Core Product Loops

| Loop                 | Trigger                        | Product outcome                                      |
| -------------------- | ------------------------------ | ---------------------------------------------------- |
| **Daily loop**       | Parent opens Today             | Reminders, tasks, activity suggestion, memory prompt |
| **Monthly loop**     | End-of-month push prompt       | Parent creates a monthly capsule                     |
| **Yearly loop (later)** | Child birthday              | App generates "Year N of your child's life" recap    |
| **Family loop**      | Shared task or handover        | Trusted members coordinate care responsibilities     |
| **Retrieval loop**   | Parent needs a record urgently | Parent finds health/document information quickly     |

---

## 9. Privacy as Product Experience

Privacy is not only a technical requirement; it is part of the product promise, and mobile makes it tangible.

The product experience must make these expectations visible:

- No public child profile.
- No public sharing or social feed.
- Invite-only family access.
- Parent-controlled roles and permissions.
- Clear AI opt-in per feature.
- Smart Capture sends OCR text to the configured AI provider only after feature consent; a document image is sent to a vision model only after separate, explicit per-document consent.
- AI extraction never diagnoses, recommends treatment, or creates a health reminder without parent review.
- Biometric app lock, with the emergency card cached and readable offline.
- Transparent OS permission prompts (camera, photos, notifications) with a clear in-app rationale before each request.
- Product analytics never receive child names, document text, health values, filenames, contact details, or raw record identifiers.
- Export anytime, delete anytime.
- Future child access only with parent permission.

---

## 10. MVP Success Criteria

The MVP is successful if a parent, using the mobile app, can:

1. Create a child profile.
2. Store essential health and document records via Smart Capture, file upload, or the share sheet, with extracted values reviewed before save.
3. Add vaccination and doctor-visit details.
4. Create monthly memory capsules.
5. Save future-unlockable memories or letters.
6. Set reminders for health and family tasks and receive them by push.
7. Get useful screen-free activity suggestions.
8. View everything in one child timeline.
9. Invite trusted family members.
10. Retrieve important information quickly, including the emergency card offline in two taps.
11. Unlock the app with biometrics.
12. Export or delete child data.
13. Feel the app is useful weekly, not just occasionally.

---

## 11. Monetization & Launch Readiness

LittleArc launches **free** to seed the habit and the family-invite loop. A **per-household Plus** subscription (one owner subscription covers all their children and invited family members) is designed into the data model but kept fully disabled behind a `PAYWALL_ENABLED` flag, so pricing can switch on after the wedge proves retention — without reworking the app.

- **Free (MVP):** one child, core vault, Smart Capture, vaccination reminders (push + email), emergency card, basic timeline, trusted-member invites with fixed role templates, data export, and thin versions of the memory, activity, and family modules.
- **Plus (later):** larger storage and member limits, WhatsApp/SMS reminders, richer memory and future-unlock features, advanced/custom role controls, growth charts, and broader opt-in AI summaries.
- **Billing decision deferred:** Apple and Google generally require their in-app purchase systems for digital subscriptions, while Razorpay is typically not permitted for in-app digital sales. The choice between store IAP and an external billing path is deferred until the paywall is turned on; nothing in the MVP depends on it.
- **No ads, no data selling, and no third-party advertising trackers.** MVP product analytics use a privacy-configured EU-hosted service with a strict event allowlist and no child or health content; self-hosting remains a later option. The only physical revenue line considered is a printed photobook/yearbook upsell later.

---

## 12. Recommended Build Order

All six modules are in the MVP, but to de-risk delivery for a small team, build so the wedge is independently shippable before the softer modules layer on:

1. **Foundation + wedge:** Auth (email/Google/Apple), Child Profile, offline Emergency Card, Health & Document Vault (Smart Capture, upload, share-sheet import, search), vaccination reminders (push + email), and the Timeline that aggregates them.
2. **Coordination:** Family Copilot (Today dashboard, invites/roles, shared tasks, reminders).
3. **Emotional + enrichment:** Monthly Memory Capsule and the Screen-Free Activity Engine, with AI as an opt-in layer.

This ordering keeps a usable, launchable product available at each step while still delivering all six modules in the MVP.

---

## 13. Future Product Direction

### Phase 1.5

Home-screen emergency widget, client-side E2E file encryption, deeper AI summaries, offline write queue, real-time sync for shared family views, WhatsApp/SMS reminders, and a guided U-WIN/ABHA import prototype.

### Phase 2: ages 3-8

School command center, homework/circular tracking, child portfolio, hobbies and activity tracker, certificates and projects.

### Phase 3: ages 8-18

Family knowledge graph, private family AI, child unlock mode, self-reflection archive, achievement timeline.

### Phase 4: adulthood

Exportable life archive: health history, documents, family stories, childhood memories, parent letters, achievements, values, and life lessons.
