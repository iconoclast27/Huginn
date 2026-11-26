// =============================================================================
// Huginn — F20: Apply registry supports array values generically
// src/fixtures/f20.ts
//
// Verifies that append-frontmatter-array can receive either a single string
// value or an array of strings from the recipe output, so recipes are not
// hard-wired to single-tag output.
//
// Run: npx tsx src/fixtures/f20.ts
// =============================================================================

import { createDefaultApplyRegistry, splitFrontmatter } from '../harness/apply.ts';
import type { ApplyContext } from '../recipes/types.ts';
import type { GatheredInput } from '../recipes/types.ts';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F20 FAIL: ${msg}`);
}

function fakeApplyContext(output: unknown, inputs: GatheredInput[] = [{ key: 'targetPath', value: 'notes/gamma.md' }]): ApplyContext {
    return {
        recipe: {
            metadata: { name: 'multi-tag-test', version: '0.1.0', modelTier: 'fast', riskClass: 'suggest' },
            trigger: { description: 'test' },
            sourcePath: 'fixture://multi-tag-test.md',
            inputs: [],
            instructions: '',
            outputSchema: { type: 'object', properties: {} },
            applyMethod: 'append-frontmatter-array',
            applyParams: { key: 'tags', valuePath: 'tags' },
            validation: [],
        },
        output,
        inputs,
    };
}

async function main(): Promise<void> {
    console.log('[F20] apply registry supports array values generically');

    const files: Record<string, string> = {
        'notes/gamma.md': '---\ntags:\n  - existing\n---\nBody.',
    };
    const registry = createDefaultApplyRegistry({
        resolveFile(path: string): unknown {
            return Object.prototype.hasOwnProperty.call(files, path) ? { path, extension: 'md' } : null;
        },
        async readFile(file: unknown): Promise<string> {
            return files[(file as { path: string }).path] ?? '';
        },
        async writeFile(file: unknown, content: string): Promise<void> {
            files[(file as { path: string }).path] = content;
        },
        async processFrontMatter(file: unknown, fn: (frontmatter: Record<string, unknown>) => void): Promise<void> {
            const path = (file as { path: string }).path;
            const { frontmatter, body } = splitFrontmatter(files[path] ?? '');
            fn(frontmatter);
            files[path] = body.startsWith('\n') ? `---\n${frontmatterToYaml(frontmatter)}---${body}` : `---\n${frontmatterToYaml(frontmatter)}---\n${body}`;
        },
    });

    const routine = registry.get('append-frontmatter-array');
    assert(routine !== undefined, 'routine should exist');

    // S1: single string value appends one tag.
    files['notes/gamma.md'] = '---\ntags:\n  - existing\n---\nBody.';
    const single = await routine!(fakeApplyContext({ tags: 'ai' }));
    assert(single.applied === true, `S1 should apply single tag, got ${single.message}`);
    assert(files['notes/gamma.md'].includes('- ai'), 'S1 output should include new tag');
    console.log('[F20] PASS: S1 single string value appends one tag');

    // S2: array of strings appends multiple tags.
    files['notes/gamma.md'] = '---\ntags:\n  - existing\n---\nBody.';
    const multi = await routine!(fakeApplyContext({ tags: ['ai', 'ml'] }));
    assert(multi.applied === true, `S2 should apply multiple tags, got ${multi.message}`);
    assert(files['notes/gamma.md'].includes('- ai'), 'S2 output should include ai tag');
    assert(files['notes/gamma.md'].includes('- ml'), 'S2 output should include ml tag');
    console.log('[F20] PASS: S2 array value appends multiple tags');

    console.log('[F20] VERDICT: GREEN');
}

function frontmatterToYaml(frontmatter: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(frontmatter)) {
        if (Array.isArray(value)) {
            lines.push(`${key}:`);
            for (const item of value) lines.push(`  - ${String(item)}`);
        } else if (value !== undefined) {
            lines.push(`${key}: ${String(value)}`);
        }
    }
    return `${lines.join('\n')}\n`;
}

void main();
