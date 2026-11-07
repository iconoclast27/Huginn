// =============================================================================
// Huginn — Apply Registry
// src/harness/apply.ts
//
// Registry of harness-owned apply routines. The model never applies changes;
// it only fills the recipe form. The harness selects the routine named by the
// recipe and runs it after schema validation and human approval.
// =============================================================================

import type { ApplyContext, ApplyResult, GatheredInput, ApplyMethodParams } from '../recipes/types.ts';
import { resolveOutputField } from '../ui/render-utils.ts';

export interface ApplyRoutine {
    (ctx: ApplyContext): Promise<ApplyResult>;
}

export interface ApplyRegistry {
    register(name: string, routine: ApplyRoutine): void;
    get(name: string): ApplyRoutine | undefined;
}

export function createApplyRegistry(): ApplyRegistry {
    const map = new Map<string, ApplyRoutine>();

    function register(name: string, routine: ApplyRoutine): void {
        map.set(name, routine);
    }

    function get(name: string): ApplyRoutine | undefined {
        return map.get(name);
    }

    return { register, get };
}

export interface ApplyRegistryOptions {
    /** Resolve a vault path to a file-like object; return null if not found. */
    resolveFile(path: string): unknown;
    /** Read the full text of a resolved file. */
    readFile(file: unknown): Promise<string>;
    /** Write the full text of a resolved file. */
    writeFile(file: unknown, content: string): Promise<void>;
    /**
     * Optional Obsidian-compatible frontmatter mutator. When provided, tag writes
     * use this instead of manual YAML string manipulation so that frontmatter is
     * created or updated through the host's normal mechanism.
     */
    processFrontMatter?(file: unknown, mutator: (frontmatter: Record<string, unknown>) => void): Promise<void>;
}

export function createDefaultApplyRegistry(opts: ApplyRegistryOptions): ApplyRegistry {
    const { resolveFile, readFile, writeFile, processFrontMatter } = opts;
    const registry = createApplyRegistry();

    registry.register('noop', async (ctx): Promise<ApplyResult> => {
        return {
            applied: false,
            message: `no-op apply for ${ctx.recipe.metadata.name}: ${JSON.stringify(ctx.output).slice(0, 200)}`,
        };
    });

    // Generic primitive: append a value or values to a frontmatter array (e.g., tags).
    registry.register('append-frontmatter-array', async (ctx): Promise<ApplyResult> => {
        const params = ctx.recipe.applyParams ?? {};
        const key = stringParam(params, 'key', 'tags');
        const valuePath = stringParam(params, 'valuePath', 'value');
        const unique = booleanParam(params, 'unique', true);
        const rawValue = resolveOutputField(ctx.output, valuePath);
        const values = normalizeAppendArray(rawValue);
        if (values.length === 0) {
            return { applied: false, message: `No ${valuePath} provided; nothing to apply.` };
        }

        const targetPath = extractTargetPath(ctx.inputs);
        const file = targetPath ? resolveFile(targetPath) : null;
        if (!targetPath || !isTFileLike(file)) {
            return { applied: false, message: `Target note not found: ${targetPath ?? 'unknown'}` };
        }

        try {
            if (processFrontMatter) {
                await processFrontMatter(file, (frontmatter) => {
                    const arr = parseFrontmatterArray(frontmatter[key]);
                    for (const valueText of values) {
                        if (!unique || !arr.includes(valueText)) arr.push(valueText);
                    }
                    frontmatter[key] = arr;
                });
            } else {
                const content = await readFile(file);
                const { frontmatter, body } = splitFrontmatter(content);
                const arr = parseFrontmatterArray(frontmatter[key]);
                for (const valueText of values) {
                    if (!unique || !arr.includes(valueText)) arr.push(valueText);
                }
                frontmatter[key] = arr;
                await writeFile(file, joinFrontmatter(frontmatter, body));
            }
            const joined = values.map((v) => `'${v}'`).join(', ');
            return { applied: true, message: `Added ${joined} to frontmatter ${key} of ${targetPath}.` };
        } catch (e) {
            return { applied: false, message: `Failed to write ${key} to ${targetPath}: ${(e as Error).message}` };
        }
    });

    // Generic primitive: set or replace the first H1 heading in the body.
    registry.register('set-first-heading', async (ctx): Promise<ApplyResult> => {
        const params = ctx.recipe.applyParams ?? {};
        const valuePath = stringParam(params, 'valuePath', 'title');
        const value = resolveOutputField(ctx.output, valuePath);
        if (!value || typeof value !== 'string' || value.length === 0) {
            return { applied: false, message: `No ${valuePath} provided; nothing to apply.` };
        }

        const targetPath = extractTargetPath(ctx.inputs);
        const file = targetPath ? resolveFile(targetPath) : null;
        if (!targetPath || !isTFileLike(file)) {
            return { applied: false, message: `Target note not found: ${targetPath ?? 'unknown'}` };
        }

        try {
            const content = await readFile(file);
            const { frontmatter, body } = splitFrontmatter(content);
            frontmatter.title = value;
            const trimmed = body.trimStart();
            const newBody = trimmed.startsWith('# ')
                ? `# ${value}\n${trimmed.slice(trimmed.indexOf('\n') + 1)}`
                : `# ${value}\n\n${body}`;
            await writeFile(file, joinFrontmatter(frontmatter, newBody));
            return { applied: true, message: `Set first heading to '${value}' in ${targetPath}.` };
        } catch (e) {
            return { applied: false, message: `Failed to write title '${value}' to ${targetPath}: ${(e as Error).message}` };
        }
    });

    // Generic primitive: append a section with formatted items (e.g., wikilinks).
    registry.register('append-section', async (ctx): Promise<ApplyResult> => {
        const params = ctx.recipe.applyParams ?? {};
        const heading = stringParam(params, 'heading', 'Related');
        const valuePath = stringParam(params, 'valuePath', 'items');
        const itemTemplate = stringParam(params, 'itemTemplate', '- {{value}}');
        const value = resolveOutputField(ctx.output, valuePath);
        const items = Array.isArray(value)
            ? value.filter((v): v is string => typeof v === 'string' && v.length > 0)
            : [];
        if (items.length === 0) {
            return { applied: false, message: `No ${valuePath} provided; nothing to apply.` };
        }

        const targetPath = extractTargetPath(ctx.inputs);
        const file = targetPath ? resolveFile(targetPath) : null;
        if (!targetPath || !isTFileLike(file)) {
            return { applied: false, message: `Target note not found: ${targetPath ?? 'unknown'}` };
        }

        try {
            const content = await readFile(file);
            const { frontmatter, body } = splitFrontmatter(content);
            const formatted = items.map((item) => itemTemplate.replace(/\{\{value\}\}/g, stripMdExtension(item))).join('\n');
            const separator = body.length > 0 && !body.endsWith('\n\n') ? '\n\n' : '';
            const newBody = `${body}${separator}## ${heading}\n${formatted}\n`;
            await writeFile(file, joinFrontmatter(frontmatter, newBody));
            return { applied: true, message: `Added ${items.length} item(s) to ${targetPath}: ${items.join(', ')}` };
        } catch (e) {
            return { applied: false, message: `Failed to write ${valuePath} to ${targetPath}: ${(e as Error).message}` };
        }
    });

    return registry;
}

function extractTargetPath(inputs: GatheredInput[]): string | undefined {
    const found = inputs.find((i) => i.key === 'targetPath');
    return typeof found?.value === 'string' ? found.value : undefined;
}

function isTFileLike(file: unknown): file is { path: string; extension: string } {
    return typeof file === 'object' && file !== null && 'path' in file && 'extension' in file;
}

function stripMdExtension(path: string): string {
    return path.replace(/\.md$/i, '');
}

interface SplitFrontmatter {
    frontmatter: Record<string, unknown>;
    body: string;
}

/** Split content into frontmatter object and body. Exported for fixture fakes. */
export function splitFrontmatter(content: string): SplitFrontmatter {
    if (!content.startsWith('---\n')) {
        return { frontmatter: {}, body: content };
    }
    const end = content.indexOf('\n---', 4);
    if (end === -1) {
        return { frontmatter: {}, body: content };
    }
    const yaml = content.slice(4, end);
    const body = content.slice(end + 4);
    return { frontmatter: parseSimpleYaml(yaml), body };
}

/** Join frontmatter object and body back into note text. Exported for fixture fakes. */
export function joinFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
    const keys = Object.keys(frontmatter);
    if (keys.length === 0) {
        return body;
    }
    const lines = ['---'];
    for (const key of keys) {
        const value = frontmatter[key];
        if (Array.isArray(value)) {
            lines.push(`${key}:`);
            for (const item of value) {
                lines.push(`  - ${String(item)}`);
            }
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            lines.push(`${key}: ${String(value)}`);
        }
    }
    lines.push('---');
    return `${lines.join('\n')}${body.startsWith('\n') ? '' : '\n'}${body}`;
}

function parseFrontmatterArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
    if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(Boolean);
    return [];
}

function normalizeAppendArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (typeof value === 'string' && value.length > 0) return [value];
    if (typeof value === 'number') return [String(value)];
    return [];
}

function stringParam(params: ApplyMethodParams, key: string, defaultValue: string): string {
    const value = params[key];
    return typeof value === 'string' ? value : defaultValue;
}

function booleanParam(params: ApplyMethodParams, key: string, defaultValue: boolean): boolean {
    const value = params[key];
    return typeof value === 'boolean' ? value : defaultValue;
}

function parseSimpleYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');
    let currentKey: string | null = null;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('- ')) {
            const item = trimmed.slice(2);
            if (currentKey) {
                const arr = result[currentKey] as string[];
                arr.push(item);
            }
            continue;
        }
        const colon = trimmed.indexOf(': ');
        if (colon === -1) continue;
        const key = trimmed.slice(0, colon);
        const value = trimmed.slice(colon + 2);
        if (value === '') {
            result[key] = [];
            currentKey = key;
        } else {
            result[key] = tryNumber(value);
            currentKey = null;
        }
    }
    return result;
}

function tryNumber(value: string): unknown {
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    return value;
}
