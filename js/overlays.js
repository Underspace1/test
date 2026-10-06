/* ==========================================================================
   overlays.js — palette de commandes, terminal caché, studio (éditeur live)
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const { $, h, clamp, store, safeUrl, hslToHex, rgbToHue } = Bio.util;

  const O = (Bio.overlays = { current: null, reg: {} });

  O.register = function (name, def) { this.reg[name] = def; $('#overlays').append(def.el); };
  O.open = function (name) {
    const ov = this.reg[name];
    if (!ov || this.current === name) return;
    if (name === 'terminal' && !Bio.cfg.terminal) return;
    if (name === 'studio' && !Bio.cfg.studio) return;
    if (this.current) this.close();
    this.current = name;
    ov.prev = document.activeElement;
    ov.el.removeAttribute('inert');
    ov.el.dataset.open = 'true';
    document.documentElement.dataset.overlay = name;
    if (ov.onOpen) ov.onOpen();
    setTimeout(() => ov.focus && ov.focus(), 40);
  };
  O.close = function () {
    const ov = this.reg[this.current];
    if (!ov) return;
    ov.el.dataset.open = 'false';
    ov.el.setAttribute('inert', '');
    delete document.documentElement.dataset.overlay;
    if (ov.onClose) ov.onClose();
    this.current = null;
    if (ov.prev && ov.prev.focus && document.contains(ov.prev)) ov.prev.focus({ preventScroll: true });
  };
  O.toggle = function (name) { if (this.current === name) this.close(); else this.open(name); };

  /* =========================================================== PALETTE */
  Bio.actions = [];
  Bio.addAction = (a) => Bio.actions.push(a);

  function score(q, item) {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return 1;
    const title = item.title.toLowerCase();
    const all = title + ' ' + (item.keywords || '').toLowerCase() + ' ' + item.group.toLowerCase();
    let total = 0;
    for (const tk of tokens) {
      let s = -1;
      if (title.startsWith(tk)) s = 100;
      else if (title.includes(tk)) s = 70;
      else if (all.includes(tk)) s = 40;
      else {
        let i = 0;
        for (const ch of title) { if (ch === tk[i]) i++; if (i === tk.length) { s = 10; break; } }
      }
      if (s < 0) return -1;
      total += s;
    }
    return total;
  }

  function buildPalette() {
    const input = h('input', { class: 'pal-input', type: 'text', placeholder: 'Rechercher un lien, une action, un thème…', 'aria-label': 'Rechercher', autocomplete: 'off', spellcheck: 'false' });
    const list = h('ul', { class: 'pal-list', role: 'listbox' });
    let items = [], sel = 0;
    const $$ = Bio.util.$$;

    const run = (it) => {
      O.close();
      setTimeout(() => { try { it.run(); } catch (e) { console.error(e); } }, 30);
    };
    const render = () => {
      list.textContent = '';
      if (!items.length) { list.append(h('li', { class: 'pal-empty', text: 'Aucun résultat — essaie “thème”, “musique” ou “terminal”' })); return; }
      let lastGroup = null;
      items.forEach((it, i) => {
        if (!input.value && it.group !== lastGroup) { lastGroup = it.group; list.append(h('li', { class: 'pal-group', role: 'presentation', text: it.group })); }
        const li = h('li', { class: 'pal-item', role: 'option', 'aria-selected': i === sel ? 'true' : 'false', 'data-i': i },
          h('span', { class: 'pi-ico' }, Bio.icon(it.icon || 'sparkles', 17)),
          h('span', { class: 'pi-t', text: it.title }),
          input.value ? h('span', { class: 'pi-g', text: it.group }) : null);
        li.addEventListener('pointermove', () => { if (sel !== i) { sel = i; mark(); } });
        li.addEventListener('click', () => run(it));
        list.append(li);
      });
    };
    const mark = () => {
      $$('.pal-item', list).forEach((li) => li.setAttribute('aria-selected', Number(li.dataset.i) === sel ? 'true' : 'false'));
      const cur = list.querySelector('[aria-selected="true"]');
      if (cur) cur.scrollIntoView({ block: 'nearest' });
    };
    const filter = () => {
      const q = input.value.trim();
      items = Bio.actions
        .map((a, idx) => ({ a, s: score(q, a), idx }))
        .filter((x) => x.s >= 0)
        .sort((x, y) => (q ? y.s - x.s : x.idx - y.idx))
        .map((x) => x.a)
        .slice(0, 40);
      sel = 0;
      render();
    };
    input.addEventListener('input', filter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) run(items[sel]); }
    });

    const box = h('div', { class: 'pal-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Palette de commandes' },
      h('div', { class: 'pal-head' }, Bio.icon('search', 18), input, h('kbd', { text: 'esc' })),
      list,
      h('div', { class: 'pal-foot' }, h('span', {}, h('kbd', { text: '↑' }), h('kbd', { text: '↓' }), ' naviguer'), h('span', {}, h('kbd', { text: '↵' }), ' lancer'), h('span', { class: 'pal-tip', text: 'astuce : essaie le code Konami' })));
    const el = h('div', { class: 'overlay pal', 'data-open': 'false', inert: '' }, h('div', { class: 'ov-backdrop', onclick: () => O.close() }), box);
    O.register('palette', { el, focus: () => input.focus(), onOpen: () => { input.value = ''; filter(); } });
  }

  /* ========================================================== TERMINAL */
  function buildTerminal() {
    const cfg = () => Bio.cfg;
    const out = h('div', { class: 'term-out', 'aria-live': 'polite' });
    const prompt = h('span', { class: 'term-prompt', text: 'visiteur@nova:~$' });
    const input = h('input', { class: 'term-in', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Commande' });
    const hist = [];
    let hi = 0, booted = false;

    const print = (text, cls = '') => {
      const line = h('div', { class: 't-line ' + cls });
      if (Array.isArray(text)) line.append(...text); else line.textContent = text;
      out.append(line);
      out.scrollTop = out.scrollHeight;
      return line;
    };
    const link = (label, url) => h('a', { href: safeUrl(url), target: '_blank', rel: 'noopener noreferrer', text: label });
    const allLinks = () => [...cfg().links.map((l) => ({ name: l.label, url: l.url })), ...cfg().socials.filter((s) => s.url).map((s) => ({ name: s.label, url: s.url }))];
    const P = () => Bio.player;

    const cmds = {
      help: { d: 'liste des commandes', run() {
        print('commandes disponibles :', 'dim');
        Object.keys(cmds).filter((k) => !cmds[k].hidden).forEach((k) => print([h('span', { class: 't-cmd', text: k.padEnd(10) }), h('span', { class: 'dim', text: cmds[k].d })]));
      } },
      about: { d: 'qui suis-je ?', run() {
        print(cfg().displayName + '  (@' + cfg().username + ')', 'hi');
        [].concat(cfg().bio).forEach((b) => print('  › ' + b));
        if (cfg().location) print('  → ' + cfg().location, 'dim');
      } },
      whoami: { d: 'alias de about', hidden: true, run() { cmds.about.run(); } },
      links: { d: 'tous les liens', run() { allLinks().forEach((l) => print([h('span', { class: 't-cmd', text: l.name.padEnd(14) }), link(l.url, l.url)])); } },
      open: { d: 'open <nom> — ouvre un lien', run(a) {
        const q = a.join(' ').toLowerCase();
        if (!q) return print('usage : open <nom>   (voir « links »)', 'err');
        const l = allLinks().find((x) => x.name.toLowerCase().includes(q));
        if (!l) return print('lien introuvable : ' + q, 'err');
        print('ouverture de ' + l.name + '…', 'dim');
        window.open(safeUrl(l.url), '_blank', 'noopener');
      } },
      ls: { d: 'liste les fichiers', run() { print('about.txt   links.txt   musique/   .secret'); } },
      cat: { d: 'cat <fichier>', run(a) {
        const f = (a[0] || '').replace(/^\.\//, '');
        if (f === 'about.txt') cmds.about.run();
        else if (f === 'links.txt') cmds.links.run();
        else if (f === '.secret') { print('bravo, tu fouilles les dossiers cachés ✦', 'hi'); print('maintenant essaie : ↑ ↑ ↓ ↓ ← → ← → B A', 'dim'); }
        else if (!f) print('usage : cat <fichier>', 'err');
        else print('cat: ' + f + ': aucun fichier de ce type', 'err');
      } },
      theme: { d: 'theme [nom] — change les couleurs', run(a) {
        const names = Object.keys(Bio.themes);
        if (!a[0]) return print('thèmes : ' + names.join(', '));
        if (!Bio.themes[a[0]]) return print('thème inconnu. Choix : ' + names.join(', '), 'err');
        Bio.set('accent', '', true); Bio.set('accent2', '', true); Bio.set('theme', a[0], true);
        print('thème → ' + Bio.themes[a[0]].label, 'ok');
      } },
      fx: { d: 'fx <fireflies|snow|stars|none>', run(a) {
        const ok = ['fireflies', 'snow', 'stars', 'none'];
        if (!ok.includes(a[0])) return print('usage : fx <' + ok.join('|') + '>', 'err');
        Bio.set('effects.particles', a[0], true);
        print('particules → ' + a[0], 'ok');
      } },
      bg: { d: 'bg <shader|none>', run(a) {
        if (!['shader', 'none'].includes(a[0])) return print('usage : bg <shader|none>', 'err');
        Bio.set('background.type', a[0], true);
        print('fond → ' + a[0], 'ok');
      } },
      play: { d: 'lance la musique', run() { P().play(); print('▶ ' + P().track.title, 'ok'); } },
      pause: { d: 'met en pause', run() { P().pause(); print('❚❚ pause', 'ok'); } },
      next: { d: 'piste suivante', run() { P().next(); print('⏭  ' + P().track.title, 'ok'); } },
      prev: { d: 'piste précédente', run() { P().prev(); print('⏮  ' + P().track.title, 'ok'); } },
      track: { d: 'piste en cours', run() { print((P().playing ? '▶ ' : '❚❚ ') + P().track.title + ' — ' + P().track.artist); } },
      vol: { d: 'vol <0-100>', run(a) {
        const v = parseInt(a[0], 10);
        if (isNaN(v)) return print('volume : ' + Math.round(P().volume * 100) + '%');
        P().setVolume(clamp(v, 0, 100) / 100);
        print('volume → ' + clamp(v, 0, 100) + '%', 'ok');
      } },
      mute: { d: 'coupe / rétablit le son', run() { P().toggleMute(); print(P().muted ? 'son coupé' : 'son rétabli', 'ok'); } },
      time: { d: "l'heure chez moi", run() {
        const tz = cfg().timezone || undefined;
        let s; try { s = new Date().toLocaleString('fr-FR', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' }); } catch (e) { s = new Date().toLocaleString('fr-FR'); }
        print(s + (tz ? '  (' + tz + ')' : ''));
      } },
      neofetch: { d: 'infos système (plus ou moins)', run() {
        const art = ['      ✦      ', '    ✦ ✦ ✦    ', '  ✦  ╭───╮  ✦  ', '✦    │ N │    ✦', '  ✦  ╰───╯  ✦  ', '    ✦ ✦ ✦    ', '      ✦      '];
        const info = [
          cfg().username + '@biolink', '───────────────',
          'OS       : ' + (navigator.platform || 'web'),
          'Écran    : ' + innerWidth + '×' + innerHeight,
          'Thème    : ' + (Bio.themes[cfg().theme] ? Bio.themes[cfg().theme].label : 'perso'),
          'Fond     : ' + cfg().background.type + (Bio.bg.ok ? ' (WebGL ✓)' : ' (sans WebGL)'),
          'Audio    : ' + (P().playing ? P().track.title : 'à l’arrêt'),
          'Session  : ' + Math.round(performance.now() / 1000) + ' s',
        ];
        const n = Math.max(art.length, info.length);
        for (let i = 0; i < n; i++) print([h('span', { class: 't-art', text: (art[i] || '').padEnd(18) }), h('span', { text: info[i] || '' })]);
      } },
      matrix: { d: 'matrix [secondes]', run(a) { const s = clamp(parseInt(a[0], 10) || 8, 2, 30); print('suis le lapin blanc… (' + s + ' s)', 'ok'); O.close(); Bio.matrix.start(s * 1000); } },
      rave: { d: 'mode rave (réagit à la musique)', run() { O.close(); Bio.rave.toggle(); } },
      echo: { d: 'echo <texte>', run(a) { print(a.join(' ')); } },
      coffee: { d: '☕', hidden: true, run() { ['    ( (', '     ) )', '  ........', '  |      |]', '  \\      /', "   `----'"].forEach((l) => print(l, 'hi')); print('un café, et ça repart.', 'dim'); } },
      sudo: { d: '', hidden: true, run() { print('visiteur n’est pas dans le fichier sudoers. Cet incident sera signalé. ✦', 'err'); } },
      rm: { d: '', hidden: true, run() { print('bien tenté.', 'err'); } },
      clear: { d: 'efface l’écran', run() { out.textContent = ''; } },
      exit: { d: 'ferme le terminal', run() { O.close(); } },
    };

    const exec = (raw) => {
      const line = raw.trim();
      print([h('span', { class: 'term-prompt', text: prompt.textContent }), ' ' + line]);
      if (!line) return;
      hist.push(line); hi = hist.length;
      const [name, ...args] = line.split(/\s+/);
      const c = cmds[name.toLowerCase()];
      if (c) { try { c.run(args); } catch (e) { print('erreur : ' + e.message, 'err'); } }
      else print(name + ' : commande introuvable — tape « help »', 'err');
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { exec(input.value); input.value = ''; }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); input.value = hi < hist.length - 1 ? hist[++hi] : ((hi = hist.length), ''); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        const v = input.value.trim().toLowerCase();
        if (!v) return;
        const m = Object.keys(cmds).filter((k) => k.startsWith(v));
        if (m.length === 1) input.value = m[0] + ' ';
        else if (m.length > 1) print(m.join('   '), 'dim');
      }
    });

    const win = h('div', { class: 'term-win', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Terminal' },
      h('div', { class: 'term-bar' },
        h('span', { class: 'dots' }, h('i', { onclick: () => O.close() }), h('i'), h('i')),
        h('span', { class: 'term-title', text: 'visiteur — zsh' }), h('span')),
      out,
      h('label', { class: 'term-line' }, prompt, input));
    win.addEventListener('click', (e) => { if (!window.getSelection().toString() && !e.target.closest('a')) input.focus(); });
    const el = h('div', { class: 'overlay term', 'data-open': 'false', inert: '' }, h('div', { class: 'ov-backdrop', onclick: () => O.close() }), win);

    O.register('terminal', {
      el, focus: () => input.focus(),
      onOpen() {
        prompt.textContent = 'visiteur@' + cfg().username + ':~$';
        if (!booted) {
          booted = true;
          print('bienvenue dans le terminal de ' + cfg().displayName + ' ✦', 'hi');
          print('tape « help » pour voir ce que tu peux faire. (Tab complète)', 'dim');
        }
      },
    });
  }

  /* ============================================================ STUDIO */
  function buildStudio() {
    const syncs = [];
    const get = (p) => Bio.util.getPath(Bio.cfg, p);
    const set = (p, v) => Bio.set(p, v, true);

    const row = (label, ctrl, extra) => h('label', { class: 'st-row' }, h('span', { class: 'st-l', text: label }), ctrl, extra || null);
    const section = (title, ...kids) => h('section', { class: 'st-sec' }, h('h3', { text: title }), ...kids);

    const text = (path) => {
      const i = h('input', { type: 'text', class: 'st-text', value: get(path) });
      i.addEventListener('input', () => set(path, i.value));
      syncs.push(() => { if (document.activeElement !== i) i.value = get(path); });
      return i;
    };
    const area = (path) => {
      const a = h('textarea', { class: 'st-text', rows: 3, spellcheck: 'false' });
      const toStr = () => [].concat(get(path)).join('\n');
      a.value = toStr();
      a.addEventListener('input', () => set(path, a.value.split('\n').map((s) => s.trim()).filter(Boolean)));
      syncs.push(() => { if (document.activeElement !== a) a.value = toStr(); });
      return a;
    };
    const range = (path, min, max, step, unit = '') => {
      const i = h('input', { type: 'range', class: 'st-range', min, max, step, value: get(path) });
      const out = h('output', { class: 'st-out' });
      const paint = () => { out.textContent = (+get(path)).toString().slice(0, 4) + unit; i.style.setProperty('--val', ((get(path) - min) / (max - min) * 100) + '%'); };
      i.addEventListener('input', () => { set(path, parseFloat(i.value)); paint(); });
      syncs.push(() => { i.value = get(path); paint(); });
      paint();
      return h('span', { class: 'st-rwrap' }, i, out);
    };
    const toggle = (path) => {
      const b = h('button', { type: 'button', class: 'st-switch', role: 'switch' });
      const paint = () => b.setAttribute('aria-checked', get(path) ? 'true' : 'false');
      b.addEventListener('click', () => { set(path, !get(path)); paint(); });
      syncs.push(paint);
      paint();
      return b;
    };
    const seg = (path, options) => {
      const wrap = h('div', { class: 'st-seg', role: 'radiogroup' });
      const btns = options.map(([val, label]) => {
        const b = h('button', { type: 'button', role: 'radio', text: label });
        b.addEventListener('click', () => { set(path, val); paint(); });
        wrap.append(b);
        return [val, b];
      });
      const paint = () => btns.forEach(([v, b]) => b.setAttribute('aria-checked', get(path) === v ? 'true' : 'false'));
      syncs.push(paint);
      paint();
      return wrap;
    };
    const effColor = (k) => get(k) || Bio.themes[get('theme')][k === 'accent' ? 'a' : 'b'] || '#a78bfa';
    const color = (k) => {
      const i = h('input', { type: 'color', class: 'st-color', value: effColor(k) });
      i.addEventListener('input', () => set(k, i.value));
      syncs.push(() => { i.value = effColor(k); });
      return i;
    };

    const themeChips = h('div', { class: 'st-themes' }, Object.entries(Bio.themes).map(([key, t]) => {
      const b = h('button', { type: 'button', class: 'st-theme', 'data-tip': t.label, 'aria-label': 'Thème ' + t.label, style: { background: `linear-gradient(135deg, ${t.a}, ${t.b})` } });
      b.addEventListener('click', () => { set('accent', ''); set('accent2', ''); set('theme', key); syncs.forEach((f) => f()); });
      return b;
    }));
    const themeMark = () => {
      Array.from(themeChips.children).forEach((b, i) => b.setAttribute('aria-pressed', Object.keys(Bio.themes)[i] === get('theme') && !get('accent') ? 'true' : 'false'));
    };
    syncs.push(themeMark);

    const hueBtn = h('button', { type: 'button', class: 'st-btn', onclick: () => {
      const hue = Math.floor(Math.random() * 360);
      set('accent', hslToHex(hue, 85, 70)); set('accent2', hslToHex(hue + 45, 85, 62)); syncs.forEach((f) => f());
    } }, Bio.icon('wand', 15), 'Palette aléatoire');

    const body = h('div', { class: 'st-body' },
      section('Identité', row('Nom', text('displayName')), row('Bio', area('bio'))),
      section('Couleurs', themeChips, row('Accent', color('accent')), row('Accent 2', color('accent2')), hueBtn),
      section('Fond', seg('background.type', [['shader', 'Fluide'], ['video', 'Vidéo'], ['image', 'Image'], ['none', 'Aucun']]),
        row('Source (vidéo / image)', text('background.src')),
        row('Assombrir', range('background.dim', 0, 0.9, 0.01)), row('Flou', range('background.blur', 0, 24, 1, 'px'))),
      section('Particules', seg('effects.particles', [['fireflies', 'Lucioles'], ['snow', 'Neige'], ['stars', 'Étoiles'], ['none', 'Aucune']])),
      section('Carte', row('Opacité', range('card.opacity', 0.05, 1, 0.01)), row('Flou verre', range('card.blur', 0, 50, 1, 'px')), row('Arrondi', range('card.radius', 0, 48, 1, 'px'))),
      section('Effets', row('Inclinaison 3D', toggle('effects.tilt')), row('Curseur perso', toggle('effects.cursor')), row('Traînée', toggle('effects.trail')), row('Glitch du nom', toggle('effects.glitch'))));

    const foot = h('div', { class: 'st-foot' },
      h('button', { type: 'button', class: 'st-btn primary', onclick: async () => {
        const ok = await Bio.util.copy(Bio.exportConfig());
        Bio.util.toast(ok ? 'Config copiée — colle-la dans config.js' : 'Copie impossible', ok ? 'check' : 'close');
      } }, Bio.icon('copy', 15), 'Copier la config'),
      h('button', { type: 'button', class: 'st-btn', onclick: () => Bio.resetOverrides() }, Bio.icon('reset', 15), 'Réinitialiser'));

    const closeBtn = h('button', { type: 'button', class: 'tool', 'aria-label': 'Fermer', onclick: () => O.close() }, Bio.icon('close', 17));
    const panel = h('aside', { class: 'st-panel', role: 'dialog', 'aria-label': 'Studio de personnalisation' },
      h('header', { class: 'st-head' }, h('div', {}, h('h2', { text: 'Studio' }), h('p', { text: 'Modifie la page en direct' })), closeBtn),
      body, foot);
    const el = h('div', { class: 'overlay studio', 'data-open': 'false', inert: '' }, panel);
    O.register('studio', { el, focus: () => closeBtn.focus(), onOpen: () => syncs.forEach((f) => f()) });
  }

  O.init = function () {
    buildPalette();
    buildTerminal();
    buildStudio();
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && O.current) { e.preventDefault(); O.close(); }
    });
  };
})();
