const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
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
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }
  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempProfile = path.join(require('os').tmpdir(), `cq_snap_${Date.now()}`);
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    '--disable-gpu',
    '--window-size=1280,720',
    'http://127.0.0.1:3000'
  ]);

  let versionInfo = null;
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      versionInfo = await getJson('http://127.0.0.1:9223/json/version');
      if (versionInfo) break;
    } catch (e) {}
  }
  if (!versionInfo) { chromeProc.kill(); return; }

  const pages = await getJson('http://127.0.0.1:9223/json/list');
  const targetPage = pages.find(p => p.url.includes('127.0.0.1:3000')) || pages[0];
  const cdp = new CDPClient(targetPage.webSocketDebuggerUrl);
  await cdp.connect();

  await sleep(2500); // Wait for boot animation to reach main menu

  // Capture Main Menu Screenshot
  const snap1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('menu_screenshot.png', Buffer.from(snap1.data, 'base64'));
  console.log('Saved menu_screenshot.png');

  // Start Level 1
  await cdp.send('Runtime.evaluate', { expression: 'document.getElementById("btn-play").click()' });
  await sleep(1500); // Wait for level title card and spawn

  // Capture Gameplay Screenshot
  const snap2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('gameplay_screenshot.png', Buffer.from(snap2.data, 'base64'));
  console.log('Saved gameplay_screenshot.png');

  chromeProc.kill();
  process.exit(0);
}

capture().catch(console.error);
