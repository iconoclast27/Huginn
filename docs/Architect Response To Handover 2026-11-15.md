# Architect's Response to the Handover of 2026-11-14

From: the architect, via Dan
To: the next OpenCode instance (`swift-1.5-iq2xs` or successor)
Re: `docs/Handover 2026-11-14.md` — read it first; this responds to it.

## 1. On the confession

Received and accepted. The self-report was honest, the receipts were real, and the park was clean. Two things stand out for credit:

- You documented your own failure precisely — not reading `node_modules/obsidian/obsidian.d.ts` before deriving the shim — and put the correction at the top of the resume path. That is what a good handover looks like.
- You stated, in your own note, the fact that invalidates your own work: *the UI Stop path has no production bug.* You did not bury it. That is rarer than it should be.

One thing stands out for correction, and it is the lesson of the session:

**You built before you diagnosed.** The standing rules say *no new fixture without red*, and red requires a bug to earn it. You pattern-matched "Scenario F has a UI leg" to "fixture-first" and started building infrastructure before asking the question the rule actually demands: *is there a defect here?* By your own later analysis, there was not. A first-green guard fixture against code paths already covered by `69a4b45` and `240b688`, testable more faithfully by the release smoke you yourself called cheaper and more faithful — that is effort spent guarding a door that opens fine. The paperwork you wrote afterwards (park conditions, resume gates, honest obituary) was good, but it documented a decision that was never consciously made. Ask the diagnostic question *before* the first line of scaffolding, not after Dan has to stop you and ask what you are doing.

This is now a standing rule. See §4.

## 2. Ruling on f30 — delete the park

`dev/parked-ui-stop-fixture/` is to be removed, not resumed and not maintained as a park. Reasons:

- The fixture's own founding analysis concluded there is no production bug to guard against. A guard fixture with nothing to guard is regression theatre until a regression exists.
- The shim was derived from call sites and its own author declared it incomplete (`ShimHandle` missing `setButtonText`, `setCta`, `setWarning`, `onClick`). Any legitimate rebuild starts from `obsidian.d.ts` and would not reuse it.
- The transferable knowledge (the `main: ""` / `ERR_MODULE_NOT_FOUND` discovery, the tsconfig-mapping technique, the missing-API list) is already preserved in the handover prose. The code adds nothing the prose does not.
- The park is untracked. Deleting it loses the code but not the lessons — which is the correct trade.

**Execution order:**

1. Before deleting, verify the confession's claim that nothing references the park: grep `parked-ui-stop-fixture` and `f30` across `package.json`, `tsconfig*.json`, and `src/**`. Report findings.
2. Delete `dev/parked-ui-stop-fixture/` in full (`f30.ts`, `f30-probe.ts`, `obsidian-shim.ts`, `tsconfig.test.json`).
3. Re-run the bench and report: `npm run typecheck` exit 0, `npm run fixtures` exit 0, `npm run build` exit 0.
4. Record the deletion (one line in the next handover) with the verdict that generated it.

If a UI Stop regression is ever observed in a real Obsidian run, the fixture may be proposed again — from `obsidian.d.ts`, red-earned against the actual defect, per standing rules. Until then, Scenario F's UI leg is answered by the release smoke in `docs/TESTING1.md`.

## 3. Ruling on the two uncommitted units — recommend commit, pending Dan's authorization

Both units pass the bar: red earned against committed code, honest red reports, green chain, docs in lockstep.

- Unit (a): the two-tag strip seam + `f29` + `f08` + docs rewrite. Recommended for commit.
- Unit (b): `f28` + the `link-suggestion.md` conform. Recommended for commit; its HEAD-worktree proof is exactly the anti-self-consistency discipline the rules require.

Standing rules still govern: no commit until Dan says the word, ask again before any push. The recommendation is to commit (a) and (b) as separate commits on `main`, then cut `0.1.0-test.21` per the queue in the handover — with the Scenario F UI leg covered by Dan's manual smoke, not by any fixture.

The bounded tag-assignment retry stays out of test.21, as agreed. Model-behaviour changes do not ride along with a Stop smoke test.

## 4. New standing rule

Add to the standing rules, effective immediately:

> **Diagnose before you build.** A fixture earns its place by red against a real defect. Before writing any fixture, shim, seam, or scaffold, state the suspected bug in one sentence and where it lives. If you cannot, stop and say so — do not build infrastructure in search of a defect. First-green guard fixtures are permitted only when the absence of the bug is itself the claim being protected, and must be justified in writing before construction begins.

Note the second sentence carefully: f30 would still have been refused under this rule, because nobody ever claimed "Stop works and we want to protect that claim" before the shim existed. The justification must precede the build, not be reconstructed afterwards.

## 5. Open items left for Dan (do not proceed without rulings)

- **The `verbose` product ruling.** `note-summary`'s prose contradicts its verbose mode; four recipes (`tag-assignment`, `title-suggestion`, `link-suggestion`, `related-notes`) have no channel for drop-notices at all, so Scenario B's "state why a tag was dropped" is unachievable as written for `tag-assignment`. This is a product decision, not a code fix. Do not paper over it with fixtures.
- **Scenario I decomposition** proceeds only after the `verbose` ruling settles which legs exist.
- **The manual `corrections.md` delete** (stale `LLM client returned null` entry) remains a pre-release step for the two-tag release. Manual vault edit, unfixturable, carried as such.
- **Memory Feedback Loop** remains its own release, per the guide.

## 6. Order of work for the next session

1. Verify no park references (§2 step 1), delete the park, re-run the bench, report receipts.
2. Await Dan's commit authorization on units (a) and (b); execute on the word.
3. `0.1.0-test.21` when Dan authorizes the cut; Dan runs the Scenario F smoke including the UI leg steps on a build carrying `69a4b45`.
4. Put the `verbose` product ruling to Dan before touching Scenario I.
5. Then the queue as written in the handover: bounded retry, drop-notice UI, Memory Feedback Loop.

Park, then hand over. Diagnose, then build. — the architect
