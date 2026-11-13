# Huginn Smoke Test Scenario v0.1.0-test.20

## Environment

- Obsidian desktop (Linux / Windows / macOS).
- Local Ollama running and reachable at the configured base URL.
- A chat-capable model pulled, e.g. `qwen2.5:14b` or `qwen3.5:4b`.
- Muninn `0.2.0-test.15` (or later) installed and enabled.
- Vault already indexed by Muninn (run **Muninn: Force reindex vault** if unsure).
- Huginn `0.1.0-test.20` installed via BRAT.

## Install Huginn via BRAT

1. Install the BRAT plugin in Obsidian if it is not already installed.
2. Open **Obsidian Settings → Community Plugins → BRAT**.
3. Add a beta plugin with the repository `iconoclast27/Huginn` and the release tag `0.1.0-test.20`.
4. Enable the **Huginn** plugin in Obsidian settings.
5. Reload Obsidian if prompted.
6. Wait for Muninn's initial reindex to complete before testing Huginn.

## Install default Huginn skills

Huginn seeds the vault's `Agents/Huginn/SKILLS/` folder automatically on first run. If the recipes are missing or stale:

1. Open the Obsidian command palette.
2. Run **Huginn: Install default Huginn skills** to create missing recipe files.
3. Run **Huginn: Reset default Huginn skills** to force-overwrite existing recipe files with the bundled versions.

## Configure Huginn

1. Open **Obsidian Settings → Huginn Settings**.
2. Set **Chat model** to a chat-capable model, e.g. `qwen2.5:14b`.
3. Verify **Ollama base URL** matches your local Ollama instance.
4. Verify **Chat timeout (ms)** is reasonable (default `120000`).
5. (Optional) Enable **Warm up chat model on load**.
6. Set **Default target note path** to a note in your vault, e.g. `notes/gamma.md`.

## Place skill recipes

1. Run **Huginn: Install default Huginn skills** from the command palette.
2. Verify the folder `Agents/Huginn/SKILLS/` now contains `tag-assignment.md`, `title-suggestion.md`, `link-suggestion.md`, `task-extraction.md`, `note-summary.md`, and `related-notes.md`.
3. If you previously had old recipe files, run **Huginn: Reset default Huginn skills** to replace them with the bundled versions.

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
6. Wait up to the chat timeout.
7. Inspect the console output for the `recipe result` object.

### Expected results
- [ ] A modal opens with a recipe dropdown and a target path field.
- [ ] Console shows `[Huginn] running recipe: tag-assignment target: <path>`.
- [ ] `schemaValid: true` and `schemaErrors: []`.
- [ ] `parsedOutput.json` contains `tag`, `reason`, and `confidence` fields.
- [ ] `groundTruthValid: true` when the proposed tag is **not** already in the target note's frontmatter `tags`.
- [ ] If the note already has the proposed tag, `groundTruthValid: false` and `groundTruthErrors` explains the conflict using the recipe's rule `description`.
- [ ] When you click **Reject** in the approval modal, you are optionally asked for a reason.
- [ ] `applyResult.applied: false` and `applyResult.message` reflects the rejection reason if you provided one, or `"Rejected by approval gate."` if not.
- [ ] When you click **Approve** in the approval modal, `applyResult.applied: true` and `applyResult.message` indicates the file was modified.
- [ ] The target note's frontmatter now includes the proposed tag under `tags`. If the note had no frontmatter, a new frontmatter block is created through Obsidian's normal frontmatter mechanism.
- [ ] A `refusal` entry is appended to `Agents/Huginn/MEMORY/corrections.md` if you rejected the suggestion.

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

## Scenario D: Chat model warmup

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
- [ ] Closing and reopening the sidebar does **not** restore previous message history; the chat starts fresh.
- [ ] Clicking **Refresh context** re-reads the active note and updates the system context without clearing the conversation history.
- [ ] Switching to a different note updates the active-note context line in the header and preserves the chat transcript.
- [ ] Skill responses (status messages, results, and rejections) remain in the transcript after **Refresh context** or switching notes.
- [ ] Typing a skill request (e.g. `tag this note`) triggers a second `POST /api/chat` dispatch call, then runs the matching skill and shows its result in the chat.
- [ ] Read-only skills (**task-extraction**, **note-summary**, **related-notes**) render their output directly in the chat without opening the approval modal.
- [ ] **note-summary** returns a concise paragraph summary of the active note.
- [ ] **related-notes** returns a bulleted list of up to five existing vault note paths related to the active note.
- [ ] Write-class skills (tag, title, links) still open the existing approval modal; approving applies the change and the chat shows the apply result.
- [ ] **title-suggestion** sets both the first `# ` heading and the `title` frontmatter property, creating frontmatter if necessary.
- [ ] **tag-assignment** adds the proposed tag to frontmatter `tags`, creating frontmatter through Obsidian's normal frontmatter mechanism if necessary.
- [ ] **link-suggestion** appends a `## Related` section with `[[path]]` wikilinks after approval.

## Scenario F: Interrupt an in-flight chat request

### Conditions
- Scenario A passed.
- Ollama is running.

### Steps
1. Open the Huginn chat sidebar.
2. Type a question that takes a noticeable time to answer.
3. Click **Send**, then immediately click **Stop** while the response is loading.

### Expected results
- [ ] The send button changes to **Stop** while the request is in flight.
- [ ] Clicking **Stop** aborts the request.
- [ ] If the request had already opened the approval modal, clicking **Stop** closes the modal and rejects the suggestion.
- [ ] The assistant bubble shows `[Interrupted]` for an aborted skill run, or `[No response from model]` for an aborted plain chat request, not a stale partial response.
- [ ] The button returns to **Send** after abort.
- [ ] Test with a write-class skill (e.g., `tag this note`) as well as with a plain chat question, because the approval modal must also be dismissible by **Stop**.

### Automated guard

- Fixture `src/fixtures/f27.ts` (run by `npm run fixtures`) drives a mock fetch stream of 10 chunks and fires the abort as chunk 3 is delivered, through the fetch/controller channel only. Two legs: **S1** enters at `chat()` (plain chat), **S2** enters at `complete()` with the user signal (what the harness calls for a skill run). The receptor asserted is the signal the client handed to `fetch` — what the code *should* poll. Consuming all 10 chunks without cancelling the reader is a red; halting at chunk 3 with the reader cancelled is a green.
- `reader.read()` parks forever once the queue drains, `timeoutMs` is set absurdly high, and the fakes never reject on abort, so no test double can smuggle the fix and the internal watchdog can never rescue the loop.


## Scenario G: User memory commands

### Conditions
- Scenario A passed.

### Steps
1. Open the Huginn chat sidebar.
2. Type: `Remember that I prefer concise one-sentence answers.` and send.
3. Type: `Remember don't suggest tags that are already in the note.` and send.
4. Type a plain sentence that happens to contain "don't" or "avoid" (e.g., `I don't like long answers.`) and send.
5. Open `Agents/Huginn/MEMORY/user.md`.
6. Ask a plain chat question.

### Expected results
- [ ] The assistant replies confirming the two "Remember" messages were saved.
- [ ] `user.md` contains exactly two append-only YAML frontmatter entries.
- [ ] The message that did not begin with "Remember" was **not** captured as a memory.
- [ ] The chat system prompt for subsequent messages includes the `Things the user has told you` block.
- [ ] The model's later answers respect the stated preferences (at least attempts conciseness).

## Scenario H: Remember chat

### Conditions
- Scenario A passed.
- You have at least one user/assistant exchange in the current chat session.

### Steps
1. Open the Huginn chat sidebar and have a short exchange with the model.
2. Click the **Remember chat** button in the header.
3. Wait for the summary request to complete.
4. Open `Agents/Huginn/MEMORY/chat-summaries.md`.
5. Close and reopen the chat sidebar, then ask a follow-up question.

### Expected results
- [ ] After clicking **Remember chat**, an immediate `Saving chat summary...` message appears so the UI acknowledges the action.
- [ ] The assistant replies `Chat summary saved.` once the summary completes.
- [ ] `chat-summaries.md` contains a new append-only YAML frontmatter entry with the summary.
- [ ] Reopening the chat injects `Summaries of earlier conversations` into the system prompt.
- [ ] The model can refer to the earlier conversation context.
- [ ] The **New chat** button clears the visible transcript while keeping the active-note context.

## Scenario I: Report-back verbosity

### Conditions
- Scenario A passed.
- All six shipped recipes are present.

### Steps
1. Open **Huginn Settings** and set **Report-back verbosity** to `verbose`.
2. In chat, run a read-only skill whose output varies with verbosity: `extract tasks from notes/gamma.md`.
3. Set **Report-back verbosity** to `minimal`.
4. Run the same request again.

### Expected results
- [ ] In `verbose` mode the chat shows a status message like `Running task-extraction on notes/gamma.md...`.
- [ ] In `verbose` mode the returned TODOs include short parenthetical rationales because `task-extraction` receives `verbosity: verbose`.
- [ ] In `minimal` mode the status message is suppressed; only the final result or failure is shown.
- [ ] In `minimal` mode the returned TODOs do not include rationales.

## Scenario J: Corrections after failure

### Conditions
- Scenario A passed.
- `tag-assignment` recipe is present.

### Steps
1. Open a target note and add a likely tag to its frontmatter, e.g. `tags: [ai]`.
2. Run **Huginn: Run Huginn skill**, choose `tag-assignment`, and target that note.
3. When the model proposes `ai`, the result shows `groundTruthValid: false`.
4. Try the same request in chat (e.g., `tag notes/gamma.md`).

### Expected results
- [ ] The recipe result from the command-modal run shows `groundTruthValid: false` because the tag already exists.
- [ ] `groundTruthErrors` includes the recipe's rule `description`: `The proposed tag must not already be in the target note's frontmatter tags: value already present in frontmatter key 'tags'`.
- [ ] `corrections.md` does **not** gain a ground-truth entry; a duplicate tag is vault state, not a model mistake.
- [ ] In chat, when the same request triggers the same ground-truth failure, the assistant explains that the suggestion is already present and that no change is needed.
- [ ] Huginn does **not** retry the failed ground-truth check or loop indefinitely.

## Scenario K: Reset default Huginn skills

### Conditions
- Scenario A passed.
- `Agents/Huginn/SKILLS/` contains at least one recipe file.

### Steps
1. Open `Agents/Huginn/SKILLS/tag-assignment.md` and note its current content.
2. Modify the file in Obsidian (for example, add a stray line at the top).
3. Open the command palette and run **Huginn: Reset default Huginn skills**.
4. Reload the recipe file in Obsidian (or reopen it).

### Expected results
- [ ] A notice appears summarizing the reset: `Huginn default skills: 6 overwritten`.
- [ ] `tag-assignment.md` is restored to the bundled content.
- [ ] `Agents/Huginn/SKILLS/` still contains all six bundled recipes.
- [ ] Running **Huginn: Run Huginn skill** still works without parse errors.

## Known limitations

- v0.1.0-test.20 applies write-class suggestions for **tag-assignment**, **title-suggestion**, and **link-suggestion** after approval. **task-extraction**, **note-summary**, and **related-notes** are read-only and return inline in chat.
- Ground-truth validation ships with six built-in primitives (`file-exists`, `file-not-exists`, `frontmatter-contains`, `frontmatter-not-contains`, `note-contains-text`, `note-not-contains-text`) and can be extended by registering new primitives. Recipe `description` fields are surfaced in ground-truth error messages and, for passing checks, in the approval modal under **Checks passed**.
- Title suggestion sets or replaces the first `# ` heading in the note body and also sets the `title` frontmatter property; it does not rename the file.
- Link suggestion appends a `## Related` section with `[[path]]` wikilinks (`.md` stripped).
- Chat uses **active-note context only** for plain chat responses. Skill dispatch sends a separate dispatch request to decide which recipe to run; the recipe itself then gathers its own inputs.
- The warmup toggle triggers on Huginn initialization, not on UI focus or keystrokes.
- Huginn watches `Agents/Huginn/SKILLS/` for recipe file changes; if you replace a recipe, the new version is loaded without reloading Obsidian.
- Chat now streams the Ollama `/api/chat` response, so the **Stop** button can interrupt an in-flight generation promptly.
- Chat **New chat** clears the visible transcript while preserving the active-note system context.
- Ground-truth failures (e.g., a tag already exists) are reported as information, not retried, and are not written to corrections memory.

## What to capture when reporting results

For each scenario, include:
- Obsidian version and OS.
- Muninn version.
- Huginn version from the release.
- Chat model name.
- The exact console output for any failed scenario.
- Whether the recipe files were present at `Agents/Huginn/SKILLS/`.
- Whether `Agents/Huginn/MEMORY/` was created automatically and contains expected entries.
