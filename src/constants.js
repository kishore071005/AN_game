// CYBER QUEST - Core Constants & Configuration (Enhanced v2)
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  const TILE = 36;

  window.CQ.Constants = {
    // Virtual resolution (16:9 widescreen, crisply scaled to any device)
    CANVAS_WIDTH: 960,
    CANVAS_HEIGHT: 540,

    // Tile sizing
    TILE_SIZE: TILE,

    // Physics (pixels per second or per second²)
    // Rise and fall gravity are split for better game feel (spec B: Fall ~1.5x Rise)
    GRAVITY_RISE: 1100,        // Gravity when moving up (lighter feel on ascent)
    GRAVITY_FALL: 1650,        // Gravity when falling (~1.5× rise) - spec: 1.5x
    GRAVITY: 1350,             // Legacy fallback (used by enemies/misc)
    MAX_FALL_SPEED: 680,       // Terminal velocity cap

    PLAYER: {
      WIDTH: 26,
      HEIGHT: 40,

      // Movement acceleration (ground to max in ~80ms per spec: 260 / 3250 = 0.08s)
      ACCEL: 3250,             // Ground acceleration
      DECEL: 2600,             // Ground deceleration/friction
      AIR_ACCEL_MULT: 0.70,    // Air control = 70% of ground (spec)
      MAX_SPEED: 260,
      BOOST_MAX_SPEED: 380,

      // Jump (jump apex ~3.5 tiles = 3.5 * 36 = 126px above ground)
      // v² = 2·g·h => v = sqrt(2 * 1100 * 126) ≈ 527
      JUMP_FORCE: -527,
      // Variable jump: releasing early cuts vy by ~50% (spec)
      MIN_JUMP_FORCE: -200,    // Minimum upward velocity when jump released early
      VAR_JUMP_MULT: 0.50,     // Cut factor on early release

      // Timing (spec: coyote 100ms, buffer 120ms)
      COYOTE_TIME: 0.100,
      JUMP_BUFFER: 0.120,

      // Invincibility after damage: 1.2s per spec
      INVULN_TIME: 1.2,

      // Health
      MAX_HP: 100,
      INITIAL_LIVES: 3,

      // Combat (spec: 0.35s cooldown, visible energy arc, short hitbox window)
      ATTACK_COOLDOWN: 0.35,
      ATTACK_DURATION: 0.14,
      ATTACK_RANGE: 64,
      ATTACK_DAMAGE: 35,
      BOOST_ATTACK_DAMAGE: 75,

      // Hit-stop: freeze duration when hitting an enemy (spec: 40-60ms)
      HIT_STOP_DURATION: 0.050,  // 50ms

      // Squash and stretch (spec: 0.85-1.15 scale, 100ms)
      SQUASH_JUMP_X: 0.82,     // Squash X on jump
      SQUASH_JUMP_Y: 1.18,     // Stretch Y on jump
      SQUASH_LAND_X: 1.20,     // Squash X on land
      SQUASH_LAND_Y: 0.82,     // Squash Y on land
      SQUASH_RECOVER_TIME: 0.10 // Recovery to 1.0 scale in 100ms
    },

    // Difficulty settings
    DIFFICULTY: {
      casual: {
        name: 'CASUAL',
        playerHp: 150,
        damageTakenMult: 0.70,
        enemySpeedMult: 0.85
      },
      normal: {
        name: 'NORMAL',
        playerHp: 100,
        damageTakenMult: 1.0,
        enemySpeedMult: 1.0
      },
      hard: {
        name: 'HARD',
        playerHp: 60,
        damageTakenMult: 1.35,
        enemySpeedMult: 1.15
      }
    },

    // Screen shake constants (spec: max 6px, <=150ms)
    SHAKE: {
      ENEMY_HIT_INTENSITY: 4,
      ENEMY_HIT_DURATION: 0.12,
      PLAYER_DAMAGE_INTENSITY: 6,
      PLAYER_DAMAGE_DURATION: 0.15,
      EXPLOSION_INTENSITY: 5,
      EXPLOSION_DURATION: 0.12
    },

    // Combo system (spec D: cap x4, decays after 2s)
    COMBO: {
      MAX_MULTIPLIER: 4,
      DECAY_TIME: 2.0
    },

    // Par times for Medals (in seconds)
    PAR_TIMES: {
      1: 45,
      2: 60,
      3: 75,
      4: 90,
      5: 120
    },

    // Achievements specification (8-10 achievements)
    ACHIEVEMENTS: {
      first_blood: {
        id: 'first_blood',
        title: 'FIRST BLOOD',
        desc: 'Purge your first cybernetic threat',
        icon: '⚔️'
      },
      no_damage: {
        id: 'no_damage',
        title: 'GHOST OPERATIVE',
        desc: 'Clear any sector without taking damage',
        icon: '🛡️'
      },
      speed_runner: {
        id: 'speed_runner',
        title: 'SPEED RUNNER',
        desc: 'Clear a sector under the par time limit',
        icon: '⚡'
      },
      collector: {
        id: 'collector',
        title: 'CORE HARVESTER',
        desc: 'Collect all Energy Shards in a single sector',
        icon: '💠'
      },
      boss_slayer: {
        id: 'boss_slayer',
        title: 'BOSS SLAYER',
        desc: 'Annihilate the Core Guardian and breach the Singularity',
        icon: '👑'
      },
      triple_combo: {
        id: 'triple_combo',
        title: 'COMBO MASTER',
        desc: 'Reach a x4 combo multiplier chain',
        icon: '🔥'
      },
      overclocked: {
        id: 'overclocked',
        title: 'OVERCLOCKED',
        desc: 'Activate all 4 cyber power-up upgrades',
        icon: '🚀'
      },
      secret_hunter: {
        id: 'secret_hunter',
        title: 'SECRET HUNTER',
        desc: 'Discover a hidden bonus data cache',
        icon: '🔍'
      },
      cyber_master: {
        id: 'cyber_master',
        title: 'CYBER LEGEND',
        desc: 'Achieve Gold Medals across all 5 sectors',
        icon: '🏆'
      }
    },

    // Power-up durations in seconds
    POWERUPS: {
      SHIELD:      { duration: 10, name: 'CYBER SHIELD',      color: '#00f3ff', icon: '🛡️' },
      SPEED:       { duration: 8,  name: 'OVERCLOCK SPEED',   color: '#ff007f', icon: '⚡' },
      DOUBLE_JUMP: { duration: 12, name: 'ION THRUSTERS',     color: '#ffe600', icon: '🚀' },
      DAMAGE:      { duration: 10, name: 'PLASMA OVERCHARGE', color: '#ff3344', icon: '⚔️' }
    },

    // Scoring system
    SCORE: {
      COIN: 100,
      BONUS_SHARD: 500,
      ENEMY_DRONE: 250,
      ENEMY_HUNTER: 350,
      ENEMY_SHOOTER: 400,
      ENEMY_TANK: 600,
      BOSS_DEFEAT: 5000,
      LEVEL_CLEAR: 1000
    },

    // Cyberpunk Color Palette per spec
    // Level 1: cyan/magenta, Level 2: amber/orange, Level 3: teal/violet, Level 4: red/blue, Level 5: white/gold on black
    PALETTES: {
      1: { primary: '#00f3ff', secondary: '#ff007f', bg: '#070913', name: 'CYAN / MAGENTA' },
      2: { primary: '#ffaa00', secondary: '#ff4400', bg: '#100a04', name: 'AMBER / ORANGE' },
      3: { primary: '#00e5bc', secondary: '#9d00ff', bg: '#070d14', name: 'TEAL / VIOLET' },
      4: { primary: '#ff2255', secondary: '#0088ff', bg: '#120408', name: 'RED / BLUE' },
      5: { primary: '#ffffff', secondary: '#ffd700', bg: '#020205', name: 'WHITE / GOLD' }
    },

    COLORS: {
      CYAN: '#00f3ff',
      MAGENTA: '#ff007f',
      PURPLE: '#8b00ff',
      YELLOW: '#ffe600',
      GREEN: '#00ff66',
      RED: '#ff2255',
      ORANGE: '#ff8800',
      WHITE: '#ffffff',
      BG_DARK: '#070913',
      BG_DARKER: '#030408',
      PLATFORM_TOP: '#00f3ff',
      PLATFORM_BODY: '#0e1628',
      PLATFORM_GLOW: 'rgba(0, 243, 255, 0.4)',
      HAZARD_SPIKE: '#ff0055',
      HAZARD_LASER: '#ff1144'
    }
  };
})();
