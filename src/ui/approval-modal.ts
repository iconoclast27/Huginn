// =============================================================================
// Huginn — Approval Modal
// src/ui/approval-modal.ts
//
// Shows the user the diff the model produced and asks for approval before the
// harness runs the apply routine. This is the human-in-the-loop gate.
// =============================================================================

import { Modal, Setting, type App } from 'obsidian';
import type { DiffResult } from '../recipes/types.ts';
import { renderDiff } from '../harness/diff.ts';

export interface ApprovalRequest {
    recipeName: string;
    targetPath: string;
    diff: DiffResult;
    reason?: string;
}

export class ApprovalModal extends Modal {
    private request: ApprovalRequest;
    private onConfirm: (approved: boolean) => void;
    /** The most recently opened approval modal; closed by the Stop button. */
    static activeModal: ApprovalModal | null = null;

    constructor(app: App, request: ApprovalRequest, onConfirm: (approved: boolean) => void) {
        super(app);
        this.request = request;
        this.onConfirm = onConfirm;
    }

    static closeActive(): void {
        const modal = ApprovalModal.activeModal;
        if (modal) {
            modal.close();
            ApprovalModal.activeModal = null;
        }
    }

    onOpen(): void {
        ApprovalModal.activeModal = this;
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: `Huginn: Approve ${this.request.recipeName}` });

        if (this.request.targetPath) {
            contentEl.createEl('p', { text: `Target: ${this.request.targetPath}` });
        }

        if (this.request.reason) {
            contentEl.createEl('p', { text: this.request.reason });
        }

        const diffText = renderDiff(this.request.diff);
        const pre = contentEl.createEl('pre', {
            cls: 'huginn-diff',
            attr: { style: 'white-space: pre-wrap; background: var(--background-secondary); padding: 1em; border-radius: 6px;' },
        });
        pre.setText(diffText);

        const buttonRow = contentEl.createDiv({ cls: 'huginn-approval-buttons' });
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '1em';
        buttonRow.style.marginTop = '1em';

        new Setting(buttonRow)
            .addButton((button) => {
                button.setButtonText('Reject');
                button.onClick(() => {
                    this.close();
                    this.onConfirm(false);
                });
            })
            .addButton((button) => {
                button.setButtonText('Approve');
                button.setCta();
                button.onClick(() => {
                    this.close();
                    this.onConfirm(true);
                });
            });
    }

    onClose(): void {
        if (ApprovalModal.activeModal === this) {
            ApprovalModal.activeModal = null;
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}
