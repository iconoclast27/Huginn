// =============================================================================
// Huginn — F15: Chat summary memory
// src/fixtures/f15.ts
//
// Verifies that the chat-summary memory kind appends, reads back context, and
// that ChatController can ask the LLM to summarize a conversation.
//
// Run: npx tsx src/fixtures/f15.ts
// =============================================================================

import { ChatController } from '../chat/chat.ts';
import { ChatSummaryMemory } from '../memory/kinds.ts';
import type { MemoryEntry, MemoryStorage } from '../memory/store.ts';
import type { ChatLlmClient, ChatMessage } from '../llm/client.ts';

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

class FakeApp {
    vault = {} as never;
    workspace = { getActiveFile: () => null } as never;
}

class FakeLlmClient implements ChatLlmClient {
    lastPrompt: ChatMessage[] | null = null;

    async chat(messages: ChatMessage[]): Promise<string | null> {
        this.lastPrompt = messages;
        return 'The user wants concise answers and prefers qwen2.5:14b.';
    }

    async complete(prompt: string): Promise<string | null> {
        return prompt;
    }
}

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F15 FAIL: ${msg}`);
}

async function main(): Promise<void> {
    console.log('[F15] chat summary memory');

    // S1: ChatSummaryMemory append and context read.
    const storage = new FakeStorage();
    const summaryMemory = new ChatSummaryMemory(storage);
    await summaryMemory.append({
        key: 'notes/gamma.md',
        note: 'User asked about tag conventions for project notes.',
    });
    const ctx = await summaryMemory.getContext(5);
    assert(ctx.text.includes('Summaries of earlier conversations'), 'S1 context should be framed for prompt injection');
    assert(ctx.text.includes('tag conventions'), 'S1 context should include stored summary');
    console.log('[F15] PASS: S1 summary memory context');

    // S2: ChatController.summarizeChat sends a summarization prompt and returns the LLM result.
    const fakeClient = new FakeLlmClient();
    const controller = new ChatController({
        app: new FakeApp() as never,
        llmClient: fakeClient,
    });
    const messages: ChatMessage[] = [
        { role: 'user', content: 'What model should I use?' },
        { role: 'assistant', content: 'For capable tasks, qwen2.5:14b is a good balance.' },
    ];
    const summary = await controller.summarizeChat(messages);
    assert(summary === 'The user wants concise answers and prefers qwen2.5:14b.', 'S2 should return fake summary');
    assert(fakeClient.lastPrompt !== null, 'S2 should have sent a prompt');
    assert(fakeClient.lastPrompt![0].role === 'system', 'S2 first message should be system summarizer prompt');
    assert(fakeClient.lastPrompt!.some((m) => m.content.includes('What model should I use?')), 'S2 prompt should include user message');
    console.log('[F15] PASS: S2 controller summarization');

    // S3: Chat summaries are injected into the system prompt when getChatSummaryContext is provided.
    const summaryController = new ChatController({
        app: new FakeApp() as never,
        llmClient: fakeClient,
        getChatSummaryContext: async () => 'Summaries of earlier conversations:\n- User likes concise answers.',
    });
    const session = await summaryController.createSession();
    const systemMessage = session.messages.find((m) => m.role === 'system');
    assert(systemMessage !== undefined, 'S3 should create a system message');
    assert(systemMessage!.content.includes('User likes concise answers'), 'S3 system prompt should include chat summary context');
    console.log('[F15] PASS: S3 summary context injected into system prompt');

    console.log('[F15] VERDICT: GREEN');
}

void main();
