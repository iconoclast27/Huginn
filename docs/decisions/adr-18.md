# ADR-18: Report-back verbosity is model-facing, never a display filter

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-07 (`75075c3`), all-recipes shape 2026-11-15 (`3f34605`), R4 ruling 2026-11-15 (`c4b103e`).

## Context

Dan's smoke test found no discernible difference between verbosity settings, and suspected the skill
prompts override the setting: "the prompts for the skills discourage verbosity anyway, so might be
overriding it" (`docs/TestReport.md:8`, Scenario I, inconclusive). The design question: is verbosity a
rendering knob, or an instruction to the model.

## Decision

- Verbosity is a **model-facing instruction**: it is passed into the prompt, and it never filters what
  the user sees.
- It became an explicit recipe input on **all six** shipped recipes, and plain chat adapts response
  length to it (`3f34605`).
- R4 (2026-11-15): **verbosity is model-facing, never a display filter.**

## Consequences

- As-built: `ReportBackVerbosity = 'minimal' | 'normal' | 'verbose'` (`src/settings.ts:11`), default
  `verbose` (`:26`); the chat view reads it (`chat-view.ts:54`), passes it into the controller
  (`:296`) and into recipe params (`:324`); `renderRunResult` (`:354`) renders the full result, with a
  minimal-path message at `:364` — presentation, not suppression of the model's output.
- Scenario I stays **inconclusive** in the record; the loop re-tests verbosity as a prompt fact.
- The loop inherits the rule: the op prompt carries verbosity, the UI does not censor.

## Sources

Commits `75075c3` (2026-11-07, "task-extraction verbosity") and `3f34605` (2026-11-15, "verbosity input
on all six shipped recipes; plain chat adapts response length");
`docs/Serial Contextual Operations Design (Ruled).md` R4; `docs/TestReport.md:8`;
`src/settings.ts:11, 26`; `src/ui/chat-view.ts:54, 296, 324, 354, 364`.

**Cross-references:** ADR-20 (smoke record), ADR-28, ADR-25 (Scenario I redefinition owed).
