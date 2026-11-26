// =============================================================================
// Huginn Fixture H-f40 — user memory scope: a tagged memory is surfaced when
// the scope names its tag (Memory Feedback Loop, guide fixture F29
// re-signified per T13 to H-f40)
// src/fixtures/f40.ts
//
// Authored from the Memory Feedback Loop acts (Muninn docket addenda
// twenty-eighth through thirty-first — Dan's 2026-11-23 taskings) and the
// recovered guide (Huginn history 0a066d7, Step 9 fixture F29; the scope
// parameter landed with the guide's Step 7 caller update, docket addendum
// thirty-first). Scope earns the scopeMatch bonus (1.5) and rides as a
// keyword (0.5 when the note names it); ranking lifts it, nothing filters.
//
// GREEN-first legs, written justification: the scope signature and ranking
// landed 2026-11-23 under tasking; this fixture records the landed contract.
//
// Run: npx tsx src/fixtures/f40.ts
// =============================================================================

import { VaultMemoryStore, type MemoryStorage, type MemoryEntry } from '../memory/store.ts';
import { UserMemory } from '../memory/kinds.ts';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F40 FAIL: ${msg}`);
}

class FakeStorage implements MemoryStorage {
    files = new Map<string, string>();
    async read(path: string): Promise<string> {
        if (!this.files.has(path)) throw new Error(`File not found: ${path}`);
        return this.files.get(path)!;
    }
    async write(path: string, content: string): Promise<void> {
        this.files.set(path, content);
    }
    async exists(path: string): Promise<boolean> {
        return this.files.has(path);
    }
}

{
    const storage = new FakeStorage();
    const store = new VaultMemoryStore(storage, 'Agents/Huginn/MEMORY');

    // Seeded at the store seam: the kinds' record shape carries no tags, so the
    // tagged memory rides a store-level append (the file is the shared corpus).
    const taggedNote = 'Prefers tags from the controlled vocabulary.';
    const untaggedNote = 'Prefers capital letters in file names.';
    await store.append('user.md', {
        date: '2025-11-20T00:00:00.000Z',
        type: 'remember',
        key: 'tag-vocab',
        note: taggedNote,
        recurrence: 1,
        status: 'active',
        tags: ['tag-assignment'],
    } as MemoryEntry);
    await store.append('user.md', {
        date: '2025-11-21T00:00:00.000Z',
        type: 'remember',
        key: 'caps',
        note: untaggedNote,
        recurrence: 1,
        status: 'active',
    } as MemoryEntry);

    const user = new UserMemory(storage);

    // -----------------------------------------------------------------------
    // S1 — scope asked for: the tagged memory is surfaced and lifted first.
    // -----------------------------------------------------------------------
    {
        const ctx = await user.getContext('tag-assignment', 5);
        assert(ctx.text.includes(taggedNote), 'scope tag-assignment must surface the tagged memory');
        assert(ctx.text.indexOf(taggedNote) < ctx.text.indexOf(untaggedNote),
            'the scope-matched memory must rank above the scopeless one (recency alone put the untagged first)');
        console.log('[F40] PASS: S1 tagged memory surfaced and lifted by scope');
    }

    // -----------------------------------------------------------------------
    // S2 — scope not asked for: the old surface keeps both memories (ranking
    // reorders, retrieval stays open — bonus not gate, the guide's class).
    // -----------------------------------------------------------------------
    {
        const ctx = await user.getContext(undefined, 5);
        assert(ctx.text.includes(untaggedNote) && ctx.text.includes(taggedNote),
            'no scope: both active memories still ride the retrieval');
        console.log('[F40] PASS: S2 scopeless retrieval keeps both (bonus not gate)');
    }
}

console.log('[F40] VERDICT: GREEN');