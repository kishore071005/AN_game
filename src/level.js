// CYBER QUEST - Level Engine, Collision Detection & World Rendering (Enhanced v2)
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  const C = window.CQ.Constants;

  class Level {
    constructor(levelId) {
      this.levelId = levelId;
      this.data = window.CQ.LevelData[levelId];
      if (!this.data) {
        throw new Error(`Level data for level ${levelId} not found.`);
      }

      this.width = this.data.width;
      this.height = this.data.height;
      this.name = this.data.name;
      this.subtitle = this.data.subtitle;

      // Color palette for this level (spec C: Level 1 cyan/magenta, Level 2 amber/orange, Level 3 teal/violet, Level 4 red/blue, Level 5 white/gold)
      this.palette = C.PALETTES[levelId] || C.PALETTES[1];

      // Entities & State
      this.platforms = JSON.parse(JSON.stringify(this.data.platforms || []));
      this.movingPlatforms = (this.data.movingPlatforms || []).map(p => Object.assign({}, p));
      this.fallingPlatforms = (this.data.fallingPlatforms || []).map(p => ({
        ...p,
        state: 'idle',
        timer: 0,
        shakeOffset: 0,
        vy: 0,
        currentY: p.y
      }));

      this.hazards = JSON.parse(JSON.stringify(this.data.hazards || []));
      this.collectibles = (this.data.collectibles || []).map((c, idx) => ({
        ...c,
        id: idx,
        collected: false,
        animOffset: Math.random() * Math.PI * 2
      }));

      this.totalCoinsInLevel = this.collectibles.filter(c => c.type === 'coin').length;
      this.coinsCollected = 0;
      this.bonusShardsCollected = 0;
      this.enemiesDefeated = 0;

      // Combo system (Spec D: cap x4, decays after 2s)
      this.comboMultiplier = 1;
      this.comboTimer = 0;

      this.checkpoints = (this.data.checkpoints || []).map(cp => ({
        ...cp,
        activated: false,
        width: 32,
        height: 60
      }));

      this.exit = Object.assign({}, this.data.exit);
      this.exitUnlocked = this.levelId !== 5;

      this.projectiles = [];
      this.enemies = [];
      this.boss = null;

      // Ambient rain / particles
      this.ambientParticles = [];
      this.initAmbientParticles();

      this.animTime = 0;
      this.initEnemies();
    }

    initAmbientParticles() {
      // 40 ambient atmospheric particles (rain in Level 1, motes in Level 3, heat motes in Level 2/4, glitch in 5)
      for (let i = 0; i < 40; i++) {
        this.ambientParticles.push({
          x: Math.random() * C.CANVAS_WIDTH,
          y: Math.random() * C.CANVAS_HEIGHT,
          speed: Math.random() * 80 + 40,
          len: Math.random() * 10 + 6,
          size: Math.random() * 2 + 1
        });
      }
    }

    initEnemies() {
      if (this.data.enemies) {
        for (const e of this.data.enemies) {
          if (e.type === 'drone') {
            this.enemies.push(new window.CQ.Enemies.Drone(e.x, e.y, e.patrolDist));
          } else if (e.type === 'hunter') {
            this.enemies.push(new window.CQ.Enemies.Hunter(e.x, e.y, e.patrolDist));
          } else if (e.type === 'shooter') {
            this.enemies.push(new window.CQ.Enemies.Shooter(e.x, e.y));
          } else if (e.type === 'tank') {
            this.enemies.push(new window.CQ.Enemies.Tank(e.x, e.y, e.patrolDist));
          }
        }
      }

      if (this.data.boss) {
        this.boss = new window.CQ.CoreGuardian(this.data.boss.x, this.data.boss.y);
      }
    }

    triggerComboEvent() {
      this.comboTimer = C.COMBO.DECAY_TIME;
      this.comboMultiplier = Math.min(C.COMBO.MAX_MULTIPLIER, this.comboMultiplier + 1);

      if (this.comboMultiplier === 4) {
        if (window.CQ.Storage) window.CQ.Storage.unlockAchievement('triple_combo');
      }

      if (window.CQ.Audio) {
        window.CQ.Audio.playCombo(this.comboMultiplier);
      }
    }

    update(dt, player, camera) {
      this.animTime += dt;

      // Update Combo decay timer
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.comboMultiplier = 1;
        }
      }

      // 1. Update Moving Platforms
      for (const p of this.movingPlatforms) {
        if (p.axis === 'x') {
          p.x += (p.speed || 100) * dt;
          if (p.x > p.maxX) {
            p.x = p.maxX;
            p.speed = -Math.abs(p.speed);
          } else if (p.x < p.minX) {
            p.x = p.minX;
            p.speed = Math.abs(p.speed);
          }
        } else if (p.axis === 'y') {
          p.y += (p.speed || 100) * dt;
          if (p.y > p.maxY) {
            p.y = p.maxY;
            p.speed = -Math.abs(p.speed);
          } else if (p.y < p.minY) {
            p.y = p.minY;
            p.speed = Math.abs(p.speed);
          }
        }
      }

      // 2. Update Falling Platforms
      for (const fp of this.fallingPlatforms) {
        if (fp.state === 'shaking') {
          fp.timer += dt;
          fp.shakeOffset = (Math.random() - 0.5) * 6;
          if (fp.timer >= fp.fallDelay) {
            fp.state = 'falling';
            fp.timer = 0;
            fp.vy = 40;
          }
        } else if (fp.state === 'falling') {
          fp.vy += C.GRAVITY * dt;
          fp.currentY += fp.vy * dt;
          fp.timer += dt;
          // Respawn early if platform falls off-screen or timer expires
          if (fp.timer > 1.8 || fp.currentY > this.height + 100) {
            fp.state = 'respawning';
            fp.timer = 0;
          }
        } else if (fp.state === 'respawning') {
          fp.timer += dt;
          if (fp.timer >= fp.respawnDelay) {
            fp.state = 'idle';
            fp.currentY = fp.y;
            fp.vy = 0;
            fp.shakeOffset = 0;
            fp.timer = 0;
          }
        }
      }

      // 3. Update Hazards (Laser cycles)
      for (const h of this.hazards) {
        if (h.type === 'laser') {
          const cycle = (this.animTime + (h.cycleOffset || 0)) % h.cyclePeriod;
          h.isActive = cycle < h.onTime;
        }
      }

      // 4. Update Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.isDead) {
          this.enemies.splice(i, 1);
          this.enemiesDefeated++;
          if (window.CQ.Storage) {
            window.CQ.Storage.addStat('enemiesDefeated', 1);
            window.CQ.Storage.unlockAchievement('first_blood');
          }
          this.triggerComboEvent();
          continue;
        }
        enemy.update(dt, player, this, this.projectiles);
      }

      // 5. Update Boss
      if (this.boss) {
        this.boss.update(dt, player, this, this.projectiles, camera);
        if (this.boss.isDead && !this.exitUnlocked && this.boss.deathTimer <= 0) {
          this.exitUnlocked = true;
          if (window.CQ.Storage) window.CQ.Storage.unlockAchievement('boss_slayer');
          if (window.CQ.Particles) {
            window.CQ.Particles.createExplosion(this.exit.x + this.exit.width / 2, this.exit.y + this.exit.height / 2, C.COLORS.GREEN, 40);
            window.CQ.Particles.addText('CORE PORTAL OPENED!', this.exit.x + this.exit.width / 2, this.exit.y - 30, C.COLORS.GREEN, 22);
          }
        }
      }

      // 6. Update Projectiles
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        proj.life -= dt;
        if (proj.gravity) proj.vy += proj.gravity * dt;
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        let hit = false;
        for (const p of this.platforms) {
          if (
            proj.x >= p.x && proj.x <= p.x + p.width &&
            proj.y >= p.y && proj.y <= p.y + p.height
          ) {
            hit = true;
            break;
          }
        }

        if (!hit && proj.fromEnemy && !player.isDead) {
          const dx = (player.x + player.width / 2) - proj.x;
          const dy = (player.y + player.height / 2) - proj.y;
          if (Math.hypot(dx, dy) < proj.radius + player.width / 2) {
            player.takeDamage(proj.damage, proj.x);
            hit = true;
          }
        }

        if (hit || proj.life <= 0) {
          if (window.CQ.Particles) {
            window.CQ.Particles.createHitSparks(proj.x, proj.y, 6, proj.color);
          }
          this.projectiles.splice(i, 1);
        }
      }

      // 7. Update Ambient Rain / Particles
      for (const p of this.ambientParticles) {
        if (this.levelId === 1) {
          // Cyberpunk slant rain
          p.y += p.speed * dt * 4;
          p.x += p.speed * dt * 1.5;
        } else {
          // Floating digital motes
          p.y -= p.speed * dt * 0.4;
          p.x += Math.sin(this.animTime + p.y * 0.05) * 15 * dt;
        }
        if (p.y > C.CANVAS_HEIGHT) {
          p.y = -10;
          p.x = Math.random() * C.CANVAS_WIDTH;
        } else if (p.y < -10) {
          p.y = C.CANVAS_HEIGHT + 10;
          p.x = Math.random() * C.CANVAS_WIDTH;
        }
        if (p.x > C.CANVAS_WIDTH) p.x = 0;
      }

      // 8. Check Player vs Collectibles
      this.checkCollectibles(player);

      // 9. Check Player vs Checkpoints
      this.checkCheckpoints(player);

      // 10. Check Combat Attacks
      this.checkCombat(player);

      // 11. Check Player vs Hazards
      this.checkHazards(player);

      // 12. Check Player vs Enemy Contact
      this.checkEnemyContact(player);

      // 13. Check Bottom Pit Fall
      if (player.y > this.height + 40 && !player.isDead) {
        player.die();
      }
    }

    resolvePlayerPhysics(player, dt) {
      if (player.isDead) return;

      // HORIZONTAL MOVEMENT & WALL COLLISIONS
      player.x += player.vx * dt;

      if (player.x < 0) {
        player.x = 0;
        player.vx = 0;
      } else if (player.x + player.width > this.width) {
        player.x = this.width - player.width;
        player.vx = 0;
      }

      for (const p of this.platforms) {
        if (
          player.y + player.height > p.y + 4 &&
          player.y < p.y + p.height - 4
        ) {
          if (player.vx > 0 && player.x + player.width > p.x && player.x < p.x) {
            player.x = p.x - player.width;
            player.vx = 0;
          } else if (player.vx < 0 && player.x < p.x + p.width && player.x + player.width > p.x + p.width) {
            player.x = p.x + p.width;
            player.vx = 0;
          }
        }
      }

      // VERTICAL MOVEMENT & FLOOR/CEILING COLLISIONS
      player.y += player.vy * dt;
      let onGroundThisFrame = false;

      // 1. Static Platforms with sweep check
      for (const p of this.platforms) {
        if (player.x + player.width > p.x && player.x < p.x + p.width) {
          // Landing on top
          const wasAbove = player.prevY + player.height <= p.y + 6;
          const isNowOnOrBelow = player.y + player.height >= p.y;
          const notTooFarBelow = player.y + player.height <= p.y + Math.max(20, player.vy * dt + 10);

          if (player.vy >= 0 && wasAbove && isNowOnOrBelow && notTooFarBelow) {
            player.y = p.y - player.height;
            player.vy = 0;
            onGroundThisFrame = true;
          } else if (
            player.vy < 0 &&
            player.y <= p.y + p.height &&
            player.y >= p.y + p.height - 18
          ) {
            player.y = p.y + p.height;
            player.vy = 0;
          }
        }
      }

      // 2. Moving Platforms (Sweep check & anti-tunneling)
      for (const mp of this.movingPlatforms) {
        if (player.x + player.width >= mp.x - 4 && player.x <= mp.x + mp.width + 4) {
          const prevBottom = player.prevY + player.height;
          const currBottom = player.y + player.height;
          const isFallingOrStanding = player.vy >= 0;
          const wasAbove = prevBottom <= mp.y + Math.max(16, player.vy * dt + 6);
          const isNowOnOrBelow = currBottom >= mp.y - 2;
          const notTooFarBelow = currBottom <= mp.y + Math.max(28, player.vy * dt + 14);

          if (isFallingOrStanding && wasAbove && isNowOnOrBelow && notTooFarBelow) {
            player.y = mp.y - player.height;
            player.vy = 0;
            onGroundThisFrame = true;

            const spdX = (typeof mp.speed === 'number' && mp.axis === 'x') ? mp.speed : 0;
            const spdY = (typeof mp.speed === 'number' && mp.axis === 'y') ? mp.speed : 0;

            if (spdX !== 0) {
              player.x += spdX * dt;
              player._lastPlatformSpeedX = spdX;
              player._platformSpeedTimer = 0.12;
            }
            if (spdY !== 0) {
              player.y += spdY * dt;
            }
          }
        }
      }

      // 3. Falling Platforms (Sweep check & anti-tunneling)
      for (const fp of this.fallingPlatforms) {
        if (fp.state === 'respawning') continue;

        const currentY = fp.currentY;
        if (player.x + player.width >= fp.x - 3 && player.x <= fp.x + fp.width + 3) {
          const prevBottom = player.prevY + player.height;
          const currBottom = player.y + player.height;
          const isFallingOrStanding = player.vy >= 0;
          const wasAbove = prevBottom <= currentY + Math.max(16, player.vy * dt + 6);
          const isNowOnOrBelow = currBottom >= currentY - 2;
          const notTooFarBelow = currBottom <= currentY + Math.max(28, player.vy * dt + 14);

          if (isFallingOrStanding && wasAbove && isNowOnOrBelow && notTooFarBelow) {
            player.y = currentY - player.height;
            player.vy = 0;
            onGroundThisFrame = true;

            if (fp.state === 'idle') {
              fp.state = 'shaking';
              fp.timer = 0;
            }
          }
        }
      }

      player.onGround = onGroundThisFrame;
    }

    checkCollectibles(player) {
      if (player.isDead) return;

      for (const c of this.collectibles) {
        if (c.collected) continue;

        const dx = (player.x + player.width / 2) - c.x;
        const dy = (player.y + player.height / 2) - c.y;
        if (Math.hypot(dx, dy) < 30) {
          c.collected = true;

          if (c.type === 'coin') {
            this.coinsCollected++;
            this.triggerComboEvent();
            const earned = C.SCORE.COIN * this.comboMultiplier;

            if (window.CQ.Storage) window.CQ.Storage.addStat('coinsCollected', 1);
            if (window.CQ.Audio) window.CQ.Audio.playCoin();
            if (window.CQ.Particles) {
              window.CQ.Particles.createCoinSparkles(c.x, c.y);
              const comboSuffix = this.comboMultiplier > 1 ? ` (x${this.comboMultiplier})` : '';
              window.CQ.Particles.addText(`+${earned}${comboSuffix}`, c.x, c.y - 12, this.palette.primary, 17);
            }
          } else if (c.type === 'bonus_shard') {
            this.bonusShardsCollected++;
            if (window.CQ.Storage) {
              window.CQ.Storage.addStat('bonusShardsFound', 1);
              window.CQ.Storage.unlockAchievement('secret_hunter');
            }
            if (window.CQ.Audio) window.CQ.Audio.playBonusShard();
            if (window.CQ.Particles) {
              window.CQ.Particles.createExplosion(c.x, c.y, '#ffd700', 24);
              window.CQ.Particles.addText('SECRET BONUS SHARD! +500', c.x, c.y - 25, '#ffd700', 20, 1.2);
            }
          } else {
            player.applyPowerup(c.type);
          }
        }
      }
    }

    checkCheckpoints(player) {
      if (player.isDead) return;

      for (const cp of this.checkpoints) {
        if (cp.activated) continue;

        if (
          player.x + player.width > cp.x &&
          player.x < cp.x + cp.width &&
          player.y + player.height > cp.y &&
          player.y < cp.y + cp.height
        ) {
          cp.activated = true;
          player.setCheckpoint(cp.x, cp.y + cp.height - player.height);

          if (window.CQ.Audio) window.CQ.Audio.playCheckpoint();
          if (window.CQ.Particles) {
            window.CQ.Particles.createCheckpointBurst(cp.x + cp.width / 2, cp.y + cp.height / 2);
            window.CQ.Particles.addText('CHECKPOINT ACTIVATED!', cp.x + cp.width / 2, cp.y - 25, C.COLORS.GREEN, 18);
          }
        }
      }
    }

    checkCombat(player) {
      if (!player.isAttacking || !player.attackHitbox) return;
      const hb = player.attackHitbox;

      for (const enemy of this.enemies) {
        if (enemy.isDead || hb.hitEntities.has(enemy)) continue;

        if (
          hb.x + hb.width > enemy.x &&
          hb.x < enemy.x + enemy.width &&
          hb.y + hb.height > enemy.y &&
          hb.y < enemy.y + enemy.height
        ) {
          hb.hitEntities.add(enemy);
          enemy.takeDamage(hb.damage, player.x + player.width / 2);
          player.triggerHitStop();
        }
      }

      if (this.boss && !this.boss.isDead && !hb.hitEntities.has(this.boss)) {
        if (
          hb.x + hb.width > this.boss.x &&
          hb.x < this.boss.x + this.boss.width &&
          hb.y + hb.height > this.boss.y &&
          hb.y < this.boss.y + this.boss.height
        ) {
          hb.hitEntities.add(this.boss);
          this.boss.takeDamage(hb.damage, player.x + player.width / 2);
          player.triggerHitStop();
        }
      }
    }

    checkHazards(player) {
      if (player.isDead) return;

      for (const h of this.hazards) {
        if (h.type === 'spike') {
          if (
            player.x + player.width > h.x &&
            player.x < h.x + h.width &&
            player.y + player.height > h.y &&
            player.y < h.y + h.height
          ) {
            player.takeDamage(35, h.x + h.width / 2);
          }
        } else if (h.type === 'laser') {
          if (h.isActive) {
            if (
              player.x + player.width > h.x &&
              player.x < h.x + h.width &&
              player.y + player.height > h.y &&
              player.y < h.y + h.height
            ) {
              player.takeDamage(25, h.x);
            }
          }
        }
      }
    }

    checkEnemyContact(player) {
      if (player.isDead) return;

      for (const enemy of this.enemies) {
        if (enemy.isDead) continue;
        if (
          player.x + player.width > enemy.x &&
          player.x < enemy.x + enemy.width &&
          player.y + player.height > enemy.y &&
          player.y < enemy.y + enemy.height
        ) {
          player.takeDamage(enemy.contactDamage, enemy.x + enemy.width / 2);
        }
      }

      if (this.boss && !this.boss.isDead) {
        if (
          player.x + player.width > this.boss.x &&
          player.x < this.boss.x + this.boss.width &&
          player.y + player.height > this.boss.y &&
          player.y < this.boss.y + this.boss.height
        ) {
          player.takeDamage(this.boss.contactDamage, this.boss.x + this.boss.width / 2);
        }
      }
    }

    checkExit(player) {
      if (!this.exitUnlocked || player.isDead) return false;

      return (
        player.x + player.width > this.exit.x &&
        player.x < this.exit.x + this.exit.width &&
        player.y + player.height > this.exit.y &&
        player.y < this.exit.y + this.exit.height
      );
    }

    // -------------------------------------------------------------
    // RENDERING PIPELINE — 4 Layer Parallax & Visual Polish
    // -------------------------------------------------------------
    render(ctx, camera) {
      this.renderParallaxBackground(ctx, camera);
      this.renderPlatforms(ctx, camera);
      this.renderHazards(ctx, camera);
      this.renderCheckpoints(ctx, camera);
      this.renderCollectibles(ctx, camera);
      this.renderExit(ctx, camera);
      this.renderProjectiles(ctx, camera);

      // Render Enemies
      for (const enemy of this.enemies) {
        enemy.render(ctx, camera);
      }

      // Render Boss
      if (this.boss) {
        this.boss.render(ctx, camera);
      }

      // Render Ambient atmospheric particles (rain, motes, heat)
      this.renderAmbient(ctx);

      // Render Debug overlay hitboxes if F3 is enabled
      if (window.CQ.GameInstance && window.CQ.GameInstance.showDebugOverlay) {
        this.renderDebugHitboxes(ctx, camera);
      }
    }

    renderParallaxBackground(ctx, camera) {
      const w = camera.width;
      const h = camera.height;
      const pal = this.palette;

      // LAYER 1: Deep cosmic / digital sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, pal.bg);
      skyGrad.addColorStop(0.6, '#080c1d');
      skyGrad.addColorStop(1, '#110b24');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // LAYER 2: Distant cyber grid / starfield (Parallax factor 0.08)
      ctx.save();
      ctx.strokeStyle = `${pal.primary}18`;
      ctx.lineWidth = 1;

      const gridSize = 64;
      const offX = -(camera.x * 0.08) % gridSize;
      const offY = -(camera.y * 0.08) % gridSize;

      for (let x = offX; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = offY; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // LAYER 3: Distant Megacity Silhouette (Parallax factor 0.18, atmospheric alpha)
      ctx.save();
      ctx.globalAlpha = 0.35;
      const skylineOffset = -(camera.x * 0.18);
      ctx.fillStyle = '#070b16';
      for (let i = -2; i < 24; i++) {
        const bx = (i * 110) + (skylineOffset % (110 * 24));
        const bh = 150 + Math.sin(i * 3.4) * 80;
        ctx.fillRect(bx, h - bh, 85, bh);

        // Neon antenna lights
        ctx.fillStyle = (i % 2 === 0) ? pal.primary : pal.secondary;
        ctx.fillRect(bx + 40, h - bh - 8, 3, 8);
        ctx.fillStyle = '#070b16';
      }
      ctx.restore();

      // LAYER 4: Midground High-Tech Cyber Structures (Parallax factor 0.35, atmospheric alpha)
      ctx.save();
      ctx.globalAlpha = 0.45;
      const midOffset = -(camera.x * 0.35);
      ctx.fillStyle = '#0e1628';
      for (let j = -2; j < 18; j++) {
        const mx = (j * 160) + (midOffset % (160 * 18));
        const mh = 100 + Math.cos(j * 2.5) * 50;
        ctx.fillRect(mx, h - mh, 110, mh);

        // Glowing circuit lines on mid towers
        ctx.strokeStyle = `${pal.secondary}30`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mx + 20, h - mh + 20);
        ctx.lineTo(mx + 90, h - mh + 20);
        ctx.lineTo(mx + 90, h);
        ctx.stroke();
        ctx.fillStyle = '#0e1628';
      }
      ctx.restore();

      ctx.restore();
    }

    renderAmbient(ctx) {
      ctx.save();
      const pal = this.palette;

      if (this.levelId === 1) {
        // Cyan rain strokes
        ctx.strokeStyle = `${pal.primary}50`;
        ctx.lineWidth = 1.5;
        for (const p of this.ambientParticles) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 4, p.y + p.len);
          ctx.stroke();
        }
      } else if (this.levelId === 5) {
        // Glitch bars & golden energy streams
        for (const p of this.ambientParticles) {
          ctx.fillStyle = Math.random() > 0.4 ? `${pal.primary}60` : `${pal.secondary}40`;
          ctx.fillRect(p.x, p.y, Math.random() * 20 + 5, 2);
        }
      } else {
        // Floating glowing digital motes
        for (const p of this.ambientParticles) {
          ctx.fillStyle = `${pal.primary}70`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    renderPlatforms(ctx, camera) {
      ctx.save();
      const pal = this.palette;

      // 1. Static Platforms
      for (const p of this.platforms) {
        const sx = Math.round(p.x - camera.x);
        const sy = Math.round(p.y - camera.y);

        if (sx + p.width < -10 || sx > camera.width + 10 || sy + p.height < -10 || sy > camera.height + 10) {
          continue;
        }

        ctx.fillStyle = C.COLORS.PLATFORM_BODY;
        ctx.fillRect(sx, sy, p.width, p.height);

        // High-tech internal circuit border
        ctx.strokeStyle = `${pal.primary}25`;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 3, sy + 3, p.width - 6, p.height - 6);

        // Glowing Top Edge
        ctx.fillStyle = pal.primary;
        ctx.shadowColor = pal.primary;
        ctx.shadowBlur = 8;
        ctx.fillRect(sx, sy, p.width, 3);
        ctx.shadowBlur = 0;
      }

      // 2. Moving Platforms (with Cyber Track Rail)
      for (const mp of this.movingPlatforms) {
        // Draw kinetic cyber transit rail
        if (mp.axis === 'x' && mp.minX !== undefined && mp.maxX !== undefined) {
          const railX1 = Math.round(mp.minX - camera.x);
          const railX2 = Math.round(mp.maxX + mp.width - camera.x);
          const railY  = Math.round(mp.y + mp.height / 2 - camera.y);
          if (railX2 >= -20 && railX1 <= camera.width + 20) {
            ctx.save();
            ctx.strokeStyle = `${pal.primary}40`;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(railX1, railY);
            ctx.lineTo(railX2, railY);
            ctx.stroke();
            ctx.setLineDash([]);
            // End guide markers
            ctx.fillStyle = pal.primary;
            ctx.fillRect(railX1 - 2, railY - 4, 4, 8);
            ctx.fillRect(railX2 - 2, railY - 4, 4, 8);
            ctx.restore();
          }
        } else if (mp.axis === 'y' && mp.minY !== undefined && mp.maxY !== undefined) {
          const railX  = Math.round(mp.x + mp.width / 2 - camera.x);
          const railY1 = Math.round(mp.minY - camera.y);
          const railY2 = Math.round(mp.maxY + mp.height - camera.y);
          if (railX >= -20 && railX <= camera.width + 20) {
            ctx.save();
            ctx.strokeStyle = `${pal.primary}40`;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(railX, railY1);
            ctx.lineTo(railX, railY2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = pal.primary;
            ctx.fillRect(railX - 4, railY1 - 2, 8, 4);
            ctx.fillRect(railX - 4, railY2 - 2, 8, 4);
            ctx.restore();
          }
        }

        const sx = Math.round(mp.x - camera.x);
        const sy = Math.round(mp.y - camera.y);

        if (sx + mp.width < -10 || sx > camera.width + 10) continue;

        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(sx, sy, mp.width, mp.height);

        ctx.fillStyle = pal.secondary;
        ctx.shadowColor = pal.secondary;
        ctx.shadowBlur = 10;
        ctx.fillRect(sx, sy, mp.width, 4);

        // Thruster arrow indicators
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        const arrowDir = mp.speed > 0 ? '▶' : '◀';
        ctx.font = '10px monospace';
        ctx.fillText(arrowDir, sx + mp.width / 2 - 4, sy + mp.height - 5);
      }

      // 3. Falling Platforms
      for (const fp of this.fallingPlatforms) {
        if (fp.state === 'respawning') continue;

        const sx = Math.round(fp.x - camera.x + fp.shakeOffset);
        const sy = Math.round(fp.currentY - camera.y);

        ctx.fillStyle = fp.state === 'shaking' ? '#ff3344' : '#1e293b';
        ctx.fillRect(sx, sy, fp.width, fp.height);

        ctx.fillStyle = fp.state === 'shaking' ? '#ffe600' : '#00f3ff';
        ctx.fillRect(sx, sy, fp.width, 3);
      }

      ctx.restore();
    }

    renderHazards(ctx, camera) {
      ctx.save();

      for (const h of this.hazards) {
        const sx = Math.round(h.x - camera.x);
        const sy = Math.round(h.y - camera.y);

        if (h.type === 'spike') {
          ctx.fillStyle = C.COLORS.HAZARD_SPIKE;
          ctx.shadowColor = C.COLORS.HAZARD_SPIKE;
          ctx.shadowBlur = 8;

          const spikeCount = Math.floor(h.width / 16);
          const stepW = h.width / spikeCount;

          ctx.beginPath();
          for (let i = 0; i < spikeCount; i++) {
            const x0 = sx + i * stepW;
            const xMid = x0 + stepW / 2;
            const x1 = x0 + stepW;
            ctx.moveTo(x0, sy + h.height);
            ctx.lineTo(xMid, sy);
            ctx.lineTo(x1, sy + h.height);
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (h.type === 'laser') {
          if (h.isActive) {
            ctx.strokeStyle = C.COLORS.HAZARD_LASER;
            ctx.lineWidth = h.width;
            ctx.shadowColor = C.COLORS.HAZARD_LASER;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.moveTo(sx + h.width / 2, sy);
            ctx.lineTo(sx + h.width / 2, sy + h.height);
            ctx.stroke();

            // White core beam
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(sx + h.width / 2, sy);
            ctx.lineTo(sx + h.width / 2, sy + h.height);
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            // Inactive warning beam
            ctx.strokeStyle = 'rgba(255, 34, 85, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx + h.width / 2, sy);
            ctx.lineTo(sx + h.width / 2, sy + h.height);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }

    renderCheckpoints(ctx, camera) {
      ctx.save();
      for (const cp of this.checkpoints) {
        const sx = Math.round(cp.x - camera.x);
        const sy = Math.round(cp.y - camera.y);

        ctx.fillStyle = cp.activated ? C.COLORS.GREEN : '#475569';
        ctx.fillRect(sx, sy + cp.height - 8, cp.width, 8);

        // Holographic beacon beam
        ctx.strokeStyle = cp.activated ? 'rgba(0, 255, 102, 0.8)' : 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 2;
        ctx.shadowColor = cp.activated ? C.COLORS.GREEN : 'transparent';
        ctx.shadowBlur = cp.activated ? 12 : 0;
        ctx.strokeRect(sx + 4, sy, cp.width - 8, cp.height - 8);

        ctx.font = '16px monospace';
        ctx.fillText('📡', sx + 8, sy + 24);
      }
      ctx.restore();
    }

    renderCollectibles(ctx, camera) {
      ctx.save();
      for (const c of this.collectibles) {
        if (c.collected) continue;

        const sx = Math.round(c.x - camera.x);
        const floatY = Math.sin(this.animTime * 4 + c.animOffset) * 6;
        const sy = Math.round(c.y - camera.y + floatY);

        if (sx < -20 || sx > camera.width + 20) continue;

        if (c.type === 'coin') {
          // Shimmering Energy Shard Diamond
          ctx.fillStyle = this.palette.primary;
          ctx.shadowColor = this.palette.primary;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 10);
          ctx.lineTo(sx + 8, sy);
          ctx.lineTo(sx, sy + 10);
          ctx.lineTo(sx - 8, sy);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (c.type === 'bonus_shard') {
          // Secret Bonus Shard: Pulsating multi-faceted golden diamond with orbital halo
          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.moveTo(sx, sy - 14);
          ctx.lineTo(sx + 12, sy);
          ctx.lineTo(sx, sy + 14);
          ctx.lineTo(sx - 12, sy);
          ctx.closePath();
          ctx.fill();

          // Orbital spinning ring
          ctx.strokeStyle = '#ff007f';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 18, 7, this.animTime * 3, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('★', sx - 4, sy + 3);
        } else {
          // Power-up Icon Box
          const pInfo = C.POWERUPS[c.type.toUpperCase()];
          const color = pInfo ? pInfo.color : '#ffe600';
          const icon = pInfo ? pInfo.icon : '⚡';

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.strokeRect(sx - 12, sy - 12, 24, 24);

          ctx.fillStyle = `${color}20`;
          ctx.fillRect(sx - 12, sy - 12, 24, 24);

          ctx.font = '14px sans-serif';
          ctx.fillText(icon, sx - 7, sy + 5);
        }
      }
      ctx.restore();
    }

    renderExit(ctx, camera) {
      const sx = Math.round(this.exit.x - camera.x);
      const sy = Math.round(this.exit.y - camera.y);
      const cx = sx + this.exit.width / 2;
      const cy = sy + this.exit.height / 2;

      ctx.save();

      // Spec C: Animated exit portal with dual rotating rings and particle inflow
      const outerAngle = this.animTime * 2.5;
      const innerAngle = -this.animTime * 3.5;

      const portalColor = this.exitUnlocked ? C.COLORS.GREEN : C.COLORS.RED;
      ctx.shadowColor = portalColor;
      ctx.shadowBlur = 20;

      // Outer Rotating Ring
      ctx.strokeStyle = portalColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, outerAngle, outerAngle + Math.PI * 1.5);
      ctx.stroke();

      // Inner Counter-Rotating Ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, innerAngle, innerAngle + Math.PI * 1.5);
      ctx.stroke();

      // Central Singularity Core
      ctx.fillStyle = portalColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();

      // Inflow particles (suction effect)
      for (let k = 0; k < 4; k++) {
        const ang = (this.animTime * 4 + k * (Math.PI / 2)) % (Math.PI * 2);
        const dist = 32 - ((this.animTime * 40 + k * 10) % 24);
        const px = cx + Math.cos(ang) * dist;
        const py = cy + Math.sin(ang) * dist;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, 2, 2);
      }

      ctx.restore();
    }

    renderProjectiles(ctx, camera) {
      ctx.save();
      for (const p of this.projectiles) {
        const sx = Math.round(p.x - camera.x);
        const sy = Math.round(p.y - camera.y);

        ctx.fillStyle = p.color || '#ff0055';
        ctx.shadowColor = p.color || '#ff0055';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius || 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, (p.radius || 5) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    renderDebugHitboxes(ctx, camera) {
      ctx.save();
      ctx.lineWidth = 1;

      // Platforms: Blue outline
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
      for (const p of this.platforms) {
        ctx.strokeRect(p.x - camera.x, p.y - camera.y, p.width, p.height);
      }

      // Hazards: Red outline
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
      for (const h of this.hazards) {
        ctx.strokeRect(h.x - camera.x, h.y - camera.y, h.width, h.height);
      }

      // Enemies: Orange outline
      ctx.strokeStyle = 'rgba(255, 140, 0, 0.9)';
      for (const e of this.enemies) {
        ctx.strokeRect(e.x - camera.x, e.y - camera.y, e.width, e.height);
      }

      // Exit: Green outline
      ctx.strokeStyle = 'rgba(0, 255, 100, 0.9)';
      ctx.strokeRect(this.exit.x - camera.x, this.exit.y - camera.y, this.exit.width, this.exit.height);

      ctx.restore();
    }
  }

  window.CQ.Level = Level;
})();
