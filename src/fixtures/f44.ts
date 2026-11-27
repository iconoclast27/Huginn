// =============================================================================
// Huginn — F44: The per-call gate leg (routing + request dressing + diff legs)
// src/fixtures/f44.ts
//
// POLICED: src/harness/gate.ts (NEW home for the per-call gate routing) and
// src/harness/diff.ts (diff leg: rename diff per D-14). Design Report §2 GATE:
// "All vault mutations gated (D-4); the diff shown before apply; … Read
// families are never gated; mutation families always route through the gate.
// A gate rejection is not an exception — it is a validator-class `is_error`
// tool result, so a model mid-plan can apologize, change plan, or stop"
// (Restart Ledger.md §2.2:60 carries D-14: "the modal shows `old path → new
// path`; body unchanged stated. … a rename's diff is its path change").
//
// Re-anchoring of the ratified gate-seam rows (Restart Ledger §11):
//   H-f04 KEEP     — request shape re-anchored at the per-call anatomy (V1).
//   H-f25 SALVAGE  — the modal shows what it will change: the request's diffText
//                    must parse as the DiffResult the committed modal renders
//                    (approval-gate.ts:45-50 JSON.parse; approval-modal.ts:69
//                    renderDiff) — the machine half policed here (V1); the
//                    DOM-facing observables ride the H3 smoke block.
//   H-f33 SALVAGE  — one gate per write; all-mutations-gated is law (V2, V6).
//   H-f35 SALVAGE  — stop parity + inert declined results (§3 salvage note:
//                    "no-retry-on-decline + inert declined results survive")
//                    (V3, V4).
//
// CONTRACT (the choke point between VALIDATE and execute, before the client
// loop exists at the client-wiring leg):
//   V1  A validated mutation verdict is dressed as the COMMITTED ApprovalRequest
//       (approval-gate.ts:20-27): diffText is the JSON of a DiffResult (the
//       committed gate parses it back — measured round-trip here), targetPath
//       carries the resolved .md-normalized path, and the dressed request
//       renders non-empty through renderDiff (what the modal will show).
//   V2  Sequential writes each get their OWN gate consult (H-f33 re-anchor):
//       two writes in one sequence → two consults, one note per consult, in
//       order; approved calls execute.
//   V3  A decline is inert and machine-readable: decision 'declined', NO
//       execution (vault bytes unchanged), and the outcome carries the
//       validator-class tool error {role:'tool', name, content, is_error:true}
//       (§2 — a gate rejection is not an exception; it is the same channel the
//       validator uses, ToolErrorEnvelope anatomy from validator.ts:109-115).
//   V4  Stop parity (H-f35 re-anchor): gate answering null (committed
//       approval-gate.ts:64-70 semantics — an interrupt is not a decision)
//       → decision 'stopped', never 'declined', no toolError, nothing
//       applied, vault untouched (§6: never a declined outcome).
//   V5  Rename diff per D-14 (Ledger §2.2:60 verbatim): a rename's whole diff
//       is its path change — one entry, rendered `notes/a.md → notes/b.md`
//       with body-unchanged stated; body entries never ride a rename.
//   V6  Read families are never gated (Design Report §2, D-1/D-4): a verdict
//       with mutation false never reaches the gate; the gate consult count
//       stays what the mutation count was.
//   V7  NEVER mode (ADR 01, Huginn docs/decisions/adr-01.md — Dan's ruling
//       2026-11-27: "Never is an auto-refuse, and any feedback to the model
//       should say so"): a mutation verdict in NEVER mode is refused WITHOUT
//       pausing — no modal consult — decision 'declined', nothing applied, and
//       the toolError content NAMES the auto-refuse and the mode (model-side
//       complaint is the model's problem, not apparatus law — nothing here
//       asserts it).
//   V8  YOLO mode (ADR 01: "YOLO is an auto-approve, and any tool user notice
//       to the user should say so if reasonable practicable"): mutation applied
//       without pausing — no modal consult — decision 'approved' + GateOutcome
//       NOTICE saying it was auto-approved (the surfacing half rides the
//       client-wiring leg; smoke observable H3.8).
//   V9  AUTOAPPROVE rides prior law D-13 (Ledger §2.2: detector = web-tool-class
//       call in the current turn history): no external reading this turn →
//       auto-approve + notice, no consult; external reading present → that turn's
//       mutations DOWNGRADE to ASK parity (the modal consults again).
//
// CHOICES (disclosed, executor's unless canon fixes them):
//   - Number f44 continues the record chain (f42 manifest, f43 validator).
//   - gate.ts is a NEW module: its value import link-throws at HEAD — the red
//     is earned at the seam-absence, the f42 precedent (the committed approval-
//     gate.ts exists but is obsidian-tainted — measured: tsx fails to load its
//     '../ui/approval-modal.ts' → bare 'obsidian' chain, type-only-import
//     precedent chat.ts:10 is the discipline this home keeps).
//   - diff.ts legs per-leg: `import * as` + typeof guards (committed module
//     EXISTS but exports no renameDiff — f43/f09 conform mechanism).
//   - recipeName slot (committed ApprovalRequest:23) is filled with the
//       model-facing verb NAME at the per-call anatomy (executor choice; the
//       old recipe notion is dead at this anatomy — D-8).
//   - ApprovalRequest.output slot = the resolved args (the payload the modal
//       describes); groundTruthChecks stays unset (ground truth was excised at
//       the baseline, Ledger §11; the D-5 per-result face is docket R2's).
//   - decline toolError content wording is executor's; the ANATOMY (ToolError-
//     Envelope) and the channel (§2) are law.
//   - Mode policy: routeThroughGate takes a policy object ({mode: ApprovalMode;
//     externalReadingThisTurn?: boolean}, default ASK) — executor's shape; the
//     SEMANTICS are ruled by ADR 01 (Huginn docs/decisions/adr-01.md, Dan's act
//     2026-11-27) and the detector meaning by D-13 (Ledger §2.2) — the boolean is
//     the loop's to compute per D-13 ("no NLP, no content tracking").
//   - GateOutcome.notice carries the auto-decision wording (executor anatomy for
//     the ruling's "notice should say so if reasonable practicable").
//   - The fake gate below implements the committed ApprovalGate interface
//     (approval-gate.ts:36-39) structurally; the null answer mirrors the
//     committed pre-abort path (approval-gate.ts:75-78) — the fixture tests
//     ROUTING parity, not the obsidian modal (untestable in tsx, measured).
//   - Executor stand-in: `apply` records what the client loop would execute;
//     inertness assertions pin that nothing is recorded on decline/stop.
// =============================================================================

import { validateToolCall } from '../harness/validator.ts';
import { buildApprovalRequest, routeThroughGate } from '../harness/gate.ts';
import * as diffMod from '../harness/diff.ts';
import type { ApprovalGate, ApprovalRequest, ApprovalResult } from '../harness/approval-gate.ts';
import type { ApprovalMode } from '../settings.ts';
import type { DiffResult, DiffEntry } from '../recipes/types.ts';
import type { AbortSignalLike } from '../llm/client.ts';
import { MANIFEST } from '../manifest/manifest.ts';

const failures: string[] = [];
function check(cond: boolean | { cond: boolean; why: string }[], msg: string): void {
    if (!cond) failures.push(msg);
}

async function main(): Promise<void> {
    // ---------- V1 — H-f04 request shape at the per-call anatomy ----------
    {
        const verdict = validateToolCall('vault__write', { path: 'notes/gamma', content: 'New body.' });
        check(verdict.ok && verdict.mutation === true, 'V1: validated mutation verdict must be ok with mutation true');
        const request = buildApprovalRequest('vault__write', verdict.resolved, 'Old body.', 'New body.');
        // The committed gate parses diffText back as DiffResult (approval-gate.ts:47).
        const parsed = JSON.parse(request.diffText) as DiffResult;
        check(Array.isArray(parsed.changes) && parsed.changes.length >= 1,
            'V1: diffText must parse as DiffResult with at least one change (H-f04 shape law)');
        // H-f25 machine half: what the modal will render must not be empty.
        check(diffMod.renderDiff(parsed) !== 'No changes.',
            'V1: renderDiff of the request diff must show the change (H-f25 half; modal leg rides H3 smoke)');
        check(request.targetPath === 'notes/gamma.md',
            `V1: targetPath must carry the resolved .md-normalized path — got ${JSON.stringify(request.targetPath)}`);
        check(request.recipeName === 'vault__write',
            `V1 (choice): recipeName slot carries the verb name — got ${JSON.stringify(request.recipeName)}`);
        check(request.output !== undefined
            && (request.output as Record<string, unknown>)['path'] === 'notes/gamma.md',
            'V1: output slot must round-trip the resolved payload');
        check(request.groundTruthChecks === undefined,
            'V1: groundTruthChecks unset at this anatomy (ground truth excised, Ledger §11)');
    }

    // ---------- V2 — H-f33 one gate per write, in order, reads apart ----------
    {
        const files = new Map<string, string>([['notes/a.md', 'A old.'], ['notes/b.md', 'B old.']]);
        const consulted: string[] = [];
        const applied: string[] = [];
        const gate: ApprovalGate = {
            approve: async (request: ApprovalRequest, _signal?: AbortSignalLike): Promise<ApprovalResult | null> => {
                consulted.push(String(request.targetPath));
                return { approved: true };
            },
        };
        const sequence: Array<{ name: string; args: Record<string, unknown>; old: string; next: string }> = [
            { name: 'vault__readNote', args: { path: 'notes/a' }, old: 'A old.', next: 'A old.' },
            { name: 'vault__write', args: { path: 'notes/a.md', content: 'A new.' }, old: 'A old.', next: 'A new.' },
            { name: 'vault__write', args: { path: 'notes/b.md', content: 'B new.' }, old: 'B old.', next: 'B new.' },
        ];
        for (const step of sequence) {
            const verdict = validateToolCall(step.name, step.args);
            if (!verdict.ok || !verdict.mutation) continue; // reads never route (V6 asserts the count)
            const request = buildApprovalRequest(step.name, verdict.resolved, step.old, step.next);
            const outcome = await routeThroughGate(gate, step.name, request);
            if (outcome.decision === 'approved') applied.push(String(request.targetPath));
        }
        check(consulted.join(',') === 'notes/a.md,notes/b.md',
            `V2: two writes, one gate consult each, in order — consulted ${JSON.stringify(consulted)}`);
        check(applied.join(',') === 'notes/a.md,notes/b.md',
            `V2: approved writes execute — applied ${JSON.stringify(applied)}`);
        const mutationCount = sequence.filter((s) => MANIFEST.some((v) => v.name === s.name && v.mutation)).length;
        check(consulted.length === mutationCount,
            `V2/V6: gate consults must equal mutation calls (${mutationCount}) — got ${consulted.length}`);
    }

    // ---------- V3 — H-f35 decline: inert, machine-readable (no exception) ----------
    {
        const files = new Map<string, string>([['notes/a.md', 'A body.']]);
        const applied: string[] = [];
        const gate: ApprovalGate = {
            approve: async (_request: ApprovalRequest, _signal?: AbortSignalLike): Promise<ApprovalResult | null> =>
                ({ approved: false, reason: 'wrong note' }),
        };
        const verdict = validateToolCall('vault__write', { path: 'notes/a.md', content: 'A new.' });
        const request = buildApprovalRequest('vault__write', verdict.resolved, 'A body.', 'A new.');
        const outcome = await routeThroughGate(gate, 'vault__write', request);
        check(outcome.decision === 'declined',
            `V3: decline must dress decision 'declined' — got ${JSON.stringify(outcome.decision)}`);
        const err = outcome.toolError;
        check(err !== undefined && err.role === 'tool' && err.is_error === true
            && err.name === 'vault__write' && err.content.includes('declined')
            && err.content.includes('vault__write') && err.content.includes('wrong note'),
            `V3: declined call must carry the validator-class toolError anatomy (§2) — got ${JSON.stringify(err)}`);
        check(applied.length === 0, `V3: a vetoed write must not apply — got ${JSON.stringify(applied)}`);
        check(files.get('notes/a.md') === 'A body.', 'V3: decline leaves the vault bytes untouched');
    }

    // ---------- V4 — H-f35 stop parity: interrupt is never a decision ----------
    {
        const files = new Map<string, string>([['notes/a.md', 'A body.']]);
        const applied: string[] = [];
        const signal = new AbortControllerCompat();
        signal.abort();
        const gate: ApprovalGate = {
            approve: async (_request: ApprovalRequest, signal?: AbortSignalLike): Promise<ApprovalResult | null> => {
                if (signal?.aborted) return null; // mirrors committed approval-gate.ts:75-78 pre-abort resolve
                return { approved: true };
            },
        };
        const verdict = validateToolCall('vault__write', { path: 'notes/a.md', content: 'A new.' });
        const request = buildApprovalRequest('vault__write', verdict.resolved, 'A body.', 'A new.');
        const outcome = await routeThroughGate(gate, 'vault__write', request, signal.abortSignal);
        check(outcome.decision === 'stopped',
            `V4: a null gate answer must dress 'stopped', never 'declined' (§6 parity) — got ${JSON.stringify(outcome.decision)}`);
        check(outcome.toolError === undefined, 'V4: stop is not a decision — no toolError may ride it');
        check(applied.length === 0 && files.get('notes/a.md') === 'A body.',
            'V4: stop applies nothing and leaves the vault untouched (H-f35 parity)');
    }

    // ---------- V5 — D-14: the rename diff is the path change, whole ----------
    {
        const verdict = validateToolCall('vault__rename', { path: 'notes/a.md', newPath: 'notes/b' });
        check(verdict.ok && verdict.mutation === true
            && verdict.resolved?.path === 'notes/a.md' && verdict.resolved?.newPath === 'notes/b.md',
            'V5: rename verdict must resolve both slots .md-rooted (validator seam feed)');
        const request = buildApprovalRequest('vault__rename', verdict.resolved, null, null);
        const parsed = JSON.parse(request.diffText) as DiffResult;
        check(parsed.changes.length === 1, `V5: rename diff is ONE entry (Ledger :60 "that is the whole diff") — got ${parsed.changes.length}`);
        const rendered = diffMod.renderDiff(parsed);
        const lines = rendered.split('\n');
        check(lines.some((l) => l.includes('notes/a.md') && l.includes('→') && l.includes('notes/b.md')),
            `V5: render must show old path → new path (D-14 verbatim) — got ${JSON.stringify(rendered)}`);
        check(lines.some((l) => l.includes('body unchanged')),
            `V5: body-unchanged must be STATED (D-14 verbatim) — got ${JSON.stringify(rendered)}`);
        check(!rendered.includes('old:') && !rendered.includes('new:'),
            'V5: body-diff entries never ride a rename diff');
        check(request.targetPath === 'notes/b.md',
            `V5: a rename targets its NEW path — got ${JSON.stringify(request.targetPath)}`);
    }

    // ---------- V6 — D-4 law: read families never gated ----------
    {
        const verdict = validateToolCall('vault__readNote', { path: 'notes/a.md' });
        check(verdict.ok && verdict.mutation === false, 'V6: a read verdict is ok and classified read');
        const gateSpy: string[] = [];
        const gate: ApprovalGate = {
            approve: async (request: ApprovalRequest, _signal?: AbortSignalLike): Promise<ApprovalResult | null> => {
                gateSpy.push(String(request.targetPath));
                return { approved: true };
            },
        };
        const request = buildApprovalRequest('vault__readNote', verdict.resolved, null, null);
        let refused = false;
        try {
            const outcome = await routeThroughGate(gate, 'vault__readNote', request);
            refused = outcome.decision === 'not-gated';
        } catch {
            refused = false;
        }
        check(refused && gateSpy.length === 0,
            `V6: the router itself must refuse a non-mutation call (read families are never gated, §2) — spy ${JSON.stringify(gateSpy)}`);
    }

    // ---------- V7 — ADR 01: NEVER is an auto-refuse, feedback says so ----------
    {
        const files = new Map<string, string>([['notes/a.md', 'A body.']]);
        const applied: string[] = [];
        const consulted: string[] = [];
        const gate: ApprovalGate = {
            approve: async (request: ApprovalRequest, _signal?: AbortSignalLike): Promise<ApprovalResult | null> => {
                consulted.push(String(request.targetPath));
                return { approved: true };
            },
        };
        const verdict = validateToolCall('vault__write', { path: 'notes/a.md', content: 'A new.' });
        const request = buildApprovalRequest('vault__write', verdict.resolved, 'A body.', 'A new.');
        const outcome = await routeThroughGate(gate, 'vault__write', request, undefined, { mode: 'NEVER' });
        check(outcome.decision === 'declined',
            `V7: NEVER must dress 'declined' (auto-refuse) — got ${JSON.stringify(outcome.decision)}`);
        check(consulted.length === 0,
            `V7: NEVER pauses nothing — modal consults ${JSON.stringify(consulted)}`);
        const err = outcome.toolError;
        check(err !== undefined && err.role === 'tool' && err.is_error === true
            && err.name === 'vault__write' && err.content.includes('NEVER')
            && err.content.includes('auto-refused'),
            `V7: feedback to the model must NAME the auto-refuse and the mode (ruling verbatim) — got ${JSON.stringify(err)}`);
        check(applied.length === 0 && files.get('notes/a.md') === 'A body.',
            'V7: an auto-refuse applies nothing');
    }

    // ---------- V8 — ADR 01: YOLO is an auto-approve, notice says so ----------
    {
        const files = new Map<string, string>([['notes/a.md', 'A body.']]);
        const consulted: string[] = [];
        const gate: ApprovalGate = {
            approve: async (request: ApprovalRequest, _signal?: AbortSignalLike): Promise<ApprovalResult | null> => {
                consulted.push(String(request.targetPath));
                return { approved: true };
            },
        };
        const verdict = validateToolCall('vault__write', { path: 'notes/a.md', content: 'A new.' });
        const request = buildApprovalRequest('vault__write', verdict.resolved, 'A body.', 'A new.');
        const outcome = await routeThroughGate(gate, 'vault__write', request, undefined, { mode: 'YOLO' });
        check(outcome.decision === 'approved',
            `V8: YOLO auto-approves — got ${JSON.stringify(outcome.decision)}`);
        check(consulted.length === 0,
            `V8: YOLO pauses nothing — modal consults ${JSON.stringify(consulted)}`);
        check(typeof outcome.notice === 'string' && outcome.notice.includes('YOLO')
            && outcome.notice.includes('auto-approved'),
            `V8: the user-notice anatomy must say it was auto-approved (ruling verbatim; surfacing half rides the client leg / H3.8) — got ${JSON.stringify(outcome.notice)}`);
        check(files.get('notes/a.md') === 'A body.',
            'V8 (scope note): applying is the client loop act — this leg pins the decision + notice, not the write');
    }

    // ---------- V9 — D-13 law: AUTOAPPROVE downgrades to ASK on external reading ----------
    {
        const consulted: string[] = [];
        const gate: ApprovalGate = {
            approve: async (request: ApprovalRequest, _signal?: AbortSignalLike): Promise<ApprovalResult | null> => {
                consulted.push(String(request.targetPath));
                return { approved: true };
            },
        };
        const verdict = validateToolCall('vault__append', { path: 'notes/a.md', content: ' more.' });
        const request = buildApprovalRequest('vault__append', verdict.resolved, 'A body.', 'A body. more.');
        const auto = await routeThroughGate(gate, 'vault__append', request, undefined, { mode: 'AUTOAPPROVE' });
        check(auto.decision === 'approved' && typeof auto.notice === 'string'
            && auto.notice.includes('AUTOAPPROVE'),
            `V9: AUTOAPPROVE without external reading this turn auto-approves + notices — got ${JSON.stringify(auto.decision)} / ${JSON.stringify(auto.notice)}`);
        check(consulted.length === 0, `V9: auto-path consults nothing — got ${JSON.stringify(consulted)}`);
        const ask = await routeThroughGate(gate, 'vault__append', request, undefined,
            { mode: 'AUTOAPPROVE', externalReadingThisTurn: true });
        check(ask.decision === 'approved' && consulted.join(',') === 'notes/a.md',
            `V9: external reading this turn DOWNGRADES to ASK parity (D-13 verbatim) — consults ${JSON.stringify(consulted)}`);
    }

    // ApprovalMode import used: the enum is law (D-4); mode routing (NEVER/
    // AUTOAPPROVE/YOLO semantics) is ruled by ADR 01 (Dan's act 2026-11-27) and
    // policed at V7-V9. The type import keeps the reference.
    void ('ASK' as ApprovalMode);

    console.log(failures.length === 0
        ? '[F44] VERDICT: GREEN'
        : `[F44] VERDICT: RED — ${failures.length} failure(s)`);
    if (failures.length > 0) failures.forEach((f) => console.log(`[F44] RED: ${f}`));
    process.exit(failures.length === 0 ? 0 : 1);
}

class AbortControllerCompat {
    private readonly controller = new AbortController();
    get abortSignal(): AbortSignalLike { return this.controller.signal; }
    abort(): void { this.controller.abort(); }
}

main();
