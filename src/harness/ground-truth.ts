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

/**
 * A proposal value that is already true in the vault. `path` is the validation rule's
 * pointer into the output object, so the harness can strip the value from the proposal
 * before the approval gate sees it.
 */
export interface GroundTruthDrop {
    path: string;
    value: string;
}

/** Validation result plus the proposal values that are already true in the vault. */
export interface GroundTruthResult extends ValidationResult {
    drops?: GroundTruthDrop[];
}

export interface GroundTruthValidator {
    validate(recipe: LoadedRecipe, inputs: GatheredInput[], output: unknown): Promise<GroundTruthResult>;
}

export interface GroundTruthContext {
    recipe: LoadedRecipe;
    output: unknown;
    inputs: GatheredInput[];
    vault: VaultReader;
}

/** Outcome of one primitive: fatal errors plus the proposal values already true in the vault. */
export interface PrimitiveOutcome {
    errors: ValidationError[];
    /** Proposal values that are already true in the vault; the harness strips them from the proposal. */
    drops: string[];
}

/**
 * A primitive returns either bare errors (the legacy shape) or errors plus drops.
 * The validator normalizes both, so third-party primitives registered by f17's
 * pattern keep working unchanged.
 */
export type PrimitiveResult = ValidationError[] | PrimitiveOutcome;

export interface GroundTruthPrimitive {
    /** Stable primitive name used in recipes. */
    name: string;
    /** Run the check. No fatal errors on success; drops are not failures. */
    validate(ctx: GroundTruthContext, params: Record<string, unknown>): Promise<PrimitiveResult>;
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
        .register(frontmatterNotContainsPrimitive)
        .register(noteContainsTextPrimitive)
        .register(noteNotContainsTextPrimitive);
}

export class VaultGroundTruthValidator implements GroundTruthValidator {
    constructor(private registry: GroundTruthRegistry, private vault: VaultReader) {}

    async validate(recipe: LoadedRecipe, inputs: GatheredInput[], output: unknown): Promise<GroundTruthResult> {
        const errors: ValidationError[] = [];
        const drops: GroundTruthDrop[] = [];
        for (const rule of recipe.validation) {
            await this.validateRule(recipe, rule, inputs, output, errors, drops);
        }
        return { ok: errors.length === 0, errors, drops };
    }

    private async validateRule(recipe: LoadedRecipe, rule: RecipeValidationRule, inputs: GatheredInput[], output: unknown, errors: ValidationError[], drops: GroundTruthDrop[]): Promise<void> {
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
        const outcome = normalizePrimitiveResult(await primitive.validate(ctx, rule.params ?? {}));
        for (const dropped of outcome.drops) {
            drops.push({ path: rule.path, value: dropped });
        }
        if (rule.description && outcome.errors.length > 0) {
            errors.push(...outcome.errors.map((e) => ({ path: e.path, message: `${rule.description}: ${e.message}` })));
        } else {
            errors.push(...outcome.errors);
        }
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
        return exists ? { errors: [], drops: [] }
            : { errors: [{ path: String(params.path ?? '/'), message: `file does not exist: ${filePath}` }], drops: [] };
    },
};

const fileNotExistsPrimitive: GroundTruthPrimitive = {
    name: 'file-not-exists',
    async validate({ vault, output }, params) {
        const filePath = String(output);
        const exists = vault.getFileFrontmatter(filePath) !== null;
        return exists
            ? { errors: [{ path: String(params.path ?? '/'), message: `file already exists: ${filePath}` }], drops: [] }
            : { errors: [], drops: [] };
    },
};

const frontmatterContainsPrimitive: GroundTruthPrimitive = {
    name: 'frontmatter-contains',
    async validate({ vault, output, inputs }, params) {
        const targetPath = findInputString(inputs, String(params.targetPathInput ?? 'targetPath'));
        if (!targetPath) {
            return { errors: [{ path: String(params.path ?? '/'), message: 'missing targetPath input for frontmatter check' }], drops: [] };
        }
        const frontmatter = vault.getFileFrontmatter(targetPath);
        if (frontmatter === null) {
            return { errors: [{ path: String(params.path ?? '/'), message: `target file not found: ${targetPath}` }], drops: [] };
        }
        const key = String(params.key ?? 'tags');
        const fmValue = frontmatter[key];
        if (Array.isArray(output)) {
            // Array proposal: every proposed value must already be present in the key.
            // Nothing is stripped here: this primitive asks for presence, so a proposal
            // value that is already in the vault is satisfied, not surplus.
            const fmValues = frontmatterValues(fmValue);
            const proposal = output.map((v) => String(v));
            const missing = proposal.filter((v) => !fmValues.includes(v));
            return missing.length === 0
                ? { errors: [], drops: [] }
                : { errors: [{ path: String(params.path ?? '/'), message: `values not present in frontmatter key '${key}'` }], drops: [] };
        }
        const matched = valuesMatch(fmValue, output);
        return matched ? { errors: [], drops: [] }
            : { errors: [{ path: String(params.path ?? '/'), message: `value does not match frontmatter key '${key}'` }], drops: [] };
    },
};

const frontmatterNotContainsPrimitive: GroundTruthPrimitive = {
    name: 'frontmatter-not-contains',
    async validate({ vault, output, inputs }, params) {
        const targetPath = findInputString(inputs, String(params.targetPathInput ?? 'targetPath'));
        if (!targetPath) {
            return { errors: [{ path: String(params.path ?? '/'), message: 'missing targetPath input for frontmatter check' }], drops: [] };
        }
        const frontmatter = vault.getFileFrontmatter(targetPath);
        if (frontmatter === null) {
            return { errors: [{ path: String(params.path ?? '/'), message: `target file not found: ${targetPath}` }], drops: [] };
        }
        const key = String(params.key ?? 'tags');
        const fmValue = frontmatter[key];
        if (Array.isArray(output)) {
            // Array proposal (up to two tags): check each proposed value against the key.
            // A value that is already in the vault is a DROP, not a failure: the harness
            // strips it and the user approves only the survivors. The proposal fails only
            // when every proposed value is already true, leaving nothing to apply.
            const fmValues = frontmatterValues(fmValue);
            const proposal = output.map((v) => String(v));
            const dropped = proposal.filter((v) => fmValues.includes(v));
            if (dropped.length === proposal.length) {
                return {
                    errors: [{ path: String(params.path ?? '/'), message: `values already present in frontmatter key '${key}'` }],
                    drops: proposal,
                };
            }
            return { errors: [], drops: dropped };
        }
        const matched = valuesMatch(fmValue, output);
        return matched
            ? { errors: [{ path: String(params.path ?? '/'), message: `value already present in frontmatter key '${key}'` }], drops: [] }
            : { errors: [], drops: [] };
    },
};

const noteContainsTextPrimitive: GroundTruthPrimitive = {
    name: 'note-contains-text',
    async validate({ vault, output, inputs }, params) {
        const targetPath = findInputString(inputs, String(params.targetPathInput ?? 'targetPath'));
        if (!targetPath) {
            return { errors: [{ path: String(params.path ?? '/'), message: 'missing targetPath input for note text check' }], drops: [] };
        }
        const body = await vault.readFile(targetPath);
        if (body === null) {
            return { errors: [{ path: String(params.path ?? '/'), message: `target file not found: ${targetPath}` }], drops: [] };
        }
        if (Array.isArray(output)) {
            // Array proposal: every proposed string must be present in the body.
            // Presence is what this primitive asks for, so nothing is stripped.
            const needles = output.map((v) => String(v));
            const missing = needles.filter((n) => !body.toLowerCase().includes(n.toLowerCase()));
            return missing.length === 0
                ? { errors: [], drops: [] }
                : { errors: [{ path: String(params.path ?? '/'), message: `text not found in note body: ${missing.join(', ')}` }], drops: [] };
        }
        const needle = String(output).toLowerCase();
        return body.toLowerCase().includes(needle)
            ? { errors: [], drops: [] }
            : { errors: [{ path: String(params.path ?? '/'), message: `text not found in note body: ${String(output)}` }], drops: [] };
    },
};

const noteNotContainsTextPrimitive: GroundTruthPrimitive = {
    name: 'note-not-contains-text',
    async validate({ vault, output, inputs }, params) {
        const targetPath = findInputString(inputs, String(params.targetPathInput ?? 'targetPath'));
        if (!targetPath) {
            return { errors: [{ path: String(params.path ?? '/'), message: 'missing targetPath input for note text check' }], drops: [] };
        }
        const body = await vault.readFile(targetPath);
        if (body === null) {
            return { errors: [{ path: String(params.path ?? '/'), message: `target file not found: ${targetPath}` }], drops: [] };
        }
        if (Array.isArray(output)) {
            // Array proposal: a string already in the body is a DROP, not a failure.
            // The proposal fails only when every proposed string is already in the body.
            const needles = output.map((v) => String(v));
            const dropped = needles.filter((n) => body.toLowerCase().includes(n.toLowerCase()));
            if (dropped.length === needles.length) {
                return {
                    errors: [{ path: String(params.path ?? '/'), message: `text already present in note body: ${dropped.join(', ')}` }],
                    drops: needles,
                };
            }
            return { errors: [], drops: dropped };
        }
        const needle = String(output).toLowerCase();
        return body.toLowerCase().includes(needle)
            ? { errors: [{ path: String(params.path ?? '/'), message: `text already present in note body: ${String(output)}` }], drops: [] }
            : { errors: [], drops: [] };
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

/** Accept both primitive shapes: bare errors, or errors plus drops. */
export function normalizePrimitiveResult(result: PrimitiveResult): PrimitiveOutcome {
    return Array.isArray(result) ? { errors: result, drops: [] } : result;
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

/**
 * The frontmatter key as a list of comparable strings. A scalar key (`tags: taxonomy`)
 * is one value; an array key (`tags: [a, b]`) is several. Used by the primitives that
 * check array proposals element by element.
 */
export function frontmatterValues(frontmatterValue: unknown): string[] {
    if (frontmatterValue === undefined || frontmatterValue === null) return [];
    if (Array.isArray(frontmatterValue)) {
        return frontmatterValue.map((v) => String(v));
    }
    return [String(frontmatterValue)];
}

/**
 * Remove proposal values that are already true in the vault and return the surviving
 * proposal as a clone. Every other field (`reason`, `confidence`) is carried through
 * untouched, so the approval gate sees the proposal as the model wrote it, minus the
 * stripped values. The clone never mutates the model's parsed output, which fixtures
 * and the corrections record both read.
 */
export function stripGroundTruthDrops(output: unknown, drops: GroundTruthDrop[]): unknown {
    if (drops.length === 0) return output;
    const clone = JSON.parse(JSON.stringify(output ?? null)) as unknown;
    for (const drop of drops) {
        const keys = drop.path.replace(/^\//, '').split('/').filter((k) => k.length > 0);
        if (keys.length === 0) continue;
        const last = keys[keys.length - 1];
        let parent: Record<string, unknown> | undefined = clone as Record<string, unknown>;
        for (const key of keys.slice(0, -1)) {
            const next: unknown = parent?.[key];
            parent = typeof next === 'object' && next !== null && !Array.isArray(next)
                ? next as Record<string, unknown>
                : undefined;
        }
        if (!parent) continue;
        const value = parent[last];
        if (Array.isArray(value)) {
            const survivors = value.filter((v) => String(v) !== drop.value);
            if (survivors.length === 0) delete parent[last];
            else parent[last] = survivors;
        } else if (value !== undefined && String(value) === drop.value) {
            delete parent[last];
        }
    }
    return clone;
}
