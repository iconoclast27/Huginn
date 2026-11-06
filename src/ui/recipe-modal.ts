// =============================================================================
// Huginn — Recipe Chooser Modal
// src/ui/recipe-modal.ts
//
// Simple Obsidian modal that lets the user pick a loaded recipe and supply a
// target note path. Used by the Huginn: Run skill command.
// =============================================================================

import { Modal, Setting, Notice, type App } from 'obsidian';
import type { LoadedRecipe } from '../recipes/types.ts';

export interface RecipeRunRequest {
    recipe: LoadedRecipe;
    targetPath: string;
}

export class RecipeChooserModal extends Modal {
    private recipes: LoadedRecipe[];
    private chosen: LoadedRecipe | null = null;
    private targetPath = '';
    private onConfirm: (req: RecipeRunRequest | null) => void;

    constructor(
        app: App,
        recipes: LoadedRecipe[],
        defaultTargetPath: string,
        onConfirm: (req: RecipeRunRequest | null) => void,
    ) {
        super(app);
        this.recipes = recipes;
        this.targetPath = defaultTargetPath;
        this.onConfirm = onConfirm;
        if (recipes.length > 0) {
            this.chosen = recipes[0] as LoadedRecipe;
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Huginn: Run skill' });

        if (this.recipes.length === 0) {
            contentEl.createEl('p', { text: 'No recipes found.' });
            return;
        }

        new Setting(contentEl)
            .setName('Recipe')
            .setDesc('Choose the skill recipe to run.')
            .addDropdown((dropdown) => {
                for (const recipe of this.recipes) {
                    dropdown.addOption(recipe.sourcePath, recipe.metadata.name);
                }
                dropdown.setValue(this.chosen?.sourcePath ?? '');
                dropdown.onChange((value) => {
                    this.chosen = this.recipes.find((r) => r.sourcePath === value) ?? null;
                });
            });

        new Setting(contentEl)
            .setName('Target note path')
            .setDesc('Vault path of the note to run the skill against.')
            .addText((text) => {
                text.setPlaceholder('notes/gamma.md');
                text.setValue(this.targetPath);
                text.onChange((value) => {
                    this.targetPath = value;
                });
            });

        new Setting(contentEl).addButton((button) => {
            button.setButtonText('Run');
            button.setCta();
            button.onClick(() => {
                if (this.chosen === null) {
                    new Notice('Please select a recipe.');
                    return;
                }
                const target = this.targetPath.trim();
                if (target.length === 0) {
                    new Notice('Please enter a target note path.');
                    return;
                }
                this.close();
                this.onConfirm({ recipe: this.chosen, targetPath: target });
            });
        });
    }

    onClose(): void {
        if (this.chosen === null) {
            this.onConfirm(null);
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}
