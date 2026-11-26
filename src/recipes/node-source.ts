// =============================================================================
// Huginn — Node Recipe Source
// src/recipes/node-source.ts
//
// RecipeSource implementation that reads recipe markdown files from a local
// directory. Used by fixtures and build-time tooling, not by the Obsidian
// bundle.
// =============================================================================

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RecipeSource } from './loader.ts';

export class NodeRecipeSource implements RecipeSource {
    constructor(private dir: string) {}

    async listRecipes(): Promise<string[]> {
        const entries = await readdir(this.dir, { withFileTypes: true });
        return entries
            .filter((e) => e.isFile() && e.name.endsWith('.md'))
            .map((e) => join(this.dir, e.name));
    }

    async readRecipe(path: string): Promise<string> {
        return readFile(path, 'utf-8');
    }
}
