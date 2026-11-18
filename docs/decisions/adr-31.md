# ADR-31: Design tenants die by name — supersession is recorded in the ruled header, not by deleting docs, and unimplemented vocabulary stays unimplemented

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** Dan, 2026-11-15 (R13, the batch supersession header); the living-document rule (docs conform
to code, ADR-17).

## Context

Seven design docs landed on 2026-11-07 with the `test.18`/`test.19` work. Most of their proposed
vocabulary never shipped. The risk is a docs tenant that reads as a requirement: `auto-apply` (a write
without a gate) is not compatible with project doctrine, and `batch-suggest` conflicts with the ruled
"one write op = one note = one gate invocation".

## Decision

- **Superseded by name, in the ruled header (§10)**: `batch-suggest`, `auto-apply`, `approvalPolicy`,
  `autoApplyConfidence`, the batch modal. The header is the supersession notice, and the measurement is
  recorded as fact: "no shipped code implements batch (grep-clean); it was a docs tenant only"
  (`(Ruled).md:176`).
- **Design-only, unimplemented, and not admitted** (measured 0 hits in `src` for every term):
  `clarify`/`none` dispatch intents, `SKILL_FRAGMENTS/`, recipe `index.md`, recipe fingerprinting, the
  `muninn:` / `post-apply:` primitive prefixes, `note-has-heading`, `note-links-to`, `minItems`/`maxItems`,
  `approvalPolicy`, `autoApplyConfidence`, `batch-suggest`, `auto-apply` [R].
- **Docs conform to code, never the reverse** (ADR-17 for recipes, `031b686` for TESTING1, ADR-22 for the
  fixture table). A superseded doc is **archived with a tombstone**, not deleted, and deletion is a later
  human-approved step (ADR-32).
- Adding vocabulary to a parser, a registry, or a schema is **a ruling, not an implementation decision**
  (the same rule as the schema keyword whitelist, ADR-14, and the API freeze, Muninn ADR-36).

## Consequences

- `docs/Risk Class and Approval Model Design.md` (193 lines, first commit 2026-11-07) carries the batch
  section that R13 supersedes; the assessment names the settlement as a docs conflict, not code to delete
  (G12, `:240`), and the wire map lists it as "batch section marked superseded, `auto-apply` row ruled"
  (`:296-297`).
- The Muninn-dependent primitives (`note-has-heading`, `note-links-to`, `muninn:`) are blocked by Muninn
  ADR-37 (`listNotes`, **Accepted 2026-11-18**, implementation owed) — ADR-33.
- `docs/Ground Truth Refactor Design.md` is the one design doc of that day marked **"Implemented in
  `main`"** — ADR-13 owns it.
- `f11` becomes a fixture for a component that no longer exists when the loop lands; the ruling is to
  **re-point it as a refusal guard, not delete it** (ADR-34, G6 recommendation adopted).

## Sources

`docs/Serial Contextual Operations Design (Ruled).md:174-177`;
`docs/Serial Contextual Operations Design Assessment.md:240-248, 296-297, 141-148`;
`docs/Chat Skill Dispatcher Design.md` (164 lines), `docs/Ground Truth Next Primitives Design.md` (228),
`docs/Memory Feedback Loop Design.md` (215), `docs/Recipe Composition and Reuse Design.md` (213),
`docs/Risk Class and Approval Model Design.md` (193), `docs/Tool Distancing and Recipe Expansion
Design.md` (130) — all first commit 2026-11-07, measured [R];
`src/` term census 0 hits measured [R]; `/tmp/opencode/rationalisation/rulings-2026-11-16.md` rulings
1–4.

**Cross-references:** ADR-5, ADR-10, ADR-13, ADR-14, ADR-17, ADR-28, ADR-30, ADR-32, Muninn ADR-36.
