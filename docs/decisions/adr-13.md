# ADR-13: Ground truth as a registry of named primitives, with a documented third-party seam

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-07 (design `c49a09a`, refactor `c39bd3d`); the seam is `f17`, certified 2026-11-07 and kept green.

## Context

The ground-truth checks began as a hard-coded `switch` of four checks driven by recipe YAML
(`exists`, `not-exists`, `matches-frontmatter`, `not-in-frontmatter`). The set was closed: a user
writing a new skill could not introduce a new primitive.

## Decision

Replace the closed switch with a `GroundTruthRegistry` of named primitives; new checks are added by
registering a function. Shipped recipes and fixtures use the new `primitive` format.

- The registry is `createDefaultGroundTruthRegistry` (`src/harness/ground-truth.ts:82`), and the
  shipped set is exactly six primitives: `file-exists` (`:135`), `file-not-exists` (`:145`),
  `frontmatter-contains` (`:156`), `frontmatter-not-contains` (`:186`), `note-contains-text` (`:222`),
  `note-not-contains-text` (`:249`).
- **Third-party seam, documented:** a primitive returns `ValidationError[] | PrimitiveOutcome`
  (`PrimitiveResult`, `:60`), normalized by `normalizePrimitiveResult` (`:290`). This union is the seam
  a third-party primitive must satisfy; `f17` guards it and stays green.

## Consequences

- Proposed primitives (`note-has-heading`, `note-links-to`, the `muninn:` / `post-apply:` prefixes) are
  **not implemented** [R] — design-only, and the Muninn-dependent ones are blocked by Muninn ADR-37
  (ADR-31).
- `# Validation` in `docs/Huginn Plugin 2 Harness.md` is the canonical recipe-format reference.
- Adding a primitive is additive; the registry shape is not frozen, the primitive interface is.

## Sources

`docs/Ground Truth Refactor Design.md` (239 lines, first commit 2026-11-07, "Implemented in `main`");
`docs/Ground Truth Next Primitives Design.md` (228 lines, first commit 2026-11-07, "design for
post-`0.1.0-test.18`"); commits `c49a09a`, `c39bd3d` (2026-11-07);
`src/harness/ground-truth.ts:60, 82, 135, 145, 156, 186, 222, 249, 290`; `src/fixtures/f17.ts`.

**Cross-references:** ADR-12, ADR-8, ADR-31.
