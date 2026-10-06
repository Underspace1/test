/* ==========================================================================
   util.js — noyau : événements, boucle d'animation, helpers DOM, icônes, thèmes
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

  /* URL sûre : http(s), mailto, tel ou relatif. Tout le reste (javascript:, data:…) est rejeté. */
  U.safeUrl = (url) => {
    const s = String(url || '').trim();
    const m = s.match(/^([a-z][a-z0-9+.-]*):/i);
    if (m && !['http', 'https', 'mailto', 'tel'].includes(m[1].toLowerCase())) return '#';
    return s || '#';
  };

  U.deepMerge = (base, ...rest) => {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (const src of rest) {
      if (!src || typeof src !== 'object') continue;
      for (const k of Object.keys(src)) {
        const v = src[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
          out[k] = U.deepMerge(out[k], v);
        } else {
          out[k] = Array.isArray(v) ? v.slice() : v;
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
  U.rgbToHue = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 0;
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return ((h * 60) + 360) % 360;
  };

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
    violet: { label: 'Violet', a: '#a78bfa', b: '#ec4899' },
    ocean: { label: 'Océan', a: '#38bdf8', b: '#6366f1' },
    ember: { label: 'Braise', a: '#fb923c', b: '#f43f5e' },
    mint: { label: 'Menthe', a: '#34d399', b: '#22d3ee' },
    sakura: { label: 'Sakura', a: '#f9a8d4', b: '#c084fc' },
    mono: { label: 'Mono', a: '#d4d4d8', b: '#71717a' },
  };
  Bio.colors = { a: [167, 139, 250], b: [236, 72, 153] };
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
  Bio.applyTheme = (cfg) => {
    const t = Bio.themes[cfg.theme] || Bio.themes.violet;
    Bio.applyColors(cfg.accent || t.a, cfg.accent2 || t.b);
  };

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
  };
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

  /* ---------- valeurs par défaut de la configuration ---------- */
  Bio.defaults = {
    username: 'username',
    displayName: 'Display Name',
    avatar: 'assets/avatar.svg',
    verified: true,
    bio: ['Hello world.'],
    location: '',
    timezone: '',
    uid: 1,
    joined: '',
    pageTitle: '',
    splash: { enabled: true, text: 'cliquer pour entrer' },
    background: { type: 'shader', src: '', dim: 0.25, blur: 0 },
    theme: 'violet',
    accent: '',
    accent2: '',
    card: { opacity: 0.55, blur: 22, radius: 28 },
    effects: { particles: 'fireflies', tilt: true, cursor: true, trail: true, glitch: true },
    discord: { id: '', demo: true, useAvatar: false, tag: '' },
    views: { base: 0, endpoint: '' },
    music: { autoplay: true, volume: 0.55, tracks: [] },
    badges: [],
    socials: [],
    links: [],
    studio: true,
    terminal: true,
  };
})();
