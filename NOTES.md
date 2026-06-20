# Pulse Assessment — Notes

## Phase 1 — Make it run

**Done**
- Configured `.env` (Neon Postgres + Mapbox token).
- Ran `npx prisma generate` and `npx prisma db push`.
- Fixed peers not showing: Prisma Client wasn't generated after `npm install`.
- Fixed "request declined" on connect:
  - `/api/poll` only heartbeats the caller (was refreshing every user → ghost dots stayed forever).
  - `/api/signal` clears `busy` on `end` (users were stuck busy after disconnect).
  - `/api/join` resets `busy` on re-join.
  - Map blocks clicks on busy (faded) dots.
  - Mutual tap-to-connect: if both users click each other, auto-accept instead of declining.
- Fixed WebRTC "Connection failed (network)":
  - ICE candidates were applied before `setRemoteDescription` → connection never established.
  - Chat used `t: "msg"` but receiver expected `t: "chat"`.

**Still to fix**
- Other starter bugs may surface during full chat → video testing.

**Assumptions**
- Run `npx prisma generate` after every `npm install` (dev doesn't do this automatically).
- Test with two browser profiles + different mock locations in DevTools → Sensors.

---

## Phase 2 — Make it good

Not started. Plan: polish entry screen, map UI, chat/video panels, and connection flow feedback.

---

## Phase 3 — Make it secure

Not started. Spotted so far: no session auth on API calls (anyone can spoof `fromId`), no rate limiting.

---

## Phase 4 — Make it better

Not started. Considering a dot status indicator or connection icebreaker — will pick one focused feature.

---

## Delivery

- Repo: https://github.com/elyric10-dev/LiveP2P
- Vercel: pending

---

## Commits

| Commit | Message | Changes |
|--------|---------|---------|
| `d098fe4` | **Initialized** | Cloned assessment starter — full Next.js app, API routes (`join`, `poll`, `signal`, `leave`), UI components (map, chat, video), Prisma schema + migration, WebRTC client, docs. |
| `0a354aa` | **Initial** | Trimmed `package-lock.json` after local `npm install` (115 lines removed). |
| *(pending)* | **docs: add NOTES.md** | Assessment notes — setup steps, known bugs, phase status. |
