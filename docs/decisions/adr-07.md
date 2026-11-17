# ADR-7: Gatherer contract — six sources, content resolved from the target note, paths normalized with `.md`

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-06 (`dc75104`, `94537ec`), normalization re-ruled 2026-11-07 (`f2def43`); no `list` source, ruled 2026-11-15.

## Context

Recipe inputs come from vault state. The gatherer is a switch over declared `source` values. The
questions: which sources exist, what content means, and what happens when a path lacks `.md`.

## Decision

- Sources of record: `recipe-param`, `content`, `vocabulary`, `query`, `path`, `constant`
  (`src/harness/gather.ts:44` switch).
- `content` resolves from `targetPath` and returns the **raw note body** (`dc75104`).
- Target note paths are normalized by appending `.md` when missing (UI-side `94537ec`; gatherer-side
  `f2def43`).
- **There is no `list` source**, and none is added: enumeration goes through Muninn's door
  (ADR-33, Proposed). `criteria`/`limit` do not exist in `RecipeInput` [R].
- **Non-path `recipe-param` inputs never borrow the note path** — they resolve to null (ADR-26,
  `1bbc908`, f30).

## Consequences

- Production never sets `defaultTargetPath`: the default is `'notes/gamma.md'`
  (`src/settings.ts:20-27`), so every gatherer fallback (`gather.ts:51, 57, 68`) fires only in
  fixtures. The op loop's active-note floor must be stated as a prompt fact, not a settings default.
- Vocabulary comes from `tagVocabulary()`, which returns **counts, not paths** — so a tag→path filter
  is inexpressible through the frozen surface today (Muninn ADR-37 is the door that would change that).

## Sources

Commits `dc75104` (2026-11-06, "resolve content input from targetPath and return raw note body"),
`94537ec` (2026-11-06, "normalize target note paths by appending .md when missing"), `f2def43`
(2026-11-07, path normalization), `1bbc908` (2026-11-15, non-path recipe-params resolve to null);
`docs/Huginn Plugin 2 Harness.md` `# Inputs` (first commit 2026-11-06, source values of record);
`src/harness/gather.ts:44-68`; `src/settings.ts:20-27`.

**Cross-references:** ADR-26, ADR-33, Muninn ADR-36/37.
