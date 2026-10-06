/* ==========================================================================
   background.js — fond shader WebGL (réactif à la musique), particules, matrix
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
    this.root.style.setProperty('--dim', clamp(c.dim, 0, 0.9));
    this.root.style.setProperty('--bgblur', (c.blur || 0) + 'px');
    const v = this.video;
    if (type === 'video' && c.src) {
      const src = Bio.util.safeUrl(c.src);
      if (v.getAttribute('src') !== src) v.setAttribute('src', src);
      v.play().catch(() => {});
    } else {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
    this.image.style.backgroundImage = type === 'image' && c.src ? 'url("' + Bio.util.safeUrl(c.src).replace(/"/g, '%22') + '")' : '';
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
    }, { passive: true });
    Bio.on('cfg', (path) => { if (path.startsWith('background')) this.apply(); });
    Bio.frame((dt, t) => this.draw(dt, t));
  };

  /* ------------------------------------------------------------ particules */
  const fx = (Bio.fx = { list: [], sparks: [], mouse: { x: -999, y: -999 }, w: 0, h: 0, dpr: 1 });

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
    else if (mode === 'stars') n = clamp(Math.round(area / 5500), 60, 260);
    if (reduce) n = Math.round(n / 3);
    this.list = [];
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: rand(0, this.w), y: rand(0, this.h),
        vx: rand(-12, 12), vy: mode === 'snow' ? rand(18, 55) : rand(-14, 6),
        r: mode === 'fireflies' ? rand(7, 20) : rand(0.6, mode === 'snow' ? 2.6 : 1.6),
        ph: rand(0, Math.PI * 2), sp: rand(0.4, 1.4), z: rand(0.2, 1),
      });
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
    const reduce = Bio.util.reduceMotion();
    const m = this.mouse;

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
    } else if (mode === 'stars') {
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
    Bio.on('cfg', (path) => { if (path === 'effects.particles') this.seed(); });
    Bio.frame((dt, t) => this.draw(dt, t));
  };

  /* ---------------------------------------------------------------- matrix */
  const matrix = (Bio.matrix = { on: false, cols: [], timer: 0 });
  const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF';

  matrix.start = function (ms = 9000) {
    this.canvas = this.canvas || $('#matrix');
    this.ctx = this.ctx || this.canvas.getContext('2d');
    const dpr = 1;
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
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
