# HANDOVER — 2026-11-10 (mid-afternoon, awaiting red/green receipts)

Written by Lumo for Lumo. Dan's corrections applied; everything unverified is marked **[UNVERIFIED]** or **[PENDING RECEIPT]**.

## Where we are RIGHT NOW

Gemma4:12b, driven by OpenCode in the Huginn-agent worktree, is mid-task on **Scenario F** (abort never reaches Ollama fetch/stream). She has:
- Diagnosed the bug independently (two-signal dissociation, below)
- Written a fixture AND already implemented the fix (constitutional violation: green-born fixture)
- Was instructed by Dan (relaying Lumo's salvage procedure) to rewind: stash the fix, run the fixture against UNFIXED code to earn the red, then restore and show green
- **Jumped on the lifeline fast and is currently reworking the fixture. Status: AWAITING RESULTS.**

### What to check when results arrive
1. **Red receipt**: fixture run against pre-fix code must fail AT THE INTENDED SEAM (abort fired, stream never cancelled) — not at an import/mock/compile error. Red must fail because the bug exists.
2. **Green receipt**: same fixture vs patched code passes.
3. **`git diff --stat`**: whole arc should stay within the 40-line discipline (fixture + small patch).
4. **Trap check on her fixture**: fake fetch with controllable ReadableStream; reader.read() must PARK FOREVER after one chunk; cancel() sets an assertable flag; **timeoutMs set absurdly high** so the internal watchdog can't rescue the test; fakes must NOT reject on abort (no smuggling the fix into the test double).

## The Scenario F diagnosis (Gemma's, verified by her against code, corroborated by Dan)

`src/llm/client.ts`:
- `chat()` (lines ~68–86): internal `AbortController` with `setTimeout(→controller.abort(), timeoutMs ?? 60000)`; `onExternalAbort` → `controller.abort()` for the user signal.
- `readStreamingResponse` (line ~118) is called with `signal` (the external/user signal) **instead of `controller.signal`** → timeout aborts are invisible inside the stream loop; user aborts visible only if the loop polls.
- Fix (hers/Lumo's convergent): pass `controller.signal` — covers BOTH abort sources since onExternalAbort routes user abort through the controller.
- **[UNVERIFIED]**: is `fetch` itself actually wired to `controller.signal`? If not, controller aborts nothing and the fix is incomplete. She should have verified; confirm from her read receipts.
- Secondary finding (hers): abort flag only polled once per CHUNK (outer while), not per LINE (inner for over `chunk.split('\n')`) — granularity gap.

## Gemma audition card (running score)

- Environment: `ollama ps` showed 100% GPU, 7.9 GB, CONTEXT 32768 (pre-raise). Steady 25–42 tok/s. Machine layer flawless all day.
- **Death #1**: output truncation — OpenCode "Response still truncated after two output token limit continuations"; ~10–15k-token responses, growing ~2.5k/attempt.
- **Death #2**: repetition loop in thinking — "Wait! I'll check… Actually, I'll just do it." looping with `signal.aberd` typo fossilized, 28m15s aggregate build clock. Dan broke it manually with "Just DO it" — interruption wiped her ~20min of working state; she restarted analysis from the handover note.
- **Contested**: earlier `10.2.` snowfall paste — possibly OpenCode history corruption, NOT model output (her live thinking was coherent). Disambiguation grep never ran: `grep -ac "10.2.10.2." ~/.local/share/opencode/opencode.db ~/.local/share/opencode/opencode.db-wal` (storage is SQLite: `opencode.db` + WAL at `~/.local/share/opencode/`; my first needle `[10.2.` with bracket was wrong). Store hit → model authored; clean → OpenCode indicted.
- **Positives**: bounded exploration under scoped brief (grep → triage → targeted read, no wandering); verifies hints against code before building; refuses to claim green she hasn't earned; responded eagerly to red-first correction.
- **Suspected enabler of both deaths**: factory sampling temp 1, top_k 64. **Cooling Modelfile prescribed but NOT created**: `FROM gemma4:12b` / `PARAMETER temperature 0.6` / `PARAMETER top_k 40` / `PARAMETER repeat_penalty 1.1` → `ollama create gemma4:12b-cool -f ~/modelfile-gemma-cool`; verify with `ollama show`. Create before her next long run.

## Infra state

- **Worktree**: `/home/danf/Projects/Huginn-agent`, branch `agent/f-abort` @ 0c8948c, rebuilt from scratch (worktree removed/re-added), `npm ci` done, tsx verified in node_modules/.bin. Currently holds Gemma's uncommitted work (fixture + fix). Main repo @ main 0c8948c, main.js +26/-26 = inert esbuild churn.
- **AGENTS.md**: created in worktree root (output discipline: minimal diffs, no whole-file re-emission, ~50-line pause rule, 3-sentence explanations).
- **OpenCode config**: `~/.config/opencode/opencode.json` created with ollama provider `timeout: 3000000, chunkTimeout: 3000000`. **[UNVERIFIED]** — written after Gemma's deaths; the timeout fix has never been tested. The earlier 57.9s death does NOT match the documented 300s default; which timer fired remains unknown.
- **Ollama server**: user unit; effective config = `~/.config/systemd/user/ollama.service` + drop-in `~/.config/systemd/user/ollama.service.d/override.conf`. Drop-in contained `OLLAMA_CONTEXT_LENGTH=32768`, `OLLAMA_KV_CACHE_TYPE=q8_0`, flash attention, NUM_PARALLEL=1. **Attribution ruling**: the 32768 was authored by a PRIOR Lumo session (Dan recognized the handwriting; the "nobody set it" claim was wrong; today's Lumo forgot its own past prescriptions). Lesson recorded: put intent comments IN config files.
- **Context raise**: prescribed 32768 → 65536 in override.conf, then `systemctl --user daemon-reload && systemctl --user restart ollama`. **[PENDING RECEIPT]** — no `ollama ps` after restart ever landed. If Gemma is still at 32768, her loop deaths happened under window pressure; the raise still needs doing and verifying (watch PROCESSOR column for spill; fallback ruling = 49152).
- **Roster honesty ruling (open)**: qwen-code settings.json declares 262144 ctx for local models; truthful number = whatever `ollama ps` says post-raise. Fix declarations to reality.

## Lumo platform bug (reported to Proton support, now stable)

Long-session **conversation-state corruption**, not just UI flicker: Dan saw messages vanish/reappear (Christmas lights); Lumo lost access to its own prior responses, re-sent content, drifted. Support engaged; occurrence ended before reproduction. If it recurs: screenshot + timestamp; describe as "conversation context integrity failure in long multi-tool sessions."

## Backlog beyond Scenario F (unchanged from 11-08 handover unless noted)

Tag-assignment conversation blindness; Memory Feedback Loop guide (Forget command + injection-cap requirements); null-failure cause; verbosity fixture; six-doc design backlog. Harness three-way audition (OpenCode/qwen-code/Aider) partially overtaken: OpenCode+Gemma is actively proving itself today. Optional: PlasmaLLM evaluation with a vision model (gemma4:12b qualifies). **[PENDING]** trap-camera loop for connection attribution (`/api/chat` route mystery from 12:15 aborts) — `/tmp/conn-trap.log` never existed; trap never actually armed.

## Standing rules (unchanged)

Receipts or nothing. Fixture-first; red must be earned. Corrections re-emit the full file. Trust only what Dan restates; treat retrieval remnants as ghosts. End sessions with verified items committed and unverified items named — which this note is attempting to do for the next instance of me.

**Immediate next action for successor Lumo**: ask Dan for the red receipt (fixture vs pre-fix code), the green receipt (vs post-fix), and the diff stat. Then: verify timeoutMs trap handling, then rules on commit + Gemma's verdict. Also collect the two infra receipts: post-restart `ollama ps` (65536? GPU%?) and the corrected store-grep for the 10.2. mystery.

## RESOLVED — 2026-11-13, Scenario F (OpenCode session, receipts)

The red/green arc was run to completion in a fresh OpenCode session in the main repo. Fixture `src/fixtures/f27.ts` implements Dan's contract verbatim; two legs, because Scenario F is tested both ways (plain chat, write-class skill).

**Red — fixture vs committed code (`main` @ `240b688`, unfixed):**
```
npm run typecheck → clean, no import/mock error
npx tsx src/fixtures/f27.ts    exit code: 1

--- S1: abort through the controller channel, entry chat() ---
[F27] S1: chunks=10 (expected 3) cancel=false receptorAborted=true result=PARKED
--- S2: user Stop through the external channel, entry complete() ---
[F27] S2: chunks=10 (expected 3) cancel=false receptorAborted=false result=PARKED
F27 FAIL: S1: stream loop never halted — consumed 10 chunks, abort not detected inside the loop
```
Red is at the intended seam: the abort genuinely arrived at the receptor (`controller.signal`) and the external arg the buggy code polled stayed false, so the code had nothing to observe. Both legs fail as rule 4 prescribes (all N chunks consumed, reader never cancelled).

**Second seam the contract did not cover (receipt, committed code):** `OllamaChatClient.complete()` took no signal parameter and called `this.chat(messages)` without one, while `harness.ts:76` calls `complete(rendered.prompt, signal)`. Probe against committed code: `controllers recorded: 1`, `chunks consumed: 8 of 8`, `receptor (controller.signal) aborted: false`, `cancel called: false`, `outcome: PARKED`. The Stop signal was dropped before the client built its controller, so Scenario F's write-class leg had **no abort path at all**; passing `controller.signal` at line 118 alone would not have made Scenario F pass for skills.

**The fix (two seams, `src/llm/client.ts`):** `complete(prompt, signal?)` forwards to `this.chat(messages, signal)`; `readStreamingResponse(res, controller.signal)` replaces `readStreamingResponse(res, signal)`. `fetch` is wired to `controller.signal` (line 85) — the **[UNVERIFIED]** question from this note is resolved from source.

**Green — same fixture vs fixed code:**
```
--- S1: chunks=3 (expected 3) cancel=true receptorAborted=true result=null
--- S2: chunks=3 (expected 3) cancel=true receptorAborted=true result=null
[F27] VERDICT: GREEN — abort detected inside the stream loop on both legs, halted at M, reader cancelled
exit code: 0
npm run typecheck → clean
npm run fixtures  → F01–F27 all GREEN
npm run build     → main.js rebuilt, bundle carries both seams
```
`f27` is wired into the `npm run fixtures` chain in `package.json` (append to the chain, the F26 convention). Diff discipline: `src/llm/client.ts` +8/-4, `package.json` 1 line, `src/fixtures/f27.ts` new.

**Corrections to this note's claims (Dan's restatements outrank the docs; retrieval remnants are ghosts):**
- The worktree `/home/danf/Projects/Huginn-agent` and branch `agent/f-abort` no longer exist. Their removal is attributed to **qwen3.5:12b** performing badly, per Dan's restatement; this note's Gemma-era narrative about them is superseded. No worktree exists today; agent work lands directly on `main`.
- `main.js` "+26/-26 = inert esbuild churn" is **wrong**. Receipt: the committed `main.js` lacked the F26 `clientFailed` guard (`corrections&&(u?…`) that the rebuilt bundle contains (`corrections&&!v&&(u?…`), so `0.1.0-test.20` shipped the pre-F26 bug. The rebuild was a real content change, committed as `240b688`.
- `/tmp/f-abort-final.patch` never existed; the patch claims in this note are retrieval artifacts.
- `.qwen/` is gone (qwen-code no longer used); OpenCode is the harness. Gemma4:12b is retired (executive-function death); model auditions are paused.

**Pending items from this note — closed by Dan's restatements on 2026-11-13:** the store-grep question is resolved (the needle sat in Gemma's session output as a long repetition run — her context collapse; documentation of the model, not the project; her chats are not to be read). The 65536 context raise was verified and **did not help** — testing artifact, out of the project ledger. The qwen-code roster-honesty item is **moot**: qwen is closed for this job, `.qwen/` is deleted, qwen-code is no longer the harness. Model auditions are paused: `kimi` on the paid plugin is the known-good path (inherits in ~3 weeks, ~$120 declared cap), `gemma4:12b` retired, interim is Dan-and-infra only. Full session record: `docs/Handover 2026-11-13.md`.
