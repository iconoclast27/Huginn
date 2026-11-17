# ADR-23: Scenario F fixed — the abort reaches the streaming loop on both legs; the UI smoke is still owed

**Status:** Accepted (retrospective; recorded 2026-11-16); **manual smoke owed** (docket T9)
**Ruled:** diagnosis 2026-11-10, fix 2026-11-13 (`69a4b45`), Scenario F UI legs completed 2026-11-15
(`031b686`).

## Context

Dan's smoke test of `0.1.0-test.20` reported Scenario F as the only FAIL: "I am unable to find any
time, either early or late in the process where it makes a difference. It might fail the response, the
response might go ahead, but it still takes the full time and doesn't abort." The two-signal
dissociation (the client's own timeout controller vs. the user's external abort) was diagnosed
independently on 2026-11-10.

## Decision

- Route the user's abort **into** the client's controller: `signal?.addEventListener('abort',
  onExternalAbort)` fires `controller.abort()`, so the fetch and the streaming reader see one signal.
- Guard it with f27, **two legs**: S1 entry `chat()`, abort through the controller channel; S2 entry
  `complete()`, abort through the user/external channel — each leg asserting the receptor aborted, the
  loop halted at the chunk mark, and `reader.cancel()` was called.
- Red first: the fixture was rewound (the fix stashed) and run against unfixed code to earn the red at
  the intended seam before restoring the fix for green.

## Consequences

- As-built: `src/llm/client.ts` `chat()` `:67`, `AbortController` `:68`,
  `setTimeout(() => controller.abort(), timeoutMs ?? 60000)` `:69`, `onExternalAbort` `:71-72`,
  `fetch` `:75`, `readStreamingResponse(res, controller.signal)` `:102`, listener removal `:117`.
- The fix is **fixture-certified, not smoked in Obsidian** (docket T9 open) — Scenario F remains the
  scenario Dan re-smokes; TESTING1 Scenario F is being redefined for the loop (ADR-25).
- **The Gemma-era half closes out diagnosed-but-unproven**: no red receipt, no green receipt, no
  `git diff --stat` was ever produced in the Gemma run. The 11-13 arc is the certification.
- The worktree `/home/danf/Projects/Huginn-agent` and branch `agent/f-abort` no longer exist; their
  removal is attributed to qwen3.5:12b performing badly. No worktree exists today; agent work lands
  directly on `main` (the head-only worktree recipe in ADR-22 is the standing tool).

## Sources

`docs/TestReport.md:6` (the FAIL as Dan reported it, first commit 2026-11-08);
`docs/Handover 2026-11-10 Scenario F.md:8-16, 35, 94`; `docs/Handover 2026-11-13.md:52`;
commit `69a4b45` (2026-11-13; stat: `main.js` 1 line, `src/llm/client.ts` 10 lines, `src/fixtures/f27.ts`
210 added, `docs/TESTING1.md` 6 added); commit `031b686` (2026-11-15); `src/fixtures/f27.ts:17-19, 183-196`.

**Cross-references:** ADR-16 (Stop parity), ADR-11 (streaming), ADR-22 (earned red), ADR-25.
