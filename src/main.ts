// =============================================================================
// Huginn — Obsidian Plugin Entry Point
// src/main.ts
//
// Wires the skill harness against the frozen Muninn API door. Huginn owns the
// LLM chat client, recipe loader, and apply registry. Muninn owns the vault
// index and exposes it through getMuninnApi().
// =============================================================================

import { Plugin, Setting, PluginSettingTab, Notice, TFile, WorkspaceLeaf, type App } from 'obsidian';
import { DEFAULT_SETTINGS, sanitizeSettings, type HuginnSettings } from './settings.ts';
import { OllamaChatClient } from './llm/client.ts';
import { HuginnHarness } from './harness/harness.ts';
import { ObsidianApprovalGate } from './harness/approval-gate.ts';
import { MuninnApiInputGatherer } from './harness/gather.ts';
import { createDefaultApplyRegistry } from './harness/apply.ts';
import { VaultGroundTruthValidator } from './harness/ground-truth.ts';
import { ObsidianVaultReader } from './harness/obsidian-vault.ts';
import { ObsidianMemoryStorage } from './memory/obsidian-storage.ts';
import { CorrectionsMemory, UserMemory, ChatSummaryMemory } from './memory/kinds.ts';
import { ObsidianRecipeSource } from './recipes/obsidian-source.ts';
import { loadRecipes } from './recipes/loader.ts';
import { installDefaultRecipes } from './recipes/installer.ts';
import type { LoadedRecipe } from './recipes/types.ts';
import type { MuninnApi } from './muninn-api.ts';
import { RecipeChooserModal } from './ui/recipe-modal.ts';
import { ChatController } from './chat/chat.ts';
import { ChatSkillDispatcher } from './chat/dispatch.ts';
import { HuginnChatView, HUGINN_CHAT_VIEW_TYPE } from './ui/chat-view.ts';

const MUNINN_PLUGIN_ID = 'muninn';
const RECIPE_DIR = 'Agents/Huginn/SKILLS';
const MUNINN_READY_POLL_MS = 500;
const MUNINN_READY_TIMEOUT_MS = 30000;

interface MuninnPluginLike {
    getMuninnApi(): MuninnApi | null;
}

export default class HuginnPlugin extends Plugin {
    settings: HuginnSettings = { ...DEFAULT_SETTINGS };
    private muninnApi: MuninnApi | null = null;
    private harness: HuginnHarness | null = null;
    private chatClient: OllamaChatClient | null = null;
    private recipes: LoadedRecipe[] = [];
    private correctionsMemory: CorrectionsMemory | null = null;
    private userMemory: UserMemory | null = null;
    private chatSummaryMemory: ChatSummaryMemory | null = null;

    async onload(): Promise<void> {
        try {
            const saved = await this.loadData();
            this.settings = sanitizeSettings(saved);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn] failed to load settings, using defaults:', e);
            this.settings = { ...DEFAULT_SETTINGS };
        }

        this.addSettingTab(new HuginnSettingTab(this.app, this));

        this.addCommand({
            id: 'run-skill',
            name: 'Run Huginn skill',
            callback: () => {
                void this.runSkill();
            },
        });

        this.addCommand({
            id: 'open-chat',
            name: 'Open Huginn chat',
            callback: () => {
                void this.openChat();
            },
        });

        this.addCommand({
            id: 'install-default-recipes',
            name: 'Install default Huginn skills',
            callback: () => {
                void this.installDefaultRecipes(false);
            },
        });

        this.registerView(
            HUGINN_CHAT_VIEW_TYPE,
            (leaf) => new HuginnChatView(leaf, this.createChatViewServices()),
        );

        this.addRibbonIcon('message-square', 'Huginn chat', () => {
            void this.openChat();
        });

        this.app.workspace.onLayoutReady(() => {
            void this.awaitMuninnReady().then(async (api) => {
                if (api === null) {
                    new Notice('Huginn requires Muninn to be installed and enabled.');
                    return;
                }
                this.muninnApi = api;
                this.chatClient = new OllamaChatClient({
                    baseUrl: this.settings.ollamaUrl,
                    model: this.settings.ollamaChatModel,
                    timeoutMs: this.settings.chatTimeoutMs,
                });
                const memoryStorage = new ObsidianMemoryStorage(this.app.vault);
                this.correctionsMemory = new CorrectionsMemory(memoryStorage);
                this.userMemory = new UserMemory(memoryStorage);
                this.chatSummaryMemory = new ChatSummaryMemory(memoryStorage);
                this.harness = new HuginnHarness({
                    llmClient: this.chatClient,
                    inputGatherer: new MuninnApiInputGatherer({ api, app: this.app }),
                    approvalGate: new ObsidianApprovalGate(this.app),
                    applyRegistry: createDefaultApplyRegistry(createObsidianApplyOptions(this.app)),
                    groundTruthValidator: new VaultGroundTruthValidator(new ObsidianVaultReader(this.app)),
                    corrections: this.correctionsMemory,
                });
                // Ensure default recipes are seeded on first run so users do not
                // need to manually copy recipe files after installing the plugin.
                const installResult = await installDefaultRecipes(this.app.vault, { force: false });
                if (installResult.installed > 0) {
                    new Notice(`Huginn installed ${installResult.installed} default skill recipe(s) in ${RECIPE_DIR}`);
                }
                if (installResult.errors.length > 0) {
                    // eslint-disable-next-line no-console
                    console.warn('[Huginn] recipe seed errors:', installResult.errors);
                }

                // Load recipes early so chat dispatch has the catalog available.
                await this.loadRecipes();
                // Watch the recipe folder so new or updated recipes are picked up
                // without requiring an Obsidian reload.
                this.registerRecipeFolderWatcher();
                // eslint-disable-next-line no-console
                console.log('[Huginn] harness initialized against Muninn API');
                if (this.settings.warmupOnFocus) {
                    void this.warmupChatModel();
                }
            });
        });
    }

    private registerRecipeFolderWatcher(): void {
        const folder = `${RECIPE_DIR}`;
        // Obsidian does not expose a recursive file watcher directly, but it does
        // emit 'create', 'modify', and 'delete' events for files in the vault.
        this.registerEvent(this.app.vault.on('create', (file) => {
            if (file.path.startsWith(folder)) {
                void this.loadRecipes();
            }
        }));
        this.registerEvent(this.app.vault.on('modify', (file) => {
            if (file.path.startsWith(folder)) {
                void this.loadRecipes();
            }
        }));
        this.registerEvent(this.app.vault.on('delete', (file) => {
            if (file.path.startsWith(folder)) {
                void this.loadRecipes();
            }
        }));
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (file.path.startsWith(folder) || oldPath.startsWith(folder)) {
                void this.loadRecipes();
            }
        }));
    }

    private async awaitMuninnReady(): Promise<MuninnApi | null> {
        const start = Date.now();
        const deadline = start + MUNINN_READY_TIMEOUT_MS;
        let pendingLogged = false;
        while (Date.now() < deadline) {
            const api = this.discoverMuninnApi();
            if (api !== null) return api;
            if (!pendingLogged && Date.now() > start + 5000) {
                // eslint-disable-next-line no-console
                console.log('[Huginn] still waiting for Muninn to become ready...');
                pendingLogged = true;
            }
            await new Promise((resolve) => window.setTimeout(resolve, MUNINN_READY_POLL_MS));
        }
        const api = this.discoverMuninnApi();
        if (api === null) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn] Muninn did not become ready within 30s. Is it installed and enabled?');
        }
        return api;
    }

    private async warmupChatModel(): Promise<void> {
        if (this.harness === null) return;
        // eslint-disable-next-line no-console
        console.log('[Huginn] warming up chat model...');
        try {
            // Send a trivial completion to pull the model back into memory.
            await this.harness.warmup();
            // eslint-disable-next-line no-console
            console.log('[Huginn] chat model warmup complete');
        } catch (e) {
            // Warmup is best-effort; log but do not block the user.
            // eslint-disable-next-line no-console
            console.warn('[Huginn] chat model warmup failed:', (e as Error).message);
        }
    }

    private discoverMuninnApi(): MuninnApi | null {
        const plugins = (this.app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins?.plugins;
        const muninn = plugins?.[MUNINN_PLUGIN_ID] as MuninnPluginLike | undefined;
        if (!muninn || typeof muninn.getMuninnApi !== 'function') {
            return null;
        }
        return muninn.getMuninnApi();
    }

    private async runSkill(): Promise<void> {
        if (this.harness === null || this.muninnApi === null) {
            // Try one more lazy discovery in case Muninn loaded after Huginn's init.
            const api = this.discoverMuninnApi();
            if (api === null) {
                new Notice('Huginn harness is not ready. Is Muninn installed and enabled?');
                return;
            }
            this.muninnApi = api;
            const memoryStorage = new ObsidianMemoryStorage(this.app.vault);
            const corrections = this.correctionsMemory ?? new CorrectionsMemory(memoryStorage);
            this.correctionsMemory = corrections;
            this.userMemory = this.userMemory ?? new UserMemory(memoryStorage);
            this.chatSummaryMemory = this.chatSummaryMemory ?? new ChatSummaryMemory(memoryStorage);
            this.harness = new HuginnHarness({
                llmClient: new OllamaChatClient({
                    baseUrl: this.settings.ollamaUrl,
                    model: this.settings.ollamaChatModel,
                    timeoutMs: this.settings.chatTimeoutMs,
                }),
                inputGatherer: new MuninnApiInputGatherer({ api, app: this.app }),
                approvalGate: new ObsidianApprovalGate(this.app),
                applyRegistry: createDefaultApplyRegistry(createObsidianApplyOptions(this.app)),
                groundTruthValidator: new VaultGroundTruthValidator(new ObsidianVaultReader(this.app)),
                corrections,
            });
        }
        const recipes = await this.loadRecipes();
        if (recipes.length === 0) {
            new Notice(`No recipes found in ${RECIPE_DIR}`);
            return;
        }
        new RecipeChooserModal(this.app, recipes, this.settings.defaultTargetPath, (req) => {
            if (req === null) return;
            void this.runChosenRecipe(req.recipe, req.targetPath);
        }).open();
    }

    private async loadRecipes(): Promise<LoadedRecipe[]> {
        const source = new ObsidianRecipeSource(this.app.vault, RECIPE_DIR);
        const loadResult = await loadRecipes(source);
        if (loadResult.errors.length > 0) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn] recipe load errors:', loadResult.errors);
        }
        this.recipes = loadResult.recipes;
        return this.recipes;
    }

    private async runChosenRecipe(recipe: LoadedRecipe, targetPath: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('[Huginn] running recipe:', recipe.metadata.name, 'target:', targetPath);
        const result = await this.harness!.run(recipe, { targetPath, titleQuery: recipe.metadata.name }, {});
        // eslint-disable-next-line no-console
        console.log('[Huginn] recipe result:', result);
    }

    private openChat(): void {
        void this.openChatView();
    }

    private createChatViewServices(): import('./ui/chat-view.ts').ChatViewServices {
        const llmClient = this.chatClient ?? new OllamaChatClient({
            baseUrl: this.settings.ollamaUrl,
            model: this.settings.ollamaChatModel,
            timeoutMs: this.settings.chatTimeoutMs,
        });
        // Recipes and harness are assigned asynchronously after view registration;
        // pass live getters so restored views pick them up once initialization finishes.
        const getRecipes = () => this.recipes;
        const getHarness = () => this.harness;
        const getSettings = () => this.settings;
        const getMemory = () => ({
            corrections: this.correctionsMemory,
            user: this.userMemory,
            summary: this.chatSummaryMemory,
        });
        return {
            controller: new ChatController({
                app: this.app,
                llmClient,
                getUserMemoryContext: async () => {
                    const ctx = await this.userMemory?.getContext(5);
                    return ctx?.text ?? '';
                },
                getChatSummaryContext: async () => {
                    const ctx = await this.chatSummaryMemory?.getContext(5);
                    return ctx?.text ?? '';
                },
            }),
            dispatcher: new ChatSkillDispatcher({ llmClient, getRecipes, corrections: this.correctionsMemory ?? undefined }),
            getHarness,
            getRecipes,
            getSettings,
            getMemory,
        };
    }

    private async openChatView(): Promise<void> {
        const existing = this.app.workspace.getLeavesOfType(HUGINN_CHAT_VIEW_TYPE)[0] ?? null;
        if (existing !== null) {
            this.app.workspace.revealLeaf(existing);
            return;
        }
        const leaf = this.app.workspace.getRightLeaf(false);
        if (leaf === null) return;
        await leaf.setViewState({ type: HUGINN_CHAT_VIEW_TYPE, active: true });
        this.app.workspace.revealLeaf(leaf);
    }

    private async installDefaultRecipes(force: boolean): Promise<void> {
        const result = await installDefaultRecipes(this.app.vault, { force });
        const parts: string[] = [];
        if (result.installed > 0) parts.push(`${result.installed} installed`);
        if (result.skipped > 0) parts.push(`${result.skipped} skipped (already present)`);
        if (result.overwritten > 0) parts.push(`${result.overwritten} overwritten`);
        if (result.errors.length > 0) parts.push(`${result.errors.length} errors`);
        new Notice(`Huginn default skills: ${parts.join(', ') || 'no changes'}`);
        if (result.errors.length > 0) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn] install default recipes errors:', result.errors);
        }
        await this.loadRecipes();
    }
}

function createObsidianApplyOptions(app: App): { resolveFile: (path: string) => unknown; readFile: (file: unknown) => Promise<string>; writeFile: (file: unknown, content: string) => Promise<void>; processFrontMatter: (file: unknown, fn: (frontmatter: Record<string, unknown>) => void) => Promise<void>; } {
    return {
        resolveFile(path: string): unknown {
            const file = app.vault.getAbstractFileByPath(path);
            return file instanceof TFile ? file : null;
        },
        async readFile(file: unknown): Promise<string> {
            if (!(file instanceof TFile)) throw new Error('Invalid file');
            return app.vault.read(file);
        },
        async writeFile(file: unknown, content: string): Promise<void> {
            if (!(file instanceof TFile)) throw new Error('Invalid file');
            await app.vault.modify(file, content);
        },
        async processFrontMatter(file: unknown, fn: (frontmatter: Record<string, unknown>) => void): Promise<void> {
            if (!(file instanceof TFile)) throw new Error('Invalid file');
            await app.fileManager.processFrontMatter(file, fn);
        },
    };
}

// ---------------------------------------------------------------------------

class HuginnSettingTab extends PluginSettingTab {
    private plugin: HuginnPlugin;

    constructor(app: unknown, plugin: HuginnPlugin) {
        super(app as never, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Huginn Settings' });

        new Setting(containerEl)
            .setName('Ollama base URL')
            .setDesc('Base URL for the Ollama API, without trailing slash.')
            .addText((text) => text
                .setPlaceholder('http://localhost:11434')
                .setValue(this.plugin.settings.ollamaUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaUrl = value.replace(/\/$/, '');
                    await this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName('Chat model')
            .setDesc('Ollama model used for skill chat completions. Must be a chat-capable model, not an embedding model.')
            .addText((text) => text
                .setPlaceholder('qwen3.5:4b')
                .setValue(this.plugin.settings.ollamaChatModel)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaChatModel = value;
                    await this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName('Chat timeout (ms)')
            .setDesc('Abort chat completion requests after this many milliseconds.')
            .addText((text) => text
                .setPlaceholder('120000')
                .setValue(String(this.plugin.settings.chatTimeoutMs))
                .onChange(async (value) => {
                    const n = Number(value);
                    if (Number.isFinite(n) && n > 0) {
                        this.plugin.settings.chatTimeoutMs = n;
                        await this.plugin.saveData(this.plugin.settings);
                    }
                }));

        new Setting(containerEl)
            .setName('Report-back verbosity')
            .setDesc('How much status feedback the chat sidebar shows when running skills. Verbose is useful while testing; Minimal keeps the chat cleaner.')
            .addDropdown((dropdown) => dropdown
                .addOption('minimal', 'Minimal')
                .addOption('normal', 'Normal')
                .addOption('verbose', 'Verbose')
                .setValue(this.plugin.settings.reportBackVerbosity)
                .onChange(async (value) => {
                    const v = value as import('./settings.ts').ReportBackVerbosity;
                    if (v === 'minimal' || v === 'normal' || v === 'verbose') {
                        this.plugin.settings.reportBackVerbosity = v;
                        await this.plugin.saveData(this.plugin.settings);
                    }
                }));

        new Setting(containerEl)
            .setName('Warm up chat model on load')
            .setDesc('Send a trivial chat request when Huginn initializes so the model is already loaded in memory. Increases VRAM/RAM use.')
            .addToggle((toggle) => toggle
                .setValue(this.plugin.settings.warmupOnFocus)
                .onChange(async (value) => {
                    this.plugin.settings.warmupOnFocus = value;
                    await this.plugin.saveData(this.plugin.settings);
                }));

        new Setting(containerEl)
            .setName('Default target note path')
            .setDesc('Default vault path used by the Run Huginn skill chooser.')
            .addText((text) => text
                .setPlaceholder('notes/gamma.md')
                .setValue(this.plugin.settings.defaultTargetPath)
                .onChange(async (value) => {
                    this.plugin.settings.defaultTargetPath = value;
                    await this.plugin.saveData(this.plugin.settings);
                }));
    }
}
