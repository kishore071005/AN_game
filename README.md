# CYBER QUEST — 2D Cyberpunk Platformer Web Game

> **RUN. JUMP. SURVIVE. REACH THE CORE.**

CYBER QUEST is an ultra-fast, premium 2D cyberpunk action platformer built with vanilla HTML5, Canvas API, and modern Web Audio API. It features 5 hand-crafted sectors, tight physics (coyote time, jump buffering, variable jump heights, split rise/fall gravity), a 3-phase epic boss fight against the **Core Guardian**, rich combat mechanics, procedural synthwave audio, full keyboard and touch controls, and offline PWA support.

---

## 🎮 Game Controls

### Desktop Controls
| Action | Primary Key | Alternate Keys |
| :--- | :--- | :--- |
| **Move Left** | `A` | `ArrowLeft` / `Numpad4` |
| **Move Right** | `D` | `ArrowRight` / `Numpad6` |
| **Jump** (Variable height) | `Space` | `ArrowUp` / `W` / `Numpad8` |
| **Down / Crouch** | `S` | `ArrowDown` / `Numpad2` |
| **Cyber Blade Slash** | `J` | `X` / `F` / Mouse Left Click |
| **Pause Game** | `Escape` | `P` |
| **Menu Navigation** | `Arrow Keys` | `Enter` (Select) / `Esc` (Back) |
| **Toggle Debug Overlay** | `F3` | FPS, Hitboxes, Coordinates |

### Mobile & Touch Controls
- Dedicated on-screen touch buttons:
  - `◀` Move Left
  - `▶` Move Right
  - `▲ JUMP` Jump
  - `⚔️ SLASH` Cyber Blade Slash
- Auto-detected for touchscreens and mobile devices.

### Gamepad API Support
- **Left Stick / D-Pad**: Move Left & Right
- **Button 0 (A / Cross)**: Jump
- **Button 2 (X / Square)**: Attack Slash
- **Button 9 (Start / Options)**: Pause Game

---

## ✨ Features & Polish

### 1. Measurable Game Feel (Tuned to Perfection)
- **Fixed-Timestep Physics**: 60 Hz simulation with accumulator and sub-frame render interpolation.
- **Coyote Time**: 100 ms grace window after walking off platform edges.
- **Jump Buffer**: 120 ms buffer so jumps execute automatically upon landing.
- **Variable Jump Height**: Releasing jump early cuts upward velocity by 50%.
- **Split Rise/Fall Gravity**: Rise gravity `1100 px/s²`, fall gravity `1650 px/s²` (1.5× rise ratio).
- **Ground Acceleration**: Reaches max speed in ~80 ms; air control is 70% of ground control.
- **Squash & Stretch**: Dynamic scale reaction on jump and landing (0.85 – 1.15 scale, 100 ms).
- **Hit-Stop Impact**: 50 ms freeze frame on enemy hit with screen shake (clamped <= 6px, <= 150ms).
- **Smooth Camera**: Lerp smoothing with look-ahead in facing direction and dead-zone bounding.

### 2. Sectors & Visual Design
- **5 Hand-Crafted Sectors**:
  - **Sector 1 — Neon District**: Cyan/Magenta palette, rain effects, basic drones.
  - **Sector 2 — Data Factory**: Amber/Orange palette, moving platforms, laser grids.
  - **Sector 3 — Cyber Ruins**: Teal/Violet palette, crumbling falling platforms, hunter AI, checkpoints.
  - **Sector 4 — Core Defense**: Red/Blue palette, rapid lasers, shooter turrets, heavy tank mechs.
  - **Sector 5 — The Core**: White/Gold on black, final boss arena with Core Guardian.
- **4-Layer Parallax Backgrounds**: Cosmic star grid, megacity skyline, midground towers with flashing neon beacons, and foreground atmospheric haze.
- **Dual-Ring Animated Exit Portal**: Counter-rotating rings with energy particle suction effect.
- **Visual Polish**: Run-cycle animations, landing dust puffs, speed boost afterimage trails, and state-adaptive visor glows.

### 3. Value-Add Systems
- **Medal System**: Bronze, Silver, and Gold Medals per sector based on par completion times and shard quotas.
- **Combo Chain**: Chained shard pickups and enemy defeats grant up to x4 score multipliers (decays after 2.0s).
- **Hidden Bonus Shards**: One secret bonus data cache in every sector for +500 points.
- **Achievements System**: 9 distinct achievements with animated toasts and persistent tracking.
- **Operative Dossier (Stats Screen)**: Total playtime, deaths, enemies purged, medals, and shards collected.
- **Configurable Difficulty**: Casual (150 HP), Normal (100 HP), and Hard (60 HP).
- **Rebindable Keyboard Controls**: Full key customization saved to localStorage.
- **Share Result**: One-click clipboard export for speedrun times and sector evaluations.

### 4. Zero-Dependency Procedural Audio
- Procedural Web Audio API sound synthesis:
  - Procedural sound effects for jumps, double jumps, slashes, enemy hits, lasers, slams, and pickups.
  - High-tempo looping synthwave background tracks with an intensified, driving tempo for the boss fight.
  - Independent volume sliders for SFX and Music with persistent memory.

### 5. Installable PWA
- Progressive Web App (`manifest.json`, `sw.js`, SVG icons) with offline caching.

---

## 🏗️ Architecture Overview

```
AN GAME/
├── index.html            # Main markup, canvas, HUD, and modal dialogs
├── style.css             # Glassmorphism cyberpunk styling and responsive rules
├── manifest.json         # PWA installation manifest
├── sw.js                 # Cache-first service worker for offline play
├── icon-192.svg          # PWA application icon (192x192)
├── icon-512.svg          # High-resolution application icon (512x512)
├── serve.js              # Lightweight local static server
├── test_physics.js       # Automated physics, collision & scoring unit test suite
├── qa_e2e_test.js        # Headless Chrome E2E QA test suite
└── src/
    ├── constants.js      # Game constants, physics tuning, palettes, achievements
    ├── storage.js        # Safe LocalStorage manager with fallback store
    ├── audio.js          # Procedural Web Audio synthesizer and music sequencer
    ├── input.js          # Unified keyboard, touch, and gamepad input manager
    ├── particles.js      # Particle FX system with object pool
    ├── camera.js         # Smooth lerp camera with look-ahead and screen shake
    ├── player.js         # Player physics, animation, squash/stretch, afterimages
    ├── enemy.js          # AI systems for Drone, Hunter, Shooter, and Tank mechs
    ├── boss.js           # Core Guardian boss AI (3 phases, lasers, ground slams)
    ├── level_data.js     # Data-driven level definitions and validation suite
    ├── level.js          # World renderer, 4-layer parallax, collision resolver
    ├── ui.js             # UI state machine, keyboard menu navigation, toasts
    └── game.js           # Main 60Hz fixed-timestep loop and engine coordinator
```

---

## 🚀 Running Locally

1. Ensure [Node.js](https://nodejs.org/) is installed.
2. In the project root, start the local server:
   ```bash
   node serve.js
   ```
3. Open your browser to:
   ```
   http://127.0.0.1:3000
   ```

### Running Automated Tests
- **Physics & Logic Unit Tests**:
  ```bash
  node test_physics.js
  ```
- **End-to-End Headless Chrome QA Test**:
  ```bash
  node qa_e2e_test.js
  ```

---

## 🌐 Deployment Instructions

### Deploy to GitHub Pages
1. Push repository code to your GitHub repo.
2. Navigate to **Settings > Pages**.
3. Under **Branch**, select `main` (or `master`) and directory `/ (root)`.
4. Click **Save**. Your game will be live at `https://<username>.github.io/<repo-name>/`.

### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel` or import the GitHub repository in the Vercel dashboard.
2. Set root directory to `./`.
3. Framework preset: **Other / Plain HTML**.
4. Click **Deploy**.

### Deploy to Netlify
1. Drag and drop the workspace folder into the Netlify Drop dashboard, or connect via Git.
2. Build command: *(leave empty)*.
3. Publish directory: `.` (root).
4. Click **Deploy Site**.

---

## 🛠️ How to Add a Level

1. Open `src/level_data.js`.
2. Add a new key `6:` inside `window.CQ.LevelData`:
   ```javascript
   6: {
     id: 6,
     name: 'Quantum Reactor',
     subtitle: 'SUBATOMIC OVERLOAD',
     width: 3000,
     height: 600,
     playerStart: { x: 80, y: 440 },
     exit: { x: 2850, y: 400, width: 48, height: 72 },
     platforms: [ ... ],
     movingPlatforms: [ ... ],
     fallingPlatforms: [ ... ],
     hazards: [ ... ],
     collectibles: [
       { x: 150, y: 400, type: 'coin' },
       { x: 1200, y: 200, type: 'bonus_shard' } // Ensure 1 bonus shard
     ],
     checkpoints: [ { x: 1500, y: 440 } ],
     enemies: [ { type: 'drone', x: 800, y: 400, patrolDist: 100 } ]
   }
   ```
3. Run `node test_physics.js` to automatically validate reachable spawn, exit, and collectibles.
