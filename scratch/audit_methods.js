const fs = require('fs');
const path = require('path');

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  navigator: {}
};
global.document = {
  getElementById: () => ({ addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } }),
  querySelectorAll: () => []
};

require('../src/constants.js');
require('../src/storage.js');
require('../src/audio.js');
require('../src/particles.js');
require('../src/camera.js');
require('../src/player.js');
require('../src/enemy.js');
require('../src/boss.js');
require('../src/level_data.js');
require('../src/level.js');
require('../src/input.js');
require('../src/ui.js');

const audioInstance = window.CQ.Audio;
const particlesInstance = window.CQ.Particles;
const storageInstance = window.CQ.Storage;

console.log('--- Checking Audio Methods ---');
const srcFiles = fs.readdirSync(path.join(__dirname, '../src')).filter(f => f.endsWith('.js'));
const allCode = srcFiles.map(f => ({
  file: f,
  code: fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')
}));

// Check window.CQ.Audio.<method> calls
const audioCalls = new Set();
for (const { file, code } of allCode) {
  const matches = code.matchAll(/window\.CQ\.Audio\.([a-zA-Z0-9_]+)\s*\(/g);
  for (const m of matches) {
    const fnName = m[1];
    if (typeof audioInstance[fnName] !== 'function') {
      console.error(`MISSING Audio method: ${fnName} called in ${file}`);
    } else {
      audioCalls.add(fnName);
    }
  }
}
console.log('Verified audio methods:', Array.from(audioCalls));

// Check window.CQ.Particles.<method> calls
console.log('\n--- Checking Particles Methods ---');
const particleCalls = new Set();
for (const { file, code } of allCode) {
  const matches = code.matchAll(/window\.CQ\.Particles\.([a-zA-Z0-9_]+)\s*\(/g);
  for (const m of matches) {
    const fnName = m[1];
    if (typeof particlesInstance[fnName] !== 'function') {
      console.error(`MISSING Particles method: ${fnName} called in ${file}`);
    } else {
      particleCalls.add(fnName);
    }
  }
}
console.log('Verified particle methods:', Array.from(particleCalls));

// Check window.CQ.Storage.<method> calls
console.log('\n--- Checking Storage Methods ---');
const storageCalls = new Set();
for (const { file, code } of allCode) {
  const matches = code.matchAll(/window\.CQ\.Storage\.([a-zA-Z0-9_]+)\s*\(/g);
  for (const m of matches) {
    const fnName = m[1];
    if (typeof storageInstance[fnName] !== 'function') {
      console.error(`MISSING Storage method: ${fnName} called in ${file}`);
    } else {
      storageCalls.add(fnName);
    }
  }
}
console.log('Verified storage methods:', Array.from(storageCalls));

// Check window.CQ.UI.<method> calls
console.log('\n--- Checking UI Methods ---');
const uiInstance = window.CQ.UI;
const uiCalls = new Set();
for (const { file, code } of allCode) {
  const matches = code.matchAll(/window\.CQ\.UI\.([a-zA-Z0-9_]+)\s*\(/g);
  for (const m of matches) {
    const fnName = m[1];
    if (typeof uiInstance[fnName] !== 'function') {
      console.error(`MISSING UI method: ${fnName} called in ${file}`);
    } else {
      uiCalls.add(fnName);
    }
  }
}
console.log('Verified UI methods:', Array.from(uiCalls));
