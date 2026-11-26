// =============================================================================
// Huginn — Memory Kinds
// src/memory/kinds.ts
//
// Typed wrappers over VaultMemoryStore for the supported memory kinds — user
// notes and chat summaries. Conform 2026-11-26: the corrections kind was
// dropped by Dan's act (Restart Ledger D-12) and demolished with the old loop.
// =============================================================================

import { VaultMemoryStore, type MemoryEntry, type MemoryStorage, type MemoryReadOptions } from './store.ts';
import { selectEntries, DEFAULT_MEMORY_WEIGHTS, type MemoryBudgets, type MemoryWeights } from './ranker.ts';
import { type MemorySettings } from '../settings.ts';

const MEMORY_DIR = 'Agents/Huginn/MEMORY';

// Memory Feedback Loop, Step 3 (2026-11-23, Dan's tasking "Go for steps 1-3"): per-kind budgets for
// ranked retrieval. The guide's per-kind defaults, verbatim.
const DEFAULT_USER_BUDGETS: MemoryBudgets = { entryBudget: 10, charBudget: 2000 };
const DEFAULT_CHAT_BUDGETS: MemoryBudgets = { entryBudget: 3, charBudget: 1500 };

/** Loop Step 8 plumbing (2026-11-23, docket addendum thirty-second): when a kind is constructed
 *  with the settings sub-object, its budgets and the three tunable weights ride the retrieval;
 *  the consts above stay the fallback so callers without settings keep the shipped surface. */
function weightsOf(settings: MemorySettings | undefined): MemoryWeights {
    if (!settings) return DEFAULT_MEMORY_WEIGHTS;
    return { ...DEFAULT_MEMORY_WEIGHTS, recency: settings.recencyWeight, recurrence: settings.recurrenceWeight, usefulness: settings.usefulnessWeight };
}

export interface MemoryContext {
    /** Prose summary suitable for injection into a system prompt. */
    text: string;
}

function now(): string {
    return new Date().toISOString();
}

// -----------------------------------------------------------------------------
// User memory
// -----------------------------------------------------------------------------

export interface UserMemoryRecord {
    type: 'remember' | 'avoid' | 'preference' | 'fact';
    key: string;
    note: string;
}

export class UserMemory {
    private store: VaultMemoryStore;
    private settings: MemorySettings | undefined;

    constructor(storage: MemoryStorage, settings?: MemorySettings) {
        this.store = new VaultMemoryStore(storage, MEMORY_DIR);
        this.settings = settings;
    }

    async append(record: UserMemoryRecord): Promise<void> {
        const entry: MemoryEntry = {
            date: now(),
            type: record.type,
            key: record.key,
            note: record.note,
        };
        // Loop Step 5: a repeated user instruction reinforces rather than duplicates.
        const existing = await this.store.findActiveEntry('user.md', entry);
        if (existing) {
            await this.store.reinforce('user.md', existing);
        } else {
            await this.store.append('user.md', entry);
        }
    }

    async getContext(scope?: string, limit?: number): Promise<MemoryContext> {
        // Loop Step 7: scope lands with the caller update; a tagged memory earns the scope
        // bonus (and the scope itself as a keyword), lifting it in the ranking.
        const entries = await this.store.readEntries('user.md');
        const budgets = {
            entryBudget: limit ?? this.settings?.userEntryBudget ?? DEFAULT_USER_BUDGETS.entryBudget,
            charBudget: this.settings?.userCharBudget ?? DEFAULT_USER_BUDGETS.charBudget,
        };
        const selected = selectEntries(entries, budgets, { scope, keywords: scope ? [scope] : undefined }, weightsOf(this.settings));
        if (selected.length === 0) return { text: '' };
        return {
            text: 'Things the user has told you:\n' + selected.map((e) => `- ${e.note}`).join('\n') + '\n',
        };
    }
}

// -----------------------------------------------------------------------------
// Chat summary memory
// -----------------------------------------------------------------------------

export interface ChatSummaryRecord {
    key: string;
    note: string;
}

export class ChatSummaryMemory {
    private store: VaultMemoryStore;
    private settings: MemorySettings | undefined;

    constructor(storage: MemoryStorage, settings?: MemorySettings) {
        this.store = new VaultMemoryStore(storage, MEMORY_DIR);
        this.settings = settings;
    }

    async append(record: ChatSummaryRecord): Promise<void> {
        const entry: MemoryEntry = {
            date: now(),
            type: 'chat-summary',
            key: record.key,
            note: record.note,
        };
        await this.store.append('chat-summaries.md', entry);
    }

    async getContext(limit?: number): Promise<MemoryContext> {
        // Muninn adr-55.md (Accepted 2026-11-25) is the saved-memory law: the injector takes
        // no session instant. Volume is the selector's budgets; preference is the ranker's
        // recency weight (`src/memory/ranker.ts`).
        const entries = await this.store.readEntries('chat-summaries.md');
        const budgets = {
            entryBudget: limit ?? this.settings?.summaryEntryBudget ?? DEFAULT_CHAT_BUDGETS.entryBudget,
            charBudget: this.settings?.summaryCharBudget ?? DEFAULT_CHAT_BUDGETS.charBudget,
        };
        const selected = selectEntries(entries, budgets, {}, weightsOf(this.settings));
        if (selected.length === 0) return { text: '' };
        return {
            text: 'Summaries of earlier conversations:\n' + selected.map((e) => `- ${e.note}`).join('\n') + '\n',
        };
    }
}
