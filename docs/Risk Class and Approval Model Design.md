# Huginn — Risk Class and Approval Model Design

**Status:** design for post-`0.1.0-test.18`  
**Scope:** how `riskClass` in a recipe maps to harness behavior around the approval gate, and how users can override or batch-approve suggestions.

## Current state

Recipes declare a `riskClass` in metadata:

- `read-only` — no vault mutation; skip approval and apply.
- `suggest` — may mutate the vault; always open the approval modal before applying.

In `0.1.0-test.18` the distinction is only:

- `read-only` recipes use `Apply Method: noop` and skip the gate.
- `suggest` recipes always call `ObsidianApprovalGate.approve()`.

The approval modal always shows the full diff and asks for a one-off Approve/Reject decision. Rejection reasons are written to corrections memory as `refusal` entries.

## Goals

1. Make risk class a real policy knob, not just a metadata label.
2. Reduce friction for low-risk, high-confidence suggestions without removing human oversight.
3. Support batched suggestions from a single recipe (e.g., multi-tag apply, multiple related links).
4. Keep the model at arm’s length: the harness decides *when* to ask, the user decides *whether* to allow.
5. Preserve the existing single-suggestion flow as the conservative default.

## Proposed risk classes

| Class | Meaning | Approval behavior | Example recipes |
|-------|---------|-------------------|-----------------|
| `read-only` | No vault mutation. | No approval, no apply. | `task-extraction`, `note-summary`, `related-notes` |
| `suggest` | Single discrete mutation, irreversible or annoying to undo. | Always show approval modal. | `tag-assignment`, `title-suggestion`, `link-suggestion` |
| `batch-suggest` | Multiple related mutations that should be reviewed together. | Show batch approval modal with checkable list. | future multi-tag assignment, bulk-link insertion |
| `auto-apply` | Low-risk, idempotent, easily reversible change. | Apply inline, show compact notice/diff; user can undo via Obsidian. | future alias/normalization fixes, low-confidence link insertion behind a setting |

### Why not more classes?

- `read-only` and `suggest` already exist and map cleanly to current behavior.
- `batch-suggest` and `auto-apply` are new. They are intentionally conservative: the model never auto-applies anything unless the recipe explicitly opts in and the user has enabled the behavior.

## Approval policy knobs

### 1. Recipe-level `riskClass`

Recipes declare their default class. The harness uses it to choose an approval strategy.

```yaml
---
name: tag-assignment
version: 0.1.0
modelTier: fast
riskClass: suggest
---
```

### 2. User setting: global approval policy

A new Huginn setting, **Approval policy**, lets the user shift the default behavior:

- `strict` — every `suggest` and `batch-suggest` recipe opens the modal. `auto-apply` recipes are downgraded to `suggest`. This is the conservative default.
- `normal` — `suggest` opens the modal; `batch-suggest` opens the modal; `auto-apply` applies inline.
- `lenient` — `suggest` still opens the modal (no silent writes); `batch-suggest` opens the modal; `auto-apply` applies inline. (Same as `normal` for `suggest`, present for future expansion.)

Important: no policy level allows a `suggest` recipe to bypass the modal. The setting only affects `auto-apply` recipes and prevents accidental downgrades.

### 3. Recipe-level `autoApplyConfidence` (optional)

For `auto-apply` recipes only, a metadata threshold below which the recipe is treated as `suggest`:

```yaml
---
name: alias-cleanup
version: 0.1.0
modelTier: fast
riskClass: auto-apply
autoApplyConfidence: 0.85
---
```

If the model returns `confidence < 0.85`, the harness falls back to the `suggest` approval flow. This lets recipes declare their own uncertainty boundary.

## Approval strategies in detail

### Single-suggestion (`suggest`)

This is the existing flow and remains the default for any recipe that mutates a single value.

1. Run recipe.
2. Schema + ground-truth validate.
3. Compute diff.
4. Open `ApprovalModal` with Approve / Reject + reason.
5. If approved, run apply routine; otherwise write `refusal` correction.

### Batch-suggestion (`batch-suggest`)

A recipe returns a list of proposed changes. The harness computes a diff per item and opens a batch modal:

- Modal shows a checklist of proposed changes.
- User can select all, none, or individual items.
- Approve applies only selected items.
- Reject (with optional reason) records a `refusal` correction for the recipe as a whole.
- Each selected item runs its apply routine independently; failures are recorded per item.

Apply primitives that support batch output:

- `append-frontmatter-array` already accepts an array of values (F20).
- A future `append-section` variant can accept multiple items.

The batch modal reuses the existing `ApprovalModal` infrastructure but renders a list instead of a single diff block.

### Auto-apply (`auto-apply`)

Applies inline without a modal, then shows a compact notice:

- Notice text: `Huginn applied <recipe> to <path>: <applyResult.message>`.
- A command / button lets the user open a diff viewer after the fact.
- If apply fails, show a notice and write an `apply-failed` correction.
- If ground-truth fails, show the existing "already present" chat message; no correction.

This class is gated behind:

- Recipe declares `riskClass: auto-apply`.
- User setting `approvalPolicy` is `normal` or `lenient`.
- Optional `autoApplyConfidence` threshold is met.

## Confidence handling

Confidence is an output field declared by the recipe schema. The harness reads it as a number in `[0, 1]`. Missing confidence is treated as `0` for policy decisions.

Policy decision table:

| riskClass | policy | confidence | behavior |
|-----------|--------|------------|----------|
| read-only | any | any | no approval, no apply |
| suggest | any | any | always modal |
| batch-suggest | any | any | always batch modal |
| auto-apply | strict | any | downgrade to suggest (modal) |
| auto-apply | normal/lenient | ≥ threshold | auto-apply |
| auto-apply | normal/lenient | < threshold | downgrade to suggest (modal) |

## Rejection and corrections

- Single/batch rejection with a reason → `refusal` correction.
- Single/batch rejection without a reason → generic `refusal` correction.
- Auto-apply does not generate refusals because there is no rejection step. If the user undoes the change in Obsidian, that is not automatically fed back.
- Apply failures in any class → `apply-failed` correction.
- Schema failures in any class → `schema-error` correction.
- Ground-truth failures in any class → no correction; reported as vault state.

## Diff rendering by risk class

- `read-only`: no diff.
- `suggest`: full unified-style diff in modal.
- `batch-suggest`: per-item compact diff with a checkbox.
- `auto-apply`: compact one-line notice; optional post-hoc diff viewer.

## Settings changes

Add to `HuginnSettings`:

```typescript
export type ApprovalPolicy = 'strict' | 'normal' | 'lenient';

export interface HuginnSettings {
    // ... existing fields
    approvalPolicy: ApprovalPolicy;
}
```

Default: `strict`.

UI placement in `HuginnSettingTab`: directly below **Report-back verbosity**.

## Migration and compatibility

- Existing recipes with `riskClass: suggest` keep the exact same behavior under all policies.
- Existing recipes with `riskClass: read-only` keep the exact same behavior.
- New `batch-suggest` and `auto-apply` classes are opt-in by recipe authors; no existing recipe changes class.
- No changes to the `ApprovalGate` interface shape for `suggest`. `batch-suggest` and `auto-apply` are handled by the harness choosing a different gate/modal path.

## Open questions

1. Should `auto-apply` support an undo window (e.g., a transient undo button in the notice)?
2. Should batch rejection allow per-item reasons, or only one reason per batch?
3. Should the user be able to pin a specific recipe to always/never auto-apply, overriding the global policy?
4. How should batch apply handle partial failures (some items apply, some fail)?
5. Do we need a `preview` mode where `auto-apply` shows a diff but applies automatically after a short delay?
6. Should `riskClass` be derived from `Apply Method` for recipes that do not declare it explicitly?

## Recommended next step

Land this design as a `docs/` file and do not implement the new classes until the `0.1.0-test.18` smoke test is complete. The first implementation after smoke-test approval should be the setting plumbing and the `ApprovalPolicy` enum, with no behavioral change for existing `suggest` recipes. `batch-suggest` and `auto-apply` should each get their own follow-up design + fixture set before code is merged.
