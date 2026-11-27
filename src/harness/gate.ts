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

export async function routeThroughGate(
    gate: ApprovalGate,
    name: string,
    request: ApprovalRequest,
    signal?: AbortSignalLike,
): Promise<GateOutcome> {
    // Read families are never gated (Design Report §2, D-1/D-4): the ROUTER
    // enforces it, so a client-wiring slip cannot quietly gate a read.
    const verb = MANIFEST.find((v) => v.name === name);
    if (verb === undefined || !verb.mutation) return { decision: 'not-gated' };

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
