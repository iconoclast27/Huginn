// Huginn — Memory Feedback Loop, Step 2 (2026-11-23, Dan's tasking "Go for Step 2").
// The ranking surface: pure helpers, no vault and no Obsidian API, so fixtures can
// unit-test scoring and selection without a FakeApp beyond an in-memory entry list
// (the guide's own doctrine: read side proven before the append path moves).

import { type MemoryEntry } from './store.ts';

export interface RankedMemoryEntry extends MemoryEntry {
    /** Ranking result from `scoreEntry`; not stored, not round-tripped. */
    score: number;
}

export interface MemoryBudgets {
    /** Hard cap on how many entries retrieval may surface. */
    entryBudget: number;
    /** Approximate character cap across selected entries. */
    charBudget: number;
}

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

interface MemoryContext {
    recipeName?: string;
    scope?: string;
    keywords?: string[];
}

export function scoreEntry(
    entry: MemoryEntry,
    now: Date,
    context: MemoryContext,
    weights: MemoryWeights,
): number {
    // Days-since helper: missing stamps read as maximally old (365d floor), and the
    // decay terms are 1/(1+days) so smaller ages score higher.
    const daysSince = (iso?: string) => {
        if (!iso) return 365;
        const d = new Date(iso);
        return Math.max(0, (now.getTime() - d.getTime()) / 86400000);
    };

    let score = 0;
    score += weights.recency * (1 / (1 + daysSince(entry.date)));
    score += weights.recurrence * (entry.recurrence ?? 1);
    score += weights.usefulness * (entry.lastUseful ? 1 / (1 + daysSince(entry.lastUseful)) : 0);

    // Relevance bonus: recipe match, scope tag, per-keyword hit in key+note.
    const tagSet = new Set((entry.tags ?? []).map((t) => t.toLowerCase()));
    if (context.recipeName && entry.recipe === context.recipeName) score += weights.recipeMatch;
    if (context.scope && tagSet.has(context.scope.toLowerCase())) score += weights.scopeMatch;
    if (context.keywords) {
        for (const kw of context.keywords) {
            const hay = `${entry.key} ${entry.note}`.toLowerCase();
            if (hay.includes(kw.toLowerCase())) score += weights.keywordMatch;
        }
    }

    // Stale entries take a heavy penalty even though selectEntries filters them.
    if (entry.status === 'stale') score -= weights.stalePenalty;

    return score;
}

export function selectEntries(
    entries: MemoryEntry[],
    budgets: MemoryBudgets,
    context: MemoryContext,
    weights: MemoryWeights,
    now = new Date(),
): MemoryEntry[] {
    // Lifecycle gate: only active entries rank; stale/retired stay out.
    const active = entries.filter((e) => (e.status ?? 'active') === 'active');
    const ranked = active
        .map((e) => ({ ...e, score: scoreEntry(e, now, context, weights) }))
        .sort((a, b) => b.score - a.score);

    const selected: MemoryEntry[] = [];
    let chars = 0;
    for (const entry of ranked) {
        if (selected.length >= budgets.entryBudget) break;
        const entryChars = entry.note.length + entry.key.length + 40;
        // The first entry always fits (budget starvation shows up at the read side,
        // not as an empty retrieval).
        if (chars + entryChars > budgets.charBudget && selected.length > 0) break;
        selected.push(entry);
        chars += entryChars;
    }
    return selected;
}