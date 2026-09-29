// CYBER QUEST - Cybernetic Player Character Engine (Enhanced v2)
// Implements: split rise/fall gravity, coyote time 100ms, jump buffer 120ms,
//             variable jump (50% cut), squash/stretch 0.85-1.15 / 100ms,
//             hit-stop 50ms, invuln 1.2s + blink, 70% air control,
//             ground accel to max in ~80ms, visible energy arc, 0.35s cooldown,
//             afterimage dash trail, dynamic visor glow, difficulty scaling.
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  const C = window.CQ.Constants;

  class Player {
    constructor(x, y) {
      this.spawnX = x;
      this.spawnY = y;
      this.checkpointX = x;
      this.checkpointY = y;

      this.width  = C.PLAYER.WIDTH;
      this.height = C.PLAYER.HEIGHT;

      this.x  = x;
      this.y  = y;
      this.vx = 0;
      this.vy = 0;

      // Sub-frame interpolation
      this.prevX = x;
      this.prevY = y;
      this.renderX = x;
      this.renderY = y;

      this.facingRight    = true;
      this.onGround       = false;
      this.wasOnGround    = false;
      this.coyoteTimer    = 0;
      this.jumpBufferTimer= 0;
      this.isJumping      = false;
      this.canDoubleJump  = false;
      this.hasDoubleJumped= false;

      // Difficulty setting
      const settings = window.CQ.Storage ? window.CQ.Storage.getSettings() : { difficulty: 'normal' };
      const diffKey = settings.difficulty || 'normal';
      const diffConfig = C.DIFFICULTY[diffKey] || C.DIFFICULTY.normal;

      this.difficultyConfig = diffConfig;
      this.maxHp    = diffConfig.playerHp;
      this.hp       = this.maxHp;
      this.lives    = C.PLAYER.INITIAL_LIVES;
      this.invulnTimer = 0;
      this.isDead   = false;
      this.victory  = false;
      this.tookDamageInLevel = false;

      // Combat Slash
      this.attackCooldownTimer = 0;
      this.attackActiveTimer   = 0;
      this.isAttacking         = false;
      this.attackHitbox        = null;

      // Hit-stop
      this.hitStopTimer = 0;

      // Squash & Stretch
      this.scaleX       = 1.0;
      this.scaleY       = 1.0;
      this.squashTimer  = 0;
      this.squashTargetX= 1.0;
      this.squashTargetY= 1.0;

      // Active Power-ups
      this.activePowerups = {
        shield: 0,
        speed: 0,
        doubleJump: 0,
        damage: 0
      };

      // Afterimage trail for speed boost
      this.afterimages = [];
      this.afterimageTimer = 0;

      // Animation & Visuals
      this.state     = 'idle';
      this.animTime  = 0;
      this.runCycle  = 0;
      this.dustTimer = 0;

      // Attack arc visual parameters
      this._arcAngle   = 0;
      this._arcAlpha   = 0;

      // Moving platform momentum transfer
      this._lastPlatformSpeedX = 0;
      this._platformSpeedTimer = 0;
    }

    setCheckpoint(x, y) {
      this.checkpointX = x;
      this.checkpointY = y;
    }

    respawn(useCheckpoint = true) {
      this.x  = useCheckpoint ? this.checkpointX : this.spawnX;
      this.y  = useCheckpoint ? this.checkpointY : this.spawnY;
      this.prevX = this.x;
      this.prevY = this.y;
      this.renderX = this.x;
      this.renderY = this.y;
      this.vx = 0;
      this.vy = 0;
      this.hp = this.maxHp;
      this.isDead   = false;
      this.invulnTimer = 1.0;
      this.isJumping   = false;
      this.onGround    = false;
      this.wasOnGround = false;
      this.coyoteTimer    = 0;
      this.jumpBufferTimer = 0;
      this.hasDoubleJumped = false;
      this.canDoubleJump   = false;
      this.state = 'idle';
      this.isAttacking = false;
      this.attackActiveTimer = 0;
      this.attackCooldownTimer = 0;
      this.attackHitbox = null;
      this.hitStopTimer = 0;
      this.scaleX = 1.0;
      this.scaleY = 1.0;
      this.squashTimer = 0;
      this.afterimages = [];
      this._lastPlatformSpeedX = 0;
      this._platformSpeedTimer = 0;

      if (window.CQ.Storage) {
        window.CQ.Storage.addStat('deaths', 1);
      }
    }

    applyPowerup(type) {
      const pInfo = C.POWERUPS[type.toUpperCase()];
      if (!pInfo) return;
      const key = type === 'DOUBLE_JUMP' ? 'doubleJump' : type.toLowerCase();
      this.activePowerups[key] = pInfo.duration;
      if (window.CQ.Audio) window.CQ.Audio.playPowerup();
      if (window.CQ.Particles) {
        window.CQ.Particles.createExplosion(this.x + this.width / 2, this.y + this.height / 2, pInfo.color, 16);
        window.CQ.Particles.addText(pInfo.name + ' ACTIVE!', this.x + this.width / 2, this.y - 20, pInfo.color, 16);
      }

      // Check achievement for all 4 powerups
      if (this.activePowerups.shield > 0 && this.activePowerups.speed > 0 &&
          this.activePowerups.doubleJump > 0 && this.activePowerups.damage > 0) {
        if (window.CQ.Storage) window.CQ.Storage.unlockAchievement('overclocked');
      }
    }

    hasPowerup(name) {
      return (this.activePowerups[name] || 0) > 0;
    }

    takeDamage(amount, sourceX = null) {
      if (this.invulnTimer > 0 || this.isDead || this.victory) return false;

      this.tookDamageInLevel = true;

      // Shield absorbs hit
      if (this.hasPowerup('shield')) {
        this.activePowerups.shield = 0;
        this.invulnTimer = 0.8;
        if (window.CQ.Audio) window.CQ.Audio.playEnemyHit();
        if (window.CQ.Particles) {
          window.CQ.Particles.createExplosion(this.x + this.width / 2, this.y + this.height / 2, C.COLORS.CYAN, 20);
          window.CQ.Particles.addText('SHIELD BROKEN!', this.x + this.width / 2, this.y - 20, C.COLORS.CYAN);
        }
        return false;
      }

      // Difficulty scaling on incoming damage
      const mult = this.difficultyConfig ? this.difficultyConfig.damageTakenMult : 1.0;
      const actualDamage = Math.round(amount * mult);

      this.hp -= actualDamage;
      this.invulnTimer = C.PLAYER.INVULN_TIME; // 1.2s per spec
      this.state = 'hurt';

      // Squash on damage
      this._triggerSquash(1.2, 0.8);

      if (window.CQ.Audio) window.CQ.Audio.playPlayerDamage();
      if (window.CQ.Particles) {
        window.CQ.Particles.createHitSparks(this.x + this.width / 2, this.y + this.height / 2, 12, C.COLORS.RED);
        window.CQ.Particles.addText(`-${actualDamage} HP`, this.x + this.width / 2, this.y - 24, C.COLORS.RED);
      }

      // Camera shake on player damage (spec: max 6px, <=150ms)
      if (window.CQ.GameInstance && window.CQ.GameInstance.camera) {
        window.CQ.GameInstance.camera.shake(
          C.SHAKE.PLAYER_DAMAGE_INTENSITY,
          C.SHAKE.PLAYER_DAMAGE_DURATION
        );
      }

      // Knockback
      if (sourceX !== null) {
        this.vx = (this.x < sourceX ? -1 : 1) * 200;
        this.vy = -240;
      }

      if (this.hp <= 0) {
        this.hp = 0;
        this.die();
      }
      return true;
    }

    die() {
      if (this.isDead) return;
      this.isDead = true;
      this.state  = 'dead';
      this.vx = 0;
      this.vy = -300;
      if (window.CQ.Audio) window.CQ.Audio.playPlayerDeath();
      if (window.CQ.Particles) {
        window.CQ.Particles.createExplosion(this.x + this.width / 2, this.y + this.height / 2, C.COLORS.RED, 30);
      }
    }

    // ---------------------------------------------------------------
    // ATTACK — 0.35s cooldown, visible energy arc, short hitbox window
    // ---------------------------------------------------------------
    performAttack() {
      if (this.attackCooldownTimer > 0 || this.isDead || this.victory) return;

      this.isAttacking         = true;
      this.attackActiveTimer   = C.PLAYER.ATTACK_DURATION;
      this.attackCooldownTimer = C.PLAYER.ATTACK_COOLDOWN;
      this._arcAngle = 0;
      this._arcAlpha = 1.0;

      const slashReach = C.PLAYER.ATTACK_RANGE;
      const slashHeight = this.height * 1.1;
      const slashX = this.facingRight ? this.x + this.width - 5 : this.x - slashReach + 5;
      const slashY = this.y + (this.height - slashHeight) / 2;
      const damage = this.hasPowerup('damage') ? C.PLAYER.BOOST_ATTACK_DAMAGE : C.PLAYER.ATTACK_DAMAGE;

      this.attackHitbox = {
        x: slashX,
        y: slashY,
        width: slashReach,
        height: slashHeight,
        damage,
        hitEntities: new Set()
      };

      if (window.CQ.Audio) window.CQ.Audio.playSlash();
      if (window.CQ.Storage) window.CQ.Storage.addStat('slashes', 1);

      if (window.CQ.Particles) {
        window.CQ.Particles.createSlashArc(
          this.x + (this.facingRight ? this.width + 10 : -10),
          this.y + this.height / 2,
          this.facingRight
        );
      }
    }

    // Called on impact with enemy (spec: hit-stop 40-60ms)
    triggerHitStop() {
      this.hitStopTimer = C.PLAYER.HIT_STOP_DURATION; // 50ms
      if (window.CQ.GameInstance && window.CQ.GameInstance.camera) {
        window.CQ.GameInstance.camera.shake(
          C.SHAKE.ENEMY_HIT_INTENSITY,
          C.SHAKE.ENEMY_HIT_DURATION
        );
      }
    }

    _triggerSquash(targetX, targetY) {
      this.squashTargetX = targetX;
      this.squashTargetY = targetY;
      this.scaleX = targetX;
      this.scaleY = targetY;
      this.squashTimer = C.PLAYER.SQUASH_RECOVER_TIME;
    }

    _updateSquash(dt) {
      if (this.squashTimer > 0) {
        this.squashTimer -= dt;
        const progress = Math.max(0, this.squashTimer / C.PLAYER.SQUASH_RECOVER_TIME);
        this.scaleX = 1.0 + (this.squashTargetX - 1.0) * progress;
        this.scaleY = 1.0 + (this.squashTargetY - 1.0) * progress;
      } else {
        this.scaleX = 1.0;
        this.scaleY = 1.0;
      }
    }

    // ---------------------------------------------------------------
    // UPDATE — fixed 60Hz physics tick
    // ---------------------------------------------------------------
    update(dt, input) {
      // Store previous position for sub-frame render interpolation
      this.prevX = this.x;
      this.prevY = this.y;

      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt;
        this._updateSquash(dt);
        return;
      }

      if (this.isDead) {
        this.vy += C.GRAVITY_FALL * dt;
        this.y  += this.vy * dt;
        return;
      }

      this.animTime += dt;
      this.wasOnGround = this.onGround;

      // Landing detection
      if (!this.wasOnGround && this.onGround) {
        this._triggerSquash(C.PLAYER.SQUASH_LAND_X, C.PLAYER.SQUASH_LAND_Y);
        if (window.CQ.Particles) {
          window.CQ.Particles.createJumpDust(this.x + this.width / 2, this.y + this.height);
        }
      }

      this._updateSquash(dt);

      // Power-up countdowns
      for (const k in this.activePowerups) {
        if (this.activePowerups[k] > 0) {
          this.activePowerups[k] = Math.max(0, this.activePowerups[k] - dt);
        }
      }

      // Invulnerability countdown
      if (this.invulnTimer > 0) {
        this.invulnTimer = Math.max(0, this.invulnTimer - dt);
      }

      // Moving platform momentum decay timer
      if (this._platformSpeedTimer > 0) {
        this._platformSpeedTimer = Math.max(0, this._platformSpeedTimer - dt);
      }

      // Attack countdowns
      if (this.attackCooldownTimer > 0) {
        this.attackCooldownTimer -= dt;
      }
      if (this.attackActiveTimer > 0) {
        this.attackActiveTimer -= dt;
        const progress = 1 - (this.attackActiveTimer / C.PLAYER.ATTACK_DURATION);
        this._arcAngle = progress * Math.PI * 0.9;
        this._arcAlpha = 1.0 - progress * 0.6;

        if (this.attackHitbox) {
          const slashReach = C.PLAYER.ATTACK_RANGE;
          this.attackHitbox.x = this.facingRight ? this.x + this.width - 5 : this.x - slashReach + 5;
          this.attackHitbox.y = this.y + (this.height - this.attackHitbox.height) / 2;
        }
        if (this.attackActiveTimer <= 0) {
          this.isAttacking   = false;
          this.attackHitbox  = null;
          this._arcAlpha     = 0;
        }
      }

      // ---- INPUT READING ----
      const moveLeft     = input.isPressed('left');
      const moveRight    = input.isPressed('right');
      // consumeJustPressed clears the flag immediately preventing double-trigger
      // on 120Hz+ displays where 2+ physics steps can run in one RAF frame.
      const jumpPressed  = input.consumeJustPressed('jump');
      const jumpHeld     = input.isPressed('jump');
      const jumpReleased = input.wasJustReleased('jump');
      const attackPressed= input.consumeJustPressed('attack');

      if (attackPressed) this.performAttack();

      // ---- HORIZONTAL MOVEMENT ----
      const maxSpeed   = this.hasPowerup('speed') ? C.PLAYER.BOOST_MAX_SPEED : C.PLAYER.MAX_SPEED;
      const accelMult  = this.onGround ? 1.0 : C.PLAYER.AIR_ACCEL_MULT; // 70% air control
      const accel      = C.PLAYER.ACCEL * accelMult;
      const decel      = C.PLAYER.DECEL * accelMult;

      let targetVx = 0;
      if (moveLeft && !moveRight) {
        targetVx = -maxSpeed;
        this.facingRight = false;
      } else if (moveRight && !moveLeft) {
        targetVx = maxSpeed;
        this.facingRight = true;
      }

      if (targetVx !== 0) {
        if (this.vx < targetVx) {
          this.vx = Math.min(targetVx, this.vx + accel * dt);
        } else if (this.vx > targetVx) {
          this.vx = Math.max(targetVx, this.vx - accel * dt);
        }
      } else {
        if (this.vx > 0)      this.vx = Math.max(0, this.vx - decel * dt);
        else if (this.vx < 0) this.vx = Math.min(0, this.vx + decel * dt);
      }

      // ---- COYOTE TIME (100ms) ----
      if (this.onGround) {
        this.coyoteTimer    = C.PLAYER.COYOTE_TIME;
        this.hasDoubleJumped= false;
        this.isJumping      = false;
      } else {
        this.coyoteTimer -= dt;
      }

      // ---- JUMP BUFFER (120ms) ----
      if (jumpPressed) {
        this.jumpBufferTimer = C.PLAYER.JUMP_BUFFER;
      } else {
        this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      }

      // ---- EXECUTE JUMP ----
      const canJumpGround  = this.coyoteTimer > 0;
      const canDoubleJump  = this.hasPowerup('doubleJump') && !this.onGround && !this.hasDoubleJumped;

      if (this.jumpBufferTimer > 0) {
        if (canJumpGround) {
          this.vy              = C.PLAYER.JUMP_FORCE;
          // Transfer moving platform momentum to jump if moving in same direction
          if (this._platformSpeedTimer > 0 && Math.abs(this._lastPlatformSpeedX) > 10) {
            this.vx += this._lastPlatformSpeedX * 0.55;
            this._platformSpeedTimer = 0;
          }
          this.onGround        = false;
          this.coyoteTimer     = 0;
          this.jumpBufferTimer = 0;
          this.isJumping       = true;
          this._triggerSquash(C.PLAYER.SQUASH_JUMP_X, C.PLAYER.SQUASH_JUMP_Y);
          if (window.CQ.Audio) window.CQ.Audio.playJump();
          if (window.CQ.Storage) window.CQ.Storage.addStat('jumps', 1);
          if (window.CQ.Particles) window.CQ.Particles.createJumpDust(this.x + this.width / 2, this.y + this.height);
        } else if (canDoubleJump) {
          this.vy              = C.PLAYER.JUMP_FORCE * 0.95;
          this.hasDoubleJumped = true;
          this.jumpBufferTimer = 0;
          this.isJumping       = true;
          this._triggerSquash(C.PLAYER.SQUASH_JUMP_X, C.PLAYER.SQUASH_JUMP_Y);
          if (window.CQ.Audio) window.CQ.Audio.playDoubleJump();
          if (window.CQ.Storage) window.CQ.Storage.addStat('jumps', 1);
          if (window.CQ.Particles) {
            window.CQ.Particles.createExplosion(this.x + this.width / 2, this.y + this.height, C.COLORS.YELLOW, 12);
          }
        }
      }

      // ---- VARIABLE JUMP HEIGHT (releasing early cuts vy by ~50%) ----
      if (jumpReleased && this.vy < 0 && this.isJumping) {
        this.vy *= C.PLAYER.VAR_JUMP_MULT;
        if (this.vy > C.PLAYER.MIN_JUMP_FORCE) {
          this.vy = C.PLAYER.MIN_JUMP_FORCE;
        }
        this.isJumping = false;
      }
      if (!jumpHeld && this.vy < 0) {
        this.isJumping = false;
      }

      // ---- SPLIT GRAVITY (fall 1.5× rise) ----
      const gravity = (this.vy < 0) ? C.GRAVITY_RISE : C.GRAVITY_FALL;
      this.vy = Math.min(C.MAX_FALL_SPEED, this.vy + gravity * dt);

      // ---- ANIMATION STATE ----
      if (!this.onGround) {
        this.state = this.vy < 0 ? 'jumping' : 'falling';
      } else if (Math.abs(this.vx) > 15) {
        this.state = 'running';
        this.runCycle += dt * 14;
        this.dustTimer += dt;
        if (this.dustTimer > 0.14) {
          this.dustTimer = 0;
          if (window.CQ.Particles) {
            window.CQ.Particles.add(
              this.x + (this.facingRight ? 2 : this.width - 2),
              this.y + this.height,
              (this.facingRight ? -1 : 1) * 40, -15,
              C.COLORS.CYAN, 3, 0.18
            );
          }
        }
      } else {
        this.state = 'idle';
        this.runCycle = 0;
      }

      // ---- AFTERIMAGE TRAIL (for speed boost / dash) ----
      if (this.hasPowerup('speed') || Math.abs(this.vx) > 280) {
        this.afterimageTimer += dt;
        if (this.afterimageTimer >= 0.04) {
          this.afterimageTimer = 0;
          this.afterimages.push({
            x: this.x,
            y: this.y,
            alpha: 0.6,
            facingRight: this.facingRight,
            scaleX: this.scaleX,
            scaleY: this.scaleY
          });
          if (this.afterimages.length > 5) this.afterimages.shift();
        }
      }

      // Fade afterimages
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].alpha -= dt * 3.5;
        if (this.afterimages[i].alpha <= 0) {
          this.afterimages.splice(i, 1);
        }
      }
    }

    // ---------------------------------------------------------------
    // RENDER — with sub-frame interpolation, afterimages, squash/stretch
    // ---------------------------------------------------------------
    render(ctx, camera) {
      // Calculate interpolated rendering position
      const alpha = (window.CQ.GameInstance && window.CQ.GameInstance.renderAlpha) || 0;
      this.renderX = this.prevX + (this.x - this.prevX) * alpha;
      this.renderY = this.prevY + (this.y - this.prevY) * alpha;

      const screenX = this.renderX - camera.x;
      const screenY = this.renderY - camera.y;

      // Invulnerability blink (15Hz)
      if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 15) % 2 === 0) {
        return;
      }

      const w = this.width;
      const h = this.height;

      // 1. Render Afterimages
      for (const img of this.afterimages) {
        const imgScreenX = img.x - camera.x;
        const imgScreenY = img.y - camera.y;
        ctx.save();
        ctx.globalAlpha = img.alpha * 0.45;
        ctx.translate(imgScreenX + w / 2, imgScreenY + h / 2);
        ctx.scale(img.facingRight ? img.scaleX : -img.scaleX, img.scaleY);
        ctx.fillStyle = C.COLORS.MAGENTA;
        ctx.shadowColor = C.COLORS.MAGENTA;
        ctx.shadowBlur = 8;
        ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
        ctx.restore();
      }

      ctx.save();

      // Apply squash & stretch from center pivot
      const cx = screenX + w / 2;
      const cy = screenY + h / 2;
      ctx.translate(cx, cy);
      ctx.scale(
        this.facingRight ? this.scaleX : -this.scaleX,
        this.scaleY
      );

      // ---- CYBER SHIELD FORCEFIELD ----
      if (this.hasPowerup('shield')) {
        ctx.save();
        const pulse = 1 + Math.sin(this.animTime * 8) * 0.08;
        ctx.strokeStyle = C.COLORS.CYAN;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = C.COLORS.CYAN;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, (h / 2 + 8) * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 243, 255, 0.10)';
        ctx.fill();
        ctx.restore();
      }

      // ---- NEON SCARF / CAPE ----
      const scarfOff = Math.sin(this.animTime * 10) * 4;
      ctx.save();
      ctx.strokeStyle = this.hasPowerup('damage') ? C.COLORS.RED : C.COLORS.MAGENTA;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 4, -h / 2 + 10);
      ctx.quadraticCurveTo(-w / 2 - 12, -h / 2 + 12 + scarfOff, -w / 2 - 22, -h / 2 + 8 + scarfOff * 1.5);
      ctx.stroke();
      ctx.restore();

      // ---- LEGS with run-cycle animation ----
      const legRun = this.state === 'running' ? Math.sin(this.runCycle) * 8 : 0;
      ctx.fillStyle = '#0f172a';

      ctx.fillRect(-w / 2 + 3, h / 2 - 14, 8, 14 + (this.state === 'running' ? legRun : 0));
      ctx.fillRect(w / 2 - 11, h / 2 - 14, 8, 14 - (this.state === 'running' ? legRun : 0));

      // Neon boot thrusters
      ctx.fillStyle = this.hasPowerup('doubleJump') ? C.COLORS.YELLOW : C.COLORS.CYAN;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.fillRect(-w / 2 + 2, h / 2 - 4 + (this.state === 'running' ? legRun : 0), 10, 4);
      ctx.fillRect(w / 2 - 12, h / 2 - 4 - (this.state === 'running' ? legRun : 0), 10, 4);

      // ---- TORSO / CYBER ARMOR ----
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-w / 2 + 2, -h / 2 + 10, w - 4, h - 22);

      // Neon chest reactor (color changes with state)
      const reactorColor = this.hasPowerup('damage') ? C.COLORS.RED
                         : this.isDead ? '#444'
                         : C.COLORS.CYAN;
      ctx.fillStyle = reactorColor;
      ctx.shadowColor = reactorColor;
      ctx.shadowBlur = 10;
      const reactorPulse = 1 + Math.sin(this.animTime * 6) * 0.15;
      ctx.beginPath();
      ctx.arc(1, -h / 2 + 20, 3.5 * reactorPulse, 0, Math.PI * 2);
      ctx.fill();

      // ---- CYBERNETIC HELMET & VISOR ----
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-w / 2 + 3, -h / 2, w - 6, 12);

      // Glowing visor (changes color with powerup / state per spec)
      const visorColor = this.hasPowerup('damage') ? C.COLORS.RED
                       : this.hasPowerup('speed')  ? C.COLORS.MAGENTA
                       : this.hasPowerup('doubleJump') ? C.COLORS.YELLOW
                       : this.state === 'hurt'     ? C.COLORS.ORANGE
                       : C.COLORS.CYAN;
      ctx.fillStyle  = visorColor;
      ctx.shadowColor= visorColor;
      ctx.shadowBlur = 10;
      ctx.fillRect(0, -h / 2 + 3, w / 2 - 1, 4);
      ctx.shadowBlur = 0;

      // ---- ENERGY BLADE ATTACK ARC ----
      if (this.isAttacking && this._arcAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = this._arcAlpha;

        const bladeColor = this.hasPowerup('damage') ? C.COLORS.RED : C.COLORS.CYAN;
        const bladeStartAngle = -Math.PI / 2.8;
        const bladeEndAngle   = bladeStartAngle + this._arcAngle;
        const bladeLen = 44;

        ctx.strokeStyle = bladeColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = bladeColor;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 4, 0);
        ctx.lineTo(
          (w / 2 - 4) + Math.cos(bladeEndAngle) * bladeLen,
          Math.sin(bladeEndAngle) * bladeLen
        );
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = bladeColor;
        ctx.beginPath();
        ctx.arc(w / 2 - 4, 0, bladeLen, bladeStartAngle, bladeEndAngle, false);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
          (w / 2 - 4) + Math.cos(bladeEndAngle) * bladeLen,
          Math.sin(bladeEndAngle) * bladeLen,
          3, 0, Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
      } else {
        // Sheathed sword
        ctx.save();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 1, -h / 2 + 4);
        ctx.lineTo(-w / 2 - 8, -h / 2 + 26);
        ctx.stroke();
        ctx.fillStyle = C.COLORS.CYAN;
        ctx.fillRect(-w / 2 + 1, -h / 2 + 2, 4, 3);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  window.CQ.Player = Player;
})();
