const Input = {
  keys:  { w: false, a: false, s: false, d: false, space: false },
  mouse: { x: 0, y: 0, left: false, right: false },

  // --- Touch state. All of this stays inert on desktop: `touchActive` only
  // flips once a real touch happens, and the game reads these as *additional*
  // sources alongside keyboard/mouse rather than instead of them.
  touchActive: false,           // a touch has occurred -> draw on-screen controls
  move: { x: 0, y: 0, active: false },  // analog move vector (left stick)
  aim:  { x: 1, y: 0, active: false },  // aim direction   (right stick)
  fire:  false,                 // right stick engaged -> auto-fire
  melee: false,                 // melee button held
  pauseTapped: false,           // consumed by Game each frame
  playMode: false,              // set by Game: sticks during play, taps in menus
  _sticks: { moveId: null, aimId: null, meleeId: null, dashId: null,
             moveOrigin: null, aimOrigin: null },

  // Viewport point -> 800x600 logical canvas point.
  // getBoundingClientRect() spans the border box, but the drawing surface is
  // only the content box — so subtract the border (clientLeft/Top) and scale by
  // the content size (clientWidth/Height), which also handles a canvas that is
  // displayed smaller than its logical size on a small screen.
  _toCanvas(canvas, clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const w = canvas.clientWidth  || CANVAS_WIDTH;
    const h = canvas.clientHeight || CANVAS_HEIGHT;
    return {
      x: (clientX - r.left - canvas.clientLeft) * (CANVAS_WIDTH  / w),
      y: (clientY - r.top  - canvas.clientTop)  * (CANVAS_HEIGHT / h),
    };
  },

  init(canvas) {
    // Audio must be unlocked from inside a gesture handler — see Sfx.unlock()
    window.addEventListener('keydown', e => {
      Sfx.unlock();
      if (e.key === ' ') { this.keys.space = true; return; }
      if (e.key in this.keys) this.keys[e.key] = true;
    });
    window.addEventListener('keyup', e => {
      if (e.key === ' ') { this.keys.space = false; return; }
      if (e.key in this.keys) this.keys[e.key] = false;
    });
    canvas.addEventListener('mousemove', e => {
      const p = this._toCanvas(canvas, e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    });
    canvas.addEventListener('mousedown', e => {
      Sfx.unlock();
      if (e.button === 0) this.mouse.left  = true;
      if (e.button === 2) this.mouse.right = true;
    });
    canvas.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.left  = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ---- Touch ----
    const inBtn = (p, b) => {
      const dx = p.x - b.x, dy = p.y - b.y;
      return dx * dx + dy * dy <= b.r * b.r;
    };

    const onStart = (e) => {
      Sfx.unlock(); // synchronous, first thing in the gesture — iOS requires it
      this.touchActive = true;
      for (const t of e.changedTouches) {
        const p = this._toCanvas(canvas, t.clientX, t.clientY);
        if (!this.playMode) {
          // Menus are all coordinate hit-tests, so a tap is just a click.
          this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.left = true;
          continue;
        }
        if (inBtn(p, TOUCH_BTN_PAUSE)) { this.pauseTapped = true; continue; }
        if (inBtn(p, TOUCH_BTN_MELEE)) { this.melee = true; this._sticks.meleeId = t.identifier; continue; }
        if (inBtn(p, TOUCH_BTN_DASH))  { this.keys.space = true; this._sticks.dashId = t.identifier; continue; }
        if (p.x < CANVAS_WIDTH / 2) {
          if (this._sticks.moveId === null) { this._sticks.moveId = t.identifier; this._sticks.moveOrigin = p; }
        } else if (this._sticks.aimId === null) {
          this._sticks.aimId = t.identifier; this._sticks.aimOrigin = p;
        }
      }
      e.preventDefault();
    };

    const stickVector = (origin, p) => {
      const dx = p.x - origin.x, dy = p.y - origin.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < STICK_DEADZONE) return { x: 0, y: 0, active: false };
      const k = Math.min(len, STICK_MAX_DIST) / len;
      return { x: (dx * k) / STICK_MAX_DIST, y: (dy * k) / STICK_MAX_DIST, active: true };
    };

    const onMove = (e) => {
      for (const t of e.changedTouches) {
        const p = this._toCanvas(canvas, t.clientX, t.clientY);
        if (!this.playMode) { this.mouse.x = p.x; this.mouse.y = p.y; continue; }
        if (t.identifier === this._sticks.moveId) {
          const v = stickVector(this._sticks.moveOrigin, p);
          this.move.x = v.x; this.move.y = v.y; this.move.active = v.active;
        } else if (t.identifier === this._sticks.aimId) {
          const v = stickVector(this._sticks.aimOrigin, p);
          if (v.active) {
            const l = Math.sqrt(v.x * v.x + v.y * v.y);
            this.aim.x = v.x / l; this.aim.y = v.y / l; this.aim.active = true;
            this.fire = true;
          } else {
            this.aim.active = false; this.fire = false;
          }
        }
      }
      e.preventDefault();
    };

    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._sticks.moveId) {
          this._sticks.moveId = null; this.move.x = 0; this.move.y = 0; this.move.active = false;
        }
        if (t.identifier === this._sticks.aimId) {
          this._sticks.aimId = null; this.aim.active = false; this.fire = false;
        }
        if (t.identifier === this._sticks.meleeId) { this._sticks.meleeId = null; this.melee = false; }
        if (t.identifier === this._sticks.dashId)  { this._sticks.dashId  = null; this.keys.space = false; }
      }
      if (!this.playMode) this.mouse.left = false;
      e.preventDefault();
    };

    canvas.addEventListener('touchstart',  onStart, { passive: false });
    canvas.addEventListener('touchmove',   onMove,  { passive: false });
    canvas.addEventListener('touchend',    onEnd,   { passive: false });
    canvas.addEventListener('touchcancel', onEnd,   { passive: false });

    // iOS has historically only accepted the unlock from touchend/click rather
    // than touchstart, and resume() can be refused, so retry on every gesture
    // until the context is actually running. Bound on window (not the canvas)
    // so a tap anywhere counts, and left attached — it is a cheap early-out
    // once running.
    const retryUnlock = () => Sfx.unlock();
    window.addEventListener('touchend', retryUnlock, { passive: true });
    window.addEventListener('click',    retryUnlock, { passive: true });
    window.addEventListener('pointerup', retryUnlock, { passive: true });
    // Browsers suspend the context when the tab is backgrounded
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) Sfx.unlock();
    });
  }
};
