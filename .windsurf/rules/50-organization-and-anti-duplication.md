---
trigger: always_on
---

# Rules organization and anti-duplication

## Scope

This rule applies to all Windsurf rules, AGENTS.md files, and workflows in the maintenance-app project.

## Anti-duplication principles

### 1. Single source of truth

- Each concept should be defined in ONE location only
- Other files should reference the authoritative source rather than duplicate content
- Use cross-references like "See `path/to/file.md` for detailed guidance"

### 2. Location hierarchy (most specific to most general)

**AGENTS.md files (directory-scoped):**

- Use for guidance specific to that directory's purpose
- Keep concise and focused on directory-specific concerns
- Reference higher-level rules for general guidance

**Windsurf rules (.windsurf/rules/):**

- Use for cross-cutting concerns that span multiple directories
- Use for complex guidance that needs activation modes (glob, model decision, etc.)
- Prefer specific, focused rules over broad, generic ones

**Workflows (.windsurf/workflows/):**

- Use only for multi-step procedural instructions
- Name with clear purpose: `verb-noun.md` format
- Include turbo annotations for auto-runnable steps

### 3. Content guidelines

**Avoid duplication:**

- Before adding guidance, search existing files for similar content
- If similar content exists, enhance the existing file instead of creating new content
- Use references rather than repeating the same information

**Keep it concise:**

- Use bullet points over paragraphs
- Focus on actionable guidance, not explanations
- Prefer "Do X" over "You should do X because..."

**Best location test:**

- Is this guidance specific to one directory? → Use that directory's AGENTS.md
- Does this span multiple directories? → Use .windsurf/rules/
- Is this a multi-step procedure? → Use .windsurf/workflows/
- Is this general project guidance? → Use root AGENTS.md

### 4. Review checklist before adding new guidance

- [ ] Search existing files for similar/duplicate content
- [ ] Verify this is the most specific appropriate location
- [ ] Check if existing guidance can be enhanced instead
- [ ] Ensure content is concise and actionable
- [ ] Add cross-references if related content exists elsewhere

### 5. Maintenance

- When updating guidance, update the single source of truth
- Remove outdated references when consolidating content
- Periodically review for duplication creep during project maintenance
