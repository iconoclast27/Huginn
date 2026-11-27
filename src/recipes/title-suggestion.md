---
name: title-suggestion
version: 0.2.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants a better title for a note.

# Inputs
- key: targetPath
  description: Path of the note to title better
  source: recipe-param
- key: verbosity
  description: How verbose the reason sentence should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Title question class: one better title for one named note. Read the note
itself with vault__readNote, and its siblings with vault__listFolder on the
containing folder path — a good title fits the sibling naming style, and both
sides of that evidence come from the read face, never from recall.

A rename is a gated write and its addressed shape is the pair the model names
itself: vault__rename carries path (the existing note) and newPath (the new
vault-relative .md path). This skill proposes the title only: never claim a
move happened, and issue no write call here.

Propose exactly one better title: concise, descriptive, normal file-title
casing, without the file extension.

Return a JSON object with three fields only:
- title: the proposed title string (without file extension)
- reason: one sentence explaining the choice
- confidence: a number from 0.0 to 1.0

Verbosity changes only the reason sentence: minimal = a short clause, normal =
one plain sentence, verbose = one fuller sentence saying what makes the
proposed title better than the current one. If Verbosity is blank, use normal.
The title proposed is not changed by verbosity.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["title", "reason", "confidence"],
  "properties": {
    "title": { "type": "string" },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
set-first-heading

# Apply Params
{
  "valuePath": "title"
}

# Validation
