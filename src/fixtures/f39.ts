// =============================================================================
// Huginn Fixture H-f39 — retrieval budgets bite: entry cap and char cap
// (Memory Feedback Loop, guide fixture F28 re-signified per T13 to H-f39)
// src/fixtures/f39.ts
//
// Authored from the Memory Feedback Loop acts (Muninn docket addenda
// twenty-eighth through thirty-first — Dan's 2026-11-23 taskings) and the
// recovered guide (Huginn history 0a066d7, Step 9 fixture F28: "with a tiny
// char budget, only the highest-scored entry is returned"). The first-entry-
// always-fits rule is recorded law in ranker.ts (docket addendum twenty-ninth
// seam: budget starvation shows at the read side, never as empty retrieval).
//
// GREEN-first legs, written justification: selectEntries landed 2026-11-23
// under tasking; this fixture records the budget contract at the ranker seam.
//
// Run: npx tsx src/fixtures/f39.ts
// =============================================================================

import { type MemoryEntry } from '../memory/store.ts';
import { selectEntries, DEFAULT_MEMORY_WEIGHTS, type MemoryBudgets } from '../memory/ranker.ts';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F39 FAIL: ${msg}`);
}

const FIXED_DATE = '2025-06-01T00:00:00.000Z';
const now = new Date('2026-01-01T00:00:00.000Z');

function mkEntry(recipe: string, note: string): MemoryEntry {
    return { date: FIXED_DATE, type: 'schema-error', recipe, key: `k-${recipe}`, note, recurrence: 1, status: 'active' };
}

// ---------------------------------------------------------------------------
// S1 — char budget: three long corrections, a tiny budget returns only the
// top-scored one (the guide's F28), and it is the recipe-matched one.
// ---------------------------------------------------------------------------
{
    const long = 'x'.repeat(900);
    const entries = [
        mkEntry('alpha', `alpha failure ${long}`),
        mkEntry('beta', `beta failure ${long}`),
        mkEntry('gamma', `gamma failure ${long}`),
    ];
    const budgets: MemoryBudgets = { entryBudget: 5, charBudget: 10 }; // tiny char budget
    const selected = selectEntries(entries, budgets, { recipeName: 'beta' }, DEFAULT_MEMORY_WEIGHTS);
    assert(selected.length === 1, `a tiny char budget must still return the first entry (never empty): got ${selected.length}`);
    assert(selected[0].recipe === 'beta',
        `the survivor of a starved char budget must be the highest-scored entry: got ${selected[0].recipe}, expected beta`);
    console.log('[F39] PASS: S1 tiny char budget returns only the top-scored entry');
}

// ---------------------------------------------------------------------------
// S2 — entry budget: with char headroom, the entry cap decides the count.
// ---------------------------------------------------------------------------
{
    const short = [mkEntry('alpha', 'a'), mkEntry('beta', 'b'), mkEntry('gamma', 'c')];
    const budgets: MemoryBudgets = { entryBudget: 2, charBudget: 100000 };
    const selected = selectEntries(short, budgets, {}, DEFAULT_MEMORY_WEIGHTS);
    assert(selected.length === 2, `entryBudget 2 caps three active entries at 2: got ${selected.length}`);
    console.log('[F39] PASS: S2 entry budget caps the retrieval width');
}

console.log('[F39] VERDICT: GREEN');