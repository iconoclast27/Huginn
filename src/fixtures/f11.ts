// =============================================================================
// Huginn Fixture F11 — Chat skill dispatch intent parsing
// =============================================================================
// Polices the small LLM-backed dispatcher that maps a user request to a recipe
// name and target path. Uses a fake ChatLlmClient so the test is deterministic.
// =============================================================================

import { ChatSkillDispatcher } from '../chat/dispatch.ts';
import type { LoadedRecipe } from '../recipes/types.ts';
import type { ChatLlmClient, ChatMessage } from '../llm/client.ts';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F11 FAIL: ${msg}`);
}

function makeFakeClient(response: string | null): ChatLlmClient {
    return {
        async complete(_prompt: string): Promise<string | null> {
            return response;
        },
        async chat(_messages: ChatMessage[]): Promise<string | null> {
            return response;
        },
    };
}

const recipes: LoadedRecipe[] = [
    {
        metadata: { name: 'tag-assignment', version: '0.1.0', modelTier: 'fast', riskClass: 'suggest' },
        trigger: { description: 'Suggest a tag for a note.' },
        inputs: [],
        instructions: '',
        outputSchema: { type: 'object', properties: {}, required: [] },
        applyMethod: 'suggest-tags',
        validation: [],
        sourcePath: 'tag-assignment.md',
    },
    {
        metadata: { name: 'task-extraction', version: '0.1.0', modelTier: 'capable', riskClass: 'read-only' },
        trigger: { description: 'Extract actionable tasks from a note.' },
        inputs: [],
        instructions: '',
        outputSchema: { type: 'object', properties: {}, required: [] },
        applyMethod: 'noop',
        validation: [],
        sourcePath: 'task-extraction.md',
    },
];

const getRecipes = () => recipes;

// S1: valid dispatch JSON returns the right recipe and path.
const s1Client = makeFakeClient('{"recipeName":"tag-assignment","targetPath":"notes/gamma.md","reason":"User asked for a tag."}');
const s1 = new ChatSkillDispatcher({ llmClient: s1Client, getRecipes });
const r1 = await s1.dispatch('tag this note', 'notes/gamma.md');
assert(r1.intent !== null, 'S1 should parse intent');
assert(r1.intent!.recipeName === 'tag-assignment', 'S1 recipeName');
assert(r1.intent!.targetPath === 'notes/gamma.md', 'S1 targetPath');
assert(r1.intent!.reason === 'User asked for a tag.', 'S1 reason');
console.log('[F11] PASS: S1 valid dispatch JSON');

// S2: unknown recipeName returns null intent.
const s2Client = makeFakeClient('{"recipeName":"nonexistent","targetPath":"notes/gamma.md","reason":"Unknown."}');
const s2 = new ChatSkillDispatcher({ llmClient: s2Client, getRecipes });
const r2 = await s2.dispatch('do something weird', 'notes/gamma.md');
assert(r2.intent === null, 'S2 should reject unknown recipe');
console.log('[F11] PASS: S2 unknown recipe rejected');

// S3: fallback active note path is included in prompt and can be returned.
const s3Client = makeFakeClient('{"recipeName":"task-extraction","targetPath":"notes/alpha.md","reason":"User asked for tasks."}');
const s3 = new ChatSkillDispatcher({ llmClient: s3Client, getRecipes });
const r3 = await s3.dispatch('extract tasks from notes/alpha.md', null);
assert(r3.intent !== null, 'S3 should parse intent');
assert(r3.intent!.recipeName === 'task-extraction', 'S3 recipeName');
assert(r3.intent!.targetPath === 'notes/alpha.md', 'S3 targetPath');
console.log('[F11] PASS: S3 explicit path overrides null active note');

// S4: JSON wrapped in markdown fences is stripped.
const s4Client = makeFakeClient('```json\n{"recipeName":"tag-assignment","targetPath":"notes/beta.md","reason":"Fenced."}\n```');
const s4 = new ChatSkillDispatcher({ llmClient: s4Client, getRecipes });
const r4 = await s4.dispatch('tag notes/beta.md', 'notes/gamma.md');
assert(r4.intent !== null, 'S4 should parse fenced intent');
assert(r4.intent!.recipeName === 'tag-assignment', 'S4 recipeName');
assert(r4.intent!.targetPath === 'notes/beta.md', 'S4 targetPath');
console.log('[F11] PASS: S4 fenced JSON stripped');

// S5: non-JSON response returns null intent.
const s5Client = makeFakeClient('I am not JSON');
const s5 = new ChatSkillDispatcher({ llmClient: s5Client, getRecipes });
const r5 = await s5.dispatch('hello', null);
assert(r5.intent === null, 'S5 should reject non-JSON');
assert(r5.raw === 'I am not JSON', 'S5 preserves raw');
console.log('[F11] PASS: S5 non-JSON rejected');

// S7: dispatch prompt includes the recipe list for the model to choose from.
const s7Client: ChatLlmClient = {
    async complete(_prompt: string): Promise<string | null> { return null; },
    async chat(messages: ChatMessage[]): Promise<string | null> {
        const system = messages.find((m) => m.role === 'system')?.content ?? '';
        assert(system.includes('tag-assignment'), 'S7 prompt lists tag-assignment');
        assert(system.includes('Suggest a tag for a note.'), 'S7 prompt lists tag trigger');
        assert(system.includes('task-extraction'), 'S7 prompt lists task-extraction');
        assert(system.includes('Extract actionable tasks from a note.'), 'S7 prompt lists task trigger');
        return '{"recipeName":"task-extraction","targetPath":"notes/alpha.md","reason":"Listed."}';
    },
};
const s7 = new ChatSkillDispatcher({ llmClient: s7Client, getRecipes });
const r7 = await s7.dispatch('extract tasks', null);
assert(r7.intent !== null, 'S7 should parse intent');
console.log('[F11] PASS: S7 dispatch prompt lists available skills');

// S8: recipes added after the dispatcher is constructed are visible at dispatch time.
const dynamicRecipes: LoadedRecipe[] = [...recipes];
const s8Client: ChatLlmClient = {
    async complete(_prompt: string): Promise<string | null> { return null; },
    async chat(messages: ChatMessage[]): Promise<string | null> {
        const system = messages.find((m) => m.role === 'system')?.content ?? '';
        assert(system.includes('dynamic-skill'), 'S8 prompt includes skill added after construction');
        return '{"recipeName":"dynamic-skill","targetPath":"notes/dynamic.md","reason":"Dynamic."}';
    },
};
const s8 = new ChatSkillDispatcher({ llmClient: s8Client, getRecipes: () => dynamicRecipes });
dynamicRecipes.push({
    metadata: { name: 'dynamic-skill', version: '0.1.0', modelTier: 'fast', riskClass: 'read-only' },
    trigger: { description: 'A skill added after construction.' },
    inputs: [],
    instructions: '',
    outputSchema: { type: 'object', properties: {}, required: [] },
    applyMethod: 'noop',
    validation: [],
    sourcePath: 'dynamic-skill.md',
});
const r8 = await s8.dispatch('run dynamic skill', null);
assert(r8.intent !== null, 'S8 should parse dynamic intent');
assert(r8.intent!.recipeName === 'dynamic-skill', 'S8 recipeName');
console.log('[F11] PASS: S8 dynamic recipe catalog is read at dispatch time');

// S6: empty recipeName returns null intent (no-match signal).
const s6Client = makeFakeClient('{"recipeName":"","targetPath":"","reason":"No matching skill."}');
const s6 = new ChatSkillDispatcher({ llmClient: s6Client, getRecipes });
const r6 = await s6.dispatch('what is the weather', null);
assert(r6.intent === null, 'S6 empty recipeName should be no-match');
console.log('[F11] PASS: S6 empty recipeName is no-match');

console.log('[F11] VERDICT: GREEN');
