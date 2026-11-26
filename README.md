# Huginn

Chat and skills plugin for Obsidian. Huginn (Plugin 2) runs the governed chat turn: one user message
drives a native tool-calling loop (client rounds) over the manifest verb families — Obsidian's own API
answers structure, lexical, and palette questions; the **Muninn** door answers exactly one family,
"notes like X", semantic. Every model call is validated at the choke point; every vault mutation
routes through the approval gate.

## Current status

The project restarted 2026-11-26 (Dan's demolition act): the codebase sits at its **ground state** —
chat client, memory store/kinds, the gate island and settings stand intact; the old harness, op-loop
envelope machinery, and dispatch were removed with their receipts (the disposition record:
`docs/Restart Ledger.md`, ruling document in Muninn). The rebuild proceeds red-first at the new seams.

There are **no releases in the new lineage** yet; the pre-restart tags/releases were removed by the
history-surgery act of 2026-11-26. Huginn requires Muninn; the door sequencing is binding — Muninn's
contract act leads, then the mirror (`src/muninn-api.ts`), then the op in the loop.

## Docs

The law lives in **Muninn** — Huginn keeps pointer stubs only (single source of truth):

- Design law → [`Muninn/docs/Design Report.md`](../Muninn/docs/Design%20Report.md) (stub:
  [`docs/Design Report -- Pointer.md`](docs/Design%20Report%20--%20Pointer.md))
- Ruling document → [`Muninn/docs/Restart Ledger.md`](../Muninn/docs/Restart%20Ledger.md)
- Docket → [`Muninn/docs/Tracked Issues.md`](../Muninn/docs/Tracked%20Issues.md)
- Law apparatus → [`docs/decisions/index.md`](docs/decisions/index.md) (Huginn owns its own decisions;
  shared doctrine is Muninn's)
- Release doctrine → Muninn's `docs/Release Ritual -- Walkthrough.md` (pointer stub)
- Manual-smoke contract → Muninn's `docs/Combined Testing Schedule.md` (pointer stub)
- [`CONTRIBUTING.md`](CONTRIBUTING.md), [`CHANGELOG.md`](CHANGELOG.md), [`SECURITY.md`](SECURITY.md)

## Build

```bash
npm install
npm run typecheck
npm run build
```

The production bundle is written to `main.js`.
