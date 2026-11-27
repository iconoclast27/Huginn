// =============================================================================
// Huginn — Recipe Renderer
// src/recipes/renderer.ts
//
// Renders the LLM prompt by replacing {{key}} placeholders in the recipe's
// instructions and output contract with gathered inputs. Keeps the prompt as a
// single string so the model has no tool menu to call — it must return JSON.
// =============================================================================

import type { LoadedRecipe, GatheredInput, RecipeRenderContext } from './types.ts';

export function createRenderContext(recipe: LoadedRecipe, inputs: GatheredInput[]): RecipeRenderContext {
    return { recipe, inputs };
}

export interface RenderedRecipe {
    prompt: string;
    outputSchemaText: string;
}

export function renderRecipe(context: RecipeRenderContext, correctionsText = ''): RenderedRecipe {
    const { recipe, inputs } = context;
    const values = new Map<string, string>();
    for (const input of inputs) {
        values.set(input.key, serializeInputValue(input.value));
    }

    let prompt = substitute(recipe.instructions, values);
    if (correctionsText.length > 0) {
        prompt += `\n\nPrevious mistakes to avoid for this skill:\n${correctionsText}`;
    }

    return {
        prompt,
        outputSchemaText: substitute(JSON.stringify(recipe.outputSchema, null, 2), values),
    };
}

/** The teach channel (Design Report §1: system (skill texts); D-10: a recipe
 *  is payload-shaping text and rides two channels — skill text in the system
 *  position, and the manifest tool descriptions themselves, law at manifest.ts
 *  and policed by H-f42). This face renders the loaded catalog into ONE skill
 *  block for the system position: per recipe a heading naming the skill and
 *  its trigger class, then the instructions verbatim — the teach text is
 *  static payload design (the gatherer that filled placeholders was demolished
 *  at the baseline), so nothing is substituted here and an empty catalog is
 *  honest absence, never a fabricated header. */
export function renderSkillText(recipes: LoadedRecipe[]): string {
    if (recipes.length === 0) return '';
    return recipes.map((r) => `## Skill: ${r.metadata.name} — ${r.trigger.description}\n${r.instructions}`).join('\n\n');
}

/** The single-skill run machinery (the modal face): substitute the user
 *  parameters into a recipe's template. Kept for the apply machinery's
 *  addressed face; the CHAT channel does not use it — the chat teach rides
 *  renderSkillText. */
function serializeInputValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
}

function substitute(template: string, values: Map<string, string>): string {
    let out = template;
    for (const [key, val] of values) {
        // Replace {{key}} with the serialized value. Do not escape regex chars
        // in the key because keys are constrained to simple identifiers.
        out = out.split(`{{${key}}}`).join(val);
    }
    return out;
}
