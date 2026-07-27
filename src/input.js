const Input = {
  keys:  { w: false, a: false, s: false, d: false, space: false },
  mouse: { x: 0, y: 0, left: false, right: false },

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
    window.addEventListener('keydown', e => {
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
      if (e.button === 0) this.mouse.left  = true;
      if (e.button === 2) this.mouse.right = true;
    });
    canvas.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.left  = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
};
