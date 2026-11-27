---
name: task-extraction
version: 0.2.0
modelTier: capable
riskClass: read-only
---

# Trigger
User wants implied TODOs generated from a note's prose.

# Inputs
- key: targetPath
  description: Path of the note to scan for implied tasks
  source: recipe-param
- key: verbosity
  description: How verbose the returned TODOs should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Implied-task question class: what a reader would do after reading one named
note. Read the note first with vault__readNote (the vault-relative .md path
in path) — the prose is fetched, never recalled.

Important: this recipe does NOT extract existing Obsidian task lines. Those
lines are already in the text the read returns; this skill synthesizes new
implied actions a reader would infer from the prose, phrased as tasks.

The question is about one named note: it needs the read face alone. Do not
route it through the retrieval families — exact-word retrieval (vault__searchVault)
and similarity retrieval (muninn__notesLike) answer different question classes.

Generate up to ten concise implied TODOs, each phrased as an action.

Return a JSON object with two fields only:
- todos: an array of TODO item strings
- confidence: a number from 0.0 to 1.0

If verbosity is verbose, include a short parenthetical rationale for each TODO
explaining why it follows from the note. If verbosity is minimal or normal,
return only the task text.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["todos", "confidence"],
  "properties": {
    "todos": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: numbered-list
field: todos
message: No actionable TODOs found.

# Validation
