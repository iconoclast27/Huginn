// =============================================================================
// Huginn — Obsidian Plugin Entry Point
// src/main.ts
//
// Wires the skill harness against the frozen Muninn API door. Huginn owns the
// LLM chat client, recipe loader, and apply registry. Muninn owns the vault
// index and exposes it through getMuninnApi().
// =============================================================================

import { Plugin, Setting, PluginSettingTab, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, sanitizeSettings, type HuginnSettings } from './settings.ts';
import { OllamaChatClient } from './llm/client.ts';
import { HuginnHarness, StaticApprovalGate } from './harness/harness.ts';
import { MuninnApiInputGatherer } from './harness/gather.ts';
import { createDefaultApplyRegistry } from './harness/apply.ts';
import { ObsidianRecipeSource } from './recipes/obsidian-source.ts';
import { loadRecipes } from './recipes/loader.ts';
import type { LoadedRecipe } from './recipes/types.ts';
import type { MuninnApi } from './muninn-api.ts';
import { RecipeChooserModal } from './ui/recipe-modal.ts';

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

        this.app.workspace.onLayoutReady(() => {
            void this.awaitMuninnReady().then((api) => {
                if (api === null) {
                    new Notice('Huginn requires Muninn to be installed and enabled.');
                    return;
                }
                this.muninnApi = api;
                this.harness = new HuginnHarness({
                    llmClient: new OllamaChatClient({
                        baseUrl: this.settings.ollamaUrl,
                        model: this.settings.ollamaChatModel,
                        systemPrompt: 'You are a concise tagging assistant. Return raw JSON only.',
                        timeoutMs: this.settings.chatTimeoutMs,
                    }),
                    inputGatherer: new MuninnApiInputGatherer({ api }),
                    approvalGate: new StaticApprovalGate(false), // default to reject in the skeleton
                    applyRegistry: createDefaultApplyRegistry(),
                });
                // eslint-disable-next-line no-console
                console.log('[Huginn] harness initialized against Muninn API');
                if (this.settings.warmupOnFocus) {
                    void this.warmupChatModel();
                }
            });
        });
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
            this.harness = new HuginnHarness({
                llmClient: new OllamaChatClient({
                    baseUrl: this.settings.ollamaUrl,
                    model: this.settings.ollamaChatModel,
                    systemPrompt: 'You are a concise tagging assistant. Return raw JSON only.',
                    timeoutMs: this.settings.chatTimeoutMs,
                }),
                inputGatherer: new MuninnApiInputGatherer({ api }),
                approvalGate: new StaticApprovalGate(false),
                applyRegistry: createDefaultApplyRegistry(),
            });
        }
        const source = new ObsidianRecipeSource(this.app.vault, RECIPE_DIR);
        const loadResult = await loadRecipes(source);
        if (loadResult.recipes.length === 0) {
            // eslint-disable-next-line no-console
            console.log('[Huginn] no recipes in', RECIPE_DIR);
            new Notice(`No recipes found in ${RECIPE_DIR}`);
            return;
        }
        if (loadResult.errors.length > 0) {
            // eslint-disable-next-line no-console
            console.warn('[Huginn] recipe load errors:', loadResult.errors);
        }
        new RecipeChooserModal(this.app, loadResult.recipes, this.settings.defaultTargetPath, (req) => {
            if (req === null) return;
            void this.runChosenRecipe(req.recipe, req.targetPath);
        }).open();
    }

    private async runChosenRecipe(recipe: LoadedRecipe, targetPath: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('[Huginn] running recipe:', recipe.metadata.name, 'target:', targetPath);
        const result = await this.harness!.run(recipe, { targetPath, titleQuery: recipe.metadata.name }, {});
        // eslint-disable-next-line no-console
        console.log('[Huginn] recipe result:', result);
    }
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
                .setPlaceholder('60000')
                .setValue(String(this.plugin.settings.chatTimeoutMs))
                .onChange(async (value) => {
                    const n = Number(value);
                    if (Number.isFinite(n) && n > 0) {
                        this.plugin.settings.chatTimeoutMs = n;
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
