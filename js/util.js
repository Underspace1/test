/* ==========================================================================
   util.js — noyau : événements, boucle d'animation, helpers DOM, icônes,
   thèmes, polices, modèles, valeurs par défaut
   ========================================================================== */
(function () {
  'use strict';
  const Bio = (window.Bio = window.Bio || {});

  /* ---------- bus d'événements ---------- */
  const handlers = {};
  Bio.on = (ev, fn) => {
    (handlers[ev] = handlers[ev] || []).push(fn);
    return () => Bio.off(ev, fn);
  };
  Bio.off = (ev, fn) => {
    handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn);
  };
  Bio.emit = (ev, ...args) => {
    (handlers[ev] || []).slice().forEach((fn) => {
      try { fn(...args); } catch (e) { console.error('[bio]', ev, e); }
    });
  };

  /* ---------- helpers ---------- */
  const U = (Bio.util = {});
  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.pad2 = (n) => String(n).padStart(2, '0');
  U.fmtTime = (s) => {
    if (!isFinite(s)) return '∞';
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + U.pad2(s % 60);
  };
  U.reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  U.finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  U.debounce = (fn, ms) => {
    let t = 0;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };
  U.uid = () => Math.random().toString(36).slice(2, 9);

  /* stockage tolérant (navigation privée, file://, etc.) */
  U.store = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem('bio:' + k);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(k, v) { try { localStorage.setItem('bio:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem('bio:' + k); } catch (e) { /* ignore */ } },
  };

  /* URL sûre : http(s), mailto, tel, data:image (avatars importés) ou relatif. Le reste est rejeté. */
  U.safeUrl = (url) => {
    const s = String(url || '').trim();
    const m = s.match(/^([a-z][a-z0-9+.-]*):/i);
    if (m) {
      const scheme = m[1].toLowerCase();
      if (scheme === 'data') return /^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif);base64,/i.test(s) ? s : '#';
      if (!['http', 'https', 'mailto', 'tel'].includes(scheme)) return '#';
    }
    return s || '#';
  };
  U.cssUrl = (url) => 'url("' + U.safeUrl(url).replace(/["\\]/g, '') + '")';

  U.deepMerge = (base, ...rest) => {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (const src of rest) {
      if (!src || typeof src !== 'object') continue;
      for (const k of Object.keys(src)) {
        const v = src[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
          out[k] = U.deepMerge(out[k], v);
        } else {
          out[k] = Array.isArray(v) ? v.map((x) => (x && typeof x === 'object' ? U.deepMerge({}, x) : x)) : v;
        }
      }
    }
    return out;
  };
  U.getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  U.setPath = (obj, path, val) => {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {}), obj);
    target[last] = val;
  };

  /* création de nœuds DOM — tout passe par textContent, jamais innerHTML */
  U.h = (tag, props, ...kids) => {
    const el = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'text') el.textContent = v;
        else if (k === 'value' || k === 'checked') el[k] = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };

  U.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = U.h('textarea', { style: { position: 'fixed', opacity: '0' } });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { /* ignore */ }
      ta.remove();
      return ok;
    }
  };

  U.download = (name, text, type = 'text/javascript') => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = U.h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  U.toast = (msg, icon) => {
    const box = U.$('#toasts');
    if (!box) return;
    const t = U.h('div', { class: 'toast', role: 'status' }, icon ? Bio.icon(icon, 16) : null, U.h('span', { text: msg }));
    box.append(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      setTimeout(() => t.remove(), 400);
    }, 2400);
  };

  /* couleurs */
  U.hexToRgb = (hex) => {
    let s = String(hex).replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const n = parseInt(s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  U.hslToHex = (h, s, l) => {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return U.rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  };
  U.isHex = (s) => /^#[0-9a-f]{6}$/i.test(String(s || ''));

  /* ---------- boucle d'animation unique ---------- */
  const subs = [];
  let raf = 0, last = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    for (let i = 0; i < subs.length; i++) {
      try { subs[i](dt, now / 1000); } catch (e) { console.error('[bio] frame', e); subs.splice(i--, 1); }
    }
    raf = requestAnimationFrame(tick);
  }
  Bio.frame = (fn) => subs.push(fn);
  Bio.startLoop = () => {
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else Bio.startLoop();
  });

  /* ---------- thèmes ---------- */
  Bio.themes = {
    white: { label: 'Blanc', a: '#f4f4f5', b: '#a1a1aa' },
    violet: { label: 'Violet', a: '#a78bfa', b: '#ec4899' },
    ocean: { label: 'Océan', a: '#38bdf8', b: '#6366f1' },
    ember: { label: 'Braise', a: '#fb923c', b: '#f43f5e' },
    mint: { label: 'Menthe', a: '#34d399', b: '#22d3ee' },
    sakura: { label: 'Sakura', a: '#f9a8d4', b: '#c084fc' },
    gold: { label: 'Or', a: '#fcd34d', b: '#f97316' },
    ice: { label: 'Glace', a: '#e0f2fe', b: '#7dd3fc' },
    mono: { label: 'Mono', a: '#d4d4d8', b: '#71717a' },
  };
  Bio.colors = { a: [244, 244, 245], b: [161, 161, 170] };
  Bio.applyColors = (a, b) => {
    const root = document.documentElement.style;
    const ra = U.hexToRgb(a), rb = U.hexToRgb(b);
    root.setProperty('--accent', a);
    root.setProperty('--accent2', b);
    root.setProperty('--accent-rgb', ra.join(' '));
    root.setProperty('--accent2-rgb', rb.join(' '));
    Bio.colors = { a: ra, b: rb };
    const meta = U.$('meta[name="theme-color"]');
    if (meta) meta.content = a;
    Bio.emit('theme');
  };
  Bio.themeColors = (cfg) => {
    const t = Bio.themes[cfg.theme] || Bio.themes.white;
    return { a: U.isHex(cfg.accent) ? cfg.accent : t.a, b: U.isHex(cfg.accent2) ? cfg.accent2 : t.b };
  };
  Bio.applyTheme = (cfg) => {
    const c = Bio.themeColors(cfg);
    Bio.applyColors(c.a, c.b);
  };

  /* ---------- polices (Google Fonts, chargées à la demande) ---------- */
  Bio.fonts = {
    inter: { label: 'Inter', display: '"Inter"', body: '"Inter"', gf: '' },
    space: { label: 'Space Grotesk', display: '"Space Grotesk"', body: '"Inter"', gf: 'Space+Grotesk:wght@500;600;700' },
    sora: { label: 'Sora', display: '"Sora"', body: '"Sora"', gf: 'Sora:wght@400;500;600;700' },
    outfit: { label: 'Outfit', display: '"Outfit"', body: '"Outfit"', gf: 'Outfit:wght@400;500;600;700' },
    poppins: { label: 'Poppins', display: '"Poppins"', body: '"Poppins"', gf: 'Poppins:wght@400;500;600;700' },
    syne: { label: 'Syne', display: '"Syne"', body: '"Inter"', gf: 'Syne:wght@500;600;700;800' },
    playfair: { label: 'Playfair Display', display: '"Playfair Display"', body: '"Inter"', gf: 'Playfair+Display:wght@500;600;700' },
    mono: { label: 'JetBrains Mono', display: '"JetBrains Mono"', body: '"JetBrains Mono"', gf: '' },
  };
  const loadedFonts = new Set(['space', 'inter', 'mono']);
  Bio.applyFont = (key) => {
    const f = Bio.fonts[key] || Bio.fonts.inter;
    if (f.gf && !loadedFonts.has(key)) {
      loadedFonts.add(key);
      document.head.append(U.h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=' + f.gf + '&display=swap' }));
    }
    const root = document.documentElement.style;
    root.setProperty('--display', f.display + ', "Inter", system-ui, sans-serif');
    root.setProperty('--font', f.body + ', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
  };

  /* ---------- modèles prêts à l'emploi ---------- */
  Bio.presets = [
    { id: 'drift', label: 'Minimal', desc: 'Noir & blanc, verre sombre, halo', colors: ['#f4f4f5', '#52525b'],
      cfg: { theme: 'white', accent: '', accent2: '', font: 'inter', nameStyle: 'neon', linkStyle: 'glass', avatarRing: 'none', avatarShape: 'circle', banner: 'gradient',
        background: { type: 'shader', dim: 0.35, blur: 0, mono: true }, card: { style: 'glass', border: 'none', opacity: 0.5, blur: 16, radius: 26 },
        decor: { orbs: false, noise: false, vignette: true, scanlines: false, dots: true }, effects: { particles: 'none', spotlight: true, tilt: true, trail: false, glitch: false, cursor: false } } },
    { id: 'nebula', label: 'Nébuleuse', desc: 'Fluide WebGL, verre, lucioles', colors: ['#a78bfa', '#ec4899'],
      cfg: { theme: 'violet', accent: '', accent2: '', font: 'space', nameStyle: 'shimmer', linkStyle: 'glass', avatarRing: 'gradient', avatarShape: 'circle', banner: '',
        background: { type: 'shader', dim: 0.25, blur: 0, mono: false }, card: { style: 'glass', border: 'spotlight', opacity: 0.55, blur: 22, radius: 28 },
        decor: { orbs: true, noise: true, vignette: true, scanlines: false, dots: false }, effects: { particles: 'fireflies', spotlight: true } } },
    { id: 'aurora', label: 'Aurore', desc: 'Voiles boréals, menthe & cyan', colors: ['#34d399', '#22d3ee'],
      cfg: { theme: 'mint', accent: '', accent2: '', font: 'sora', nameStyle: 'neon', linkStyle: 'outline', avatarRing: 'pulse', avatarShape: 'circle', banner: '',
        background: { type: 'aurora', dim: 0.2, blur: 0, mono: false }, card: { style: 'glass', border: 'gradient', opacity: 0.4, blur: 26, radius: 24 },
        decor: { orbs: false, noise: true, vignette: true, scanlines: false, dots: false }, effects: { particles: 'snow', spotlight: true } } },
    { id: 'synthwave', label: 'Synthwave', desc: 'Grille rétro, néons, scanlines', colors: ['#f472b6', '#22d3ee'],
      cfg: { theme: 'violet', accent: '#f472b6', accent2: '#22d3ee', font: 'syne', nameStyle: 'neon', linkStyle: 'neon', avatarRing: 'gradient', avatarShape: 'hexagon', banner: 'gradient',
        background: { type: 'grid', dim: 0.1, blur: 0, mono: false }, card: { style: 'neon', border: 'none', opacity: 0.7, blur: 16, radius: 18 },
        decor: { orbs: false, noise: true, vignette: true, scanlines: true, dots: false }, effects: { particles: 'shooting', spotlight: false } } },
    { id: 'paper', label: 'Sobre', desc: 'Plein, net, sans distraction', colors: ['#e4e4e7', '#71717a'],
      cfg: { theme: 'mono', accent: '', accent2: '', font: 'inter', nameStyle: 'plain', linkStyle: 'solid', avatarRing: 'none', avatarShape: 'rounded', banner: '',
        background: { type: 'none', dim: 0, blur: 0, mono: false }, card: { style: 'solid', border: 'none', opacity: 1, blur: 0, radius: 20 },
        decor: { orbs: false, noise: false, vignette: false, scanlines: false, dots: false }, effects: { particles: 'none', spotlight: false, tilt: false, trail: false, glitch: false } } },
    { id: 'sakura', label: 'Sakura', desc: 'Pastel, bokeh, douceur', colors: ['#f9a8d4', '#c084fc'],
      cfg: { theme: 'sakura', accent: '', accent2: '', font: 'playfair', nameStyle: 'rainbow', linkStyle: 'glass', avatarRing: 'gradient', avatarShape: 'circle', banner: 'gradient',
        background: { type: 'aurora', dim: 0.3, blur: 0, mono: false }, card: { style: 'glass', border: 'gradient', opacity: 0.5, blur: 30, radius: 32 },
        decor: { orbs: true, noise: false, vignette: true, scanlines: false, dots: false }, effects: { particles: 'bokeh', spotlight: true } } },
    { id: 'gold', label: 'Luxe', desc: 'Or & noir, étoiles filantes', colors: ['#fcd34d', '#f97316'],
      cfg: { theme: 'gold', accent: '', accent2: '', font: 'playfair', nameStyle: 'shimmer', linkStyle: 'outline', avatarRing: 'gradient', avatarShape: 'circle', banner: '',
        background: { type: 'shader', dim: 0.45, blur: 0, mono: false }, card: { style: 'outline', border: 'gradient', opacity: 0.3, blur: 18, radius: 22 },
        decor: { orbs: false, noise: true, vignette: true, scanlines: false, dots: false }, effects: { particles: 'shooting', spotlight: true } } },
  ];

  /* ---------- icônes ---------- */
  // Icônes d'interface : tracés "stroke" 24×24 (style Lucide). Contenu statique uniquement.
  const UI = {
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4.5" height="16" rx="1" fill="currentColor"/><rect x="13.5" y="4" width="4.5" height="16" rx="1" fill="currentColor"/>',
    prev: '<path d="M19 20 9 12l10-8v16Z" fill="currentColor"/><path d="M5 19V5"/>',
    next: '<path d="m5 4 10 8-10 8V4Z" fill="currentColor"/><path d="M19 5v14"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
    sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2Z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8Z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    crown: '<path d="M2 20h20M4 20 2 6l6 5 4-7 4 7 6-5-2 14"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><path d="M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22Z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    wand: '<path d="m15 4 5 5L8 21l-5-5L15 4ZM14 6l4 4"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/>',
    gamepad: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="4"/>',
    command: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3Z"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    grip: '<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
    download: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/>',
    type: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    rocket: '<path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2M14 4c3 0 6 3 6 6l-8 8-4-4 6-10Z"/><circle cx="15" cy="9" r="1.5"/><path d="m9 14-2-2M12 17l-2-2"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8ZM6 2v2M10 2v2M14 2v2"/>',
    camera: '<path d="M4 8a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="13" r="3.5"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3Z"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-10-1 12-5 17-9 17Z"/><path d="M4 20c4-4 8-7 12-9"/>',
    skull: '<circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><path d="M8 20v2h8v-2M12.5 17h-1l-.5-2h2l-.5 2Z"/><path d="M16 20a2 2 0 0 0 2-2v-1.3A8 8 0 1 0 6 16.7V18a2 2 0 0 0 2 2h8Z"/>',
    ghost: '<path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 3 2.5-3 2.5 3 2.5-3 3 3V10a8 8 0 0 0-8-8Z"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/>',
    planet: '<circle cx="12" cy="12" r="6"/><path d="M4.5 9.5c-3 2.5-2.2 4.4-1.5 5 1.7 1.7 8.5-.5 14.5-6s7.7-11.3 6-13c-.6-.6-2.5-1.4-5 1.5"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',
    paint: '<path d="M19 3h-8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h8V3Z"/><path d="M11 6H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h7"/><path d="M12 12v3a2 2 0 0 1-2 2H8v4h4"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
    dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12Z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    home: '<path d="m3 11 9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9Z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" fill="currentColor"/>',
  };
  Bio.uiIcons = Object.keys(UI);
  Bio.icon = (name, size = 20) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'ico');
    const brand = window.BioIcons && window.BioIcons[name];
    if (brand) {
      svg.setAttribute('fill', 'currentColor');
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', brand);
      svg.append(p);
    } else {
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.innerHTML = UI[name] || UI.link; // markup statique défini ci-dessus
    }
    return svg;
  };
  Bio.hasIcon = (name) => !!(UI[name] || (window.BioIcons && window.BioIcons[name]));

  /* ---------- widgets (blocs empilés de la page) ---------- */
  Bio.widgets = {
    profile: { label: 'Profil', desc: 'bannière, avatar, nom, bio, réseaux', icon: 'user' },
    about: { label: 'À propos', desc: 'un court texte libre', icon: 'pen' },
    views: { label: 'Vues', desc: 'compteur de visites', icon: 'eye' },
    discord: { label: 'Discord', desc: 'présence en direct', icon: 'discord' },
    roblox: { label: 'Roblox', desc: 'amis, abonnés, présence', icon: 'roblox' },
    osu: { label: 'osu!', desc: 'rang, pp, précision', icon: 'osu' },
    embed: { label: 'Lecteur intégré', desc: 'Spotify, SoundCloud, YouTube, Apple Music', icon: 'headphones' },
    music: { label: 'Musique', desc: 'lecteur de la page', icon: 'music' },
    links: { label: 'Liens', desc: 'les gros boutons', icon: 'link' },
  };

  /* ---------- valeurs par défaut de la configuration ---------- */
  Bio.defaults = {
    username: 'username',
    displayName: 'Display Name',
    avatar: 'assets/avatar.svg',
    banner: '',
    verified: true,
    bio: ['Hello world.'],
    about: '',
    location: '',
    timezone: '',
    uid: 1,
    joined: '',
    pageTitle: '',
    layout: ['profile', 'about', 'views', 'discord', 'roblox', 'osu', 'embed', 'music', 'links'],
    socialsLimit: 5,
    font: 'inter',
    nameStyle: 'neon',
    linkStyle: 'glass',
    avatarShape: 'circle',
    avatarRing: 'none',
    splash: { enabled: true, text: 'cliquer pour entrer' },
    background: { type: 'shader', src: '', dim: 0.35, blur: 0, mono: true },
    theme: 'white',
    accent: '',
    accent2: '',
    card: { style: 'glass', border: 'none', opacity: 0.5, blur: 16, radius: 26 },
    decor: { orbs: false, noise: false, vignette: true, scanlines: false, dots: true },
    effects: { particles: 'none', tilt: true, cursor: false, trail: false, glitch: false, spotlight: true, ripple: true },
    discord: { id: '', demo: true, useAvatar: false, tag: '' },
    roblox: { id: '', username: '', displayName: '', friends: 0, followers: 0, avatar: '', live: true, proxy: '' },
    osu: { id: '', username: '', mode: 'osu', country: '', rank: 0, countryRank: 0, pp: 0, accuracy: 0, playcount: 0, level: 0, avatar: '', endpoint: '' },
    embed: { url: '', title: '' },
    views: { base: 0, endpoint: '' },
    music: { autoplay: true, volume: 0.55, tracks: [] },
    badges: [],
    socials: [],
    links: [],
    studio: true,
    terminal: true,
  };

  /* valide les valeurs d'énumération pour éviter un état incohérent */
  Bio.enums = {
    font: Object.keys(Bio.fonts),
    nameStyle: ['shimmer', 'neon', 'rainbow', 'plain'],
    linkStyle: ['glass', 'solid', 'outline', 'neon'],
    avatarShape: ['circle', 'rounded', 'hexagon'],
    avatarRing: ['gradient', 'pulse', 'none'],
    'background.type': ['shader', 'aurora', 'grid', 'video', 'image', 'none'],
    'card.style': ['glass', 'solid', 'outline', 'neon'],
    'card.border': ['spotlight', 'gradient', 'none'],
    'effects.particles': ['fireflies', 'snow', 'stars', 'shooting', 'bokeh', 'rain', 'none'],
    'osu.mode': ['osu', 'taiko', 'fruits', 'mania'],
    theme: Object.keys(Bio.themes),
  };
  Bio.normalize = (cfg) => {
    const out = U.deepMerge(Bio.defaults, cfg || {});
    for (const path of Object.keys(Bio.enums)) {
      const v = U.getPath(out, path);
      if (!Bio.enums[path].includes(v)) U.setPath(out, path, U.getPath(Bio.defaults, path));
    }
    if (!Array.isArray(out.bio)) out.bio = [String(out.bio || '')];
    const ids = Object.keys(Bio.widgets);
    out.layout = Array.isArray(out.layout) ? out.layout.filter((w, i, a) => ids.includes(w) && a.indexOf(w) === i) : Bio.defaults.layout.slice();
    out.about = String(out.about || '');
    ['roblox', 'osu', 'embed'].forEach((k) => { if (!out[k] || typeof out[k] !== 'object') out[k] = U.deepMerge({}, Bio.defaults[k]); });
    out.socialsLimit = Math.max(0, parseInt(out.socialsLimit, 10) || 0);
    ['badges', 'socials', 'links'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    if (!Array.isArray(out.music.tracks)) out.music.tracks = [];
    return out;
  };

  Bio.serialize = (cfg) => '/* Config générée par le dashboard — remplace le contenu de config.js */\nwindow.BIO_CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n';
})();
