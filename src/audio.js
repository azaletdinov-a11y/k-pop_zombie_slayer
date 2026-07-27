const Sfx = (() => {
  let _ac     = null;
  let _gain   = null;
  let _muted  = false;
  let _volume = parseFloat(localStorage.getItem('kzs_volume') || '0.8');
  let _unlocked = false;

  function _ctx() {
    if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
    if (_ac.state === 'suspended') _ac.resume();
    return _ac;
  }

  function _master() {
    if (!_gain) {
      _gain = _ctx().createGain();
      _gain.gain.value = _muted ? 0 : _volume;
      _gain.connect(_ctx().destination);
    }
    return _gain;
  }

  function _tone(freq, type, gainVal, dur, freqEnd) {
    const c = _ctx(), t = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(_master());
    o.start(t); o.stop(t + dur + 0.01);
  }

  function _noise(dur, gainVal) {
    const c = _ctx();
    const n = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(g); g.connect(_master());
    src.start();
  }

  // ---- Music scheduler ----
  const BASS_NOTES = [55, 55, 49, 52];
  let _musicOn  = false;
  let _tempo    = 115;
  let _beat     = 0;
  let _nextTime = 0;
  let _schedId  = null;

  function _kick(t) {
    const c = _ctx();
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.18);
    const g = c.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(_master()); o.start(t); o.stop(t + 0.24);
  }

  function _snare(t) {
    const c = _ctx();
    const len = Math.ceil(c.sampleRate * 0.12);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(g); g.connect(_master()); src.start(t);
  }

  function _hihat(t) {
    const c = _ctx();
    const len = Math.ceil(c.sampleRate * 0.04);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(filt); filt.connect(g); g.connect(_master()); src.start(t);
  }

  function _bass(freq, t, dur) {
    const c = _ctx();
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 350;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.6);
    o.connect(filt); filt.connect(g); g.connect(_master()); o.start(t); o.stop(t + dur * 1.8);
  }

  function _sched() {
    if (!_musicOn) return;
    const c       = _ctx();
    const stepDur = (60 / _tempo) / 2;
    while (_nextTime < c.currentTime + 0.2) {
      const step = _beat % 8;
      if (step === 0 || step === 4) _kick(_nextTime);
      if (step === 2 || step === 6) _snare(_nextTime);
      _hihat(_nextTime);
      if (step % 2 === 0) _bass(BASS_NOTES[(step / 2) % 4], _nextTime, stepDur);
      _beat++;
      _nextTime += stepDur;
    }
    _schedId = setTimeout(_sched, 25);
  }

  const sounds = {
    swing()       { _noise(0.07, 0.35); },
    shoot()       { _tone(880, 'sine', 0.22, 0.12, 200); },
    hit()         { _tone(200, 'square', 0.28, 0.06, 80); },
    death()       { _tone(110, 'sine', 0.45, 0.18, 40); _noise(0.09, 0.14); },
    playerHit()   { _tone(160, 'sawtooth', 0.30, 0.10); },
    waveClear()   {
      [523, 659, 784].forEach((f, i) =>
        setTimeout(() => { if (!_muted) _tone(f, 'sine', 0.22, 0.35); }, i * 110)
      );
    },
    perkPick()    { [392, 494, 587].forEach(f => _tone(f, 'sine', 0.18, 0.45)); },
    bossWarning() { _tone(55, 'sawtooth', 0.32, 0.80); _tone(110, 'sawtooth', 0.18, 0.80); },
  };

  return {
    // MUST be called synchronously from a real user-gesture handler (touchstart
    // / mousedown / keydown). iOS Safari only lets an AudioContext leave the
    // 'suspended' state inside a gesture — resuming a few ms later from the
    // game loop is silently ignored, and every sound is dropped for the whole
    // session. Playing a one-sample silent buffer is what actually flips it.
    unlock() {
      const c = _ctx();
      if (c.state === 'suspended') c.resume();
      if (!_unlocked) {
        const src = c.createBufferSource();
        src.buffer = c.createBuffer(1, 1, 22050);
        src.connect(c.destination);
        src.start(0);
        _unlocked = true;
      }
      return c.state;
    },
    get unlocked() { return _unlocked; },
    get state()    { return _ac ? _ac.state : 'none'; },

    play(name)    { if (!_muted && sounds[name]) sounds[name](); },
    toggleMute()  {
      _muted = !_muted;
      if (_gain) _gain.gain.value = _muted ? 0 : _volume;
      return _muted;
    },
    get muted()   { return _muted; },
    setVolume(v)  {
      _volume = Math.max(0, Math.min(1, v));
      if (_gain && !_muted) _gain.gain.value = _volume;
      localStorage.setItem('kzs_volume', String(_volume));
    },
    getVolume()   { return _volume; },
    startMusic()  {
      if (_musicOn) return;
      _musicOn  = true;
      _beat     = 0;
      _nextTime = _ctx().currentTime + 0.05;
      _sched();
    },
    stopMusic()   {
      _musicOn = false;
      if (_schedId) { clearTimeout(_schedId); _schedId = null; }
    },
    setTempo(bpm) { _tempo = Math.max(90, Math.min(180, bpm)); },
  };
})();
