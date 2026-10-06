/* ==========================================================================
   background.js — fond shader WebGL (réactif à la musique), aurora / grille
   (CSS), particules, pluie matrix
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const { $, clamp, lerp, rand } = Bio.util;

  /* ---------------------------------------------------------------- shader */
  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_audio;
uniform vec3 u_c1;
uniform vec3 u_c2;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  vec2 m = (u_mouse - 0.5) * 0.7;
  float t = u_time * 0.055;
  vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.6 + 3.0 * q + vec2(1.7, 9.2) + t * 1.5 + m),
                fbm(p * 1.6 + 3.0 * q + vec2(8.3, 2.8) - t * 1.2));
  float f = fbm(p * 1.4 + 3.0 * r);

  vec3 col = vec3(0.016, 0.014, 0.035);
  float a = smoothstep(0.24, 0.74, f);
  col = mix(col, u_c1 * 0.85, a * (0.62 + u_audio * 0.8));
  col = mix(col, u_c2 * 0.95, smoothstep(0.3, 1.0, length(q)) * 0.4 * (1.0 + u_audio * 1.1));
  col += pow(f, 3.0) * mix(u_c1, u_c2, 0.45) * (0.26 + u_audio * 0.9);

  float d = length(p);
  col *= 1.0 - d * d * 0.55;
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`;

  const bg = (Bio.bg = {
    gl: null, prog: null, u: {}, ok: false,
    audio: 0, mouse: [0.5, 0.5], mouseT: [0.5, 0.5], size: [2, 2],
  });

  bg.initGL = function () {
    const gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return false;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('[bio] shader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['u_res', 'u_time', 'u_mouse', 'u_audio', 'u_c1', 'u_c2'].forEach((n) => (this.u[n] = gl.getUniformLocation(prog, n)));
    this.gl = gl;
    this.prog = prog;
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; this.root.classList.add('no-gl'); });
    return true;
  };

  bg.resize = function () {
    const s = Math.min(0.6, 960 / Math.max(innerWidth, innerHeight));
    const w = Math.max(2, Math.floor(innerWidth * s));
    const h = Math.max(2, Math.floor(innerHeight * s));
    this.canvas.width = w;
    this.canvas.height = h;
    this.size = [w, h];
    if (this.gl) this.gl.viewport(0, 0, w, h);
  };

  bg.apply = function () {
    const c = Bio.cfg.background;
    const type = c.type;
    this.root.dataset.type = type;
    this.root.style.setProperty('--dim', clamp(+c.dim || 0, 0, 0.9));
    this.root.style.setProperty('--bgblur', (+c.blur || 0) + 'px');
    const v = this.video;
    if (type === 'video' && c.src) {
      const src = Bio.util.safeUrl(c.src);
      if (v.getAttribute('src') !== src) v.setAttribute('src', src);
      v.play().catch(() => {});
    } else if (v.getAttribute('src')) {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
    this.image.style.backgroundImage = type === 'image' && c.src ? Bio.util.cssUrl(c.src) : '';
    this.root.classList.toggle('mono', !!c.mono);
    // décorations
    const d = Bio.cfg.decor || {};
    const root = document.documentElement;
    root.classList.toggle('decor-orbs', !!d.orbs);
    root.classList.toggle('decor-noise', !!d.noise);
    root.classList.toggle('decor-vignette', !!d.vignette);
    root.classList.toggle('decor-scanlines', !!d.scanlines);
    root.classList.toggle('decor-dots', !!d.dots);
    root.classList.toggle('fx-spotlight', !!(Bio.cfg.effects && Bio.cfg.effects.spotlight) && Bio.util.finePointer());
  };

  bg.draw = function (dt, t) {
    this.mouse[0] = lerp(this.mouse[0], this.mouseT[0], 0.04);
    this.mouse[1] = lerp(this.mouse[1], this.mouseT[1], 0.04);
    if (!this.ok || Bio.cfg.background.type !== 'shader') return;
    const gl = this.gl, u = this.u, col = Bio.colors;
    const lvl = Bio.level ? Bio.level.bass : 0;
    this.audio = lerp(this.audio, lvl, 0.15);
    gl.uniform2f(u.u_res, this.size[0], this.size[1]);
    gl.uniform1f(u.u_time, Bio.util.reduceMotion() ? 0 : t);
    gl.uniform2f(u.u_mouse, this.mouse[0], this.mouse[1]);
    gl.uniform1f(u.u_audio, this.audio);
    gl.uniform3f(u.u_c1, col.a[0] / 255, col.a[1] / 255, col.a[2] / 255);
    gl.uniform3f(u.u_c2, col.b[0] / 255, col.b[1] / 255, col.b[2] / 255);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  bg.init = function () {
    this.root = $('#bg');
    this.canvas = $('#bg-gl');
    this.video = $('#bg-video');
    this.image = $('#bg-image');
    this.ok = this.initGL();
    if (!this.ok) this.root.classList.add('no-gl');
    this.resize();
    this.apply();
    addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => {
      this.mouseT[0] = e.clientX / innerWidth;
      this.mouseT[1] = 1 - e.clientY / innerHeight;
      document.documentElement.style.setProperty('--sx', e.clientX + 'px');
      document.documentElement.style.setProperty('--sy', e.clientY + 'px');
    }, { passive: true });
    Bio.on('cfg', (path) => { if (/^(background|decor|effects\.spotlight)/.test(path)) this.apply(); });
    Bio.on('config', () => this.apply());
    Bio.frame((dt, t) => this.draw(dt, t));
  };

  /* ------------------------------------------------------------ particules */
  const fx = (Bio.fx = { list: [], sparks: [], shots: [], mouse: { x: -999, y: -999 }, w: 0, h: 0, dpr: 1, shotTimer: 0 });

  fx.makeSprite = function () {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d');
    const [r, gr, b] = Bio.colors.a.map((v) => Math.round(lerp(v, 255, 0.35)));
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(255,255,255,1)`);
    grad.addColorStop(0.18, `rgba(${r},${gr},${b},0.85)`);
    grad.addColorStop(0.5, `rgba(${r},${gr},${b},0.18)`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this.sprite = s;
    // bokeh : disque doux bicolore
    const k = document.createElement('canvas');
    k.width = k.height = 128;
    const kg = k.getContext('2d');
    const [r2, g2, b2] = Bio.colors.b;
    const kgrad = kg.createRadialGradient(64, 64, 0, 64, 64, 64);
    kgrad.addColorStop(0, `rgba(${r},${gr},${b},0.55)`);
    kgrad.addColorStop(0.7, `rgba(${r2},${g2},${b2},0.25)`);
    kgrad.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
    kg.fillStyle = kgrad;
    kg.fillRect(0, 0, 128, 128);
    this.bokeh = k;
  };

  fx.resize = function () {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.seed();
  };

  fx.seed = function () {
    const mode = Bio.cfg.effects.particles;
    const area = this.w * this.h;
    const reduce = Bio.util.reduceMotion();
    let n = 0;
    if (mode === 'fireflies') n = clamp(Math.round(area / 22000), 18, 70);
    else if (mode === 'snow') n = clamp(Math.round(area / 9000), 40, 160);
    else if (mode === 'stars' || mode === 'shooting') n = clamp(Math.round(area / 5500), 60, 260);
    else if (mode === 'bokeh') n = clamp(Math.round(area / 60000), 8, 26);
    else if (mode === 'rain') n = clamp(Math.round(area / 7000), 60, 220);
    n = Math.round(n * (Bio.cfg.effects.density || 1));
    if (reduce) n = Math.round(n / 3);
    this.list = [];
    this.shots = [];
    for (let i = 0; i < n; i++) {
      const p = {
        x: rand(0, this.w), y: rand(0, this.h),
        vx: rand(-12, 12), vy: rand(-14, 6),
        r: rand(0.6, 1.6), ph: rand(0, Math.PI * 2), sp: rand(0.4, 1.4), z: rand(0.2, 1),
      };
      if (mode === 'fireflies') p.r = rand(7, 20);
      else if (mode === 'snow') { p.vy = rand(18, 55); p.r = rand(0.6, 2.6); }
      else if (mode === 'bokeh') { p.r = rand(30, 110); p.vx = rand(-6, 6); p.vy = rand(-8, -2); }
      else if (mode === 'rain') { p.vy = rand(520, 900); p.len = rand(14, 32); p.x = rand(-this.w * 0.2, this.w); }
      this.list.push(p);
    }
  };

  fx.burst = function (x, y, n = 18, opts = {}) {
    const speed = opts.speed || 180;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(0.25, 1) * speed;
      this.sparks.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.lift || 40),
        life: 0, max: rand(0.5, 1.1) * (opts.life || 1), size: rand(5, 13) * (opts.size || 1),
        c: opts.color || (Math.random() < 0.5 ? 0 : 1),
      });
    }
    if (this.sparks.length > 400) this.sparks.splice(0, this.sparks.length - 400);
  };

  fx.draw = function (dt, t) {
    const ctx = this.ctx, W = this.w, H = this.h;
    ctx.clearRect(0, 0, W, H);
    const mode = Bio.cfg.effects.particles;
    const m = this.mouse;
    const [ar, ag, ab] = Bio.colors.a;

    if (mode === 'fireflies') {
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.list) {
        p.ph += dt * p.sp;
        p.vx += Math.cos(p.ph * 1.3) * 6 * dt;
        p.vy += Math.sin(p.ph) * 6 * dt;
        const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < 16000) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / 126) * 160;
          p.vx += (dx / d) * f * dt;
          p.vy += (dy / d) * f * dt;
        }
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -30) p.x = W + 30; else if (p.x > W + 30) p.x = -30;
        if (p.y < -30) p.y = H + 30; else if (p.y > H + 30) p.y = -30;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.ph * 2.1));
        ctx.globalAlpha = tw * 0.8;
        ctx.drawImage(this.sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    } else if (mode === 'snow') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff';
      for (const p of this.list) {
        p.ph += dt * p.sp;
        p.y += p.vy * dt * (0.5 + p.z);
        p.x += (Math.sin(p.ph) * 14 + p.vx * 0.2) * dt;
        if (p.y > H + 6) { p.y = -6; p.x = rand(0, W); }
        ctx.globalAlpha = 0.25 + p.z * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
      }
    } else if (mode === 'stars' || mode === 'shooting') {
      ctx.globalCompositeOperation = 'lighter';
      const ox = (m.x - W / 2) * 0.012, oy = (m.y - H / 2) * 0.012;
      ctx.fillStyle = '#fff';
      for (const p of this.list) {
        p.ph += dt * p.sp;
        const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.ph * 2));
        ctx.globalAlpha = tw * (0.35 + p.z * 0.65);
        ctx.beginPath();
        ctx.arc(p.x - ox * p.z * 8, p.y - oy * p.z * 8, p.r * (0.6 + p.z), 0, 6.2832);
        ctx.fill();
      }
      if (mode === 'shooting' && !Bio.util.reduceMotion()) {
        this.shotTimer -= dt;
        if (this.shotTimer <= 0) {
          this.shotTimer = rand(1.2, 3.5);
          const a = rand(0.45, 0.8);
          this.shots.push({ x: rand(-W * 0.1, W * 0.9), y: rand(-20, H * 0.4), vx: Math.cos(a) * rand(700, 1100), vy: Math.sin(a) * rand(500, 800), life: 0, max: rand(0.6, 1.1) });
        }
        for (let i = this.shots.length - 1; i >= 0; i--) {
          const s = this.shots[i];
          s.life += dt;
          if (s.life > s.max) { this.shots.splice(i, 1); continue; }
          const k = Math.sin((s.life / s.max) * Math.PI);
          const len = 120 * k;
          const hyp = Math.hypot(s.vx, s.vy) || 1;
          const nx = s.vx / hyp, ny = s.vy / hyp;
          const grad = ctx.createLinearGradient(s.x - nx * len, s.y - ny * len, s.x, s.y);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(1, `rgba(255,255,255,${0.9 * k})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(s.x - nx * len, s.y - ny * len);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
          ctx.globalAlpha = k;
          ctx.drawImage(this.sprite, s.x - 8, s.y - 8, 16, 16);
          s.x += s.vx * dt; s.y += s.vy * dt;
        }
      }
    } else if (mode === 'bokeh') {
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.list) {
        p.ph += dt * p.sp * 0.5;
        p.x += (p.vx + Math.sin(p.ph) * 8) * dt;
        p.y += p.vy * dt;
        if (p.y < -p.r * 2) { p.y = H + p.r; p.x = rand(0, W); }
        if (p.x < -p.r * 2) p.x = W + p.r; else if (p.x > W + p.r * 2) p.x = -p.r;
        ctx.globalAlpha = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(p.ph * 1.7)) * p.z;
        ctx.drawImage(this.bokeh, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    } else if (mode === 'rain') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(${Math.round(lerp(ar, 255, 0.5))},${Math.round(lerp(ag, 255, 0.5))},${Math.round(lerp(ab, 255, 0.5))},0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const p of this.list) {
        const spd = p.vy * (0.5 + p.z * 0.6);
        p.y += spd * dt;
        p.x += spd * 0.18 * dt;
        if (p.y > H + 40) { p.y = rand(-80, -10); p.x = rand(-W * 0.2, W); }
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.len * 0.18, p.y - p.len);
      }
      ctx.globalAlpha = 0.7;
      ctx.stroke();
    }

    // étincelles (clics, traînée, confettis du mode rave)
    if (this.sparks.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.life += dt;
        if (s.life >= s.max) { this.sparks.splice(i, 1); continue; }
        s.vy += 260 * dt;
        s.vx *= 0.985;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const k = 1 - s.life / s.max;
        ctx.globalAlpha = k;
        const sz = s.size * (0.4 + k);
        if (s.c === 'rainbow') {
          const spr = this.spriteFor(((s.x + s.y) * 0.5 + performance.now() * 0.1) % 360);
          ctx.drawImage(spr, s.x - sz, s.y - sz, sz * 2, sz * 2);
        } else {
          ctx.drawImage(this.sprite, s.x - sz, s.y - sz, sz * 2, sz * 2);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  // sprite teinté pour les confettis arc-en-ciel (mis en cache par pas de 30°)
  const hueCache = {};
  fx.spriteFor = function (hue) {
    const key = Math.round(hue / 30) * 30;
    if (hueCache[key]) return hueCache[key];
    const s = document.createElement('canvas');
    s.width = s.height = 48;
    const g = s.getContext('2d');
    const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.25, `hsla(${key},95%,62%,.9)`);
    grad.addColorStop(1, `hsla(${key},95%,55%,0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);
    return (hueCache[key] = s);
  };

  fx.init = function () {
    this.canvas = $('#fx');
    this.ctx = this.canvas.getContext('2d');
    this.makeSprite();
    this.resize();
    addEventListener('resize', () => this.resize());
    let lastTrail = 0;
    addEventListener('pointermove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (Bio.cfg.effects.trail && e.pointerType === 'mouse' && !Bio.util.reduceMotion()) {
        const now = performance.now();
        if (now - lastTrail > 28) {
          lastTrail = now;
          this.sparks.push({
            x: e.clientX + rand(-3, 3), y: e.clientY + rand(-3, 3), vx: rand(-30, 30), vy: rand(-40, 10),
            life: 0, max: rand(0.35, 0.7), size: rand(3, 7), c: 0,
          });
        }
      }
    }, { passive: true });
    addEventListener('pointerleave', () => { this.mouse.x = this.mouse.y = -999; });
    Bio.on('theme', () => this.makeSprite());
    Bio.on('cfg', (path) => { if (path === 'effects.particles' || path === 'effects.density') this.seed(); });
    Bio.on('config', () => this.seed());
    Bio.frame((dt, t) => this.draw(dt, t));
  };

  /* ---------------------------------------------------------------- matrix */
  const matrix = (Bio.matrix = { on: false, cols: [], timer: 0 });
  const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF';

  matrix.start = function (ms = 9000) {
    this.canvas = this.canvas || $('#matrix');
    this.ctx = this.ctx || this.canvas.getContext('2d');
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;
    this.size = 16;
    this.cols = Array.from({ length: Math.ceil(innerWidth / this.size) }, () => rand(-40, 0));
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, innerWidth, innerHeight);
    this.canvas.classList.add('on');
    this.on = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.stop(), ms);
  };
  matrix.stop = function () {
    this.on = false;
    clearTimeout(this.timer);
    if (this.canvas) this.canvas.classList.remove('on');
  };
  matrix.accum = 0;
  matrix.draw = function (dt) {
    if (!this.on) return;
    this.accum += dt;
    if (this.accum < 0.05) return;
    this.accum = 0;
    const ctx = this.ctx, s = this.size;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.font = s + 'px "JetBrains Mono", monospace';
    const [r, g, b] = Bio.colors.a;
    for (let i = 0; i < this.cols.length; i++) {
      const y = this.cols[i] * s;
      const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      ctx.fillStyle = '#fff';
      ctx.fillText(ch, i * s, y);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], i * s, y - s);
      this.cols[i] = y > innerHeight && Math.random() > 0.975 ? 0 : this.cols[i] + 1;
    }
  };
  matrix.init = function () { Bio.frame((dt) => this.draw(dt)); };

  Bio.initBackground = () => { bg.init(); fx.init(); matrix.init(); };
})();
