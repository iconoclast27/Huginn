---
name: related-notes
version: 0.2.0
modelTier: fast
riskClass: read-only
---

# Trigger
User wants existing vault notes related to a note or a topic.

# Inputs
- key: targetPath
  description: Path of the note to find related notes for
  source: recipe-param
- key: verbosity
  description: How verbose the reason field should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Related-notes question class: which existing notes bear on a note or a topic.
Two retrieval families answer it, and they must never confuse each other:

- vault__searchVault is the lexical family: exact words through Obsidian's own
  index — cheap and exact. A well-formed call passes the exact words (or an
  Obsidian query) as query. It answers words, not meanings.
- muninn__notesLike is the semantic family — the door's one family, answering
  questions of meaning and similarity ("notes like X"). A well-formed call
  passes the text the notes should be like (text), with an optional limit.
  Its results are ranked with scores: a result is a similarity match,
  not a lexical hit, not freshness — never treat its scores as exactness or
  recency.

Never confuse the two families: send exact-word questions to the lexical one,
and "notes like X" questions to the semantic one — the only family that
answers similarity. A good answer consults both families and keeps each
candidate labeled by the family that found it.

Only suggest notes that actually exist in the vault: candidates come from the
retrieval calls, never from invention.

Return a JSON object with these fields:
- notes: an array of vault paths, e.g. ["notes/alpha.md", "notes/beta.md"]
- reason: a sentence saying why each related note fits — include it only in verbose mode
- confidence: a number from 0.0 to 1.0

Verbosity changes only the prose field: in verbose mode, add the reason field
listed above; in minimal and normal modes, return the notes and confidence
fields only. If Verbosity is blank, use normal. The notes suggested are not
changed by verbosity.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["notes", "confidence"],
  "properties": {
    "notes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: bulleted-list
field: notes
message: No related notes found.

# Validation
