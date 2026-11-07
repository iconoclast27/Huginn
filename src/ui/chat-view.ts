// =============================================================================
// Huginn — Chat Sidebar View
// src/ui/chat-view.ts
//
// ItemView-based sidebar chat UI. Replaces the floating modal. Keeps the same
// active-note context strategy: the currently open note is injected as a system
// message when the view opens or when the user explicitly refreshes context.
// =============================================================================

import { Component, ItemView, MarkdownRenderer, WorkspaceLeaf, type ViewStateResult } from 'obsidian';
import { ChatController, type ChatSession } from '../chat/chat.ts';
import { ChatSkillDispatcher, type DispatchResult, type DispatchIntent } from '../chat/dispatch.ts';
import { emptyChatState, sanitizeChatState, type HuginnChatState } from './chat-state.ts';
import type { HuginnHarness } from '../harness/harness.ts';
import type { LoadedRecipe, RecipeRunResult } from '../recipes/types.ts';
import { normalizeNotePath } from './path-utils.ts';

export const HUGINN_CHAT_VIEW_TYPE = 'huginn-chat';

export interface ChatViewServices {
    controller: ChatController;
    dispatcher: ChatSkillDispatcher;
    /** Live harness accessor so restored views pick up the harness once it initializes. */
    getHarness: () => HuginnHarness | null;
    /** Live recipe catalog accessor so chat dispatch sees recipes loaded after view creation. */
    getRecipes: () => LoadedRecipe[];
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

    constructor(leaf: WorkspaceLeaf, services: ChatViewServices) {
        super(leaf);
        this.services = services;
        this.session = emptyChatState();
    }

    /** Current harness, which may only be assigned after Muninn finishes loading. */
    private get harness(): HuginnHarness | null {
        return this.services.getHarness();
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
        // was open in the previous session.
        this.session = emptyChatState();
        await this.refreshContext();
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
        this.session = await this.services.controller.createSession();
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

        // If a request is already in flight, the Send button acts as Stop.
        if (this.abortController) {
            this.abortController.abort();
            return;
        }

        this.abortController = new AbortController();
        this.setLoading(true);
        this.renderMessage('user', text);
        this.inputEl.value = '';

        try {
            // First, try skill dispatch. If the model maps the request to a known
            // recipe, run the harness and render the structured result. Otherwise,
            // fall back to a plain chat completion.
            const dispatch = await this.services.dispatcher.dispatch(text, this.session.activeNotePath, this.abortController.signal);
            const intent = dispatch.intent;
            const recipe = intent
                ? this.services.getRecipes().find((r) => r.metadata.name === intent.recipeName) ?? null
                : null;

            if (intent && recipe) {
                await this.runSkillFromChat(intent, recipe, dispatch);
            } else {
                await this.runPlainChat(text);
            }
        } finally {
            this.abortController = null;
            this.setLoading(false);
            this.scrollToBottom();
        }
    }

    private async runPlainChat(text: string): Promise<void> {
        const result = await this.services.controller.sendMessage(this.session, text, this.abortController?.signal);
        this.session = result.updatedSession;
        if (result.response === null) {
            this.renderMessage('assistant', '[No response from model]');
        } else {
            this.renderMessage('assistant', result.response);
        }
    }

    private async runSkillFromChat(intent: DispatchIntent, recipe: LoadedRecipe, dispatch: DispatchResult): Promise<void> {
        const harness = this.harness;
        if (!harness) {
            this.renderMessage('assistant', 'Huginn harness is not ready yet. Is Muninn installed and enabled?');
            return;
        }

        this.renderMessage('assistant', `Running ${recipe.metadata.name} on ${intent.targetPath}... (${intent.reason})`);

        const targetPath = normalizeNotePath(intent.targetPath);
        const result = await harness.run(recipe, { targetPath, titleQuery: recipe.metadata.name }, {}, this.abortController?.signal);

        if (!result.schemaValid) {
            const msg = result.schemaErrors.map((e) => e.message).join('; ');
            this.renderMessage('assistant', `Skill failed: ${msg}`);
            return;
        }
        if (!result.groundTruthValid) {
            const msg = result.groundTruthErrors.map((e) => e.message).join('; ');
            this.renderMessage('assistant', `Ground-truth check failed: ${msg}`);
            return;
        }

        if (recipe.applyMethod === 'noop') {
            this.renderReadOnlyResult(recipe, result);
            return;
        }

        if (result.applyResult) {
            this.renderMessage('assistant', result.applyResult.message);
        } else if (result.approved === false) {
            this.renderMessage('assistant', 'Skill suggestion was rejected.');
        } else {
            // Approval gate returned null (tests). Render the structured output
            // as a compact JSON blob.
            this.renderMessage('assistant', '```json\n' + JSON.stringify(result.parsedOutput.json, null, 2) + '\n```');
        }
    }

    private renderReadOnlyResult(recipe: LoadedRecipe, result: RecipeRunResult): void {
        const json = result.parsedOutput.json as Record<string, unknown> | undefined;
        if (recipe.metadata.name === 'task-extraction' && Array.isArray(json?.tasks)) {
            const tasks = json.tasks as string[];
            const lines = tasks.length === 0 ? ['No actionable tasks found.'] : tasks.map((t, i) => `${i + 1}. ${t}`);
            this.renderMessage('assistant', lines.join('\n'));
            return;
        }
        this.renderMessage('assistant', '```json\n' + JSON.stringify(json, null, 2) + '\n```');
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
