// =============================================================================
// Huginn — Obsidian Approval Gate
// src/harness/approval-gate.ts
//
// ApprovalGate implementation that opens an Obsidian modal so the user can
// inspect the proposed diff and approve or reject it.
// =============================================================================

import { App } from 'obsidian';
import type { AbortSignalLike } from '../llm/client.ts';
import type { DiffResult } from '../recipes/types.ts';
import { ApprovalModal } from '../ui/approval-modal.ts';

// Conform 2026-11-26 (baseline surgery, Restart Ledger §11): the gate vocabulary
// lived in src/harness/harness.ts, demolished at the ground state. This file is
// its new home — the gate owns the request/result shapes. The old loop's
// contextUsed disclosure rode machinery (deriveContextUsed) from the demolished
// harness and is excised with it; the new design re-introduces disclosure at
// the gate itself.
export interface ApprovalRequest {
    diffText: string;
    output: unknown;
    recipeName: string;
    targetPath?: string;
    /** Human-readable descriptions of checks that passed for this suggestion. */
    groundTruthChecks?: string[];
}

export interface ApprovalResult {
    /** True if the user approved the suggestion, false if they rejected it. */
    approved: boolean;
    /** Optional user-provided reason for rejection. */
    reason?: string;
}

export interface ApprovalGate {
    /** Return the approval result, or null to leave unapproved (tests). */
    approve(request: ApprovalRequest, signal?: AbortSignalLike): Promise<ApprovalResult | null>;
}

export class ObsidianApprovalGate implements ApprovalGate {
    constructor(private app: App) {}

    async approve(request: ApprovalRequest, signal?: AbortSignalLike): Promise<ApprovalResult | null> {
        let diff: DiffResult;
        try {
            diff = JSON.parse(request.diffText) as DiffResult;
        } catch {
            diff = { changes: [] };
        }

        return new Promise((resolve) => {
            const modal = new ApprovalModal(this.app, {
                recipeName: request.recipeName,
                targetPath: request.targetPath ?? '',
                diff,
                reason: this.describeOutput(request.output),
                groundTruthChecks: request.groundTruthChecks,
            }, (approved, reason) => {
                resolve({ approved, reason });
            });
            modal.open();

            // If the user clicks Stop while the approval modal is open,
            // close it and answer null so the caller can unwind immediately
            // (§6: an interrupt is not a decision, never a declined outcome).
            const onAbort = () => {
                modal.close();
                resolve(null);
            };
            // The abort may have fired before this promise was created (e.g.
            // the user clicked Stop during the recipe's LLM completion). Handle
            // that case immediately so the modal does not block on an already
            // aborted request.
            if (signal?.aborted) {
                onAbort();
                return;
            }
            signal?.addEventListener('abort', onAbort);
        });
    }

    private describeOutput(output: unknown): string | undefined {
        if (output === null || typeof output !== 'object') return undefined;
        const obj = output as Record<string, unknown>;
        const parts: string[] = [];
        if (typeof obj.tag === 'string') parts.push(`Proposed tag: ${obj.tag}`);
        if (typeof obj.reason === 'string') parts.push(`Reason: ${obj.reason}`);
        if (parts.length === 0) return undefined;
        return parts.join('\n');
    }
}
