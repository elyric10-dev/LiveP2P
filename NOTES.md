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
- **Cinematic globe intro** (`12e0eaf`):
  - Mapbox **globe projection** + dark space fog (3D Earth on black background).
  - Starts at full zoom-out (`zoom 1`).
  - **Horizontal axis rotation** — animates longitude 360° (not bearing, which tilted on a diagonal axis).
  - One full rotation (~2.8s, ease-in/out), then `flyTo` user location at `zoom 10`.
  - HUD and peer dots hidden until intro completes; online count moved to top-left.
- **Map connection visuals** *(staged, pending commit)*:
  - **Status line** from Me → peer while connecting: orange dot-line + glow (pending), green gradient beam (connected), red dot-line flash (rejected).
  - **Message orbs:** on send/receive, a glowing orb travels along the link — emerald (outgoing) vs violet (incoming).
  - **Disconnect sequence:** line snaps red, recedes from both pins toward center with red embers, final burst at midpoint; chat panel slides out; WebRTC closes immediately.

**Decisions / trade-offs**
- Longitude animation via `requestAnimationFrame` — Mapbox `easeTo` bearing cannot do a full 360° (0 === 360).
- Intro runs once per session; map interaction locked until fly-in finishes.
- `prefers-reduced-motion`: skip rotation, short fly only; disconnect/orb animations also respect this.
- Mapbox markers use an outer wrapper — scale/opacity animate on inner elements so Mapbox `transform` positioning is not overwritten.
- Message orb + disconnect coords are snapshotted at event time (not looked up live from peers) so animation stays stable if presence hiccups.
- `line-trim-offset` values are clamped to `[0, 0.5]` — Mapbox rejects tiny negative floats from easing math.

**Still to do**
- Polish entry screen (aurora hero, privacy chips).
- Glass UI, connection prompts, mobile bottom sheet for chat/video.

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

### `12e0eaf` — feat(ui): add cinematic globe intro on Enter Pulse
**Phase:** 2  
**Files:** `app/components/EntryGate.tsx`, `app/components/WorldMap.tsx`, `app/page.tsx`, `NOTES.md`

- **`app/components/EntryGate.tsx`** — removed "Locating…" state; `onEnter()` fires immediately on click.
- **`app/page.tsx`** — switch to `live` phase on enter; geolocation + `join()` run in background.
- **`app/components/WorldMap.tsx`**:
  - Mapbox globe projection + space fog; black background.
  - Always start at full zoom-out (`zoom 1`).
  - Horizontal axis rotation via longitude animation (~2.8s, ease-in/out).
  - Full rotation completes before `flyTo` user at `zoom 10`.
  - Lock map interaction during intro; hide HUD/peers until fly-in finishes.
  - Online count moved to top-left (avoids Mapbox attribution overlap).
  - `prefers-reduced-motion`: skip rotation, short fly only.
- **`NOTES.md`** — Phase 2 progress + change history.

---

### *(pending)* — feat(map): connection lines, message orbs, and disconnect animation
**Phase:** 2  
**Files:** `app/components/WorldMap.tsx`, `app/page.tsx`, `app/components/ChatPanel.tsx`, `app/globals.css`, `lib/types.ts`, `NOTES.md`

- **`lib/types.ts`** — `ConnectionLine`, `MessageOrb`, `DisconnectAnimation` types.
- **`app/page.tsx`**:
  - Derive connection line state from conn (pending / connected / rejected flash).
  - Spawn message orbs on send/receive with snapshotted from/to coords.
  - `beginDisconnect()` — close WebRTC immediately, play map animation, then reset to idle.
  - Chat stays visible with `exiting` slide-out during disconnect.
- **`app/components/WorldMap.tsx`**:
  - Dual-layer Mapbox line (glow + core): orange marching dots (pending), green gradient (connected).
  - Message orb markers with inner-element animation (avoids Mapbox transform conflict).
  - Disconnect: red gradient line, `line-trim-offset` collapse from both ends, red embers → center burst.
- **`app/components/ChatPanel.tsx`** — `exiting` prop triggers slide-out animation.
- **`app/globals.css`** — orb, disconnect burst/ember, chat-panel-exit styles.

**Suggested commit message:**
```
feat(map): add connection lines, message orbs, and disconnect animation

- Status line from Me to peer: orange pending dots, green connected beam, red rejected flash
- Chat message orbs travel the link (emerald sent, violet received)
- End connection: red line fades inward from both pins and vanishes at center
- Chat panel slides out during disconnect; WebRTC closes immediately
```

---

## Commits (quick reference)

| Commit | Message | Phase |
|--------|---------|-------|
| `d098fe4` | Initialized | setup |
| `0a354aa` | Initial | setup |
| `05fdaad` | Fixed WebRTC "Connection failed (network)" | 1 |
| `625baa3` | Update Vercel deployment link | delivery |
| `12e0eaf` | feat(ui): add cinematic globe intro on Enter Pulse | 2 |
| *(pending)* | feat(map): connection lines, message orbs, and disconnect animation | 2 |
