const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJson(url) {
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
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error('JS EXCEPTION:', JSON.stringify(msg.params.exceptionDetails));
        this.errors.push(msg.params.exceptionDetails);
      } else if (msg.method === 'Console.messageAdded' && msg.params.message.level === 'error') {
        console.error('CONSOLE ERROR:', msg.params.message.text);
        this.errors.push(msg.params.message.text);
      }
    };
    await this.send('Console.enable');
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
    if (res && res.exceptionDetails) {
      console.error('Eval Exception:', res.exceptionDetails);
    }
    return res && res.result ? res.result.value : null;
  }
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(os.tmpdir(), `cyber_quest_repro_${Date.now()}`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--mute-audio',
    'http://127.0.0.1:3000'
  ]);

  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const v = await getJson('http://127.0.0.1:9224/json/version');
      if (v) break;
    } catch (e) {}
  }

  const pages = await getJson('http://127.0.0.1:9224/json/list');
  const targetPage = pages.find(p => p.url.includes('127.0.0.1:3000')) || pages[0];
  const cdp = new CDPClient(targetPage.webSocketDebuggerUrl);
  await cdp.connect();

  await sleep(1500); // wait for boot

  console.log('--- Starting Sector 4 ---');
  await cdp.eval('window.CQ.GameInstance.startLevel(4)');
  await sleep(600);

  // Position player exactly where shown in screenshot: x = 860, y = 380
  console.log('Teleporting player to x = 860, y = 380 (above drone and laser)...');
  await cdp.eval(`
    window.CQ.GameInstance.player.x = 860;
    window.CQ.GameInstance.player.y = 380;
    window.CQ.GameInstance.player.vx = 0;
    window.CQ.GameInstance.player.vy = 0;
    window.CQ.GameInstance.player.facingRight = false;
  `);

  // Let 1 second run
  await sleep(1000);

  const state1 = await cdp.eval(`({
    x: window.CQ.GameInstance.player.x,
    y: window.CQ.GameInstance.player.y,
    vx: window.CQ.GameInstance.player.vx,
    vy: window.CQ.GameInstance.player.vy,
    onGround: window.CQ.GameInstance.player.onGround,
    isDead: window.CQ.GameInstance.player.isDead,
    hp: window.CQ.GameInstance.player.hp,
    state: window.CQ.GameInstance.player.state,
    gameState: window.CQ.GameInstance.state,
    hitStop: window.CQ.GameInstance.player.hitStopTimer,
    attackActive: window.CQ.GameInstance.player.attackActiveTimer
  })`);
  console.log('State after 1s at (860, 380):', state1);

  // Now perform an attack while falling/jumping near drone
  console.log('Performing attack...');
  await cdp.eval(`
    window.CQ.GameInstance.player.x = 860;
    window.CQ.GameInstance.player.y = 420;
    window.CQ.GameInstance.player.performAttack();
  `);

  await sleep(1000);

  const state2 = await cdp.eval(`({
    x: window.CQ.GameInstance.player.x,
    y: window.CQ.GameInstance.player.y,
    vx: window.CQ.GameInstance.player.vx,
    vy: window.CQ.GameInstance.player.vy,
    onGround: window.CQ.GameInstance.player.onGround,
    isDead: window.CQ.GameInstance.player.isDead,
    hp: window.CQ.GameInstance.player.hp,
    gameState: window.CQ.GameInstance.state,
    hitStop: window.CQ.GameInstance.player.hitStopTimer,
    enemies: window.CQ.GameInstance.level.enemies.map(e => ({ type: e.type, x: e.x, y: e.y, hp: e.hp, dead: e.isDead }))
  })`);
  console.log('State after attack near drone:', state2);

  console.log('Any errors captured?', cdp.errors);

  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
