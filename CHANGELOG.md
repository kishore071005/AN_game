# CYBER QUEST — Changelog & Build History

## [v2.0.0] - Addendum Enhancement & Bug Fix Release

### P0 (Core - Flawless Quality)
- **Fixed Up Arrow & Arrow Keys Bug**:
  - Resolved fixed-timestep input eating where sub-frame animation ticks (< 16.6ms) cleared `actionsJustPressed` before physics steps executed.
  - Implemented persistent tap buffering in `InputManager` that guarantees physics ticks consume all key taps.
  - Added robust fallback mapping for `ArrowUp`, `Up`, `Numpad8`, `Space`, `KeyW`, `ArrowDown`, `Down`, `Numpad2`, `ArrowLeft`, `Left`, `Numpad4`, `ArrowRight`, `Right`, `Numpad6`.
- **Keyboard Menu Navigation**:
  - Full keyboard accessibility across all menus and modals (Main Menu, Options, Level Select, Dossier, Pause, Level Complete, Game Over, Victory).
  - Arrow keys navigate button focus with glowing neon highlights; Enter triggers selection; Escape closes modals.
- **Physics Calibration**:
  - Fixed-timestep physics at 60 Hz with sub-frame render interpolation.
  - Coyote time (100 ms) and jump buffering (120 ms).
  - Variable jump height (releasing early cuts velocity by 50%).
  - Ground acceleration to max in 80 ms; air control 70% of ground.
  - Split gravity: Rise `1100 px/s²`, Fall `1650 px/s²` (1.5× ratio).
  - Squash and stretch on jump (0.82X, 1.18Y) and landing (1.20X, 0.82Y).

### P1 (Expected Enhancements)
- **Audio Control Sliders**:
  - Added separate volume sliders for SFX and Music (0 – 100%) in Settings, persisted in localStorage.
  - Additional procedural audio sound effects: Bonus Shards chime, Combo escalation, Achievement fanfare, Boss intro synth, Menu navigation and select blips.
- **Accessibility & Settings**:
  - Added Reduce Motion toggle (disables shake, heavy parallax, and flashes).
  - Added High Contrast mode with high-visibility borders.
  - Added CRT scanlines overlay toggle.
  - Added Speedrun Timer toggle with sub-second display in HUD.
  - Added Difficulty selector: Casual (150 HP), Normal (100 HP), Hard (60 HP).
- **Mobile Touch Controls**:
  - Added `▲ JUMP` and `⚔️ SLASH` touch action buttons with >= 48px tap targets.
- **Checkpoints & Hazards**:
  - Refined sweep collision detection to prevent tunnel-through on thin platforms during terminal velocity falls.

### P2 (Stretch & Value-Add Systems)
- **Sector Visuals & 4-Layer Parallax**:
  - Implemented 4 distinct parallax layers per sector (cosmic grid, skyline, mid towers, atmospheric fog).
  - Configured unique color palettes per sector (Level 1 cyan/magenta, Level 2 amber/orange, Level 3 teal/violet, Level 4 red/blue, Level 5 white/gold).
  - Added ambient atmospheric particles (rain in Level 1, circuit pulses in Level 2, data motes in Level 3, glitch bars in Level 4 & 5).
  - Character polish: run-cycle animation, dash afterimage trail, dynamic visor color state changes.
  - Dual-ring animated exit portal with counter-rotation and particle suction.
- **Medal System**:
  - Awarded Bronze, Silver, and Gold Medals per sector based on par times and shard quotas.
  - Visual medal badges displayed on Level Select cards and Level Complete screens.
- **Combo System**:
  - Chained shard pickups and enemy kills award up to x4 multiplier (decays after 2.0s).
- **Hidden Bonus Shards**:
  - Added 1 secret bonus data shard in every sector (+500 points, unlocks "Secret Hunter").
- **Achievements & Dossier**:
  - 9 achievements with animated toast banners.
  - Operative Dossier statistics screen tracking playtime, deaths, enemies, shards, and medals.
- **Gamepad Support**:
  - Gamepad API support for D-pad, sticks, and buttons.
- **Rebindable Controls**:
  - In-game control customization modal with persistent save.
- **Share Result**:
  - Clipboard export button for speedrun records and evaluation summaries.
- **Installable PWA**:
  - `manifest.json`, `sw.js` (cache-first service worker), and SVG app icons.

### QA & Verification
- Unit test suite `test_physics.js` (25/25 passing).
- Headless Chrome E2E test suite `qa_e2e_test.js` (100% passing with 0 console errors).
