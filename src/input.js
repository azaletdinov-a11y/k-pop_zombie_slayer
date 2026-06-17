const Input = {
  keys:  { w: false, a: false, s: false, d: false, space: false },
  mouse: { x: 0, y: 0, left: false, right: false },

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
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
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
