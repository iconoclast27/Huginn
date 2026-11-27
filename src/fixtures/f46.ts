// =============================================================================
// Huginn — F46: The recipes leg — teach layer rewritten against the real verbs
// src/fixtures/f46.ts
//
// POLICED: src/recipes/* (loader/parser/renderer/node-source/bundled + the
// .md catalog) at the recipe seam, plus the teach channel where chat.ts rides
// it (Design Report §1 line 14: "system (skill texts) + tools (manifest
// schemas) + history"; §2 :30-35, D-10: "A recipe is payload-shaping text:
// which verb family a question class maps to, what a well-formed call looks
// like, which families must not be confused (lexical vs semantic,
// searchVault-class vs notesLike-class). It rides two channels: skill text in
// the system position, and the tool descriptions themselves").
//
// Re-anchoring of the ratified rows (Restart Ledger §11/§13):
//   H-f28 SALVAGE — "Bundled catalog matches src/recipes — Recipe seam:
//                    catalog-match re-earned on the new catalog" (V1).
//   H-f18 survivor — the legacy ground-truth Validation format keeps failing
//                    loudly through the loader at the new seam (V4b: the
//                    loader excludes it with its deprecation error — H-f18
//                    polices the parse face itself and stays in the chain).
//   §11 row — "src/recipes/* … REBUILD: Teach layer survives; content
//      rewritten to real command names/shapes" (V2/V3: real MANIFEST verb
//      names, no gatherer placeholders, the D-10 named confusion pair taught).
//
// CONTRACT:
//   V1  Catalog match (H-f28's row): the BUNDLED_RECIPES fileName set equals
//       the src/recipes/*.md set on disk, and every content is BYTE-identical
//       (installer seeds bundled; loader reads disk — the two must not drift).
//   V2  Real-verb teach: all six load and parse (loader ok, zero errors);
//       every recipe's Instructions text names at least one MANIFEST verb
//       name (measured import — f42 polices that surface), and NO recipe
//       carries a {{placeholder}} — the harness gatherer that filled those
//       was demolished (§11: harness/gather DEMOLISH), so the new teach text
//       is static payload design, not a render template.
//   V3  Family-confusion teach (D-10's named example, the related-notes
//       recipe): names BOTH vault__searchVault and muninn__notesLike, says
//       they must never be confused, and carries the honest-label words
//       (similarity match, not a lexical hit).
//   V4  Loader mechanism survives LOUD on the new catalog: a legacy
//       source/check Validation recipe through a fake source yields ok:false,
//       its error carried, the recipe EXCLUDED — never half-parsed.
//   V5  Skill text rides the SYSTEM position (Design §1/D-10): chat.ts's
//       getSkillText option → the send's composed system message carries the
//       rendered block VERBATIM; the skill text appears in NO user message
//       content across the captured request (contrast with R9: HOSTILE tool
//       DATA rides only role:"tool" — f45 V5 polices that half; the teach
//       half is instruction-position BY DESIGN here).
//   V6  Honest absence: no getSkillText (and an empty catalog) → NO skill
//       block in the system line — no fabricated header, no empty section.
//
// CHOICES (disclosed, executor's unless canon fixes them):
//   - f46 continues the record chain (f42 manifest, f43 validator, f44 gate,
//       f45 client wiring). Six files + six names stay (H-f16 pins six).
//   - renderSkillText is a NEW face in the existing renderer.ts home: probed
//       via import * as + typeof guard (the f44 existing-module red pattern);
//       link-throw would be for NEW-module homes only (f42/f44/f45).
//   - Fake transport (not the canned-fetch/OllamaToolsClient mechanism — f45
//       already polices the shipped client): the chat seam here needs the
//       COMPOSED system line, which chat.ts builds and hands to runTurn;
//       the fake captures chatTurn's messages array. The loop internals are
//       f45's territory, not this leg's.
//   - getSkillText is a getter (not a snapshot): the recipe folder watcher
//       reloads this.recipes in main.ts; edited skills apply on the NEXT
//       send — fresh-by-design, disclosed.
//   - Cwd-relative 'src/recipes' for the disk faces: fixtures run at the
//       repo root (the red run executes the same paths against the HEAD
//       archive in scratch, like every leg's red mechanism).
// =============================================================================

import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { BUNDLED_RECIPES } from '../recipes/bundled.ts';
import { MANIFEST } from '../manifest/manifest.ts';
import { ChatController } from '../chat/chat.ts';
import type { LoadedRecipe } from '../recipes/types.ts';
import type { RecipeSource } from '../recipes/loader.ts';
import type { ApprovalGate, ApprovalRequest, ApprovalResult } from '../harness/approval-gate.ts';
import type { ApprovalMode } from '../settings.ts';
import type { ChatLlmClient, ChatMessage } from '../llm/client.ts';
import type { TurnMessage } from '../chat/turn.ts';
import type { AssistantTurn } from '../chat/turn.ts';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The renderer face under test is NEW at this seam — namespace import + typeof
// guard (f44's existing-module red pattern), so HEAD says RED loudly instead
// of crashing at the link.
import * as recipeRendererNs from '../recipes/renderer.ts';

const failures: string[] = [];
function check(cond: boolean, msg: string): void {
    if (!cond) failures.push(msg);
}

class FakeApp {
    vault = {} as never;
    workspace = { getActiveFile: () => null } as never;
}

class FakeChatClient implements ChatLlmClient {
    async chat(messages: ChatMessage[]): Promise<string | null> {
        return 'fake summary';
    }
    async complete(prompt: string): Promise<string | null> {
        return prompt;
    }
}

async function main(): Promise<void> {
    console.log('[F46] recipes leg: teach rewritten vs real verbs');

    // ---------- V1 — catalog match (H-f28's salvage row re-earned) ----------
    {
        const dir = 'src/recipes';
        const entries = await readdir(dir, { withFileTypes: true });
        const diskNames = entries
            .filter((e) => e.isFile() && e.name.endsWith('.md'))
            .map((e) => e.name)
            .sort();
        const bundleNames = BUNDLED_RECIPES.map((r) => r.fileName).sort();
        check(JSON.stringify(diskNames) === JSON.stringify(bundleNames),
            `V1: bundled fileName set must equal the src/recipes .md set — got disk ${JSON.stringify(diskNames)} vs bundle ${JSON.stringify(bundleNames)}`);
        let drift = 0;
        for (const r of BUNDLED_RECIPES) {
            const onDisk = await readFile(join(dir, r.fileName), 'utf-8');
            if (onDisk !== r.content) drift++;
        }
        check(drift === 0, `V1: ${drift} recipe(s) drift between bundled.ts and disk .md — byte-equality is law (installer seeds bundled, loader reads disk)`);
        console.log('[F46] PASS: V1 catalog match' );
    }

    // ---------- V2 — loader+parse survive; teach names REAL verbs only ----
    {
        const load = await loadRecipes(new NodeRecipeSource('src/recipes'));
        check(load.ok && load.errors.length === 0,
            `V2: the new catalog must load clean — errors ${JSON.stringify(load.errors)}`);
        check(load.recipes.length === 6, `V2: six recipes load (H-f16 pins six) — got ${load.recipes.length}`);
        const verbNames = MANIFEST.map((v) => v.name);
        for (const r of load.recipes) {
            check(verbNames.some((n) => r.instructions.includes(n)),
                `V2: recipe '${r.metadata.name}' teaches payload design with at least one MANIFEST verb name (D-10: recipes ride the REAL verb surface — measured via manifest.ts import)`);
            check(!r.instructions.includes('{{'),
                `V2: recipe '${r.metadata.name}' carries no {{placeholder}} — the gatherer that filled placeholders was demolished (§11 harness/gather DEMOLISH); teach text is static`);
        }
        console.log('[F46] PASS: V2 real-verb teach');
    }

    // ---------- V3 — family-confusion teach (D-10's named pair) -----------
    {
        const load = await loadRecipes(new NodeRecipeSource('src/recipes'));
        const related = load.recipes.find((r) => r.metadata.name === 'related-notes');
        check(related !== undefined, 'V3: the related-notes recipe exists in the catalog');
        if (related) {
            check(related.instructions.includes('vault__searchVault') && related.instructions.includes('muninn__notesLike'),
                'V3: related-notes names BOTH sides of the D-10 pair (searchVault-class vs notesLike-class)');
            check(/never confuse/i.test(related.instructions),
                'V3: related-notes teaches the two families must never be confused');
            check(/similarity/i.test(related.instructions) && /not a lexical hit/i.test(related.instructions),
                'V3: related-notes carries the honest-label words (similarity match, not a lexical hit — Ledger §2.2 label law echoed in the teach text)');
        }
        console.log('[F46] PASS: V3 confusion teach');
    }

    // ---------- V4 — loader stays LOUD on the legacy Validation format ----
    {
        const legacy = `---
name: legacy-loader-face
version: 0.1.0
modelTier: fast
riskClass: read-only
---

# Trigger
Legacy format through the loader.

# Instructions
Return JSON.

# Validation
- path: /tag
  source: vault-file
  check: not-in-frontmatter
  params: {"key":"tags"}
`;
        class FakeSource implements RecipeSource {
            async listRecipes(): Promise<string[]> {
                return ['memory://legacy-loader-face.md'];
            }
            async readRecipe(_path: string): Promise<string> {
                return legacy;
            }
        }
        const load = await loadRecipes(new FakeSource());
        check(!load.ok && load.errors.length === 1 && load.recipes.length === 0,
            `V4: legacy recipe excluded with exactly one carried error — got ok=${load.ok} errors=${load.errors.length} recipes=${load.recipes.length}`);
        check(load.errors.some((e) => e.includes("deprecated 'source'/'check'")),
            `V4: the deprecation wording rides through the loader (H-f18's seam stays pinned) — got ${JSON.stringify(load.errors)}`);
        console.log('[F46] PASS: V4 loud legacy rejection via loader');
    }

    // ---------- V5/V6 — the teach channel rides the system position ------
    {
        const renderSkillText = (recipeRendererNs as Record<string, unknown>)['renderSkillText'];
        check(typeof renderSkillText === 'function',
            "V5 seam-absent red: renderer.ts exports renderSkillText (the skill-text face — D-10 channel 1); HEAD has no such face");
        if (typeof renderSkillText !== 'function') {
            console.log(failures.length === 0 ? '[F46] VERDICT: RED' : `[F46] VERDICT: RED — ${failures.length} failure(s)`);
            failures.forEach((f) => console.log(`[F46] RED: ${f}`));
            process.exit(1);
        }
        const skillText = (renderSkillText as (recipes: LoadedRecipe[]) => string)(
            (await loadRecipes(new NodeRecipeSource('src/recipes'))).recipes);
        check(skillText.length > 0, 'V5: a loaded catalog renders a non-empty skill block');

        const sent: Array<{ systemContent: string; userContents: string[]; toolContents: string[] }> = [];
        class FakeTurnClient {
            lastMessages: TurnMessage[] | null = null;
            async chatTurn(messages: TurnMessage[], _tools: unknown, _signal?: unknown): Promise<AssistantTurn | null> {
                this.lastMessages = messages;
                return { content: 'Answered without tools.', toolCalls: [] };
            }
        }
        const turn = new FakeTurnClient();
        const gate: ApprovalGate = {
            approve: async (_request: ApprovalRequest, _signal?: unknown): Promise<ApprovalResult | null> => ({ approved: true }),
        };
        const controller = new ChatController({
            app: new FakeApp() as never,
            llmClient: new FakeChatClient(),
            turnClient: turn,
            gate,
            executors: {},
            approvalMode: 'ASK' as ApprovalMode,
            turnOpBound: 4,
            getSkillText: () => skillText,
        });
        const session = await controller.createSession();
        const res = await controller.sendMessage(session, 'Summarize notes/alpha.md.');
        const systemMsg = (turn.lastMessages as unknown as Array<{ role: string; content: string }>).filter((m) => m.role === 'system');
        check(systemMsg.length === 1 && systemMsg[0].content.includes(skillText),
            `V5: the send's system message carries the skill block VERBATIM (Design §1 :14 "system (skill texts)", D-10 channel 1) — system contents: ${JSON.stringify(systemMsg.map((m) => m.content.length))}`);
        const userMsgs = (turn.lastMessages as unknown as Array<{ role: string; content: string }>).filter((m) => m.role === 'user');
        check(userMsgs.some((m) => m.content.includes('Summarize notes/alpha.md.')) && userMsgs.every((m) => !m.content.includes(skillText)),
            'V5: the skill block rides the system position, never a user message (instruction position BY DESIGN — the R9 mirror of f45 V5: hostile tool DATA never rides here; the tool channel is empty this scenario)');
        const toolMsgs = (turn.lastMessages as unknown as Array<{ role: string; content: string }>).filter((m) => m.role === 'tool');
        check(toolMsgs.every((m) => !m.content.includes(skillText)), 'V5: no role:"tool" content carries the teach block either');
        check(res.response === 'Answered without tools.', 'V5: the loop\'s no-tool-call message is still the answer face (f45 law, untouched here)');

        // V6 — honest absence.
        const bare = new ChatController({
            app: new FakeApp() as never,
            llmClient: new FakeChatClient(),
            turnClient: turn,
            gate,
            executors: {},
            approvalMode: 'ASK' as ApprovalMode,
            turnOpBound: 4,
        });
        const s2 = await bare.createSession();
        const res2 = await bare.sendMessage(s2, 'Any note?');
        const sys2 = (turn.lastMessages as unknown as Array<{ role: string; content: string }>).filter((m) => m.role === 'system');
        check(sys2.length === 1 && !sys2[0].content.includes(skillText),
            'V6: unwired (no getSkillText) → no skill block in the system line — honest absence, no fabricated header');
        check(res2.response === 'Answered without tools.', 'V6: unwired send still answers (the block is teach, not a requirement)');
        const emptyTurn = new FakeTurnClient();
        const emptyCtl = new ChatController({
            app: new FakeApp() as never,
            llmClient: new FakeChatClient(),
            turnClient: emptyTurn,
            gate,
            executors: {},
            approvalMode: 'ASK' as ApprovalMode,
            turnOpBound: 4,
            getSkillText: () => (renderSkillText as (recipes: LoadedRecipe[]) => string)([]),
        });
        const s3 = await emptyCtl.createSession();
        await emptyCtl.sendMessage(s3, 'Nothing loaded.');
        const sys3 = (emptyTurn.lastMessages as unknown as Array<{ role: string; content: string }>).filter((m) => m.role === 'system');
        check(sys3.length === 1 && !/\n## /.test(sys3[0].content),
            'V6: empty catalog renders no block (renderSkillText([]) === \'\' — chat.ts skips the empty section)');

        console.log('[F46] PASS: V5/V6 skill text rides the system position — honestly absent when unwired');
    }

    console.log(failures.length === 0 ? '[F46] VERDICT: GREEN' : `[F46] VERDICT: RED — ${failures.length} failure(s)`);
    if (failures.length > 0) {
        failures.forEach((f) => console.log(`[F46] RED: ${f}`));
        process.exit(1);
    }
    process.exit(0);
}

void main();
