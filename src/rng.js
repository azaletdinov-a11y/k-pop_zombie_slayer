const Rng = (() => {
  let _s = 1;
  function _next() {
    // Unsigned right shift keeps this the canonical xorshift32 bijection;
    // a signed shift collapses states and creates an absorbing zero.
    if (_s === 0) _s = 0x9e3779b9;
    _s ^= _s << 13; _s ^= _s >>> 17; _s ^= _s << 5;
    return ((_s >>> 0) / 0x100000000);
  }
  return {
    reset(seed)  { _s = ((seed ^ 0xdeadbeef) >>> 0) || 1; },
    float()      { return _next(); },
    int(max)     { return Math.floor(_next() * max); },
    pick(arr)    { return arr[Math.floor(_next() * arr.length)]; },
    sample(arr, n) {
      const pool = arr.slice(), result = [];
      while (result.length < n && pool.length > 0) {
        const i = Math.floor(_next() * pool.length);
        result.push(pool.splice(i, 1)[0]);
      }
      return result;
    },
  };
})();
