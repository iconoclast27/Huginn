// =============================================================================
// Huginn — Obsidian Approval Gate
// src/harness/approval-gate.ts
//
// ApprovalGate implementation that opens an Obsidian modal so the user can
// inspect the proposed diff and approve or reject it.
// =============================================================================

import { App } from 'obsidian';
import type { ApprovalGate, ApprovalRequest, ApprovalResult } from './harness.ts';
import type { AbortSignalLike } from '../llm/client.ts';
import type { DiffResult } from '../recipes/types.ts';
import { ApprovalModal } from '../ui/approval-modal.ts';

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
            }, (approved, reason) => {
                resolve({ approved, reason });
            });
            modal.open();

            // If the user clicks Stop while the approval modal is open,
            // close it and treat the request as rejected so the harness
            // can unwind immediately. Aborted results are not recorded as
            // refusals in corrections memory.
            const onAbort = () => {
                modal.close();
                resolve(null);
            };
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
