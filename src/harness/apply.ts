// =============================================================================
// Huginn — Apply Registry
// src/harness/apply.ts
//
// Registry of harness-owned apply routines. The model never applies changes;
// it only fills the recipe form. The harness selects the routine named by the
// recipe and runs it after schema validation and human approval.
// =============================================================================

import type { ApplyContext, ApplyResult, GatheredInput } from '../recipes/types.ts';

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

    registry.register('suggest-tags', async (ctx): Promise<ApplyResult> => {
        const typed = ctx.output as { tag?: string; reason?: string; confidence?: number };
        const tag = typed.tag;
        if (!tag || tag.length === 0) {
            return { applied: false, message: 'No tag provided; nothing to apply.' };
        }

        const targetPath = extractTargetPath(ctx.inputs);
        const file = targetPath ? resolveFile(targetPath) : null;
        if (!targetPath || !isTFileLike(file)) {
            return { applied: false, message: `Target note not found: ${targetPath ?? 'unknown'}` };
        }

        try {
            if (processFrontMatter) {
                await processFrontMatter(file, (frontmatter) => {
                    const tags = parseTags(frontmatter.tags);
                    if (!tags.includes(tag)) tags.push(tag);
                    frontmatter.tags = formatTags(tags);
                });
            } else {
                const content = await readFile(file);
                const newContent = addTagToFrontmatter(content, tag);
                await writeFile(file, newContent);
            }
            return {
                applied: true,
                message: `Added tag '${tag}' to frontmatter of ${targetPath}.`,
            };
        } catch (e) {
            return {
                applied: false,
                message: `Failed to write tag '${tag}' to ${targetPath}: ${(e as Error).message}`,
            };
        }
    });

    registry.register('suggest-title', async (ctx): Promise<ApplyResult> => {
        const typed = ctx.output as { title?: string; reason?: string; confidence?: number };
        const title = typed.title;
        if (!title || title.length === 0) {
            return { applied: false, message: 'No title provided; nothing to apply.' };
        }

        const targetPath = extractTargetPath(ctx.inputs);
        const file = targetPath ? resolveFile(targetPath) : null;
        if (!targetPath || !isTFileLike(file)) {
            return { applied: false, message: `Target note not found: ${targetPath ?? 'unknown'}` };
        }

        try {
            const content = await readFile(file);
            const newContent = setFirstHeading(content, title);
            await writeFile(file, newContent);
            return {
                applied: true,
                message: `Set first heading to '${title}' in ${targetPath}.`,
            };
        } catch (e) {
            return {
                applied: false,
                message: `Failed to write title '${title}' to ${targetPath}: ${(e as Error).message}`,
            };
        }
    });

    registry.register('suggest-links', async (ctx): Promise<ApplyResult> => {
        const typed = ctx.output as { links?: string[]; confidence?: number };
        const links = Array.isArray(typed.links) ? typed.links.filter((l) => typeof l === 'string' && l.length > 0) : [];
        if (links.length === 0) {
            return { applied: false, message: 'No links provided; nothing to apply.' };
        }

        const targetPath = extractTargetPath(ctx.inputs);
        const file = targetPath ? resolveFile(targetPath) : null;
        if (!targetPath || !isTFileLike(file)) {
            return { applied: false, message: `Target note not found: ${targetPath ?? 'unknown'}` };
        }

        try {
            const content = await readFile(file);
            const newContent = appendLinksSection(content, links);
            await writeFile(file, newContent);
            return {
                applied: true,
                message: `Added ${links.length} link(s) to ${targetPath}: ${links.join(', ')}`,
            };
        } catch (e) {
            return {
                applied: false,
                message: `Failed to write links to ${targetPath}: ${(e as Error).message}`,
            };
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

function addTagToFrontmatter(content: string, tag: string): string {
    const { frontmatter, body } = splitFrontmatter(content);
    const tags = frontmatter.tags ? parseTags(frontmatter.tags) : [];
    if (tags.includes(tag)) {
        // Preserve unchanged content if tag already present.
        return content;
    }
    tags.push(tag);
    frontmatter.tags = formatTags(tags);
    return joinFrontmatter(frontmatter, body);
}

function setFirstHeading(content: string, title: string): string {
    const { frontmatter, body } = splitFrontmatter(content);
    frontmatter.title = title;
    const trimmed = body.trimStart();
    if (trimmed.startsWith('# ')) {
        const rest = trimmed.slice(trimmed.indexOf('\n') + 1);
        return joinFrontmatter(frontmatter, `# ${title}\n${rest}`);
    }
    return joinFrontmatter(frontmatter, `# ${title}\n\n${body}`);
}

function appendLinksSection(content: string, links: string[]): string {
    const { frontmatter, body } = splitFrontmatter(content);
    const formatted = links.map((l) => `[[${stripMdExtension(l)}]]`).join('\n');
    const separator = body.length > 0 && !body.endsWith('\n\n') ? '\n\n' : '';
    return joinFrontmatter(frontmatter, `${body}${separator}## Related\n${formatted}\n`);
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

function parseTags(value: unknown): string[] {
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string') as string[];
    if (typeof value === 'string') return value.split(',').map((t) => t.trim()).filter(Boolean);
    return [];
}

function formatTags(tags: string[]): string[] {
    return tags;
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
