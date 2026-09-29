// CYBER QUEST - Comprehensive Level Data (Levels 1 to 5) with Hidden Bonus Shards & Validation
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  window.CQ.LevelData = {
    // -------------------------------------------------------------
    // LEVEL 1 — NEON DISTRICT
    // Palette: Cyan / Magenta
    // Teaches: Movement, Jumping, Energy Shards, Static Platforms, Basic Spikes
    // -------------------------------------------------------------
    1: {
      id: 1,
      name: 'Neon District',
      subtitle: 'SURFACE INFILTRATION',
      width: 2500,
      height: 600,
      playerStart: { x: 80, y: 440 },
      exit: { x: 2360, y: 410, width: 44, height: 64 },

      platforms: [
        // Ground floor segments with gaps
        { x: 0, y: 500, width: 650, height: 100 },
        { x: 740, y: 500, width: 500, height: 100 },
        { x: 1320, y: 500, width: 480, height: 100 },
        { x: 1880, y: 500, width: 620, height: 100 },

        // Step platforms for tutorial jumps
        { x: 220, y: 420, width: 140, height: 24 },
        { x: 420, y: 350, width: 150, height: 24 },

        // Elevated path over the first spike hazard
        { x: 670, y: 380, width: 130, height: 24 },
        { x: 860, y: 330, width: 140, height: 24 },
        { x: 1060, y: 380, width: 130, height: 24 },

        // Mid-level rooftop structures
        { x: 1380, y: 410, width: 120, height: 24 },
        { x: 1560, y: 330, width: 140, height: 24 },
        { x: 1740, y: 270, width: 160, height: 24 },

        // High secret ledge with powerup & bonus shard
        { x: 1460, y: 220, width: 150, height: 24 },

        // Final approach platforms
        { x: 2020, y: 420, width: 150, height: 24 },
        { x: 2220, y: 360, width: 120, height: 24 }
      ],

      movingPlatforms: [],
      fallingPlatforms: [],

      hazards: [
        { type: 'spike', x: 650, y: 560, width: 90, height: 24 },
        { type: 'spike', x: 1240, y: 560, width: 80, height: 24 },
        { type: 'spike', x: 1800, y: 560, width: 80, height: 24 },
        { type: 'spike', x: 1610, y: 310, width: 40, height: 20 }
      ],

      collectibles: [
        { x: 150, y: 460, type: 'coin' },
        { x: 260, y: 380, type: 'coin' },
        { x: 300, y: 380, type: 'coin' },
        { x: 470, y: 310, type: 'coin' },
        { x: 520, y: 310, type: 'coin' },

        { x: 720, y: 340, type: 'coin' },
        { x: 920, y: 290, type: 'coin' },
        { x: 1110, y: 340, type: 'coin' },
        { x: 1430, y: 370, type: 'coin' },
        { x: 1620, y: 290, type: 'coin' },

        // Power-up on secret ledge: SPEED BOOST
        { x: 1530, y: 180, type: 'speed' },

        // Hidden Bonus Shard 1 (Spec D: Hidden bonus shard in every level)
        { x: 1480, y: 140, type: 'bonus_shard' },

        // Exit runway shards
        { x: 2080, y: 380, type: 'coin' },
        { x: 2270, y: 320, type: 'coin' },
        { x: 2320, y: 460, type: 'coin' }
      ],

      checkpoints: [
        { x: 1340, y: 440 }
      ],

      enemies: [
        { type: 'drone', x: 920, y: 460, patrolDist: 80 },
        { type: 'drone', x: 1640, y: 460, patrolDist: 90 },
        { type: 'drone', x: 2100, y: 460, patrolDist: 100 }
      ]
    },

    // -------------------------------------------------------------
    // LEVEL 2 — DATA FACTORY
    // Palette: Amber / Orange
    // Introduces: Moving Platforms, Laser Beams, Patrol Drones, Precision Jumps
    // -------------------------------------------------------------
    2: {
      id: 2,
      name: 'Data Factory',
      subtitle: 'SERVER SILICON CONDUIT',
      width: 2900,
      height: 650,
      playerStart: { x: 70, y: 480 },
      exit: { x: 2780, y: 450, width: 44, height: 64 },

      platforms: [
        { x: 0, y: 540, width: 480, height: 110 },
        { x: 800, y: 540, width: 440, height: 110 },
        { x: 1520, y: 540, width: 420, height: 110 },
        { x: 2200, y: 540, width: 700, height: 110 },

        { x: 260, y: 430, width: 140, height: 24 },
        { x: 840, y: 420, width: 130, height: 24 },
        { x: 1100, y: 360, width: 140, height: 24 },
        { x: 1580, y: 400, width: 120, height: 24 },
        { x: 1820, y: 320, width: 130, height: 24 },
        { x: 2360, y: 420, width: 140, height: 24 },
        { x: 2560, y: 340, width: 130, height: 24 },
        { x: 2720, y: 260, width: 120, height: 24 } // Secret high alcove
      ],

      movingPlatforms: [
        { x: 520, y: 460, width: 110, height: 20, minX: 490, maxX: 750, speed: 110, axis: 'x' },
        { x: 1300, y: 480, width: 110, height: 20, minY: 300, maxY: 500, speed: 90, axis: 'y' },
        { x: 1980, y: 380, width: 110, height: 20, minX: 1960, maxX: 2180, speed: 120, axis: 'x' }
      ],

      fallingPlatforms: [],

      hazards: [
        { type: 'spike', x: 480, y: 600, width: 320, height: 30 },
        { type: 'spike', x: 1240, y: 600, width: 280, height: 30 },
        { type: 'spike', x: 1940, y: 600, width: 260, height: 30 },
        { type: 'laser', x: 990, y: 350, width: 16, height: 190, cyclePeriod: 3.0, onTime: 1.5 },
        { type: 'laser', x: 1720, y: 330, width: 16, height: 210, cyclePeriod: 3.2, onTime: 1.6 }
      ],

      collectibles: [
        { x: 180, y: 500, type: 'coin' },
        { x: 310, y: 390, type: 'coin' },
        { x: 620, y: 420, type: 'coin' },
        { x: 890, y: 380, type: 'coin' },
        { x: 1150, y: 320, type: 'coin' },

        { x: 1350, y: 250, type: 'shield' },

        { x: 1630, y: 360, type: 'coin' },
        { x: 1870, y: 280, type: 'coin' },
        { x: 2070, y: 340, type: 'coin' },
        { x: 2420, y: 380, type: 'coin' },
        { x: 2620, y: 300, type: 'coin' },
        { x: 2740, y: 500, type: 'coin' },

        // Hidden Bonus Shard 2
        { x: 2780, y: 220, type: 'bonus_shard' }
      ],

      checkpoints: [
        { x: 1540, y: 480 }
      ],

      enemies: [
        { type: 'drone', x: 960, y: 500, patrolDist: 100 },
        { type: 'drone', x: 1640, y: 360, patrolDist: 80 },
        { type: 'drone', x: 2320, y: 500, patrolDist: 110 },
        { type: 'drone', x: 2580, y: 490, patrolDist: 90 }
      ]
    },

    // -------------------------------------------------------------
    // LEVEL 3 — CYBER RUINS
    // Palette: Teal / Violet
    // Introduces: Falling Platforms, Hunter AI, Checkpoints, Vertical Climbs
    // -------------------------------------------------------------
    3: {
      id: 3,
      name: 'Cyber Ruins',
      subtitle: 'ANCIENT MAINFRAME CRYPT',
      width: 3100,
      height: 800,
      playerStart: { x: 80, y: 640 },
      exit: { x: 2980, y: 320, width: 44, height: 64 },

      platforms: [
        { x: 0, y: 700, width: 440, height: 100 },
        { x: 480, y: 620, width: 140, height: 24 },
        { x: 680, y: 540, width: 140, height: 24 },
        { x: 900, y: 460, width: 160, height: 24 },
        { x: 1140, y: 460, width: 380, height: 340 },

        { x: 1680, y: 580, width: 140, height: 24 },
        { x: 1900, y: 500, width: 150, height: 24 },
        { x: 2120, y: 410, width: 160, height: 24 },
        { x: 2020, y: 280, width: 140, height: 24 }, // High ruins arch
        { x: 2360, y: 410, width: 340, height: 390 },
        { x: 2880, y: 380, width: 220, height: 420 }
      ],

      movingPlatforms: [
        { x: 130, y: 580, width: 100, height: 20, minX: 130, maxX: 350, speed: 90, axis: 'x' },
        { x: 1540, y: 520, width: 100, height: 20, minY: 380, maxY: 560, speed: 100, axis: 'y' }
      ],

      fallingPlatforms: [
        { x: 820, y: 500, width: 70, height: 20, fallDelay: 0.7, respawnDelay: 2.8 },
        { x: 1060, y: 460, width: 70, height: 20, fallDelay: 0.7, respawnDelay: 2.8 },
        { x: 2720, y: 410, width: 80, height: 20, fallDelay: 0.65, respawnDelay: 2.6 },
        { x: 2810, y: 390, width: 60, height: 20, fallDelay: 0.65, respawnDelay: 2.6 }
      ],

      hazards: [
        { type: 'spike', x: 440, y: 760, width: 700, height: 40 },
        { type: 'spike', x: 1520, y: 760, width: 840, height: 40 },
        { type: 'spike', x: 2700, y: 760, width: 180, height: 40 },
        { type: 'laser', x: 1320, y: 300, width: 16, height: 160, cyclePeriod: 3.0, onTime: 1.5 },
        { type: 'laser', x: 2480, y: 250, width: 16, height: 160, cyclePeriod: 2.8, onTime: 1.4 }
      ],

      collectibles: [
        { x: 200, y: 540, type: 'coin' },
        { x: 530, y: 580, type: 'coin' },
        { x: 730, y: 500, type: 'coin' },
        { x: 950, y: 420, type: 'coin' },

        { x: 1240, y: 410, type: 'double_jump' },

        { x: 1730, y: 540, type: 'coin' },
        { x: 1960, y: 460, type: 'coin' },
        { x: 2180, y: 370, type: 'coin' },

        // Hidden Bonus Shard 3 (on the high ruins arch)
        { x: 2080, y: 240, type: 'bonus_shard' },

        { x: 2510, y: 360, type: 'damage' },

        { x: 2740, y: 360, type: 'coin' },
        { x: 2830, y: 340, type: 'coin' }
      ],

      checkpoints: [
        { x: 1180, y: 400 },
        { x: 2400, y: 350 }
      ],

      enemies: [
        { type: 'drone', x: 740, y: 420, patrolDist: 80 },
        { type: 'hunter', x: 1360, y: 400, patrolDist: 110 },
        { type: 'drone', x: 1840, y: 440, patrolDist: 70 },
        { type: 'hunter', x: 2540, y: 350, patrolDist: 90 }
      ]
    },

    // -------------------------------------------------------------
    // LEVEL 4 — CORE DEFENSE
    // Palette: Red / Blue
    // Introduces: Shooters, Tank Mechs, Rapid Laser Grids, Moving Obstacles
    // -------------------------------------------------------------
    4: {
      id: 4,
      name: 'Core Defense',
      subtitle: 'FIREWALL CITADEL PROTOCOL',
      width: 3400,
      height: 700,
      playerStart: { x: 80, y: 540 },
      exit: { x: 3260, y: 420, width: 44, height: 64 },

      platforms: [
        { x: 0, y: 600, width: 420, height: 100 },
        { x: 720, y: 580, width: 340, height: 120 },
        { x: 1360, y: 560, width: 400, height: 140 },
        { x: 2020, y: 520, width: 440, height: 180 },
        { x: 2740, y: 500, width: 660, height: 200 },

        { x: 260, y: 480, width: 120, height: 24 },
        { x: 540, y: 420, width: 130, height: 24 },
        { x: 1120, y: 440, width: 130, height: 24 },
        { x: 1240, y: 350, width: 140, height: 24 },
        { x: 1800, y: 400, width: 140, height: 24 },
        { x: 2500, y: 380, width: 140, height: 24 },
        { x: 2620, y: 280, width: 150, height: 24 },
        { x: 2920, y: 340, width: 130, height: 24 } // High security perch
      ],

      movingPlatforms: [
        { x: 420, y: 520, width: 100, height: 20, minX: 420, maxX: 660, speed: 130, axis: 'x' },
        { x: 1080, y: 520, width: 100, height: 20, minY: 360, maxY: 540, speed: 110, axis: 'y' },
        { x: 1840, y: 480, width: 100, height: 20, minX: 1800, maxX: 2000, speed: 140, axis: 'x' }
      ],

      fallingPlatforms: [
        { x: 1200, y: 480, width: 70, height: 20, fallDelay: 0.6, respawnDelay: 2.5 },
        { x: 2560, y: 440, width: 70, height: 20, fallDelay: 0.6, respawnDelay: 2.5 }
      ],

      hazards: [
        { type: 'spike', x: 420, y: 660, width: 300, height: 40 },
        { type: 'spike', x: 1060, y: 660, width: 300, height: 40 },
        { type: 'spike', x: 1760, y: 660, width: 260, height: 40 },
        { type: 'spike', x: 2460, y: 660, width: 280, height: 40 },
        { type: 'laser', x: 860, y: 320, width: 16, height: 260, cyclePeriod: 2.5, onTime: 1.3 },
        { type: 'laser', x: 1520, y: 300, width: 16, height: 260, cyclePeriod: 2.4, onTime: 1.2 },
        { type: 'laser', x: 2220, y: 260, width: 16, height: 260, cyclePeriod: 2.2, onTime: 1.1 }
      ],

      collectibles: [
        { x: 160, y: 550, type: 'coin' },
        { x: 300, y: 440, type: 'coin' },
        { x: 590, y: 380, type: 'coin' },
        { x: 800, y: 530, type: 'speed' },
        { x: 940, y: 530, type: 'coin' },
        { x: 1180, y: 400, type: 'coin' },
        { x: 1300, y: 310, type: 'coin' },
        { x: 1460, y: 510, type: 'shield' },
        { x: 1640, y: 510, type: 'coin' },
        { x: 2100, y: 470, type: 'coin' },
        { x: 2320, y: 470, type: 'coin' },
        { x: 2680, y: 240, type: 'damage' },

        // Hidden Bonus Shard 4
        { x: 2980, y: 300, type: 'bonus_shard' },

        { x: 2880, y: 450, type: 'coin' },
        { x: 3020, y: 450, type: 'coin' },
        { x: 3180, y: 450, type: 'coin' }
      ],

      checkpoints: [
        { x: 1400, y: 500 },
        { x: 2060, y: 460 }
      ],

      enemies: [
        { type: 'drone', x: 880, y: 440, patrolDist: 90 },
        { type: 'shooter', x: 1280, y: 314 },
        { type: 'hunter', x: 1600, y: 500, patrolDist: 100 },
        { type: 'shooter', x: 2260, y: 484 },
        { type: 'tank', x: 2980, y: 452, patrolDist: 80 }
      ]
    },

    // -------------------------------------------------------------
    // LEVEL 5 — THE CORE
    // Palette: White / Gold on Black
    // The Final Gauntlet & Arena Boss Fight: CORE GUARDIAN
    // -------------------------------------------------------------
    5: {
      id: 5,
      name: 'The Core',
      subtitle: 'SINGULARITY REACTION CHAMBER',
      width: 2200,
      height: 600,
      playerStart: { x: 80, y: 440 },
      exit: { x: 2080, y: 400, width: 48, height: 72 },

      platforms: [
        { x: 0, y: 500, width: 400, height: 100 },
        { x: 460, y: 440, width: 120, height: 24 },
        { x: 640, y: 380, width: 130, height: 24 },
        { x: 820, y: 320, width: 140, height: 24 },
        { x: 1020, y: 500, width: 1180, height: 100 },
        { x: 1100, y: 360, width: 160, height: 24 },
        { x: 1880, y: 360, width: 160, height: 24 },
        { x: 1480, y: 260, width: 180, height: 24 },
        { x: 1520, y: 150, width: 100, height: 20 } // Apex secret ledge
      ],

      movingPlatforms: [],
      fallingPlatforms: [
        { x: 740, y: 440, width: 70, height: 20, fallDelay: 0.6, respawnDelay: 2.2 }
      ],

      hazards: [
        { type: 'spike', x: 400, y: 560, width: 620, height: 40 }
      ],

      collectibles: [
        { x: 180, y: 450, type: 'coin' },
        { x: 500, y: 400, type: 'coin' },
        { x: 690, y: 340, type: 'coin' },
        { x: 870, y: 280, type: 'coin' },

        { x: 1160, y: 310, type: 'shield' },
        { x: 1550, y: 210, type: 'damage' },
        { x: 1940, y: 310, type: 'double_jump' },

        // Hidden Bonus Shard 5 (High apex crown)
        { x: 1570, y: 110, type: 'bonus_shard' },

        { x: 1300, y: 450, type: 'coin' },
        { x: 1740, y: 450, type: 'coin' }
      ],

      checkpoints: [
        { x: 1040, y: 440 }
      ],

      enemies: [],

      boss: {
        type: 'CoreGuardian',
        x: 1540,
        y: 280
      }
    }
  };

  // Spec G: Data-driven levels validation function
  // Checks that every level has a valid spawn, exit, reachable bounds, and platforms
  window.CQ.validateLevels = function() {
    const data = window.CQ.LevelData;
    const errors = [];
    for (let id = 1; id <= 5; id++) {
      const lvl = data[id];
      if (!lvl) {
        errors.push(`Level ${id} missing entirely!`);
        continue;
      }
      if (!lvl.playerStart || typeof lvl.playerStart.x !== 'number' || typeof lvl.playerStart.y !== 'number') {
        errors.push(`Level ${id} missing valid playerStart coordinate.`);
      }
      if (!lvl.exit || typeof lvl.exit.x !== 'number' || typeof lvl.exit.y !== 'number') {
        errors.push(`Level ${id} missing valid exit portal coordinate.`);
      }
      if (!lvl.platforms || !Array.isArray(lvl.platforms) || lvl.platforms.length === 0) {
        errors.push(`Level ${id} has no platforms.`);
      }
      if (lvl.playerStart && lvl.exit && lvl.playerStart.x >= lvl.exit.x) {
        errors.push(`Level ${id} spawn is at or beyond exit.`);
      }
      if (!lvl.collectibles || lvl.collectibles.length === 0) {
        errors.push(`Level ${id} has no collectibles.`);
      }
      const hasBonusShard = (lvl.collectibles || []).some(c => c.type === 'bonus_shard');
      if (!hasBonusShard) {
        errors.push(`Level ${id} missing hidden bonus shard.`);
      }
    }
    return {
      valid: errors.length === 0,
      errors: errors
    };
  };
})();
