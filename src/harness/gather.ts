// =============================================================================
// Huginn — Muninn API Input Gatherer
// src/harness/gather.ts
//
// Gathers inputs for a recipe by calling the frozen Muninn API door. This is
// the bridge between Muninn's vault index and Huginn's skill harness. It never
// calls external systems; every input comes from the local store or the vault
// path the recipe names.
// =============================================================================

import { App, TFile } from 'obsidian';
import type { MuninnApi, TagInfo, Hit, ChunkRef } from '../muninn-api.ts';
import type { LoadedRecipe, GatheredInput, RecipeInput } from '../recipes/types.ts';
import type { InputGatherer } from './harness.ts';

export interface MuninnGathererOptions {
    api: MuninnApi;
    app: App;
    /** Fallback value for `targetPath` if not provided in params. */
    defaultTargetPath?: string;
}

export class MuninnApiInputGatherer implements InputGatherer {
    constructor(private opts: MuninnGathererOptions) {}

    async gather(recipe: LoadedRecipe, params?: Record<string, unknown>): Promise<GatheredInput[]> {
        const resolved: Record<string, unknown> = {};
        const out: GatheredInput[] = [];
        for (const input of recipe.inputs) {
            const value = await this.resolveInput(input, params ?? {}, resolved);
            resolved[input.key] = value;
            out.push({ key: input.key, value });
        }
        return out;
    }

    private async resolveInput(input: RecipeInput, params: Record<string, unknown>, resolved: Record<string, unknown>): Promise<unknown> {
        switch (input.source) {
            case 'recipe-param':
                return params[input.key] ?? this.opts.defaultTargetPath ?? null;
            case 'content': {
                const path = String(params[input.key] ?? this.opts.defaultTargetPath ?? '');
                return this.gatherContent(path);
            }
            case 'vocabulary':
                return this.gatherVocabulary();
            case 'query': {
                const queryKey = input.queryKey ?? input.key;
                const query = String(resolved[queryKey] ?? params[queryKey] ?? '');
                return this.gatherQuery(query);
            }
            case 'path': {
                const path = String(params[input.key] ?? this.opts.defaultTargetPath ?? '');
                return this.gatherRelatedChunks(path);
            }
            case 'constant':
                return params[input.key] ?? null;
            default:
                return null;
        }
    }

    private gatherVocabulary(): { tags: TagInfo[] } | null {
        return this.opts.api.tagVocabulary();
    }

    private gatherQuery(query: string): { hits: Hit[] } | null {
        if (!query || query.length < 2) return null;
        const text = this.opts.api.searchText(query);
        if (text === null) return null;
        return { hits: text.hits.slice(0, 20) };
    }

    private gatherRelatedChunks(path: string): { neighbors: ChunkRef[] } | null {
        if (!path || path.length === 0) return null;
        return this.opts.api.relatedChunks(path, 10);
    }

    private async gatherContent(path: string): Promise<{ content: string } | null> {
        if (!path || path.length === 0) return null;
        const file = this.opts.app.vault.getAbstractFileByPath(path);
        if (!file || !(file instanceof TFile)) {
            return null;
        }
        const content = await this.opts.app.vault.cachedRead(file);
        return { content };
    }
}
