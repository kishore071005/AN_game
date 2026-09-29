// CYBER QUEST - High-Performance Neon Particle & Visual FX System
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.floatingTexts = [];
      this.maxParticles = 300; // Performance safety cap
    }

    reset() {
      this.particles.length = 0;
      this.floatingTexts.length = 0;
    }

    add(x, y, vx, vy, color, size, life, shape = 'circle', alphaDecay = true) {
      if (this.particles.length >= this.maxParticles) {
        // Recycle oldest
        this.particles.shift();
      }

      this.particles.push({
        x, y,
        vx, vy,
        color,
        size,
        initialSize: size,
        life,
        maxLife: life,
        shape,
        alphaDecay,
        alpha: 1.0,
        gravity: 0,
        drag: 0.96
      });
    }

    addText(text, x, y, color = '#00f3ff', size = 16, life = 0.8) {
      this.floatingTexts.push({
        text,
        x,
        y,
        vy: -45,
        color,
        size,
        life,
        maxLife: life,
        alpha: 1.0
      });
    }

    // Preset effects
    createJumpDust(x, y) {
      for (let i = 0; i < 6; i++) {
        const vx = (Math.random() - 0.5) * 60;
        const vy = (Math.random() - 0.7) * 30;
        this.add(x + (Math.random() - 0.5) * 16, y, vx, vy, '#00f3ff', Math.random() * 3 + 2, 0.25, 'circle');
      }
    }

    createHitSparks(x, y, count = 8, color = '#ffe600') {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 180 + 70;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const p = {
          x, y, vx, vy,
          color,
          size: Math.random() * 3 + 2,
          initialSize: 3,
          life: 0.2 + Math.random() * 0.15,
          maxLife: 0.35,
          shape: 'diamond',
          alphaDecay: true,
          alpha: 1.0,
          drag: 0.92,
          gravity: 400
        };
        this.particles.push(p);
      }
    }

    createExplosion(x, y, color = '#ff007f', count = 22) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 240 + 60;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.4 ? color : '#00f3ff',
          size: Math.random() * 5 + 3,
          initialSize: 6,
          life: 0.45 + Math.random() * 0.3,
          maxLife: 0.75,
          shape: 'square',
          alphaDecay: true,
          alpha: 1.0,
          drag: 0.94,
          gravity: 500
        });
      }
    }

    createCoinSparkles(x, y) {
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 120 + 30;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          color: '#00f3ff',
          size: Math.random() * 3.5 + 2,
          initialSize: 4,
          life: 0.4 + Math.random() * 0.25,
          maxLife: 0.65,
          shape: 'diamond',
          alphaDecay: true,
          alpha: 1.0,
          drag: 0.95,
          gravity: 200
        });
      }
    }

    createSlashArc(x, y, facingRight) {
      const colors = ['#00f3ff', '#ffffff', '#00f3ff'];
      const baseAngle = facingRight ? 0 : Math.PI;
      for (let i = -4; i <= 4; i++) {
        const angle = baseAngle + (i * 0.15);
        const dist = 32 + Math.random() * 12;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        this.particles.push({
          x: px, y: py,
          vx: Math.cos(angle) * 70,
          vy: Math.sin(angle) * 70,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 4 + 2,
          initialSize: 4,
          life: 0.16,
          maxLife: 0.16,
          shape: 'diamond',
          alphaDecay: true,
          alpha: 1.0,
          drag: 0.9,
          gravity: 0
        });
      }
    }

    createCheckpointBurst(x, y) {
      for (let i = 0; i < 28; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        const speed = Math.random() * 260 + 80;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.3 ? '#00ff66' : '#00f3ff',
          size: Math.random() * 4 + 2,
          initialSize: 5,
          life: 0.6 + Math.random() * 0.4,
          maxLife: 1.0,
          shape: 'diamond',
          alphaDecay: true,
          alpha: 1.0,
          drag: 0.95,
          gravity: 150
        });
      }
    }

    update(dt) {
      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        p.vx *= (p.drag !== undefined ? p.drag : 0.98);
        p.vy *= (p.drag !== undefined ? p.drag : 0.98);
        if (p.gravity) p.vy += p.gravity * dt;

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const progress = p.life / p.maxLife;
        p.alpha = p.alphaDecay ? Math.max(0, progress) : 1;
        p.size = p.initialSize * (0.3 + 0.7 * progress);
      }

      // Update floating texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.life -= dt;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
          continue;
        }
        ft.y += ft.vy * dt;
        ft.alpha = ft.life / ft.maxLife;
      }
    }

    render(ctx, camera) {
      ctx.save();

      // Render particles
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const screenX = p.x - camera.x;
        const screenY = p.y - camera.y;

        // Culling
        if (screenX < -20 || screenX > camera.width + 20 || screenY < -20 || screenY > camera.height + 20) {
          continue;
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(screenX, screenY, Math.max(0.5, p.size), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'diamond') {
          const s = Math.max(1, p.size);
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - s);
          ctx.lineTo(screenX + s, screenY);
          ctx.lineTo(screenX, screenY + s);
          ctx.lineTo(screenX - s, screenY);
          ctx.closePath();
          ctx.fill();
        } else {
          // square
          const s = Math.max(1, p.size);
          ctx.fillRect(screenX - s / 2, screenY - s / 2, s, s);
        }
      }

      // Render floating damage / score texts
      ctx.shadowBlur = 6;
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.textAlign = 'center';

      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        const screenX = ft.x - camera.x;
        const screenY = ft.y - camera.y;

        ctx.globalAlpha = ft.alpha;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.fillText(ft.text, screenX, screenY);
      }

      ctx.restore();
    }
  }

  window.CQ.Particles = new ParticleSystem();
})();
