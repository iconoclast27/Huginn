# ADR-17: Bundled recipes are the authoritative copy; `.md` mirrors are conformed to them, never the reverse

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-07 (`648f7b9` bundling + first-run install, `c505c63` hot-reload, `75075c3` reset
command), drift guard ruled 2026-11-15 (`a6b4500`, f28).

## Context

Recipes ship two ways: `BUNDLED_RECIPES` in `src/recipes/bundled.ts` (what the installer writes into a
fresh vault) and `src/recipes/*.md` (what f05 parses in development). The header of `bundled.ts:7` names
the liability: "the same recipes kept in `src/recipes/*.md`, kept in sync manually". A one-sided edit
can ship a vault recipe the development contract does not describe.

## Decision

- `bundled.ts` is the authoritative copy. `.md` files are conformed **to** it, never the reverse.
- Bundled recipes install on first run (`648f7b9`); a **Reset default Huginn skills** command re-ships
  them into a user vault (`75075c3`); recipe edits hot-reload (`c505c63`).
- **f28 is the drift guard**: catalog entries parse, `.md` files parse, deep equality per recipe name
  (ignoring `sourcePath`), name sets equal in **both** directions, and the name set equals
  `EXPECTED_RECIPE_NAMES` (`src/fixtures/f28.ts:17-24, 72-105`).
- f28 is a drift guard, not a red-earning fixture: its green was proven against the pre-change copies
  in a HEAD worktree, so the green is not manufactured by the edit it guards. The written justification
  lives in the fixture header (`f28.ts:6-12`).

## Consequences

- The shipped inventory is six recipes, six mirrored `.md` files
  (`src/recipes/`: `tag-assignment`, `title-suggestion`, `link-suggestion`, `task-extraction`,
  `note-summary`, `related-notes`).
- The conformer runs from the repo root with `node_modules/.bin/tsx` (`/tmp/opencode/sync-recipes.ts`).
- Gotcha of record: backticks inside `bundled.ts` template literals break the esbuild parse.
- Adding a bundled recipe means: bundle entry, `.md` conform, f28 green, chain append (ADR-22).

## Sources

Commits `648f7b9`, `c505c63`, `75075c3` (2026-11-07), `a6b4500` (2026-11-15, "f28 guards bundled
recipes against .md drift; conform link-suggestion"); `src/fixtures/f28.ts:6-12, 17-24, 72-105`;
`src/recipes/installer.ts:36, 60`; `src/recipes/bundled.ts:7`; `docs/Recipe Composition and Reuse
Design.md:7-17` (first commit 2026-11-07, the duplication facts).

**Cross-references:** ADR-5, ADR-22, ADR-27, ADR-31.
