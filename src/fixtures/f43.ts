// =============================================================================
// Huginn — F43: The validator choke point (per-call tool validation)
// src/fixtures/f43.ts
//
// POLICED: src/harness/validator.ts (SALVAGE row, Restart Ledger §11: "the
// per-call choke point: known-command, types, vault-rooting red re-earned
// here"). Design Report §2 VALIDATE: every tool call is parsed and validated
// BEFORE execution; unknown tool, unknown-shaped args, path escape (vault
// rooting), malformed payload -> machine-readable error returned as the
// role:"tool" content (is_error: true — the Lumo envelope,
// external-command-surfaces.md §2 L31; our prototype round-trips it,
// prototype-findings.md §4/§5). Known-command source = the curated manifest
// (H-f42's seam); the registry is dead (H-f17 DEMOLISH).
//
// Re-anchoring of retired/kept record, per the ratified rows:
//   H-f03 SALVAGE — known-command, typed params, vault-rooting red re-earned (V1-V4).
//   H-f09 SALVAGE — path rooting/.md normalization at the resolution point (V5).
//   H-f30 SALVAGE — payload discipline, non-path param guard (V7: path handling
//       never reaches a non-path param slot; the old gather fallback is dead).
//
// CONTRACT TEXT (the per-call choke point, before any execution):
//   V1  Every manifest verb accepts a well-formed call: ok, and the verdict
//       carries mutation exactly as the manifest classifies (gate routing
//       reads this anatomy at the gate leg; H-f42's set is law).
//   V2  Unknown tools are rejected: ok false, and the tool-error content
//       names the offender AND lists every known verb name (self-correction
//       is law, Design Report §2 "the validator gates every execution").
//   V3  Shape discipline: missing required param, wrong primitive type,
//       non-integer for an integer param, and an UNDECLARED param key each
//       reject with ok false (args the manifest never declared never slip
//       through — H-f30's face at the new anatomy).
//   V4  Vault-rooting red earned here (committed validator.ts has NO path
//       handling at all — measured 2026-11-27): a path-class param that is
//       absolute (leading /), escapes via a '..' segment, or is blank/
//       whitespace, rejects.
//   V5  Resolution point normalizes path-class params through
//       ui/path-utils.normalizeNotePath (H-f09 contract, validator-seam home):
//       missing .md appended; anchors/queries/[[links]] untouched; trim first.
//       The verdict's resolved args carry the normalized values.
//   V6  Rejections return the Lumo tool-error anatomy {role:'tool', name,
//       content, is_error:true} — no exception thrown; ok calls carry no
//       toolError; tool_call_id is the client leg's to assign (the validator
//       never sees one).
//   V7  Path discipline is path-class only: the class is exactly the params
//       named 'path'/'newPath' (choice, disclosed); command__execute's id,
//       create/write/append's content resolve UNCHANGED — no .md smuggled
//       into non-path slots (H-f30's face: path handling must not borrow
//       non-path params, and vice versa).
//
// CHOICES (disclosed, executor's unless Dan's act fixes them):
//   - Number f43 continues the record chain (f42 was the manifest seam).
//   - import * as validator + typeof guards: the committed module EXISTS but
//     exports none of this (measured: one export, validateJson) — so each
//     leg below fails PER LEG at HEAD instead of one link throw; the red is
//     earned per invariant (stronger than the f42 seam-absence throw, where
//     the module itself was new).
//   - Verdict shape {ok, resolved, mutation, toolError} and content wording:
//     machine-readable convention (Lumo §2 design consequence); the exact
//     sentence wording is executor's, the ANATOMY and the known-list are law.
//   - toolError name = the offending name (even unknown), so a model mid-plan
//     can map the error back to its call.
//
// RUNNER: npx tsx src/fixtures/f43.ts
// =============================================================================

import * as validator from '../harness/validator.ts';
import { MANIFEST } from '../manifest/manifest.ts';

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
    if (cond) {
        console.log(`  PASS  ${name}`);
    } else {
        failures++;
        console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

function wellFormedArgs(verb: ManifestVerbShim): Record<string, unknown> {
    const args: Record<string, unknown> = {};
    const sample: Record<string, unknown> = {
        path: 'notes/gamma',
        newPath: 'notes/delta',
        content: 'body text',
        query: 'gamma',
        text: 'notes like this',
        id: 'daily-notes:show-today',
    };
    for (const key of verb.parameters.required ?? []) args[key] = sample[key];
    return args;
}

interface ManifestVerbShim {
    name: string;
    mutation: boolean;
    parameters: { required?: string[] };
}

function main(): void {
    console.log('[F43] Huginn — validator choke point (per-call tool validation)');
    const call = validator.validateToolCall; // absent at HEAD -> every leg below FAILs per-leg

    // V1 — known commands: every manifest verb accepts a well-formed call
    if (typeof call !== 'function') {
        check('V1 well-formed accepts', false, 'no validateToolCall in committed validator.ts');
        check('V1 mutation anatomy', false, 'no validateToolCall in committed validator.ts');
    } else {
        const accepts = MANIFEST.filter((v) => {
            const verdict = call(v.name, wellFormedArgs(v));
            return verdict.ok && verdict.mutation === v.mutation;
        });
        check('V1 well-formed accepts', accepts.length === MANIFEST.length,
            MANIFEST.filter((v) => !accepts.includes(v)).map((v) => v.name).join(','));
        check('V1 mutation anatomy', MANIFEST.every((v) => {
            const verdict = call(v.name, wellFormedArgs(v));
            return verdict.mutation === v.mutation;
        }));
    }

    // V2 — unknown tools rejected, offender named, every known verb listed
    {
        const unknown = ['vault__deleteNote', 'muninn__search', 'readNote', 'vault.readNote'];
        if (typeof call !== 'function') {
            check('V2 unknowns rejected', false, 'no validateToolCall in committed validator.ts');
            check('V2 error lists known verbs', false, 'no validateToolCall');
        } else {
            const rejected = unknown.every((name) => {
                const verdict = call(name, { path: 'notes/x.md' });
                return !verdict.ok && verdict.toolError !== undefined && verdict.toolError.is_error === true;
            });
            check('V2 unknowns rejected', rejected);
            const knownNames = MANIFEST.map((v) => v.name);
            check('V2 error lists known verbs', unknown.every((name) => {
                const err = call(name, { path: 'notes/x.md' }).toolError;
                return err !== undefined &&
                    knownNames.every((k) => err.content.includes(k)) &&
                    err.content.includes(name);
            }));
        }
    }

    // V3 — shape discipline: required/type/integer/undeclared-key
    {
        const badCalls: [string, Record<string, unknown>][] = [
            ['vault__readNote', {}], // missing required path
            ['vault__readNote', { path: 42 }], // wrong primitive
            ['muninn__notesLike', { text: 'x', limit: 'five' }], // non-integer integer param
            ['vault__readNote', { path: 'notes/x.md', bogus: true }], // undeclared key
        ];
        if (typeof call !== 'function') {
            check('V3 malformed rejected', false, 'no validateToolCall in committed validator.ts');
        } else {
            check('V3 malformed rejected', badCalls.every(([name, args]) => {
                const verdict = call(name, args);
                return !verdict.ok && verdict.toolError !== undefined && verdict.toolError.is_error === true;
            }));
        }
    }

    // V4 — vault-rooting red earned here: absolute / escape / blank paths
    {
        const escapes: [string, Record<string, unknown>][] = [
            ['vault__readNote', { path: '/etc/passwd' }],
            ['vault__readNote', { path: '../outside.md' }],
            ['vault__readNote', { path: 'notes/../Secret/diary.md' }],
            ['vault__readNote', { path: '   ' }],
            ['vault__rename', { path: 'notes/gamma.md', newPath: '../elsewhere.md' }],
        ];
        if (typeof call !== 'function') {
            check('V4 escapes rejected', false, 'no validateToolCall in committed validator.ts');
        } else {
            check('V4 escapes rejected', escapes.every(([name, args]) => {
                const verdict = call(name, args);
                return !verdict.ok && verdict.toolError !== undefined && verdict.toolError.is_error === true;
            }));
        }
    }

    // V5 — resolution-point normalization (H-f09 contract at the validator seam)
    {
        if (typeof call !== 'function') {
            check('V5 resolved paths normalized', false, 'no validateToolCall in committed validator.ts');
        } else {
            const norm: [string, Record<string, string>, string][] = [
                ['vault__readNote', { path: 'notes/gamma' }, 'notes/gamma.md'],
                ['vault__readNote', { path: '  notes/gamma  ' }, 'notes/gamma.md'],
                ['vault__readNote', { path: 'notes/gamma#heading' }, 'notes/gamma#heading'],
                ['vault__create', { path: 'notes/new', content: 'c' }, 'notes/new.md'],
            ];
            check('V5 resolved paths normalized', norm.every(([name, args, expectPath]) => {
                const verdict = call(name, args);
                return verdict.ok && typeof verdict.resolved?.path === 'string' && verdict.resolved.path === expectPath;
            }));
        }
    }

    // V6 — Lumo tool-error anatomy, no exceptions (fixture would crash if it threw)
    {
        if (typeof call !== 'function') {
            check('V6 envelope anatomy', false, 'no validateToolCall in committed validator.ts');
            check('V6 ok calls carry no toolError', false, 'no validateToolCall');
        } else {
            const rejected = call('vault__nope', {});
            check('V6 envelope anatomy', !rejected.ok && rejected.toolError !== undefined &&
                rejected.toolError.role === 'tool' &&
                typeof rejected.toolError.content === 'string' &&
                rejected.toolError.is_error === true &&
                rejected.toolError.name === 'vault__nope');
            check('V6 ok calls carry no toolError',
                MANIFEST.every((v) => call(v.name, wellFormedArgs(v)).toolError === undefined));
        }
    }

    // V7 — path-class only: non-path slots resolve untouched (H-f30's face)
    {
        if (typeof call !== 'function') {
            check('V7 non-path slots untouched', false, 'no validateToolCall in committed validator.ts');
        } else {
            const idVerdict = call('command__execute', { id: 'daily-notes:show-today' });
            const createVerdict = call('vault__create', { path: 'notes/gamma', content: 'notes/beta' });
            check('V7 non-path slots untouched',
                idVerdict.ok && idVerdict.resolved?.id === 'daily-notes:show-today' &&
                createVerdict.ok && createVerdict.resolved?.content === 'notes/beta' &&
                createVerdict.resolved?.path === 'notes/gamma.md');
        }
    }

    console.log(
        failures === 0
            ? '[F43] VERDICT: GREEN'
            : `[F43] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

main();
