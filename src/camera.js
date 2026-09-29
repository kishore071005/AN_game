// CYBER QUEST - Smooth Camera with Dead-Zone, Look-Ahead, Shake & Bound Clamping (Enhanced v2)
// Spec: lerp smoothing, look-ahead in facing direction, small dead zone, never outside bounds,
//       screen shake max 6px for <=150ms
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  class Camera {
    constructor(width, height) {
      this.width  = width;
      this.height = height;

      this.x       = 0;
      this.y       = 0;
      this.targetX = 0;
      this.targetY = 0;

      // Bounds
      this.minX = 0;
      this.minY = 0;
      this.maxX = width;
      this.maxY = height;

      // Screen shake
      this.shakeIntensity = 0;
      this.shakeDuration  = 0;
      this.shakeTimer     = 0;
      this.offsetX        = 0;
      this.offsetY        = 0;

      // Camera lerp speed (responsive but smooth)
      this.lerpSpeed = 6.5;

      // Look-ahead: how far ahead in the facing direction the camera leads
      this.lookAheadAmount = 70;      // pixels of lead distance
      this.lookAheadX      = 0;       // current actual look-ahead (lerped)
      this.lookAheadLerp   = 4.0;     // how fast look-ahead transitions

      // Dead zone: player can move this many px from center before camera follows
      this.deadZoneX = 30;
      this.deadZoneY = 20;
      this.deadX     = 0;             // Camera center relative offset
      this.deadY     = 0;
    }

    setBounds(minX, minY, maxX, maxY) {
      this.minX = minX;
      this.minY = minY;
      this.maxX = Math.max(maxX, this.width);
      this.maxY = Math.max(maxY, this.height);
    }

    // Spec: screen shake max 6px, <=150ms
    shake(intensity, duration) {
      const settings = window.CQ.Storage ? window.CQ.Storage.getSettings() : { shakeEnabled: true };
      if (!settings || !settings.shakeEnabled) return;

      // Don't downgrade an active stronger shake
      if (this.shakeTimer > 0 && intensity <= this.shakeIntensity) return;

      // Clamp to spec maximums
      intensity = Math.min(intensity, 6);
      duration  = Math.min(duration, 0.15);

      this.shakeIntensity = intensity;
      this.shakeDuration  = duration;
      this.shakeTimer     = duration;
    }

    update(target, dt) {
      if (!target) return;

      // ---- LOOK-AHEAD: lerp to the target look-ahead direction ----
      const desiredLookAhead = target.facingRight
        ?  this.lookAheadAmount
        : -this.lookAheadAmount;
      this.lookAheadX += (desiredLookAhead - this.lookAheadX) * Math.min(1.0, this.lookAheadLerp * dt);

      // ---- TARGET CAMERA POSITION ----
      // Center on player center, offset by look-ahead and a slight upward bias
      const playerCenterX = target.x + target.width  / 2;
      const playerCenterY = target.y + target.height / 2;

      const rawTargetX = playerCenterX + this.lookAheadX - this.width  / 2;
      const rawTargetY = playerCenterY - 30                - this.height / 2;

      // ---- DEAD ZONE: only move camera if player exits dead zone ----
      const diffX = rawTargetX - this.x;
      const diffY = rawTargetY - this.y;

      if (Math.abs(diffX) > this.deadZoneX) {
        this.targetX = rawTargetX - Math.sign(diffX) * this.deadZoneX;
      } else {
        this.targetX = this.x;  // No movement needed, inside dead zone
      }

      if (Math.abs(diffY) > this.deadZoneY) {
        this.targetY = rawTargetY - Math.sign(diffY) * this.deadZoneY;
      } else {
        this.targetY = this.y;
      }

      // ---- SMOOTH LERP ----
      const t = Math.min(1.0, this.lerpSpeed * dt);
      this.x += (this.targetX - this.x) * t;
      this.y += (this.targetY - this.y) * t;

      // ---- CLAMP TO LEVEL BOUNDS (never show outside the level) ----
      this.x = Math.max(this.minX, Math.min(this.maxX - this.width,  this.x));
      this.y = Math.max(this.minY, Math.min(this.maxY - this.height, this.y));

      // ---- SCREEN SHAKE (spec: max 6px, <=150ms) ----
      if (this.shakeTimer > 0) {
        this.shakeTimer -= dt;
        const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
        const magnitude = this.shakeIntensity * progress;
        // Use pseudo-random directional shake for more natural feel
        this.offsetX = (Math.random() - 0.5) * 2 * magnitude;
        this.offsetY = (Math.random() - 0.5) * 2 * magnitude;
      } else {
        this.offsetX = 0;
        this.offsetY = 0;
      }
    }

    getRenderOffset() {
      return {
        x: Math.round(this.x + this.offsetX),
        y: Math.round(this.y + this.offsetY),
        width: this.width,
        height: this.height
      };
    }
  }

  window.CQ.Camera = Camera;
})();
