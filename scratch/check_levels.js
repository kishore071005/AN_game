global.window = {};
require('../src/constants.js');
require('../src/level_data.js');

const levels = window.CQ.LevelData;
for (const id in levels) {
  const lvl = levels[id];
  console.log(`\n=== Checking Level ${id}: ${lvl.name} ===`);
  console.log(`Width: ${lvl.width}, Height: ${lvl.height}`);
  console.log(`Platforms: ${lvl.platforms.length}, Moving: ${lvl.movingPlatforms.length}, Falling: ${lvl.fallingPlatforms.length}`);
  console.log(`Hazards: ${lvl.hazards.length}, Enemies: ${lvl.enemies.length}, Collectibles: ${lvl.collectibles.length}`);
  
  // Check exit position
  console.log(`Player start: (${lvl.playerStart.x}, ${lvl.playerStart.y})`);
  console.log(`Exit: (${lvl.exit.x}, ${lvl.exit.y}, ${lvl.exit.width}x${lvl.exit.height})`);

  // Check if exit is within level
  if (lvl.exit.x < 0 || lvl.exit.x + lvl.exit.width > lvl.width || lvl.exit.y < 0 || lvl.exit.y + lvl.exit.height > lvl.height) {
    console.error(`ERROR: Exit out of bounds in level ${id}!`);
  }

  // Check if player start is within level
  if (lvl.playerStart.x < 0 || lvl.playerStart.x > lvl.width || lvl.playerStart.y < 0 || lvl.playerStart.y > lvl.height) {
    console.error(`ERROR: Player start out of bounds in level ${id}!`);
  }

  // Check hazards
  for (const h of lvl.hazards) {
    if (h.x < 0 || h.x + h.width > lvl.width || h.y < 0 || h.y + h.height > lvl.height) {
      console.warn(`Warning: Hazard outside level bounds:`, h);
    }
  }

  // Check moving platforms min/max
  for (const mp of lvl.movingPlatforms) {
    if (mp.axis === 'x') {
      if (mp.minX >= mp.maxX) console.error(`ERROR: Moving platform minX >= maxX:`, mp);
    } else if (mp.axis === 'y') {
      if (mp.minY >= mp.maxY) console.error(`ERROR: Moving platform minY >= maxY:`, mp);
    }
  }

  // Check collectibles
  for (const c of lvl.collectibles) {
    if (c.x < 0 || c.x > lvl.width || c.y < 0 || c.y > lvl.height) {
      console.error(`ERROR: Collectible out of bounds:`, c);
    }
  }
}
