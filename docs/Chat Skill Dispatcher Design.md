# Huginn — Chat Skill Dispatcher Design

**Status:** design for post-`0.1.0-test.18`  
**Scope:** how `ChatSkillDispatcher` decides which recipe to run from a user message, and how it should handle ambiguity, multi-intent, and context.

## Current state

`ChatSkillDispatcher` sends a single `/api/chat` request with:

- A system prompt listing available recipes and their triggers.
- Rules asking for a JSON object `{ recipeName, targetPath, reason }`.
- Optional corrections context.

It returns `DispatchResult { intent: DispatchIntent | null, raw: string | null }`.

The chat UI then finds the recipe by name and calls `HuginnHarness.run()`.

## Goals

1. Keep dispatch fast and deterministic for common requests.
2. Handle ambiguous requests gracefully: ask the user instead of guessing.
3. Support multi-intent requests eventually, even if the first cut does not.
4. Use context (active note, summaries, user memory) without stuffing the dispatcher prompt.
5. Make dispatch failures teachable (wrong recipe, bad target path).

## Proposed intent model

Extend the dispatcher output from a single intent to a small union:

```typescript
export type DispatchIntent =
    | { kind: 'run'; recipeName: string; targetPath: string; reason: string }
    | { kind: 'clarify'; question: string }
    | { kind: 'none'; reason: string };
```

### `run`

Run a single recipe against a target note. This is the current behavior.

### `clarify`

The dispatcher asks the user a follow-up question instead of guessing. Examples:

- User: "Tag it." → Dispatcher: "Which note should I tag?"
- User: "Summarize." → Dispatcher: "Do you want a summary of the active note, or of a different note?"

The chat UI renders the question as an assistant message. The user's next reply is sent back through the dispatcher with the prior clarification as context.

### `none`

No recipe matches. Fall back to plain chat. The reason is logged but not shown to the user unless in verbose mode.

## Context-aware dispatch

The dispatcher currently knows:

- The user message.
- The active note path (or `null`).
- The list of available recipes.
- Corrections context.

Add optional context blocks:

1. **Active note snippet** — first N characters of the active note body, so the dispatcher can tell whether a pronoun like "it" or "this note" refers to something specific.
2. **Recent chat summary** — one or two sentences from `chat-summaries.md` if the conversation has a remembered summary.
3. **User memory tags** — user memories tagged with recipe names, so the dispatcher knows preferences like "use `note-summary` when I ask about long notes."

All context blocks are optional and truncated to keep the dispatch request small.

## Dispatch prompt structure

```
You are Huginn, a dispatcher inside Obsidian. Choose the best skill for the user's request.

Active note: <path or "none">
Available skills:
- tag-assignment: User wants a tag suggestion for a note that lacks one.
- title-suggestion: User wants a better title for a note.
...

Recent memory:
- User prefers concise answers.

Rules:
- If the request is ambiguous, return {"kind":"clarify","question":"..."}.
- If no skill matches, return {"kind":"none","reason":"..."}.
- Otherwise return {"kind":"run","recipeName":"...","targetPath":"...","reason":"..."}.
- targetPath must be a vault-relative note path ending in .md.
- Do not return markdown or commentary.
```

## Two-pass dispatch for complex requests

For a future multi-intent mode, the dispatcher could run in two passes:

1. **Classify** — decide whether the request is a single skill, a multi-skill chain, or a plain chat question.
2. **Resolve** — if single skill, return `run`; if multi-skill, return a `plan` intent that the harness executes sequentially with a single approval gate summarizing all steps.

This is deferred. The first implementation should only handle single-intent `run` and `clarify`.

## Teaching from dispatch failures

When the dispatcher picks the wrong recipe or an invalid path, the user currently has no way to give feedback. Proposed additions:

1. If the chat UI detects the recipe ran but the user says "that's not what I wanted," offer a **"Teach Huginn"** button.
2. Clicking it appends a correction entry:
   ```yaml
   ---
   date: 2026-11-07T14:32:00Z
   recipe: '*'
   type: dispatch-error
   key: user wanted summary, got tag-assignment
   note: For message "tell me about this" the dispatcher chose tag-assignment instead of note-summary.
   ---
   ```
3. The dispatcher prompt includes dispatch corrections so the model is less likely to repeat the mistake.

This requires extending `CorrectionsMemory` to support `recipe: '*'` for cross-recipe lessons.

## Target path resolution

Current rules for `targetPath`:

1. If the user names a path explicitly, use it.
2. If the user says "this note" / "it" / "the active note," use the active note path.
3. If no active note exists and no path is named, return `clarify`.

Add fuzzy path matching:

- If the user names a note without `.md`, append it (already done in the gatherer, but the dispatcher should also normalize).
- If the path does not exist in the vault, the recipe's ground-truth check will catch it, but the dispatcher can optionally warn early.

## UI behavior

- When the dispatcher returns `clarify`, the assistant bubble shows the question and the input box is ready for the answer.
- When the dispatcher returns `none`, the UI falls back to plain chat without mentioning dispatch unless verbosity is verbose.
- When the dispatcher returns `run`, the existing flow runs: status message (if verbose), harness run, result render.

## Settings

Add an optional setting:

- **Dispatcher mode**: `single` (current) / `clarifying` (can ask questions).

Default: `clarifying`.

## Migration and compatibility

- The existing `{ recipeName, targetPath, reason }` output is a subset of the new `run` intent. Backward-compatible parsing is trivial.
- The `DispatchResult` interface changes, but callers only need to switch on `intent.kind`.
- No changes to recipes are needed.

## Open questions

1. How many clarification turns should be allowed before falling back to plain chat?
2. Should the dispatcher ever call the LLM twice (classify then resolve) for the cost of accuracy?
3. Should dispatch corrections be mixed with recipe corrections, or kept in a separate `dispatch-corrections.md`?
4. How do we prevent the dispatcher from over-fitting to the active note and ignoring explicit paths?
5. Should the dispatcher use the same model tier as the recipe (`fast` vs `capable`), or always use `fast`?

## Recommended next step

Keep this as a design doc. The first implementation after `0.1.0-test.18` smoke-test approval should add only the `clarify` intent and active-note-snippet context, with fixtures. Multi-intent and dispatch corrections should be separate follow-ups.
