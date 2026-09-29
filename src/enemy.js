// CYBER QUEST - Cybernetic Enemy AI System (Drone, Hunter, Shooter, Tank)
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  const C = window.CQ.Constants;

  // -------------------------------------------------------------
  // Base Enemy Class
  // -------------------------------------------------------------
  class Enemy {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.type = type;
      this.facingRight = false;

      this.maxHp = 35;
      this.hp = 35;
      this.contactDamage = 15;
      this.scoreValue = C.SCORE.ENEMY_DRONE;

      this.width = 30;
      this.height = 30;

      this.isDead = false;
      this.hitFlashTimer = 0;
      this.animTime = Math.random() * 10;
    }

    takeDamage(amount, sourceX) {
      if (this.isDead) return;

      this.hp -= amount;
      this.hitFlashTimer = 0.15;

      // Knockback
      const dir = (sourceX !== undefined && sourceX < this.x + this.width / 2) ? 1 : -1;
      this.vx = dir * 140;

      if (window.CQ.Audio) window.CQ.Audio.playEnemyHit();
      if (window.CQ.Particles) {
        window.CQ.Particles.createHitSparks(this.x + this.width / 2, this.y + this.height / 2, 8, C.COLORS.YELLOW);
        window.CQ.Particles.addText(`-${amount}`, this.x + this.width / 2, this.y - 12, C.COLORS.YELLOW);
      }

      if (this.hp <= 0) {
        this.die();
      }
    }

    die() {
      if (this.isDead) return;
      this.isDead = true;

      if (window.CQ.Audio) window.CQ.Audio.playEnemyDeath();
      if (window.CQ.Particles) {
        window.CQ.Particles.createExplosion(this.x + this.width / 2, this.y + this.height / 2, C.COLORS.MAGENTA, 20);
        window.CQ.Particles.addText(`+${this.scoreValue}`, this.x + this.width / 2, this.y - 16, C.COLORS.CYAN, 17);
      }
    }

    renderHealthBar(ctx, screenX, screenY) {
      if (this.hp < this.maxHp && this.hp > 0) {
        const barW = this.width;
        const barH = 4;
        const pct = Math.max(0, this.hp / this.maxHp);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(screenX, screenY - 8, barW, barH);
        ctx.fillStyle = pct > 0.4 ? C.COLORS.GREEN : C.COLORS.RED;
        ctx.fillRect(screenX, screenY - 8, barW * pct, barH);
      }
    }
  }

  // -------------------------------------------------------------
  // 1. DRONE - Flying Patrol Enemy
  // -------------------------------------------------------------
  class DroneEnemy extends Enemy {
    constructor(x, y, patrolDist = 120) {
      super(x, y, 'drone');
      this.startX = x;
      this.patrolDist = patrolDist;
      this.speed = 70;
      this.vx = this.speed;
      this.maxHp = 35;
      this.hp = 35;
      this.contactDamage = 15;
      this.scoreValue = C.SCORE.ENEMY_DRONE;
      this.width = 28;
      this.height = 24;
    }

    update(dt, player, level) {
      if (this.isDead) return;
      this.animTime += dt;
      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

      // Bobbing floating motion
      this.y += Math.sin(this.animTime * 4) * 0.4;

      // Patrol boundaries
      if (this.x > this.startX + this.patrolDist) {
        this.vx = -this.speed;
        this.facingRight = false;
      } else if (this.x < this.startX - this.patrolDist) {
        this.vx = this.speed;
        this.facingRight = true;
      }

      this.x += this.vx * dt;
    }

    render(ctx, camera) {
      if (this.isDead) return;
      const screenX = Math.round(this.x - camera.x);
      const screenY = Math.round(this.y - camera.y);

      ctx.save();
      ctx.translate(screenX + this.width / 2, screenY + this.height / 2);

      // Flashing white if hit
      if (this.hitFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#1e1b4b';
      }

      // Drone hull
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cyber Wings / Propellers
      ctx.strokeStyle = C.COLORS.CYAN;
      ctx.lineWidth = 2;
      ctx.shadowColor = C.COLORS.CYAN;
      ctx.shadowBlur = 6;
      const wingSpin = Math.sin(this.animTime * 20) * 4;
      ctx.strokeRect(-this.width / 2 - 4, -4 + wingSpin, 5, 8);
      ctx.strokeRect(this.width / 2 - 1, -4 - wingSpin, 5, 8);

      // Glowing Central Eye
      ctx.fillStyle = C.COLORS.RED;
      ctx.shadowColor = C.COLORS.RED;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.facingRight ? 4 : -4, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      this.renderHealthBar(ctx, screenX, screenY);
    }
  }

  // -------------------------------------------------------------
  // 2. HUNTER - Aggressive Stalker Mech
  // -------------------------------------------------------------
  class HunterEnemy extends Enemy {
    constructor(x, y, patrolDist = 90) {
      super(x, y, 'hunter');
      this.startX = x;
      this.patrolDist = patrolDist;
      this.speed = 65;
      this.chargeSpeed = 160;
      this.vx = this.speed;
      this.maxHp = 70;
      this.hp = 70;
      this.contactDamage = 20;
      this.scoreValue = C.SCORE.ENEMY_HUNTER;
      this.width = 32;
      this.height = 36;
      this.isChasing = false;
      this.onGround = false;
    }

    update(dt, player, level) {
      if (this.isDead) return;
      this.animTime += dt;
      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

      // Gravity
      this.vy = Math.min(C.MAX_FALL_SPEED, this.vy + C.GRAVITY * dt);

      // Distance to player
      const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
      const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
      const dist = Math.hypot(dx, dy);

      // Line of sight detection (within 280px radius and similar elevation)
      if (dist < 280 && Math.abs(dy) < 140) {
        this.isChasing = true;
        this.facingRight = dx > 0;
        this.vx = (dx > 0 ? 1 : -1) * this.chargeSpeed;
      } else {
        this.isChasing = false;
        if (this.x > this.startX + this.patrolDist) {
          this.vx = -this.speed;
          this.facingRight = false;
        } else if (this.x < this.startX - this.patrolDist) {
          this.vx = this.speed;
          this.facingRight = true;
        }
      }

      // Movement & collision with platforms
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Platform floor resolution (tolerance widened to prevent tunneling at high vy)
      this.onGround = false;
      for (const p of level.platforms) {
        const tolerance = Math.max(20, Math.abs(this.vy * dt) + 8);
        if (
          this.x + this.width > p.x &&
          this.x < p.x + p.width &&
          this.y + this.height >= p.y &&
          this.y + this.height <= p.y + tolerance &&
          this.vy >= 0
        ) {
          this.y = p.y - this.height;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }

    render(ctx, camera) {
      if (this.isDead) return;
      const screenX = Math.round(this.x - camera.x);
      const screenY = Math.round(this.y - camera.y);

      ctx.save();
      ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
      if (!this.facingRight) ctx.scale(-1, 1);

      ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#31102f';

      // Agile cyber beast body
      ctx.fillRect(-this.width / 2, -this.height / 2 + 6, this.width, this.height - 12);

      // Head
      ctx.fillRect(this.width / 2 - 8, -this.height / 2, 10, 12);

      // Glowing crimson eye
      ctx.fillStyle = C.COLORS.RED;
      ctx.shadowColor = C.COLORS.RED;
      ctx.shadowBlur = this.isChasing ? 14 : 6;
      ctx.fillRect(this.width / 2 - 4, -this.height / 2 + 2, 4, 3);

      // Cyber legs
      ctx.fillStyle = '#0f172a';
      const legOffset = Math.sin(this.animTime * (this.isChasing ? 18 : 8)) * 6;
      ctx.fillRect(-this.width / 2 + 3, this.height / 2 - 8, 6, 8 + legOffset);
      ctx.fillRect(this.width / 2 - 9, this.height / 2 - 8, 6, 8 - legOffset);

      ctx.restore();

      this.renderHealthBar(ctx, screenX, screenY);
    }
  }

  // -------------------------------------------------------------
  // 3. SHOOTER - Plasma Turret Mech
  // -------------------------------------------------------------
  class ShooterEnemy extends Enemy {
    constructor(x, y) {
      super(x, y, 'shooter');
      this.maxHp = 45;
      this.hp = 45;
      this.contactDamage = 15;
      this.scoreValue = C.SCORE.ENEMY_SHOOTER;
      this.width = 28;
      this.height = 36;
      this.shootCooldown = 2.2;
      this.shootTimer = 1.0;
      this.aimAngle = 0;
    }

    update(dt, player, level, projectiles) {
      if (this.isDead) return;
      this.animTime += dt;
      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

      // Track player
      const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
      const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
      const dist = Math.hypot(dx, dy);
      this.aimAngle = Math.atan2(dy, dx);
      this.facingRight = dx > 0;

      // Shoot plasma bolt if player is within 420px
      this.shootTimer -= dt;
      if (this.shootTimer <= 0 && dist < 420) {
        this.shootTimer = this.shootCooldown;
        this.fireProjectile(projectiles);
      }
    }

    fireProjectile(projectiles) {
      const speed = 250;
      const startX = this.x + this.width / 2;
      const startY = this.y + this.height / 2;

      projectiles.push({
        x: startX,
        y: startY,
        vx: Math.cos(this.aimAngle) * speed,
        vy: Math.sin(this.aimAngle) * speed,
        radius: 6,
        color: C.COLORS.MAGENTA,
        damage: 18,
        life: 3.5,
        fromEnemy: true
      });

      if (window.CQ.Audio) window.CQ.Audio.playLaserShot();
    }

    render(ctx, camera) {
      if (this.isDead) return;
      const screenX = Math.round(this.x - camera.x);
      const screenY = Math.round(this.y - camera.y);

      ctx.save();
      ctx.translate(screenX + this.width / 2, screenY + this.height / 2);

      // Base pedestal
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-this.width / 2, this.height / 2 - 10, this.width, 10);

      // Rotating turret core
      ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#331040';
      ctx.beginPath();
      ctx.arc(0, -2, 12, 0, Math.PI * 2);
      ctx.fill();

      // Barrel aiming at angle
      ctx.save();
      ctx.rotate(this.aimAngle);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, -3, 16, 6);
      ctx.fillStyle = C.COLORS.MAGENTA;
      ctx.shadowColor = C.COLORS.MAGENTA;
      ctx.shadowBlur = 8;
      ctx.fillRect(12, -2, 5, 4);
      ctx.restore();

      ctx.restore();

      this.renderHealthBar(ctx, screenX, screenY);
    }
  }

  // -------------------------------------------------------------
  // 4. TANK - Heavy Armored Biped Mech
  // -------------------------------------------------------------
  class TankEnemy extends Enemy {
    constructor(x, y, patrolDist = 70) {
      super(x, y, 'tank');
      this.startX = x;
      this.patrolDist = patrolDist;
      this.speed = 35;
      this.vx = this.speed;
      this.maxHp = 140;
      this.hp = 140;
      this.contactDamage = 30;
      this.scoreValue = C.SCORE.ENEMY_TANK;
      this.width = 46;
      this.height = 48;
    }

    update(dt, player, level) {
      if (this.isDead) return;
      this.animTime += dt;
      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

      // Gravity
      this.vy = Math.min(C.MAX_FALL_SPEED, this.vy + C.GRAVITY * dt);

      // Slow march patrol
      if (this.x > this.startX + this.patrolDist) {
        this.vx = -this.speed;
        this.facingRight = false;
      } else if (this.x < this.startX - this.patrolDist) {
        this.vx = this.speed;
        this.facingRight = true;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Platform floor resolution (tolerance widened to prevent tunneling at high vy)
      for (const p of level.platforms) {
        const tolerance = Math.max(20, Math.abs(this.vy * dt) + 8);
        if (
          this.x + this.width > p.x &&
          this.x < p.x + p.width &&
          this.y + this.height >= p.y &&
          this.y + this.height <= p.y + tolerance &&
          this.vy >= 0
        ) {
          this.y = p.y - this.height;
          this.vy = 0;
        }
      }
    }

    render(ctx, camera) {
      if (this.isDead) return;
      const screenX = Math.round(this.x - camera.x);
      const screenY = Math.round(this.y - camera.y);

      ctx.save();
      ctx.translate(screenX + this.width / 2, screenY + this.height / 2);
      if (!this.facingRight) ctx.scale(-1, 1);

      ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#1e293b';

      // Heavy armor plates
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height - 12);
      ctx.strokeStyle = C.COLORS.ORANGE;
      ctx.lineWidth = 2;
      ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height - 12);

      // Warning hazard stripes
      ctx.fillStyle = C.COLORS.YELLOW;
      for (let i = -16; i < 16; i += 8) {
        ctx.fillRect(i, -this.height / 2 + 4, 4, 6);
      }

      // Heavy tread / legs
      ctx.fillStyle = '#0f172a';
      const stride = Math.sin(this.animTime * 6) * 6;
      ctx.fillRect(-this.width / 2 + 4, this.height / 2 - 12, 10, 12 + stride);
      ctx.fillRect(this.width / 2 - 14, this.height / 2 - 12, 10, 12 - stride);

      // Glowing power reactor
      ctx.fillStyle = C.COLORS.ORANGE;
      ctx.shadowColor = C.COLORS.ORANGE;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      this.renderHealthBar(ctx, screenX, screenY);
    }
  }

  window.CQ.Enemies = {
    Drone: DroneEnemy,
    Hunter: HunterEnemy,
    Shooter: ShooterEnemy,
    Tank: TankEnemy
  };
})();
