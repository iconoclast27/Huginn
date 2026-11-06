// =============================================================================
// Huginn — Chat Controller
// src/chat/chat.ts
//
// Minimal chat session backed by a ChatLlmClient. Injects the active note body
// as context (option 2: active-note context only). No persistence, no RAG in this
// first cut.
// =============================================================================

import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { ChatLlmClient, ChatMessage } from '../llm/client.ts';

export interface ChatSession {
    messages: ChatMessage[];
    activeNotePath: string | null;
    activeNoteContent: string | null;
}

export interface ChatControllerOptions {
    app: App;
    llmClient: ChatLlmClient;
}

export class ChatController {
    private opts: ChatControllerOptions;

    constructor(opts: ChatControllerOptions) {
        this.opts = opts;
    }

    async createSession(): Promise<ChatSession> {
        const { path, content } = await this.readActiveNote();
        const systemContent = this.buildSystemPrompt(path, content);
        return {
            messages: systemContent ? [{ role: 'system', content: systemContent }] : [],
            activeNotePath: path,
            activeNoteContent: content,
        };
    }

    async sendMessage(session: ChatSession, text: string): Promise<{ response: string | null; updatedSession: ChatSession }> {
        const messages: ChatMessage[] = [
            ...session.messages,
            { role: 'user', content: text },
        ];
        const raw = await this.opts.llmClient.chat(messages);
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

    private async readActiveNote(): Promise<{ path: string | null; content: string | null }> {
        const file = this.opts.app.workspace.getActiveFile();
        if (!file || !(file instanceof TFile)) {
            return { path: null, content: null };
        }
        try {
            const content = await this.opts.app.vault.cachedRead(file);
            return { path: file.path, content };
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn] failed to read active note:', (e as Error).message);
            return { path: file.path, content: null };
        }
    }

    private buildSystemPrompt(path: string | null, content: string | null): string {
        const parts: string[] = [
            'You are Huginn, a concise assistant inside Obsidian. Answer the user based on the active note shown below. If the question is not about the note, answer generally.',
        ];
        if (path && content) {
            parts.push(`Active note path: ${path}\n\nNote content:\n${content}`);
        } else {
            parts.push('No active note is currently open.');
        }
        return parts.join('\n\n');
    }
}
