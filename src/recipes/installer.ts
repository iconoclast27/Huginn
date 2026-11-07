// =============================================================================
// Huginn — Default Recipe Installer
// src/recipes/installer.ts
//
// Seeds or re-syncs the vault's Agents/Huginn/SKILLS/ folder with the bundled
// default recipes. Never silently overwrites existing files; the user must
// explicitly request a force install.
// =============================================================================

import type { Vault } from 'obsidian';
import { BUNDLED_RECIPES, type BundledRecipe } from './bundled.ts';

const RECIPE_DIR = 'Agents/Huginn/SKILLS';

export interface RecipeInstallResult {
    installed: number;
    skipped: number;
    overwritten: number;
    errors: string[];
}

export async function installDefaultRecipes(vault: Vault, options: { force?: boolean } = {}): Promise<RecipeInstallResult> {
    const result: RecipeInstallResult = { installed: 0, skipped: 0, overwritten: 0, errors: [] };

    // Ensure the recipe folder exists.
    const folder = vault.getAbstractFileByPath(RECIPE_DIR);
    if (!folder) {
        try {
            await vault.createFolder(RECIPE_DIR);
        } catch (e) {
            result.errors.push(`Failed to create ${RECIPE_DIR}: ${(e as Error).message}`);
            return result;
        }
    }

    for (const recipe of BUNDLED_RECIPES) {
        const path = `${RECIPE_DIR}/${recipe.fileName}`;
        const existing = vault.getAbstractFileByPath(path);
        if (existing && !options.force) {
            result.skipped++;
            continue;
        }
        try {
            if (existing) {
                await vault.modify(existing as never, recipe.content);
                result.overwritten++;
            } else {
                await vault.create(path, recipe.content);
                result.installed++;
            }
        } catch (e) {
            result.errors.push(`Failed to write ${path}: ${(e as Error).message}`);
        }
    }

    return result;
}

export function getBundledRecipeNames(): string[] {
    return BUNDLED_RECIPES.map((r) => r.fileName);
}
