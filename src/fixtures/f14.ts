// =============================================================================
// Huginn — F14: User memory commands
// src/fixtures/f14.ts
//
// Verifies that explicit user memory commands are parsed and that the parsed
// context is suitable for injection into the chat system prompt.
//
// Run: npx tsx src/fixtures/f14.ts
// =============================================================================

import { parseUserMemoryCommand } from '../memory/commands.ts';
import { UserMemory } from '../memory/kinds.ts';
import type { MemoryEntry, MemoryStorage } from '../memory/store.ts';

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
    if (!cond) throw new Error(`F14 FAIL: ${msg}`);
}

async function main(): Promise<void> {
    console.log('[F14] user memory commands');

    // S1: parse "remember" command.
    const r1 = parseUserMemoryCommand('Remember that I prefer qwen2.5:14b for capable tasks.');
    if (r1 === null || r1.type !== 'remember') throw new Error('F14 FAIL: S1 should parse remember command');
    assert(r1.note.includes('qwen2.5:14b'), 'S1 should capture the memory note');
    console.log('[F14] PASS: S1 remember command');

    // S2: parse "don't" / avoid command.
    const r2 = parseUserMemoryCommand("Don't suggest tags that are already in the note.");
    if (r2 === null || r2.type !== 'avoid') throw new Error('F14 FAIL: S2 should parse avoid command');
    assert(r2.note.includes('tags'), 'S2 should capture avoid note');
    console.log('[F14] PASS: S2 avoid command');

    // S3: parse preference command.
    const r3 = parseUserMemoryCommand('I prefer concise one-sentence answers.');
    assert(r3 !== null && r3.type === 'preference', 'S3 should parse preference command');
    console.log('[F14] PASS: S3 preference command');

    // S4: non-command returns null.
    const r4 = parseUserMemoryCommand('What is the capital of France?');
    assert(r4 === null, 'S4 should not parse ordinary question');
    console.log('[F14] PASS: S4 non-command rejected');

    // S5: user memory wrapper appends and reads context.
    const storage = new FakeStorage();
    const userMemory = new UserMemory(storage);
    await userMemory.append({ type: 'remember', key: 'preferred model', note: 'User prefers qwen2.5:14b for capable tasks.' });
    const ctx = await userMemory.getContext(5);
    assert(ctx.text.includes('Things the user has told you'), 'S5 context should be framed for prompt injection');
    assert(ctx.text.includes('qwen2.5:14b'), 'S5 context should include stored memory');
    console.log('[F14] PASS: S5 user memory context');

    console.log('[F14] VERDICT: GREEN');
}

void main();
