# ADR-1: Plugin 2 identity and boundary — Huginn owns chat/harness/recipes/gate, consumes vault state only through Muninn's frozen door

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-06 (definition committed at `7d9688d`, scaffold at `dd6efff`); restated 2026-11-06 and live in as-built.

## Context

Two plugins share one vault. The design question: which plugin owns which machinery, and how the
second plugin sees vault state without becoming a second source of truth. Muninn (Plugin 1) owns the
index and the frozen `MuninnApi` door (Muninn ADR-34, Muninn ADR-36).

## Decision

Huginn is Plugin 2 of Vault Overseer: the AI assistant for Obsidian. It owns the chat client, the skill
harness, the recipe loader, and the approval gate. It consumes vault state **only** through Muninn's
frozen door. Dependencies of record: Muninn must be installed and enabled; a local or remote Ollama
instance with a chat-capable model.

Vault-resident layout of record: `Agents/Huginn/SKILLS/` (recipes) and `Agents/Huginn/MEMORY/`
(corrections, user memory, chat summaries).

## Consequences

- The mirror type `MuninnApi` lives in `src/muninn-api.ts:57` — all five doors, plus `forceReindex`
  at `:62`. Adding a door means editing the mirror (the `listNotes` extension is ADR-33, Proposed).
- **Vault enumeration inside Huginn is forbidden** (`app.vault.getMarkdownFiles()`): a second source of
  truth. Binding with Muninn ADR-34.
- `forceReindex` has **no production caller** [R]: the only call sites are fixture stubs
  (`src/fixtures/f07.ts:38`, `f19.ts:33`, `f30.ts:50`). It is mirrored, present, and unused.
- Filename drift ledgered: the definition names `user-memory.md`, as-built appends `user.md`
  (`src/memory/kinds.ts:89`, read at `:93`), and `README.md:55` repeats `user-memory.md`. ADR-15
  carries the deviation; a Phase 4 fix must be a ruling, not an implementation decision.

## Sources

`docs/Huginn Plugin 2 Definition v0.1.md` (50 lines, first commit 2026-11-06);
`README.md:3-4`; commits `86bad01` (2026-11-06, initial), `dd6efff` (2026-11-06, "scaffold Obsidian
plugin and port harness modules from Muninn"), `7d9688d` (2026-11-06, "add project definition,
coordination protocol, and harness docs"); `src/muninn-api.ts:57-62`; `src/main.ts:37, 222-225`.

**Cross-references:** Muninn ADR-34 (plugin boundary), Muninn ADR-36 (the freeze).
