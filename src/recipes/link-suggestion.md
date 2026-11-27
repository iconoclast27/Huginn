---
name: link-suggestion
version: 0.2.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants wikilink suggestions to insert into a note.

# Inputs
- key: targetPath
  description: Path of the note receiving links
  source: recipe-param
- key: verbosity
  description: How verbose the reason field should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Link question class: which existing notes a note should link to. Ground
suggestions on evidence, not vibes: read the note with vault__readNote and
its current outgoing links with vault__links on the same vault-relative .md
path — never re-suggest a link the note already has.

Find candidate mentions with the lexical family: vault__searchVault answers
whether other notes mention a title, exactly and cheaply. Never confuse the
families: muninn__notesLike results are a similarity match, not a lexical hit
— similarity can name a theme, but a link needs evidence the note actually
mentions the other note, so do not suggest a link on similarity alone.

This skill proposes only: inserting links is a gated write, so make no write
call here; the proposal rides the apply machinery after approval.

Return a JSON object with these fields:
- links: an array of vault paths to link to, e.g. ["notes/alpha.md", "notes/beta.md"]
- reason: a sentence saying why each linked note is related — include it only in verbose mode
- confidence: a number from 0.0 to 1.0

Verbosity changes only the prose field: in verbose mode, add the reason field
(one sentence saying why each linked note fits the target); in minimal and
normal modes, return links and confidence only. If Verbosity is blank, use
normal. The links suggested are not changed by verbosity.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["links", "confidence"],
  "properties": {
    "links": {
      "type": "array",
      "items": { "type": "string" }
    },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-section

# Apply Params
{
  "valuePath": "links",
  "heading": "Related",
  "itemTemplate": "- [[{{value}}]]"
}

# Validation
