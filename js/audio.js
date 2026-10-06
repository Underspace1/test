/* ==========================================================================
   audio.js — lecteur : ambiances générées en direct (WebAudio) + fichiers audio
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const { clamp, store } = Bio.util;
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* Trois "pistes" génératives. Chaque accord dure une mesure (16 doubles-croches). */
  const MOODS = [
    {
      id: 'lofi', title: 'Midnight Drive', artist: 'lo-fi · généré en direct', bpm: 76, swing: 0.2, vinyl: true, tone: 4800,
      chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
      kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], clap: [],
      pad: { type: 'triangle', gain: 0.045, lp: 1500, attack: 0.25, release: 1.4, unison: 2, spread: 9, send: 0.5 },
      bass: { steps: [0, 10], type: 'sine', gain: 0.2, dur: 0.5, oct: -12 },
      arp: { steps: [2, 6, 7, 10, 14], p: 0.55, type: 'triangle', gain: 0.07, decay: 0.7, oct: [12, 24], send: 0.8, echo: 0.35 },
    },
    {
      id: 'synth', title: 'Neon Rain', artist: 'synthwave · généré en direct', bpm: 98, swing: 0, vinyl: false, tone: 8500,
      chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
      kick: [0, 4, 8, 12], snare: [], hat: [2, 6, 10, 14], clap: [4, 12],
      pad: { type: 'sawtooth', gain: 0.022, lp: 1100, attack: 0.5, release: 1.2, unison: 3, spread: 12, send: 0.6 },
      bass: { steps: [0, 2, 4, 6, 8, 10, 12, 14], type: 'sawtooth', gain: 0.1, dur: 0.16, oct: -24, lp: 520 },
      arp: { steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], p: 1, seq: true, type: 'square', gain: 0.03, decay: 0.2, oct: [12, 24], send: 0.45, echo: 0.5, lp: 3200 },
    },
    {
      id: 'ambient', title: 'Deep Float', artist: 'ambient · généré en direct', bpm: 58, swing: 0, vinyl: false, tone: 6500,
      chords: [[50, 53, 57, 60, 64], [46, 50, 53, 57, 60], [43, 46, 50, 53, 57], [45, 50, 52, 55]],
      kick: [], snare: [], hat: [], clap: [],
      pad: { type: 'sine', gain: 0.05, lp: 1800, attack: 1.6, release: 2.2, unison: 3, spread: 7, send: 0.9, long: true },
      bass: { steps: [0], type: 'sine', gain: 0.16, dur: 3.5, oct: -12, attack: 0.8 },
      arp: { steps: [0, 2, 4, 6, 8, 10, 12, 14], p: 0.22, type: 'sine', gain: 0.06, decay: 3.2, oct: [24, 36], send: 1.2, echo: 0.6, bell: true },
    },
  ];

  /* ------------------------------------------------------------- moteur */
  class Engine {
    constructor() {
      const AC = window.AudioContext || window.webkitAudioContext;
      const c = (this.ctx = new AC());
      this.master = c.createGain();
      this.master.gain.value = 0;
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -20;
      this.comp.ratio.value = 3.5;
      this.analyser = c.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.78;
      this.fft = new Uint8Array(this.analyser.frequencyBinCount);
      this.tone = c.createBiquadFilter();
      this.tone.type = 'lowpass';
      this.tone.frequency.value = 9000;

      this.verb = c.createConvolver();
      this.verb.buffer = this.impulse(2.8, 2.4);
      const verbOut = c.createGain();
      verbOut.gain.value = 0.75;
      this.verb.connect(verbOut);
      verbOut.connect(this.tone);

      this.delay = c.createDelay(1.5);
      this.fb = c.createGain();
      this.dlp = c.createBiquadFilter();
      this.dlp.type = 'lowpass';
      this.dlp.frequency.value = 2400;
      this.delay.connect(this.dlp);
      this.dlp.connect(this.fb);
      this.fb.connect(this.delay);
      const delOut = c.createGain();
      delOut.gain.value = 0.5;
      this.dlp.connect(delOut);
      delOut.connect(this.tone);

      this.tone.connect(this.comp);
      this.comp.connect(this.master);
      this.master.connect(this.analyser);
      this.analyser.connect(c.destination);

      this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.timer = 0;
      this.mood = null;
    }

    impulse(seconds, decay) {
      const c = this.ctx, len = Math.floor(c.sampleRate * seconds);
      const buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    setVolume(v) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(v * v * 1.1, this.ctx.currentTime, 0.05);
    }

    /* --- voix --- */
    voice(t, freq, dur, o) {
      const c = this.ctx;
      const g = c.createGain();
      const a = o.attack != null ? o.attack : 0.008;
      const r = o.release != null ? o.release : 0.2;
      const peak = o.gain != null ? o.gain : 0.1;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      let end;
      if (o.pluck) {
        end = t + a + dur;
        g.gain.exponentialRampToValueAtTime(0.0001, end);
      } else {
        g.gain.setValueAtTime(peak, t + Math.max(a, dur - r));
        end = t + dur;
        g.gain.exponentialRampToValueAtTime(0.0001, end);
      }
      let head = g;
      if (o.lp) {
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.Q.value = o.q || 0.7;
        f.frequency.setValueAtTime(o.lp, t);
        if (o.lpEnd) f.frequency.exponentialRampToValueAtTime(o.lpEnd, end);
        f.connect(g);
        head = f;
      }
      const n = o.unison || 1;
      for (let i = 0; i < n; i++) {
        const osc = c.createOscillator();
        osc.type = o.type || 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (i - (n - 1) / 2) * (o.spread || 8);
        osc.connect(head);
        osc.start(t);
        osc.stop(end + 0.1);
      }
      if (o.bell) {
        // harmoniques inharmoniques façon cloche
        [2.76, 5.4].forEach((ratio, i) => {
          const osc = c.createOscillator();
          const bg = c.createGain();
          bg.gain.setValueAtTime(peak * (0.25 / (i + 1)), t);
          bg.gain.exponentialRampToValueAtTime(0.0001, t + a + dur * 0.5);
          osc.frequency.value = freq * ratio;
          osc.connect(bg);
          bg.connect(this.sd);
          bg.connect(this.sw);
          osc.start(t);
          osc.stop(t + a + dur * 0.5 + 0.1);
        });
      }
      g.connect(this.sd);
      if (o.send) {
        const s = c.createGain();
        s.gain.value = o.send;
        g.connect(s);
        s.connect(this.sw);
      }
      if (o.echo) {
        const e = c.createGain();
        e.gain.value = o.echo;
        g.connect(e);
        e.connect(this.sdl);
      }
    }

    noiseHit(t, o) {
      const c = this.ctx;
      const s = c.createBufferSource();
      s.buffer = this.noise;
      const f = c.createBiquadFilter();
      f.type = o.type;
      f.frequency.value = o.freq;
      f.Q.value = o.q || 1;
      const g = c.createGain();
      g.gain.setValueAtTime(o.gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      s.connect(f);
      f.connect(g);
      g.connect(this.sd);
      s.start(t, Math.random() * 1.5, o.dur + 0.05);
    }

    kick(t, v) {
      const c = this.ctx;
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(135, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.55 * v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g);
      g.connect(this.sd);
      o.start(t);
      o.stop(t + 0.4);
    }
    snare(t, v) {
      this.noiseHit(t, { type: 'bandpass', freq: 1900, q: 0.8, dur: 0.16, gain: 0.2 * v });
      this.voice(t, 190, 0.09, { type: 'triangle', gain: 0.12 * v, pluck: true });
    }
    hat(t, v) { this.noiseHit(t, { type: 'highpass', freq: 7500, dur: 0.045, gain: 0.07 * v }); }
    clap(t, v) {
      [0, 0.011, 0.023].forEach((d) => this.noiseHit(t + d, { type: 'bandpass', freq: 1500, q: 1, dur: 0.09, gain: 0.16 * v }));
    }

    /* --- séquenceur --- */
    start(mood) {
      this.stop(true);
      const c = this.ctx;
      this.mood = mood;
      this.step = 0;
      this.bar = 0;
      this.arpI = 0;
      this.sd = c.createGain();   // sortie sèche de la session
      this.sw = c.createGain();   // envoi réverbération + écho
      this.sdl = c.createGain();  // envoi écho seul
      this.sd.gain.value = this.sw.gain.value = this.sdl.gain.value = 0;
      this.sd.connect(this.tone);
      this.sw.connect(this.verb);
      this.sdl.connect(this.delay);
      const now = c.currentTime;
      [this.sd, this.sw, this.sdl].forEach((g) => g.gain.setTargetAtTime(1, now, 0.15));
      this.tone.frequency.setTargetAtTime(mood.tone, now, 0.05);
      const stepDur = 60 / mood.bpm / 4;
      this.delay.delayTime.value = stepDur * 3;
      this.fb.gain.value = 0.38;
      if (mood.vinyl) {
        const s = c.createBufferSource();
        s.buffer = this.noise;
        s.loop = true;
        const f = c.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 1800;
        const g = c.createGain();
        g.gain.value = 0.014;
        s.connect(f);
        f.connect(g);
        g.connect(this.sd);
        s.start();
        this.vinyl = s;
      }
      this.next = now + 0.08;
      this.timer = setInterval(() => this.tick(), 30);
      this.tick();
    }

    stop(quick) {
      clearInterval(this.timer);
      this.timer = 0;
      if (!this.sd) return;
      const c = this.ctx, now = c.currentTime;
      const gains = [this.sd, this.sw, this.sdl];
      gains.forEach((g) => { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0, now, quick ? 0.06 : 0.12); });
      const vinyl = this.vinyl;
      this.vinyl = null;
      setTimeout(() => {
        gains.forEach((g) => g.disconnect());
        if (vinyl) { try { vinyl.stop(); } catch (e) { /* déjà arrêté */ } }
      }, 700);
      this.sd = this.sw = this.sdl = null;
      this.mood = null;
    }

    tick() {
      const m = this.mood;
      if (!m || !this.sd) return;
      const stepDur = 60 / m.bpm / 4;
      // grande avance : les navigateurs ralentissent les timers des onglets en arrière-plan
      while (this.next < this.ctx.currentTime + 1.4) {
        const swing = this.step % 2 === 1 ? m.swing * stepDur : 0;
        this.schedule(this.step % 16, this.next + swing, stepDur);
        this.next += stepDur;
        this.step++;
        if (this.step % 16 === 0) this.bar++;
      }
    }

    schedule(s, t, stepDur) {
      const m = this.mood;
      const chord = m.chords[this.bar % m.chords.length];
      const vel = () => 0.75 + Math.random() * 0.25;

      if (s === 0) {
        const p = m.pad;
        const dur = stepDur * 16 + (p.long ? 1.2 : 0);
        chord.forEach((n) => this.voice(t, mtof(n), dur, p));
      }
      if (m.bass.steps.includes(s)) {
        const b = m.bass;
        this.voice(t, mtof(chord[0] + b.oct), b.dur, { type: b.type, gain: b.gain, lp: b.lp, pluck: true, attack: b.attack || 0.01 });
      }
      const a = m.arp;
      if (a.steps.includes(s) && Math.random() < a.p) {
        let n;
        if (a.seq) n = chord[this.arpI++ % chord.length] + a.oct[Math.floor(this.arpI / chord.length / 2) % a.oct.length];
        else n = chord[Math.floor(Math.random() * chord.length)] + a.oct[Math.floor(Math.random() * a.oct.length)];
        this.voice(t, mtof(n), a.decay, {
          type: a.type, gain: a.gain * vel(), pluck: true, send: a.send, echo: a.echo, lp: a.lp, bell: a.bell, attack: 0.006,
        });
      }
      if (m.kick.includes(s)) this.kick(t, vel());
      if (m.snare.includes(s)) this.snare(t, vel());
      if (m.clap.includes(s)) this.clap(t, vel());
      if (m.hat.includes(s) && (s % 4 === 0 || Math.random() < 0.8)) this.hat(t, s % 4 === 0 ? 1 : 0.55 * vel());
      if (m.vinyl && Math.random() < 0.18) this.noiseHit(t + Math.random() * stepDur, { type: 'highpass', freq: 2500, dur: 0.006, gain: 0.05 });
    }

    position() {
      if (!this.mood) return 0;
      return (((this.bar % 4) * 16 + (this.step % 16)) / 64);
    }

    analyse() {
      this.analyser.getByteFrequencyData(this.fft);
    }
  }

  /* ------------------------------------------------------------- lecteur */
  const P = (Bio.player = {
    tracks: [], index: 0, playing: false, volume: 0.55, muted: false,
    engine: null, audio: null, routed: false, started: 0,
  });
  Bio.level = { bass: 0, mid: 0, hi: 0 };

  P.init = function (cfg) {
    const saved = store.get('vol', null);
    this.volume = clamp(saved != null ? saved : cfg.music.volume, 0, 1);
    const custom = (cfg.music.tracks || []).filter((t) => t && t.src);
    this.tracks = custom.length
      ? custom.map((t) => ({ kind: 'file', title: t.title || 'Sans titre', artist: t.artist || '', src: t.src, cover: t.cover || '', cors: !!t.cors }))
      : MOODS.map((m) => ({ kind: 'gen', title: m.title, artist: m.artist, mood: m }));
    this.index = store.get('track', 0) % this.tracks.length;
    if (!(this.index >= 0)) this.index = 0;
    Bio.frame((dt, t) => this.update(dt, t));
    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      try {
        ms.setActionHandler('play', () => this.play());
        ms.setActionHandler('pause', () => this.pause());
        ms.setActionHandler('nexttrack', () => this.next());
        ms.setActionHandler('previoustrack', () => this.prev());
      } catch (e) { /* non supporté */ }
    }
    Bio.emit('player');
  };

  Object.defineProperty(P, 'track', { get() { return this.tracks[this.index]; } });

  P.ensureEngine = function () {
    if (!this.engine) {
      try { this.engine = new Engine(); } catch (e) { console.warn('[bio] WebAudio indisponible', e); return null; }
    }
    if (this.engine.ctx.state === 'suspended') this.engine.ctx.resume();
    this.engine.setVolume(this.muted ? 0 : this.volume);
    return this.engine;
  };

  P.play = async function () {
    const tr = this.track;
    if (!tr) return;
    this.stopSources();
    if (tr.kind === 'gen') {
      const eng = this.ensureEngine();
      if (!eng) { Bio.util.toast('Audio indisponible sur ce navigateur', 'mute'); return; }
      eng.start(tr.mood);
    } else {
      const a = new Audio();
      const src = Bio.util.safeUrl(tr.src);
      let sameOrigin = false;
      try { const u = new URL(src, location.href); sameOrigin = u.origin === location.origin && /^https?:$/.test(u.protocol); } catch (e) { /* ignore */ }
      const analyzable = sameOrigin || tr.cors;
      if (tr.cors && !sameOrigin) a.crossOrigin = 'anonymous';
      a.src = src;
      a.preload = 'auto';
      this.routed = false;
      if (analyzable) {
        const eng = this.ensureEngine();
        if (eng) {
          try {
            eng.ctx.createMediaElementSource(a).connect(eng.tone);
            this.routed = true;
            eng.setVolume(this.muted ? 0 : this.volume);
          } catch (e) { /* on retombe sur le volume natif */ }
        }
      }
      a.volume = this.routed ? 1 : this.muted ? 0 : this.volume;
      a.addEventListener('ended', () => this.next(true));
      a.addEventListener('error', () => { Bio.util.toast('Impossible de lire « ' + tr.title + ' »', 'mute'); this.playing = false; Bio.emit('player'); });
      this.audio = a;
      try { await a.play(); } catch (e) { Bio.util.toast('Lecture bloquée — clique sur ▶', 'play'); this.playing = false; Bio.emit('player'); return; }
    }
    this.playing = true;
    this.started = performance.now();
    this.meta();
    Bio.emit('player');
  };

  P.stopSources = function () {
    if (this.engine) this.engine.stop();
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
  };

  P.pause = function () {
    this.stopSources();
    this.playing = false;
    Bio.emit('player');
  };
  P.toggle = function () { return this.playing ? this.pause() : this.play(); };
  P.select = function (i) {
    this.index = (i + this.tracks.length) % this.tracks.length;
    store.set('track', this.index);
    this.meta();
    Bio.emit('player');
    if (this.playing) return this.play();
  };
  P.next = function (auto) {
    const m = Bio.cfg && Bio.cfg.music || {};
    if (auto && m.loop === false && this.index === this.tracks.length - 1) { this.pause(); return; }
    if (m.shuffle && this.tracks.length > 1) { let i; do { i = Math.floor(Math.random() * this.tracks.length); } while (i === this.index); return this.select(i); }
    return this.select(this.index + 1);
  };
  P.prev = function () { return this.select(this.index - 1); };

  P.setVolume = function (v) {
    this.volume = clamp(v, 0, 1);
    this.muted = this.volume === 0;
    store.set('vol', this.volume);
    this.applyVolume();
    Bio.emit('player');
  };
  P.toggleMute = function () {
    this.muted = !this.muted;
    if (!this.muted && this.volume === 0) this.volume = 0.5;
    this.applyVolume();
    Bio.emit('player');
  };
  P.applyVolume = function () {
    const v = this.muted ? 0 : this.volume;
    if (this.engine) this.engine.setVolume(v);
    if (this.audio && !this.routed) this.audio.volume = v;
  };

  P.meta = function () {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    const t = this.track;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, artwork: t.cover ? [{ src: t.cover }] : [] });
    } catch (e) { /* ignore */ }
  };

  P.progress = function () {
    if (!this.playing) return 0;
    if (this.audio) return this.audio.duration ? this.audio.currentTime / this.audio.duration : 0;
    return this.engine ? this.engine.position() : 0;
  };
  P.elapsed = function () {
    if (this.audio) return this.audio.currentTime || 0;
    return this.playing ? (performance.now() - this.started) / 1000 : 0;
  };
  P.duration = function () {
    return this.audio && isFinite(this.audio.duration) ? this.audio.duration : Infinity;
  };
  P.seek = function (frac) {
    if (this.audio && isFinite(this.audio.duration)) this.audio.currentTime = clamp(frac, 0, 1) * this.audio.duration;
  };

  /* barres du visualiseur : remplit un tableau de n valeurs 0..1 */
  P.bars = function (n, out) {
    const eng = this.engine;
    const real = this.playing && eng && (!this.audio || this.routed);
    for (let i = 0; i < n; i++) {
      let v;
      if (real) {
        const lo = Math.floor(Math.pow(i / n, 1.7) * 110) + 1;
        const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / n, 1.7) * 110) + 2);
        let sum = 0;
        for (let k = lo; k < hi; k++) sum += eng.fft[k];
        v = sum / (hi - lo) / 255;
        v = Math.pow(v, 1.15) * (1 + i / n * 0.7);
      } else if (this.playing) {
        const t = performance.now() / 1000;
        v = 0.25 + 0.2 * Math.sin(t * 3 + i * 0.7) + 0.15 * Math.sin(t * 5.3 + i * 1.9) * Math.cos(t + i);
        v *= 1 - (i / n) * 0.5;
      } else v = 0;
      out[i] = clamp(v, 0, 1);
    }
    return out;
  };

  P.update = function (dt, t) {
    let bass = 0, mid = 0, hi = 0;
    const eng = this.engine;
    if (this.playing && eng && (!this.audio || this.routed)) {
      eng.analyse();
      const f = eng.fft;
      for (let i = 1; i < 5; i++) bass += f[i];
      for (let i = 5; i < 32; i++) mid += f[i];
      for (let i = 32; i < 120; i++) hi += f[i];
      bass = clamp(bass / 4 / 255 * 1.25, 0, 1);
      mid = clamp(mid / 27 / 255 * 1.5, 0, 1);
      hi = clamp(hi / 88 / 255 * 2, 0, 1);
    } else if (this.playing) {
      bass = 0.3 + 0.25 * Math.max(0, Math.sin(t * 6.1));
      mid = 0.3 + 0.1 * Math.sin(t * 2.3);
      hi = 0.2;
    }
    const L = Bio.level;
    const k = (cur, target) => cur + (target - cur) * (target > cur ? 0.5 : 0.08);
    L.bass = k(L.bass, bass);
    L.mid = k(L.mid, mid);
    L.hi = k(L.hi, hi);
  };

})();
