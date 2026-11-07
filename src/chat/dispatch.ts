// =============================================================================
// Huginn — Chat Skill Dispatcher
// src/chat/dispatch.ts
//
// Given a user message and the available recipes, ask the model to identify
// which skill the user wants and which note it should run against. The
// dispatcher itself does not run the recipe; it returns a structured intent
// for the chat UI to execute through HuginnHarness.
// =============================================================================

import type { LoadedRecipe } from '../recipes/types.ts';
import type { AbortSignalLike, ChatLlmClient, ChatMessage } from '../llm/client.ts';

export interface DispatchIntent {
    recipeName: string;
    targetPath: string;
    reason: string;
}

export interface DispatchResult {
    intent: DispatchIntent | null;
    /** Raw model output for transparency / debugging. */
    raw: string | null;
}

export interface ChatSkillDispatcherOptions {
    llmClient: ChatLlmClient;
    /** Live recipe catalog accessor so the prompt is always built from the latest loaded recipes. */
    getRecipes: () => LoadedRecipe[];
}

export class ChatSkillDispatcher {
    constructor(private opts: ChatSkillDispatcherOptions) {}

    async dispatch(userMessage: string, activeNotePath: string | null, signal?: AbortSignalLike): Promise<DispatchResult> {
        const messages = this.buildDispatchMessages(userMessage, activeNotePath);
        const raw = await this.opts.llmClient.chat(messages, signal);
        if (raw === null) {
            return { intent: null, raw: null };
        }
        const intent = this.parseDispatch(raw);
        return { intent, raw };
    }

    private buildDispatchMessages(userMessage: string, activeNotePath: string | null): ChatMessage[] {
        const recipeList = this.opts
            .getRecipes()
            .map((r) => `- ${r.metadata.name}: ${r.trigger.description}`)
            .join('\n');

        const system = [
            'You are Huginn, a dispatcher inside Obsidian. The user has typed a request in a chat panel.',
            'Your job is to choose the best matching skill from the list below, and to identify which vault note the skill should target.',
            '',
            'Available skills:',
            recipeList,
            '',
            'Rules:',
            '- Return ONLY a raw JSON object with three fields: recipeName, targetPath, reason.',
            '- recipeName must exactly match one of the available skill names.',
            `- targetPath should be a vault-relative note path ending in .md. If the user does not name a note, use "${activeNotePath ?? 'no active note'}" as the fallback target path.`,
            '- reason should be one sentence explaining why you chose this skill.',
            '- If no skill matches the request, return {"recipeName":"", "targetPath":"", "reason":"No matching skill."}.',
            '- Do not return markdown, commentary, or code fences.',
        ].join('\n');

        return [
            { role: 'system', content: system },
            { role: 'user', content: userMessage },
        ];
    }

    private parseDispatch(raw: string): DispatchIntent | null {
        let text = raw.trim();
        const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
        if (fence) text = fence[1].trim();

        try {
            const parsed = JSON.parse(text) as Record<string, unknown>;
            if (
                typeof parsed.recipeName !== 'string' ||
                typeof parsed.targetPath !== 'string' ||
                typeof parsed.reason !== 'string' ||
                parsed.recipeName.length === 0
            ) {
                return null;
            }
            const matched = this.opts.getRecipes().find((r) => r.metadata.name === parsed.recipeName);
            if (!matched) return null;
            return {
                recipeName: parsed.recipeName,
                targetPath: parsed.targetPath,
                reason: parsed.reason,
            };
        } catch {
            return null;
        }
    }
}
