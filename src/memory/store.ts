// =============================================================================
// Huginn — Vault Memory Store
// src/memory/store.ts
//
// Append-only Markdown memory store for model learning: corrections, user
// notes, and chat summaries. Entries are Markdown frontmatter blocks separated
// by horizontal rules so they stay human-readable and easy to append.
// =============================================================================

export interface MemoryEntry {
    /** ISO-ish timestamp; new Date().toISOString() is fine. */
    date: string;
    /** Which recipe/skill this entry relates to, if any. */
    recipe?: string;
    /** Classification: schema-error, ground-truth, apply-failed, refusal, user-note, chat-summary, etc. */
    type: string;
    /** One-line summary for recurrence matching. */
    key: string;
    /** Human-readable prose explaining what happened and the correct behavior. */
    note: string;
    /** Optional recurrence count if already known. */
    recurrence?: number;
    // Memory Feedback Loop, Step 1 (2026-11-23, Dan's groundbreaking tasking): the read-side
    // scoring/selection fields. The append path is untouched — these ride reads; entries written
    // before the loop parse with the defaults below and re-emit only when defined.
    /** ISO-ish timestamp: last surfaced in retrieval (round-tripped as text). */
    lastSeen?: string;
    /** ISO-ish timestamp: last surfaced and credited (round-tripped as text). */
    lastUseful?: string;
    /** Lifecycle; parseEntries defaults a missing status to 'active'. */
    status?: 'active' | 'stale' | 'retired';
    /** Optional one-line comma list (`tags: a, b`), split into an array in code. */
    tags?: string[];
}

export interface MemoryStorage {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
}

export interface MemoryReadOptions {
    recipe?: string;
    limit?: number;
}

export class VaultMemoryStore {
    constructor(
        private storage: MemoryStorage,
        private basePath: string,
    ) {}

    async append(path: string, entry: MemoryEntry): Promise<void> {
        const fullPath = this.resolvePath(path);
        const block = this.formatEntry(entry);
        let content = await this.readRaw(fullPath);
        if (content.length > 0 && !content.endsWith('\n')) {
            content += '\n';
        }
        if (content.length > 0) {
            content += '\n---\n\n';
        }
        content += block;
        await this.storage.write(fullPath, content);
    }

    async readEntries(path: string): Promise<MemoryEntry[]> {
        const fullPath = this.resolvePath(path);
        const content = await this.readRaw(fullPath);
        if (content.trim().length === 0) return [];
        return this.parseEntries(content);
    }

    async readContext(path: string, opts: MemoryReadOptions = {}): Promise<string> {
        const fullPath = this.resolvePath(path);
        const content = await this.readRaw(fullPath);
        if (content.trim().length === 0) return '';
        const entries = this.parseEntries(content);
        let filtered = entries;
        if (opts.recipe) {
            filtered = filtered.filter((e) => e.recipe === opts.recipe);
        }
        const limit = opts.limit ?? 10;
        const selected = filtered.slice(-limit);
        if (selected.length === 0) return '';
        return selected
            .map((e) => `- ${e.type}${e.recipe ? ` (${e.recipe})` : ''}: ${e.note}`)
            .join('\n') + '\n';
    }

    async summarizeRecurrence(path: string, threshold = 4): Promise<MemoryEntry[]> {
        const fullPath = this.resolvePath(path);
        const content = await this.readRaw(fullPath);
        if (content.trim().length === 0) return [];
        const entries = this.parseEntries(content);
        const counts = new Map<string, number>();
        for (const entry of entries) {
            const k = this.recurrenceKey(entry);
            counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        const promoted = new Set<string>();
        const result: MemoryEntry[] = [];
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            const k = this.recurrenceKey(entry);
            const count = counts.get(k) ?? 0;
            if (count >= threshold && !promoted.has(k)) {
                promoted.add(k);
                result.unshift({ ...entry, recurrence: count });
            }
        }
        return result;
    }

    private resolvePath(path: string): string {
        return `${this.basePath.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    }

    private async readRaw(path: string): Promise<string> {
        if (!(await this.storage.exists(path))) return '';
        return this.storage.read(path);
    }

    private formatEntry(entry: MemoryEntry): string {
        const lines = ['---'];
        lines.push(`date: ${entry.date}`);
        lines.push(`type: ${entry.type}`);
        if (entry.recipe) lines.push(`recipe: ${entry.recipe}`);
        lines.push(`key: ${entry.key}`);
        if (entry.recurrence !== undefined) lines.push(`recurrence: ${entry.recurrence}`);
        if (entry.lastSeen) lines.push(`lastSeen: ${entry.lastSeen}`);
        if (entry.lastUseful) lines.push(`lastUseful: ${entry.lastUseful}`);
        if (entry.status) lines.push(`status: ${entry.status}`);
        if (entry.tags && entry.tags.length > 0) lines.push(`tags: ${entry.tags.join(', ')}`);
        lines.push('---');
        lines.push(entry.note.trim());
        return lines.join('\n');
    }

    private parseEntries(content: string): MemoryEntry[] {
        const entries: MemoryEntry[] = [];
        const normalized = content.replace(/\r\n?/g, '\n');
        let cursor = 0;
        while (cursor < normalized.length) {
            // Find the next leading `---\n`.
            const fenceStart = normalized.indexOf('---\n', cursor);
            if (fenceStart === -1) break;
            const fmStart = fenceStart + 4;
            const fenceEnd = normalized.indexOf('\n---', fmStart);
            if (fenceEnd === -1) break;
            const fm = normalized.slice(fmStart, fenceEnd).trim();
            const noteStart = fenceEnd + 4;
            let noteEnd = normalized.indexOf('\n---\n', noteStart);
            if (noteEnd === -1) noteEnd = normalized.length;
            const note = normalized.slice(noteStart, noteEnd).trim();
            const meta = this.parseFrontmatter(fm);
            cursor = noteEnd === normalized.length ? noteEnd : noteEnd + 5;
            if (!meta.type || !meta.key) continue;
            // Step 1 parse defaults (guide Step 1.4): status missing -> 'active', recurrence
            // missing -> 1, lastSeen missing -> the entry's date, lastUseful stays undefined;
            // tags is the first-cut one-line comma list, split here (multi-line lists deferred).
            const date = typeof meta.date === 'string' ? meta.date : new Date().toISOString();
            const statusRaw = typeof meta.status === 'string' ? meta.status : '';
            const tagsRaw = typeof meta.tags === 'string' ? meta.tags : '';
            entries.push({
                date,
                type: String(meta.type),
                recipe: typeof meta.recipe === 'string' ? meta.recipe : undefined,
                key: String(meta.key),
                note,
                recurrence: typeof meta.recurrence === 'number' ? meta.recurrence : 1,
                lastSeen: typeof meta.lastSeen === 'string' ? meta.lastSeen : date,
                lastUseful: typeof meta.lastUseful === 'string' ? meta.lastUseful : undefined,
                status: statusRaw === 'stale' || statusRaw === 'retired'
                    ? statusRaw as 'active' | 'stale' | 'retired'
                    : 'active',
                tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter((t) => t.length > 0) : undefined,
            });
        }
        return entries;
    }

    private parseFrontmatter(text: string): Record<string, string | number | boolean> {
        const result: Record<string, string | number | boolean> = {};
        for (const rawLine of text.split('\n')) {
            const line = rawLine.replace(/\r$/, '').trim();
            if (line.length === 0) continue;
            const colon = line.indexOf(': ');
            if (colon === -1) continue;
            const key = line.slice(0, colon).trim();
            const value = line.slice(colon + 2).trim();
            if (value === 'true') result[key] = true;
            else if (value === 'false') result[key] = false;
            else if (/^-?\d+$/.test(value)) result[key] = Number(value);
            else result[key] = value;
        }
        return result;
    }

    private now(): string {
        return new Date().toISOString();
    }

    async reinforce(path: string, base: MemoryEntry): Promise<void> {
        // Loop Step 5 (append-only first cut, the guide's recommendation): a reinforcement
        // record rides the file instead of rewriting it; the ranker treats the newer record
        // as the current truth for this recurrence key.
        await this.append(path, {
            ...base,
            date: this.now(),
            recurrence: (base.recurrence ?? 1) + 1,
            lastSeen: this.now(),
        });
    }

    async findActiveEntry(path: string, match: MemoryEntry): Promise<MemoryEntry | undefined> {
        // Newest active record under the recurrence key: the record the ranker would treat
        // as current, used by the kinds to decide append-vs-reinforce.
        const entries = await this.readEntries(path);
        const key = this.recurrenceKey(match);
        return entries.slice().reverse().find((e) => this.recurrenceKey(e) === key && (e.status ?? 'active') === 'active');
    }

    private recurrenceKey(entry: MemoryEntry): string {
        return [entry.type, entry.recipe ?? '_none_', entry.key].join('|');
    }
}
