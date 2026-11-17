# ADR-25: TESTING1 is the living manual-smoke contract — eleven scenarios, Scenario A as the precondition, B/D/F/I redefined for the loop

**Status:** Accepted (retrospective; recorded 2026-11-16); redefinition **owed** (docket T20)
**Ruled:** 2026-11-06 (`TESTING1.md` first commit, version-pinned header); redefinition ruling 2026-11-15
(`c4b103e`, assessment G6); Scenario J's command-modal leg survives verbatim (R10).

## Context

Manual smoke is Dan's act, in Obsidian, with receipts. Fixture-green is not production-live (T9).
`docs/TESTING1.md` is the checklist of record, version-pinned in its header: "Huginn Smoke Test
Scenario v0.1.0-test.20", with the Muninn floor `0.2.0-test.15` (or later) installed and enabled, and
Huginn `0.1.0-test.20` installed via BRAT.

## Decision

- **Eleven scenarios, A–K**, each with Conditions / Steps / Expected results, plus *Known limitations*
  and *What to capture when reporting results* (`docs/TESTING1.md:3-333`, measured): A harness
  discovers Muninn (`:44`), B tag-assignment (`:63`), C missing Muninn notice (`:92`), D warmup
  (`:108`), E chat with active-note context (`:126`), F interrupt an in-flight request (`:163`),
  G user-memory commands (`:193`), H Remember chat (`:213`), I report-back verbosity (`:234`),
  J corrections after failure (`:273`), K reset default skills (`:293`).
- **Scenario A is the precondition for every other scenario** — `Scenario A passed` is written into the
  Conditions block of B, C, D, E, F, G, H, I, J, K (`:66, 111, 129, 166, 196, 216, 243, 276, 296` [R]).
  The op loop inherits Muninn discovery (ADR-1, ADR-3), so **Scenario A survives unchanged**; the claim
  "Scenario A superseded by name" is **not in the repo** and is recorded as a context ghost (docket T26).
- **Redefined for the loop (measured set, assessment G6):** Scenarios **B, D, F, I** plus the E/G chat
  legs, because `chat-view.ts:266-351` is replaced. **A new loop scenario** is written as a manual smoke
  with the turn receipt as the observable: scope via `list`, serial writes, disclosure verification,
  receipt observable (assessment `:293-295`; ruled §10).
- **Scenario J's command-modal leg survives verbatim** (R10: command palette stays single-shot).
- The version-pinned header is part of the release bump shape (ADR-24).

## Consequences

- `031b686` (2026-11-15) conformed Scenario B's expected apply string to the shipped message and
  completed Scenario F's UI legs: **7 lines in `docs/TESTING1.md` only** [R] — docs conform to code,
  never the reverse.
- Scenario I stays **inconclusive** in the record (`docs/TestReport.md`, Dan's `test.20` smoke; Scenario
  A **PASS** at `:1`); the ruled corollary makes its expectation achievable without a `verbose` recipe
  input (ruled §5, R4 corollary, `c4b103e`), and Scenario I "reduces to legs the UI and the
  catalog-coverage guard already answer".
- The *Known limitations* block (`:311-322`) is a canonical statement of as-built facts: six recipes and
  their classes, the six primitives, active-note-only chat, warmup on initialization, recipe hot-reload,
  streaming Stop, New chat, ground-truth non-retry. The loop rewrites that block.
- Report contract: Obsidian version/OS, Muninn version, Huginn version, chat model name, exact console
  output for any failure, `Agents/Huginn/SKILLS/` presence, `Agents/Huginn/MEMORY/` contents (`:324-333`).

## Sources

`docs/TESTING1.md` (333 lines, first commit 2026-11-06, last commit 2026-11-15);
`docs/TestReport.md` (17 lines, first and last commit 2026-11-08);
`docs/Serial Contextual Operations Design Assessment.md:141-148, 293-295` (first commit 2026-11-15);
`docs/Serial Contextual Operations Design (Ruled).md:121, 177, 178, 180` (2026-11-15);
commit `031b686` (2026-11-15); `/tmp/opencode/rationalisation/docket-2026-11-16.md` T9, T20, T26.

**Cross-references:** ADR-18, ADR-23, ADR-24, ADR-28, ADR-29, Muninn ADR-7.
