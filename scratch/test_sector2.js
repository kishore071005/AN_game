const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
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
      }
    };
    await this.send('Runtime.enable');
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
      returnByValue: true
    });
    return res.result ? res.result.value : null;
  }
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(os.tmpdir(), `cyber_quest_test_${Date.now()}`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--mute-audio',
    'http://127.0.0.1:3000'
  ]);

  let versionInfo = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      versionInfo = await getJson('http://127.0.0.1:9223/json/version');
      if (versionInfo) break;
    } catch (e) {}
  }
  if (!versionInfo) {
    console.error('Failed to connect to chrome');
    chromeProc.kill();
    return;
  }

  const pages = await getJson('http://127.0.0.1:9223/json/list');
  const targetPage = pages.find(p => p.url.includes('127.0.0.1:3000')) || pages[0];
  const cdp = new CDPClient(targetPage.webSocketDebuggerUrl);
  await cdp.connect();

  await sleep(1500); // Wait for boot

  // Check initial visibility of elements
  const toastVisible = await cdp.eval(`
    const el = document.getElementById('achievement-toast');
    const style = window.getComputedStyle(el);
    ({ display: style.display, visibility: style.visibility, opacity: style.opacity, classes: el.className })
  `);
  console.log('Initial achievement-toast style:', toastVisible);

  const promptVisible = await cdp.eval(`
    const el = document.getElementById('tutorial-prompt');
    const style = window.getComputedStyle(el);
    ({ display: style.display, visibility: style.visibility, opacity: style.opacity, classes: el.className, text: el.innerText })
  `);
  console.log('Initial tutorial-prompt style:', promptVisible);

  // Start Sector 2
  console.log('\n--- Starting Sector 2 ---');
  await cdp.eval('window.CQ.GameInstance.startLevel(2)');
  await sleep(500);

  console.log('Sector 2 started. Current state:', await cdp.eval('window.CQ.GameInstance.state'));

  const promptInS2 = await cdp.eval(`
    const el = document.getElementById('tutorial-prompt');
    const style = window.getComputedStyle(el);
    ({ display: style.display, classes: el.className, text: el.innerText })
  `);
  console.log('Tutorial prompt in Sector 2:', promptInS2);

  // Let's test player dying in Sector 2
  console.log('\n--- Killing player in Sector 2 ---');
  await cdp.eval('window.CQ.GameInstance.player.hp = 0; window.CQ.GameInstance.player.die();');
  await sleep(1200);

  const gameOverModalState = await cdp.eval(`
    const el = document.getElementById('game-over-modal');
    const style = window.getComputedStyle(el);
    ({ display: style.display, classes: el.className, state: window.CQ.GameInstance.state, deathTriggered: window.CQ.GameInstance.deathTriggered })
  `);
  console.log('After death 1, Game Over modal:', gameOverModalState);

  // Click RESPAWN AT CHECKPOINT
  console.log('\n--- Clicking Respawn at Checkpoint ---');
  await cdp.eval('document.getElementById("btn-respawn-checkpoint").click()');
  await sleep(500);

  const afterRespawnState = await cdp.eval(`({
    state: window.CQ.GameInstance.state,
    isDead: window.CQ.GameInstance.player.isDead,
    deathTriggered: window.CQ.GameInstance.deathTriggered,
    playerX: window.CQ.GameInstance.player.x,
    playerY: window.CQ.GameInstance.player.y,
    checkpointX: window.CQ.GameInstance.player.checkpointX,
    checkpointY: window.CQ.GameInstance.player.checkpointY
  })`);
  console.log('After respawn 1:', afterRespawnState);

  // Kill player a 2nd time!
  console.log('\n--- Killing player a 2nd time in Sector 2 ---');
  await cdp.eval('window.CQ.GameInstance.player.hp = 0; window.CQ.GameInstance.player.die();');
  await sleep(1200);

  const gameOverModalState2 = await cdp.eval(`
    const el = document.getElementById('game-over-modal');
    const style = window.getComputedStyle(el);
    ({ display: style.display, classes: el.className, state: window.CQ.GameInstance.state, deathTriggered: window.CQ.GameInstance.deathTriggered })
  `);
  console.log('After death 2, Game Over modal:', gameOverModalState2);

  // Test falling out of Sector 2 (bottom pit)
  console.log('\n--- Testing falling out of bottom pit ---');
  await cdp.eval('window.CQ.GameInstance.startLevel(2)');
  await sleep(300);
  // Teleport player over spike pit
  await cdp.eval('window.CQ.GameInstance.player.x = 600; window.CQ.GameInstance.player.y = 500;');
  await sleep(1500);

  const fallState = await cdp.eval(`({
    isDead: window.CQ.GameInstance.player.isDead,
    y: window.CQ.GameInstance.player.y,
    state: window.CQ.GameInstance.state,
    deathTriggered: window.CQ.GameInstance.deathTriggered,
    gameOverDisplay: window.getComputedStyle(document.getElementById('game-over-modal')).display
  })`);
  console.log('Fall into pit state:', fallState);

  // Test reaching exit portal in Sector 2
  console.log('\n--- Testing reaching exit in Sector 2 ---');
  await cdp.eval('window.CQ.GameInstance.startLevel(2)');
  await sleep(300);
  await cdp.eval('window.CQ.GameInstance.player.x = 2785; window.CQ.GameInstance.player.y = 455;');
  await sleep(500);

  const exitState = await cdp.eval(`({
    state: window.CQ.GameInstance.state,
    completeModalDisplay: window.getComputedStyle(document.getElementById('level-complete-modal')).display,
    completeButtons: Array.from(document.getElementById('level-complete-modal').querySelectorAll('button')).map(b => ({ id: b.id, text: b.innerText }))
  })`);
  console.log('Exit portal state in Sector 2:', exitState);

  chromeProc.kill();
}

main().catch(console.error);
