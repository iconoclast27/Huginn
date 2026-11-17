# ADR-20: Handovers and test reports are committed to the repo once superseded — history must live in the history; from 2026-11-16 they are archive material

**Status:** Accepted (retrospective; recorded 2026-11-16); destination ruling 2026-11-16
**Ruled:** Dan, 2026-11-08 (the convention change); Dan, 2026-11-16 (ruling 3: handovers go into the archive).

## Context

For two days the repo carried chores saying "leave handover note uncommitted as requested"
(`fb90ecf`, `c3c30a1`). The rule's origin turned out to be a mis-paraphrase: "we'll commit that with the
next commit" was heard as "never commit a handover".

## Decision

- **Handovers and test reports are committed to the repo once superseded** (ruled 2026-11-08); the
  uncommitted doctrine is retired, and its origin is recorded as a mis-paraphrase.
- From 2026-11-16: handovers are **archive material**, not canonical docs. A handover is a live record
  that becomes tombstoned history when superseded. The untracked `docs/Handover 2026-11-15.md` is the
  current live record and is archive material.

## Consequences

- The committed handover lineage is the mining base for the Design Report:
  `HANDOVER - 2026-11-06.md` (92 lines), `HANDOVER - 2026-11-07.md` (131), `HANDOVER - 2026-11-08.md`
  (91), `Handover 2026-11-10 Scenario F.md` (99), `Handover 2026-11-13.md` (148),
  `Handover 2026-11-14.md` (144), `Architect Response To Handover 2026-11-15.md` (72).
- **Ghost finding recorded:** `Handover 2026-11-14.md:6` names three companions that are **not in the
  repo**: `docs/Chat Context Architecture.md`, `docs/Code Review Plugin 2.txt`,
  `docs/Huginn Plugin 2 Memory Feedback Loop.md`. The guide is tracked as
  `Memory Feedback Loop Implementation Guide.md`; the other two are ghosts (docket finding (a)).
- The archive path (ADR-32) carries the tombstone rule: "Archived YYYY-MM-DD. Superseded by <doc>. Not
  authoritative." Deletion is a later human-approved step, never the executor's.

## Sources

Commits `fb90ecf`, `c3c30a1` (2026-11-07, the dead doctrine's artifacts), `0c8948c` (2026-11-08,
"session records for 2026-11-07/08 — handovers and test report");
`docs/HANDOVER - 2026-11-08.md:5` (the convention change, verbatim);
`/tmp/opencode/rationalisation/rulings-2026-11-16.md` ruling 3; `git status --porcelain` →
`?? docs/Handover 2026-11-15.md` [R].

**Cross-references:** Muninn ADR-6 (sealed records immune), ADR-32, ADR-36.
