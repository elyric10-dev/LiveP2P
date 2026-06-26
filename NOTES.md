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

- **Milky Way entry gate** _(committed with scroll entry)_:
  - **Three.js galaxy** — spiral arms, lavender/purple/pink palette (`#E6E6FA`, `#D8BFD8`, `#6A0DAD`, `#4B0082`), persistent space ambience behind the globe.
  - **Scroll journey** — ~380vh scroll dives from wide galaxy view into Earth; Mapbox globe fades in on top with **transparent space** so stars sit **behind** the sphere (not on the surface).
  - **Layer stack** — `z-0` Milky Way + CSS nebula gradients → `z-10` Mapbox (transparent fog/background during cosmic mode) → `z-40` glass UI (modal, stats, scroll driver).
  - **Mouse interaction** — parallax camera tilt, galaxy rotation, lavender cursor glow; fades with scroll and `prefers-reduced-motion`.
  - **Glass modal** — PULSE title, **ENTER THE GLOBE** CTA, privacy chips; stats bar + decorative side nav.
  - **Enter flow** — geolocation starts **on button click** (user-gesture requirement); map phase switches immediately; single `getCurrentPosition` with `enableHighAccuracy: false` (reliable on desktop Mac).
  - **Cosmic backdrop lifecycle** — visible during gate scroll, through globe intro (rotate + `flyTo`), and **returns when zooming out** below `zoom 5.5`; fades at street-level zoom. Mapbox `star-intensity: 0` (no built-in stars on the globe surface).
  - **Scroll zoom-in** — Mapbox grows from a centre speck (`zoom -2` → `1.0`) as you scroll; slow spin only after the globe is fully formed.
- **Entry gate features + navigation** (`c8afb40`):
  - **Side nav** — visible on load (all breakpoints); **Live map** scrolls to the enter-globe screen (same as **Back to enter**); connect / chat / privacy jump to scroll sections.
  - **Features scroll** — intro + four full-height blocks (map, connect, chat, privacy) with animated backdrops, parallax glass copy, SVG heroes; stats bar on enter screen.
  - **Enter CTA** — interactive as soon as the card is visibly on screen (`enterReady`), not only at full scroll threshold.
  - **Return home** — zoom out on live map (≤ ~1.3 zoom) shows `ReturnHomePrompt`; **Return to outer space** tears down session, lands directly on enter-globe (no Milky Way flash) with smooth fade; map resets to preview globe.
  - **Chat & Video hero** — gallery carousel auto-advances chat ↔ video call art with dot indicators.
- **Live enter animation** (`c8afb40`) — no rotation; `flyTo` user location over ~5.2s after enter (reduced-motion / refresh still jump).
- **Cinematic globe intro** (`12e0eaf`):
  - Mapbox **globe projection** + dark space fog (3D Earth).
  - Starts at full zoom-out (`zoom 1`).
  - **Horizontal axis rotation** — animates longitude 360° (~2.8s), then `flyTo` user at `zoom 10`.
  - HUD and peer dots hidden until intro completes; online count top-left.
- **Map connection visuals** (`df3d52d`):
  - Status line Me → peer: orange marching dots (pending), green gradient (connected), red flash (rejected).
  - **Message orbs** along the link — emerald (outgoing), violet (incoming).
  - **Disconnect** — red line collapse, embers, center burst; chat slides out; WebRTC closes immediately.
- **Refresh reconnect** (`e2bf58b`):
  - `sessionStorage` session ID + pending peer; skip `leave()` while connected.
  - `reconnect` signal renegotiates WebRTC; 30s grace window.
  - `/api/join` preserves `busy`; globe intro skipped when restoring session.
- **Line/dot sync after refresh** (`e2bf58b`):
  - Deterministic privacy offset per session ID.
  - Live `connectedPeerLocation` from poll; peer markers `setLngLat` every tick.

**Decisions / trade-offs**

- Longitude animation via `requestAnimationFrame` — Mapbox bearing cannot do a full 360°.
- Intro runs once per session; map interaction locked until fly-in finishes.
- `prefers-reduced-motion`: skip galaxy scroll / parallax, short fly only.
- Mapbox markers: outer wrapper — animate inner elements only (Mapbox owns outer `transform`).
- Message orb + disconnect coords snapshotted at event time.
- `line-trim-offset` clamped to `[0, 0.5]` — Mapbox rejects tiny negative floats.
- Refresh reconnect: `blockReconnectSave` on intentional End; tab close while connected uses 15s stale timeout.
- **Entry gate + map share one WorldMap instance** — map preloads under scroll overlay in `previewMode` (slow spin); handoff to live intro on enter.
- **Geolocation on click, not after exit animation** — browsers require a user gesture; no IP/network fallback (kept simple after user feedback).
- **Cosmic backdrop stays mounted in live phase** — opacity toggled (not unmounted) for smooth zoom in/out; `MilkyWayScene` progress `1` at globe view.
- `GlassPanel` primitive for entry gate; reuse planned for chat polish.
- Legacy entry files on disk (`AuroraBackground`, `HeroGlobe`, `PeerNodes`, etc.) — superseded by `MilkyWayScene`; safe to delete in cleanup.
- **Return-home suppression** — dismiss with “Stay on the globe”; re-arm after zooming in ~0.85 or further out; connection-aware prompt copy.
- **Gate enter progress** — `GATE_ENTER_PROGRESS` (~0.62) aligns map preview, scroll position, and return-home landing.

**Still to do**

- Glass UI for chat/video panels, connection prompts, mobile bottom sheet.
- Delete unused legacy entry files (`HeroGlobe`, `AuroraBackground`, etc.) — superseded by `MilkyWayScene`.

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

### `df3d52d` — feat(map): connection lines, message orbs, and disconnect animation

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

---

### `e2bf58b` — fix: restore connection on refresh and keep line synced to peer dot

**Phase:** 2  
**Files:** `lib/session.ts`, `lib/geo.ts`, `lib/types.ts`, `app/api/join/route.ts`, `app/api/signal/route.ts`, `app/page.tsx`, `app/components/WorldMap.tsx`, `NOTES.md`

- **`lib/session.ts`** — persist session ID + pending reconnect peer in `sessionStorage` (30s window).
- **`app/page.tsx`** — skip `leave()` on `pagehide` while connected; `attemptReconnect()` after refresh; live `connectedPeerLocation`.
- **`app/api/signal/route.ts`** — `reconnect` signal type.
- **`app/api/join/route.ts`** — preserve `busy` on re-join; session ID into privacy offset.
- **`lib/geo.ts`** — deterministic offset per session ID.
- **`app/components/WorldMap.tsx`** — peer marker `setLngLat` every poll; line uses live coords.

---

### `2a1b392` — feat(ui): Milky Way scroll entry with cosmic backdrop behind globe

**Phase:** 2  
**Files:** `app/components/EntryGate.tsx`, `app/components/entry/MilkyWayScene.tsx`, `app/components/entry/GateStatsBar.tsx`, `app/components/entry/GateSideNav.tsx`, `app/components/entry/GlassPanel.tsx`, `app/components/WorldMap.tsx`, `app/page.tsx`, `app/globals.css`, `package.json`, `NOTES.md`

- **`app/components/entry/MilkyWayScene.tsx`** — Three.js spiral galaxy; lavender/purple star palette; mouse parallax; separate `spaceAmbience` nebula layer; galaxy fades on scroll while coloured stars stay behind globe.
- **`app/components/EntryGate.tsx`** — scroll driver (~380vh), glass enter panel, `onRequestLocation` on click, `onProgressChange` for map/cosmic sync.
- **`app/page.tsx`** — layer stack (Milky Way `z-0`, map `z-10`, UI `z-40`); `cosmicActive` through intro + zoom-out (`inGlobeView` when `zoom < 5.5`); geolocation on user gesture.
- **`app/components/WorldMap.tsx`** — `transparentSpace` + `applyMapAtmosphere()`; `previewMode` + scroll-driven zoom (`PREVIEW_ZOOM_MIN` → `GLOBE_ZOOM`); `onIntroComplete` / `onGlobeViewChange`; `star-intensity: 0`.
- **`package.json`** — added `three` + `@types/three`.

---

### `c8afb40` — feat(ui): entry features scroll, return-home prompt, and chat/video gallery

**Phase:** 2  
**Files:** `app/components/EntryGate.tsx`, `app/components/ReturnHomePrompt.tsx`, `app/components/WorldMap.tsx`, `app/page.tsx`, `app/components/entry/*`, `lib/gate-features.ts`, `lib/return-home-copy.ts`, `app/globals.css`, `NOTES.md`

- **`lib/gate-features.ts`** — feature copy + side-nav icons (map → enter screen, connect, chat, privacy).
- **`app/components/entry/GateFeaturesSection.tsx`** — scrollable feature blocks with `GateFeatureBackdrop`, `GateFeatureIllustration`, footer **Back to enter**.
- **`app/components/entry/GateSideNav.tsx`** — fixed nav on all screen sizes; scroll-to-section; map item targets enter-globe panel.
- **`app/components/EntryGate.tsx`** — cosmic + features scroll phases; enter interactivity fix; return-home scroll-to-enter on mount (one-shot); smooth return fade.
- **`app/components/ReturnHomePrompt.tsx`** + **`lib/return-home-copy.ts`** — zoom-out modal; copy varies by connection/video state.
- **`app/page.tsx`** — `returnToHome()` / `handleLiveZoomChange()`; live cosmic backdrop tracks zoom; `gateScrollToEnter` for return landing.
- **`app/components/WorldMap.tsx`** — live zoom events; preview reset on gate return; enter intro = direct `flyTo` (`INTRO_FLY_MS` ~5.2s), no spin.
- **`app/components/entry/GateChatVideoGallery.tsx`** — chat + video SVG slides, dots, 5s auto-advance.
- **`app/globals.css`** — feature backdrops, return fade, gallery/video art animations.

---

### _(superseded)_ — feat(ui): redesign entry gate as Signal Void aurora landing

Replaced by Milky Way Three.js scroll entry. Legacy files may still exist on disk but are no longer imported.

---

## Commits (quick reference)

| Commit      | Message                                                             | Phase    |
| ----------- | ------------------------------------------------------------------- | -------- |
| `d098fe4`   | Initialized                                                         | setup    |
| `0a354aa`   | Initial                                                             | setup    |
| `05fdaad`   | Fixed WebRTC "Connection failed (network)"                          | 1        |
| `625baa3`   | Update Vercel deployment link                                       | delivery |
| `12e0eaf`   | feat(ui): add cinematic globe intro on Enter Pulse                  | 2        |
| `df3d52d`   | feat(map): connection lines, message orbs, and disconnect animation | 2        |
| `e2bf58b`   | fix: restore connection on refresh and keep line synced to peer dot | 2        |
| `2a1b392`   | feat(ui): Milky Way scroll entry with stars behind the globe        | 2        |
| `c8afb40`   | feat(ui): entry features, return-home, chat/video gallery           | 2        |
