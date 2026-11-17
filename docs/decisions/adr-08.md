# ADR-8: Apply registry — four named routines, `append-frontmatter-array` accepts scalar or array

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-06 (registry shape, `73a615e`), scalar/array ruling 2026-11-07 (`f2def43`).

## Context

Apply routines are registry entries keyed by the recipe's `Apply Method` name. The design question:
what set ships, and whether a generic routine can absorb scalar output where the recipe emits one value.

## Decision

- The registry is `createDefaultApplyRegistry` (`src/harness/apply.ts:51`), and the shipped set is
  exactly: `noop` (`:55`), `append-frontmatter-array` (`:63`), `set-first-heading` (`:107`),
  `append-section` (`:137`).
- `append-frontmatter-array` accepts **scalar or array** values — the generic-array ruling
  (`f2def43`), so a one-tag answer and a multi-tag answer take the same routine.
- Frontmatter is read with `parseSimpleYaml` (`:249`): Huginn's own minimal parser, not a YAML library.

## Consequences

- New apply behaviour means registering a function, never teaching the model to call one (ADR-2).
- The registry grows additively; the op loop's `write` applies through the same routines, so a recipe
  that names `noop` mutates nothing (ADR-28, R3).
- The simple-YAML parser is a known limitation surface: anything it cannot parse is a silent non-match,
  which is why ground-truth frontmatter checks live in the primitive registry, not the apply path (ADR-13).

## Sources

Commit `f2def43` (2026-11-07, "generic array apply"); commit `73a615e` (2026-11-06, suggest routines);
`docs/Huginn Plugin 2 Harness.md` apply-registry section (first commit 2026-11-06);
`src/harness/apply.ts:51, 55, 63, 107, 137, 249`.

**Cross-references:** ADR-6, ADR-13, ADR-28.
