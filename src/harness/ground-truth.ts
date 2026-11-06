// =============================================================================
// Huginn — Ground-Truth Validator
// src/harness/ground-truth.ts
//
// Checks a model's output against the actual vault state. This is the first
// line of defense against hallucinated suggestions: a tag proposal is invalid
// if the target note already has that tag, and a path is invalid if the file
// it names does not exist (or already exists, depending on the rule).
// =============================================================================

import type { LoadedRecipe, GatheredInput, ValidationError, ValidationResult, RecipeValidationRule } from '../recipes/types.ts';

export interface VaultReader {
    /** Return the parsed frontmatter object for a vault path, or null if the file does not exist. */
    getFileFrontmatter(path: string): Record<string, unknown> | null;
}

export interface GroundTruthValidator {
    validate(recipe: LoadedRecipe, inputs: GatheredInput[], output: unknown): Promise<ValidationResult>;
}

export class VaultGroundTruthValidator implements GroundTruthValidator {
    constructor(private vault: VaultReader) {}

    async validate(recipe: LoadedRecipe, inputs: GatheredInput[], output: unknown): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        for (const rule of recipe.validation) {
            this.validateRule(rule, inputs, output, errors);
        }
        return { ok: errors.length === 0, errors };
    }

    private validateRule(rule: RecipeValidationRule, inputs: GatheredInput[], output: unknown, errors: ValidationError[]): void {
        const value = getValueAtPointer(output, rule.path);
        if (value === undefined) {
            errors.push({ path: rule.path, message: 'output value missing for ground-truth check' });
            return;
        }

        switch (rule.check) {
            case 'exists':
            case 'not-exists': {
                const filePath = String(value);
                const exists = this.vault.getFileFrontmatter(filePath) !== null;
                if (rule.check === 'exists' && !exists) {
                    errors.push({ path: rule.path, message: `file does not exist: ${filePath}` });
                }
                if (rule.check === 'not-exists' && exists) {
                    errors.push({ path: rule.path, message: `file already exists: ${filePath}` });
                }
                return;
            }
            case 'matches-frontmatter':
            case 'not-in-frontmatter': {
                const targetPath = findInputString(inputs, 'targetPath');
                if (!targetPath) {
                    errors.push({ path: rule.path, message: 'missing targetPath input for vault-file validation' });
                    return;
                }
                const frontmatter = this.vault.getFileFrontmatter(targetPath);
                if (frontmatter === null) {
                    errors.push({ path: rule.path, message: `target file not found: ${targetPath}` });
                    return;
                }
                const key = typeof rule.params?.key === 'string' ? rule.params.key : 'tags';
                const fmValue = frontmatter[key];
                const matched = valuesMatch(fmValue, value);
                if (rule.check === 'matches-frontmatter' && !matched) {
                    errors.push({ path: rule.path, message: `value does not match frontmatter key '${key}'` });
                }
                if (rule.check === 'not-in-frontmatter' && matched) {
                    errors.push({ path: rule.path, message: `value already present in frontmatter key '${key}'` });
                }
                return;
            }
            default:
                errors.push({ path: rule.path, message: `unsupported ground-truth check: ${(rule as RecipeValidationRule).check}` });
        }
    }
}

function findInputString(inputs: GatheredInput[], key: string): string | undefined {
    const found = inputs.find((i) => i.key === key);
    const value = found?.value;
    return typeof value === 'string' ? value : undefined;
}

function getValueAtPointer(data: unknown, pointer: string): unknown {
    if (pointer === '' || pointer === '/') return data;
    const parts = pointer.replace(/^\//, '').split('/');
    let current: unknown = data;
    for (const part of parts) {
        if (current === null || typeof current !== 'object' || Array.isArray(current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

function valuesMatch(frontmatterValue: unknown, outputValue: unknown): boolean {
    if (frontmatterValue === undefined || frontmatterValue === null) return false;
    if (Array.isArray(frontmatterValue)) {
        return frontmatterValue.some((v) => v === outputValue);
    }
    return frontmatterValue === outputValue;
}
