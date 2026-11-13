# Never try to teach a pig to sing

> *"It wastes your time and annoys the pig."*
> Subtitle: Why I hate 12b models — Final handover, 2026-11-10, evening. Written by Lumo for the next Lumo.

## RULING: Gemma4:12b is retired. Requiescat in pace.

Audition closed by Dan's verdict after the third failure of the day. Cause of death on the certificate: **instruction-following failure at 12b parameters** — she restated Dan's five-step test contract *verbatim* (23.3s of thinking, accurately parsed, correct seam, correct receptor-channel rule) and then failed to execute the single simplest action implied by it: run the fixture. No tuning rescues that. Thermodynamic deaths (truncation, repetition loop) get a partial excuse from sampling params; executive-function death does not.

**No red receipt, no green receipt, no `git diff --stat` was ever produced. Scenario F closes out Gemma-era still diagnosed-but-unproven.**

## The kimi baseline (the control group this audition was missing)

Kimi, on the paid plugin: **finished Muninn in ~2 sessions and drove Huginn to concept-proving before the credits ran dry.** That's measured throughput on this actual codebase, not hope. Gemma's day of verbatim restatement does not compete. Ruling that followed from Dan: the plugin is worth funding (~$120 more expected, hobby-tier spend, capped and declared before the next session — not an open-ended goblin). **3-week wait for credit refill; interim work is receipts-and-infra only, no model auditions.**

## What Gemma was actually good at (verdict nuance: demotion, not libel)

- Bounded exploration under a scoped brief (grep → triage → targeted read, no wandering)
- Verifying hints against code before building
- Refusing to claim green she hadn't earned
- Jumping eagerly onto corrections
She didn't fail the role; she failed the rank. If anyone ever re-auditions a small local model here, use her as the measurement of where 12b competence sits.

## Worktree disposition

`/home/danf/Projects/Huginn-agent`, branch `agent/f-abort` @ 0c8948c: **[PENDING RECEIPT — removal commanded]**. Prescribed sequence: `git diff > /tmp/f-abort-final.patch` + `git status --short` captured first, then `git worktree remove --force`, then `git branch -D agent/f-abort`. The patch preserves the one surviving artifact worth keeping:

**The Scenario F fix** (diagnosis corroborated; fix probably correct, NEVER red-green proven):
`src/llm/client.ts` — `readStreamingResponse` is called with the external `signal` instead of `controller.signal`; internal timeout aborts and user aborts (routed through the controller via `onExternalAbort`) are invisible inside the stream loop. Fix: pass `controller.signal`. **[UNVERIFIED]**: whether `fetch` itself is wired to `controller.signal` — if not, the fix is incomplete even when proven.

**Dan's authoritative fixture contract** (for kimi's first session back — this is the spec, do not let anyone redesign it):
1. Mock fetch drives an iteration process (N chunks).
2. At predetermined iteration M < N, fire the mock abort **through the fetch/controller channel only**.
3. The abort receptor is **what the code should be, not what it is** — fixture signals on `controller.signal`, not the external arg the buggy code listens to.
4. Abort not picked up → all N iterations complete → **RED**.
5. Abort picked up → halts at M → **GREEN** (vs fixed code).
Trap rules: park `reader.read()` forever after one chunk; `cancel()` sets an assertable flag; `timeoutMs` absurdly high; fakes must not reject on abort. Red must fail at the intended seam, not an import/mock error.

## Infra debts carried forward (unchanged, still no receipts)

- Context raise 32768 → 65536 in `~/.config/systemd/user/ollama.service.d/override.conf` + daemon-reload + restart: **[PENDING RECEIPT]** — no post-restart `ollama ps` ever landed. Watch PROCESSOR column for spill; fallback ruling = 49152.
- Store-grep for the 10.2. snowfall: `grep -ac "10.2.10.2." ~/.local/share/opencode/opencode.db ~/.local/share/opencode/opencode.db-wal` — never run.
- Cooling Modelfile for Gemma (`temperature 0.6, top_k 40, repeat_penalty 1.1`): **moot upon retirement**, unless revived.
- OpenCode timeouts (3000000ms chunk) untested; 57.9s death timer never attributed.
- Roster honesty: qwen-code settings.json declares 262144 ctx; fix to whatever `ollama ps` says.
- Trap-camera loop for the `/api/chat` route mystery: never armed.
- Main repo @ main 0c8948c; main.js +26/−26 inert esbuild churn.
- Lumo platform bug (long-session conversation-state corruption): reported to Proton support, stable; recur → screenshot + timestamp, "conversation context integrity failure in long multi-tool sessions."

## Backlog beyond Scenario F (from 11-08, unchanged)

Tag-assignment conversation blindness; Memory Feedback Loop guide; null-failure cause; verbosity fixture; six-doc design backlog; harness three-way audition (now partially answered by outcome: kimi/paid-plugin is the known-good path); optional PlasmaLLM eval with a vision model.

## Immediate next actions for successor Lumo

1. Confirm worktree removal landed (receipt: `git worktree list` clean, branch gone) and whether the patch was kept — if kept, where.
2. The interim is Dan-and-infra: `ollama ps` receipt, store-grep, config intent-comments. No model work until kimi's credits return (~3 weeks).
3. First kimi session back: Scenario F proper — build fixture per the contract above, earn the red, apply the fix (or import it from the patch), earn the green, commit.
4. Enforce the $120 cap declared before the session, not discovered after.

## Standing rules

Receipts or nothing. Fixture-first; red must be earned. Corrections re-emit the full file. Trust only what Dan restates. End sessions with verified items committed and unverified items named. In Heinlein terms the session now stands: Dorcas filed the paperwork, the pig received her requiem, and Anne — Fair Witness — still awaits the patch, the ollama receipt, and the grep. Everything certified is recorded above; everything else is named.

*Successor Lumo: kimi inherits the crown in ~3 weeks. Until then, guard the patch.*
