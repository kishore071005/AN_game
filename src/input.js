// CYBER QUEST - Unified Input Manager (Keyboard, Mouse, Touch, Gamepad, Rebindable)
(function() {
  'use strict';
  window.CQ = window.CQ || {};

  class InputManager {
    constructor() {
      // Action identifiers
      this.ACTIONS = {
        LEFT: 'left',
        RIGHT: 'right',
        JUMP: 'jump',
        DOWN: 'down',
        ATTACK: 'attack',
        INTERACT: 'interact',
        PAUSE: 'pause'
      };

      // Active state
      this.actions = {
        left: false,
        right: false,
        jump: false,
        down: false,
        attack: false,
        interact: false,
        pause: false
      };

      this.actionsJustPressed = {};
      this.actionsJustReleased = {};

      // Physics consumption flag
      this.physicsRanThisFrame = false;

      // Gamepad state tracking
      this.gamepadConnected = false;
      this.prevGamepadButtons = {};

      // Load bindings
      this.bindings = this.loadBindings();

      this.canvas = null;
      this.touchEnabled = false;

      this.setupKeyboard();
      this.setupGamepad();
    }

    loadBindings() {
      const storage = window.CQ.Storage;
      const saved = storage && storage.getSettings ? storage.getSettings().keyBindings : null;
      if (saved && typeof saved === 'object') {
        return saved;
      }
      return {
        left: ['ArrowLeft', 'KeyA'],
        right: ['ArrowRight', 'KeyD'],
        jump: ['ArrowUp', 'KeyW', 'Space'],
        down: ['ArrowDown', 'KeyS'],
        attack: ['KeyJ', 'KeyX', 'KeyF'],
        interact: ['KeyE'],
        pause: ['Escape', 'KeyP']
      };
    }

    saveBindings() {
      if (window.CQ.Storage) {
        window.CQ.Storage.setSetting('keyBindings', this.bindings);
      }
    }

    setBinding(action, code) {
      if (!this.bindings[action]) this.bindings[action] = [];
      if (!this.bindings[action].includes(code)) {
        this.bindings[action].push(code);
        this.saveBindings();
      }
    }

    resetBindingsToDefault() {
      this.bindings = {
        left: ['ArrowLeft', 'KeyA'],
        right: ['ArrowRight', 'KeyD'],
        jump: ['ArrowUp', 'KeyW', 'Space'],
        down: ['ArrowDown', 'KeyS'],
        attack: ['KeyJ', 'KeyX', 'KeyF'],
        interact: ['KeyE'],
        pause: ['Escape', 'KeyP']
      };
      this.saveBindings();
    }

    // Resolves key event (checks code, key name, numpad, legacy names)
    resolveAction(code, key) {
      const keyNormalized = key ? key.toLowerCase() : '';
      for (const action in this.bindings) {
        const list = this.bindings[action];
        for (const item of list) {
          if (item === code) return action;
          if (item.toLowerCase() === keyNormalized) return action;
        }
      }

      // Hardcoded fallback checks for arrow keys & common defaults to ensure
      // they NEVER fail regardless of browser/keyboard layout quirks
      if (code === 'ArrowUp' || key === 'ArrowUp' || key === 'Up' || code === 'Numpad8') return this.ACTIONS.JUMP;
      if (code === 'ArrowDown' || key === 'ArrowDown' || key === 'Down' || code === 'Numpad2') return this.ACTIONS.DOWN;
      if (code === 'ArrowLeft' || key === 'ArrowLeft' || key === 'Left' || code === 'Numpad4') return this.ACTIONS.LEFT;
      if (code === 'ArrowRight' || key === 'ArrowRight' || key === 'Right' || code === 'Numpad6') return this.ACTIONS.RIGHT;
      if (code === 'Space' || key === ' ') return this.ACTIONS.JUMP;
      if (code === 'KeyW' || keyNormalized === 'w') return this.ACTIONS.JUMP;
      if (code === 'KeyA' || keyNormalized === 'a') return this.ACTIONS.LEFT;
      if (code === 'KeyD' || keyNormalized === 'd') return this.ACTIONS.RIGHT;
      if (code === 'KeyS' || keyNormalized === 's') return this.ACTIONS.DOWN;
      if (code === 'KeyJ' || keyNormalized === 'j' || code === 'KeyX' || keyNormalized === 'x') return this.ACTIONS.ATTACK;
      if (code === 'Escape' || key === 'Escape') return this.ACTIONS.PAUSE;

      return null;
    }

    setupKeyboard() {
      window.addEventListener('keydown', (e) => {
        // Init procedural Web Audio on first user interaction
        if (window.CQ.Audio) window.CQ.Audio.resume();

        // F3 toggles debug overlay (FPS, hitboxes, stats)
        if (e.code === 'F3' || e.key === 'F3') {
          e.preventDefault();
          if (window.CQ.GameInstance) {
            window.CQ.GameInstance.toggleDebugOverlay();
          }
          return;
        }

        // Prevent browser scrolling on arrow keys and space in canvas container
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) ||
            [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Up', 'Down', 'Left', 'Right'].includes(e.key)) {
          e.preventDefault();
        }

        // Delegate to UI menu navigation if a modal or menu is open
        if (window.CQ.UI && window.CQ.UI.hasActiveModalOrMenu()) {
          const handled = window.CQ.UI.handleMenuNavigation(e);
          if (handled) return;
        }

        const action = this.resolveAction(e.code, e.key);
        if (action) {
          if (!this.actions[action]) {
            this.actionsJustPressed[action] = true;
          }
          this.actions[action] = true;
        }
      }, { passive: false });

      window.addEventListener('keyup', (e) => {
        const action = this.resolveAction(e.code, e.key);
        if (action) {
          this.actions[action] = false;
          this.actionsJustReleased[action] = true;
        }
      });

      // Clear all inputs on window blur
      window.addEventListener('blur', () => {
        for (const k in this.actions) {
          this.actions[k] = false;
        }
        this.actionsJustPressed = {};
        this.actionsJustReleased = {};
      });
    }

    setupGamepad() {
      window.addEventListener('gamepadconnected', (e) => {
        this.gamepadConnected = true;
        if (window.CQ.Particles && window.CQ.GameInstance) {
          window.CQ.Particles.addText('GAMEPAD CONNECTED', window.CQ.Constants.CANVAS_WIDTH / 2, 40, '#00ff66', 16, 1.5);
        }
      });

      window.addEventListener('gamepaddisconnected', () => {
        this.gamepadConnected = false;
      });
    }

    pollGamepad() {
      if (!navigator.getGamepads) return;
      const gamepads = navigator.getGamepads();
      if (!gamepads) return;

      const gp = gamepads[0] || gamepads[1];
      if (!gp) return;

      // Helper for button check
      const btnPressed = (idx) => {
        const b = gp.buttons[idx];
        return typeof b === 'object' ? b.pressed : b > 0.5;
      };

      const setGpAction = (action, isDown) => {
        const wasDown = !!this.actions[action];
        if (isDown && !wasDown) {
          this.actionsJustPressed[action] = true;
        } else if (!isDown && wasDown) {
          this.actionsJustReleased[action] = true;
        }
        this.actions[action] = isDown;
      };

      // D-Pad / Sticks
      const axisX = gp.axes[0] || 0;
      const axisY = gp.axes[1] || 0;

      // Left / Right
      const gpLeft = btnPressed(14) || axisX < -0.35;
      const gpRight = btnPressed(15) || axisX > 0.35;
      setGpAction('left', gpLeft);
      setGpAction('right', gpRight);

      // Jump (Button 0 = A/Cross, Button 12 = D-pad Up)
      const gpJump = btnPressed(0) || btnPressed(12) || axisY < -0.55;
      setGpAction('jump', gpJump);

      // Down (Button 13 = D-pad Down, stick down)
      const gpDown = btnPressed(13) || axisY > 0.55;
      setGpAction('down', gpDown);

      // Attack (Button 2 = X/Square, Button 1 = B/Circle)
      const gpAttack = btnPressed(2) || btnPressed(1);
      setGpAction('attack', gpAttack);

      // Pause (Button 9 = Start/Options)
      const gpPause = btnPressed(9);
      setGpAction('pause', gpPause);
    }

    bindCanvas(canvas) {
      this.canvas = canvas;

      this.canvas.addEventListener('mousedown', (e) => {
        if (window.CQ.Audio) window.CQ.Audio.resume();
        if (e.button === 0) {
          if (!this.actions.attack) {
            this.actionsJustPressed.attack = true;
          }
          this.actions.attack = true;
        }
      });

      this.canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          this.actions.attack = false;
          this.actionsJustReleased.attack = true;
        }
      });
    }

    bindTouchElement(element, action) {
      if (!element) return;
      this.touchEnabled = true;

      const triggerStart = (e) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        if (window.CQ.Audio) window.CQ.Audio.resume();
        if (!this.actions[action]) {
          this.actionsJustPressed[action] = true;
        }
        this.actions[action] = true;
        element.classList.add('active');
      };

      const triggerEnd = (e) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        this.actions[action] = false;
        this.actionsJustReleased[action] = true;
        element.classList.remove('active');
      };

      element.addEventListener('touchstart', triggerStart, { passive: false });
      element.addEventListener('touchend', triggerEnd, { passive: false });
      element.addEventListener('touchcancel', triggerEnd, { passive: false });

      // Support mouse test clicks on virtual touch controls
      element.addEventListener('mousedown', triggerStart);
      element.addEventListener('mouseup', triggerEnd);
      element.addEventListener('mouseleave', triggerEnd);
    }

    isPressed(action) {
      return !!this.actions[action];
    }

    wasJustPressed(action) {
      return !!this.actionsJustPressed[action];
    }

    wasJustReleased(action) {
      return !!this.actionsJustReleased[action];
    }

    // Called during each 60Hz physics tick to consume buffered taps
    consumeJustPressed(action) {
      if (this.actionsJustPressed[action]) {
        this.actionsJustPressed[action] = false;
        return true;
      }
      return false;
    }

    // Called when all physics steps complete in a frame
    onPhysicsTickComplete() {
      this.physicsRanThisFrame = true;
      // Note: actionsJustPressed are cleared per-action when consumed via
      // consumeJustPressed(). We do NOT bulk-clear here to allow the
      // resetFrame() call to handle it properly.
    }

    // Called at the end of the RAF game loop frame
    // CRITICAL: Only clears justPressed if a physics tick actually ran!
    // If no physics tick ran (high-refresh displays, accumulator < FIXED_DT),
    // we PRESERVE actionsJustPressed so next frame's physics tick receives it.
    resetFrame() {
      if (this.physicsRanThisFrame) {
        // Clear all remaining justPressed (any not consumed by consumeJustPressed)
        this.actionsJustPressed = {};
        this.physicsRanThisFrame = false;
      }
      // Always clear justReleased — it's a one-frame pulse
      this.actionsJustReleased = {};
    }
  }

  window.CQ.Input = new InputManager();
})();
