# ADR-16: Stop semantics — Stop closes the approval modal and aborts the in-flight request; Stop parity is the op-loop rule

**Status:** Accepted (retrospective; recorded 2026-11-16); parity ruling 2026-11-15
**Ruled:** 2026-11-07 (`5be252d`), race fix 2026-11-07 (`0a066d7`), parity 2026-11-15 (R10/R11, `c4b103e`).

## Context

A user pressing Stop mid-run must stop the model **and** not leave a modal hanging. Later, the op loop
raises the same question at every gate: the loop must stop on the same signal, with the same semantics,
mid-chain.

## Decision

- The **Stop button closes the approval modal and aborts in flight** (`5be252d`). The modal's
  `closeActive()` is the shared control (`src/ui/approval-modal.ts:34`, `activeModal` `:26`).
- An aborted gate resolves `null` ⇒ not approved (ADR-4), and the abort race was fixed at `test.19`
  (`0a066d7`).
- **Stop parity (R10/R11, 2026-11-15):** in the op loop, Stop behaves identically at every stage — no
  stage keeps running after Stop; no retry on decline.
- **New chat** clears the transcript without reloading Obsidian (ADR-9).

## Consequences

- As-built seams: `src/ui/chat-view.ts` `handleSend` `:223`, `ApprovalModal.closeActive()` `:233`;
  `src/harness/approval-gate.ts` `signal?.aborted` `:50`, `resolve(null)` `:44`; abort routing in
  `src/llm/client.ts` `:68-72` (ADR-23).
- **First-green justification, written (R14):** the Stop/parity leg is first-green with no pre-change
  red, because measurement found **no production bug** on the UI Stop path (ADR-27). The guard exists
  to prevent regression, and the written justification is the record.
- The loop's Stop leg is fixture f35 (ADR-34).

## Sources

Commits `5be252d` (2026-11-07), `0a066d7` (2026-11-07);
`docs/Serial Contextual Operations Design (Ruled).md` R10/R11 (first commit 2026-11-15, `c4b103e`);
`src/ui/chat-view.ts:223, 233`; `src/harness/approval-gate.ts:44, 50`; `src/ui/approval-modal.ts:26, 34`.

**Cross-references:** ADR-4, ADR-9, ADR-23, ADR-27, ADR-28, ADR-34.
