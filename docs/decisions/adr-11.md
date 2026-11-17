# ADR-11: Stream chat responses and retry once on ground-truth failure

**Status:** Accepted, **partly superseded by ADR-12** (recorded 2026-11-16)
**Ruled:** 2026-11-07 (`db73c1d`); superseded in part 2026-11-07 (`f2def43`).

## Context

The first chat client was a single blocking request. The proposal: stream `/api/chat` responses, and
give the model one retry when a ground-truth check fails.

## Decision

- Stream chat responses (stays in force).
- Retry once on ground-truth failure (**superseded** by ADR-12: ground-truth failures are vault state,
  not retried).

## Consequences

- Streaming as-built: `src/llm/client.ts` `chat()` at `:67`, `readStreamingResponse(res, controller.signal)`
  at `:102`.
- The surviving streaming rule matters for Stop parity: the abort must reach the streaming loop on
  both legs (ADR-23, `69a4b45`).
- The retry half is dead. Nothing in `src/harness/harness.ts` retries a ground-truth failure [R].

## Sources

Commit `db73c1d` (2026-11-07, "stream Ollama chat responses and retry once on ground-truth failure");
commit `f2def43` (2026-11-07, superseding half); `src/llm/client.ts:67, 102`.

**Cross-references:** ADR-12, ADR-23, ADR-16.
