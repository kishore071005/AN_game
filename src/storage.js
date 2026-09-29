// CYBER QUEST - Safe LocalStorage Manager (Enhanced v2)
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  const STORAGE_KEY = 'CYBER_QUEST_SAVE_V2';
  const LEGACY_STORAGE_KEY = 'CYBER_QUEST_SAVE_V1';

  const defaultSave = {
    unlockedLevels: [1],
    bestScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    bestTimes: { 1: null, 2: null, 3: null, 4: null, 5: null },
    medals: { 1: null, 2: null, 3: null, 4: null, 5: null },
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 0.85,
    musicVolume: 0.45,
    shakeEnabled: true,
    reduceMotion: false,
    highContrast: false,
    crtEnabled: true,
    colorblindMode: 'none',
    difficulty: 'normal', // 'casual', 'normal', 'hard'
    speedrunTimer: false,
    keyBindings: {
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
      jump: ['ArrowUp', 'KeyW', 'Space'],
      down: ['ArrowDown', 'KeyS'],
      attack: ['KeyJ', 'KeyX', 'KeyF'],
      interact: ['KeyE'],
      pause: ['Escape', 'KeyP']
    },
    achievements: [],
    stats: {
      totalPlayTime: 0,
      deaths: 0,
      enemiesDefeated: 0,
      coinsCollected: 0,
      jumps: 0,
      slashes: 0,
      bonusShardsFound: 0
    },
    totalCoins: 0,
    highestScore: 0
  };

  class StorageManager {
    constructor() {
      this.data = this.loadData();
    }

    loadData() {
      try {
        if (typeof localStorage === 'undefined') {
          return JSON.parse(JSON.stringify(defaultSave));
        }
        let raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          // Attempt migration from v1
          const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacy) {
            try {
              const parsedLegacy = JSON.parse(legacy);
              const merged = Object.assign({}, defaultSave, parsedLegacy);
              this.data = merged;
              this.saveData();
              return merged;
            } catch (e) {}
          }
          return JSON.parse(JSON.stringify(defaultSave));
        }
        const parsed = JSON.parse(raw);
        // Deep merge keyBindings & stats
        const merged = Object.assign({}, defaultSave, parsed);
        merged.keyBindings = Object.assign({}, defaultSave.keyBindings, parsed.keyBindings || {});
        merged.stats = Object.assign({}, defaultSave.stats, parsed.stats || {});
        merged.bestScores = Object.assign({}, defaultSave.bestScores, parsed.bestScores || {});
        merged.bestTimes = Object.assign({}, defaultSave.bestTimes, parsed.bestTimes || {});
        merged.medals = Object.assign({}, defaultSave.medals, parsed.medals || {});
        return merged;
      } catch (e) {
        return JSON.parse(JSON.stringify(defaultSave));
      }
    }

    saveData() {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    }

    isLevelUnlocked(levelNum) {
      return this.data.unlockedLevels.includes(levelNum);
    }

    unlockLevel(levelNum) {
      if (!this.data.unlockedLevels.includes(levelNum) && levelNum <= 5) {
        this.data.unlockedLevels.push(levelNum);
        this.data.unlockedLevels.sort((a, b) => a - b);
        this.saveData();
      }
    }

    recordLevelCompletion(levelNum, score, timeInSeconds, coinsCollected, totalCoins, tookDamage = true) {
      // Unlock next level
      this.unlockLevel(levelNum + 1);

      // Record best score
      const currentBestScore = this.data.bestScores[levelNum] || 0;
      if (score > currentBestScore) {
        this.data.bestScores[levelNum] = score;
      }

      // Record best time (lower is better)
      const currentBestTime = this.data.bestTimes[levelNum];
      if (currentBestTime === null || timeInSeconds < currentBestTime) {
        this.data.bestTimes[levelNum] = Math.round(timeInSeconds * 10) / 10;
      }

      // Calculate Medal (Gold: all coins + under par time; Silver: all coins OR under par; Bronze: clear)
      const parTimes = { 1: 45, 2: 60, 3: 75, 4: 90, 5: 120 };
      const par = parTimes[levelNum] || 60;
      const allCoins = coinsCollected >= totalCoins;
      const underPar = timeInSeconds <= par;

      let medal = 'bronze';
      if (allCoins && underPar) medal = 'gold';
      else if (allCoins || underPar) medal = 'silver';

      const prevMedal = this.data.medals[levelNum];
      const ranks = { gold: 3, silver: 2, bronze: 1 };
      if (!prevMedal || ranks[medal] > (ranks[prevMedal] || 0)) {
        this.data.medals[levelNum] = medal;
      }

      // Record highest global score
      const totalScore = Object.values(this.data.bestScores).reduce((a, b) => a + b, 0);
      if (totalScore > this.data.highestScore) {
        this.data.highestScore = totalScore;
      }

      // Check achievements
      if (!tookDamage) this.unlockAchievement('no_damage');
      if (underPar) this.unlockAchievement('speed_runner');
      if (allCoins) this.unlockAchievement('collector');
      if (levelNum === 5) this.unlockAchievement('boss_slayer');

      // Check all gold medals
      const allGold = [1, 2, 3, 4, 5].every(id => this.data.medals[id] === 'gold');
      if (allGold) this.unlockAchievement('cyber_master');

      this.saveData();
      return medal;
    }

    unlockAchievement(id) {
      if (!this.data.achievements.includes(id)) {
        this.data.achievements.push(id);
        this.saveData();
        if (window.CQ.UI && window.CQ.UI.showAchievementToast) {
          window.CQ.UI.showAchievementToast(id);
        }
        return true;
      }
      return false;
    }

    hasAchievement(id) {
      return this.data.achievements.includes(id);
    }

    addStat(key, amount = 1) {
      if (this.data.stats[key] !== undefined) {
        this.data.stats[key] += amount;
      } else {
        this.data.stats[key] = amount;
      }
      this.saveData();
    }

    getSettings() {
      return {
        soundEnabled: this.data.soundEnabled,
        musicEnabled: this.data.musicEnabled,
        soundVolume: this.data.soundVolume !== undefined ? this.data.soundVolume : 0.85,
        musicVolume: this.data.musicVolume !== undefined ? this.data.musicVolume : 0.45,
        shakeEnabled: this.data.shakeEnabled,
        reduceMotion: !!this.data.reduceMotion,
        highContrast: !!this.data.highContrast,
        crtEnabled: this.data.crtEnabled !== false,
        colorblindMode: this.data.colorblindMode || 'none',
        difficulty: this.data.difficulty || 'normal',
        speedrunTimer: !!this.data.speedrunTimer,
        keyBindings: this.data.keyBindings
      };
    }

    setSetting(key, val) {
      this.data[key] = val;
      this.saveData();
    }

    resetProgress() {
      const settings = this.getSettings();
      this.data = JSON.parse(JSON.stringify(defaultSave));
      // Preserve user accessibility/audio settings
      this.data.soundEnabled = settings.soundEnabled;
      this.data.musicEnabled = settings.musicEnabled;
      this.data.soundVolume = settings.soundVolume;
      this.data.musicVolume = settings.musicVolume;
      this.data.shakeEnabled = settings.shakeEnabled;
      this.data.reduceMotion = settings.reduceMotion;
      this.data.highContrast = settings.highContrast;
      this.data.crtEnabled = settings.crtEnabled;
      this.data.keyBindings = settings.keyBindings;
      this.saveData();
    }
  }

  window.CQ.Storage = new StorageManager();
})();
