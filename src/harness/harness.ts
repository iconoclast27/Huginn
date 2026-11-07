// =============================================================================
// Huginn — Skill Harness
// src/harness/harness.ts
//
// Orchestrator: load a recipe, gather inputs, render the prompt, call the LLM,
// validate output against the recipe schema, compute the diff, then run the
// apply routine only after approval. The model never sees a tool menu; it fills
// a form and the harness acts.
// =============================================================================

import type {
    LoadedRecipe,
    GatheredInput,
    RecipeRunResult,
    ApplyResult,
    ValidationError,
} from '../recipes/types.ts';
import { createRenderContext, renderRecipe } from '../recipes/renderer.ts';
import { validateJson } from './validator.ts';
import { computeDiff } from './diff.ts';
import type { ApplyRegistry } from './apply.ts';
import type { LlmClient, AbortSignalLike } from '../llm/client.ts';
import type { GroundTruthValidator } from './ground-truth.ts';
import type { CorrectionsMemory } from '../memory/kinds.ts';

export interface InputGatherer {
    gather(recipe: LoadedRecipe, params?: Record<string, unknown>): Promise<GatheredInput[]>;
}

export interface ApprovalRequest {
    diffText: string;
    output: unknown;
    recipeName: string;
    targetPath?: string;
}

export interface ApprovalResult {
    /** True if the user approved the suggestion, false if they rejected it. */
    approved: boolean;
    /** Optional user-provided reason for rejection; recorded in corrections. */
    reason?: string;
}

export interface ApprovalGate {
    /** Return the approval result, or null to leave unapproved (tests). */
    approve(request: ApprovalRequest, signal?: AbortSignalLike): Promise<ApprovalResult | null>;
}

export interface HarnessOptions {
    llmClient: LlmClient;
    inputGatherer: InputGatherer;
    approvalGate: ApprovalGate;
    applyRegistry: ApplyRegistry;
    groundTruthValidator?: GroundTruthValidator;
    /** Optional corrections memory so recipe prompts can learn from previous mistakes. */
    corrections?: CorrectionsMemory;
}

export class HuginnHarness {
    constructor(private opts: HarnessOptions) {}

    async run(
        recipe: LoadedRecipe,
        params?: Record<string, unknown>,
        beforeState?: unknown,
        signal?: AbortSignalLike,
    ): Promise<RecipeRunResult> {
        const inputs = await this.opts.inputGatherer.gather(recipe, params);
        const corrections = this.opts.corrections
            ? await this.opts.corrections.getContext(recipe.metadata.name, 5)
            : { text: '' };
        const rendered = renderRecipe(createRenderContext(recipe, inputs), corrections.text);

        const raw = await this.opts.llmClient.complete(rendered.prompt, signal);
        const parsedOutput: { raw: string; json: unknown | undefined } = {
            raw: raw ?? '',
            json: undefined,
        };

        let schemaValid = false;
        const schemaErrors: ValidationError[] = [];
        let groundTruthValid = true;
        const groundTruthErrors: ValidationError[] = [];

        if (raw === null) {
            schemaErrors.push({ path: '', message: 'LLM client returned null' });
        } else {
            try {
                parsedOutput.json = JSON.parse(raw);
            } catch (e) {
                schemaErrors.push({
                    path: '',
                    message: `Output is not valid JSON: ${(e as Error).message}`,
                });
            }

            if (parsedOutput.json !== undefined) {
                const schemaResult = validateJson(parsedOutput.json, recipe.outputSchema);
                schemaValid = schemaResult.ok;
                schemaErrors.push(...schemaResult.errors);

                if (schemaValid && this.opts.groundTruthValidator) {
                    const gtResult = await this.opts.groundTruthValidator.validate(recipe, inputs, parsedOutput.json);
                    groundTruthValid = gtResult.ok;
                    groundTruthErrors.push(...gtResult.errors);
                }
            }
        }

        const afterState = parsedOutput.json;
        const diff = computeDiff(beforeState ?? {}, afterState ?? {});

        let approved: boolean | null = null;
        let applyResult: ApplyResult | null = null;

        const targetPath = findTargetPath(inputs);
        if (schemaValid && groundTruthValid) {
            if (recipe.applyMethod === 'noop') {
                // Read-only skills do not require approval and are not applied.
                approved = null;
                applyResult = null;
            } else {
                const approval = await this.opts.approvalGate.approve({
                    diffText: JSON.stringify(diff),
                    output: afterState ?? {},
                    recipeName: recipe.metadata.name,
                    targetPath,
                }, signal);
                if (approval === null) {
                    approved = null;
                } else {
                    approved = approval.approved;
                    if (approved === true) {
                        const routine = this.opts.applyRegistry.get(recipe.applyMethod);
                        if (!routine) {
                            applyResult = { applied: false, message: `Unknown apply method: ${recipe.applyMethod}` };
                        } else {
                            applyResult = await routine({ recipe, output: afterState ?? {}, inputs });
                        }
                    } else {
                        const reason = approval.reason?.trim();
                        applyResult = { applied: false, message: reason ? `Rejected: ${reason}` : 'Rejected by approval gate.' };
                        if (this.opts.corrections) {
                            await this.opts.corrections.append({
                                recipe: recipe.metadata.name,
                                type: 'refusal',
                                key: (reason ?? 'user rejected suggestion').slice(0, 120),
                                note: reason ? `User rejected suggestion: ${reason}` : 'User rejected the suggested change via the approval gate.',
                            });
                        }
                    }
                }
            }
        }

        if (this.opts.corrections) {
            if (!schemaValid) {
                await this.opts.corrections.append({
                    recipe: recipe.metadata.name,
                    type: 'schema-error',
                    key: schemaErrors.map((e) => e.message).join('; ').slice(0, 120),
                    note: `Schema validation failed: ${schemaErrors.map((e) => e.message).join('; ')}. Output was: ${JSON.stringify(parsedOutput.json ?? null).slice(0, 400)}`,
                });
            } else if (applyResult?.applied === false && !applyResult.message.startsWith('Rejected')) {
                await this.opts.corrections.append({
                    recipe: recipe.metadata.name,
                    type: 'apply-failed',
                    key: applyResult.message.slice(0, 120),
                    note: `Apply failed: ${applyResult.message}. Output was: ${JSON.stringify(parsedOutput.json ?? null).slice(0, 400)}`,
                });
            }
        }

        return {
            recipeName: recipe.metadata.name,
            renderedPrompt: rendered.prompt,
            parsedOutput,
            schemaValid,
            schemaErrors,
            groundTruthValid,
            groundTruthErrors,
            diff,
            approved,
            applyResult,
        };
    }

    /** Best-effort warmup request to pull the chat model back into memory. */
    async warmup(): Promise<void> {
        await this.opts.llmClient.complete('Say "ok". Return only the word ok.');
    }
}

// ---------------------------------------------------------------------------
// Helpers for fixtures
// ---------------------------------------------------------------------------

export class ManualInputGatherer implements InputGatherer {
    constructor(private values: Map<string, unknown>) {}

    async gather(recipe: LoadedRecipe): Promise<GatheredInput[]> {
        return recipe.inputs.map((input) => ({
            key: input.key,
            value: this.values.get(input.key) ?? null,
        }));
    }
}

export class StaticApprovalGate implements ApprovalGate {
    constructor(private decision: boolean | null, private reason?: string) {}

    async approve(_request: ApprovalRequest, _signal?: AbortSignalLike): Promise<ApprovalResult | null> {
        return this.decision === null ? null : { approved: this.decision, reason: this.reason };
    }
}

export function findTargetPath(inputs: GatheredInput[]): string | undefined {
    const found = inputs.find((i) => i.key === 'targetPath');
    return typeof found?.value === 'string' ? found.value : undefined;
}
