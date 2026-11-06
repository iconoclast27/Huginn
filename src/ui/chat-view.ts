// =============================================================================
// Huginn — Chat Sidebar View
// src/ui/chat-view.ts
//
// ItemView-based sidebar chat UI. Replaces the floating modal. Keeps the same
// active-note context strategy: the currently open note is injected as a system
// message when the view opens or when the user explicitly refreshes context.
// =============================================================================

import { ItemView, WorkspaceLeaf, type ViewStateResult } from 'obsidian';
import { ChatController, type ChatSession } from '../chat/chat.ts';
import { emptyChatState, sanitizeChatState, type HuginnChatState } from './chat-state.ts';

export const HUGINN_CHAT_VIEW_TYPE = 'huginn-chat';

export class HuginnChatView extends ItemView {
    private controller: ChatController;
    private session: ChatSession;
    private container: HTMLElement | null = null;
    private messagesContainer: HTMLDivElement | null = null;
    private inputEl: HTMLTextAreaElement | null = null;
    private sendButton: HTMLButtonElement | null = null;
    private contextEl: HTMLElement | null = null;
    private isLoading = false;

    constructor(leaf: WorkspaceLeaf, controller: ChatController) {
        super(leaf);
        this.controller = controller;
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
    }

    async onClose(): Promise<void> {
        this.container?.empty();
    }

    getState(): HuginnChatState {
        return {
            messages: this.session.messages,
            activeNotePath: this.session.activeNotePath,
            activeNoteContent: this.session.activeNoteContent,
        };
    }

    async setState(state: unknown, _result: ViewStateResult): Promise<void> {
        const sanitized = sanitizeChatState(state);
        if (sanitized === null) return;
        this.session = {
            messages: sanitized.messages,
            activeNotePath: sanitized.activeNotePath,
            activeNoteContent: null,
        };
        this.applySessionToDom();
    }

    private render(): void {
        if (!this.container) return;
        this.container.empty();

        // Context header
        const header = this.container.createEl('div', { cls: 'huginn-chat-header' });
        this.contextEl = header.createEl('div', { cls: 'huginn-chat-context' });
        const refreshBtn = header.createEl('button', {
            cls: 'huginn-chat-refresh',
            text: 'Refresh context',
        });
        refreshBtn.addEventListener('click', () => {
            void this.refreshContext();
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

    private async refreshContext(): Promise<void> {
        this.session = await this.controller.createSession();
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
            if (message.role !== 'system') {
                this.renderMessage(message.role, message.content);
            }
        }
    }

    private async handleSend(): Promise<void> {
        if (!this.inputEl) return;
        const text = this.inputEl.value.trim();
        if (text.length === 0) return;

        this.setLoading(true);
        this.renderMessage('user', text);
        this.inputEl.value = '';

        const result = await this.controller.sendMessage(this.session, text);
        this.session = result.updatedSession;

        if (result.response === null) {
            this.renderMessage('assistant', '[No response from model]');
        } else {
            this.renderMessage('assistant', result.response);
        }

        this.setLoading(false);
        this.scrollToBottom();
    }

    private renderMessage(role: 'user' | 'assistant', content: string): void {
        if (!this.messagesContainer) return;
        const bubble = this.messagesContainer.createEl('div', {
            cls: `huginn-chat-message huginn-chat-message-${role}`,
        });
        bubble.createEl('strong', { text: role === 'user' ? 'You: ' : 'Huginn: ' });
        const textEl = bubble.createEl('span');
        textEl.innerText = content;
    }

    private setLoading(loading: boolean): void {
        this.isLoading = loading;
        if (this.sendButton) {
            this.sendButton.disabled = loading;
            this.sendButton.textContent = loading ? '…' : 'Send';
        }
    }

    private scrollToBottom(): void {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
}
