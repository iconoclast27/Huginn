# ADR-5: Risk classes as-built — `read-only` skips the gate with `noop` apply, `suggest` is always gated

**Status:** Accepted (retrospective; recorded 2026-11-16); the policy-knob design is Accepted as design, unimplemented, superseded in part by name
**Ruled:** 2026-11-06 (as-built distinction), design 2026-11-07 (`2704f1d`); `batch-suggest` / `auto-apply` / `approvalPolicy` / `autoApplyConfidence` superseded by name, Dan 2026-11-15 (R13).

## Context

Recipes declare `riskClass` in frontmatter. The design doc wanted risk class to be a real policy knob:
friction reduction for low-risk high-confidence suggestions, batched suggestions, user overrides. The
as-built shipped only a binary distinction.

## Decision

- `riskClass: read-only` → `Apply Method: noop`, gate skipped, result rendered inline.
- `riskClass: suggest` → `ObsidianApprovalGate.approve()` always runs before apply.
- No batch approval, no auto-apply, no confidence-based bypass. **Superseded by name:** `batch-suggest`,
  `auto-apply`, `approvalPolicy`, `autoApplyConfidence` are dead terms (R13, 2026-11-15). Human
  oversight is not a knob.

## Consequences

- The shipped inventory is **six** bundled recipes: `tag-assignment` (`bundled.ts:19/22`),
  `title-suggestion` (`:109/112`), `link-suggestion` (`:183/186`) — all `suggest`;
  `task-extraction` (`:273/276`), `note-summary` (`:345/348`), `related-notes` (`:410/413`) — all
  `read-only`.
- The op loop inherits the binary: `write` is always gated and names a recipe (ADR-28, R3/R8).
- Ground-truth drops must be stripped before the gate renders (ADR-12), and drop notices must display
  unconditionally: `groundTruthDropped` is produced at `harness.ts:197` and has **no UI consumer**
  [R] — ledgered, owed.

## Sources

`docs/Risk Class and Approval Model Design.md:13-18` (first commit 2026-11-07);
`src/recipes/bundled.ts:19, 22, 109, 112, 183, 186, 273, 276, 345, 348, 410, 413`;
`docs/Serial Contextual Operations Design (Ruled).md` R3/R13 (2026-11-15);
`src/harness/harness.ts:135-141, 197`.

**Cross-references:** ADR-4 (the gate), ADR-28 (R3/R8/R13), Muninn ADR-31.
