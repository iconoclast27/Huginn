// =============================================================================
// Huginn — Chat Controller
// src/chat/chat.ts
//
// Minimal chat session backed by a ChatLlmClient. Injects the active note body
// as context (option 2: active-note context only). No persistence, no RAG in this
// first cut.
// =============================================================================

import type { TFile, App } from 'obsidian';
import type { AbortSignalLike, ChatLlmClient, ChatMessage } from '../llm/client.ts';

export interface ChatSession {
    messages: ChatMessage[];
    activeNotePath: string | null;
    activeNoteContent: string | null;
}

export interface ChatControllerOptions {
    app: App;
    llmClient: ChatLlmClient;
    /** Optional user memory context so the chat model can recall user facts. */
    getUserMemoryContext?: () => Promise<string> | string;
    /** Optional chat-summary context so the model can recall earlier conversations. */
    getChatSummaryContext?: () => Promise<string> | string;
}

export class ChatController {
    private opts: ChatControllerOptions;

    constructor(opts: ChatControllerOptions) {
        this.opts = opts;
    }

    async createSession(): Promise<ChatSession> {
        const { path, content } = await this.readActiveNote();
        const systemContent = await this.buildSystemPrompt(path, content);
        return {
            messages: systemContent ? [{ role: 'system', content: systemContent }] : [],
            activeNotePath: path,
            activeNoteContent: content,
        };
    }

    async sendMessage(session: ChatSession, text: string, signal?: AbortSignalLike): Promise<{ response: string | null; updatedSession: ChatSession }> {
        const messages: ChatMessage[] = [
            ...session.messages,
            { role: 'user', content: text },
        ];
        const raw = await this.opts.llmClient.chat(messages, signal);
        if (raw === null) {
            return { response: null, updatedSession: session };
        }
        const assistantMessage: ChatMessage = { role: 'assistant', content: raw };
        return {
            response: raw,
            updatedSession: {
                ...session,
                messages: [...messages, assistantMessage],
            },
        };
    }

    /**
     * Ask the LLM to condense a conversation into a short memory note.
     * System messages are excluded by the caller; this method just summarizes
     * the provided messages.
     */
    async summarizeChat(messages: ChatMessage[], signal?: AbortSignalLike): Promise<string | null> {
        const transcript = messages
            .map((m) => `${m.role === 'user' ? 'User' : 'Huginn'}: ${m.content}`)
            .join('\n\n');
        const prompt: ChatMessage[] = [
            {
                role: 'system',
                content: 'You are a concise conversation summarizer. You will be given a transcript of a user/assistant chat. Produce a short paragraph summary of facts, decisions, and context the user would want to recall in future chats. Return only the summary, with no preamble, role labels, or markdown fences.',
            },
            { role: 'user', content: `Summarize this conversation:\n\n${transcript}` },
        ];
        return this.opts.llmClient.chat(prompt, signal);
    }

    private async readActiveNote(): Promise<{ path: string | null; content: string | null }> {
        const file = this.opts.app.workspace.getActiveFile();
        if (!file || typeof file !== 'object' || !('path' in file)) {
            return { path: null, content: null };
        }
        try {
            const content = await this.opts.app.vault.cachedRead(file as TFile);
            return { path: file.path, content };
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn] failed to read active note:', (e as Error).message);
            return { path: file.path, content: null };
        }
    }

    private async buildSystemPrompt(path: string | null, content: string | null): Promise<string> {
        const parts: string[] = [
            'You are Huginn, an AI assistant embedded in Obsidian as a vault-aware chat companion.',
            '',
            'Your job is to help the user with their notes and general knowledge. Be concise but useful.',
        ];

        // User memory and conversation summaries are injected early and marked
        // as overriding instructions so small models do not ignore them in favor
        // of later guidelines or active-note content.
        if (this.opts.getUserMemoryContext) {
            const ctx = await this.opts.getUserMemoryContext();
            if (ctx.length > 0) {
                parts.push(
                    '',
                    'CRITICAL — you MUST follow these user preferences and facts. They override any default guideline below:',
                    ctx,
                );
            }
        }
        if (this.opts.getChatSummaryContext) {
            const ctx = await this.opts.getChatSummaryContext();
            if (ctx.length > 0) {
                parts.push(
                    '',
                    'CRITICAL — remember these summaries of earlier conversations:',
                    ctx,
                );
            }
        }

        parts.push(
            '',
            'Guidelines:',
            '- The user is looking at an Obsidian note. Use the note content below when the question is about it.',
            '- If the question is not about the active note, answer from general knowledge rather than inventing a connection.',
            '- Prefer short, actionable answers. Use markdown formatting (headings, lists, code fences) when it improves readability.',
            '- Do not claim the note says something it does not. If the note lacks the answer, say so.',
            '- You cannot rename, move, delete, or otherwise modify files unless the user explicitly asks you to run a skill.',
        );

        if (path && content) {
            parts.push('', `Active note path: ${path}`, '', 'Note content:', '---', content, '---');
        } else {
            parts.push('', 'No active note is currently open. Answer from general knowledge.');
        }
        return parts.join('\n');
    }
}
