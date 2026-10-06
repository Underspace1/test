/* ==========================================================================
   ui.js — carte de profil, écran d'entrée, lecteur, tilt 3D, curseur,
   magnétisme, ripple, mode aperçu (dashboard)
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const { $, h, clamp, sleep, fmtTime, store, safeUrl, cssUrl } = Bio.util;
  const UI = (Bio.ui = { entered: false });

  Bio.preview = /[?&]preview\b/.test(location.search);

  const STATUS_FR = { online: 'En ligne', idle: 'Absent', dnd: 'Ne pas déranger', offline: 'Hors ligne' };

  /* ------------------------------------------------------------- helpers */
  function chip(icon, text, id) {
    return h('span', { class: 'chip', id }, Bio.icon(icon, 14), h('span', { class: 'chip-t', text }));
  }
  function toolBtn(icon, label, onClick) {
    return h('button', { class: 'tool', type: 'button', 'aria-label': label, 'data-tip': label, 'data-tip-side': 'bottom', onclick: onClick }, Bio.icon(icon, 17));
  }
  function easeOutExpo(x) { return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); }

  /* --------------------------------------------------------------- carte */
  UI.build = function () {
    const cfg = Bio.cfg;
    const card = $('#card');
    const rebuild = !!UI.el;
    card.classList.toggle('rebuilt', rebuild);
    card.textContent = '';
    let i = 0;
    const rev = (el) => { el.classList.add('reveal'); el.style.setProperty('--i', i++); return el; };

    const tools = h('div', { class: 'card-tools' },
      toolBtn('search', 'Palette de commandes · Ctrl+K', () => Bio.overlays.open('palette')),
      cfg.terminal ? toolBtn('terminal', 'Terminal · `', () => Bio.overlays.open('terminal')) : null,
      cfg.studio ? toolBtn('sliders', 'Réglages rapides · E', () => Bio.overlays.open('studio')) : null);

    let banner = null;
    if (cfg.banner) {
      banner = h('div', { class: 'banner' + (cfg.banner === 'gradient' ? ' gradient' : '') });
      if (cfg.banner !== 'gradient') banner.style.backgroundImage = cssUrl(cfg.banner);
    }
    card.classList.toggle('has-banner', !!banner);

    const img = h('img', { src: safeUrl(cfg.avatar), alt: 'Avatar de ' + cfg.displayName, width: 112, height: 112, draggable: 'false' });
    img.addEventListener('error', () => { if (!img.dataset.fb) { img.dataset.fb = 1; img.src = 'assets/avatar.svg'; } });
    const avatar = h('div', { class: 'avatar' }, h('span', { class: 'ring' }), h('span', { class: 'frame' }, img), h('span', { class: 'status', 'data-status': 'none' }));

    const nameText = h('span', { class: 'name-text', 'data-text': cfg.displayName, text: cfg.displayName });
    const name = h('h1', { class: 'name' }, nameText, cfg.verified ? h('span', { class: 'verified', 'data-tip': 'Compte vérifié' }, Bio.icon('sparkles', 18)) : null);

    const badges = h('div', { class: 'badges' }, (cfg.badges || []).map((b) =>
      h('span', { class: 'badge', 'data-tip': b.label, tabindex: '0', role: 'img', 'aria-label': b.label }, Bio.icon(b.icon, 15))));

    const handle = h('div', { class: 'handle', text: '@' + cfg.username });
    const bio = h('p', { class: 'bio', 'aria-live': 'off' }, h('span', { class: 'typed' }), h('span', { class: 'caret' }));
    const custom = h('div', { class: 'custom-status', hidden: true });

    const meta = h('div', { class: 'meta' },
      cfg.location ? chip('pin', cfg.location) : null,
      cfg.timezone ? chip('clock', '--:--', 'chip-time') : null,
      chip('eye', '0', 'chip-views'),
      chip('hash', 'UID ' + cfg.uid));
    meta.querySelector('#chip-views').setAttribute('data-tip', 'Vues du profil');
    if (cfg.joined) {
      const d = new Date(cfg.joined);
      if (!isNaN(d)) meta.lastChild.setAttribute('data-tip', 'Membre depuis ' + d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    }

    const presence = h('div', { class: 'presence', hidden: true });

    const socials = h('div', { class: 'socials' }, (cfg.socials || []).map((s) => {
      const attrs = { class: 'social', 'data-mag': '', 'data-tip': s.label, 'aria-label': s.label };
      const ico = Bio.icon(s.icon, 22);
      if (s.copy) {
        return h('button', Object.assign(attrs, { type: 'button', onclick: async () => {
          const ok = await Bio.util.copy(s.copy);
          Bio.util.toast(ok ? s.label + ' copié : ' + s.copy : 'Copie impossible', ok ? 'check' : 'close');
        } }), ico);
      }
      return h('a', Object.assign(attrs, { href: safeUrl(s.url), target: '_blank', rel: 'noopener noreferrer' }), ico);
    }));

    const links = h('nav', { class: 'links', 'aria-label': 'Liens' }, (cfg.links || []).map((l) =>
      h('a', { class: 'link', 'data-mag': '', href: safeUrl(l.url), target: /^mailto:|^tel:/.test(l.url || '') ? null : '_blank', rel: 'noopener noreferrer' },
        h('span', { class: 'l-ico' }, Bio.icon(l.icon || 'link', 20)),
        h('span', { class: 'l-txt' }, h('b', { text: l.label }), l.sub ? h('small', { text: l.sub }) : null),
        h('span', { class: 'l-go' }, Bio.icon('arrow', 16)))));

    const foot = h('footer', { class: 'foot' },
      h('span', { text: '© ' + new Date().getFullYear() + ' @' + cfg.username }),
      h('span', { class: 'hint' }, h('kbd', { text: 'Ctrl' }), '+', h('kbd', { text: 'K' })));

    // le lecteur est construit une seule fois (canvas + abonnements) puis réutilisé
    UI.playerEl = UI.playerEl || UI.buildPlayer();
    UI.playerEl.classList.add('reveal');
    UI.playerEl.style.setProperty('--i', 7);

    card.append(
      tools, banner,
      rev(h('header', { class: 'profile' }, avatar, h('div', { class: 'identity' }, name, badges, handle))),
      rev(bio), rev(custom), rev(meta), rev(presence), rev(socials), rev(links), UI.playerEl, rev(foot));
    i++;
    foot.style.setProperty('--i', 8);

    UI.el = { card, img, status: card.querySelector('.status'), name: nameText, presence, custom, bio: bio.querySelector('.typed') };
    UI.applyCard();
    const bioKey = JSON.stringify(cfg.bio);
    if (!rebuild || bioKey !== UI.bioKey) { UI.bioKey = bioKey; UI.startTypewriter(); }
    else UI.el.bio.textContent = UI.lastTyped || '';
    UI.tickClock();
  };

  UI.applyCard = function () {
    const cfg = Bio.cfg, c = cfg.card, root = document.documentElement;
    root.style.setProperty('--card-op', clamp(+c.opacity, 0.05, 1));
    root.style.setProperty('--card-blur', clamp(+c.blur, 0, 60) + 'px');
    root.style.setProperty('--card-radius', clamp(+c.radius, 0, 48) + 'px');
    root.dataset.card = c.style;
    root.dataset.border = c.border;
    root.dataset.name = cfg.nameStyle;
    root.dataset.links = cfg.linkStyle;
    root.dataset.avatar = cfg.avatarShape;
    root.dataset.ring = cfg.avatarRing;
    root.classList.toggle('no-glitch', !cfg.effects.glitch);
    root.classList.toggle('has-cursor', !!cfg.effects.cursor && Bio.util.finePointer());
    Bio.applyFont(cfg.font);
  };

  UI.setName = function (n) {
    UI.el.name.textContent = n;
    UI.el.name.setAttribute('data-text', n);
    const sn = $('.splash-name');
    if (sn && !UI.entered) sn.textContent = n;
  };

  /* ---------------------------------------------------------- typewriter */
  let twToken = 0;
  UI.startTypewriter = async function () {
    const token = ++twToken;
    const el = { set textContent(v) { UI.lastTyped = v; UI.el.bio.textContent = v; } };
    const raw = Bio.cfg.bio;
    const lines = (Array.isArray(raw) ? raw : [raw]).map((s) => String(s).trim()).filter(Boolean);
    if (!lines.length) { el.textContent = ''; return; }
    if (Bio.util.reduceMotion()) { el.textContent = lines[0]; return; }
    let k = 0;
    while (token === twToken) {
      const text = lines[k++ % lines.length];
      for (let c = 1; c <= text.length && token === twToken; c++) { el.textContent = text.slice(0, c); await sleep(48 + Math.random() * 40); }
      await sleep(2000);
      if (lines.length === 1) { while (token === twToken) await sleep(1000); return; }
      for (let c = text.length - 1; c >= 0 && token === twToken; c--) { el.textContent = text.slice(0, c); await sleep(22); }
      await sleep(320);
    }
  };

  /* ------------------------------------------------------------ présence */
  let presenceTick = null;
  UI.renderPresence = function (p) {
    if (!UI.el) return;
    const { presence, status, custom } = UI.el;
    presence.textContent = '';
    presenceTick = null;
    if (!p) { status.dataset.status = 'none'; presence.hidden = true; custom.hidden = true; return; }
    status.dataset.status = p.status;
    status.setAttribute('data-tip', STATUS_FR[p.status] || '');
    if (p.custom && (p.custom.text || p.custom.emoji)) {
      custom.hidden = false;
      custom.textContent = (p.custom.emoji ? p.custom.emoji + ' ' : '') + p.custom.text;
    } else custom.hidden = true;

    if (Bio.cfg.discord.useAvatar && p.user && p.user.avatar && p.user.id && /^\d+$/.test(p.user.id) && /^[\w-]+$/.test(p.user.avatar)) {
      UI.el.img.src = `https://cdn.discordapp.com/avatars/${p.user.id}/${p.user.avatar}.png?size=256`;
    }

    const art = (src, fallbackIcon) => {
      const box = h('div', { class: 'pr-art' }, Bio.icon(fallbackIcon, 22));
      if (/^https:\/\//.test(src || '')) {
        const im = h('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
        im.addEventListener('error', () => im.remove());
        box.append(im);
      }
      return box;
    };

    if (p.spotify) {
      const s = p.spotify;
      const fill = h('i');
      presence.dataset.kind = 'music';
      presence.append(art(s.art, 'music'), h('div', { class: 'pr-body' },
        h('div', { class: 'pr-kicker' }, h('span', { class: 'eq' }, h('i'), h('i'), h('i')), s.label),
        h('div', { class: 'pr-title', text: s.song }),
        h('div', { class: 'pr-sub', text: s.artist }),
        h('div', { class: 'pr-bar' }, fill)));
      presenceTick = () => { fill.style.width = (clamp(s.progress(), 0, 1) * 100).toFixed(1) + '%'; };
      presence.hidden = false;
    } else if (p.activity) {
      const a = p.activity;
      const timer = h('span', { class: 'pr-time' });
      presence.dataset.kind = 'game';
      presence.append(art(a.image, 'gamepad'), h('div', { class: 'pr-body' },
        h('div', { class: 'pr-kicker', text: a.label }),
        h('div', { class: 'pr-title', text: a.name }),
        (a.details || a.state) ? h('div', { class: 'pr-sub', text: [a.details, a.state].filter(Boolean).join(' · ') }) : null,
        a.start ? timer : null));
      let lastSec = -1;
      presenceTick = () => {
        if (!a.start) return;
        const sec = Math.floor((Date.now() - a.start) / 1000);
        if (sec === lastSec) return;
        lastSec = sec;
        const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60);
        timer.textContent = 'depuis ' + (hh ? hh + ' h ' : '') + mm + ' min';
      };
      presence.hidden = false;
    } else presence.hidden = true;
    if (presenceTick) presenceTick();
  };

  /* ---------------------------------------------------------- lecteur UI */
  UI.buildPlayer = function () {
    const P = Bio.player;
    const cover = h('div', { class: 'p-cover' });
    const title = h('div', { class: 'p-title' });
    const artist = h('div', { class: 'p-artist' });
    const playBtn = h('button', { class: 'p-btn p-play', type: 'button', 'aria-label': 'Lecture / pause', onclick: () => P.toggle() });
    const prevBtn = h('button', { class: 'p-btn', type: 'button', 'aria-label': 'Piste précédente', onclick: () => P.prev() }, Bio.icon('prev', 18));
    const nextBtn = h('button', { class: 'p-btn', type: 'button', 'aria-label': 'Piste suivante', onclick: () => P.next() }, Bio.icon('next', 18));
    const viz = h('canvas', { class: 'p-viz', 'aria-hidden': 'true' });
    const fill = h('i', { class: 'p-fill' });
    const track = h('div', { class: 'p-track', role: 'slider', 'aria-label': 'Progression', tabindex: '0' }, fill);
    const tcur = h('span', { class: 'p-time', text: '0:00' });
    const tdur = h('span', { class: 'p-time', text: '∞' });
    const muteBtn = h('button', { class: 'p-btn p-mute', type: 'button', 'aria-label': 'Couper le son', onclick: () => P.toggleMute() });
    const vol = h('input', { class: 'p-vol', type: 'range', min: 0, max: 100, step: 1, 'aria-label': 'Volume', value: Math.round(P.volume * 100) });
    vol.addEventListener('input', () => P.setVolume(vol.value / 100));
    track.addEventListener('pointerdown', (e) => {
      const r = track.getBoundingClientRect();
      P.seek((e.clientX - r.left) / r.width);
    });

    const root = h('section', { class: 'player', 'aria-label': 'Lecteur de musique' },
      h('div', { class: 'p-top' }, cover, h('div', { class: 'p-meta' }, title, artist), h('div', { class: 'p-ctrl' }, prevBtn, playBtn, nextBtn)),
      viz,
      h('div', { class: 'p-bar' }, tcur, track, tdur),
      h('div', { class: 'p-volrow' }, muteBtn, vol));

    const sync = () => {
      const t = P.track;
      if (!t) return;
      title.textContent = t.title;
      artist.textContent = t.artist;
      playBtn.textContent = '';
      playBtn.append(Bio.icon(P.playing ? 'pause' : 'play', 20));
      muteBtn.textContent = '';
      muteBtn.append(Bio.icon(P.muted || P.volume === 0 ? 'mute' : 'volume', 18));
      muteBtn.setAttribute('aria-label', P.muted ? 'Rétablir le son' : 'Couper le son');
      vol.value = P.muted ? 0 : Math.round(P.volume * 100);
      vol.style.setProperty('--val', vol.value + '%');
      root.classList.toggle('playing', P.playing);
      root.classList.toggle('seekable', t.kind === 'file');
      cover.textContent = '';
      if (t.cover) cover.append(h('img', { src: safeUrl(t.cover), alt: '' }));
      else cover.append(Bio.icon('music', 22));
    };
    Bio.on('player', sync);
    sync();

    // visualiseur + progression
    const BARS = 44, arr = new Float32Array(BARS), smooth = new Float32Array(BARS);
    let W = 0, H = 0, dpr = 1;
    const ctx = viz.getContext('2d');
    const size = () => {
      const r = viz.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      viz.width = Math.round(W * dpr);
      viz.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    addEventListener('resize', size);
    Bio.on('entered', size);
    Bio.on('config', () => setTimeout(size, 50));
    setTimeout(size, 50);
    let lastTime = '';
    Bio.frame((dt, t) => {
      if (!W) { size(); if (!W) return; }
      P.bars(BARS, arr);
      ctx.clearRect(0, 0, W, H);
      const gap = 3, bw = (W - gap * (BARS - 1)) / BARS;
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, Bio.util.rgbToHex(...Bio.colors.a));
      grad.addColorStop(1, Bio.util.rgbToHex(...Bio.colors.b));
      ctx.fillStyle = grad;
      for (let i = 0; i < BARS; i++) {
        const idle = 0.06 + 0.03 * Math.sin(t * 1.6 + i * 0.5);
        const target = P.playing ? Math.max(arr[i], 0.04) : idle;
        smooth[i] += (target - smooth[i]) * (target > smooth[i] ? 0.5 : 0.12);
        const bh = Math.max(2, smooth[i] * H);
        ctx.globalAlpha = P.playing ? 0.95 : 0.35;
        const x = i * (bw + gap), y = (H - bh) / 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, bw / 2); else ctx.rect(x, y, bw, bh);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const pr = P.progress();
      fill.style.width = (pr * 100).toFixed(2) + '%';
      const dur = P.duration();
      const txt = fmtTime(P.elapsed()) + '|' + fmtTime(dur);
      if (txt !== lastTime) { lastTime = txt; const [a, b] = txt.split('|'); tcur.textContent = a; tdur.textContent = b; }
      if (presenceTick) presenceTick();
    });
    return root;
  };

  /* ------------------------------------------------------- écran d'entrée */
  UI.buildSplash = function () {
    const cfg = Bio.cfg, s = $('#splash');
    s.textContent = '';
    if (!cfg.splash.enabled || Bio.preview) { s.hidden = true; return; }
    s.append(h('div', { class: 'splash-inner' },
      h('div', { class: 'splash-orb' }),
      h('div', { class: 'splash-name', 'aria-hidden': 'true' }),
      h('div', { class: 'splash-cta' }, h('span', { text: cfg.splash.text })),
      h('div', { class: 'splash-hint' }, Bio.icon('headphones', 14), h('span', { text: 'avec le son, c’est mieux' }))));
    const go = () => UI.enter(true);
    s.addEventListener('click', go);
    s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    s.setAttribute('role', 'button');
    s.setAttribute('tabindex', '0');
    s.setAttribute('aria-label', cfg.splash.text);
    (async () => {
      const el = $('.splash-name', s), n = cfg.displayName;
      for (let i = 1; i <= n.length && !UI.entered; i++) { el.textContent = n.slice(0, i); await sleep(90); }
    })();
    setTimeout(() => s.focus && s.focus({ preventScroll: true }), 50);
  };

  UI.enter = function (gesture) {
    if (UI.entered) return;
    UI.entered = true;
    const s = $('#splash');
    document.body.classList.add('entered');
    if (gesture && Bio.cfg.music.autoplay) Bio.player.play();
    if (s && !s.hidden) {
      s.classList.add('leaving');
      setTimeout(() => { s.hidden = true; }, 900);
    }
    Bio.emit('entered');
    UI.initViews();
  };

  /* ---------------------------------------------------------- compteur(s) */
  UI.initViews = async function () {
    const el = $('#chip-views .chip-t');
    if (!el) return;
    const cfg = Bio.cfg.views;
    let value = Number(cfg.base) || 0;
    if (cfg.endpoint && /^https?:\/\//.test(cfg.endpoint)) {
      try {
        const r = await fetch(cfg.endpoint);
        const j = await r.json();
        value = Number(j.value != null ? j.value : j.count != null ? j.count : j.views) || value;
      } catch (e) { /* on garde la base */ }
    } else {
      // compteur local : +1 par jour et par navigateur (un vrai compteur global exige un serveur → cfg.views.endpoint)
      const today = new Date().toDateString();
      let n = store.get('myviews', 0);
      if (!Bio.preview && store.get('lastview', '') !== today) { n++; store.set('myviews', n); store.set('lastview', today); }
      value += n;
    }
    const fmt = new Intl.NumberFormat('fr-FR');
    UI.viewsShown = true;
    UI.viewsText = fmt.format(value);
    if (Bio.util.reduceMotion()) { el.textContent = fmt.format(value); return; }
    const t0 = performance.now(), dur = 1400;
    const step = (now) => {
      const k = clamp((now - t0) / dur, 0, 1);
      el.textContent = fmt.format(Math.round(value * easeOutExpo(k)));
      if (k < 1 && document.contains(el)) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  UI.tickClock = function () {
    const cfg = Bio.cfg;
    const el = $('#chip-time .chip-t');
    if (!el || !cfg.timezone) return;
    let s;
    try { s = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: cfg.timezone }).format(new Date()); }
    catch (e) { s = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date()); }
    el.textContent = s;
    el.parentElement.setAttribute('data-tip', 'Heure locale · ' + cfg.timezone);
  };

  /* ------------------------------------------------------- titre d'onglet */
  UI.initTitle = async function () {
    const base = () => Bio.cfg.pageTitle || '@' + Bio.cfg.username;
    document.title = base();
    if (Bio.util.reduceMotion() || Bio.preview) return;
    await sleep(1200);
    for (;;) {
      const b = base();
      for (let i = 1; i <= b.length; i++) { document.title = b.slice(0, i) + '▎'; await sleep(160); }
      document.title = b;
      await sleep(4500);
      for (let i = b.length - 1; i >= 1; i--) { document.title = b.slice(0, i) + '▎'; await sleep(90); }
      await sleep(400);
    }
  };

  /* --------------------------------------------------- tilt 3D + spotlight */
  UI.initTilt = function () {
    const card = $('#card');
    let tx = 0, ty = 0, cx = 0, cy = 0, hasPointer = false;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      hasPointer = true;
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', e.clientX - r.left + 'px');
      card.style.setProperty('--my', e.clientY - r.top + 'px');
    }, { passive: true });
    document.addEventListener('mouseleave', () => { tx = ty = 0; });
    Bio.frame((dt) => {
      const on = Bio.cfg.effects.tilt && hasPointer && !Bio.util.reduceMotion();
      const k = 1 - Math.pow(0.0005, dt);
      cx += ((on ? tx : 0) - cx) * k;
      cy += ((on ? ty : 0) - cy) * k;
      const bass = Bio.level.bass;
      card.style.transform = on || Math.abs(cx) + Math.abs(cy) > 0.0005 ? `rotateX(${(-cy * 9).toFixed(3)}deg) rotateY(${(cx * 11).toFixed(3)}deg)` : '';
      card.style.setProperty('--bass', bass.toFixed(3));
    });
  };

  /* ------------------------------------- curseur + magnétisme + clic + ripple */
  UI.initPointer = function () {
    const root = $('#cursor');
    const fine = Bio.util.finePointer();
    let x = -100, y = -100, rx = -100, ry = -100;
    const INTERACTIVE = 'a,button,input,select,textarea,label,[role=button],[role=slider],[data-mag]';
    if (fine) {
      addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; root.classList.add('on'); }, { passive: true });
      document.addEventListener('mouseleave', () => root.classList.remove('on'));
      document.addEventListener('pointerover', (e) => root.classList.toggle('hover', !!(e.target.closest && e.target.closest(INTERACTIVE))));
      addEventListener('pointerdown', () => root.classList.add('down'));
      addEventListener('pointerup', () => root.classList.remove('down'));
      Bio.frame((dt) => {
        rx += (x - rx) * (1 - Math.pow(0.0001, dt));
        ry += (y - ry) * (1 - Math.pow(0.0001, dt));
        root.style.setProperty('--x', x + 'px');
        root.style.setProperty('--y', y + 'px');
        root.style.setProperty('--rx', rx + 'px');
        root.style.setProperty('--ry', ry + 'px');
      });
    }
    // boutons magnétiques
    let mag = null;
    const release = () => { if (mag) { mag.style.transform = ''; mag = null; } };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || Bio.util.reduceMotion()) return;
      const el = e.target.closest && e.target.closest('[data-mag]');
      if (el !== mag) release();
      if (!el) return;
      mag = el;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate(${(dx * 9).toFixed(1)}px, ${(dy * 7).toFixed(1)}px)`;
    }, { passive: true });
    document.addEventListener('mouseleave', release);
    // explosion d'étincelles au clic sur un lien + onde (ripple)
    const ripples = $('#ripples');
    addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('.link,.social,.p-btn,.tool')) Bio.fx.burst(e.clientX, e.clientY, 14, { speed: 150 });
      if (Bio.cfg.effects.ripple && ripples && !Bio.util.reduceMotion() && !(e.target.closest && e.target.closest('.overlay'))) {
        const r = h('span', { class: 'ripple', style: { left: e.clientX + 'px', top: e.clientY + 'px' } });
        ripples.append(r);
        setTimeout(() => r.remove(), 900);
      }
    });
  };

  /* ------------------------------------------------------------- réglages */
  UI.onCfg = function (path) {
    if (path === 'displayName') UI.setName(Bio.cfg.displayName);
    else if (path === 'bio') UI.startTypewriter();
    else if (/^(card\.|effects\.|font|nameStyle|linkStyle|avatarShape|avatarRing)/.test(path)) UI.applyCard();
  };

  UI.init = function () {
    UI.build();
    UI.buildSplash();
    UI.initTilt();
    UI.initPointer();
    UI.initTitle();
    setInterval(UI.tickClock, 15000);
    Bio.on('presence', UI.renderPresence);
    Bio.on('cfg', UI.onCfg);
    // pas d'écran d'entrée : on affiche directement (sans musique automatique, le navigateur la bloquerait)
    if (!Bio.cfg.splash.enabled || Bio.preview) UI.enter(false);
    // glitch périodique du nom
    setInterval(() => {
      if (!Bio.cfg.effects.glitch || !UI.entered || Bio.util.reduceMotion()) return;
      const n = $('.name-text');
      if (!n) return;
      n.classList.add('glitching');
      setTimeout(() => n.classList.remove('glitching'), 520);
    }, 6500);
  };
})();
