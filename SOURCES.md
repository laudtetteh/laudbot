# LaudBot — Approved Source Policy

This document defines what data LaudBot is permitted to use, and what it must never access or expose.

It is a design-level constraint, not just a config file. The system is built to enforce it.

---

## Approved Sources

The following source types are explicitly permitted:

| Source | Notes |
|---|---|
| Current resume | Primary professional summary |
| Past resume versions | Career history and progression |
| Personal website content | Public-facing bio and project pages |
| Curated project writeups | Intentional, reviewed descriptions |
| Selected GitHub repos and READMEs | Only explicitly included repos |
| Selected STAR stories | Interview-style narratives, reviewed |
| LinkedIn content | Public profile content only |
| Short and long professional bios | Pre-written, approved versions |
| Career goals and target roles | As defined by the owner |
| Curated journey notes | Limited and intentionally authored |

All approved source files live in `data/approved/` locally and are **gitignored**.

Presence of a file in that folder does **not** grant permission to use it. Approval must be explicit and tracked.

---

## Explicitly Off-Limits

The following must never be accessed, ingested, stored, or surfaced by LaudBot under any circumstances:

- Exact address or location details
- Financial information (salary history, debt, assets, account details)
- Health or medical information
- Credentials, tokens, API keys, or secrets of any kind
- Private family or household details beyond high-level context
- Any document or file not explicitly listed as approved

---

## Behavior Rules

When generating responses, LaudBot must:

1. **Only use approved sources.** No scraping, no implicit ingestion, no inference from unapproved data.
2. **Prefer summaries over raw details** when exposing personal information.
3. **Refuse or redirect** questions that probe for off-limits information.
4. **Never fabricate or hallucinate** experience, credentials, or personal details.
5. **Admit uncertainty** rather than guess.

### Examples

| Question | Acceptable response |
|---|---|
| "How many years of experience does he have?" | "He has 10+ years of experience in web development." |
| "Where does he live?" | "That information isn't something I share." |
| "What's his current salary expectation?" | "I'm not able to discuss compensation details here." |

---

## System Prompt Convention

LaudBot's system prompt is loaded from `data/approved/system_prompt.md` at request time.
This file is **gitignored** — it lives on your machine only and is never committed.

To set it up:
```bash
cp data/approved/system_prompt.md.example data/approved/system_prompt.md
# edit system_prompt.md with your approved content
# restart docker-compose — changes are picked up on next request
```

The path is configurable via the `SYSTEM_PROMPT_PATH` env var. If the file does not
exist, the backend falls back to a stub that tells the user LaudBot is not yet configured.

---

## Source Registry (v2+)

A formal source registry with per-source approval state, ingestion timestamps, and usage tracking will be implemented in a later phase. For now, this document is the policy record.
