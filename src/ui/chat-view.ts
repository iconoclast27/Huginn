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
import { ChatSkillDispatcher, type DispatchResult, type DispatchIntent } from '../chat/dispatch.ts';
import { emptyChatState, sanitizeChatState, type HuginnChatState } from './chat-state.ts';
import type { HuginnHarness } from '../harness/harness.ts';
import type { LoadedRecipe, RecipeRunResult } from '../recipes/types.ts';
import { normalizeNotePath } from './path-utils.ts';
import { resolveOutputField } from './render-utils.ts';
import { parseUserMemoryCommand } from '../memory/commands.ts';
import { ApprovalModal } from './approval-modal.ts';

export const HUGINN_CHAT_VIEW_TYPE = 'huginn-chat';

export interface ChatViewServices {
    controller: ChatController;
    dispatcher: ChatSkillDispatcher;
    /** Live harness accessor so restored views pick up the harness once it initializes. */
    getHarness: () => HuginnHarness | null;
    /** Live recipe catalog accessor so chat dispatch sees recipes loaded after view creation. */
    getRecipes: () => LoadedRecipe[];
    /** Current user settings so the chat can adapt report-back verbosity. */
    getSettings: () => import('../settings.ts').HuginnSettings;
    /** Optional memory helpers for corrections, user notes, and chat summaries. */
    getMemory?: () => {
        corrections: import('../memory/kinds.ts').CorrectionsMemory | null;
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
                this.renderMessage('assistant', `Memory saved: ${memoryCommand.type} — ${memoryCommand.note}`);
            } else {
                this.renderMessage('assistant', 'Memory storage is not available yet.');
            }
            this.inputEl.value = '';
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

            // If the user aborted while dispatch was in flight, do not continue.
            if (this.abortController.signal.aborted) {
                return;
            }

            const intent = dispatch.intent;
            const recipe = intent
                ? this.services.getRecipes().find((r) => r.metadata.name === intent.recipeName) ?? null
                : null;

            if (intent && recipe) {
                // Re-check abort before starting the heavier harness run and
                // approval gate so a Stop click during dispatch is honored.
                if (this.abortController.signal.aborted) {
                    return;
                }
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

    private async runSkillFromChat(intent: DispatchIntent, recipe: LoadedRecipe, _dispatch: DispatchResult): Promise<void> {
        const harness = this.harness;
        if (!harness) {
            this.renderMessage('assistant', 'Huginn harness is not ready yet. Is Muninn installed and enabled?');
            return;
        }

        if (this.verbosity !== 'minimal') {
            this.renderMessage('assistant', `Running ${recipe.metadata.name} on ${intent.targetPath}...`);
        }

        const targetPath = normalizeNotePath(intent.targetPath);
        const result = await harness.run(recipe, { targetPath, titleQuery: recipe.metadata.name }, {}, this.abortController?.signal);

        if (!result.schemaValid) {
            const msg = result.schemaErrors.map((e) => e.message).join('; ');
            this.renderMessage('assistant', `Skill failed: ${msg}`);
            return;
        }
        if (!result.groundTruthValid) {
            const msg = result.groundTruthErrors.map((e) => e.message).join('; ');
            // Ground-truth failure means the suggestion is already true in the
            // vault. Report it as information, not as an error, and do not
            // retry or write a correction.
            this.renderMessage('assistant', `The suggestion from ${recipe.metadata.name} is already reflected in the vault (${msg}). No change needed.`);
            return;
        }

        await this.renderRunResult(recipe, result);
    }

    private async renderRunResult(recipe: LoadedRecipe, result: RecipeRunResult): Promise<void> {
        // User rejected the suggestion in the approval gate.
        if (result.approved === false && result.applyResult === null) {
            const corrections = this.services.getMemory?.().corrections ?? null;
            if (corrections) {
                await corrections.append({
                    recipe: recipe.metadata.name,
                    type: 'refusal',
                    key: 'user rejected suggestion',
                    note: 'User rejected the suggested change via the approval gate.',
                });
            }
            this.renderMessage('assistant', 'Skill suggestion was rejected.');
            return;
        }

        if (recipe.applyMethod === 'noop') {
            this.renderReadOnlyResult(recipe, result);
            return;
        }

        if (result.applyResult?.applied) {
            this.renderMessage('assistant', result.applyResult.message);
        } else if (result.applyResult) {
            // applyResult exists but applied=false — include the reason if not minimal.
            const msg = this.verbosity === 'minimal'
                ? 'Skill could not be applied.'
                : `Skill could not be applied: ${result.applyResult.message}`;
            this.renderMessage('assistant', msg);
        } else if (result.approved === false) {
            this.renderMessage('assistant', 'Skill suggestion was rejected.');
        } else {
            // Approval gate returned null (tests). Render the structured output
            // as a compact JSON blob.
            this.renderMessage('assistant', '```json\n' + JSON.stringify(result.parsedOutput.json, null, 2) + '\n```');
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
            this.renderMessage('assistant', 'Nothing to remember yet.');
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
        this.renderMessage('assistant', 'Saving chat summary...');

        try {
            const summary = await this.services.controller.summarizeChat(chatMessages, this.abortController.signal);
            if (summary === null || summary.trim().length === 0) {
                this.renderMessage('assistant', 'Could not generate a chat summary.');
                return;
            }
            await summaryMemory.append({
                key: this.session.activeNotePath ?? 'general chat',
                note: summary.trim(),
            });
            this.renderMessage('assistant', 'Chat summary saved.');
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn chat] Remember chat failed:', (e as Error).message);
            this.renderMessage('assistant', `Could not save chat summary: ${(e as Error).message}`);
        } finally {
            this.abortController = null;
            this.setLoading(false);
            this.scrollToBottom();
        }
    }

    private renderReadOnlyResult(recipe: LoadedRecipe, result: RecipeRunResult): void {
        const json = result.parsedOutput.json as Record<string, unknown> | undefined;
        const hint = recipe.chatRender;
        if (!hint) {
            this.renderMessage('assistant', '```json\n' + JSON.stringify(json, null, 2) + '\n```');
            return;
        }

        const value = resolveOutputField(json, hint.field);
        if (hint.template === 'paragraph' && typeof value === 'string') {
            this.renderMessage('assistant', value);
            return;
        }
        if ((hint.template === 'numbered-list' || hint.template === 'bulleted-list') && Array.isArray(value)) {
            const items = value as string[];
            if (items.length === 0) {
                this.renderMessage('assistant', hint.message ?? 'No items found.');
                return;
            }
            const prefix = hint.template === 'numbered-list' ? (i: number) => `${i + 1}. ` : () => '- ';
            this.renderMessage('assistant', items.map((t, i) => `${prefix(i)}${t}`).join('\n'));
            return;
        }
        if (hint.template === 'json') {
            this.renderMessage('assistant', '```json\n' + JSON.stringify(json, null, 2) + '\n```');
            return;
        }
        // Fallback for unexpected shapes.
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
