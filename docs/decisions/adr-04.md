# ADR-4: The approval gate — one-off Approve/Reject on a full serialized diff; refusals become `refusal` corrections

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-06 (`54f4d53`, `9da4cd9`); refusal ledger as-built.

## Context

The doctrine demands human review before any vault mutation. The design question: what the user sees,
what the decision space is, and what happens to a rejection.

## Decision

- The gate is `ObsidianApprovalGate.approve()`; the UI is an Obsidian modal showing the **full diff**,
  serialized so the modal can render changes (`9da4cd9`), with a one-off Approve/Reject decision.
- Rejection reasons are written to corrections memory as `refusal` entries.
- An aborted gate resolves `null` and is treated as **not approved**, never as approval.

## Consequences

- As-built seams: `src/harness/approval-gate.ts` `approve` at `:18`, `signal?.aborted` at `:50`,
  `resolve(null)` on abort at `:44`; `src/ui/approval-modal.ts` `activeModal` at `:26`, `closeActive()`
  at `:34`, `onClose` at `:131`; `src/harness/harness.ts` gate call at `:135-141`,
  `approval === null → approved = null` at `:142-143`, refusal append at `:154-162`.
- Batch approval and policy knobs are **not** admitted (ADR-31; superseded by name under R13, 2026-11-15).
- **Disclosure at the gate is owed:** `ApprovalRequest` gains `contextUsed` (path + deterministic
  machinery-taken excerpt); the v1 `snippet` field is stricken (ADR-28, R6/R7). The as-built modal has
  no disclosure field — the seam is `approval-gate.ts:18` (fixture f32, ADR-34).
- Stop parity at the gate is ruled: Stop closes the modal and aborts in flight (ADR-16).

## Sources

Commits `54f4d53` (2026-11-06, "add Obsidian approval modal and gate for diff review") and `9da4cd9`
(2026-11-06, "serialize full DiffResult so modal can render changes");
`docs/Risk Class and Approval Model Design.md:18` (first commit 2026-11-07);
`src/harness/approval-gate.ts:18, 44, 50`; `src/ui/approval-modal.ts:26, 34, 131`;
`src/harness/harness.ts:135-141, 142-143, 154-162`.

**Cross-references:** Muninn ADR-31 (one gate, no write-class in v1); ADR-28 (R6/R7/R10/R11).
