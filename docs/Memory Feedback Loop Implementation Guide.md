# Huginn — Memory Feedback Loop Implementation Guide

**For:** a follow-up implementer (9b local model or free-tier LLM)  
**Status:** unblocked; does not depend on the active-note smoke test  
**Goal:** make Huginn's three memory kinds (corrections, user memory, chat summaries) relevance-aware, budget-limited, and self-cleaning, so the model stops ignoring memories and stops drowning in stale entries.

## What already exists

- `src/memory/store.ts` — append-only Markdown store with frontmatter entries.
- `src/memory/kinds.ts` — typed wrappers: `CorrectionsMemory`, `UserMemory`, `ChatSummaryMemory`.
- `src/harness/harness.ts` — writes corrections after schema/apply/refusal failures and reads them before rendering a recipe.
- `src/chat/chat.ts` — injects user memory and chat-summary context into the chat system prompt.
- `src/settings.ts` — plugin settings object.

## High-level plan

Implement the read-side scoring/selection pipeline first. Do **not** change the append path until the read side is proven with fixtures. This keeps the risk low and lets you verify behavior without touching the harness write path.

## Step 1 — Extend the entry data model

Edit `src/memory/store.ts`:

1. Extend `MemoryEntry` to include the new optional scoring fields:

```typescript
export interface MemoryEntry {
    date: string;
    recipe?: string;
    type: string;
    key: string;
    note: string;
    recurrence?: number;
    lastSeen?: string;
    lastUseful?: string;
    status?: 'active' | 'stale' | 'retired';
    tags?: string[];
}
```

2. Update `parseEntries` so it reads these fields. The existing `parseFrontmatter` returns `string | number | boolean`; you will need to parse arrays. The simplest approach is to read `tags` as a YAML-looking list on one line, e.g. `tags: [tag-assignment, approval]`, and split it. Alternatively, extend parsing to handle multi-line lists. For the first cut, keep `tags` as an optional comma-separated string in the file and split it in code.

3. Update `formatEntry` to emit the new fields when they are defined. Keep entries readable:

```typescript
if (entry.recurrence !== undefined) lines.push(`recurrence: ${entry.recurrence}`);
if (entry.lastSeen) lines.push(`lastSeen: ${entry.lastSeen}`);
if (entry.lastUseful) lines.push(`lastUseful: ${entry.lastUseful}`);
if (entry.status) lines.push(`status: ${entry.status}`);
if (entry.tags && entry.tags.length > 0) lines.push(`tags: ${entry.tags.join(', ')}`);
```

4. Update `parseEntries` defaults: if `status` is missing, treat it as `active`. If `recurrence` is missing, treat it as `1`. If `lastSeen` is missing, use `date`. If `lastUseful` is missing, leave it undefined.

## Step 2 — Add a memory ranker

Create `src/memory/ranker.ts`. This is a pure helper so the 9b can unit-test it without the vault.

```typescript
export interface RankedMemoryEntry extends MemoryEntry {
    score: number;
}

export interface MemoryBudgets {
    entryBudget: number;
    charBudget: number;
}

export function scoreEntry(
    entry: MemoryEntry,
    now: Date,
    context: { recipeName?: string; scope?: string; keywords?: string[] },
    weights: MemoryWeights,
): number {
    // Use days-since helpers. Smaller is better, so invert.
    const daysSince = (iso?: string) => {
        if (!iso) return 365;
        const d = new Date(iso);
        return Math.max(0, (now.getTime() - d.getTime()) / 86400000);
    };

    let score = 0;
    score += weights.recency * (1 / (1 + daysSince(entry.date)));
    score += weights.recurrence * (entry.recurrence ?? 1);
    score += weights.usefulness * (entry.lastUseful ? (1 / (1 + daysSince(entry.lastUseful))) : 0);

    // Relevance bonus
    const tagSet = new Set((entry.tags ?? []).map((t) => t.toLowerCase()));
    if (context.recipeName && entry.recipe === context.recipeName) score += weights.recipeMatch;
    if (context.scope && tagSet.has(context.scope.toLowerCase())) score += weights.scopeMatch;
    if (context.keywords) {
        for (const kw of context.keywords) {
            const hay = `${entry.key} ${entry.note}`.toLowerCase();
            if (hay.includes(kw.toLowerCase())) score += weights.keywordMatch;
        }
    }

    // Penalize stale entries heavily (they should normally be filtered out before ranking).
    if (entry.status === 'stale') score -= weights.stalePenalty;

    return score;
}

export function selectEntries(
    entries: MemoryEntry[],
    budgets: MemoryBudgets,
    context: { recipeName?: string; scope?: string; keywords?: string[] },
    weights: MemoryWeights,
    now = new Date(),
): MemoryEntry[] {
    const active = entries.filter((e) => (e.status ?? 'active') === 'active');
    const ranked = active
        .map((e) => ({ ...e, score: scoreEntry(e, now, context, weights) }))
        .sort((a, b) => b.score - a.score);

    const selected: MemoryEntry[] = [];
    let chars = 0;
    for (const entry of ranked) {
        if (selected.length >= budgets.entryBudget) break;
        const entryChars = entry.note.length + entry.key.length + 40;
        if (chars + entryChars > budgets.charBudget && selected.length > 0) break;
        selected.push(entry);
        chars += entryChars;
    }
    return selected;
}
```

Add weights and budget interfaces in the same file:

```typescript
export interface MemoryWeights {
    recency: number;
    recurrence: number;
    usefulness: number;
    recipeMatch: number;
    scopeMatch: number;
    keywordMatch: number;
    stalePenalty: number;
}

export const DEFAULT_MEMORY_WEIGHTS: MemoryWeights = {
    recency: 1.0,
    recurrence: 0.5,
    usefulness: 1.0,
    recipeMatch: 2.0,
    scopeMatch: 1.5,
    keywordMatch: 0.5,
    stalePenalty: 5.0,
};
```

## Step 3 — Replace `readContext` with ranked retrieval

Edit `src/memory/kinds.ts`:

1. Import `selectEntries`, `DEFAULT_MEMORY_WEIGHTS`, and budget types from `src/memory/ranker.ts`.
2. Add default budgets to each kind:

```typescript
const DEFAULT_CORRECTION_BUDGETS = { entryBudget: 5, charBudget: 1500 };
const DEFAULT_USER_BUDGETS = { entryBudget: 10, charBudget: 2000 };
const DEFAULT_CHAT_BUDGETS = { entryBudget: 3, charBudget: 1500 };
```

3. Update each kind's `getContext` to use the ranker.

`CorrectionsMemory.getContext` should become:

```typescript
async getContext(recipeName?: string, limit?: number): Promise<MemoryContext> {
    const entries = await this.store.readEntries('corrections.md'); // you will add this
    const budgets = { ...DEFAULT_CORRECTION_BUDGETS, entryBudget: limit ?? DEFAULT_CORRECTION_BUDGETS.entryBudget };
    const selected = selectEntries(
        entries,
        budgets,
        { recipeName },
        DEFAULT_MEMORY_WEIGHTS,
    );
    if (selected.length === 0) return { text: '' };

    const omitted = entries.filter((e) => (e.status ?? 'active') === 'active').length - selected.length;
    let header = 'Previous mistakes to avoid:\n';
    if (omitted > 0) {
        header += `(only the most relevant ${selected.length} of ${omitted + selected.length} active corrections shown)\n`;
    }
    return {
        text: header + selected.map((e) => `- ${e.type}${e.recipe ? ` (${e.recipe})` : ''}: ${e.note}`).join('\n') + '\n',
    };
}
```

`UserMemory.getContext` becomes:

```typescript
async getContext(scope?: string, limit?: number): Promise<MemoryContext> {
    const entries = await this.store.readEntries('user.md');
    const budgets = { ...DEFAULT_USER_BUDGETS, entryBudget: limit ?? DEFAULT_USER_BUDGETS.entryBudget };
    const selected = selectEntries(
        entries,
        budgets,
        { scope, keywords: scope ? [scope] : undefined },
        DEFAULT_MEMORY_WEIGHTS,
    );
    if (selected.length === 0) return { text: '' };
    return {
        text: 'Things the user has told you:\n' + selected.map((e) => `- ${e.note}`).join('\n') + '\n',
    };
}
```

`ChatSummaryMemory.getContext` becomes:

```typescript
async getContext(sinceDate?: string, limit?: number): Promise<MemoryContext> {
    const entries = await this.store.readEntries('chat-summaries.md');
    const budgets = { ...DEFAULT_CHAT_BUDGETS, entryBudget: limit ?? DEFAULT_CHAT_BUDGETS.entryBudget };
    const selected = selectEntries(
        entries,
        budgets,
        { keywords: sinceDate ? ['conversation'] : undefined },
        DEFAULT_MEMORY_WEIGHTS,
    );
    if (selected.length === 0) return { text: '' };
    return {
        text: 'Summaries of earlier conversations:\n' + selected.map((e) => `- ${e.note}`).join('\n') + '\n',
    };
}
```

## Step 4 — Add `readEntries` to the store

Edit `src/memory/store.ts`:

Add a new public method:

```typescript
async readEntries(path: string): Promise<MemoryEntry[]> {
    const fullPath = this.resolvePath(path);
    const content = await this.readRaw(fullPath);
    if (content.trim().length === 0) return [];
    return this.parseEntries(content);
}
```

The existing `readContext` method can either be removed or kept as a backward-compatible helper that calls `readEntries` and formats them. It is currently used by `getContext` in the old wrappers; once wrappers move to `readEntries`, you can delete the old `readContext` method and the `MemoryReadOptions` interface if they are no longer referenced.

## Step 5 — Reinforcement (no duplicates)

Edit `src/memory/kinds.ts` — add a helper to each kind, or to the store:

```typescript
async reinforceOrAppend(path: string, entry: MemoryEntry): Promise<void> {
    const entries = await this.readEntries(path);
    const candidateKey = this.recurrenceKey(entry);
    const existingIndex = entries.findIndex((e) => this.recurrenceKey(e) === candidateKey);

    if (existingIndex !== -1) {
        const existing = entries[existingIndex];
        const updated: MemoryEntry = {
            ...existing,
            recurrence: (existing.recurrence ?? 1) + 1,
            lastSeen: now(),
            note: entry.note, // keep latest explanation
        };
        entries[existingIndex] = updated;
        await this.rewrite(path, entries);
    } else {
        await this.append(path, entry);
    }
}
```

You will need to add `now()` and `recurrenceKey` helpers to the store, plus a `rewrite` method that writes the full file. Because the store is append-only for audit reasons, a safer first cut is to append a new record with incremented recurrence rather than rewriting. The ranker will see both records and treat the newer one as more relevant. Choose one approach and document it; the implementation guide here recommends **appending a reinforcement record** first to avoid rewrite bugs.

So implement `reinforce` as:

```typescript
async reinforce(path: string, entry: MemoryEntry): Promise<void> {
    await this.append(path, {
        ...entry,
        date: now(),
        recurrence: (entry.recurrence ?? 1) + 1,
        lastSeen: now(),
    });
}
```

Then in each kind's `append`, first check whether an active entry with the same recurrence key exists. If yes, call `reinforce`; if no, call `append`. For example, in `CorrectionsMemory.append`:

```typescript
async append(record: CorrectionRecord): Promise<void> {
    const entry: MemoryEntry = { date: now(), type: record.type, recipe: record.recipe, key: record.key, note: record.note };
    const existing = await this.store.findActiveEntry('corrections.md', entry);
    if (existing) {
        await this.store.reinforce('corrections.md', existing);
    } else {
        await this.store.append('corrections.md', entry);
    }
}
```

Add `findActiveEntry` to the store:

```typescript
async findActiveEntry(path: string, match: MemoryEntry): Promise<MemoryEntry | undefined> {
    const entries = await this.readEntries(path);
    const key = this.recurrenceKey(match);
    return entries.reverse().find((e) => this.recurrenceKey(e) === key && (e.status ?? 'active') === 'active');
}
```

## Step 6 — Demotion and retirement (optional first cut)

For a minimal version, skip automated stale/retirement logic. The ranker already prefers active, recent, relevant entries, so stale entries naturally fall to the bottom of the budget and are effectively ignored.

If you do implement demotion, add to `src/memory/store.ts`:

```typescript
async markStale(path: string, entry: MemoryEntry): Promise<void> {
    // Append a status update record, or rewrite the file. Recommended: append a duplicate with status: stale.
}
```

And call it from a periodic job or after a success streak. This is complex; defer it until the read/reinforce pipeline is tested.

## Step 7 — Update callers

### Harness

Edit `src/harness/harness.ts`:

The current call is:

```typescript
const corrections = this.opts.corrections
    ? await this.opts.corrections.getContext(recipe.metadata.name, 5)
    : { text: '' };
```

That already passes the recipe name. No change needed for corrections. However, after a successful run, the harness should signal usefulness to corrections that were injected for this recipe. Add a helper in `CorrectionsMemory`:

```typescript
async markUseful(recipeName: string): Promise<void> {
    // Find the most recent active correction for this recipe and append a record with lastUseful = now.
}
```

Call it in `HuginnHarness.run` after a successful apply:

```typescript
if (applyResult?.applied && this.opts.corrections) {
    await this.opts.corrections.markUseful(recipe.metadata.name);
}
```

### Chat controller

Edit `src/chat/chat.ts`:

The existing call gets user memory and chat summaries with no scope. Update it to pass the active note path as scope and the conversation start date for summaries.

Change `ChatControllerOptions` if the callers can provide scope/date. The chat view knows the active note path and the first non-system message date. Pass them in:

```typescript
export interface ChatControllerOptions {
    app: App;
    llmClient: ChatLlmClient;
    getUserMemoryContext?: (scope?: string) => Promise<string> | string;
    getChatSummaryContext?: (sinceDate?: string) => Promise<string> | string;
}
```

Then in `buildSystemPrompt`:

```typescript
const userMemory = this.opts.getUserMemoryContext ? await this.opts.getUserMemoryContext(path ?? undefined) : '';
```

In `src/ui/chat-view.ts`, update the creation of the controller to pass scope/date. Search for where `new ChatController` or `services.controller` is constructed.

Also, make the memory block even more prominent. The current prompt uses `CRITICAL — you MUST follow...`. Keep that. For user memories with tags that match the active note path or recipe scope, the ranker already surfaces them higher.

## Step 8 — Settings

Edit `src/settings.ts`:

Add a `memory` sub-object:

```typescript
export interface MemorySettings {
    correctionEntryBudget: number;
    correctionCharBudget: number;
    userEntryBudget: number;
    userCharBudget: number;
    summaryEntryBudget: number;
    summaryCharBudget: number;
    recencyWeight: number;
    recurrenceWeight: number;
    usefulnessWeight: number;
}

export interface HuginnSettings {
    ollamaUrl: string;
    ollamaChatModel: string;
    chatTimeoutMs: number;
    warmupOnFocus: boolean;
    defaultTargetPath: string;
    reportBackVerbosity: ReportBackVerbosity;
    memory: MemorySettings;
}
```

Add defaults:

```typescript
export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
    correctionEntryBudget: 5,
    correctionCharBudget: 1500,
    userEntryBudget: 10,
    userCharBudget: 2000,
    summaryEntryBudget: 3,
    summaryCharBudget: 1500,
    recencyWeight: 1.0,
    recurrenceWeight: 0.5,
    usefulnessWeight: 1.0,
};

export const DEFAULT_SETTINGS: HuginnSettings = {
    ...existingDefaults,
    memory: DEFAULT_MEMORY_SETTINGS,
};
```

Update `sanitizeSettings` to merge saved memory settings with defaults so missing fields do not break old saved data.

Plumb these settings into the memory kinds and ranker. The simplest path: pass the settings object when constructing memory kinds in `src/main.ts`, or read them from the kinds via a settings getter. For the first cut, hard-code defaults in the ranker and make settings optional; a later pass can wire the UI.

## Step 9 — Fixtures

Add at least these fixtures to `src/fixtures/` and update `package.json` `fixtures` script:

- **F26** — `scoreEntry` prefers a recipe-matched correction over a generic one.
- **F27** — `reinforce` increments recurrence instead of duplicating entries.
- **F28** — memory budget caps: with a tiny char budget, only the highest-scored entry is returned.
- **F29** — user memory scope: a memory tagged `tag-assignment` is returned when scope is `tag-assignment`.
- **F30** — chat summary `sinceDate` filtering: an old summary is ignored for a current conversation.

Each fixture should use the in-memory `FakeMemoryStorage` pattern from `f12.ts` or `f13.ts`.

## Step 10 — Update smoke-test docs

Edit `docs/TESTING1.md`:

- In Scenario G, add an expectation that repeated identical rejections are reinforced, not duplicated.
- In Scenario H, add that older chat summaries are ignored for the current conversation once a newer summary exists.
- Add a new Scenario L: after several successful recipe runs, a stale correction stops being injected.

## Verification commands

After each step, run:

```bash
npm run typecheck
npm run fixtures
npm run build
```

The final target is:

```bash
npm run typecheck && npm run fixtures && npm run build
```

all green.

## Order of work for a 9b model

1. Implement `src/memory/ranker.ts` with `scoreEntry`, `selectEntries`, and default weights.
2. Extend `MemoryEntry` and parsing/formatting in `src/memory/store.ts`; add `readEntries`.
3. Rewrite the three `getContext` methods in `src/memory/kinds.ts` to use the ranker.
4. Add `reinforce` logic to `src/memory/store.ts` and use it from the kind wrappers.
5. Update `src/harness/harness.ts` to call `markUseful` on success.
6. Update `src/chat/chat.ts` and `src/ui/chat-view.ts` to pass scope/date to memory retrieval.
7. Add settings defaults in `src/settings.ts`.
8. Add fixtures F26–F30 and update `package.json`.
9. Update `docs/TESTING1.md` and this guide if anything changes.

## Risks and notes

- Do **not** rewrite the memory file until the read/reinforce path is solid. Append-only is the safety net.
- Keep the scoring weights as constants first; expose settings only after the defaults prove useful.
- The ranker uses character budgets, not tokens. That is good enough for Ollama-sized prompts.
- If a recipe has no corrections, `getContext` returns empty text and no header is injected. Keep that behavior.
- `MemoryEntry.status` must default to `active` everywhere, or old entries will vanish from prompts.
