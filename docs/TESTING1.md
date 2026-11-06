# Huginn Smoke Test Scenario v0.1.0-test.3

## Environment

- Obsidian desktop (Linux / Windows / macOS).
- Local Ollama running and reachable at the configured base URL.
- A chat-capable model pulled, e.g. `qwen3.5:4b`.
- Muninn `0.2.0-test.15` (or later) installed and enabled.
- Vault already indexed by Muninn (run **Muninn: Force reindex vault** if unsure).
- Huginn `0.1.0-test.3` (or later) installed via BRAT.

## Install Huginn via BRAT

1. Install the BRAT plugin in Obsidian if it is not already installed.
2. Open **Obsidian Settings → Community Plugins → BRAT**.
3. Add a beta plugin with the repository `iconoclast27/Huginn` and the release tag `0.1.0-test.3`.
4. Enable the **Huginn** plugin in Obsidian settings.
5. Reload Obsidian if prompted.
6. Wait for Muninn's initial reindex to complete before testing Huginn.

## Configure Huginn

1. Open **Obsidian Settings → Huginn Settings**.
2. Set **Chat model** to a chat-capable model, e.g. `qwen3.5:4b`.
3. Verify **Ollama base URL** matches your local Ollama instance.
4. Verify **Chat timeout (ms)** is reasonable (default `60000`).
5. (Optional) Enable **Warm up chat model on load**.
6. Set **Default target note path** to a note in your vault, e.g. `notes/gamma.md`.

## Place a skill recipe

1. In the vault, create the folder `Agents/Huginn/SKILLS/` if it does not exist.
2. Create `Agents/Huginn/SKILLS/tag-assignment.md` with the recipe content from `src/recipes/tag-assignment.md` in this repo.
3. Reload Obsidian so the vault index picks up the new file.

## Scenario A: Huginn harness discovers Muninn

### Conditions
- Muninn is enabled.
- Huginn just loaded.

### Steps
1. Open Obsidian developer console.
2. Reload Obsidian.
3. Wait for Muninn to finish its initial reindex (console shows `[Muninn] initial walk complete`).
4. Look for the Huginn log line:
   ```
   [Huginn] harness initialized against Muninn API
   ```

### Expected results
- [ ] `[Huginn] harness initialized against Muninn API` appears in the console.
- [ ] No `[Huginn] Muninn plugin not found...` warning appears.

## Scenario B: Run the tag-assignment test recipe

### Conditions
- Scenario A passed.
- `Agents/Huginn/SKILLS/tag-assignment.md` exists and is parsable.
- Ollama has the configured chat model available.

### Steps
1. Open the Obsidian command palette.
2. Run **Huginn: Run Huginn skill**.
3. In the modal, select the **tag-assignment** recipe.
4. Enter a target note path that exists in your vault, e.g. `notes/gamma.md`.
5. Click **Run**.
6. Wait up to the chat timeout (default 60 seconds).
7. Inspect the console output for the `recipe result` object.

### Expected results
- [ ] A modal opens with a recipe dropdown and a target path field.
- [ ] Console shows `[Huginn] running recipe: tag-assignment target: <path>`.
- [ ] `schemaValid: true` and `schemaErrors: []`.
- [ ] `parsedOutput.json` contains `tag`, `reason`, and `confidence` fields.
- [ ] `groundTruthValid: true` when the proposed tag is **not** already in the target note's frontmatter `tags`.
- [ ] If the note already has the proposed tag, `groundTruthValid: false` and `groundTruthErrors` explains the conflict.
- [ ] `applyResult.applied: false`.
- [ ] When you click **Reject** in the approval modal, `applyResult.message` contains `"Rejected by approval gate."`.
- [ ] When you click **Approve** in the approval modal, `applyResult.message` indicates the suggestion was approved but write-class apply is still deferred.
- [ ] No vault file was modified.

## Scenario C: Missing Muninn produces a user-facing notice

### Conditions
- Huginn is enabled.
- Muninn is disabled or not installed.

### Steps
1. Disable the Muninn plugin.
2. Reload Obsidian.
3. Run **Huginn: Run Huginn skill**.

### Expected results
- [ ] A notice appears: `Huginn requires Muninn to be installed and enabled.` shortly after reload.
- [ ] Console shows at most one warning after the 30 s timeout, e.g. `[Huginn] Muninn did not become ready within 30s. Is it installed and enabled?`.
- [ ] No flood of identical `[Huginn] Muninn plugin not found...` warnings.

## Scenario D — Chat model warmup

### Conditions
- Scenario A passed.
- **Warm up chat model on load** is enabled in Huginn settings.
- Ollama is running.

### Steps
1. Reload Obsidian.
2. Wait for Muninn's initial reindex to complete.
3. Watch the console for Huginn initialization.

### Expected results
- [ ] `[Huginn] harness initialized against Muninn API` appears.
- [ ] `[Huginn] warming up chat model...` appears.
- [ ] A `POST /api/chat` request is sent.
- [ ] `[Huginn] chat model warmup complete` appears (or a warning if Ollama is unreachable).

## Known limitations

- v0.1.0-test.3 is read-only: the skill returns a suggestion but never writes to a note.
- Ground-truth validation currently checks only whether the proposed tag is already present in the target note's frontmatter `tags`.
- The approval modal appears after schema and ground-truth validation pass; approval does not yet cause a vault write.
- The warmup toggle triggers on Huginn initialization, not on UI focus or keystrokes.

## What to capture when reporting results

For each scenario, include:
- Obsidian version and OS.
- Muninn version.
- Huginn version from the release.
- Chat model name.
- The exact console output for any failed scenario.
- Whether the recipe file was present at `Agents/Huginn/SKILLS/tag-assignment.md`.
