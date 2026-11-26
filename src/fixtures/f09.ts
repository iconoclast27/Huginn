// =============================================================================
// Huginn — F09: Target path .md normalization
// src/fixtures/f09.ts
//
// Verifies that the recipe chooser normalizes vault note paths by appending
// .md when the extension is missing.
//
// Run: npx tsx src/fixtures/f09.ts
// =============================================================================

import { normalizeNotePath } from '../ui/path-utils.ts';

const CASES: [string, string][] = [
    ['notes/gamma', 'notes/gamma.md'],
    ['notes/gamma.md', 'notes/gamma.md'],
    ['', ''],
    ['  notes/gamma  ', 'notes/gamma.md'],
    ['notes/gamma#heading', 'notes/gamma#heading'],
    ['notes/gamma?query=1', 'notes/gamma?query=1'],
    ['notes/gamma[[link]]', 'notes/gamma[[link]]'],
];

function main(): void {
    let failures = 0;
    console.log('[F09] target path .md normalization');
    for (const [input, expected] of CASES) {
        const got = normalizeNotePath(input);
        if (got !== expected) {
            failures++;
            console.log(`[F09] RED: normalizeNotePath(${JSON.stringify(input)}) = ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
        } else {
            console.log(`[F09] PASS: ${JSON.stringify(input)} -> ${JSON.stringify(got)}`);
        }
    }
    console.log(
        failures === 0
            ? '[F09] VERDICT: GREEN'
            : `[F09] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

main();
