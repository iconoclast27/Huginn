# ADR-10: Chat skill dispatch — a strict three-field JSON envelope; unmatched messages fall back to plain chat

**Status:** Accepted (retrospective; recorded 2026-11-16), with a ledgered silence deviation
**Ruled:** 2026-11-06 (`8513794`); envelope shape as-built.

## Context

User chat messages must route to recipes when they match, and to plain chat when they do not. The
design doc (`docs/Chat Skill Dispatcher Design.md`, first commit 2026-11-07) proposed intent
modeling — `clarify`, `none`, multi-intent — none of which shipped.

## Decision

- `ChatSkillDispatcher` sends one `/api/chat` request with a system prompt listing recipes and
  triggers, and demands **only** a raw JSON object with three fields:
  `recipeName`, `targetPath`, `reason` (`src/chat/dispatch.ts:66`).
- `parseDispatch` (`:80-106`) strips a markdown fence (`:82-84`), requires all three fields to be
  non-empty strings (`:88-93`), and returns `null` when no loaded recipe matches the name (`:96`).
- `null` intent ⇒ plain chat. The command palette stays **single-shot** (R13, 2026-11-15).
- **Deviation ledgered:** a failed dispatch is silent. The user sees a plain chat reply with no
  explanation that the recipe was rejected. This is the first red seam of the op loop (ADR-34, f31).

## Consequences

- `clarify` / `none` dispatch intents are **not implemented** [R] — design-only (ADR-31).
- As-built chat path: `src/ui/chat-view.ts` `handleSend` at `:223`, `dispatcher.dispatch` at `:266`,
  `runSkillFromChat` at `:305`, params `{ targetPath, titleQuery: recipe.metadata.name, verbosity }`
  at `:324`.
- `f11` guards the envelope (legs S1–S8; S2 = unknown recipe rejected). `f11` is **re-pointed as the
  refusal guard** when f31 lands, not deleted (ADR-34).

## Sources

Commit `8513794` (2026-11-06, "dispatch user requests to Huginn skills from chat");
`docs/Chat Skill Dispatcher Design.md` (164 lines, first commit 2026-11-07);
`src/chat/dispatch.ts:66, 80-106`; `src/ui/chat-view.ts:223, 266, 305, 324`; `src/fixtures/f11.ts:53-88`.

**Cross-references:** ADR-28 (R13), ADR-34, ADR-31.
