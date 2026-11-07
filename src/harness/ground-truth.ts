// =============================================================================
// Huginn — Ground-Truth Validator
// src/harness/ground-truth.ts
//
// Checks a model's output against the actual vault state via a registry of
// named primitives. This is the first line of defense against hallucinated
// suggestions: a tag proposal is invalid if the target note already has that
// tag, and a path is invalid if the file it names does not exist.
//
// New primitives can be registered without touching this file.
// =============================================================================

import type { LoadedRecipe, GatheredInput, ValidationError, ValidationResult, RecipeValidationRule } from '../recipes/types.ts';

export interface VaultReader {
    /** Return the parsed frontmatter object for a vault path, or null if the file does not exist. */
    getFileFrontmatter(path: string): Record<string, unknown> | null;
    /** Return the raw file body for a vault path, or null if the file does not exist. */
    readFile(path: string): Promise<string | null>;
}

export interface GroundTruthValidator {
    validate(recipe: LoadedRecipe, inputs: GatheredInput[], output: unknown): Promise<ValidationResult>;
}

export interface GroundTruthContext {
    recipe: LoadedRecipe;
    output: unknown;
    inputs: GatheredInput[];
    vault: VaultReader;
}

export interface GroundTruthPrimitive {
    /** Stable primitive name used in recipes. */
    name: string;
    /** Run the check. Returns an empty array on success. */
    validate(ctx: GroundTruthContext, params: Record<string, unknown>): Promise<ValidationError[]>;
}

export class GroundTruthRegistry {
    private primitives = new Map<string, GroundTruthPrimitive>();

    register(primitive: GroundTruthPrimitive): this {
        this.primitives.set(primitive.name, primitive);
        return this;
    }

    get(name: string): GroundTruthPrimitive | undefined {
        return this.primitives.get(name);
    }
}

export function createDefaultGroundTruthRegistry(): GroundTruthRegistry {
    return new GroundTruthRegistry()
        .register(fileExistsPrimitive)
        .register(fileNotExistsPrimitive)
        .register(frontmatterContainsPrimitive)
        .register(frontmatterNotContainsPrimitive);
}

export class VaultGroundTruthValidator implements GroundTruthValidator {
    constructor(private registry: GroundTruthRegistry, private vault: VaultReader) {}

    async validate(recipe: LoadedRecipe, inputs: GatheredInput[], output: unknown): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        for (const rule of recipe.validation) {
            await this.validateRule(recipe, rule, inputs, output, errors);
        }
        return { ok: errors.length === 0, errors };
    }

    private async validateRule(recipe: LoadedRecipe, rule: RecipeValidationRule, inputs: GatheredInput[], output: unknown, errors: ValidationError[]): Promise<void> {
        const value = getValueAtPointer(output, rule.path);
        if (value === undefined) {
            errors.push({ path: rule.path, message: 'output value missing for ground-truth check' });
            return;
        }

        const primitive = this.registry.get(rule.primitive);
        if (!primitive) {
            errors.push({ path: rule.path, message: `unsupported ground-truth primitive: ${rule.primitive}` });
            return;
        }

        const ctx: GroundTruthContext = { recipe, output: value, inputs, vault: this.vault };
        errors.push(...await primitive.validate(ctx, rule.params ?? {}));
    }
}

// ---------------------------------------------------------------------------
// Built-in primitives
// ---------------------------------------------------------------------------

const fileExistsPrimitive: GroundTruthPrimitive = {
    name: 'file-exists',
    async validate({ vault, output }, params) {
        const filePath = String(output);
        const exists = vault.getFileFrontmatter(filePath) !== null;
        return exists ? []
            : [{ path: String(params.path ?? '/'), message: `file does not exist: ${filePath}` }];
    },
};

const fileNotExistsPrimitive: GroundTruthPrimitive = {
    name: 'file-not-exists',
    async validate({ vault, output }, params) {
        const filePath = String(output);
        const exists = vault.getFileFrontmatter(filePath) !== null;
        return exists
            ? [{ path: String(params.path ?? '/'), message: `file already exists: ${filePath}` }]
            : [];
    },
};

const frontmatterContainsPrimitive: GroundTruthPrimitive = {
    name: 'frontmatter-contains',
    async validate({ vault, output, inputs }, params) {
        const targetPath = findInputString(inputs, String(params.targetPathInput ?? 'targetPath'));
        if (!targetPath) {
            return [{ path: String(params.path ?? '/'), message: 'missing targetPath input for frontmatter check' }];
        }
        const frontmatter = vault.getFileFrontmatter(targetPath);
        if (frontmatter === null) {
            return [{ path: String(params.path ?? '/'), message: `target file not found: ${targetPath}` }];
        }
        const key = String(params.key ?? 'tags');
        const fmValue = frontmatter[key];
        const matched = valuesMatch(fmValue, output);
        return matched ? []
            : [{ path: String(params.path ?? '/'), message: `value does not match frontmatter key '${key}'` }];
    },
};

const frontmatterNotContainsPrimitive: GroundTruthPrimitive = {
    name: 'frontmatter-not-contains',
    async validate({ vault, output, inputs }, params) {
        const targetPath = findInputString(inputs, String(params.targetPathInput ?? 'targetPath'));
        if (!targetPath) {
            return [{ path: String(params.path ?? '/'), message: 'missing targetPath input for frontmatter check' }];
        }
        const frontmatter = vault.getFileFrontmatter(targetPath);
        if (frontmatter === null) {
            return [{ path: String(params.path ?? '/'), message: `target file not found: ${targetPath}` }];
        }
        const key = String(params.key ?? 'tags');
        const fmValue = frontmatter[key];
        const matched = valuesMatch(fmValue, output);
        return matched
            ? [{ path: String(params.path ?? '/'), message: `value already present in frontmatter key '${key}'` }]
            : [];
    },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function findInputString(inputs: GatheredInput[], key: string): string | undefined {
    const found = inputs.find((i) => i.key === key);
    const value = found?.value;
    return typeof value === 'string' ? value : undefined;
}

export function getValueAtPointer(data: unknown, pointer: string): unknown {
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

export function valuesMatch(frontmatterValue: unknown, outputValue: unknown): boolean {
    if (frontmatterValue === undefined || frontmatterValue === null) return false;
    if (Array.isArray(frontmatterValue)) {
        return frontmatterValue.some((v) => v === outputValue);
    }
    return frontmatterValue === outputValue;
}
