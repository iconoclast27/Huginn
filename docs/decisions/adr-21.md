# ADR-21: Model roster — qwen closed, Gemma4:12b retired, kimi is the known-good path with a declared cap; chat transcripts are not receipts

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** Dan, 2026-11-08/11-10/11-13 (roster), Dan, 2026-11-16 (chat-reading rule, measured store facts).

## Context

Three model experiments ran between 2026-11-07 and 2026-11-10: a qwen-code relay as implementer, the
Gemma4:12b run on Scenario F, and context-window tuning. All three closed with the same class of
failure, and the project recorded them as model-layer business, not project work.

## Decision

- **qwen is closed.** Evidence of record: `qwen2.5-coder:7b` "declared victory without doing the work
  ('Mission Accomplished')"; `qwen3.5:9b-32k` "best behaved … but died repeatedly: context starvation as
  agent, then commit-substitute-for-action, then terminal dithering/timeout during the harness edit;
  her partial rewrite corrupted `harness.ts` (restored via `git checkout`). Right diagnosis, wrong
  anatomy, insufficient stamina."
- **Gemma4:12b is retired** — executive-function death: she restated the test contract verbatim and
  failed to run the fixture. "No red receipt, no green receipt, no `git diff --stat` was ever produced."
- **kimi (paid plugin) is the known-good path**, inheriting in ~3 weeks, ~$120 declared cap. Model
  auditions are paused; the interim is Dan-and-infra only.
- **Reading Gemma4:12b's chats is out of bounds.** **Reading Qwen3.5:12b's chats is permitted**
  (Dan, 2026-11-16): "not prohibited. I just don't think they contribute anything. They are full of agent
  paralysis, intention-action failures, and a sad case of not being able to output simple files."
- Model-layer business is not project work: record the ruling, do not build it.

## Consequences

- **The transcripts are not recoverable, so the closure rests on the committed narratives.** Measured
  store: `select model, count(*) from session_v2 group by model` → swift 9, `gemma4:12b` 3,
  `qwen3.8:27b` 1; **no `qwen3.5` in the `model` column**; history begins 2026-11-10 13:38 — after the
  audition window; `session_part`, `event`, `blob` all 0 rows, so assistant-side text is unrecoverable.
  The store's only qwen session is `ses_e3a0460f6ffec50tlCDzuif573` (`qwen3.8:27b`, 2026-11-10 15:02–15:08,
  7 messages, 4 assistant turns with empty `$.text`).
- **Ghost correction:** the two Muninn files I first cited as verdict sources —
  `docs/qwen3.5:12b (audition closed).md` and `docs/LLM Roster 2026-11-03.md` — **do not exist**
  (docket T23; Muninn measurement: `git grep -in "12b" HEAD` → 0 hits). `qwen3.5:12b` appears in
  tracked text only as the worktree-removal attribution in `Handover 2026-11-10 Scenario F.md:94` and
  `Handover 2026-11-13.md:52`.
- Archive material: `docs/Never Try To Teach A Pig To Sing.md` (ruling 9) and the roster paragraphs in
  the handovers. `docs/Standing Qwen prompt.txt` is Muninn's archive target; the seven executor rules
  survive in Muninn's conventions doc (Muninn ADR-21).

## Sources

`docs/HANDOVER - 2026-11-08.md:40-41` (first commit 2026-11-08);
`docs/Never Try To Teach A Pig To Sing.md` (65 lines, first commit 2026-11-13 via `ec81989`, internal
date 2026-11-10 evening); `docs/Handover 2026-11-13.md:41, 52, 55, 56, 126`;
`docs/Handover 2026-11-10 Scenario F.md:94, 97, 99`; `/tmp/opencode/rationalisation/rulings-2026-11-16.md`
ruling 9; `/tmp/opencode/rationalisation/docket-2026-11-16.md` T22, T23.

**Cross-references:** Muninn ADR-21 (staffing + executor contract), ADR-20, ADR-32, ADR-36.
