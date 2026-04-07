# Task: conversation_id — fix New Chat + unlock history browser

## Goal
New Chat starts a genuinely new conversation, persisted separately in the DB.
Visitor history browser can then list and restore past conversations.

## Problem
All `ChatMessage` rows are stored flat under `visitor_id` with no grouping.
"New Chat" only clears frontend state — on refresh, all sessions collapse into
one thread. A history list is impossible without a conversation boundary.

## Approach

### 1. Migration 006 — add `conversation_id` to `chat_messages`
```sql
ALTER TABLE chat_messages ADD COLUMN conversation_id UUID NOT NULL DEFAULT gen_random_uuid();
```
Default fills existing rows with a random UUID each — they become their own
orphaned conversations, which is fine (they predate the feature).

### 2. ORM update — `ChatMessage` model
Add `conversation_id: Mapped[uuid.UUID]` field.

### 3. Backend — chat endpoint
- Accept optional `conversation_id` (UUID) in `POST /api/chat` request body.
- If absent, generate a new UUID (first message of a new conversation).
- Store it on both the user and assistant `ChatMessage` rows.
- Return it in the response so the frontend can track it.

### 4. Backend — history endpoint
- `GET /api/chat/history` — add optional `?conversation_id=` query param.
- Without it: return most recent conversation (max `conversation_id` by created_at).
- With it: return that specific conversation's messages.
- New endpoint: `GET /api/chat/conversations` — list of conversations for the
  visitor (conversation_id, first message preview, created_at, mode, message count).

### 5. Frontend — chat page
- On mount: load most recent conversation (existing behaviour, now scoped).
- "New Chat" button: generate a new UUID, set as `activeConversationId` state,
  clear messages — subsequent sends use the new ID.
- Send `conversation_id` with every `POST /api/chat` request.
- History browser (sidebar or modal): fetch `/api/chat/conversations`, allow
  clicking a past conversation to load it.

## Files to touch
- `backend/migrations/versions/006_add_conversation_id.py` (new)
- `backend/app/db/models.py`
- `backend/app/api/chat.py`
- `backend/app/models/chat.py` (if it exists, else inline in chat.py)
- `frontend/app/chat/page.tsx`

## Open questions
- History browser UI: sidebar panel vs modal vs separate `/history` page?
- How many past conversations to show? Cap at 20?
- Should mode switching start a new conversation automatically?

## Branch
`fix/new-chat-conversation-id`
