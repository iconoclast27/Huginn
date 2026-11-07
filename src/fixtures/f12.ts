// =============================================================================
// Huginn — F12: Vault Memory Store
// src/fixtures/f12.ts
//
// Exercises the shared VaultMemoryStore and all three memory kinds with a fake
// in-memory storage backend. Verifies append, context read, and recurrence
// promotion.
//
// Run: npx tsx src/fixtures/f12.ts
// =============================================================================

import { VaultMemoryStore, type MemoryStorage, type MemoryEntry } from '../memory/store.ts';
import { CorrectionsMemory, UserMemory, ChatSummaryMemory } from '../memory/kinds.ts';

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

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F12 FAIL: ${msg}`);
}

async function main(): Promise<void> {
    console.log('[F12] vault memory store and memory kinds');

    const storage = new FakeStorage();
    const store = new VaultMemoryStore(storage, 'Agents/Huginn/MEMORY');

    // S1: append/read a generic entry.
    await store.append('corrections.md', {
        date: '2026-11-07T12:00:00Z',
        type: 'schema-error',
        recipe: 'task-extraction',
        key: 'used tasks instead of todos',
        note: 'Model returned a tasks array; the required field is todos.',
    });
    const context = await store.readContext('corrections.md', { recipe: 'task-extraction', limit: 5 });
    assert(context.includes('Model returned a tasks array'), 'S1 context should include the note');
    assert(context.includes('task-extraction'), 'S1 context should include recipe name');
    console.log('[F12] PASS: S1 generic append and read');

    // S2: recurrence promotion threshold.
    for (let i = 0; i < 4; i++) {
        await store.append('corrections.md', {
            date: `2026-11-07T12:0${i + 1}:00Z`,
            type: 'schema-error',
            recipe: 'task-extraction',
            key: 'used tasks instead of todos',
            note: `Repeated mistake ${i + 1}.`,
        });
    }
    const promoted = await store.summarizeRecurrence('corrections.md', 5);
    assert(promoted.length >= 1, 'S2 should promote recurring pattern');
    const first = promoted[0];
    assert(first.recurrence === 5, `S2 recurrence count should be 5 (1+4), got ${first.recurrence}`);
    console.log('[F12] PASS: S2 recurrence promotion');

    // S3: corrections memory wrapper.
    const corrections = new CorrectionsMemory(storage);
    await corrections.append({
        recipe: 'tag-assignment',
        type: 'ground-truth',
        key: 'duplicate tag suggested',
        note: 'Model proposed a tag already present in frontmatter.',
    });
    const cc = await corrections.getContext('tag-assignment', 5);
    assert(cc.text.includes('Previous mistakes to avoid'), 'S3 corrections wrapper should frame context');
    assert(cc.text.includes('tag-assignment'), 'S3 corrections context should mention recipe');
    console.log('[F12] PASS: S3 corrections memory wrapper');

    // S4: user memory wrapper.
    const userMemory = new UserMemory(storage);
    await userMemory.append({
        type: 'remember',
        key: 'preferred model',
        note: 'User prefers qwen2.5:14b for capable tasks.',
    });
    const uc = await userMemory.getContext(5);
    assert(uc.text.includes('Things the user has told you'), 'S4 user memory should frame context');
    assert(uc.text.includes('qwen2.5:14b'), 'S4 user memory should include stored fact');
    console.log('[F12] PASS: S4 user memory wrapper');

    // S5: chat summary memory wrapper.
    const chatSummary = new ChatSummaryMemory(storage);
    await chatSummary.append({
        key: 'home-note-discussion',
        note: 'User asked about restructuring the Home note; suggested actionable TODOs.',
    });
    const sc = await chatSummary.getContext(5);
    assert(sc.text.includes('Summaries of earlier conversations'), 'S5 chat summary should frame context');
    assert(sc.text.includes('Home note'), 'S5 chat summary should include stored summary');
    console.log('[F12] PASS: S5 chat summary memory wrapper');

    // S6: reading context for a different recipe filters correctly.
    const otherContext = await store.readContext('corrections.md', { recipe: 'link-suggestion', limit: 5 });
    assert(!otherContext.includes('task-extraction'), 'S6 other recipe context should not include task-extraction entries');
    console.log('[F12] PASS: S6 recipe filtering');

    console.log('[F12] VERDICT: GREEN');
}

void main();
