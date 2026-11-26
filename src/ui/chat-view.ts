// =============================================================================
// Huginn — Chat Sidebar View
// src/ui/chat-view.ts
//
// ItemView-based sidebar chat UI. Replaces the floating modal. Keeps the same
// active-note context strategy: the currently open note is injected as a system
// message when the view opens or when the user explicitly refreshes context.
// =============================================================================

import { Component, ItemView, MarkdownRenderer, WorkspaceLeaf, type ViewStateResult, type EventRef } from 'obsidian';
import { ChatController, type ChatSession } from '../chat/chat.ts';
import { emptyChatState, sanitizeChatState, type HuginnChatState } from './chat-state.ts';
import { parseUserMemoryCommand } from '../memory/commands.ts';
import { ApprovalModal } from './approval-modal.ts';

export const HUGINN_CHAT_VIEW_TYPE = 'huginn-chat';

export interface ChatViewServices {
    controller: ChatController;
    /** Current user settings so the chat can adapt report-back verbosity. */
    getSettings: () => import('../settings.ts').HuginnSettings;
    /** Optional memory helpers for user notes and chat summaries. */
    getMemory?: () => {
        user: import('../memory/kinds.ts').UserMemory | null;
        summary: import('../memory/kinds.ts').ChatSummaryMemory | null;
    };
}

export class HuginnChatView extends ItemView {
    private services: ChatViewServices;
    private session: ChatSession;
    private container: HTMLElement | null = null;
    private messagesContainer: HTMLDivElement | null = null;
    private inputEl: HTMLTextAreaElement | null = null;
    private sendButton: HTMLButtonElement | null = null;
    private contextEl: HTMLElement | null = null;
    private isLoading = false;
    /** Tracks the in-flight LLM request so the Send button can interrupt it. */
    private abortController: AbortController | null = null;
    /** Obsidian event registration for active-leaf changes. */
    private activeLeafChangeRef: EventRef | null = null;

    private get verbosity(): import('../settings.ts').ReportBackVerbosity {
        return this.services.getSettings().reportBackVerbosity;
    }

    constructor(leaf: WorkspaceLeaf, services: ChatViewServices) {
        super(leaf);
        this.services = services;
        this.session = emptyChatState();
    }

    getViewType(): string {
        return HUGINN_CHAT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Huginn Chat';
    }

    getIcon(): string {
        return 'message-square';
    }

    async onOpen(): Promise<void> {
        this.container = this.contentEl.createDiv({ cls: 'huginn-chat-view' });
        this.render();
        await this.refreshContext();
        this.activeLeafChangeRef = this.app.workspace.on('active-leaf-change', () => {
            void this.refreshContext(false);
        });
    }

    async onClose(): Promise<void> {
        if (this.activeLeafChangeRef) {
            this.app.workspace.offref(this.activeLeafChangeRef);
            this.activeLeafChangeRef = null;
        }
        this.container?.empty();
    }

    getState(): HuginnChatState {
        // Do not persist message history or active note path across reloads /
        // workspace restores. Always derive the active note from Obsidian's
        // current workspace so the chat context cannot show a stale note.
        return {
            messages: [],
            activeNotePath: null,
            activeNoteContent: null,
        };
    }

    async setState(state: unknown, _result: ViewStateResult): Promise<void> {
        const sanitized = sanitizeChatState(state);
        if (sanitized === null) return;
        // Reset to empty state and re-read the current active note from Obsidian.
        // Do not trust the persisted activeNotePath — it may belong to a note that
        // was open in the previous session. Defer the context read slightly so
        // Obsidian has finished restoring the workspace active leaf.
        this.session = emptyChatState();
        this.applySessionToDom();
        window.setTimeout(() => {
            void this.refreshContext();
        }, 0);
    }

    private render(): void {
        if (!this.container) return;
        this.container.empty();

        // Context header: full-width context line, then refresh button on its own line.
        const header = this.container.createEl('div', { cls: 'huginn-chat-header' });
        this.contextEl = header.createEl('div', { cls: 'huginn-chat-context' });
        const refreshBtn = header.createEl('button', {
            cls: 'huginn-chat-refresh',
            text: 'Refresh context',
        });
        refreshBtn.addEventListener('click', () => {
            void this.refreshContext(false);
        });

        const rememberBtn = header.createEl('button', {
            cls: 'huginn-chat-remember',
            text: 'Remember chat',
        });
        rememberBtn.addEventListener('click', () => {
            void this.rememberChat();
        });

        const resetBtn = header.createEl('button', {
            cls: 'huginn-chat-reset',
            text: 'New chat',
        });
        resetBtn.addEventListener('click', () => {
            void this.resetChat();
        });

        // Messages area
        this.messagesContainer = this.container.createEl('div', {
            cls: 'huginn-chat-messages',
        });

        // Input area
        const inputContainer = this.container.createEl('div', {
            cls: 'huginn-chat-input-container',
        });
        this.inputEl = inputContainer.createEl('textarea', {
            cls: 'huginn-chat-input',
            placeholder: 'Ask about the active note...',
        });
        this.inputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void this.handleSend();
            }
        });

        this.sendButton = inputContainer.createEl('button', {
            text: 'Send',
            cls: 'mod-cta huginn-chat-send',
        });
        this.sendButton.addEventListener('click', () => {
            void this.handleSend();
        });

        this.applySessionToDom();
        this.inputEl.focus();
    }

    private async refreshContext(resetMessages = true): Promise<void> {
        const fresh = await this.services.controller.createSession();
        if (resetMessages) {
            this.session = fresh;
        } else {
            // Keep user/assistant history but replace the system context with the
            // currently active note. This is useful for multi-note workflows where
            // the user wants to shift context without losing the conversation.
            const nonSystem = this.session.messages.filter((m) => m.role !== 'system');
            this.session = {
                ...fresh,
                messages: [...fresh.messages, ...nonSystem],
            };
        }
        this.applySessionToDom();
    }

    private applySessionToDom(): void {
        if (!this.contextEl || !this.messagesContainer) return;
        this.contextEl.empty();
        if (this.session.activeNotePath) {
            this.contextEl.createEl('small', {
                text: `Active note: ${this.session.activeNotePath}`,
            });
        } else {
            this.contextEl.createEl('small', { text: 'No active note open.' });
        }

        this.messagesContainer.empty();
        for (const message of this.session.messages) {
            // System messages provide context to the LLM but are not rendered as bubbles.
            if (message.role !== 'system') {
                this.renderMessage(message.role, message.content);
            }
        }
    }

    private async handleSend(): Promise<void> {
        if (!this.inputEl) return;
        const text = this.inputEl.value.trim();
        if (text.length === 0) return;

        // If a request is already in flight, the Send button acts as Stop.
        if (this.abortController) {
            // eslint-disable-next-line no-console
            console.log('[Huginn chat] Stop clicked; aborting in-flight request.');
            this.abortController.abort();
            ApprovalModal.closeActive();
            return;
        }

        // If a previous abort left us loading, reset the button now.
        if (this.isLoading) {
            this.setLoading(false);
            return;
        }

        // Explicit user memory commands are handled locally, not dispatched as skills.
        const memoryCommand = parseUserMemoryCommand(text);
        if (memoryCommand) {
            const userMemory = this.services.getMemory?.().user ?? null;
            if (userMemory) {
                await userMemory.append(memoryCommand);
                this.appendMessage('assistant', `Memory saved: ${memoryCommand.type} — ${memoryCommand.note}`);
            } else {
                this.appendMessage('assistant', 'Memory storage is not available yet.');
            }
            this.inputEl.value = '';
            return;
        }

        this.abortController = new AbortController();
        this.setLoading(true);
        // The transcript keeps user/assistant text only; the old loop's op envelopes
        // and per-turn receipts lived here and are no longer part of the turn.
        this.inputEl.value = '';

        try {
            const { response, updatedSession } = await this.services.controller.sendMessage(
                this.session,
                text,
                this.abortController.signal,
                this.verbosity,
            );
            if (this.abortController.signal.aborted) {
                // §6: Stop honored at the instant it lands; nothing further delivered.
                // The question stays in the transcript even when the answer never lands.
                this.session = { ...updatedSession, messages: [...updatedSession.messages, { role: 'user', content: text }] };
                this.appendMessage('assistant', '[Interrupted]');
                return;
            }
            if (response === null) {
                // Honest failure cause, never a fabrication (H-f26 doctrine inherited).
                this.session = { ...updatedSession, messages: [...updatedSession.messages, { role: 'user', content: text }] };
                this.appendMessage('assistant', '[No response from model]');
                return;
            }
            this.session = updatedSession;
            this.applySessionToDom();
        } finally {
            this.abortController = null;
            this.setLoading(false);
            this.scrollToBottom();
        }
    }

    private resetChat(): void {
        // Keep the active-note system context but drop all user/assistant
        // messages so the user can start a fresh conversation without
        // reloading Obsidian.
        this.session = {
            ...this.session,
            messages: this.session.messages.filter((m) => m.role === 'system'),
        };
        this.applySessionToDom();
    }

    private async rememberChat(): Promise<void> {
        const summaryMemory = this.services.getMemory?.().summary ?? null;
        if (summaryMemory === null) {
            this.renderMessage('assistant', 'Memory storage is not available yet.');
            return;
        }

        const chatMessages = this.session.messages.filter((m) => m.role !== 'system');
        if (chatMessages.length === 0) {
            this.appendMessage('assistant', 'Nothing to remember yet.');
            return;
        }

        // If a request is already in flight, treat this as an interrupt.
        if (this.abortController) {
            this.abortController.abort();
            return;
        }

        // If a previous abort left us loading, reset the button now.
        if (this.isLoading) {
            this.setLoading(false);
            return;
        }

        this.abortController = new AbortController();
        this.setLoading(true);
        // chatMessages was captured above, so this status message will not
        // be included in the summary.
        this.appendMessage('assistant', 'Saving chat summary...');

        try {
            const summary = await this.services.controller.summarizeChat(chatMessages, this.abortController.signal);
            if (summary === null || summary.trim().length === 0) {
                this.appendMessage('assistant', 'Could not generate a chat summary.');
                return;
            }
            await summaryMemory.append({
                key: this.session.activeNotePath ?? 'general chat',
                note: summary.trim(),
            });
            this.appendMessage('assistant', 'Chat summary saved.');
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn chat] Remember chat failed:', (e as Error).message);
            this.appendMessage('assistant', `Could not save chat summary: ${(e as Error).message}`);
        } finally {
            this.abortController = null;
            this.setLoading(false);
            this.scrollToBottom();
        }
    }

    private renderMessage(role: 'user' | 'assistant', content: string): void {
        if (!this.messagesContainer) return;
        const bubble = this.messagesContainer.createEl('div', {
            cls: `huginn-chat-message huginn-chat-message-${role}`,
        });
        bubble.createEl('div', { cls: 'huginn-chat-message-role', text: role === 'user' ? 'You' : 'Huginn' });
        const bodyEl = bubble.createEl('div', { cls: 'huginn-chat-message-body' });

        if (role === 'assistant') {
            // Render assistant responses as markdown so lists, code fences, bold, etc. format properly.
            void MarkdownRenderer.render(this.app, content, bodyEl, this.session.activeNotePath ?? '', this);
        } else {
            bodyEl.innerText = content;
        }
    }

    /** Append a new user or assistant message to the session and the DOM. */
    private appendMessage(role: 'user' | 'assistant', content: string): void {
        this.session.messages.push({ role, content });
        this.renderMessage(role, content);
    }

    private setLoading(loading: boolean): void {
        this.isLoading = loading;
        if (this.sendButton) {
            this.sendButton.textContent = this.abortController ? 'Stop' : 'Send';
        }
    }

    private scrollToBottom(): void {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
}
