# Conversations workflows (F4)

Short flows before implementation in Phases 2–5. The inbox loads from `/api/v1/conversations/bootstrap`.

## W1 · Reply by email

1. User opens conversation `conv-1` (Grace Lin).
2. Composer defaults to **Email**; subject pre-filled `Re: Your demo on Wednesday`.
3. User sends → `sendMessage` queues outbound with `Reply-To: {reply_token}@inbound.domain`, `In-Reply-To` / `References` set.
4. Contact replies from Gmail → inbound webhook parses MIME, matches `emailThreadKey` (reply token first), appends to same `conversation`.
5. Thread shows quoted collapse; `waiting_since` set on inbound; assignee notified.

## W2 · New message (top bar)

1. **New message** → pick/create contact (`createOrMatchContact`).
2. Resolve or create **one conversation per contact**.
3. Run `canSend` per channel before focusing composer tab.
4. Default tab = last inbound channel if allowed, else first allowed.

## W3 · SMS and STOP

1. Open `conv-4` (Ken Lowe) — inbound `STOP` already in thread.
2. `detectOptOut` on ingest set `contact_consent.sms.dnd`, history + event in thread.
3. Composer **SMS** tab shows red dot; `canSend` blocked with STOP reason.
4. Contact sends `START` → `detectOptIn` clears DND, event in thread, SMS tab allowed again.

## W4 · WhatsApp window

1. **Open window:** `conv-2` — last inbound &lt; 24 h; free text allowed; panel shows hours left.
2. **Closed window:** `conv-7` — `canSend` → `template_only`; textarea read-only until template chosen; variables via `renderTemplate`.
3. New inbound WhatsApp → updates `wa_window_expires_at`, reopens free text.

## W5 · Internal comment

1. Composer **Comment** tab (amber).
2. `addComment` — no provider; `parseMentions` notifies teammates.
3. Comment stored in `conversation_comment` only — **never** in outbound payloads, contact exports, or AI context (rule 31).

## W6 · Calls in the thread

1. Telephony creates `phone_call` with `conversation_id`.
2. Thread renders call card (direction, duration, handler).
3. Missed inbound → sets `waiting_since`.
4. Recording button when `recording_r2_key` present; playback gated by permission.

## W7 · Unknown sender

1. Inbound email/SMS/WA from unknown address → `createOrMatchContact` (source: Inbound …).
2. Create conversation, route assignee per org routing rule.
3. Notify assignee or round-robin pool.

## W8 · Failure and retry

1. Job marks message `failed` with `error_message`.
2. Thread shows reason + **Retry** (new provider attempt, new `client_id`).
3. Permanent errors (invalid address) explain fix; no blind retry.

## W9 · Snooze and close

1. Snooze sets `status=snoozed`, `snoozed_until`; job reopens and notifies.
2. Inbound or snooze job ends snooze early.
3. Close → `status=closed` with Undo toast; new inbound reopens.

## W10 · From other pages

1. **Message** on contact / company person / opportunity panel calls `GET /api/v1/conversations/by-contact/{contactId}` (creates conversation if needed), then navigates to `/conversations?c={id}&channel=…`.
2. Contact **Conversations** tab redirects through the same API.
3. Composer reads `channel` query param when opening a thread (contact **Email** / **SMS** pass `channel=email|sms`).
4. **New contacts** get a conversation row in the same transaction as `createContact` / onboarding `addLead` (one per contact). Older contacts still get one on first Message/Email or via the by-contact API.

## W11 · Bounce and complaint

1. Email status webhook → hard bounce / complaint updates consent (rule 23).
2. System event in thread; future email blocked with reason.

## W12 · Scheduled send

1. Send menu: tomorrow 9:00, Monday 9:00, custom → `status=scheduled`, `scheduled_at`.
2. Thread shows scheduled row with Edit/Cancel until job sends.
3. Marketing during quiet hours → `canSend.scheduleAt` from server.
