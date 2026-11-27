// =============================================================================
// Huginn — F09: Target path .md normalization
// src/fixtures/f09.ts
//
// Verifies that the recipe chooser normalizes vault note paths by appending
// .md when the extension is missing.
//
// Conform 2026-11-27 (validator leg, Restart Ledger §11 SALVAGE row H-f09:
// "validator seam: path rooting"): the normalization mechanism re-anchors at
// the validator's per-call resolution point — the verdict's resolved args
// carry the normalized path-class values. The helper legs below stay (the
// pure helper is its own seam); the new legs fail per-leg at the prior HEAD
// (committed validator.ts exports no validateToolCall — measured), so the
// red is earned against committed code at the intended seam, not by a link
// throw.
//
// Run: npx tsx src/fixtures/f09.ts
// =============================================================================

import { normalizeNotePath } from '../ui/path-utils.ts';
import * as validator from '../harness/validator.ts';

// Validator-seam resolution cases: [verb, well-formed args, expected resolved path]
// (create/rename carry extra REQUIRED slots — the calls must be well-formed to
// reach the resolution point; rename's both-slot leg is separate below).
const RESOLVE_CASES: [string, Record<string, unknown>, string][] = [
    ['vault__readNote', { path: 'notes/gamma' }, 'notes/gamma.md'],
    ['vault__create', { path: 'notes/new', content: 'c' }, 'notes/new.md'],
    ['vault__readNote', { path: 'notes/gamma#heading' }, 'notes/gamma#heading'],
];

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
    // Validator-seam resolution legs (conform 2026-11-27, H-f09 SALVAGE row):
    // the per-call verdict's resolved args carry the normalized path-class value.
    const call = validator.validateToolCall;
    if (typeof call !== 'function') {
        for (const [verb, args] of RESOLVE_CASES) {
            failures++;
            console.log(`[F09] RED: ${verb}(${JSON.stringify(args)}) — no validateToolCall in committed validator.ts`);
        }
    } else {
        for (const [verb, args, expected] of RESOLVE_CASES) {
            const verdict = call(verb, args);
            const got = verdict.ok ? verdict.resolved?.path : undefined;
            if (got !== expected) {
                failures++;
                console.log(`[F09] RED: ${verb}(${JSON.stringify(args)}) resolved = ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
            } else {
                console.log(`[F09] PASS: ${verb}(${JSON.stringify(args)}) -> ${JSON.stringify(got)}`);
            }
        }
        // rename's newPath slot resolves too (path-class both slots)
        const rn = call('vault__rename', { path: 'notes/gamma', newPath: 'notes/delta' });
        if (rn.ok && rn.resolved?.path === 'notes/gamma.md' && rn.resolved?.newPath === 'notes/delta.md') {
            console.log('[F09] PASS: vault__rename both path slots resolved');
        } else {
            failures++;
            console.log('[F09] RED: vault__rename path slots not both resolved');
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
