// =============================================================================
// Huginn Fixture F10 — Chat state sanitization
// =============================================================================
// Polices the serialize/deserialize helpers used by the chat sidebar view.
// The view state must round-trip through Obsidian's workspace state without
// leaking invalid roles or dropping valid history.
// =============================================================================

import { emptyChatState, sanitizeChatState, type HuginnChatState } from '../ui/chat-state.ts';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F10 FAIL: ${msg}`);
}

const valid: HuginnChatState = {
    messages: [
        { role: 'system', content: 'system context' },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' },
    ],
    activeNotePath: 'notes/gamma.md',
    activeNoteContent: 'note body',
};

// S1: valid state round-trips unchanged.
const s1 = sanitizeChatState(valid);
assert(s1 !== null, 'valid state should not sanitize to null');
assert(s1!.messages.length === 3, 'valid state keeps all messages');
assert(s1!.activeNotePath === 'notes/gamma.md', 'valid state keeps path');
assert(s1!.activeNoteContent === 'note body', 'valid state keeps content');
console.log('[F10] PASS: S1 valid state round-trips');

// S2: null/undefined input returns null (caller should fall back to emptyChatState).
const s2Null = sanitizeChatState(null);
const s2Undef = sanitizeChatState(undefined);
assert(s2Null === null, 'null input should sanitize to null');
assert(s2Undef === null, 'undefined input should sanitize to null');
console.log('[F10] PASS: S2 null/undefined input sanitizes to null');

// S3: messages with invalid roles are filtered out.
const dirty = {
    messages: [
        { role: 'user', content: 'keep me' },
        { role: 'invalid', content: 'drop me' },
        { role: 'assistant', content: 'keep me too' },
        { content: 'no role' },
    ],
    activeNotePath: 'notes/alpha.md',
    activeNoteContent: null,
};
const s3 = sanitizeChatState(dirty);
assert(s3 !== null, 'dirty state should not sanitize to null');
assert(s3!.messages.length === 2, 'invalid roles are filtered');
assert(s3!.messages[0].content === 'keep me', 'first valid message retained');
assert(s3!.messages[1].content === 'keep me too', 'second valid message retained');
console.log('[F10] PASS: S3 invalid message roles are filtered');

// S4: non-string activeNotePath is ignored.
const badPath = {
    messages: [],
    activeNotePath: 123,
    activeNoteContent: 456,
};
const s4 = sanitizeChatState(badPath);
assert(s4 !== null, 'bad path state should not sanitize to null');
assert(s4!.activeNotePath === null, 'non-string path defaults to null');
assert(s4!.activeNoteContent === null, 'non-string content defaults to null');
console.log('[F10] PASS: S4 non-string path/content default to null');

// S5: emptyChatState() produces a clean default.
const empty = emptyChatState();
assert(empty.messages.length === 0, 'empty state has no messages');
assert(empty.activeNotePath === null, 'empty state has null path');
assert(empty.activeNoteContent === null, 'empty state has null content');
console.log('[F10] PASS: S5 emptyChatState returns clean default');

console.log('[F10] VERDICT: GREEN');
