# Implementation Plans (`docs/impl-plan/`)

This folder holds the **detailed, test-driven implementation plans** for individual roadmap work packages (WPs). It is the home for every plan produced by the `superpowers:writing-plans` skill.

## What goes here vs. elsewhere

| Artifact | Lives in | Example |
|---|---|---|
| **Product plan / architecture / roadmap** | `docs/core/` | `plan.md`, `architecture.md`, `implementation-roadmap.md` |
| **Live progress tracker** | `docs/core/implementation-status.md` | single source of truth for WP status |
| **Design specs** (brainstorming output) | `docs/superpowers/specs/` | `2026-07-14-m0-decision-lock.md` |
| **Implementation plans** (this folder) | `docs/impl-plan/` | `M1/PLAT-01-workspace-scaffold.md` |

A **spec** answers *what* and *why* (design/decisions). A **plan** answers *how*, step by step, with exact commands, tests, and expected output. Specs stay in `specs/`; plans live here.

## Naming convention

Group plans by milestone, name by work package:

```
docs/impl-plan/<MILESTONE>/<WP-ID>-<short-slug>.md
```

Examples:
- `docs/impl-plan/M1/PLAT-01-workspace-scaffold.md`
- `docs/impl-plan/M1/PLAT-08-vertical-slice.md`
- `docs/impl-plan/M2/AUTH-01-better-auth-email.md`

One plan file per work package (or a tight cluster of closely-coupled WPs planned together). Milestone folders (`M0`–`M6`) are created as needed.

## Workflow (per work package)

1. Produce the plan here with `superpowers:writing-plans` (**override the skill's default `docs/superpowers/plans/` location — save to `docs/impl-plan/<MILESTONE>/` instead**).
2. Set the WP to `◐ In progress` in `docs/core/implementation-status.md`.
3. Execute with `superpowers:subagent-driven-development` or `superpowers:executing-plans`.
4. On completion, set the WP to `✅ Done` (with commit SHA) in the tracker and add a changelog line.

## Contents

- `design-system-implementation-plan.md` — the completed plan for the design-system + app-shell work (Phases 0–4, ✅ done). Relocated here from `docs/core/` when this folder was established.
