# Huginn Smoke Test Scenario v0.1.0-test.1

## Environment

- Obsidian desktop (Linux / Windows / macOS).
- Local Ollama running and reachable at the configured base URL.
- A chat-capable model pulled, e.g. `qwen3.5:4b`.
- Muninn `0.2.0-test.14` (or later) installed and enabled.
- Vault already indexed by Muninn (run **Muninn: Force reindex vault** if unsure).

## Install Huginn via BRAT

1. Install the BRAT plugin in Obsidian if it is not already installed.
2. Open **Obsidian Settings → Community Plugins → BRAT**.
3. Add a beta plugin with the repository `iconoclast27/Huginn` and the release tag `0.1.0-test.1`.
4. Enable the **Huginn** plugin in Obsidian settings.
5. Reload Obsidian if prompted.

## Configure Huginn

1. Open **Obsidian Settings → Huginn Settings**.
2. Set **Chat model** to a chat-capable model, e.g. `qwen3.5:4b`.
3. Verify **Ollama base URL** matches your local Ollama instance.
4. Verify **Chat timeout (ms)** is reasonable (default `60000`).

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
2. Run **Huginn: Run Huginn test recipe**.
3. Wait up to the chat timeout (default 60 seconds).
4. Inspect the console output for the `recipe result` object.

### Expected results
- [ ] Console shows `[Huginn] running test recipe: tag-assignment`.
- [ ] `schemaValid: true` and `schemaErrors: []`.
- [ ] `parsedOutput.json` contains `tag`, `reason`, and `confidence` fields.
- [ ] `applyResult.applied: false`.
- [ ] `applyResult.message` contains `"Rejected by approval gate."`.
- [ ] No vault file was modified.

## Scenario C: Missing Muninn produces a user-facing notice

### Conditions
- Huginn is enabled.
- Muninn is disabled or not installed.

### Steps
1. Disable the Muninn plugin.
2. Reload Obsidian.
3. Run **Huginn: Run Huginn test recipe**.

### Expected results
- [ ] A notice appears: `Huginn requires Muninn to be installed and enabled.`
- [ ] Console shows `[Huginn] Muninn plugin not found...`.

## Known limitations

- v0.1.0-test.1 is read-only: the skill returns a suggestion but never writes to a note.
- The test recipe uses a hard-coded `targetPath` of `notes/gamma.md`; if that note does not exist the harness still runs but the gathered related chunks may be empty.
- Ground-truth validation is wired into the result shape but always passes in this build.

## What to capture when reporting results

For each scenario, include:
- Obsidian version and OS.
- Muninn version.
- Huginn version from the release.
- Chat model name.
- The exact console output for any failed scenario.
- Whether the recipe file was present at `Agents/Huginn/SKILLS/tag-assignment.md`.
