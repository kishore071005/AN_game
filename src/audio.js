// CYBER QUEST - Procedural Web Audio Synthesizer & Synthwave Engine (Enhanced v2)
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  class AudioManager {
    constructor() {
      this.ctx = null;
      this.soundEnabled = true;
      this.musicEnabled = true;
      this.soundVolume = 0.85;
      this.musicVolume = 0.45;
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;

      // Music sequencer state
      this.musicTimer = null;
      this.musicStep = 0;
      this.currentTrack = null;

      // Note frequencies (Hz) for cyberpunk synthwave scales
      this.NOTES = {
        C2: 65.41, D2: 73.42, Eb2: 77.78, F2: 87.31, Gb2: 92.50, G2: 98.00, Ab2: 103.83, Bb2: 116.54,
        C3: 130.81, D3: 146.83, Eb3: 155.56, F3: 174.61, Gb3: 185.00, G3: 196.00, Ab3: 207.65, Bb3: 233.08,
        C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, Gb4: 369.99, G4: 392.00, Ab4: 415.30, Bb4: 466.16,
        C5: 523.25, D5: 587.33, Eb5: 622.25, F5: 698.46, G5: 783.99, Ab5: 830.61, Bb5: 932.33, C6: 1046.50
      };
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported.');
        return;
      }

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);

      // Load settings from storage
      const storage = window.CQ.Storage;
      if (storage) {
        const settings = storage.getSettings();
        this.soundEnabled = settings.soundEnabled !== false;
        this.musicEnabled = settings.musicEnabled !== false;
        this.soundVolume = settings.soundVolume !== undefined ? settings.soundVolume : 0.85;
        this.musicVolume = settings.musicVolume !== undefined ? settings.musicVolume : 0.45;
      }

      this.updateGains();
    }

    resume() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    updateGains() {
      if (!this.sfxGain || !this.musicGain || !this.ctx) return;
      const sfxVol = this.soundEnabled ? this.soundVolume : 0;
      const musVol = this.musicEnabled ? this.musicVolume : 0;
      this.sfxGain.gain.setValueAtTime(sfxVol, this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(musVol, this.ctx.currentTime);
    }

    setSoundEnabled(val) {
      this.soundEnabled = !!val;
      this.updateGains();
      if (window.CQ.Storage) window.CQ.Storage.setSetting('soundEnabled', this.soundEnabled);
    }

    setMusicEnabled(val) {
      this.musicEnabled = !!val;
      this.updateGains();
      if (window.CQ.Storage) window.CQ.Storage.setSetting('musicEnabled', this.musicEnabled);
      if (this.musicEnabled && !this.musicTimer) {
        this.startMusic(this.currentTrack || 'gameplay');
      }
    }

    setSoundVolume(val) {
      this.soundVolume = Math.max(0, Math.min(1, parseFloat(val)));
      this.updateGains();
      if (window.CQ.Storage) window.CQ.Storage.setSetting('soundVolume', this.soundVolume);
    }

    setMusicVolume(val) {
      this.musicVolume = Math.max(0, Math.min(1, parseFloat(val)));
      this.updateGains();
      if (window.CQ.Storage) window.CQ.Storage.setSetting('musicVolume', this.musicVolume);
    }

    // -------------------------------------------------------------
    // SOUND EFFECTS (Synthesized with oscillators, noise, and envelopes)
    // -------------------------------------------------------------

    playJump() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.15);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.17);
    }

    playDoubleJump() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(740, t + 0.18);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.21);
    }

    playSlash() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      // Noise burst for swoosh
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.12);
      filter.Q.value = 3.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      // Sci-fi high tone sweep
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);
      oscGain.gain.setValueAtTime(0.2, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);

      noise.start(t);
      noise.stop(t + 0.13);
      osc.start(t);
      osc.stop(t + 0.13);
    }

    playCoin() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t); // A5
      osc.frequency.setValueAtTime(1318.51, t + 0.07); // E6

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.23);
    }

    playBonusShard() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const notes = [587.33, 880.00, 1174.66, 1760.00]; // D5, A5, D6, A6 triumphant fanfaric chime
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);

        gain.gain.setValueAtTime(0.3, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.36);
      });
    }

    playCombo(multiplier = 2) {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const baseFreq = 440 * Math.pow(1.2, multiplier);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.12);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.16);
    }

    playAchievement() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major
      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.07);

        gain.gain.setValueAtTime(0.28, t + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.07 + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.52);
      });
    }

    playEnemyHit() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.1);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.12);
    }

    playEnemyDeath() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.28);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.32);
    }

    playPlayerDamage() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.linearRampToValueAtTime(70, t + 0.18);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.21);
    }

    playPlayerDeath() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.6);

      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.68);
    }

    playCheckpoint() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);

        gain.gain.setValueAtTime(0.2, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.26);
      });
    }

    playPowerup() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(950, t + 0.25);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.3);
    }

    playBossAttack() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.3);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.34);
    }

    playBossLaser() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.4);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.42);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.45);
    }

    playBossSlam() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.58);
    }

    playBossDefeat() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 1.2);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 1.35);
    }

    playMenuNavigate() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.06);
    }

    playMenuSelect() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);
    }

    playLevelComplete() {
      if (!this.soundEnabled || !this.ctx) return;
      this.resume();
      const t = this.ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C major pentatonic
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.12);

        gain.gain.setValueAtTime(0.35, t + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t + idx * 0.12);
        osc.stop(t + idx * 0.12 + 0.42);
      });
    }

    // -------------------------------------------------------------
    // PROCEDURAL SYNTHWAVE MUSIC GENERATOR
    // Looping synthwave-style background track with intensified boss mode
    // -------------------------------------------------------------

    startMusic(trackType = 'gameplay') {
      this.currentTrack = trackType;
      if (this.musicTimer) clearInterval(this.musicTimer);
      if (!this.musicEnabled) return;
      this.resume();

      const isBoss = trackType === 'boss';
      const stepIntervalMs = isBoss ? 100 : 125; // 150 BPM for boss, 120 BPM for gameplay
      this.musicStep = 0;

      const bassPatterns = {
        gameplay: [
          'C2', 'C2', 'C2', 'Eb2', 'C2', 'C2', 'F2', 'G2',
          'C2', 'C2', 'C2', 'Eb2', 'Bb2', 'Bb2', 'G2', 'Eb2',
          'Ab2', 'Ab2', 'Ab2', 'C3', 'Ab2', 'Ab2', 'Bb2', 'C3',
          'G2', 'G2', 'G2', 'Bb2', 'F2', 'Eb2', 'D2', 'Eb2'
        ],
        boss: [
          'C2', 'C2', 'Eb2', 'C2', 'F2', 'Gb2', 'G2', 'C3',
          'C2', 'C2', 'Eb2', 'C2', 'Ab2', 'G2', 'Gb2', 'F2',
          'C2', 'C2', 'Eb2', 'C2', 'F2', 'Gb2', 'G2', 'Bb2',
          'Bb2', 'Ab2', 'G2', 'F2', 'Gb2', 'F2', 'Eb2', 'D2'
        ]
      };

      const arpPatterns = {
        gameplay: [
          'C4', 'Eb4', 'G4', 'Bb4', 'C5', 'Bb4', 'G4', 'Eb4',
          'Eb4', 'G4', 'Bb4', 'C5', 'Eb5', 'C5', 'Bb4', 'G4',
          'Ab3', 'C4', 'Eb4', 'Ab4', 'C5', 'Ab4', 'Eb4', 'C4',
          'G3', 'Bb3', 'D4', 'G4', 'Bb4', 'G4', 'D4', 'Bb3'
        ],
        boss: [
          'C4', 'Eb4', 'Gb4', 'G4', 'C5', 'Gb4', 'G4', 'C5',
          'Eb5', 'D5', 'C5', 'G4', 'Gb4', 'F4', 'Eb4', 'D4',
          'C4', 'Eb4', 'Gb4', 'G4', 'Ab4', 'G4', 'Eb4', 'D4',
          'C5', 'Bb4', 'Ab4', 'G4', 'F4', 'Eb4', 'D4', 'C4'
        ]
      };

      this.musicTimer = setInterval(() => {
        if (!this.musicEnabled || !this.ctx) return;
        const currentPattern = bassPatterns[this.currentTrack] || bassPatterns.gameplay;
        const currentArp = arpPatterns[this.currentTrack] || arpPatterns.gameplay;
        const step = this.musicStep % currentPattern.length;

        const t = this.ctx.currentTime;

        // Kick drum (boss has double kick energy)
        if (step % 4 === 0 || (isBoss && step % 8 === 2)) {
          this.playKick(t);
        }

        // Snare on backbeats
        if (step % 8 === 4) {
          this.playSnare(t);
        }

        // Hi-hat on offbeats
        if (step % 2 === 1 || (isBoss && step % 4 === 2)) {
          this.playHiHat(t);
        }

        // Bass synth note
        const noteName = currentPattern[step];
        if (noteName && this.NOTES[noteName]) {
          this.playBassSynth(this.NOTES[noteName], t, isBoss ? 0.08 : 0.11, isBoss);
        }

        // Arpeggio lead synth
        const arpNote = currentArp[step];
        if (arpNote && this.NOTES[arpNote]) {
          this.playArpSynth(this.NOTES[arpNote], t, isBoss ? 0.07 : 0.09);
        }

        this.musicStep++;
      }, stepIntervalMs);
    }

    playKick(t) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.1);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.11);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.12);
    }

    playSnare(t) {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      noise.start(t);
      noise.stop(t + 0.09);
    }

    playHiHat(t) {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      noise.start(t);
      noise.stop(t + 0.04);
    }

    playBassSynth(freq, t, dur, isHeavy = false) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = isHeavy ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isHeavy ? 600 : 450, t);
      filter.frequency.exponentialRampToValueAtTime(isHeavy ? 250 : 180, t + dur);

      gain.gain.setValueAtTime(isHeavy ? 0.42 : 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + dur + 0.01);
    }

    playArpSynth(freq, t, dur) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + dur + 0.01);
    }

    stopMusic() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }
  }

  window.CQ.Audio = new AudioManager();
})();
