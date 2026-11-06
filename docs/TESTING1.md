# Huginn Smoke Test Scenario v0.1.0-test.10

## Environment

- Obsidian desktop (Linux / Windows / macOS).
- Local Ollama running and reachable at the configured base URL.
- A chat-capable model pulled, e.g. `qwen3.5:4b`.
- Muninn `0.2.0-test.15` (or later) installed and enabled.
- Vault already indexed by Muninn (run **Muninn: Force reindex vault** if unsure).
- Huginn `0.1.0-test.10` (or later) installed via BRAT.

## Install Huginn via BRAT

1. Install the BRAT plugin in Obsidian if it is not already installed.
2. Open **Obsidian Settings → Community Plugins → BRAT**.
3. Add a beta plugin with the repository `iconoclast27/Huginn` and the release tag `0.1.0-test.10`.
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
- [ ] When you click **Reject** in the approval modal, `applyResult.applied: false` and `applyResult.message` contains `"Rejected by approval gate."`.
- [ ] When you click **Approve** in the approval modal, `applyResult.applied: true` and `applyResult.message` indicates the file was modified.
- [ ] The target note's frontmatter now includes the proposed tag under `tags`. If the note had no frontmatter, a new frontmatter block is created through Obsidian's normal frontmatter mechanism.

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

## Scenario E: Open Huginn chat with active-note context

### Conditions
- Scenario A passed.
- A markdown note is open in the active editor.
- Ollama has the configured chat model available.

### Steps
1. Open any note in the vault, e.g. `notes/gamma.md`.
2. Click the **message-square** Huginn ribbon icon, or open the command palette and run **Huginn: Open Huginn chat**.
3. Wait for the **Huginn Chat** sidebar view to open (usually in the right sidebar).
4. Type a question about the active note, e.g. `Summarize this note in one sentence.`.
5. Press **Enter** (or click **Send**).
6. Wait for the model response to appear.
7. Close the sidebar, then reopen it via the ribbon icon or command.

### Expected results
- [ ] The **Huginn Chat** sidebar view opens and shows the active note path in the header.
- [ ] The input area accepts text; **Shift+Enter** inserts a newline while **Enter** sends.
- [ ] Chat message text can be selected and copied with the normal mouse/keyboard selection.
- [ ] Console shows a `POST /api/chat` request with a `system` message containing the active note body.
- [ ] A `user` bubble appears with the typed question.
- [ ] An `assistant` bubble appears with a model response.
- [ ] Closing and reopening the sidebar restores the previous message history.
- [ ] Clicking **Refresh context** re-reads the active note and starts a new system-message session.
- [ ] Typing a skill request (e.g. `tag this note`) triggers a second `POST /api/chat` dispatch call, then runs the matching skill and shows its result in the chat.
- [ ] Read-only skills (**summary-generation**, **task-extraction**) return their result directly in the chat without opening the approval modal.
- [ ] Write-class skills (tag, title, links) still open the existing approval modal; approving applies the change and the chat shows the apply result.
- [ ] **title-suggestion** sets both the first `# ` heading and the `title` frontmatter property, creating frontmatter if necessary.
- [ ] **tag-assignment** adds the proposed tag to frontmatter `tags`, creating frontmatter through Obsidian's normal frontmatter mechanism if necessary.

## Known limitations

- v0.1.0-test.10 applies write-class suggestions for **tag-assignment**, **title-suggestion**, and **link-suggestion** after approval. **summary-generation** and **task-extraction** are read-only and return inline in chat.
- Ground-truth validation currently checks only whether the proposed tag is already present in the target note's frontmatter `tags`.
- Title suggestion sets or replaces the first `# ` heading in the note body and also sets the `title` frontmatter property; it does not rename the file.
- Link suggestion appends a `## Related` section with `[[path]]` wikilinks (`.md` stripped).
- Chat uses **active-note context only** for plain chat responses. Skill dispatch sends a separate dispatch request to decide which recipe to run; the recipe itself then gathers its own inputs.
- The warmup toggle triggers on Huginn initialization, not on UI focus or keystrokes.

## What to capture when reporting results

For each scenario, include:
- Obsidian version and OS.
- Muninn version.
- Huginn version from the release.
- Chat model name.
- The exact console output for any failed scenario.
- Whether the recipe file was present at `Agents/Huginn/SKILLS/tag-assignment.md`.
