# ADR-6: Write-class suggest routines re-admitted — tags, title, links, through the gate only

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-06 (`73a615e`), gated by ADR-4.

## Context

Muninn ruled in 2026-11-03 that no write-class ships without a real named example, and that
revertibility is rented from Obsidian (Muninn ADR-31). Huginn is the place a gated write re-enters:
the approval gate exists, and the first named examples were the three suggest recipes.

## Decision

Write-class routines exist for **tags, title, and links**, and they run only after approval. The gate is
the differentiator, not the model's judgment.

## Consequences

- The routines are registry entries, not model-callable tools: `append-frontmatter-array` (ADR-8) is
  the tag path; `set-first-heading` the title path; `append-section` the link/section path.
- `tag-assignment` proposes **up to two tags** (30db86b, 2026-11-15) — the ceiling is a prompt rule,
  enforced by the schema, not by `maxItems` (ADR-14).
- The op loop's `write` op inherits this shape: one note, always gated, names a recipe (ADR-28, R3).
- Dan's live smoke finding stands: `tag-assignment` "kills ANY creativity about alternate tags. It
  should probably be conservative about them, but the model can't even come up with an alternative to
  one tag already in the note" (`docs/TestReport.md:13`). Recorded, not run down.

## Sources

Commit `73a615e` (2026-11-06, "implement write-class suggest routines for tags, title, links");
commit `30db86b` (2026-11-15, "tag-assignment proposes up to two tags");
`docs/TestReport.md:13`; `src/harness/apply.ts:63, 107, 137`.

**Cross-references:** Muninn ADR-31 (the base ban), ADR-5, ADR-8, ADR-28.
