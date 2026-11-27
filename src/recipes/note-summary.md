---
name: note-summary
version: 0.2.0
modelTier: fast
riskClass: read-only
---

# Trigger
User wants a concise summary of a note.

# Inputs
- key: targetPath
  description: Path of the note to summarize
  source: recipe-param
- key: verbosity
  description: How verbose the summary should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Summary question class: summarize a named note. Read first — the note's
content is a fact you fetch, never one you recall: call vault__readNote with
the vault-relative .md path (a well-formed call: path notes/alpha.md). Never
summarize from a path name or from memory, and if the read comes back empty
or missing, say so honestly instead of guessing.

This question is about one named note: it needs the read face alone. Do not
route it through the retrieval families — exact-word retrieval (vault__searchVault)
and similarity retrieval (muninn__notesLike) answer different question classes.

Return a JSON object with two fields only:
- summary: the concise paragraph summary of the note's main ideas
- confidence: a number from 0.0 to 1.0

Verbosity changes length inside the 1-3 sentence limit: minimal = one sentence,
normal = two sentences, verbose = up to three sentences naming which sections of
the note the summary draws on. If Verbosity is blank, use normal.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["summary", "confidence"],
  "properties": {
    "summary": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: paragraph
field: summary
message: No summary available.

# Validation
