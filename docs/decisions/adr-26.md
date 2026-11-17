# ADR-26: Non-path `recipe-param` inputs never borrow the note path — they resolve to null

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-15 (`1bbc908`), guarded by f30 in the same commit.

## Context

The gatherer's `recipe-param` source takes its value from the run params. The bug: a param that is not
a path (a title query, a search string) fell through to `defaultTargetPath` / the note path when the
caller left it unset, so a recipe prompt received the active note's path as a value the model was told
to treat as content. A setting default became model-visible data.

## Decision

- **Non-path `recipe-param` inputs resolve to `null`** and never borrow the note path as a setting
  (`1bbc908`, verbatim commit subject: "fix(harness): non-path recipe-params resolve to null; f30 guards
  the rendered prompt").
- f30 guards the **rendered prompt**, not just the resolver: the assertion is on the text the model
  receives, so a silent path-borrow cannot ship.
- f30 stays green through the entire op-loop build (ruled §9 fixture line, `c4b103e`).

## Consequences

- The gatherer's fallback branches (`src/harness/gather.ts:51, 57, 68`) stay reachable only in fixtures,
  because production never sets `defaultTargetPath` (`src/settings.ts:20-27`, default
  `'notes/gamma.md'`): the op loop's base context is the user's prompt and the **active-note floor**,
  implied, never itemized (ruled §4.3.1) — ADR-36.
- In the loop, `write` names a recipe and the sub-run supplies params through
  `harness.run` (R8, Option A), so the param-borrow class of bug is closed by construction, not by
  patching the switch.
- f30 is the last number in the shipped chain (`package.json` fixtures chain, single hunk); the next
  number is **f31** (ADR-22).

## Sources

Commit `1bbc908` (2026-11-15, "fix(harness): non-path recipe-params resolve to null; f30 guards the
rendered prompt"); `src/fixtures/f30.ts`; `docs/README` coverage line `README.md:40` ("the gatherer rule
that non-path `recipe-param` inputs resolve to `null` and never borrow the note path as a setting");
`src/harness/gather.ts:44-68`; `src/settings.ts:20-27`;
`docs/Serial Contextual Operations Design (Ruled).md:172`.

**Cross-references:** ADR-7, ADR-22, ADR-28, ADR-34, ADR-36.
