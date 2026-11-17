# Tracked Issues — pointer stub

**The tracked-issues docket lives in Muninn:** [`Muninn/docs/Tracked Issues.md`]
(Muninn repo, `docs/Tracked Issues.md`). It is **canonical for both projects** — the issues, their measured
receipts, and Dan's rulings live in one place, so nothing drifts between two copies.

Huginn issues are tracked in that docket, not here. Rows that bear on Huginn: **T4** (compute threading,
binding on the op loop), **T5** (mobile live receipt), **T6** (folder-rename child paths), **T7**
(`onunload` durability), **T8** (ANN / vector index), **T9** (Scenario F never smoked — the merged manual
smoke is the release gate), **T10** (the stale `LLM client returned null` entry in the vault's
`Agents/Huginn/MEMORY/corrections.md`, a pre-release manual step), **T11** (verbose coverage for the four
channel-less recipes), **T12** (bounded tag-assignment retry), **T13** (Memory Feedback Loop release, and
the **fixture numbering ruling owed**: the Implementation Guide plans F26–F30 against the already-taken
`f26–f30` chain, so new fixtures must start at **f31/f37** — a ruling, not an implementation decision),
**T14** (null-failure cause, blocked on recurrence), **T15** (`listNotes`, Muninn `adr-37.md` / Huginn
`adr-33.md`, **Proposed — ruling owed**), **T20** (Scenarios B, D, F, I and the E/G chat legs to be redefined
for the op loop), **T24/T25** (`versions.json` incompleteness, both projects), **T33** (the shipped
`chatModel` default `qwen3.5:4b` names a closed model — `src/settings.ts:20-27`), **T36** (`.qwen/tmp`,
Muninn's tree).

**Huginn keeps no issue list of its own.** If a finding is raised in Huginn, it goes on the Muninn docket and
stays there until investigated.

*Stub added 2026-11-17 (ruling 40, Muninn `docs/decisions/adr-40.md`): a document that outlives one task
lives in the repo, and stating a fact twice is a drift opportunity.*
