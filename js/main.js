/* ==========================================================================
   main.js — démarrage, réglages en direct, actions, raccourcis, Konami,
   mode rave, aperçu piloté par le dashboard
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const U = Bio.util;
  const { $, store, hslToHex } = U;

  /* Seuls ces réglages peuvent être modifiés depuis les réglages rapides / le terminal et mémorisés */
  const EDITABLE = [
    'displayName', 'bio', 'about', 'banner', 'theme', 'accent', 'accent2', 'font', 'nameStyle', 'linkStyle', 'avatarShape', 'avatarRing',
    'background.type', 'background.src', 'background.dim', 'background.blur', 'background.mono',
    'card.style', 'card.border', 'card.opacity', 'card.blur', 'card.radius',
    'decor.orbs', 'decor.noise', 'decor.vignette', 'decor.scanlines', 'decor.dots',
    'effects.particles', 'effects.tilt', 'effects.cursor', 'effects.trail', 'effects.glitch', 'effects.spotlight', 'effects.ripple',
    'effects.density', 'effects.tiltStrength', 'page.width', 'page.gap', 'page.valign', 'page.shadow',
  ];

  Bio.set = function (path, val, persist) {
    if (!EDITABLE.includes(path)) return;
    if (Bio.enums[path] && !Bio.enums[path].includes(val)) return;
    U.setPath(Bio.cfg, path, val);
    if (persist && !Bio.preview) {
      Bio.overrides[path] = val;
      store.set('overrides', Bio.overrides);
    }
    if (path === 'theme' || path === 'accent' || path === 'accent2') { if (!Bio.rave.on) Bio.applyTheme(Bio.cfg); }
    Bio.emit('cfg', path);
  };

  /* Remplace toute la configuration (utilisé par l'aperçu du dashboard) */
  Bio.applyConfig = function (raw) {
    const prev = Bio.cfg;
    const cfg = Bio.normalize(raw);
    Bio.cfg = cfg;
    if (!Bio.rave.on) Bio.applyTheme(cfg);
    Bio.ui.build();
    if (JSON.stringify(prev.views) !== JSON.stringify(cfg.views) || !Bio.ui.viewsShown) Bio.ui.initViews();
    else { const el = Bio.util.$('#chip-views .chip-t'); if (el) el.textContent = Bio.ui.viewsText || '0'; }
    if (JSON.stringify(prev.music.tracks) !== JSON.stringify(cfg.music.tracks)) {
      Bio.player.pause();
      Bio.player.init(cfg);
    }
    if (JSON.stringify(prev.discord) !== JSON.stringify(cfg.discord)) Bio.presence.init(cfg);
    if (JSON.stringify([prev.roblox, prev.osu]) !== JSON.stringify([cfg.roblox, cfg.osu])) Bio.integrations.init(cfg);
    Bio.ui.renderPresence(Bio.presence.data);
    document.title = cfg.pageTitle || '@' + cfg.username;
    Bio.emit('config');
  };

  Bio.exportConfig = function () { return Bio.serialize(Bio.cfg); };
  Bio.resetOverrides = function () {
    store.del('overrides');
    location.reload();
  };

  /* ------------------------------------------------------------ mode rave */
  const rave = (Bio.rave = { on: false, hue: 0, avg: 0, lastBeat: 0, lastApply: 0 });
  rave.start = function () {
    if (this.on) return;
    this.on = true;
    document.documentElement.classList.add('rave');
    if (!Bio.player.playing && Bio.ui.entered) Bio.player.play();
    U.toast('MODE RAVE — Échap pour quitter', 'zap');
  };
  rave.stop = function () {
    if (!this.on) return;
    this.on = false;
    document.documentElement.classList.remove('rave');
    Bio.applyTheme(Bio.cfg);
    U.toast('Retour au calme', 'moon');
  };
  rave.toggle = function () { this.on ? this.stop() : this.start(); };
  Bio.frame((dt, t) => {
    if (!rave.on) return;
    const bass = Bio.player.playing ? Bio.level.bass : Math.max(0, Math.sin(t * 13.6)) * 0.8;
    rave.hue = (rave.hue + dt * (35 + bass * 260)) % 360;
    if (t - rave.lastApply > 0.08) {
      rave.lastApply = t;
      Bio.applyColors(hslToHex(rave.hue, 92, 66), hslToHex(rave.hue + 70, 92, 58));
    }
    if (bass > rave.avg * 1.3 && bass > 0.45 && t - rave.lastBeat > 0.22) {
      rave.lastBeat = t;
      for (let i = 0; i < 2; i++) Bio.fx.burst(U.rand(0, innerWidth), U.rand(innerHeight * 0.3, innerHeight), 12, { color: 'rainbow', speed: 260, size: 1.4 });
    }
    rave.avg = rave.avg * 0.94 + bass * 0.06;
  });

  /* -------------------------------------------------------------- actions */
  function registerActions() {
    Bio.actions.length = 0;
    const cfg = Bio.cfg, A = Bio.addAction, P = Bio.player;
    const openUrl = (url) => window.open(U.safeUrl(url), '_blank', 'noopener');
    const toggleCfg = (path, label) => A({ group: 'Effets', title: label, icon: 'sparkles', keywords: 'activer désactiver basculer', run: () => { Bio.set(path, !U.getPath(Bio.cfg, path), true); U.toast(label + ' : ' + (U.getPath(Bio.cfg, path) ? 'activé' : 'désactivé'), 'check'); } });

    (cfg.links || []).forEach((l) => A({ group: 'Liens', title: l.label, icon: l.icon || 'link', keywords: (l.sub || '') + ' ' + (l.url || ''), run: () => openUrl(l.url) }));
    (cfg.socials || []).forEach((s) => A({
      group: 'Liens', title: s.copy ? 'Copier mon ' + s.label : s.label, icon: s.icon, keywords: s.icon + ' réseau social',
      run: s.copy ? async () => { const ok = await U.copy(s.copy); U.toast(ok ? s.label + ' copié : ' + s.copy : 'Copie impossible', ok ? 'check' : 'close'); } : () => openUrl(s.url),
    }));

    A({ group: 'Musique', title: 'Lecture / pause', icon: 'play', keywords: 'play pause musique', run: () => P.toggle() });
    A({ group: 'Musique', title: 'Piste suivante', icon: 'next', keywords: 'next skip', run: () => P.next() });
    A({ group: 'Musique', title: 'Piste précédente', icon: 'prev', keywords: 'previous', run: () => P.prev() });
    A({ group: 'Musique', title: 'Couper / rétablir le son', icon: 'mute', keywords: 'mute volume', run: () => P.toggleMute() });
    P.tracks.forEach((t, i) => A({ group: 'Musique', title: 'Écouter : ' + t.title, icon: 'headphones', keywords: t.artist, run: async () => { await P.select(i); if (!P.playing) P.play(); } }));

    Object.entries(Bio.themes).forEach(([key, t]) => A({ group: 'Thème', title: 'Thème ' + t.label, icon: 'palette', keywords: 'couleur ' + key, run: () => { Bio.set('accent', '', true); Bio.set('accent2', '', true); Bio.set('theme', key, true); } }));
    Bio.presets.forEach((p) => A({ group: 'Modèles', title: 'Modèle ' + p.label, icon: 'layers', keywords: p.desc, run: () => Bio.applyPreset(p.id) }));

    [['shader', 'Fond fluide (WebGL)'], ['aurora', 'Fond aurore'], ['grid', 'Fond grille rétro'], ['none', 'Fond sobre']].forEach(([k, l]) =>
      A({ group: 'Fond', title: l, icon: 'image', keywords: 'background', run: () => Bio.set('background.type', k, true) }));
    [['fireflies', 'Lucioles'], ['snow', 'Neige'], ['stars', 'Étoiles'], ['shooting', 'Étoiles filantes'], ['bokeh', 'Bokeh'], ['rain', 'Pluie'], ['none', 'Sans particules']].forEach(([k, l]) =>
      A({ group: 'Fond', title: 'Particules : ' + l, icon: 'sparkles', keywords: 'effet', run: () => Bio.set('effects.particles', k, true) }));

    toggleCfg('effects.tilt', 'Inclinaison 3D');
    toggleCfg('effects.cursor', 'Curseur personnalisé');
    toggleCfg('effects.trail', 'Traînée du curseur');
    toggleCfg('effects.glitch', 'Glitch du nom');
    toggleCfg('effects.spotlight', 'Halo du curseur');
    toggleCfg('decor.scanlines', 'Scanlines');
    toggleCfg('decor.dots', 'Trame de points');
    toggleCfg('background.mono', 'Fond noir & blanc');

    if (cfg.roblox.id || cfg.roblox.username) A({ group: 'Liens', title: 'Profil Roblox', icon: 'roblox', keywords: 'jeu', run: () => { const d = Bio.integrations.roblox || {}; openUrl(d.id ? 'https://www.roblox.com/users/' + d.id + '/profile' : 'https://www.roblox.com/search/users?keyword=' + encodeURIComponent(d.name || '')); } });
    if (cfg.osu.username || cfg.osu.id) A({ group: 'Liens', title: 'Profil osu!', icon: 'osu', keywords: 'rythme', run: () => { const d = Bio.integrations.osu || {}; openUrl('https://osu.ppy.sh/users/' + encodeURIComponent(d.id || d.name || '') + '/' + (d.mode || 'osu')); } });
    A({ group: 'Page', title: 'Copier le lien de la page', icon: 'share', keywords: 'partager url', run: async () => { const ok = await U.copy(location.href.split('#')[0].split('?')[0]); U.toast(ok ? 'Lien copié' : 'Copie impossible', ok ? 'check' : 'close'); } });
    if (!Bio.preview) A({ group: 'Page', title: 'Ouvrir le dashboard (éditeur complet)', icon: 'layers', keywords: 'config éditeur personnaliser', run: () => window.open('dashboard.html', '_blank', 'noopener') });
    if (cfg.studio) A({ group: 'Page', title: 'Réglages rapides', icon: 'sliders', keywords: 'studio éditeur', run: () => Bio.overlays.open('studio') });
    if (cfg.terminal) A({ group: 'Page', title: 'Ouvrir le terminal', icon: 'terminal', keywords: 'console commande', run: () => Bio.overlays.open('terminal') });
    A({ group: 'Page', title: 'Plein écran', icon: 'monitor', keywords: 'fullscreen', run: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } });
    A({ group: 'Page', title: 'Réinitialiser mes personnalisations', icon: 'reset', keywords: 'reset', run: () => Bio.resetOverrides() });

    A({ group: 'Secret', title: 'Mode rave', icon: 'zap', keywords: 'fête konami disco', run: () => rave.toggle() });
    A({ group: 'Secret', title: 'Pluie matrix', icon: 'code', keywords: 'neo', run: () => Bio.matrix.start(9000) });
  }

  Bio.applyPreset = function (id) {
    const p = Bio.presets.find((x) => x.id === id);
    if (!p) return;
    const flat = (obj, prefix = '') => Object.entries(obj).forEach(([k, v]) => {
      const path = prefix + k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, path + '.');
      else Bio.set(path, v, true);
    });
    flat(p.cfg);
    Bio.applyConfig(Bio.cfg);
    U.toast('Modèle « ' + p.label + ' » appliqué', 'layers');
  };

  /* ------------------------------------------------------------ raccourcis */
  function hotkeys() {
    const isTyping = (e) => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };
    addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); Bio.overlays.toggle('palette'); return; }
      if (e.key === 'Escape') {
        if (!Bio.overlays.current) { if (rave.on) rave.stop(); else if (Bio.matrix.on) Bio.matrix.stop(); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e) || !Bio.ui.entered) return;
      switch (e.key) {
        case '/': e.preventDefault(); Bio.overlays.open('palette'); break;
        case '`': case '²': e.preventDefault(); Bio.overlays.toggle('terminal'); break;
        case 'e': case 'E': Bio.overlays.toggle('studio'); break;
        case 'm': case 'M': Bio.player.toggleMute(); break;
        case ' ':
          if (!(e.target.closest && e.target.closest('button,a,[role=button],[role=slider]'))) { e.preventDefault(); Bio.player.toggle(); }
          break;
        default: break;
      }
    });

    // Konami : ↑ ↑ ↓ ↓ ← → ← → B A
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === code[pos]) {
        if (pos > 0 && k.startsWith('Arrow')) e.preventDefault();
        pos++;
        if (pos === code.length) { pos = 0; if (!Bio.ui.entered) Bio.ui.enter(true); rave.toggle(); }
      } else pos = k === code[0] ? 1 : 0;
    });
  }

  /* --------------------------------------------- aperçu piloté par le dashboard */
  function previewBridge() {
    if (!Bio.preview) return;
    document.documentElement.classList.add('preview');
    addEventListener('message', (e) => {
      if (e.source !== window.parent || window.parent === window) return;
      if (e.origin !== 'null' && e.origin !== location.origin) return;
      const m = e.data;
      if (!m || typeof m !== 'object') return;
      if (m.type === 'bio:config' && m.config && typeof m.config === 'object') Bio.applyConfig(m.config);
      else if (m.type === 'bio:play') Bio.player.toggle();
      else if (m.type === 'bio:preset' && typeof m.id === 'string') Bio.applyPreset(m.id);
    });
    try { window.parent.postMessage({ type: 'bio:ready' }, '*'); } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    const overrides = Bio.preview ? {} : store.get('overrides', {});
    const cfg = Bio.normalize(window.BIO_CONFIG || {});
    const clean = {};
    for (const path of Object.keys(overrides || {})) {
      if (EDITABLE.includes(path) && (!Bio.enums[path] || Bio.enums[path].includes(overrides[path]))) { clean[path] = overrides[path]; U.setPath(cfg, path, overrides[path]); }
    }
    Bio.cfg = cfg;
    Bio.overrides = clean;

    Bio.applyTheme(cfg);
    Bio.applyFont(cfg.font);
    Bio.initBackground();
    Bio.player.init(cfg);
    Bio.ui.init();
    Bio.presence.init(cfg);
    Bio.integrations.init(cfg);
    Bio.overlays.init();
    registerActions();
    Bio.on('config', registerActions);
    hotkeys();
    previewBridge();
    Bio.startLoop();
    document.documentElement.classList.add('ready');

    // clin d'œil pour les curieux
    try {
      console.log('%c✦ biolink', 'font:700 22px system-ui;color:' + Bio.themes.violet.a + ';text-shadow:0 0 12px ' + Bio.themes.violet.b);
      console.log('%cTape le code Konami, ou appuie sur « ` » pour ouvrir le terminal.', 'color:#999');
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
