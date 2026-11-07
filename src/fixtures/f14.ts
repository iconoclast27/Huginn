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

    // S2: "remember don't ..." captures the negative preference as a remember note.
    const r2 = parseUserMemoryCommand("Remember don't suggest tags that are already in the note.");
    if (r2 === null || r2.type !== 'remember') throw new Error('F14 FAIL: S2 should remember a negative preference');
    assert(r2.note.includes("don't suggest tags that are already in the note"), 'S2 should capture full negative preference');
    console.log('[F14] PASS: S2 remember negative preference');

    // S3: bare "don't" / avoid command is NOT captured without "Remember".
    const r3 = parseUserMemoryCommand("Don't suggest tags that are already in the note.");
    assert(r3 === null, 'S3 bare "don\'t" should not be captured as memory');
    console.log('[F14] PASS: S3 bare "don\'t" not captured');

    // S4: preference without Remember is rejected.
    const r4 = parseUserMemoryCommand('I prefer concise one-sentence answers.');
    assert(r4 === null, 'S4 preference without Remember should be rejected');
    console.log('[F14] PASS: S4 preference without Remember rejected');

    // S5: ordinary chat is rejected.
    const r5 = parseUserMemoryCommand('What is the capital of France?');
    assert(r5 === null, 'S5 should not parse ordinary question');
    console.log('[F14] PASS: S5 non-command rejected');

    // S6: user memory wrapper appends and reads context.
    const storage = new FakeStorage();
    const userMemory = new UserMemory(storage);
    await userMemory.append({ type: 'remember', key: 'preferred model', note: 'User prefers qwen2.5:14b for capable tasks.' });
    const ctx = await userMemory.getContext(5);
    assert(ctx.text.includes('Things the user has told you'), 'S6 context should be framed for prompt injection');
    assert(ctx.text.includes('qwen2.5:14b'), 'S6 context should include stored memory');
    console.log('[F14] PASS: S6 user memory context');

    console.log('[F14] VERDICT: GREEN');
}

void main();
