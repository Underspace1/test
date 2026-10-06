/* ==========================================================================
   main.js — démarrage, réglages en direct, actions, raccourcis, Konami, mode rave
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const U = Bio.util;
  const { $, store, clamp, hslToHex } = U;

  /* Seuls ces réglages peuvent être modifiés depuis le Studio / le terminal et mémorisés */
  const EDITABLE = [
    'displayName', 'bio', 'theme', 'accent', 'accent2',
    'background.type', 'background.src', 'background.dim', 'background.blur',
    'card.opacity', 'card.blur', 'card.radius',
    'effects.particles', 'effects.tilt', 'effects.cursor', 'effects.trail', 'effects.glitch',
  ];

  Bio.set = function (path, val, persist) {
    if (!EDITABLE.includes(path)) return;
    U.setPath(Bio.cfg, path, val);
    if (persist) {
      Bio.overrides[path] = val;
      store.set('overrides', Bio.overrides);
    }
    if (path === 'theme' || path === 'accent' || path === 'accent2') { if (!Bio.rave.on) Bio.applyTheme(Bio.cfg); }
    Bio.emit('cfg', path);
  };

  Bio.exportConfig = function () {
    return '/* Config exportée depuis le Studio — remplace le contenu de config.js */\nwindow.BIO_CONFIG = ' + JSON.stringify(Bio.cfg, null, 2) + ';\n';
  };
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

    A({ group: 'Fond', title: 'Fond fluide (WebGL)', icon: 'image', keywords: 'shader background', run: () => Bio.set('background.type', 'shader', true) });
    A({ group: 'Fond', title: 'Fond sobre', icon: 'image', keywords: 'aucun none', run: () => Bio.set('background.type', 'none', true) });
    [['fireflies', 'Lucioles'], ['snow', 'Neige'], ['stars', 'Étoiles'], ['none', 'Sans particules']].forEach(([k, l]) =>
      A({ group: 'Fond', title: 'Particules : ' + l, icon: 'sparkles', keywords: 'effet', run: () => Bio.set('effects.particles', k, true) }));

    toggleCfg('effects.tilt', 'Inclinaison 3D');
    toggleCfg('effects.cursor', 'Curseur personnalisé');
    toggleCfg('effects.trail', 'Traînée du curseur');
    toggleCfg('effects.glitch', 'Glitch du nom');

    A({ group: 'Page', title: 'Copier le lien de la page', icon: 'share', keywords: 'partager url', run: async () => { const ok = await U.copy(location.href.split('#')[0]); U.toast(ok ? 'Lien copié' : 'Copie impossible', ok ? 'check' : 'close'); } });
    if (cfg.studio) A({ group: 'Page', title: 'Ouvrir le Studio', icon: 'sliders', keywords: 'éditeur personnaliser', run: () => Bio.overlays.open('studio') });
    if (cfg.terminal) A({ group: 'Page', title: 'Ouvrir le terminal', icon: 'terminal', keywords: 'console commande', run: () => Bio.overlays.open('terminal') });
    A({ group: 'Page', title: 'Plein écran', icon: 'globe', keywords: 'fullscreen', run: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } });
    A({ group: 'Page', title: 'Réinitialiser mes personnalisations', icon: 'reset', keywords: 'reset', run: () => Bio.resetOverrides() });

    A({ group: 'Secret', title: 'Mode rave', icon: 'zap', keywords: 'fête konami disco', run: () => rave.toggle() });
    A({ group: 'Secret', title: 'Pluie matrix', icon: 'code', keywords: 'neo', run: () => Bio.matrix.start(9000) });
  }

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

  /* ---------------------------------------------------------------- boot */
  function boot() {
    const overrides = store.get('overrides', {});
    const cfg = U.deepMerge(Bio.defaults, window.BIO_CONFIG || {});
    const clean = {};
    for (const path of Object.keys(overrides || {})) {
      if (EDITABLE.includes(path)) { clean[path] = overrides[path]; U.setPath(cfg, path, overrides[path]); }
    }
    Bio.cfg = cfg;
    Bio.overrides = clean;

    Bio.applyTheme(cfg);
    Bio.initBackground();
    Bio.player.init(cfg);
    Bio.ui.init();
    Bio.presence.init(cfg);
    Bio.overlays.init();
    registerActions();
    hotkeys();
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
