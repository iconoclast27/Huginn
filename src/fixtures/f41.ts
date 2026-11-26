// =============================================================================
// Huginn Fixture H-f41 — saved chat summaries are durable until deleted: a
// conversation begun later does NOT hide an earlier saved summary (Memory
// Feedback Loop, guide fixture F30 re-signified per T13 to H-f41)
// src/fixtures/f41.ts
//
// Authored from the Memory Feedback Loop acts (Muninn docket addenda
// twenty-eighth through thirty-first — Dan's 2026-11-23 taskings). CONFORMED
// 2026-11-26 (Dan's authorization "Do the adr-55 conforms") to Muninn adr-55.md
// (Accepted 2026-11-25): the sinceDate cut pre-ranking
// asserted the opposite of the saved-memory durability law, so the leg now
// expects both saved summaries to ride a conversation begun after the older
// one was saved. The recency preference that cut carried is a ranking device
// and lives in the ranker's recency weight, not in a window.
// Seam note, measured and recorded: ChatMessage carries no timestamp at HEAD,
// so the caller-side date was a UI wiring leg (manual smoke class, ADR-22);
// the kinds seam pins the injector itself.
//
// Conformed legs, written justification: adr-55.md's law plus the injector
// act landing with this fixture (committed 2026-11-26 under Dan's "Do the
// adr-55 conforms"). Red earned against committed HEAD first (git-archive
// scratch, this fixture copied onto the HEAD tree): HEAD's getContext(sinceDate?,
// limit?) answers the conformed getContext(5) call with 5 in the sinceDate slot,
// whose filter coerces every date entry against a number and cuts all entries,
// so S1's first assert (:78, 'the newer summary must be surfaced') throws
// (measured: exit 1). The f12/f15 call-site conforms are the mechanical
// signature ride (positional sinceDate disappears); typecheck-green is their
// guard, the asserts they carry predate this law and stay riding.
//
// Run: npx tsx src/fixtures/f41.ts
// =============================================================================

import { VaultMemoryStore, type MemoryStorage, type MemoryEntry } from '../memory/store.ts';
import { ChatSummaryMemory } from '../memory/kinds.ts';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F41 FAIL: ${msg}`);
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

    const oldNote = 'Old summary: discussed the alpha note.';
    const newNote = 'Newer summary: discussed the beta note.';
    await store.append('chat-summaries.md', {
        date: '2020-01-01T00:00:00.000Z',
        type: 'chat-summary',
        key: 'notes/alpha.md',
        note: oldNote,
        recurrence: 1,
        status: 'active',
    } as MemoryEntry);
    await store.append('chat-summaries.md', {
        date: '2025-11-20T00:00:00.000Z',
        type: 'chat-summary',
        key: 'notes/beta.md',
        note: newNote,
        recurrence: 1,
        status: 'active',
    } as MemoryEntry);

    const chat = new ChatSummaryMemory(storage);

    // -----------------------------------------------------------------------
    // S1 — durability (adr-55.md): a conversation begun 2025-06-01 must not
    // hide the 2020 summary. Both saved summaries ride until deleted; the
    // recency weight orders them, it never excludes them.
    // -----------------------------------------------------------------------
    {
        const ctx = await chat.getContext(5);
        assert(ctx.text.includes(newNote), 'the newer summary must be surfaced');
        assert(ctx.text.includes(oldNote),
            'the older saved summary must stay reachable, not be windowed out');
        assert(ctx.text.indexOf(newNote) < ctx.text.indexOf(oldNote),
            'the newer summary ranks first: recency is a ranking device');
        console.log('[F41] PASS: S1 saved summaries are durable, recency only ranks');
    }

    // -----------------------------------------------------------------------
    // S2 — volume is bounded by the budget, never by a date window: at an
    // entry budget of 1 only the recency-preferred summary rides, and the cut
    // is the budget's act (H-f15 keeps riding alongside).
    // -----------------------------------------------------------------------
    {
        const ctx = await chat.getContext(1);
        assert(ctx.text.includes(newNote) && !ctx.text.includes(oldNote),
            'entry budget 1: only the recency-preferred summary rides');
        console.log('[F41] PASS: S2 the budget bounds volume, no window does');
    }
}

console.log('[F41] VERDICT: GREEN');