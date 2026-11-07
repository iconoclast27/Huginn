// =============================================================================
// Huginn — F16: Default recipe installer
// src/fixtures/f16.ts
//
// Verifies that installDefaultRecipes creates missing recipe files and skips
// existing ones unless forced.
//
// Run: npx tsx src/fixtures/f16.ts
// =============================================================================

import { installDefaultRecipes, getBundledRecipeNames } from '../recipes/installer.ts';

interface FakeFile {
    path: string;
    content: string;
}

class FakeVault {
    files = new Map<string, FakeFile>();
    folders = new Set<string>();

    getAbstractFileByPath(path: string): FakeFile | null {
        return this.files.get(path) ?? null;
    }

    async createFolder(path: string): Promise<void> {
        this.folders.add(path);
    }

    async create(path: string, content: string): Promise<void> {
        if (this.files.has(path)) throw new Error('File already exists');
        this.files.set(path, { path, content });
    }

    async modify(file: FakeFile, content: string): Promise<void> {
        file.content = content;
    }
}

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F16 FAIL: ${msg}`);
}

async function main(): Promise<void> {
    console.log('[F16] default recipe installer');

    const vault = new FakeVault();
    const names = getBundledRecipeNames();
    assert(names.length === 6, 'S1 should expose six bundled recipes');
    console.log('[F16] PASS: S1 bundled recipe names');

    // S2: fresh vault installs all six recipes.
    const result1 = await installDefaultRecipes(vault as never);
    assert(result1.installed === 6, 'S2 should install all recipes on first run');
    assert(result1.skipped === 0, 'S2 should not skip on first run');
    assert(result1.overwritten === 0, 'S2 should not overwrite on first run');
    assert(result1.errors.length === 0, 'S2 should have no errors');
    for (const name of names) {
        assert(vault.files.has(`Agents/Huginn/SKILLS/${name}`), `S2 should create ${name}`);
    }
    console.log('[F16] PASS: S2 first-run install');

    // S3: second run skips all existing recipes.
    const result2 = await installDefaultRecipes(vault as never);
    assert(result2.installed === 0, 'S3 should not install existing recipes');
    assert(result2.skipped === 6, 'S3 should skip existing recipes');
    assert(result2.overwritten === 0, 'S3 should not overwrite without force');
    console.log('[F16] PASS: S3 skip existing');

    // S4: force install overwrites existing recipes.
    vault.files.get('Agents/Huginn/SKILLS/tag-assignment.md')!.content = 'stale';
    const result3 = await installDefaultRecipes(vault as never, { force: true });
    assert(result3.overwritten === 6, 'S4 should overwrite all recipes with force');
    assert(vault.files.get('Agents/Huginn/SKILLS/tag-assignment.md')!.content !== 'stale', 'S4 should replace stale content');
    console.log('[F16] PASS: S4 force overwrite');

    console.log('[F16] VERDICT: GREEN');
}

void main();
