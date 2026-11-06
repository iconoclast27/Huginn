// =============================================================================
// Huginn — Chat Modal
// src/ui/chat-modal.ts
//
// Simple Obsidian modal chat UI. Shows message history, active note context,
// a text input, and a Send button. No persistence in this first cut.
// =============================================================================

import { Modal, Setting, Notice, type App } from 'obsidian';
import { ChatController, type ChatSession } from '../chat/chat.ts';

export class ChatModal extends Modal {
    private controller: ChatController;
    private session: ChatSession | null = null;
    private messagesContainer: HTMLDivElement | null = null;
    private inputEl: HTMLTextAreaElement | null = null;
    private sendButton: HTMLButtonElement | null = null;
    private isLoading = false;

    constructor(app: App, controller: ChatController) {
        super(app);
        this.controller = controller;
        this.titleEl.setText('Huginn Chat');
    }

    async onOpen(): Promise<void> {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('huginn-chat-modal');

        this.session = await this.controller.createSession();

        // Context header
        const contextEl = contentEl.createEl('div', { cls: 'huginn-chat-context' });
        if (this.session.activeNotePath) {
            contextEl.createEl('small', {
                text: `Active note: ${this.session.activeNotePath}`,
            });
        } else {
            contextEl.createEl('small', { text: 'No active note open.' });
        }

        // Messages area
        this.messagesContainer = contentEl.createEl('div', {
            cls: 'huginn-chat-messages',
        });
        this.messagesContainer.style.maxHeight = '400px';
        this.messagesContainer.style.overflowY = 'auto';
        this.messagesContainer.style.border = '1px solid var(--background-modifier-border)';
        this.messagesContainer.style.padding = '8px';
        this.messagesContainer.style.marginBottom = '12px';

        // Initial system message is not rendered; render existing user/assistant messages if any.
        for (const message of this.session.messages) {
            if (message.role !== 'system') {
                this.renderMessage(message.role, message.content);
            }
        }

        // Input area
        const inputContainer = contentEl.createEl('div', {
            cls: 'huginn-chat-input-container',
        });
        inputContainer.style.display = 'flex';
        inputContainer.style.gap = '8px';

        this.inputEl = inputContainer.createEl('textarea', {
            cls: 'huginn-chat-input',
            placeholder: 'Ask about the active note...',
        });
        this.inputEl.style.flex = '1';
        this.inputEl.style.minHeight = '60px';
        this.inputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void this.handleSend();
            }
        });

        this.sendButton = inputContainer.createEl('button', {
            text: 'Send',
            cls: 'mod-cta',
        });
        this.sendButton.addEventListener('click', () => {
            void this.handleSend();
        });

        // Focus input
        this.inputEl.focus();
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    private async handleSend(): Promise<void> {
        if (!this.inputEl || !this.session) return;
        const text = this.inputEl.value.trim();
        if (text.length === 0) return;

        this.setLoading(true);
        this.renderMessage('user', text);
        this.inputEl.value = '';

        const result = await this.controller.sendMessage(this.session, text);
        this.session = result.updatedSession;

        if (result.response === null) {
            new Notice('Huginn chat failed to get a response. Check the console.');
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
        bubble.style.marginBottom = '8px';
        bubble.style.padding = '8px';
        bubble.style.borderRadius = '6px';
        bubble.style.backgroundColor =
            role === 'user'
                ? 'var(--background-secondary)'
                : 'var(--background-primary-alt)';
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
