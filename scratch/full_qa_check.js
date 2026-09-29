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
        const details = msg.params.exceptionDetails;
        console.error('JS EXCEPTION:', details.text, details.exception ? details.exception.description : '');
        this.errors.push(details);
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
  const tempProfile = path.join(os.tmpdir(), `cyber_quest_qa_${Date.now()}`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
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
      const v = await getJson('http://127.0.0.1:9225/json/version');
      if (v) break;
    } catch (e) {}
  }

  const pages = await getJson('http://127.0.0.1:9225/json/list');
  const targetPage = pages.find(p => p.url.includes('127.0.0.1:3000')) || pages[0];
  const cdp = new CDPClient(targetPage.webSocketDebuggerUrl);
  await cdp.connect();

  await sleep(1500); // Wait for boot

  console.log('--- TEST 1: Boot & Main Menu ---');
  const initialState = await cdp.eval('window.CQ.GameInstance.state');
  console.log('Game state at menu:', initialState);

  console.log('\n--- TEST 2: Sector 1 ---');
  await cdp.eval('window.CQ.GameInstance.startLevel(1)');
  await sleep(400);
  await cdp.eval(`
    window.CQ.GameInstance.player.performAttack();
  `);
  await sleep(300);

  console.log('\n--- TEST 3: Sector 4 (Core Defense) ---');
  await cdp.eval('window.CQ.GameInstance.startLevel(4)');
  await sleep(400);
  // Teleport player near shooter enemy
  console.log('Testing Shooter enemy firing in Sector 4...');
  await cdp.eval(`
    window.CQ.GameInstance.player.x = 900;
    window.CQ.GameInstance.player.y = 400;
  `);
  await sleep(1000); // Shooter triggers and fires projectile

  console.log('\n--- TEST 4: Sector 5 Boss Fight (The Core) ---');
  await cdp.eval('window.CQ.GameInstance.startLevel(5)');
  await sleep(500);
  console.log('Testing Boss attacks in Sector 5...');
  // Force boss to do all its attacks:
  await cdp.eval(`
    const boss = window.CQ.GameInstance.level.boss;
    const player = window.CQ.GameInstance.player;
    const projs = window.CQ.GameInstance.level.projectiles;
    const cam = window.CQ.GameInstance.camera;

    // Test phase 1 attack
    boss.firePlasmaVolley(player, projs);
    boss.dropEnergyBombs(projs);

    // Test phase 2
    boss.phase = 2;
    boss.decideNextAttack(player, projs, cam);

    // Test phase 3
    boss.phase = 3;
    boss.decideNextAttack(player, projs, cam);
  `);
  await sleep(1000);

  // Check boss takeDamage & defeat
  console.log('Testing Boss damage & defeat...');
  await cdp.eval(`
    const boss = window.CQ.GameInstance.level.boss;
    boss.takeDamage(700, 0);
  `);
  await sleep(1000);

  console.log('\nTotal errors collected:', cdp.errors.length);
  for (const err of cdp.errors) {
    console.error(err);
  }

  chromeProc.kill();
  process.exit(cdp.errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
