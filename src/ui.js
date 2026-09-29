// CYBER QUEST - Comprehensive UI, Modal & Screen Manager (Enhanced v2)
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  const C = window.CQ.Constants;

  class UIManager {
    constructor() {
      // Screen overlays
      this.screens = {
        loading: document.getElementById('loading-screen'),
        mainMenu: document.getElementById('main-menu'),
        levelSelect: document.getElementById('level-select-modal'),
        howToPlay: document.getElementById('how-to-play-modal'),
        settings: document.getElementById('settings-modal'),
        rebind: document.getElementById('rebind-modal'),
        stats: document.getElementById('stats-modal'),
        pauseMenu: document.getElementById('pause-modal'),
        levelComplete: document.getElementById('level-complete-modal'),
        gameOver: document.getElementById('game-over-modal'),
        victory: document.getElementById('victory-modal')
      };

      // HUD elements
      this.hud = document.getElementById('game-hud');
      this.hpFill = document.getElementById('hud-hp-fill');
      this.hpText = document.getElementById('hud-hp-text');
      this.levelNameText = document.getElementById('hud-level-name');
      this.scoreText = document.getElementById('hud-score');
      this.coinsText = document.getElementById('hud-coins');
      this.timerText = document.getElementById('hud-timer');
      this.powerupsContainer = document.getElementById('hud-powerups');
      this.comboBadge = document.getElementById('hud-combo-badge');

      // Title Card & Tutorial & Toast
      this.titleCard = document.getElementById('level-title-card');
      this.titleCardMain = document.getElementById('title-card-main');
      this.titleCardSub = document.getElementById('title-card-sub');
      this.tutorialPrompt = document.getElementById('tutorial-prompt');
      this.tutorialPromptText = document.getElementById('tutorial-prompt-text');
      this.achievementToast = document.getElementById('achievement-toast');
      this.toastDesc = document.getElementById('toast-desc');

      // Boss bar
      this.bossBarContainer = document.getElementById('hud-boss-bar-container');
      this.bossHpFill = document.getElementById('hud-boss-hp-fill');
      this.bossHpPct = document.getElementById('hud-boss-hp-pct');

      // Touch controls
      this.touchControls = document.getElementById('touch-controls');

      // CRT Overlay
      this.crtOverlay = document.getElementById('crt-overlay');

      // Callbacks
      this.onStartLevel = null;
      this.onResume = null;
      this.onRestartLevel = null;
      this.onMainMenu = null;
      this.onNextLevel = null;
      this.onRespawnCheckpoint = null;

      // Menu keyboard navigation tracking
      this.menuNavIndex = 0;
      this.lastActiveScreenKey = 'mainMenu';

      this.initEvents();
    }

    initEvents() {
      // Main menu buttons
      this.bindClick('btn-play', () => {
        if (this.onStartLevel) this.onStartLevel(1);
      });

      this.bindClick('btn-level-select', () => {
        this.showLevelSelect();
      });

      this.bindClick('btn-how-to-play', () => {
        this.showModal('howToPlay');
      });

      this.bindClick('btn-stats', () => {
        this.showStatsModal();
      });

      this.bindClick('btn-settings', () => {
        this.showModal('settings');
      });

      // Quick audio toggles
      this.bindClick('btn-quick-sound', () => {
        const audio = window.CQ.Audio;
        audio.setSoundEnabled(!audio.soundEnabled);
        this.updateSettingsUI();
      });

      this.bindClick('btn-quick-music', () => {
        const audio = window.CQ.Audio;
        audio.setMusicEnabled(!audio.musicEnabled);
        this.updateSettingsUI();
      });

      // Modal close buttons
      this.bindClick('btn-close-level-select', () => this.hideModal('levelSelect'));
      this.bindClick('btn-close-how-to-play', () => this.hideModal('howToPlay'));
      this.bindClick('btn-close-settings', () => this.hideModal('settings'));
      this.bindClick('btn-close-stats', () => this.hideModal('stats'));
      this.bindClick('btn-close-rebind', () => this.hideModal('rebind'));

      // Volume sliders (Spec E)
      const soundSlider = document.getElementById('slider-sound-volume');
      if (soundSlider) {
        soundSlider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          window.CQ.Audio.setSoundVolume(val);
          document.getElementById('val-sound-volume').textContent = `${Math.round(val * 100)}%`;
        });
      }

      const musicSlider = document.getElementById('slider-music-volume');
      if (musicSlider) {
        musicSlider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          window.CQ.Audio.setMusicVolume(val);
          document.getElementById('val-music-volume').textContent = `${Math.round(val * 100)}%`;
        });
      }

      // Settings toggles
      this.bindClick('toggle-sound', () => {
        const audio = window.CQ.Audio;
        audio.setSoundEnabled(!audio.soundEnabled);
        this.updateSettingsUI();
      });

      this.bindClick('toggle-music', () => {
        const audio = window.CQ.Audio;
        audio.setMusicEnabled(!audio.musicEnabled);
        this.updateSettingsUI();
      });

      this.bindClick('toggle-shake', () => {
        const storage = window.CQ.Storage;
        const s = storage.getSettings();
        storage.setSetting('shakeEnabled', !s.shakeEnabled);
        this.updateSettingsUI();
      });

      this.bindClick('toggle-reduce-motion', () => {
        const storage = window.CQ.Storage;
        const s = storage.getSettings();
        storage.setSetting('reduceMotion', !s.reduceMotion);
        this.updateSettingsUI();
      });

      this.bindClick('toggle-high-contrast', () => {
        const storage = window.CQ.Storage;
        const s = storage.getSettings();
        storage.setSetting('highContrast', !s.highContrast);
        this.updateSettingsUI();
      });

      this.bindClick('toggle-crt', () => {
        const storage = window.CQ.Storage;
        const s = storage.getSettings();
        storage.setSetting('crtEnabled', !s.crtEnabled);
        this.updateSettingsUI();
      });

      this.bindClick('toggle-speedrun-timer', () => {
        const storage = window.CQ.Storage;
        const s = storage.getSettings();
        storage.setSetting('speedrunTimer', !s.speedrunTimer);
        this.updateSettingsUI();
      });

      // Difficulty buttons (Casual, Normal, Hard)
      this.bindClick('btn-diff-casual', () => {
        window.CQ.Storage.setSetting('difficulty', 'casual');
        this.updateSettingsUI();
      });
      this.bindClick('btn-diff-normal', () => {
        window.CQ.Storage.setSetting('difficulty', 'normal');
        this.updateSettingsUI();
      });
      this.bindClick('btn-diff-hard', () => {
        window.CQ.Storage.setSetting('difficulty', 'hard');
        this.updateSettingsUI();
      });

      // Rebind controls modal
      this.bindClick('btn-open-rebind', () => {
        this.renderRebindList();
        this.showModal('rebind');
      });

      this.bindClick('btn-reset-keybinds', () => {
        window.CQ.Input.resetBindingsToDefault();
        this.renderRebindList();
      });

      this.bindClick('btn-reset-progress', () => {
        if (confirm('Reset all progress, high scores, medals, and unlocked sectors?')) {
          window.CQ.Storage.resetProgress();
          this.updateSettingsUI();
          this.renderLevelSelectGrid();
        }
      });

      // Pause menu
      this.bindClick('btn-pause-resume', () => {
        if (this.onResume) this.onResume();
      });
      this.bindClick('btn-pause-restart', () => {
        if (this.onRestartLevel) this.onRestartLevel();
      });
      this.bindClick('btn-pause-settings', () => {
        this.showModal('settings');
      });
      this.bindClick('btn-pause-menu', () => {
        if (this.onMainMenu) this.onMainMenu();
      });

      // HUD Options & Pause button
      this.bindClick('btn-hud-options', () => {
        if (window.CQ.GameInstance && window.CQ.GameInstance.state === 'PLAYING') {
          window.CQ.GameInstance.state = 'PAUSED';
        }
        this.showModal('settings');
      });

      this.bindClick('btn-hud-pause', () => {
        if (window.CQ.GameInstance) window.CQ.GameInstance.togglePause();
      });

      // Level complete buttons
      this.bindClick('btn-next-level', () => {
        if (this.onNextLevel) this.onNextLevel();
      });
      this.bindClick('btn-complete-share', () => {
        this.shareResult(false);
      });
      this.bindClick('btn-complete-menu', () => {
        if (this.onMainMenu) this.onMainMenu();
      });

      // Game over buttons
      this.bindClick('btn-respawn-checkpoint', () => {
        if (this.onRespawnCheckpoint) this.onRespawnCheckpoint();
      });
      this.bindClick('btn-gameover-restart', () => {
        if (this.onRestartLevel) this.onRestartLevel();
      });
      this.bindClick('btn-gameover-menu', () => {
        if (this.onMainMenu) this.onMainMenu();
      });

      // Victory buttons
      this.bindClick('btn-victory-play-again', () => {
        if (this.onStartLevel) this.onStartLevel(1);
      });
      this.bindClick('btn-victory-share', () => {
        this.shareResult(true);
      });
      this.bindClick('btn-victory-menu', () => {
        if (this.onMainMenu) this.onMainMenu();
      });

      // Mobile Touch Button Binds
      const input = window.CQ.Input;
      input.bindTouchElement(document.getElementById('touch-left'), 'left');
      input.bindTouchElement(document.getElementById('touch-right'), 'right');
      input.bindTouchElement(document.getElementById('touch-jump'), 'jump');
      input.bindTouchElement(document.getElementById('touch-attack'), 'attack');

      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        if (this.touchControls) this.touchControls.style.display = 'flex';
      }
    }

    bindClick(id, fn) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.CQ.Audio) window.CQ.Audio.resume();
          fn();
          // Remove focus so keyboard arrow keys don't re-trigger DOM buttons
          el.blur();
        });
      }
    }

    // -------------------------------------------------------------
    // KEYBOARD MENU NAVIGATION (Spec F: Arrows + Enter)
    // -------------------------------------------------------------
    hasActiveModalOrMenu() {
      // Returns true if game is in MENU or any modal is visible
      if (window.CQ.GameInstance && window.CQ.GameInstance.state === 'MENU') return true;
      for (const k in this.screens) {
        if (k !== 'loading' && this.screens[k] && !this.screens[k].classList.contains('hidden')) {
          return true;
        }
      }
      return false;
    }

    getActiveScreenElement() {
      // Find top-most visible modal or menu
      const order = ['rebind', 'stats', 'settings', 'howToPlay', 'levelSelect', 'pauseMenu', 'levelComplete', 'gameOver', 'victory', 'mainMenu'];
      for (const k of order) {
        const el = this.screens[k];
        if (el && !el.classList.contains('hidden')) return { key: k, element: el };
      }
      return null;
    }

    handleMenuNavigation(e) {
      const active = this.getActiveScreenElement();
      if (!active) return false;

      const modalEl = active.element;
      // Find all navigable buttons
      const buttons = Array.from(modalEl.querySelectorAll('button:not([disabled]):not(.hidden), input[type="range"]'));
      if (buttons.length === 0) return false;

      const isUp = e.key === 'ArrowUp' || e.code === 'ArrowUp';
      const isDown = e.key === 'ArrowDown' || e.code === 'ArrowDown';
      const isLeft = e.key === 'ArrowLeft' || e.code === 'ArrowLeft';
      const isRight = e.key === 'ArrowRight' || e.code === 'ArrowRight';
      const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter';
      const isEsc = e.key === 'Escape' || e.code === 'Escape';

      if (isEsc) {
        if (active.key !== 'mainMenu' && active.key !== 'pauseMenu') {
          e.preventDefault();
          this.hideModal(active.key);
          return true;
        }
      }

      if (isDown || isRight) {
        e.preventDefault();
        this.menuNavIndex = (this.menuNavIndex + 1) % buttons.length;
        buttons[this.menuNavIndex].focus();
        if (window.CQ.Audio) window.CQ.Audio.playMenuNavigate();
        return true;
      } else if (isUp || isLeft) {
        e.preventDefault();
        this.menuNavIndex = (this.menuNavIndex - 1 + buttons.length) % buttons.length;
        buttons[this.menuNavIndex].focus();
        if (window.CQ.Audio) window.CQ.Audio.playMenuNavigate();
        return true;
      } else if (isEnter) {
        e.preventDefault();
        const curBtn = buttons[this.menuNavIndex] || document.activeElement;
        if (curBtn && curBtn.click) {
          if (window.CQ.Audio) window.CQ.Audio.playMenuSelect();
          curBtn.click();
        }
        return true;
      }

      return false;
    }

    showModal(screenKey) {
      if (this.screens[screenKey]) {
        if (screenKey === 'settings') {
          this.updateSettingsUI();
        }
        this.screens[screenKey].classList.remove('hidden');
        this.menuNavIndex = 0;
        // Auto focus first button
        const firstBtn = this.screens[screenKey].querySelector('button:not([disabled])');
        if (firstBtn) firstBtn.focus();
      }
    }

    hideModal(screenKey) {
      if (this.screens[screenKey]) {
        this.screens[screenKey].classList.add('hidden');
      }
    }

    showScreen(screenKey) {
      for (const k in this.screens) {
        if (k === screenKey) {
          this.screens[k].classList.remove('hidden');
        } else if (k === 'mainMenu' || k === 'loading') {
          this.screens[k].classList.add('hidden');
        }
      }
    }

    hideAllModals() {
      ['mainMenu', 'levelSelect', 'howToPlay', 'settings', 'rebind', 'stats', 'pauseMenu', 'levelComplete', 'gameOver', 'victory'].forEach(k => {
        this.hideModal(k);
      });
    }

    showHUD(visible) {
      if (this.hud) {
        this.hud.style.display = visible ? 'flex' : 'none';
      }
      if (this.touchControls && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        this.touchControls.style.display = visible ? 'flex' : 'none';
      }
    }

    showLevelTitleCard(mainText, subText) {
      if (!this.titleCard) return;
      if (this.titleCardMain) this.titleCardMain.textContent = mainText;
      if (this.titleCardSub) this.titleCardSub.textContent = subText;

      this.titleCard.classList.remove('hidden');
      this.titleCard.classList.remove('fade-out');
      this.titleCard.classList.add('slide-in');

      setTimeout(() => {
        this.titleCard.classList.add('fade-out');
        setTimeout(() => {
          this.titleCard.classList.add('hidden');
        }, 400);
      }, 2000);
    }

    showTutorialPrompt(text) {
      if (!this.tutorialPrompt) return;
      if (this.tutorialPromptText) this.tutorialPromptText.textContent = text;
      this.tutorialPrompt.classList.remove('hidden');
      setTimeout(() => {
        this.tutorialPrompt.classList.add('hidden');
      }, 5000);
    }

    showAchievementToast(achievementId) {
      const ach = C.ACHIEVEMENTS[achievementId];
      if (!ach || !this.achievementToast) return;

      if (this.toastDesc) this.toastDesc.textContent = `${ach.icon} ${ach.title}: ${ach.desc}`;
      this.achievementToast.classList.remove('hidden');
      this.achievementToast.classList.add('slide-down');

      if (window.CQ.Audio) window.CQ.Audio.playAchievement();

      setTimeout(() => {
        this.achievementToast.classList.add('fade-out');
        setTimeout(() => {
          this.achievementToast.classList.add('hidden');
          this.achievementToast.classList.remove('slide-down', 'fade-out');
        }, 400);
      }, 3500);
    }

    shareResult(isVictory = false) {
      const storage = window.CQ.Storage;
      const highestScore = storage.data.highestScore || 0;
      const medals = storage.data.medals || {};
      const goldCount = Object.values(medals).filter(m => m === 'gold').length;

      const summaryText = isVictory
        ? `⚡ CYBER QUEST BREACH COMPLETE! ⚡\nTotal EXP: ${highestScore.toLocaleString()} pts | Medals: ${goldCount}/5 Gold\nOperative Status: LEGENDARY S-RANK\nPlay now: http://127.0.0.1:3000/`
        : `💠 CYBER QUEST MISSION UPDATE 💠\nSector Cleared! High Score: ${highestScore.toLocaleString()} pts\nMedals: ${goldCount}/5 Gold\nPlay now: http://127.0.0.1:3000/`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summaryText).then(() => {
          if (window.CQ.Particles && window.CQ.GameInstance) {
            window.CQ.Particles.addText('RESULT COPIED TO CLIPBOARD!', C.CANVAS_WIDTH / 2, 80, C.COLORS.GREEN, 18, 1.4);
          } else {
            alert('Mission result summary copied to clipboard!');
          }
        }).catch(() => {
          alert(summaryText);
        });
      } else {
        alert(summaryText);
      }
    }

    updateSettingsUI() {
      const audio = window.CQ.Audio;
      const storage = window.CQ.Storage;
      const s = storage.getSettings();

      const btnSound = document.getElementById('toggle-sound');
      const btnMusic = document.getElementById('toggle-music');
      const btnShake = document.getElementById('toggle-shake');
      const btnReduceMotion = document.getElementById('toggle-reduce-motion');
      const btnHighContrast = document.getElementById('toggle-high-contrast');
      const btnCrt = document.getElementById('toggle-crt');
      const btnSpeedrun = document.getElementById('toggle-speedrun-timer');

      const sliderSound = document.getElementById('slider-sound-volume');
      const sliderMusic = document.getElementById('slider-music-volume');
      const valSound = document.getElementById('val-sound-volume');
      const valMusic = document.getElementById('val-music-volume');

      if (sliderSound) sliderSound.value = s.soundVolume;
      if (sliderMusic) sliderMusic.value = s.musicVolume;
      if (valSound) valSound.textContent = `${Math.round(s.soundVolume * 100)}%`;
      if (valMusic) valMusic.textContent = `${Math.round(s.musicVolume * 100)}%`;

      if (btnSound) {
        btnSound.textContent = audio.soundEnabled ? 'ON' : 'OFF';
        btnSound.className = audio.soundEnabled ? 'btn-toggle active' : 'btn-toggle';
      }
      if (btnMusic) {
        btnMusic.textContent = audio.musicEnabled ? 'ON' : 'OFF';
        btnMusic.className = audio.musicEnabled ? 'btn-toggle active' : 'btn-toggle';
      }
      if (btnShake) {
        btnShake.textContent = s.shakeEnabled ? 'ON' : 'OFF';
        btnShake.className = s.shakeEnabled ? 'btn-toggle active' : 'btn-toggle';
      }
      if (btnReduceMotion) {
        btnReduceMotion.textContent = s.reduceMotion ? 'ON' : 'OFF';
        btnReduceMotion.className = s.reduceMotion ? 'btn-toggle active' : 'btn-toggle';
      }
      if (btnHighContrast) {
        btnHighContrast.textContent = s.highContrast ? 'ON' : 'OFF';
        btnHighContrast.className = s.highContrast ? 'btn-toggle active' : 'btn-toggle';
        document.body.classList.toggle('high-contrast-mode', s.highContrast);
      }
      if (btnCrt) {
        btnCrt.textContent = s.crtEnabled ? 'ON' : 'OFF';
        btnCrt.className = s.crtEnabled ? 'btn-toggle active' : 'btn-toggle';
        if (this.crtOverlay) this.crtOverlay.style.display = s.crtEnabled ? 'block' : 'none';
      }
      if (btnSpeedrun) {
        btnSpeedrun.textContent = s.speedrunTimer ? 'ON' : 'OFF';
        btnSpeedrun.className = s.speedrunTimer ? 'btn-toggle active' : 'btn-toggle';
      }

      // Difficulty buttons active states
      const diffCasual = document.getElementById('btn-diff-casual');
      const diffNormal = document.getElementById('btn-diff-normal');
      const diffHard = document.getElementById('btn-diff-hard');
      if (diffCasual && diffNormal && diffHard) {
        diffCasual.className = s.difficulty === 'casual' ? 'btn-diff active' : 'btn-diff';
        diffNormal.className = s.difficulty === 'normal' ? 'btn-diff active' : 'btn-diff';
        diffHard.className = s.difficulty === 'hard' ? 'btn-diff active' : 'btn-diff';
      }

      // Header quick toggles
      const quickSound = document.getElementById('btn-quick-sound');
      const quickMusic = document.getElementById('btn-quick-music');
      if (quickSound) quickSound.textContent = audio.soundEnabled ? '🔊' : '🔇';
      if (quickMusic) quickMusic.textContent = audio.musicEnabled ? '🎵' : '🚫';
    }

    showLevelSelect() {
      this.renderLevelSelectGrid();
      this.showModal('levelSelect');
    }

    renderLevelSelectGrid() {
      const container = document.getElementById('level-cards-container');
      if (!container) return;
      container.innerHTML = '';

      const storage = window.CQ.Storage;
      const levelData = window.CQ.LevelData;

      for (let i = 1; i <= 5; i++) {
        const lvl = levelData[i];
        const isUnlocked = storage.isLevelUnlocked(i);
        const bestScore = storage.data.bestScores[i] || 0;
        const bestTime = storage.data.bestTimes[i] ? `${storage.data.bestTimes[i]}s` : '--';
        const medal = storage.data.medals[i];

        let medalBadge = '';
        if (medal === 'gold') medalBadge = '<span class="medal-tag gold">🥇 GOLD</span>';
        else if (medal === 'silver') medalBadge = '<span class="medal-tag silver">🥈 SILVER</span>';
        else if (medal === 'bronze') medalBadge = '<span class="medal-tag bronze">🥉 BRONZE</span>';

        const card = document.createElement('div');
        card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;

        card.innerHTML = `
          <div class="level-card-header">
            <span class="level-num">SECTOR 0${i}</span>
            <div style="display:flex; gap:6px; align-items:center;">
              ${medalBadge}
              <span class="level-status">${isUnlocked ? '🔓 ACTIVE' : '🔒 LOCKED'}</span>
            </div>
          </div>
          <div class="level-card-title">${lvl.name}</div>
          <div class="level-card-subtitle">${lvl.subtitle}</div>
          <div class="level-card-stats">
            <div>BEST SCORE: <span>${bestScore.toLocaleString()}</span></div>
            <div>RECORD TIME: <span>${bestTime}</span></div>
          </div>
          <button class="btn-level-play" ${isUnlocked ? '' : 'disabled'}>
            ${isUnlocked ? 'LAUNCH MISSION' : 'SECURITY LOCKED'}
          </button>
        `;

        if (isUnlocked) {
          card.querySelector('.btn-level-play').addEventListener('click', () => {
            this.hideModal('levelSelect');
            if (this.onStartLevel) this.onStartLevel(i);
          });
        }

        container.appendChild(card);
      }
    }

    showStatsModal() {
      const storage = window.CQ.Storage;
      const stats = storage.data.stats || {};
      const medals = storage.data.medals || {};

      const playtimeSecs = stats.totalPlayTime || 0;
      const mins = Math.floor(playtimeSecs / 60);
      const secs = Math.floor(playtimeSecs % 60);
      const playTimeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      const elPlaytime = document.getElementById('stat-playtime');
      const elDeaths = document.getElementById('stat-deaths');
      const elEnemies = document.getElementById('stat-enemies');
      const elCoins = document.getElementById('stat-coins');
      const elBonus = document.getElementById('stat-bonus-shards');
      const elMedals = document.getElementById('stat-medals');

      if (elPlaytime) elPlaytime.textContent = playTimeString;
      if (elDeaths) elDeaths.textContent = (stats.deaths || 0).toLocaleString();
      if (elEnemies) elEnemies.textContent = (stats.enemiesDefeated || 0).toLocaleString();
      if (elCoins) elCoins.textContent = (stats.coinsCollected || 0).toLocaleString();
      if (elBonus) elBonus.textContent = `${stats.bonusShardsFound || 0} / 5`;

      const golds = Object.values(medals).filter(m => m === 'gold').length;
      const silvers = Object.values(medals).filter(m => m === 'silver').length;
      const bronzes = Object.values(medals).filter(m => m === 'bronze').length;
      if (elMedals) elMedals.textContent = `${golds} 🥇  ${silvers} 🥈  ${bronzes} 🥉`;

      // Render Achievements list
      const achContainer = document.getElementById('achievements-container');
      const achCountEl = document.getElementById('achievement-unlocked-count');
      if (achContainer) {
        achContainer.innerHTML = '';
        let unlockedCount = 0;
        for (const k in C.ACHIEVEMENTS) {
          const ach = C.ACHIEVEMENTS[k];
          const has = storage.hasAchievement(ach.id);
          if (has) unlockedCount++;

          const item = document.createElement('div');
          item.className = `achievement-item ${has ? 'unlocked' : 'locked'}`;
          item.innerHTML = `
            <div class="ach-icon">${has ? ach.icon : '🔒'}</div>
            <div class="ach-details">
              <div class="ach-title">${ach.title}</div>
              <div class="ach-desc">${ach.desc}</div>
            </div>
            <div class="ach-status">${has ? 'UNLOCKED' : 'LOCKED'}</div>
          `;
          achContainer.appendChild(item);
        }
        if (achCountEl) achCountEl.textContent = `${unlockedCount} / ${Object.keys(C.ACHIEVEMENTS).length}`;
      }

      this.showModal('stats');
    }

    renderRebindList() {
      const container = document.getElementById('rebind-list');
      if (!container) return;
      container.innerHTML = '';

      const bindings = window.CQ.Input.bindings;
      for (const action in bindings) {
        const row = document.createElement('div');
        row.className = 'rebind-row';
        const keyText = bindings[action].join(', ');
        row.innerHTML = `
          <span class="rebind-action">${action.toUpperCase()}</span>
          <span class="rebind-keys">${keyText}</span>
          <button class="btn-rebind-action" data-action="${action}">REBIND</button>
        `;

        const btn = row.querySelector('.btn-rebind-action');
        btn.addEventListener('click', () => {
          btn.textContent = 'PRESS KEY...';
          const onKey = (e) => {
            e.preventDefault();
            window.removeEventListener('keydown', onKey);
            window.CQ.Input.setBinding(action, e.code || e.key);
            this.renderRebindList();
          };
          window.addEventListener('keydown', onKey, { once: true });
        });

        container.appendChild(row);
      }
    }

    updateHUD(player, level, currentScore, levelTime) {
      if (!player || !level) return;

      const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
      if (this.hpFill) this.hpFill.style.width = `${hpPct}%`;
      if (this.hpText) this.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

      if (this.levelNameText) this.levelNameText.textContent = `SECTOR 0${level.levelId}: ${level.name.toUpperCase()}`;
      if (this.scoreText) this.scoreText.textContent = currentScore.toLocaleString();
      if (this.coinsText) this.coinsText.textContent = `${level.coinsCollected} / ${level.totalCoinsInLevel}`;

      if (this.timerText) {
        const storage = window.CQ.Storage;
        const speedrun = storage && storage.getSettings().speedrunTimer;
        const mins = Math.floor(levelTime / 60);
        const secs = Math.floor(levelTime % 60);
        if (speedrun) {
          const tenths = Math.floor((levelTime % 1) * 10);
          this.timerText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
        } else {
          this.timerText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
      }

      // Combo badge
      if (this.comboBadge) {
        if (level.comboMultiplier > 1) {
          this.comboBadge.textContent = `x${level.comboMultiplier} COMBO!`;
          this.comboBadge.classList.remove('hidden');
        } else {
          this.comboBadge.classList.add('hidden');
        }
      }

      // Active powerups
      if (this.powerupsContainer) {
        let pBadges = '';
        for (const k in player.activePowerups) {
          const timeLeft = player.activePowerups[k];
          if (timeLeft > 0) {
            const keyUpper = k === 'doubleJump' ? 'DOUBLE_JUMP' : k.toUpperCase();
            const pInfo = C.POWERUPS[keyUpper];
            if (pInfo) {
              pBadges += `
                <div class="powerup-badge" style="border-color:${pInfo.color}">
                  <span class="p-icon">${pInfo.icon}</span>
                  <span class="p-name">${pInfo.name}</span>
                  <span class="p-time">${timeLeft.toFixed(1)}s</span>
                </div>
              `;
            }
          }
        }
        this.powerupsContainer.innerHTML = pBadges;
      }

      // Boss bar
      if (this.bossBarContainer) {
        if (level.boss && !level.boss.isDead) {
          this.bossBarContainer.style.display = 'block';
          const bossPct = Math.max(0, (level.boss.hp / level.boss.maxHp) * 100);
          if (this.bossHpFill) this.bossHpFill.style.width = `${bossPct}%`;
          if (this.bossHpPct) this.bossHpPct.textContent = `${Math.ceil(bossPct)}%`;
        } else {
          this.bossBarContainer.style.display = 'none';
        }
      }
    }

    showLevelComplete(stats) {
      document.getElementById('complete-level-name').textContent = stats.levelName;
      document.getElementById('complete-score').textContent = stats.levelScore.toLocaleString();
      document.getElementById('complete-coins').textContent = `${stats.coinsCollected} / ${stats.totalCoins}`;
      document.getElementById('complete-time').textContent = stats.timeString;
      document.getElementById('complete-enemies').textContent = stats.enemiesDefeated;
      document.getElementById('complete-bonus').textContent = `+${stats.timeBonus.toLocaleString()}`;
      document.getElementById('complete-total').textContent = stats.totalScore.toLocaleString();

      const medalBadge = document.getElementById('complete-medal-badge');
      if (medalBadge) {
        if (stats.medal === 'gold') {
          medalBadge.textContent = '🥇 GOLD MEDAL';
          medalBadge.className = 'medal-badge gold';
        } else if (stats.medal === 'silver') {
          medalBadge.textContent = '🥈 SILVER MEDAL';
          medalBadge.className = 'medal-badge silver';
        } else {
          medalBadge.textContent = '🥉 BRONZE MEDAL';
          medalBadge.className = 'medal-badge bronze';
        }
      }

      const btnNext = document.getElementById('btn-next-level');
      if (btnNext) {
        btnNext.textContent = stats.isFinalLevel ? 'VIEW VICTORY ARCHIVE' : 'NEXT MISSION';
      }

      this.showModal('levelComplete');
    }

    showVictory(stats) {
      document.getElementById('victory-total-score').textContent = stats.totalScore.toLocaleString();
      document.getElementById('victory-total-coins').textContent = stats.totalCoins;
      document.getElementById('victory-total-time').textContent = stats.totalTime;
      document.getElementById('victory-rank').textContent = stats.rank;

      this.showModal('victory');
    }
  }

  window.CQ.UI = new UIManager();
})();
