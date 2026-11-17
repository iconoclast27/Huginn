# ADR-14: The schema keyword whitelist — `minItems`/`maxItems` rejected as rule enforcement; array frontmatter values made comparable

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** Dan, 2026-11-14 (`915451b` records the ruling); the array fix shipped 2026-11-15 (`30db86b`).

## Context

Two live questions. First: does the recipe schema enforce quantity limits? Second: can the vault-truth
guard see array-valued frontmatter?

## Decision

- **No hard min/max enforcement: Dan rejected `minItems`/`maxItems` as a rule-enforcement mechanism.**
  Verified reason, as recorded: the parser accepts only
  `type` / `items` / `properties` / `required` / `enum`, so `minItems`/`maxItems` never reach the
  validator; a 3-tag proposal would become a `schema-error` **correction**, appended to
  `corrections.md` and injected into every future `tag-assignment` prompt — the memory-pollution
  vector of the creativity-death symptom.
- The floor needs no machinery: `tags: []` passes validation at `/tags`, `valuePath` resolves `[]`,
  and `applyRoutine` returns `applied:false` with `No tags provided; nothing to apply.`
- Quantity ceilings live as prompt rules (ADR-6's two-tag proposal), not as schema enforcement.
- **Finding 7 fixed:** `valuesMatch` was array-blind (`some(v === outputValue)` is false for
  array-vs-array), so the vault-truth guard had no eyes on array-valued fields. `frontmatterValues`
  reads array entries, so the check can see `existing` in `tags: [existing]`
  (`src/harness/ground-truth.ts:320`, used at `:172`/`:179`).

## Consequences

- Red was earned before the fix, as required: f29 against `754e309` failed at
  `S2: existing must be recorded as dropped (strip stage missing?), got []` — exit 1, at the intended
  seam, before the code existed (the `f13` S2 invariant is the governing rule).
- The whitelist is the validator's surface: adding a keyword is a ruling, not an implementation
  decision.
- `parser.ts`'s accepted keyword set is measurable: `parseJsonSchema` at `:274`, keywords at
  `:280, 288-289, 300-306, 310-318`; `isJsonSchemaType` at `:328`. No `minItems`/`maxItems` case
  exists [R].

## Sources

`docs/Handover 2026-11-14.md:28-29, 39` (first commit 2026-11-15, `915451b`); commit `30db86b`
(2026-11-15); `src/recipes/parser.ts:274-328`; `src/harness/ground-truth.ts:172, 179, 307, 320`;
`src/fixtures/f29.ts` (added with `30db86b`).
**Ghost note:** finding 7's home, `docs/Code Review Plugin 2.txt`, is named in the handover's companion
list and is **not in the repo** [R] (docket finding (a)); the fix citation above is the surviving record.

**Cross-references:** ADR-6, ADR-12, ADR-13, Muninn ADR-7 (earned red).
