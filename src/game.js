// CYBER QUEST - Main Game Loop, State Machine & Engine Coordinator (Enhanced v2)
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  const C = window.CQ.Constants;

  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');

      this.virtualWidth = C.CANVAS_WIDTH;
      this.virtualHeight = C.CANVAS_HEIGHT;

      this.scale = 1;
      this.canvasOffsetX = 0;
      this.canvasOffsetY = 0;

      // State machine: 'BOOT', 'MENU', 'PLAYING', 'PAUSED', 'LEVEL_COMPLETE', 'GAME_OVER', 'VICTORY'
      this.state = 'BOOT';
      this.currentLevelId = 1;
      this.level = null;
      this.player = null;
      this.camera = null;

      // Stats tracking for current run
      this.levelScore = 0;
      this.levelTime = 0;
      this.cumulativeScore = 0;
      this.totalShardsCollected = 0;
      this.gameStartTime = 0;

      // Fixed-timestep accumulator loop (spec B: 60Hz physics)
      this.FIXED_DT  = 1 / 60;
      this.accumulator = 0;
      this.lastTime = 0;
      this.maxDelta = 0.1; // Clamp to avoid spiral-of-death
      this.renderAlpha = 0;

      // Performance & Particle Budget (Spec G: budget reduction below 50 FPS)
      this.fps = 60;
      this.fpsFrames = 0;
      this.fpsTimer = 0;

      // Debug overlay (F3)
      this.showDebugOverlay = false;

      // Menu background ambient timer
      this.menuTime = 0;
      this.deathTriggered = false;

      // Transition effect
      this.transitionAlpha = 0;
      this.transitionTimer = 0;

      this.init();
    }

    init() {
      // Validate all levels on startup (Spec G)
      if (window.CQ.validateLevels) {
        const valRes = window.CQ.validateLevels();
        if (!valRes.valid) {
          console.warn('Level validation warnings:', valRes.errors);
        } else {
          console.log('✓ All 5 levels validated successfully.');
        }
      }

      this.handleResize();
      window.addEventListener('resize', () => this.handleResize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.handleResize(), 200));

      // Auto-pause when tab loses focus (spec F)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'PLAYING') this.togglePause();
      });

      window.CQ.Input.bindCanvas(this.canvas);
      this.camera = new window.CQ.Camera(this.virtualWidth, this.virtualHeight);

      this.setupUICallbacks();
      this.runBootSequence();

      requestAnimationFrame((time) => this.gameLoop(time));
    }

    toggleDebugOverlay() {
      this.showDebugOverlay = !this.showDebugOverlay;
      const debugEl = document.getElementById('debug-overlay');
      if (debugEl) {
        debugEl.style.display = this.showDebugOverlay ? 'block' : 'none';
      }
    }

    handleResize() {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      const scaleX = windowWidth / this.virtualWidth;
      const scaleY = windowHeight / this.virtualHeight;
      this.scale = Math.min(scaleX, scaleY);

      const targetWidth = Math.round(this.virtualWidth * this.scale);
      const targetHeight = Math.round(this.virtualHeight * this.scale);

      this.canvas.style.width = `${targetWidth}px`;
      this.canvas.style.height = `${targetHeight}px`;

      this.canvas.width = this.virtualWidth;
      this.canvas.height = this.virtualHeight;
      this.ctx.imageSmoothingEnabled = true;

      if (this.level && this.camera) {
        this.camera.setBounds(0, 0, this.level.width, this.level.height);
      }
    }

    setupUICallbacks() {
      const ui = window.CQ.UI;

      ui.onStartLevel = (levelId) => {
        this.triggerTransition(() => this.startLevel(levelId));
      };

      ui.onResume = () => {
        if (this.state === 'PAUSED') {
          this.state = 'PLAYING';
          ui.hideModal('pauseMenu');
        }
      };

      ui.onRestartLevel = () => {
        ui.hideAllModals();
        this.triggerTransition(() => this.startLevel(this.currentLevelId));
      };

      ui.onMainMenu = () => {
        this.triggerTransition(() => this.goToMainMenu());
      };

      ui.onNextLevel = () => {
        ui.hideAllModals();
        if (this.currentLevelId >= 5) {
          this.showVictoryScreen();
        } else {
          this.triggerTransition(() => this.startLevel(this.currentLevelId + 1));
        }
      };

      ui.onRespawnCheckpoint = () => {
        ui.hideAllModals();
        this.respawnPlayer();
      };
    }

    triggerTransition(onMidpoint) {
      this.transitionAlpha = 1.0;
      this.transitionTimer = 0.3; // 300ms screen wipe/glitch
      if (onMidpoint) onMidpoint();
    }

    runBootSequence() {
      const bootProgress = document.getElementById('boot-progress-bar');
      const bootStatus = document.getElementById('boot-status-text');

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 15;
        if (progress > 100) progress = 100;

        if (bootProgress) bootProgress.style.width = `${progress}%`;
        if (bootStatus) {
          if (progress < 35) bootStatus.textContent = 'CHECKING NEURAL SYNAPSE...';
          else if (progress < 65) bootStatus.textContent = 'SYNTHESIZING SOUND PROTOCOLS...';
          else if (progress < 90) bootStatus.textContent = 'INITIALIZING MAINFRAME MATRICES...';
          else bootStatus.textContent = 'SYSTEMS ONLINE. READY.';
        }

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            document.getElementById('loading-screen').classList.add('fade-out');
            setTimeout(() => {
              document.getElementById('loading-screen').classList.add('hidden');
              this.goToMainMenu();
            }, 400);
          }, 250);
        }
      }, 60);
    }

    goToMainMenu() {
      this.state = 'MENU';
      window.CQ.UI.hideAllModals();
      window.CQ.UI.showHUD(false);
      window.CQ.UI.showScreen('mainMenu');
      window.CQ.UI.updateSettingsUI();

      const highestScore = window.CQ.Storage.data.highestScore || 0;
      const el = document.getElementById('menu-high-score-val');
      if (el) el.textContent = highestScore.toLocaleString();

      if (window.CQ.Audio) {
        window.CQ.Audio.startMusic('gameplay');
      }
    }

    startLevel(levelId) {
      this.currentLevelId = levelId;
      this.level = new window.CQ.Level(levelId);

      const spawn = this.level.data.playerStart;
      this.player = new window.CQ.Player(spawn.x, spawn.y);

      this.camera.setBounds(0, 0, this.level.width, this.level.height);
      this.camera.x = spawn.x - this.virtualWidth / 2;
      this.camera.y = spawn.y - this.virtualHeight / 2;

      window.CQ.Particles.reset();

      this.levelScore = 0;
      this.levelTime = 0;
      this.accumulator = 0;
      this.deathTriggered = false;
      if (levelId === 1) {
        this.cumulativeScore = 0;
        this.totalShardsCollected = 0;
        this.gameStartTime = Date.now();
      }

      this.state = 'PLAYING';
      window.CQ.UI.hideAllModals();
      window.CQ.UI.showHUD(true);

      // Show level title card (Spec C)
      window.CQ.UI.showLevelTitleCard(`SECTOR 0${levelId}: ${this.level.name.toUpperCase()}`, this.level.subtitle.toUpperCase());

      // Show Level 1 contextual tutorial prompts
      if (levelId === 1) {
        window.CQ.UI.showTutorialPrompt('Press SPACE or ▲ to Jump • Press J or X to Slash');
      }

      if (window.CQ.Audio) {
        window.CQ.Audio.startMusic(levelId === 5 ? 'boss' : 'gameplay');
      }
    }

    respawnPlayer() {
      if (!this.player || !this.level) return;

      this.player.respawn(true);
      this.deathTriggered = false; // Reset so next death can trigger game-over again
      this.state = 'PLAYING';
      window.CQ.UI.hideAllModals();
      window.CQ.UI.showHUD(true);
    }


    togglePause() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        window.CQ.UI.showModal('pauseMenu');
      } else if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
        window.CQ.UI.hideModal('pauseMenu');
      }
    }

    triggerLevelComplete() {
      if (this.state !== 'PLAYING') return;
      this.state = 'LEVEL_COMPLETE';

      if (window.CQ.Audio) window.CQ.Audio.playLevelComplete();

      const baseClearScore = C.SCORE.LEVEL_CLEAR;
      const coinScore = this.level.coinsCollected * C.SCORE.COIN;
      const bonusShardScore = (this.level.bonusShardsCollected || 0) * C.SCORE.BONUS_SHARD;
      const enemyScore = this.level.enemiesDefeated * 250;
      const timeBonus = Math.max(0, Math.floor((180 - this.levelTime) * 15));

      const levelTotal = baseClearScore + coinScore + bonusShardScore + enemyScore + timeBonus;
      this.levelScore = levelTotal;
      this.cumulativeScore += levelTotal;
      this.totalShardsCollected += this.level.coinsCollected;

      // Save to localStorage & award medal (Bronze, Silver, Gold)
      const medal = window.CQ.Storage.recordLevelCompletion(
        this.currentLevelId,
        levelTotal,
        this.levelTime,
        this.level.coinsCollected,
        this.level.totalCoinsInLevel,
        this.player.tookDamageInLevel
      );

      const mins = Math.floor(this.levelTime / 60);
      const secs = Math.floor(this.levelTime % 60);
      const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      window.CQ.UI.showLevelComplete({
        levelId: this.currentLevelId,
        levelName: this.level.name.toUpperCase(),
        levelScore: levelTotal,
        coinsCollected: this.level.coinsCollected,
        totalCoins: this.level.totalCoinsInLevel,
        bonusShards: this.level.bonusShardsCollected || 0,
        timeString: timeString,
        enemiesDefeated: this.level.enemiesDefeated,
        timeBonus: timeBonus,
        totalScore: this.cumulativeScore,
        medal: medal,
        isFinalLevel: this.currentLevelId === 5
      });
    }

    showVictoryScreen() {
      this.state = 'VICTORY';
      window.CQ.UI.hideAllModals();
      window.CQ.UI.showHUD(false);

      if (window.CQ.Audio) window.CQ.Audio.playLevelComplete();

      const totalTimeSecs = Math.round((Date.now() - this.gameStartTime) / 1000);
      const mins = Math.floor(totalTimeSecs / 60);
      const secs = Math.floor(totalTimeSecs % 60);
      const totalTimeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      let rank = 'RANK: B (OPERATIVE)';
      if (this.cumulativeScore >= 14000) rank = 'RANK: S+ (CYBER GOD)';
      else if (this.cumulativeScore >= 10000) rank = 'RANK: S (LEGENDARY AGENT)';
      else if (this.cumulativeScore >= 7000) rank = 'RANK: A (ELITE HUNTER)';

      window.CQ.UI.showVictory({
        totalScore: this.cumulativeScore,
        totalCoins: this.totalShardsCollected,
        totalTime: totalTimeString,
        rank: rank
      });
    }

    // -------------------------------------------------------------
    // MAIN GAME LOOP — Fixed-timestep accumulator (60Hz physics)
    // -------------------------------------------------------------
    gameLoop(time) {
      if (!this.lastTime) this.lastTime = time;
      let frameTime = (time - this.lastTime) / 1000;
      this.lastTime = time;

      // Clamp delta to avoid spiral-of-death (Spec G)
      if (frameTime > this.maxDelta) frameTime = this.maxDelta;

      // FPS tracking & Automatic Particle Budget Throttling (Spec G)
      this.fpsFrames++;
      this.fpsTimer += frameTime;
      if (this.fpsTimer >= 0.5) {
        this.fps = Math.round((this.fpsFrames / this.fpsTimer));
        this.fpsFrames = 0;
        this.fpsTimer = 0;

        // Auto particle-budget reduction if FPS < 50
        if (window.CQ.Particles) {
          window.CQ.Particles.maxParticles = this.fps < 50 ? 120 : 300;
        }

        // Update debug overlay text
        if (this.showDebugOverlay) {
          this.updateDebugOverlay();
        }
      }

      // Poll Gamepad API
      window.CQ.Input.pollGamepad();

      // Pause toggle
      if (window.CQ.Input.wasJustPressed('pause')) {
        this.togglePause();
      }

      if (this.state === 'PLAYING') {
        this.accumulator += frameTime;
        let stepsRun = 0;
        while (this.accumulator >= this.FIXED_DT) {
          this._physicsStep(this.FIXED_DT);
          this.accumulator -= this.FIXED_DT;
          stepsRun++;
        }
        if (stepsRun > 0) {
          window.CQ.Input.onPhysicsTickComplete();
        }
        this.renderAlpha = this.accumulator / this.FIXED_DT;
      } else if (this.state === 'MENU') {
        this.menuTime += frameTime;
      }

      // Update screen transition fade
      if (this.transitionTimer > 0) {
        this.transitionTimer -= frameTime;
        this.transitionAlpha = Math.max(0, this.transitionTimer / 0.3);
      }

      this.render();

      // Clear justPressed ONLY if a physics tick ran, never on empty intermediate sub-ticks!
      window.CQ.Input.resetFrame();

      requestAnimationFrame((t) => this.gameLoop(t));
    }

    _physicsStep(dt) {
      this.levelTime += dt;

      // 1. Player movement & input
      this.player.update(dt, window.CQ.Input);

      // 2. Physics & platform collisions
      this.level.resolvePlayerPhysics(this.player, dt);

      // 3. Level entities
      this.level.update(dt, this.player, this.camera);

      // 4. Camera update
      this.camera.update(this.player, dt);

      // 5. Particles update
      window.CQ.Particles.update(dt);

      // 6. Death check
      if (this.player.isDead && this.state === 'PLAYING' && !this.deathTriggered) {
        this.deathTriggered = true;
        setTimeout(() => {
          if (this.state === 'PLAYING' && this.player.isDead) {
            this.state = 'GAME_OVER';
            window.CQ.UI.showModal('gameOver');
          }
        }, 850);
      }

      // 7. Exit portal check
      if (this.level.checkExit(this.player)) {
        this.triggerLevelComplete();
      }

      // 8. Update HUD
      const currentScore = this.cumulativeScore
        + (this.level.coinsCollected * C.SCORE.COIN)
        + ((this.level.bonusShardsCollected || 0) * C.SCORE.BONUS_SHARD)
        + (this.level.enemiesDefeated * 250);
      window.CQ.UI.updateHUD(this.player, this.level, currentScore, this.levelTime);
    }

    render() {
      this.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

      if (this.state === 'MENU') {
        this.renderMenuBackground();
      } else if (this.level && this.camera) {
        const renderOffset = this.camera.getRenderOffset();

        this.level.render(this.ctx, renderOffset);

        if (this.player) {
          this.player.render(this.ctx, renderOffset);
        }

        window.CQ.Particles.render(this.ctx, renderOffset);
      }

      // Render transition overlay (wipe/glitch)
      if (this.transitionAlpha > 0) {
        this.ctx.save();
        this.ctx.fillStyle = `rgba(3, 4, 12, ${this.transitionAlpha})`;
        this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);
        this.ctx.restore();
      }
    }

    updateDebugOverlay() {
      const debugEl = document.getElementById('debug-overlay');
      if (!debugEl) return;
      const playerPos = this.player ? `X: ${Math.round(this.player.x)}, Y: ${Math.round(this.player.y)} | Vy: ${Math.round(this.player.vy)}` : 'N/A';
      const entityCount = this.level ? this.level.enemies.length + (this.level.boss ? 1 : 0) : 0;
      const particleCount = window.CQ.Particles ? window.CQ.Particles.particles.length : 0;

      debugEl.innerHTML = `
        <div style="font-family: monospace; font-size: 11px; color: #00ff66;">
          <strong>[DEBUG F3]</strong> FPS: ${this.fps} | STATE: ${this.state}<br>
          PLAYER: ${playerPos}<br>
          ENTITIES: ${entityCount} | PARTICLES: ${particleCount}<br>
          ACCUMULATOR: ${(this.accumulator * 1000).toFixed(1)}ms
        </div>
      `;
    }

    renderMenuBackground() {
      const w = this.virtualWidth;
      const h = this.virtualHeight;

      const grad = this.ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#03040c');
      grad.addColorStop(0.5, '#090e24');
      grad.addColorStop(1, '#180a30');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, w, h);

      // 3D Perspective Synthwave Grid at bottom
      this.ctx.save();
      const horizonY = h * 0.58;
      this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
      this.ctx.lineWidth = 1.5;

      for (let i = 0; i < 14; i++) {
        const p = Math.pow(i / 13, 2.2);
        const y = horizonY + p * (h - horizonY);
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(w, y);
        this.ctx.stroke();
      }

      const centerX = w / 2;
      const gridScroll = (this.menuTime * 60) % 80;
      for (let x = -w * 0.8; x < w * 1.8; x += 60) {
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, horizonY);
        this.ctx.lineTo(x + gridScroll, h);
        this.ctx.stroke();
      }

      // Neon Sun
      const sunGrad = this.ctx.createLinearGradient(0, horizonY - 120, 0, horizonY);
      sunGrad.addColorStop(0, '#ff007f');
      sunGrad.addColorStop(1, '#ffe600');
      this.ctx.fillStyle = sunGrad;
      this.ctx.shadowColor = '#ff007f';
      this.ctx.shadowBlur = 30;
      this.ctx.beginPath();
      this.ctx.arc(centerX, horizonY, 80, Math.PI, 0, false);
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(0, 243, 255, 0.15)';
      this.ctx.fillRect(0, horizonY - 4, w, 8);
      this.ctx.restore();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.CQ.GameInstance = new Game();
  });
})();
