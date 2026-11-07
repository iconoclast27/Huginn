// =============================================================================
// Huginn — Memory Kinds
// src/memory/kinds.ts
//
// Typed wrappers over VaultMemoryStore for the three supported memory kinds.
// Each kind shares the same append-only Markdown store but uses its own file
// and prompt framing.
// =============================================================================

import { VaultMemoryStore, type MemoryEntry, type MemoryStorage, type MemoryReadOptions } from './store.ts';

const MEMORY_DIR = 'Agents/Huginn/MEMORY';

export interface MemoryContext {
    /** Prose summary suitable for injection into a system prompt. */
    text: string;
}

function now(): string {
    return new Date().toISOString();
}

// -----------------------------------------------------------------------------
// Corrections memory
// -----------------------------------------------------------------------------

export interface CorrectionRecord {
    recipe?: string;
    type: 'schema-error' | 'ground-truth' | 'apply-failed' | 'refusal' | 'dispatch-error' | 'other';
    key: string;
    note: string;
}

export class CorrectionsMemory {
    private store: VaultMemoryStore;

    constructor(storage: MemoryStorage) {
        this.store = new VaultMemoryStore(storage, MEMORY_DIR);
    }

    async append(record: CorrectionRecord): Promise<void> {
        const entry: MemoryEntry = {
            date: now(),
            type: record.type,
            recipe: record.recipe,
            key: record.key,
            note: record.note,
        };
        await this.store.append('corrections.md', entry);
    }

    async getContext(recipeName?: string, limit?: number): Promise<MemoryContext> {
        const text = await this.store.readContext('corrections.md', { recipe: recipeName, limit });
        if (text.length === 0) return { text: '' };
        return {
            text: `Previous mistakes to avoid:\n${text}`,
        };
    }

    async promoted(threshold = 4): Promise<MemoryEntry[]> {
        return this.store.summarizeRecurrence('corrections.md', threshold);
    }
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

    constructor(storage: MemoryStorage) {
        this.store = new VaultMemoryStore(storage, MEMORY_DIR);
    }

    async append(record: UserMemoryRecord): Promise<void> {
        const entry: MemoryEntry = {
            date: now(),
            type: record.type,
            key: record.key,
            note: record.note,
        };
        await this.store.append('user.md', entry);
    }

    async getContext(limit?: number): Promise<MemoryContext> {
        const text = await this.store.readContext('user.md', { limit });
        if (text.length === 0) return { text: '' };
        return {
            text: `Things the user has told you:\n${text}`,
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

    constructor(storage: MemoryStorage) {
        this.store = new VaultMemoryStore(storage, MEMORY_DIR);
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
        const text = await this.store.readContext('chat-summaries.md', { limit });
        if (text.length === 0) return { text: '' };
        return {
            text: `Summaries of earlier conversations:\n${text}`,
        };
    }
}
