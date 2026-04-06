# TASK: Content & Knowledge Expansion — Batch A

**Status**: in-progress
**Created**: 2026-04-06
**Priority**: P0

## Goal
Improve LaudBot's conversation quality by (1) fixing repetitive answers in long chats,
(2) adding resource hyperlinks for mentioned projects, and (3) enriching the knowledge base
with more depth on LaudBot's build story, the agentic coding system, and Laud's background.

## Acceptance criteria
- [ ] System prompt includes anti-repetition + build-on-context directive
- [ ] System prompt includes resource URL map for Tableau, LaudBot, GitHub, etc.
- [ ] System prompt has expanded LaudBot build story section
- [ ] System prompt has Agentic Coding System section
- [ ] Actual overlay .md files created (not just .example)
- [ ] Overlays updated: recruiter (response format), coworker (technical depth), buddy (personality)
- [ ] User updates DO SYSTEM_PROMPT env var with new content
- [ ] User updates mode overlays via admin UI

## Files to touch
- data/approved/system_prompt.md
- data/approved/overlays/recruiter.md (create)
- data/approved/overlays/coworker.md (create)
- data/approved/overlays/buddy.md (create)

## Note: post-content step
After ChatGPT/Cursor extracts are pasted, run a second pass to add:
- Detailed project deep-dives (MethodistCRM architecture, Beacon Essentials)
- Personal trivia and non-professional context
- Job history detail (Studio Ten Four clients, contract work)

## Approach
[See implementation below]
