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

**Done (partial)**
- **Entry gate:** "Enter Pulse" switches to the map immediately — no "Locating…" screen. Geolocation runs in the background while the globe is visible.
- **Cinematic globe intro:**
  - Mapbox **globe projection** + dark space fog (3D Earth on black background).
  - Starts at full zoom-out (`zoom 1`).
  - **Horizontal axis rotation** — animates longitude 360° (not bearing, which tilted on a diagonal axis).
  - One full rotation (~2.8s, ease-in/out), then `flyTo` user location at `zoom 4`.
  - HUD and peer dots hidden until intro completes; online count moved to top-left.

**Decisions / trade-offs**
- Longitude animation via `requestAnimationFrame` — Mapbox `easeTo` bearing cannot do a full 360° (0 === 360).
- Intro runs once per session; map interaction locked until fly-in finishes.
- `prefers-reduced-motion`: skip rotation, short fly only.

**Still to do**
- Polish entry screen (aurora hero, privacy chips).
- Chat/video panels, connection prompts, glass UI, mobile bottom sheet.

---

## Phase 3 — Make it secure

Not started. Spotted so far: no session auth on API calls (anyone can spoof `fromId`), no rate limiting.

---

## Phase 4 — Make it better

Not started. Considering a dot status indicator or connection icebreaker — will pick one focused feature.

---

## Delivery

- Repo: https://github.com/elyric10-dev/LiveP2P
- Vercel: https://live-p2p.vercel.app

**Vercel env vars** — set `DATABASE_URL` and `NEXT_PUBLIC_MAPBOX_TOKEN` for Production (and Preview/Development if needed), then redeploy. Do **not** wrap values in quotes in the Vercel dashboard — paste the raw value only (e.g. `postgresql://user:pass@host/db?sslmode=require`, not `"postgresql://..."`). Quotes are fine in local `.env` but break vars on Vercel.

---

## Change history (commits)

### `d098fe4` — Initialized
**Phase:** setup  
**Files:** entire assessment starter (39 files)

- Cloned Pulse assessment template into own repo.
- Added Next.js app: `join`, `poll`, `signal`, `leave` API routes.
- Added UI: `EntryGate`, `WorldMap`, `ChatPanel`, `ConnectionPrompt`, `VideoPanel`.
- Added Prisma schema + migration (`Presence`, `Signal` models).
- Added WebRTC client (`lib/webrtc.ts`), geo privacy offset, HTTP polling client.
- Added docs: `README.md`, `docs/requirements.md`, `AGENTS.md`.

---

### `0a354aa` — Initial
**Phase:** setup  
**Files:** `package-lock.json`

- Trimmed `package-lock.json` after local `npm install` (115 lines removed).

---

### `05fdaad` — Fixed WebRTC "Connection failed (network)"
**Phase:** 1  
**Files:** `NOTES.md`, `app/api/join/route.ts`, `app/api/poll/route.ts`, `app/api/signal/route.ts`, `app/components/WorldMap.tsx`, `app/page.tsx`, `lib/webrtc.ts`

- **`app/api/poll/route.ts`** — heartbeat only the polling user (`where: { id }`), not all rows → stale ghost dots expire.
- **`app/api/signal/route.ts`** — clear `busy` on `end` signals, not just `decline`.
- **`app/api/join/route.ts`** — reset `busy: false` on re-join.
- **`app/components/WorldMap.tsx`** — block clicks on busy (faded) dots; update cursor/title.
- **`app/page.tsx`** — mutual tap-to-connect auto-accepts instead of declining.
- **`lib/webrtc.ts`** — apply ICE candidates after `setRemoteDescription`; fix chat type `msg` → `chat`.
- **`NOTES.md`** — added assessment notes (Phase 1–4).

**Local setup (not committed):** configured `.env`, ran `npx prisma generate` + `npx prisma db push`.

---

### `625baa3` — Update Vercel deployment link
**Phase:** delivery  
**Files:** `NOTES.md`

- Added live Vercel URL: https://live-p2p.vercel.app
- Documented Vercel env vars must be pasted **without quotes**.

---

### *(pending)* — feat(ui): add cinematic globe intro on Enter Pulse
**Phase:** 2  
**Files:** `app/components/EntryGate.tsx`, `app/components/WorldMap.tsx`, `app/page.tsx`, `NOTES.md`

- **`app/components/EntryGate.tsx`** — removed "Locating…" state; `onEnter()` fires immediately on click.
- **`app/page.tsx`** — switch to `live` phase on enter; geolocation + `join()` run in background.
- **`app/components/WorldMap.tsx`**:
  - Mapbox globe projection + space fog; black background.
  - Always start at full zoom-out (`zoom 1`).
  - Horizontal axis rotation via longitude animation (~2.8s, ease-in/out).
  - Full rotation completes before `flyTo` user at `zoom 4`.
  - Lock map interaction during intro; hide HUD/peers until fly-in finishes.
  - Online count moved to top-left (avoids Mapbox attribution overlap).
  - `prefers-reduced-motion`: skip rotation, short fly only.
- **`NOTES.md`** — Phase 2 progress + this change history.

**Suggested commit message:**
```
feat(ui): add cinematic globe intro on Enter Pulse

- Enter map immediately; geolocation and join run in parallel
- Globe projection with space fog; full zoom-out on load
- Horizontal axis rotation via longitude animation, then flyTo user
- Lock map interaction and hide HUD/peers until intro completes
```

---

## Commits (quick reference)

| Commit | Message | Phase |
|--------|---------|-------|
| `d098fe4` | Initialized | setup |
| `0a354aa` | Initial | setup |
| `05fdaad` | Fixed WebRTC "Connection failed (network)" | 1 |
| `625baa3` | Update Vercel deployment link | delivery |
| *(pending)* | feat(ui): add cinematic globe intro on Enter Pulse | 2 |
