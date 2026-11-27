// =============================================================================
// Huginn — Per-call gate routing (step 6, leg 3: gate/modal/diff)
// src/harness/gate.ts
//
// The choke point between VALIDATE and execute at the per-call anatomy. Design
// Report §2 GATE is law: mutation families always route through the gate; read
// families never; a gate rejection is NOT an exception — it is a validator-class
// is_error tool result (the same ToolErrorEnvelope channel as validator.ts:109).
// The committed gate vocabulary lives in approval-gate.ts (its :45-50 parse of
// request.diffText as a DiffResult fixes the dressing format pinned here).
//
// Re-anchor of the ratified rows (Restart Ledger §11): H-f04 KEEP (request
// shape at the per-call anatomy), H-f25 SALVAGE (the request shows what it
// will change), H-f33 SALVAGE (one gate per write, D-4), H-f35 SALVAGE (stop
// parity + inert declines). The obsidian modal itself is not loadable in the
// fixture harness (measured: tsx cannot resolve bare 'obsidian' through
// approval-modal.ts) — its DOM observables ride the Combined Testing Schedule
// H3 block; this module keeps the chat.ts:10 type-only-import discipline.
// =============================================================================

import { computeDiff, renameDiff } from './diff.ts';
import { MANIFEST } from '../manifest/manifest.ts';
import type { ApprovalGate, ApprovalRequest, ApprovalResult } from './approval-gate.ts';
import type { ApprovalMode } from '../settings.ts';
import type { ToolErrorEnvelope } from './validator.ts';
import type { AbortSignalLike } from '../llm/client.ts';
import type { DiffResult } from '../recipes/types.ts';

// The manifest is the class authority (D-4 flag; H-f42 polices the set).
export interface GateOutcome {
    decision: 'approved' | 'declined' | 'stopped' | 'not-gated';
    /** Declined only: the validator-class tool error (§2 — no exceptions). */
    toolError?: ToolErrorEnvelope;
    /** The raw gate answer when a decision was made (client records ride it). */
    approval?: ApprovalResult;
    /** Auto-decisions (ADR 01 modes): the wording the client surfaces to the
     * user where it reasonably can ("any tool user notice … should say so if
     * reasonable practicable" — ADR 01, Dan's act 2026-11-27). */
    notice?: string;
}

export function buildApprovalRequest(
    name: string,
    resolved: Record<string, unknown>,
    oldContent: string | null,
    newContent: string | null,
): ApprovalRequest {
    const path = typeof resolved.path === 'string' ? resolved.path as string : '';
    const newPath = typeof resolved.newPath === 'string' ? resolved.newPath as string : '';
    // D-14 (Ledger §2.2:60): the rename's diff is its whole path change — data-
    // driven from the manifest slot ('newPath' exists exactly for vault__rename,
    // measured: manifest.ts:168), no verb-name literal.
    const verb = MANIFEST.find((v) => v.name === name);
    const isRename = verb !== undefined && verb.parameters.properties['newPath'] !== undefined;
    const diff: DiffResult = isRename
        ? renameDiff(path, newPath)
        : computeDiff(oldContent ?? '', newContent ?? '');
    return {
        // The committed approval-gate.ts parses this back as DiffResult (:47).
        diffText: JSON.stringify(diff),
        // Per-call anatomy (executor choice, fixture-justified): the slot the
        // old loop filled with the recipe suggestion carries the resolved args.
        output: resolved,
        // recipeName slot at the per-call anatomy = the model-facing verb name
        // (the old recipe notion is dead at this anatomy — D-8).
        recipeName: name,
        targetPath: newPath !== '' ? newPath : (path !== '' ? path : undefined),
        // groundTruthChecks stays unset: ground truth was excised at the
        // baseline (Ledger §11); the D-5 per-result face is docket R2's.
    };
}

// ADR 01 (Huginn docs/decisions/adr-01.md, Accepted 2026-11-27): NEVER auto-refuses
// (feedback names the auto-refuse; whether the model tells the user is the model's
// problem), YOLO auto-approves (user notice says so where practicable), AUTOAPPROVE
// rides D-13 (Ledger §2.2: web-tool-class call in the current turn history downgrades
// that turn's mutation approvals to ASK). The detector arrives as a boolean — the
// loop computes it ("no NLP, no content tracking", D-13). Mode routing is mutation-
// only: reads were refused above before any mode is consulted (D-4/D-1).
export interface ApprovalPolicy {
    mode: ApprovalMode;
    externalReadingThisTurn?: boolean;
}

export async function routeThroughGate(
    gate: ApprovalGate,
    name: string,
    request: ApprovalRequest,
    signal?: AbortSignalLike,
    policy: ApprovalPolicy = { mode: 'ASK' },
): Promise<GateOutcome> {
    // Read families are never gated under ANY mode (Design Report §2, D-1/D-4):
    // the ROUTER enforces it, so a client-wiring slip cannot quietly gate a read.
    const verb = MANIFEST.find((v) => v.name === name);
    if (verb === undefined || !verb.mutation) return { decision: 'not-gated' };

    if (policy.mode === 'NEVER') {
        return {
            decision: 'declined',
            toolError: {
                role: 'tool',
                name,
                content: `approval mode NEVER: this change from '${name}' was auto-refused — the user was not asked. `
                    + 'Nothing was applied; the model may apologize, change plan, or stop (telling the user is the model\'s choice).',
                is_error: true,
            },
        };
    }
    if (policy.mode === 'YOLO') {
        return {
            decision: 'approved',
            notice: `auto-approved (YOLO mode): the '${name}' change was applied without a pause.`,
        };
    }
    if (policy.mode === 'AUTOAPPROVE' && policy.externalReadingThisTurn !== true) {
        return {
            decision: 'approved',
            notice: `auto-approved (AUTOAPPROVE mode; no external reading this turn): the '${name}' change was applied without a pause.`,
        };
    }

    // ASK — and AUTOAPPROVE WITH external reading this turn, D-13's downgrade:
    const approval = await gate.approve(request, signal);
    // null = the committed Stop path (approval-gate.ts:64-70): an interrupt is
    // not a decision (§6), so it never dresses as a decline (§3.8 law).
    if (approval === null) return { decision: 'stopped' };
    if (approval.approved) return { decision: 'approved', approval };

    // Decline: inert for the caller (nothing executed) + the same machine-
    // readable channel the validator uses (§2 design consequence). Wording is
    // the executor's; the ANATOMY and channel are law (H-f43's envelope).
    return {
        decision: 'declined',
        approval,
        toolError: {
            role: 'tool',
            name,
            content: `user declined this change from '${name}': ${approval.reason ?? 'no reason given'}. `
                + 'Nothing was applied; the model may apologize, change plan, or stop — '
                + 'do not re-propose this exact change in this turn.',
            is_error: true,
        },
    };
}
