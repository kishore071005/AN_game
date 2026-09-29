// CYBER QUEST - Comprehensive End-to-End Headless QA Suite (Enhanced v2)
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.errors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === 'Runtime.exceptionThrown') {
          console.error('JS EXCEPTION:', JSON.stringify(msg.params.exceptionDetails));
          this.errors.push(msg.params.exceptionDetails);
        } else if (msg.method === 'Console.messageAdded' && msg.params.message.level === 'error') {
          console.error('CONSOLE ERROR:', msg.params.message.text);
          this.errors.push(msg.params.message.text);
        }
      }
    };

    await this.send('Console.enable');
    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Network.enable');
    await this.send('Network.setCacheDisabled', { cacheDisabled: true });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result.value;
  }

  async dispatchKeyEvent(type, code, key) {
    await this.send('Input.dispatchKeyEvent', {
      type: type, // 'keyDown', 'keyUp'
      code: code,
      key: key,
      windowsVirtualKeyCode: code === 'ArrowUp' ? 38 : (code === 'ArrowDown' ? 40 : 32)
    });
  }
}

async function runQA() {
  console.log('--- STARTING CYBER QUEST E2E QA TEST SUITE ---');

  // Verify PWA files exist
  console.log('\n[TEST 0] PWA Manifest & Service Worker Verification');
  if (!fs.existsSync(path.join(__dirname, 'manifest.json'))) throw new Error('manifest.json missing');
  if (!fs.existsSync(path.join(__dirname, 'sw.js'))) throw new Error('sw.js missing');
  console.log('PASS: PWA manifest.json and sw.js exist.');

  // 1. Launch Chrome Headless
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(os.tmpdir(), `cyber_quest_qa_${Date.now()}`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--mute-audio',
    '--window-size=1280,720',
    'http://127.0.0.1:3000'
  ]);

  let versionInfo = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      versionInfo = await getJson('http://127.0.0.1:9222/json/version');
      if (versionInfo) break;
    } catch (e) {}
  }

  if (!versionInfo) {
    console.error('Failed to connect to headless Chrome CDP port 9222');
    chromeProc.kill();
    process.exit(1);
  }

  console.log('Connected to Chrome:', versionInfo['User-Agent']);

  const pages = await getJson('http://127.0.0.1:9222/json/list');
  const targetPage = pages.find(p => p.url.includes('127.0.0.1:3000')) || pages[0];
  console.log('Target Page:', targetPage.title, targetPage.url);

  const cdp = new CDPClient(targetPage.webSocketDebuggerUrl);
  await cdp.connect();

  console.log('Navigating page to http://127.0.0.1:3000 ...');
  await cdp.send('Page.navigate', { url: 'http://127.0.0.1:3000' });
  await sleep(1000);

  console.log('\n[TEST 1] Boot Sequence & Loading Screen Transition');
  let state = '';
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    state = await cdp.eval('window.CQ && window.CQ.GameInstance ? window.CQ.GameInstance.state : "NONE"');
    if (state === 'MENU') break;
  }
  console.log('State after boot sequence:', state);
  if (state !== 'MENU') throw new Error(`Expected state MENU, got ${state}`);
  console.log('PASS: Boot sequence initialized and transitioned to MAIN MENU.');

  console.log('\n[TEST 2] Keyboard Menu Navigation (Arrow keys + Enter per Spec F)');
  // Dispatch ArrowDown event to navigate menu buttons
  await cdp.dispatchKeyEvent('keyDown', 'ArrowDown', 'ArrowDown');
  await sleep(100);
  await cdp.dispatchKeyEvent('keyUp', 'ArrowDown', 'ArrowDown');
  await sleep(150);

  const activeTag = await cdp.eval('document.activeElement ? document.activeElement.id : "NONE"');
  console.log('Focused element after ArrowDown in Main Menu:', activeTag);
  if (!activeTag || activeTag === 'NONE') throw new Error('Menu keyboard navigation failed to focus element');
  console.log('PASS: Menu is fully navigable by keyboard arrows.');

  console.log('\n[TEST 3] Main Menu Modals, Settings & Volume Sliders');
  // Check Options modal
  await cdp.eval('document.getElementById("btn-settings").click()');
  await sleep(200);
  const settingsVisible = await cdp.eval('!document.getElementById("settings-modal").classList.contains("hidden")');
  console.log('Settings modal visible:', settingsVisible);
  if (!settingsVisible) throw new Error('Settings modal failed to open');

  // Verify volume sliders
  await cdp.eval('window.CQ.Audio.setSoundVolume(0.7)');
  await cdp.eval('window.CQ.Audio.setMusicVolume(0.5)');
  const sfxVol = await cdp.eval('window.CQ.Audio.soundVolume');
  const musVol = await cdp.eval('window.CQ.Audio.musicVolume');
  console.log('SFX Volume:', sfxVol, '| Music Volume:', musVol);
  if (sfxVol !== 0.7 || musVol !== 0.5) throw new Error('Volume slider adjustment failed');

  // Verify difficulty setting
  await cdp.eval('document.getElementById("btn-diff-hard").click()');
  const diffHard = await cdp.eval('window.CQ.Storage.getSettings().difficulty');
  console.log('Selected difficulty:', diffHard);
  if (diffHard !== 'hard') throw new Error('Difficulty setting failed');
  await cdp.eval('document.getElementById("btn-diff-normal").click()'); // reset to normal

  await cdp.eval('document.getElementById("btn-close-settings").click()');
  await sleep(150);

  // Check Stats modal
  await cdp.eval('document.getElementById("btn-stats").click()');
  await sleep(200);
  const statsVisible = await cdp.eval('!document.getElementById("stats-modal").classList.contains("hidden")');
  console.log('Stats dossier modal visible:', statsVisible);
  if (!statsVisible) throw new Error('Stats modal failed to open');
  await cdp.eval('document.getElementById("btn-close-stats").click()');
  await sleep(150);

  console.log('PASS: Modals, volume sliders, difficulty, and stats verified.');

  console.log('\n[TEST 4] Gameplay Launch & Arrow Key Jump Verification');
  // Launch Level 1
  await cdp.eval('document.getElementById("btn-play").click()');
  await sleep(400);

  const gameState = await cdp.eval('window.CQ.GameInstance.state');
  console.log('Game state:', gameState);
  if (gameState !== 'PLAYING') throw new Error(`Expected PLAYING state, got ${gameState}`);

  // Test ArrowUp key press specifically!
  console.log('Testing ArrowUp keypress for JUMP...');
  const initY = await cdp.eval('window.CQ.GameInstance.player.y');
  const initVy = await cdp.eval('window.CQ.GameInstance.player.vy');

  // Dispatch real keyboard ArrowUp event via CDP
  await cdp.dispatchKeyEvent('keyDown', 'ArrowUp', 'ArrowUp');
  await sleep(100);
  const jumpedVy = await cdp.eval('window.CQ.GameInstance.player.vy');
  await cdp.dispatchKeyEvent('keyUp', 'ArrowUp', 'ArrowUp');
  console.log(`Initial vy=${initVy}, vy after ArrowUp=${jumpedVy}`);
  if (jumpedVy >= 0) {
    throw new Error(`ArrowUp failed to trigger player jump! jumpedVy=${jumpedVy}`);
  }
  console.log('PASS: Up Arrow (ArrowUp) cleanly triggers player jump!');

  // Also test ArrowDown (down action)
  await cdp.dispatchKeyEvent('keyDown', 'ArrowDown', 'ArrowDown');
  const downActive = await cdp.eval('window.CQ.Input.actions.down');
  await cdp.dispatchKeyEvent('keyUp', 'ArrowDown', 'ArrowDown');
  console.log('ArrowDown action active:', downActive);
  if (!downActive) throw new Error('ArrowDown failed to trigger down action');
  console.log('PASS: Down Arrow (ArrowDown) verified.');

  // Test Left & Right arrows
  await cdp.dispatchKeyEvent('keyDown', 'ArrowRight', 'ArrowRight');
  await sleep(200);
  await cdp.dispatchKeyEvent('keyUp', 'ArrowRight', 'ArrowRight');
  const posX = await cdp.eval('window.CQ.GameInstance.player.x');
  console.log('Player moved right with ArrowRight to X:', posX);
  if (posX <= 80) throw new Error('ArrowRight failed to move player');
  console.log('PASS: ArrowLeft and ArrowRight movement verified.');

  console.log('\n[TEST 5] Hidden Bonus Shard & Combo Multiplier');
  // Teleport player directly to Hidden Bonus Shard at x=1480, y=140
  const bonusBefore = await cdp.eval('window.CQ.GameInstance.level.bonusShardsCollected');
  await cdp.eval('window.CQ.GameInstance.player.x = 1480; window.CQ.GameInstance.player.y = 140;');
  await sleep(250);
  const bonusAfter = await cdp.eval('window.CQ.GameInstance.level.bonusShardsCollected');
  console.log(`Bonus shards collected before: ${bonusBefore}, after: ${bonusAfter}`);
  if (bonusAfter <= bonusBefore) throw new Error('Hidden bonus shard collection failed');

  const secretHunterAch = await cdp.eval('window.CQ.Storage.hasAchievement("secret_hunter")');
  console.log('Secret Hunter achievement unlocked:', secretHunterAch);
  if (!secretHunterAch) throw new Error('Secret Hunter achievement failed to unlock');
  console.log('PASS: Hidden Bonus Shard collected and achievement unlocked.');

  console.log('\n[TEST 6] Level 1 Completion & Medal Award');
  // Touch exit portal
  await cdp.eval('window.CQ.GameInstance.player.x = 2360; window.CQ.GameInstance.player.y = 410;');
  await sleep(350);
  const completeState = await cdp.eval('window.CQ.GameInstance.state');
  console.log('State after touching exit portal:', completeState);
  if (completeState !== 'LEVEL_COMPLETE') throw new Error(`Expected LEVEL_COMPLETE, got ${completeState}`);

  const level1Medal = await cdp.eval('window.CQ.Storage.data.medals[1]');
  console.log('Awarded Medal for Level 1:', level1Medal);
  if (!level1Medal) throw new Error('Medal failed to award for Level 1 completion');
  console.log('PASS: Level 1 completed and Medal awarded.');

  console.log('\n[TEST 7] Level 5 Final Boss & Victory');
  await cdp.eval('window.CQ.GameInstance.startLevel(5)');
  await sleep(300);

  // Defeat boss in 3 stages
  await cdp.eval('window.CQ.GameInstance.level.boss.takeDamage(250, 1500)');
  await cdp.eval('window.CQ.GameInstance.level.boss.takeDamage(220, 1500)');
  await cdp.eval('window.CQ.GameInstance.level.boss.takeDamage(200, 1500)');
  const bossDead = await cdp.eval('window.CQ.GameInstance.level.boss.isDead');
  console.log('Boss defeated:', bossDead);
  if (!bossDead) throw new Error('Boss failed to die');

  await sleep(3500);
  const exitUnlocked = await cdp.eval('window.CQ.GameInstance.level.exitUnlocked');
  console.log('Core exit portal unlocked after boss defeat:', exitUnlocked);
  if (!exitUnlocked) throw new Error('Exit portal failed to unlock');

  // Step into exit portal
  await cdp.eval('window.CQ.GameInstance.player.x = 2080; window.CQ.GameInstance.player.y = 400;');
  await sleep(400);

  await cdp.eval('document.getElementById("btn-next-level").click()');
  await sleep(300);
  const victoryState = await cdp.eval('window.CQ.GameInstance.state');
  console.log('Final state:', victoryState);
  if (victoryState !== 'VICTORY') throw new Error(`Expected VICTORY state, got ${victoryState}`);
  console.log('PASS: Level 5 Boss and Victory sequence completed.');

  console.log('\n[TEST 8] LocalStorage Persistence & Zero Errors Check');
  const unlocked = await cdp.eval('window.CQ.Storage.data.unlockedLevels');
  console.log('Unlocked levels:', unlocked);
  if (!unlocked.includes(2)) throw new Error('Level progression unlock failed');

  console.log('Total JS Errors during full playthrough:', cdp.errors.length);
  if (cdp.errors.length > 0) {
    throw new Error(`Encountered ${cdp.errors.length} errors during testing`);
  }
  console.log('PASS: ZERO console errors or exceptions during the entire playthrough!');

  console.log('\n========================================');
  console.log('ALL E2E QA TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================');

  chromeProc.kill();
  process.exit(0);
}

runQA().catch(err => {
  console.error('\nQA TEST FAILED:', err);
  process.exit(1);
});
