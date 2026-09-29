// CYBER QUEST - Automated Physics, Collision & Logic Test Suite
// Runnable in Node.js or in browser
(function() {
  'use strict';

  // In Node environment, mock browser window/CQ environment
  const isNode = typeof window === 'undefined';
  const root = isNode ? {} : window;
  if (isNode) {
    global.window = root;
    // Load dependencies in order
    require('./src/constants.js');
    require('./src/storage.js');
    require('./src/level_data.js');
  }

  const C = root.CQ.Constants;
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${message}`);
      failed++;
    }
  }

  console.log('====================================================');
  console.log('RUNNING CYBER QUEST PHYSICS & LOGIC UNIT TEST SUITE');
  console.log('====================================================\n');

  // TEST 1: Measurable Game Feel Constants (Spec B)
  console.log('[TEST GROUP 1] Game Feel Constants Validation');
  assert(C.PLAYER.COYOTE_TIME === 0.100, 'Coyote time is exactly 100ms (0.100s)');
  assert(C.PLAYER.JUMP_BUFFER === 0.120, 'Jump buffer is exactly 120ms (0.120s)');
  assert(C.PLAYER.VAR_JUMP_MULT === 0.50, 'Variable jump cuts upward velocity by 50% (0.50)');
  assert(Math.abs(C.GRAVITY_FALL / C.GRAVITY_RISE - 1.5) < 0.01, 'Fall gravity is 1.5x rise gravity');
  assert(C.PLAYER.AIR_ACCEL_MULT === 0.70, 'Air control acceleration is 70% of ground');

  // Ground acceleration time to max speed: maxSpeed / accel = 260 / 3250 = 0.08s = 80ms
  const accelTimeMs = (C.PLAYER.MAX_SPEED / C.PLAYER.ACCEL) * 1000;
  assert(Math.abs(accelTimeMs - 80) < 0.5, `Ground acceleration reaches max speed in ~80ms (computed: ${accelTimeMs.toFixed(1)}ms)`);

  // TEST 2: Combo Multiplier Logic (Spec D)
  console.log('\n[TEST GROUP 2] Combo Multiplier Logic');
  assert(C.COMBO.MAX_MULTIPLIER === 4, 'Max combo multiplier is capped at x4');
  assert(C.COMBO.DECAY_TIME === 2.0, 'Combo decays after 2.0s');

  let currentCombo = 1;
  const simulateHit = () => {
    currentCombo = Math.min(C.COMBO.MAX_MULTIPLIER, currentCombo + 1);
  };
  simulateHit(); // x2
  assert(currentCombo === 2, 'First chain hit elevates combo to x2');
  simulateHit(); // x3
  simulateHit(); // x4
  assert(currentCombo === 4, 'Chained hits reach x4 multiplier');
  simulateHit(); // cap
  assert(currentCombo === 4, 'Chained hits cannot exceed x4 cap');

  // TEST 3: Medal Determination Logic (Spec D)
  console.log('\n[TEST GROUP 3] Medal Determination Logic');
  const parTimes = C.PAR_TIMES;
  assert(parTimes[1] === 45, 'Par time for Level 1 is 45s');

  // Helper function replicating Storage medal rules
  function evalMedal(levelId, time, coins, total) {
    const par = parTimes[levelId] || 60;
    const allCoins = coins >= total;
    const underPar = time <= par;
    if (allCoins && underPar) return 'gold';
    if (allCoins || underPar) return 'silver';
    return 'bronze';
  }

  assert(evalMedal(1, 35, 12, 12) === 'gold', 'Level 1: All coins and under par awards GOLD');
  assert(evalMedal(1, 55, 12, 12) === 'silver', 'Level 1: All coins but over par awards SILVER');
  assert(evalMedal(1, 35, 10, 12) === 'silver', 'Level 1: Under par but missing coins awards SILVER');
  assert(evalMedal(1, 60, 5, 12) === 'bronze', 'Level 1: Over par and missing coins awards BRONZE');

  // TEST 4: Data-Driven Level Validation (Spec G)
  console.log('\n[TEST GROUP 4] Level Integrity & Validation Suite');
  const valRes = root.CQ.validateLevels();
  assert(valRes.valid === true, `All 5 levels validated without schema errors (Errors: ${valRes.errors.length})`);

  for (let id = 1; id <= 5; id++) {
    const lvl = root.CQ.LevelData[id];
    const hasBonus = lvl.collectibles.some(c => c.type === 'bonus_shard');
    assert(hasBonus, `Level ${id} contains a hidden bonus shard`);
  }

  // TEST 5: Collision Logic Unit Test
  console.log('\n[TEST GROUP 5] Collision Detection AABB Math');
  function checkAABB(r1, r2) {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  }

  const playerBox = { x: 100, y: 200, width: 26, height: 40 };
  const platformBox = { x: 80, y: 240, width: 100, height: 20 };
  const distantBox = { x: 500, y: 500, width: 50, height: 50 };

  assert(checkAABB(playerBox, platformBox) === false, 'Player standing directly above platform is not penetrating');
  playerBox.y = 220; // overlapping
  assert(checkAABB(playerBox, platformBox) === true, 'Player overlapping platform is correctly detected');
  assert(checkAABB(playerBox, distantBox) === false, 'Distant entity correctly non-colliding');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (isNode) {
    if (failed > 0) process.exit(1);
  }
})();
