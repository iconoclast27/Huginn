# ADR-32: Document rationalisation — canonical categories, `docs/archive/` in both projects, tombstones, ADR immutability, and receipts or nothing

**Status:** Accepted (Dan's rulings 1–14, 2026-11-16; recorded 2026-11-16); Phase 3/4 execution **owed**
**Ruled:** Dan, 2026-11-16, rulings 1–14 (`/tmp/opencode/rationalisation/rulings-2026-11-16.md`); the
brief is `/home/danf/Projects/Document Rationalisation.md`; "Receipts or nothing" Dan, 2026-11-16.

## Context

Both projects carry overlapping docs: Muninn has 37 tracked files under `docs/` (23 sealed
`docs/ARCHIVE/` + 14 live) + `README.md`; Huginn has 24 tracked files under `docs/` + `README.md` (25 on
disk, including the untracked `docs/Handover 2026-11-15.md`) [R]. Facts are duplicated across the two
sets, and doc-count claims have already drifted once (T3). The question: what is canonical, where does
history go, and how to cut the context needed to hold both sets.

## Decision

- **Two projects, doc sets never merged.** Each keeps its own canonical set, Design Report, and ADRs
  numbered from 1. **Every fact lives in exactly one canonical doc across both projects** — cross-reference,
  never copy.
- **Canonical categories only:** README, Contributing/conventions, Changelog, Security policy, Initial
  Design Report, ADR set, sceptical living references. Everything non-canonical moves to
  **`docs/archive/` in both projects**, with a tombstone: *"Archived YYYY-MM-DD. Superseded by <doc>. Not
  authoritative."* Muninn's sealed `docs/ARCHIVE/` is renamed to `docs/archive/` (23 tracked files move).
  `docs/archive/README` in each project.
- **`docs/decisions/` is the ADR home in both**, numbered from 1 per project, **immutability in force**:
  an ADR is never edited after acceptance; a changed decision is a new ADR marking the old Superseded
  (Muninn ADR-6).
- **Handovers go into the archive from now on.** The untracked `docs/Handover 2026-11-15.md` is archive
  material, not canonical (ruling 3; ADR-20).
- **Ownership split, ruled:** Muninn owns `LLM Coordination Protocol v1.0.md` (187 lines in Huginn, first
  commit 2026-11-06) and `Unified Project Definition v0.2.md` (118 lines, same commit); **Huginn keeps
  pointer stubs** [R].
- **Canonical docs owed:** `CHANGELOG.md` in each project, at least by releases (T17); `SECURITY.md` in
  each (T18); Muninn `TESTING1.md` version drift fixed (T19); Huginn TESTING1 scenarios redefined (T20);
  Muninn's `Plugin 2 Harness.md` + `tool-skill-strategy.md` archived with tombstone → Huginn's harness
  doc (ruling 7); model-roster material archived — Muninn's `Standing Qwen prompt.txt` +
  `Never Try To Teach A Pig To Sing.md`, **plus the roster paragraphs inside the handovers** (ruling 9,
  ADR-21, ADR-20); empty dirs deleted (ruling 10, T21); the `isDesktopOnly` supersession **text** only,
  no code change (ruling 11, ADR-35).
- **Process gates:** Phase 3 triage tables, **Muninn's first, then Huginn's, each approved separately**;
  Phase 4 execution only after written approval; **archive→delete is a later human-approved step, never
  the executor's** (rulings 12, 13); Phase 2 starts with Muninn, no code touched (ruling 14, done).
- **Receipts or nothing:** a claim needs pasted terminal output; **every file cited in a triage table,
  tombstone, or Design Report must be a measured `git ls-tree`/`git grep` line from the repo, never a
  name remembered from context**; committed-doc claims are ghosts until measured (T23, the rule that
  closed T23 by measurement).
- **No commits, version bumps, release cuts, or tags without Dan's explicit authorization; ask before
  pushing.**

## Consequences

- The two ghost-name classes are recorded, not run down: T22 (the two Muninn qwen verdict docs I quoted
  do not exist; `git grep -in "12b" HEAD` in Muninn → 0 hits), T26 (the "Scenario A superseded" claim is
  not in the repo), and the three names `Handover 2026-11-14.md:6` lists as companions that are absent
  from the repo: `docs/Chat Context Architecture.md`, `docs/Code Review Plugin 2.txt`,
  `docs/Huginn Plugin 2 Memory Feedback Loop.md` (the guide is tracked as
  `Memory Feedback Loop Implementation Guide.md`) [R].
- `docs/decisions/` currently exists as an empty placeholder in both projects (git cannot track empty
  dirs; ruling 10, T21).
- The ADR set in Huginn is this file's set: 36 ADRs recorded 2026-11-16, numbered from 1, cross-referencing
  Muninn's 37, no copying of facts.

## Sources

`/home/danf/Projects/Document Rationalisation.md`;
`/tmp/opencode/rationalisation/rulings-2026-11-16.md` (rulings 1–14 verbatim);
`/tmp/opencode/rationalisation/phase1-inventory.md`;
`/tmp/opencode/rationalisation/docket-2026-11-16.md` T3, T16–T21, T22, T23, T26;
`git ls-tree -r --name-only HEAD -- docs` in both projects, measured [R]; Muninn ADR-6, ADR-21.

**Cross-references:** Muninn ADR-6, Muninn ADR-21, ADR-20, ADR-21, ADR-25, ADR-31, ADR-35.
