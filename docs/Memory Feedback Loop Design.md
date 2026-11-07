# Huginn — Memory Feedback Loop Design

**Status:** design for post-`0.1.0-test.18`  
**Scope:** how corrections, user memory, and chat summaries are retrieved, weighted, and retired so the model actually learns instead of drowning in stale notes.

## Current state

Huginn stores three kinds of append-only memory in `Agents/Huginn/MEMORY/`:

| Kind | File | Writer | Reader |
|------|------|--------|--------|
| Corrections | `corrections.md` | harness on schema/apply/refusal failures | dispatcher + recipe renderer |
| User memory | `user-memory.md` | chat UI on explicit `Remember` commands | chat system prompt |
| Chat summaries | `chat-summaries.md` | chat UI on "Remember chat" | chat system prompt |

All three use the same `VaultMemoryStore`. Entries are Markdown notes with YAML frontmatter blocks. The `getContext(recipe?, limit)` method returns a concatenated text block of recent entries.

Current retrieval is simple:

- Corrections: filter by recipe (or all recipes), take the most recent N entries, sorted by date.
- User memory: take the most recent N entries across all recipes.
- Chat summaries: take the most recent N entries.

There is no weighting, no retirement, and no per-recipe budget. A recipe that accumulates many corrections will eventually stuff its prompt with stale failures.

## Goals

1. Make memory retrieval relevance-aware, not just recency-aware.
2. Prevent prompt bloat by enforcing a per-memory-kind token/entry budget.
3. Allow corrections to "graduate" once the model stops repeating the mistake.
4. Keep the implementation recipe-agnostic: the store does not know what a recipe is.
5. Preserve the append-only invariant: entries are never deleted, only suppressed from prompts.

## Proposed entry shape

Extend the frontmatter schema to include optional scoring fields. Existing entries without these fields keep working.

```yaml
---
date: 2026-11-07T14:32:00Z
recipe: tag-assignment
type: refusal
key: tag too vague
recurrence: 1
tags:
  - tag-assignment
  - approval
note: User rejected suggestion: tag too vague
---
```

New optional fields:

- `recurrence` (number): how many times this entry has been reinforced. Default `1`.
- `lastSeen` (ISO date): updated each time the entry is read back into a prompt. Default `date`.
- `lastUseful` (ISO date): updated when an entry is followed by a successful run that did not repeat the mistake. Used for retirement.
- `status` (string): `active`, `stale`, `retired`. Default `active`.
- `tags` (string[]): free-form labels for semantic filtering.

The store remains responsible for appending and reading. Interpretation of these fields belongs to the memory-kind wrappers (`CorrectionsMemory`, `UserMemory`, `ChatSummaryMemory`).

## Retrieval pipeline

Each memory kind implements its own `getContext(query, options)` that runs in three phases:

1. **Collect** — read all `active` entries from the file.
2. **Score** — rank by a composite score.
3. **Select** — pick entries up to a budget.

### Phase 1: Collect

Only `active` entries are candidates. `stale` and `retired` entries are kept in the file for audit but are never injected into prompts.

### Phase 2: Score

Each entry gets a score:

```
score = recencyWeight * daysSince(date)
      + recurrenceWeight * recurrence
      + usefulnessWeight * daysSince(lastUseful)
      + relevanceBonus
```

- `recencyWeight`: higher for newer entries.
- `recurrenceWeight`: entries that keep happening get a boost.
- `usefulnessWeight`: entries that recently prevented a repeat get a boost.
- `relevanceBonus`: exact recipe match or keyword/tag overlap with the current query.

The exact weights are tunable and should be exposed as constants or settings.

### Phase 3: Select

Two budgets:

- **Entry budget**: maximum number of entries returned. Default `5` for corrections, `10` for user memory, `3` for chat summaries.
- **Token budget**: rough character budget based on the target prompt size. For example, corrections may be capped at ~1500 characters so they do not dominate the recipe prompt.

Selection greedily picks the highest-scored entries until one budget is exhausted.

## Promotion, demotion, and retirement

When a correction is appended and an entry with the same `(recipe, type, key)` already exists, the existing entry is "reinforced" rather than duplicated:

- `recurrence += 1`
- `lastSeen = now`
- `status` stays `active`

This avoids duplicate lines like "User rejected suggestion: tag too vague" appearing five times.

### Demotion to stale

An entry becomes `stale` when:

- It has been injected into prompts more than `staleAfterReads` times without being reinforced, OR
- Its `lastUseful` is older than `staleAfterDays`.

Stale entries remain in the file but are no longer candidates.

### Retirement

An entry becomes `retired` when:

- It has been `stale` for longer than `retireAfterDays`, OR
- A successful recipe run explicitly signals that the mistake is resolved.

Retired entries are kept as history but never shown to the model.

### Graduation

If a recipe runs successfully N times without reinforcing a particular correction, the correction is marked `stale`. If it stays stale and the success streak continues, it graduates to `retired`.

This prevents the model from being permanently haunted by a one-time mistake.

## Per-recipe correction budgets

The `CorrectionsMemory.getContext(recipeName, limit)` call should:

1. Prefer entries whose `recipe` matches `recipeName`.
2. Fall back to generic entries (no recipe or `recipe: '*'`).
3. Respect the global token budget even if the recipe has many corrections.

If a recipe has more corrections than the budget allows, only the highest-scored ones are shown, and a header line tells the model "NN older corrections omitted."

## User memory interactions

User memories are not tied to recipes. They are framed in the chat system prompt as:

```
Things the user has told you:
- ...
```

Proposed refinements:

- Allow user memories to carry `tags` so they can be scoped. For example, a memory tagged `tag-assignment` could also be injected into the `tag-assignment` recipe prompt, not just chat.
- A memory like "Remember don't suggest tags already in the note" is relevant to chat *and* to `tag-assignment`.
- The `UserMemory.getContext()` method could accept an optional `scope` parameter.

## Chat summary interactions

Chat summaries are time-bounded context. Proposed refinements:

- A summary is only injected if its `date` is newer than the start of the current conversation.
- Summaries should mention the active note at the time they were saved, so the model knows when the context switched.
- A summary can be tagged with the model name/version, making it easier to ignore summaries from an older model.

## Integration with the harness

1. Before rendering a recipe prompt, the harness calls `corrections.getContext(recipe.metadata.name, budget)`.
2. The returned text is appended to the prompt under a fixed header.
3. After the recipe runs:
   - If schema/apply/refusal → append a correction or reinforce an existing one.
   - If success and there were active corrections for this recipe, mark them as `lastUseful = now` (or increment a success counter).

## Settings

Add tunables to `HuginnSettings`:

```typescript
export interface MemorySettings {
    correctionEntryBudget: number;
    correctionTokenBudget: number;
    staleAfterReads: number;
    staleAfterDays: number;
    retireAfterDays: number;
}
```

Defaults:

- `correctionEntryBudget`: 5
- `correctionTokenBudget`: 1500
- `staleAfterReads`: 10
- `staleAfterDays`: 30
- `retireAfterDays`: 90

## Migration

- Existing entries without `recurrence`, `status`, etc. are read as `recurrence: 1`, `status: active`.
- The first write after this design lands will add the new fields to reinforced entries.
- No migration script is needed because the store is append-only and the reader has sensible defaults.

## Open questions

1. Should successful runs automatically mark corrections as `lastUseful`, or should the user explicitly confirm a correction is resolved?
2. Should the dispatcher also consume corrections tagged for dispatch (e.g., "remember not to dispatch `tag-assignment` when the user asks about unrelated topics")?
3. Is a simple token/character budget enough, or do we need a real tokenizer?
4. Should retired entries be moved to a separate archive file to keep `corrections.md` short?
5. How do we surface to the user that an old correction is no longer being shown?
6. Should user memories be allowed to expire like corrections?

## Recommended next step

Keep this as a design doc. The first implementation after `0.1.0-test.18` smoke-test approval should be the scoring/read pipeline, with no change to the append path. Once read-side scoring is proven with fixtures, add reinforcement and retirement.
