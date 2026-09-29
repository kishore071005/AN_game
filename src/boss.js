// CYBER QUEST - Final Boss: CORE GUARDIAN
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  const C = window.CQ.Constants;

  class CoreGuardian {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.startX = x;
      this.startY = y;
      this.width = 90;
      this.height = 90;

      this.maxHp = 600;
      this.hp = this.maxHp;
      this.name = 'CORE GUARDIAN';
      this.isBoss = true;
      this.contactDamage = 25;
      this.laserDamageCooldown = 0; // Cooldown to prevent laser from hitting 60x/sec

      this.phase = 1;
      this.state = 'hover'; // 'hover', 'charging_laser', 'firing_laser', 'slam_windup', 'slam_fall', 'slam_recovery', 'vulnerable'
      this.timer = 0;
      this.animTime = 0;
      this.hitFlashTimer = 0;
      this.isDead = false;
      this.deathTimer = 0;

      // Arena bounds
      this.minX = x - 260;
      this.maxX = x + 260;
      this.hoverY = y;
      this.vx = 80;

      // Attacks
      this.attackCooldown = 3.0;
      this.attackTimer = 2.0;
      this.laserBeam = null; // { y, height, timer, maxTimer, warning: bool }

      // Orbiting plasma shield orbs
      this.shieldAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
      this.shieldRadius = 65;
    }

    takeDamage(amount, sourceX) {
      if (this.isDead || this.state === 'slam_fall') return false;

      // In phase 2 or 3 when shield is up, reduce damage unless vulnerable
      let finalDamage = amount;
      if (this.state !== 'vulnerable' && this.phase >= 2) {
        finalDamage = Math.round(amount * 0.7);
      }

      this.hp -= finalDamage;
      this.hitFlashTimer = 0.14;

      if (window.CQ.Audio) window.CQ.Audio.playEnemyHit();
      if (window.CQ.Particles) {
        window.CQ.Particles.createHitSparks(this.x + this.width / 2, this.y + this.height / 2, 10, C.COLORS.YELLOW);
        window.CQ.Particles.addText(`-${finalDamage}`, this.x + this.width / 2 + (Math.random() - 0.5) * 40, this.y - 15, C.COLORS.YELLOW, 18);
      }

      // Check Phase Transitions
      const hpPct = this.hp / this.maxHp;
      if (this.phase === 1 && hpPct <= 0.66) {
        this.phase = 2;
        this.triggerPhaseShift(2);
      } else if (this.phase === 2 && hpPct <= 0.33) {
        this.phase = 3;
        this.triggerPhaseShift(3);
      }

      if (this.hp <= 0) {
        this.hp = 0;
        this.die();
      }
      return true;
    }

    triggerPhaseShift(newPhase) {
      if (window.CQ.Audio) window.CQ.Audio.playBossAttack();
      if (window.CQ.Particles) {
        window.CQ.Particles.createExplosion(this.x + this.width / 2, this.y + this.height / 2, newPhase === 2 ? C.COLORS.ORANGE : C.COLORS.RED, 35);
        window.CQ.Particles.addText(`PHASE ${newPhase} - SYSTEM OVERLOAD!`, this.x + this.width / 2, this.y - 45, newPhase === 2 ? C.COLORS.ORANGE : C.COLORS.RED, 20);
      }
      this.state = 'vulnerable';
      this.timer = 1.8; // Brief vulnerable window
    }

    die() {
      if (this.isDead) return;
      this.isDead = true;
      this.deathTimer = 3.2; // Dramatic death sequence

      if (window.CQ.Audio) window.CQ.Audio.playBossDefeat();
      if (window.CQ.Particles) {
        window.CQ.Particles.createExplosion(this.x + this.width / 2, this.y + this.height / 2, C.COLORS.CYAN, 40);
        window.CQ.Particles.addText('+5000 BOSS DEFEATED!', this.x + this.width / 2, this.y - 40, C.COLORS.GREEN, 24);
      }
    }

    update(dt, player, level, projectiles, camera) {
      this.animTime += dt;
      if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
      if (this.laserDamageCooldown > 0) this.laserDamageCooldown -= dt;

      // Handle Death Sequence
      if (this.isDead) {
        this.deathTimer -= dt;
        if (Math.random() > 0.6 && window.CQ.Particles) {
          const rx = this.x + Math.random() * this.width;
          const ry = this.y + Math.random() * this.height;
          window.CQ.Particles.createExplosion(rx, ry, Math.random() > 0.5 ? C.COLORS.RED : C.COLORS.YELLOW, 12);
          if (camera) camera.shake(6, 0.2);
        }
        return;
      }

      // Update shield orbital angles
      const orbitalSpeed = this.phase === 3 ? 3.5 : 2.0;
      for (let i = 0; i < this.shieldAngles.length; i++) {
        this.shieldAngles[i] += orbitalSpeed * dt;
      }

      // -------------------------------------------------------------
      // STATE MACHINE & ATTACK ROUTINES
      // -------------------------------------------------------------
      switch (this.state) {
        case 'hover':
          // Smooth floating hover
          this.x += this.vx * (this.phase === 3 ? 1.5 : 1.0) * dt;
          this.y = this.hoverY + Math.sin(this.animTime * 3) * 20;

          if (this.x > this.maxX) {
            this.vx = -Math.abs(this.vx);
          } else if (this.x < this.minX) {
            this.vx = Math.abs(this.vx);
          }

          // Attack Timer
          this.attackTimer -= dt;
          if (this.attackTimer <= 0) {
            this.decideNextAttack(player, projectiles, camera);
          }
          break;

        case 'charging_laser':
          this.timer -= dt;
          if (this.laserBeam) {
            this.laserBeam.timer = this.timer;
          }
          if (this.timer <= 0) {
            // Fire laser beam!
            this.state = 'firing_laser';
            this.timer = 1.2;
            if (this.laserBeam) this.laserBeam.warning = false;
            if (window.CQ.Audio) window.CQ.Audio.playLaserShot();
            if (camera) camera.shake(10, 1.2);
          }
          break;

        case 'firing_laser':
          this.timer -= dt;
          // Damage player if inside ground sweep beam (with cooldown to prevent 60x/sec hits)
          if (this.laserBeam && !this.laserBeam.warning && this.laserDamageCooldown <= 0) {
            const beamTop = this.laserBeam.y;
            const beamBottom = this.laserBeam.y + this.laserBeam.height;
            if (player.y + player.height > beamTop && player.y < beamBottom) {
              const hit = player.takeDamage(25, this.x);
              if (hit) {
                this.laserDamageCooldown = 0.5; // Only damage once per 0.5s
              }
            }
          }
          if (this.timer <= 0) {
            this.laserBeam = null;
            this.state = 'vulnerable';
            this.timer = 2.0; // Vulnerable window after big attack
          }
          break;

        case 'slam_windup':
          this.timer -= dt;
          this.y -= 70 * dt; // Rise up
          if (this.timer <= 0) {
            this.state = 'slam_fall';
            this.timer = 0.6;
          }
          break;

        case 'slam_fall':
          this.y += 680 * dt; // Rapid descent
          // Check arena floor slam
          if (this.y >= this.hoverY + 60) {
            this.y = this.hoverY + 60;
            this.state = 'slam_recovery';
            this.timer = 1.4;

            if (window.CQ.Audio) window.CQ.Audio.playBossAttack();
            if (camera) camera.shake(14, 0.4);

            // Ground shockwave rings
            if (window.CQ.Particles) {
              window.CQ.Particles.createExplosion(this.x + this.width / 2, this.y + this.height, C.COLORS.ORANGE, 25);
            }

            // Shockwave projectiles along the ground
            projectiles.push({
              x: this.x - 10,
              y: this.y + this.height - 12,
              vx: -240,
              vy: 0,
              radius: 12,
              color: C.COLORS.ORANGE,
              damage: 22,
              life: 2.2,
              fromEnemy: true
            });
            projectiles.push({
              x: this.x + this.width + 10,
              y: this.y + this.height - 12,
              vx: 240,
              vy: 0,
              radius: 12,
              color: C.COLORS.ORANGE,
              damage: 22,
              life: 2.2,
              fromEnemy: true
            });
          }
          break;

        case 'slam_recovery':
        case 'vulnerable':
          this.timer -= dt;
          if (this.timer <= 0) {
            // Return to hover
            this.y = this.hoverY;
            this.state = 'hover';
            this.attackTimer = this.attackCooldown;
          }
          break;
      }
    }

    decideNextAttack(player, projectiles, camera) {
      const choices = ['plasma_volley', 'energy_bombs'];
      if (this.phase >= 2) choices.push('sweeping_laser');
      if (this.phase >= 3) choices.push('ground_slam');

      const attack = choices[Math.floor(Math.random() * choices.length)];

      if (attack === 'plasma_volley') {
        this.firePlasmaVolley(player, projectiles);
        this.attackTimer = this.phase === 3 ? 1.8 : 2.5;
      } else if (attack === 'energy_bombs') {
        this.dropEnergyBombs(projectiles);
        this.attackTimer = 2.4;
      } else if (attack === 'sweeping_laser') {
        // Warning sweep along ground level
        this.state = 'charging_laser';
        this.timer = 1.0;
        this.laserBeam = {
          y: this.hoverY + 70,
          height: 24,
          timer: 1.0,
          maxTimer: 1.0,
          warning: true
        };
        if (window.CQ.Audio) window.CQ.Audio.playLaserShot();
      } else if (attack === 'ground_slam') {
        this.state = 'slam_windup';
        this.timer = 0.8;
        if (window.CQ.Audio) window.CQ.Audio.playBossAttack();
      }
    }

    firePlasmaVolley(player, projectiles) {
      if (window.CQ.Audio) window.CQ.Audio.playLaserShot();
      const count = this.phase === 3 ? 5 : 3;
      const spread = 0.35;
      const baseAngle = Math.atan2(
        (player.y + player.height / 2) - (this.y + this.height / 2),
        (player.x + player.width / 2) - (this.x + this.width / 2)
      );

      for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) / 2) * spread;
        const angle = baseAngle + offset;
        const speed = this.phase === 3 ? 280 : 210;

        projectiles.push({
          x: this.x + this.width / 2,
          y: this.y + this.height / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 7,
          color: this.phase === 3 ? C.COLORS.RED : C.COLORS.CYAN,
          damage: 18,
          life: 3.5,
          fromEnemy: true
        });
      }
    }

    dropEnergyBombs(projectiles) {
      if (window.CQ.Audio) window.CQ.Audio.playBossAttack();
      for (let i = -1; i <= 1; i++) {
        projectiles.push({
          x: this.x + this.width / 2 + i * 28,
          y: this.y + this.height,
          vx: i * 60,
          vy: 80,
          radius: 9,
          color: C.COLORS.YELLOW,
          damage: 20,
          life: 2.8,
          fromEnemy: true,
          gravity: 250
        });
      }
    }

    render(ctx, camera) {
      const screenX = Math.round(this.x - camera.x);
      const screenY = Math.round(this.y - camera.y);

      // Boss HP Bar at top of screen
      if (!this.isDead && this.hp > 0) {
        ctx.save();
        const barW = 280;
        const barH = 12;
        const barX = (camera.width - barW) / 2;
        const barY = 18;
        const hpPct = Math.max(0, this.hp / this.maxHp);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        // HP fill
        let barColor = C.COLORS.GREEN;
        if (hpPct <= 0.33) barColor = C.COLORS.RED;
        else if (hpPct <= 0.66) barColor = C.COLORS.ORANGE;
        ctx.fillStyle = barColor;
        ctx.shadowColor = barColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(barX, barY, barW * hpPct, barH);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.strokeRect(barX, barY, barW, barH);

        // Boss name label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`⚙ ${this.name} — PHASE ${this.phase}`, camera.width / 2, barY - 4);
        ctx.textAlign = 'start';
        ctx.restore();
      }

      // Render Laser Beam if active
      if (this.laserBeam) {
        ctx.save();
        const beamY = Math.round(this.laserBeam.y - camera.y);
        if (this.laserBeam.warning) {
          // Warning laser sight line
          ctx.strokeStyle = 'rgba(255, 0, 85, 0.45)';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(0, beamY + this.laserBeam.height / 2);
          ctx.lineTo(camera.width, beamY + this.laserBeam.height / 2);
          ctx.stroke();
        } else {
          // Lethal Plasma Beam
          ctx.fillStyle = C.COLORS.RED;
          ctx.shadowColor = C.COLORS.RED;
          ctx.shadowBlur = 18;
          ctx.fillRect(0, beamY, camera.width, this.laserBeam.height);

          // White hot center
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, beamY + 6, camera.width, this.laserBeam.height - 12);
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(screenX + this.width / 2, screenY + this.height / 2);

      // Color scheme based on Phase
      let coreColor = C.COLORS.CYAN;
      if (this.phase === 2) coreColor = C.COLORS.ORANGE;
      if (this.phase === 3) coreColor = C.COLORS.RED;

      if (this.state === 'vulnerable') {
        coreColor = C.COLORS.GREEN; // Vulnerable highlight
      }

      // 1. Orbiting Shield Orbs
      for (let i = 0; i < this.shieldAngles.length; i++) {
        const ang = this.shieldAngles[i];
        const ox = Math.cos(ang) * this.shieldRadius;
        const oy = Math.sin(ang) * (this.shieldRadius * 0.45);

        ctx.fillStyle = coreColor;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ox, oy, 8, 0, Math.PI * 2);
        ctx.fill();

        // Connecting energy tether
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ox, oy);
        ctx.stroke();
      }

      // 2. Heavy Outer Armor Ring
      ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#0b0f19';
      ctx.strokeStyle = coreColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer mechanical gears / vents
      const ventCount = 8;
      for (let i = 0; i < ventCount; i++) {
        const a = (i / ventCount) * Math.PI * 2 + this.animTime * 0.5;
        const vx = Math.cos(a) * (this.width / 2);
        const vy = Math.sin(a) * (this.height / 2);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(vx - 4, vy - 4, 8, 8);
      }

      // 3. Central Power Core (Pulsing Reactor)
      const pulse = 1 + Math.sin(this.animTime * 8) * 0.12;
      ctx.fillStyle = coreColor;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Inner Core Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  window.CQ.CoreGuardian = CoreGuardian;
})();
