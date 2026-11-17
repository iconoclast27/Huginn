# ADR-3: Muninn discovery — readiness poll, quiet per-poll warnings, chat-model warmup on focus

**Status:** Accepted (retrospective; recorded 2026-11-16), with the warmup naming drift ledgered
**Ruled:** 2026-11-06 (`a9b071b`, `f659881`); as-built warmup fires at initialization, not on focus.

## Context

Huginn cannot run without Plugin 1's door. The design question: how does it find Muninn, what does the
user see when Muninn is absent, and what does it do about a cold model.

## Decision

- Poll for Muninn, gate all harness wiring on `getMuninnApi()` being present.
- **Quiet per-poll warnings** — no chatter on every poll (ruling in `f659881`).
- Warm up the chat model behind a setting, best-effort, never blocking the user.
- A missing-Muninn notice is a manual-smoke scenario (TESTING1 Scenario C; Scenario C PASSED at
  `0.1.0-test.20` per `docs/TestReport.md`).

## Consequences

- As-built: the probe is `src/main.ts:222-225` (`typeof muninn.getMuninnApi !== 'function'` → null);
  wiring at `:119-123` and `:242-250`; warmup fires **at initialization**, inside the readiness wiring
  (`:148-149` calling `warmupChatModel()` at `:203-215`). The setting name `warmupOnFocus` is a legacy
  name: the UI description says "Send a trivial chat request when Huginn initializes" (`main.ts:448`)
  and `docs/TESTING1.md:318` states the as-built fact verbatim — "The warmup toggle triggers on Huginn
  initialization, not on UI focus or keystrokes" [R]. The naming drift is ledgered (Design Report §19);
  the docs do not hide it.
- Warmup is **best-effort**: `main.ts:213-215` logs a warmup failure and does not block the user; the
  loop treats "model kept out of memory" as an expected case (ruled, §6 Warmup, `c4b103e`).
- Console-level warnings stay console-level: nothing reaches the model, and silence is not a
  user-facing disclosure. The notice path is the scenario Dan smokes.
- A warm model shortens the first chain; chain length budget is a prompt fact (ADR-34).

## Sources

Commits `a9b071b` (2026-11-06, "Muninn readiness poll, recipe chooser, and chat model warmup") and
`f659881` (2026-11-06, "quiet per-poll Muninn warnings, add fixtures npm script");
`docs/TestReport.md:6`; `docs/TESTING1.md` Scenario C; `src/main.ts:222-225, 148-149, 203-215`;
`src/settings.ts:20-27`.
