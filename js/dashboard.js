/* ==========================================================================
   dashboard.js — éditeur visuel : formulaire piloté par un schéma, listes
   réordonnables, sélecteur d'icônes, modèles, import/export, aperçu en direct
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const U = Bio.util;
  const { $, $$, h, clamp, store, safeUrl, cssUrl, debounce } = U;

  /* --------------------------------------------------------------- état */
  const D = (window.Dash = { cfg: null, dirty: false, syncs: [], ready: false, device: 'phone' });
  const original = Bio.normalize(window.BIO_CONFIG || {}, { enforce: false });
  const draft = store.get('dash-draft', null);
  D.cfg = draft ? Bio.normalize(draft, { enforce: false }) : U.deepMerge({}, original);
  D.dirty = !!draft;

  const get = (p) => U.getPath(D.cfg, p);
  const saveDraft = debounce(() => store.set('dash-draft', D.cfg), 300);
  const pushPreview = debounce(() => {
    if (!D.ready) return;
    try { iframe.contentWindow.postMessage({ type: 'bio:config', config: D.cfg }, '*'); } catch (e) { /* ignore */ }
  }, 60);
  const syncAll = () => D.syncs.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  const status = $('#d-status');
  const setStatus = () => {
    status.dataset.state = D.dirty ? 'dirty' : 'ok';
    status.querySelector('.txt').textContent = D.dirty ? 'Brouillon non exporté' : 'Identique à config.js';
  };
  function set(path, val, opts = {}) {
    U.setPath(D.cfg, path, val);
    const g = Bio.gateFor(path);
    if (g && !Bio.allows(D.cfg.premium.plan, g.min) && g.test(val, D.cfg)) { setTimeout(enforce, 0); }
    D.dirty = true;
    setStatus();
    saveDraft();
    pushPreview();
    if (opts.sync) syncAll();
    else { if (D.heroSync) D.heroSync(); (D.marks || []).forEach((m) => m()); }
  }
  function replaceConfig(next) {
    D.cfg = Bio.normalize(next, { enforce: false });
    D.dirty = true;
    setStatus();
    saveDraft();
    pushPreview();
    syncAll();
  }

  /* ------------------------------------------------------------ aperçu */
  const iframe = $('#pv-iframe'), frame = $('#pv-frame'), box = $('#pv-box'), preview = $('#d-preview');
  addEventListener('message', (e) => {
    if (e.source !== iframe.contentWindow) return;
    if (e.data && e.data.type === 'bio:ready') { D.ready = true; pushPreview(); }
  });
  const DEV = { phone: [390, 800], desktop: [1280, 820] };
  function fitPreview() {
    const [W, H] = DEV[D.device];
    const bw = box.clientWidth - 36, bh = box.clientHeight - 36;
    const s = Math.min(1, bw / W, bh / H);
    iframe.style.width = W + 'px';
    iframe.style.height = H + 'px';
    iframe.style.transform = 'scale(' + s + ')';
    frame.style.width = Math.round(W * s) + 'px';
    frame.style.height = Math.round(H * s) + 'px';
    frame.classList.toggle('phone', D.device === 'phone');
  }
  new ResizeObserver(fitPreview).observe(box);
  $$('.pv-devices button').forEach((b) => {
    b.append(Bio.icon(b.dataset.device, 16));
    b.addEventListener('click', () => {
      D.device = b.dataset.device;
      $$('.pv-devices button').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
      fitPreview();
    });
  });
  $('#pv-play').append(Bio.icon('play', 15));
  $('#pv-play').addEventListener('click', () => { try { iframe.contentWindow.postMessage({ type: 'bio:play' }, '*'); } catch (e) { /* ignore */ } });
  $('#pv-reload').append(Bio.icon('reset', 15));
  $('#pv-reload').addEventListener('click', () => { D.ready = false; iframe.src = 'profile.html?preview=1&t=' + Date.now(); });
  $('#pv-close').append(Bio.icon('close', 16));
  $('#pv-close').addEventListener('click', () => preview.classList.remove('show'));
  $('#pv-fab').prepend(Bio.icon('eye', 16));
  $('#pv-fab').addEventListener('click', () => { preview.classList.add('show'); setTimeout(fitPreview, 50); });

  /* ------------------------------------------------------------ champs */
  const F = {};

  function field(label, ctl, opts = {}) {
    const gate = opts.path ? Bio.gateFor(opts.path) : null;
    const lockTag = gate ? h('a', { class: 'lock', href: '#s-abonnement', 'data-min': gate.min, title: 'Nécessite le plan ' + Bio.plans[gate.min].label }, Bio.icon('lock', 11), Bio.plans[gate.min].label) : null;
    const lab = h(opts.stack ? 'div' : 'label', { class: opts.stack ? 'f-label' : null }, h('span', { class: 'f-lt' }, label, lockTag), opts.hint ? h('small', { text: opts.hint }) : null);
    const el = h('div', { class: 'field' + (opts.stack ? ' stack' : ''), 'data-gate': gate ? opts.path : null }, lab, h('div', { class: 'f-ctl' + (opts.col ? ' col' : '') }, ctl));
    if (opts.path) {
      const dot = h('i', { class: 'f-mod', title: 'Modifié par rapport à config.js' });
      lab.firstChild.append(dot);
      const mark = () => { dot.hidden = JSON.stringify(U.getPath(D.cfg, opts.path)) === JSON.stringify(U.getPath(original, opts.path)); };
      (D.marks = D.marks || []).push(mark);
      D.syncs.push(mark);
    }
    if (gate) {
      const paint = () => {
        const locked = Bio.locked(D.cfg, opts.path);
        el.classList.toggle('gated', locked);
        el.classList.toggle('locked', locked && !opts.partial);
        el.classList.toggle('fallback', locked && gate.test(U.getPath(D.cfg, opts.path), D.cfg));
        lockTag.hidden = !locked;
      };
      D.syncs.push(paint);
      paint();
    }
    return el;
  }
  // le brouillon n'est jamais modifié : on signale seulement les replis que l'aperçu applique
  function enforce() {
    const fb = Bio.fallbacks(D.cfg);
    syncAll();
    if (fb.length) U.toast(fb.length + (fb.length > 1 ? ' réglages réservés — replis appliqués dans l’aperçu' : ' réglage réservé — repli appliqué dans l’aperçu'), 'lock');
  }

  F.text = (f) => {
    const i = h('input', { class: 'in' + (f.mono ? ' mono' : ''), type: f.inputType || 'text', placeholder: f.placeholder || '', value: get(f.path) == null ? '' : get(f.path), spellcheck: 'false', 'data-path': f.path, step: f.step });
    i.addEventListener('input', () => set(f.path, f.number ? (i.value === '' ? 0 : Number(i.value)) : i.value));
    D.syncs.push(() => { if (document.activeElement !== i) i.value = get(f.path) == null ? '' : get(f.path); });
    const wrap = f.prefix ? h('div', { class: 'in-wrap' }, h('span', { class: 'prefix', text: f.prefix }), i) : i;
    return field(f.label, wrap, f);
  };
  F.number = (f) => F.text(Object.assign({ inputType: 'number', number: true }, f));
  F.lines = (f) => {
    const a = h('textarea', { class: 'in' + (f.mono ? ' mono' : ''), rows: f.mono ? 8 : 4, spellcheck: 'false', placeholder: f.placeholder || '', 'data-path': f.path });
    const toStr = () => (f.asText ? String(get(f.path) || '') : [].concat(get(f.path) || []).join('\n'));
    a.value = toStr();
    a.addEventListener('input', () => set(f.path, f.asText ? a.value : a.value.split('\n').map((s) => s.trim()).filter(Boolean)));
    D.syncs.push(() => { if (document.activeElement !== a) a.value = toStr(); });
    return field(f.label, a, Object.assign({ stack: true }, f));
  };
  F.toggle = (f) => {
    const b = h('button', { type: 'button', class: 'sw', role: 'switch', 'aria-label': f.label, 'data-path': f.path });
    const paint = () => b.setAttribute('aria-checked', get(f.path) ? 'true' : 'false');
    b.addEventListener('click', () => { set(f.path, !get(f.path)); paint(); });
    D.syncs.push(paint);
    paint();
    return field(f.label, b, f);
  };
  F.range = (f) => {
    const i = h('input', { type: 'range', min: f.min, max: f.max, step: f.step, value: get(f.path) });
    const out = h('output');
    const paint = () => {
      const v = +get(f.path);
      i.value = v;
      out.textContent = (f.format ? f.format(v) : v) + (f.unit || '');
      i.style.setProperty('--val', ((v - f.min) / (f.max - f.min) * 100) + '%');
    };
    i.addEventListener('input', () => { set(f.path, parseFloat(i.value)); paint(); });
    D.syncs.push(paint);
    paint();
    return field(f.label, h('div', { class: 'rg' }, i, out), f);
  };
  F.seg = (f) => {
    const wrap = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': f.label });
    const btns = f.options.map(([val, label]) => {
      const b = h('button', { type: 'button', role: 'radio', text: label });
      b.addEventListener('click', () => { set(f.path, val, { sync: !!f.sync }); paint(); });
      wrap.append(b);
      return [val, b];
    });
    const paint = () => btns.forEach(([v, b]) => { b.setAttribute('aria-checked', get(f.path) === v ? 'true' : 'false'); const lk = Bio.lockedOption(D.cfg, f.path, v); b.classList.toggle('opt-locked', lk); b.disabled = lk && get(f.path) !== v; b.title = lk ? 'Plan ' + Bio.plans[Bio.gateFor(f.path).min].label : ''; });
    D.syncs.push(paint);
    paint();
    return field(f.label, wrap, Object.assign({ partial: true }, f));
  };
  // cartes de choix avec aperçu (polices, styles…)
  F.choice = (f) => {
    const wrap = h('div', { class: 'choices', role: 'radiogroup', 'aria-label': f.label });
    const btns = f.options.map((o) => {
      const b = h('button', { type: 'button', role: 'radio', class: 'choice' },
        o.preview ? o.preview() : o.icon ? Bio.icon(o.icon, 20) : null,
        h('span', { text: o.label }), o.desc ? h('span', { class: 'choice-desc', text: o.desc }) : null,
        h('span', { class: 'opt-lock', hidden: true }, Bio.icon('lock', 11)));
      b.addEventListener('click', () => { set(f.path, o.value, { sync: !!f.sync }); paint(); });
      wrap.append(b);
      return [o.value, b];
    });
    const paint = () => btns.forEach(([v, b]) => { b.setAttribute('aria-checked', get(f.path) === v ? 'true' : 'false'); const lk = Bio.lockedOption(D.cfg, f.path, v); b.classList.toggle('opt-locked', lk); b.querySelector('.opt-lock').hidden = !lk; b.disabled = lk && get(f.path) !== v; b.title = lk ? 'Plan ' + Bio.plans[Bio.gateFor(f.path).min].label : ''; });
    D.syncs.push(paint);
    paint();
    return field(f.label, wrap, Object.assign({ stack: true, partial: true }, f));
  };
  F.color = (f) => {
    const eff = () => { const c = Bio.themeColors(D.cfg); return f.path === 'accent' ? c.a : c.b; };
    const i = h('input', { type: 'color', class: 'color-in', value: eff(), 'aria-label': f.label });
    const hex = h('input', { class: 'in mono', value: eff(), maxlength: 7, style: { width: '110px' } });
    const reset = h('button', { type: 'button', class: 'btn sm ghost', text: 'Thème' , title: 'Revenir à la couleur du thème' });
    i.addEventListener('input', () => { set(f.path, i.value); hex.value = i.value; });
    hex.addEventListener('input', () => { if (U.isHex(hex.value)) { set(f.path, hex.value); i.value = hex.value; } });
    reset.addEventListener('click', () => { set(f.path, '', { sync: true }); });
    D.syncs.push(() => { i.value = eff(); if (document.activeElement !== hex) hex.value = eff(); reset.hidden = !get(f.path); });
    reset.hidden = !get(f.path);
    return field(f.label, h('div', { class: 'colors' }, i, hex, reset), f);
  };
  F.themes = () => {
    const wrap = h('div', { class: 'themes' });
    const btns = Object.entries(Bio.themes).map(([key, t]) => {
      const b = h('button', { type: 'button', class: 'theme-sw', title: t.label, 'aria-label': 'Thème ' + t.label, style: { background: `linear-gradient(135deg, ${t.a}, ${t.b})` } });
      b.addEventListener('click', () => { U.setPath(D.cfg, 'accent', ''); U.setPath(D.cfg, 'accent2', ''); set('theme', key, { sync: true }); });
      wrap.append(b);
      return [key, b];
    });
    const paint = () => btns.forEach(([k, b]) => b.setAttribute('aria-pressed', get('theme') === k && !get('accent') && !get('accent2') ? 'true' : 'false'));
    D.syncs.push(paint);
    paint();
    const random = h('button', { type: 'button', class: 'btn sm' }, Bio.icon('wand', 14), 'Palette aléatoire');
    random.addEventListener('click', () => {
      const hue = Math.floor(Math.random() * 360);
      U.setPath(D.cfg, 'accent', U.hslToHex(hue, 85, 70));
      set('accent2', U.hslToHex(hue + 45, 85, 62), { sync: true });
    });
    return field('Thème', h('div', { class: 'f-ctl col', style: { gap: '12px', alignItems: 'flex-start' } }, wrap, random), { hint: 'Palette de couleurs de base', stack: false });
  };
  F.presets = () => {
    const wrap = h('div', { class: 'presets' }, Bio.presets.map((p) => {
      const b = h('button', { type: 'button', class: 'preset' },
        h('span', { class: 'pr-sw', style: { background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})` } }),
        h('b', { text: p.label }), h('small', { text: p.desc }));
      b.addEventListener('click', () => { replaceConfig(U.deepMerge(D.cfg, p.cfg)); U.toast('Modèle « ' + p.label + ' » appliqué', 'layers'); });
      return b;
    }));
    return field('Modèles', wrap, { hint: 'Un point de départ complet : couleurs, fond, carte, effets. Tes textes et liens sont conservés.', stack: true });
  };
  F.image = (f) => {
    const prev = h('div', { class: 'img-prev' + (f.wide ? ' wide' : '') });
    const path = h('input', { class: 'in mono', placeholder: f.placeholder || 'assets/image.png ou https://…', spellcheck: 'false' });
    const file = h('input', { type: 'file', accept: 'image/*' });
    const paint = () => {
      const v = get(f.path) || '';
      if (document.activeElement !== path) path.value = v.startsWith('data:') ? '(image importée)' : v;
      prev.textContent = '';
      prev.classList.toggle('grad', v === 'gradient');
      prev.style.backgroundImage = v && v !== 'gradient' ? cssUrl(v) : '';
      if (!v) prev.append(Bio.icon('image', 20));
    };
    path.addEventListener('input', () => { if (!path.value.startsWith('(')) set(f.path, path.value.trim()); paint(); });
    file.addEventListener('change', async () => {
      const fl = file.files[0];
      if (!fl) return;
      try {
        const url = await imageToDataUrl(fl, f.max || 512, f.wide ? 0.86 : 0.9);
        set(f.path, url);
        paint();
        U.toast('Image importée (' + Math.round(url.length / 1024) + ' Ko, intégrée dans config.js)', 'check');
      } catch (e) { U.toast('Image illisible', 'close'); }
    });
    const row = h('div', { class: 'row' },
      h('label', { class: 'btn sm file-btn' }, file, Bio.icon('upload', 14), h('span', { text: 'Importer' })),
      f.gradient ? h('button', { type: 'button', class: 'btn sm', onclick: () => { set(f.path, 'gradient'); paint(); } }, Bio.icon('palette', 14), 'Dégradé') : null,
      h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { set(f.path, f.empty || ''); paint(); } }, Bio.icon('trash', 14), 'Retirer'));
    D.syncs.push(paint);
    paint();
    return field(f.label, h('div', { class: 'img-field' }, prev, h('div', { class: 'img-ctl' }, path, row)), Object.assign({ stack: true }, f));
  };
  F.note = (f) => h('div', { class: 'note' }, Bio.icon('info', 16), h('div', {}, f.content()));

  F.testlinks = () => {
    const mk = (id) => { const b = h('button', { type: 'button', class: 'btn sm' }, Bio.icon('external', 13), 'Tester le lien ' + Bio.plans[id].label); b.addEventListener('click', () => { const u = get('premium.checkout.' + id); if (!/^https:\/\//.test(u || '')) { U.toast('Renseigne d’abord un lien https', 'close'); return; } window.open(u, '_blank', 'noopener'); }); return b; };
    return h('div', { class: 'f-ctl', style: { gap: '8px', padding: '6px 0' } }, mk('premium'), mk('vip'));
  };

  F.planpicker = () => {
    const site = window.BIO_SITE || {};
    const tiers = (site.pricing && site.pricing.tiers) || [];
    const wrap = h('div', { class: 'plans' });
    const gatesList = h('ul', { class: 'gates' });
    const paint = () => {
      wrap.textContent = '';
      Object.entries(Bio.plans).forEach(([id, p]) => {
        const t = tiers.find((x) => x.id === id) || {};
        const b = h('button', { type: 'button', class: 'plan' + (get('premium.plan') === id ? ' on' : ''), role: 'radio', 'aria-checked': get('premium.plan') === id ? 'true' : 'false' },
          h('span', { class: 'plan-h' }, h('b', { text: p.label }), p.icon ? Bio.icon(p.icon, 15) : null),
          h('span', { class: 'plan-p', text: t.priceMonth ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(t.priceMonth) + ' / mois' : 'Gratuit' }),
          h('span', { class: 'plan-t', text: t.tagline || '' }));
        b.addEventListener('click', () => { set('premium.plan', id, { sync: true }); setTimeout(enforce, 0); });
        wrap.append(b);
      });
      gatesList.textContent = '';
      const fb = Bio.fallbacks(D.cfg);
      Bio.gates.forEach((g) => {
        const ok = Bio.allows(get('premium.plan'), g.min), active = fb.includes(g.path);
        gatesList.append(h('li', { class: ok ? 'ok' : active ? 'no active' : 'no' }, Bio.icon(ok ? 'check' : 'lock', 13), h('span', { text: g.label }), active ? h('em', { text: 'repli actif' }) : null, h('small', { text: Bio.plans[g.min].label })));
      });
    };
    D.syncs.push(paint);
    paint();
    return field('Plan actif', h('div', { class: 'f-ctl col', style: { alignItems: 'stretch', gap: '14px' } }, wrap,
      h('p', { class: 'gates-note', text: 'Plan déclaratif : biolink ne vérifie aucun paiement, config.js fait foi. Les réglages réservés restent dans ton brouillon et se réactivent dès que tu passes au plan supérieur.' }),
      h('div', { class: 'gates-wrap' }, h('p', { class: 'gates-k', text: 'Fonctions selon le plan' }), gatesList)), { stack: true, hint: 'Déclare ici le plan que tu as choisi : les fonctions réservées se débloquent dans le dashboard et sur ta page.' });
  };

  // disposition : widgets actifs (dans l'ordre) puis inactifs ; monter / descendre / activer
  F.layout = (f) => {
    const list = h('div', { class: 'layout-list' });
    const ids = Object.keys(Bio.widgets);
    const render = () => {
      list.textContent = '';
      const on = get('layout');
      const all = on.concat(ids.filter((id) => !on.includes(id)));
      all.forEach((id) => {
        const w = Bio.widgets[id];
        const active = on.includes(id);
        const idx = on.indexOf(id);
        const lk = Bio.lockedOption(D.cfg, 'layout', [id]);
        const sw = h('button', { type: 'button', class: 'sw', role: 'switch', 'aria-checked': active ? 'true' : 'false', 'aria-label': 'Afficher ' + w.label, disabled: lk && !active });
        sw.addEventListener('click', () => { set('layout', active ? on.filter((x) => x !== id) : on.concat(id)); render(); });
        const mk = (icon, label, fn, disabled) => h('button', { type: 'button', title: label, 'aria-label': label, disabled, onclick: fn }, Bio.icon(icon, 15));
        const row = h('div', { class: 'layout-item' + (active ? '' : ' off') + (lk ? ' lk' : '') },
          h('span', { class: 'ibtn' }, Bio.icon(w.icon, 17)),
          h('span', { class: 'title' }, w.label, lk ? h('span', { class: 'lock', 'data-min': 'premium' }, Bio.icon('lock', 11), active ? 'Premium · non publié' : 'Premium') : null, h('small', { text: w.desc })),
          h('span', { class: 'acts' },
            mk('up', 'Monter', () => { const a = on.slice(); a.splice(idx - 1, 0, a.splice(idx, 1)[0]); set('layout', a); render(); }, !active || idx === 0),
            mk('down', 'Descendre', () => { const a = on.slice(); a.splice(idx + 1, 0, a.splice(idx, 1)[0]); set('layout', a); render(); }, !active || idx === on.length - 1)),
          sw);
        list.append(row);
      });
    };
    D.syncs.push(render);
    render();
    return field(f.label, list, Object.assign({ stack: true, partial: true }, f));
  };

  /* redimensionne une image importée (les GIF/SVG sont gardés tels quels pour préserver l'animation) */
  function imageToDataUrl(fl, max, quality) {
    return new Promise((resolve, reject) => {
      if (/gif|svg/.test(fl.type) && fl.size < 2.5e6) {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(fl);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(fl);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const hasAlpha = /png|webp/.test(fl.type);
        resolve(hasAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  /* ------------------------------------------------------ sélecteur d'icônes */
  let picker = null;
  function closePicker() { if (picker) { picker.remove(); picker = null; } }
  document.addEventListener('pointerdown', (e) => { if (picker && !picker.contains(e.target) && !e.target.closest('.ibtn')) closePicker(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePicker(); closeImport(); } });
  function openPicker(anchor, kind, current, onPick) {
    closePicker();
    const names = kind === 'brand' ? Object.keys(window.BioIcons || {}) : Bio.uiIcons.filter((n) => !/^(play|pause|prev|next|volume|mute|search|terminal|sliders|copy|arrow|close|check|grip|up|down|phone|monitor|upload|download|duplicate|reset|external|info|hash|eye|pin|clock)$/.test(n));
    const input = h('input', { type: 'text', placeholder: 'Rechercher…', 'aria-label': 'Rechercher une icône' });
    const grid = h('div', { class: 'ip-grid' });
    const render = () => {
      const q = input.value.trim().toLowerCase();
      grid.textContent = '';
      const list = names.filter((n) => n.includes(q));
      if (!list.length) { grid.append(h('div', { class: 'ip-empty', text: 'Aucune icône' })); return; }
      list.forEach((n) => {
        const b = h('button', { type: 'button', title: n, 'aria-label': n, 'aria-pressed': n === current ? 'true' : 'false' }, Bio.icon(n, 18));
        b.addEventListener('click', () => { onPick(n); closePicker(); });
        grid.append(b);
      });
    };
    input.addEventListener('input', render);
    picker = h('div', { class: 'ipick', role: 'dialog', 'aria-label': 'Choisir une icône' }, h('div', { class: 'ip-head' }, Bio.icon('search', 15), input), grid);
    document.body.append(picker);
    render();
    const r = anchor.getBoundingClientRect();
    const pw = 320, ph = Math.min(360, picker.offsetHeight || 360);
    let left = clamp(r.left, 8, innerWidth - pw - 8);
    let top = r.bottom + 8;
    if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
    setTimeout(() => input.focus(), 30);
  }

  /* ------------------------------------------------------------- listes */
  F.list = (f) => {
    const list = h('div', { class: 'list' });
    const add = h('button', { type: 'button', class: 'btn sm list-add' }, Bio.icon('plus', 14), f.addLabel || 'Ajouter');
    const items = () => get(f.path);
    const commit = () => { set(f.path, items()); };
    let dragIdx = -1;

    const render = () => {
      list.textContent = '';
      const arr = items();
      if (!arr.length) { list.append(h('div', { class: 'list-empty', text: f.empty || 'Rien pour l’instant.' })); return; }
      const gate = Bio.gateFor(f.path);
      const limit = gate && gate.limit && Bio.locked(D.cfg, f.path) ? gate.limit : Infinity;
      add.disabled = arr.length >= limit;
      add.title = add.disabled ? 'Plus de ' + limit + ' liens : plan ' + Bio.plans[gate.min].label : '';
      arr.forEach((item, idx) => {
        const title = h('span', { class: 'title' });
        const paintTitle = () => {
          title.textContent = '';
          title.append(f.title(item) || '(sans titre)');
          const sub = f.subtitle && f.subtitle(item);
          if (sub) title.append(h('small', { text: sub }));
        };
        paintTitle();
        const ibtn = h('button', { type: 'button', class: 'ibtn', title: 'Changer l’icône', 'aria-label': 'Icône' }, Bio.icon(item.icon || 'link', 18));
        ibtn.addEventListener('click', () => openPicker(ibtn, f.iconKind, item.icon, (n) => { item.icon = n; ibtn.textContent = ''; ibtn.append(Bio.icon(n, 18)); commit(); }));
        const mk = (icon, label, cls, fn, disabled) => { const b = h('button', { type: 'button', class: cls || '', title: label, 'aria-label': label, disabled, onclick: fn }, Bio.icon(icon, 15)); return b; };
        const acts = h('div', { class: 'acts' },
          mk('up', 'Monter', '', () => { arr.splice(idx - 1, 0, arr.splice(idx, 1)[0]); commit(); render(); }, idx === 0),
          mk('down', 'Descendre', '', () => { arr.splice(idx + 1, 0, arr.splice(idx, 1)[0]); commit(); render(); }, idx === arr.length - 1),
          mk('duplicate', 'Dupliquer', '', () => { arr.splice(idx + 1, 0, U.deepMerge({}, item)); commit(); render(); }),
          mk('trash', 'Supprimer', 'del', () => { arr.splice(idx, 1); commit(); render(); }));
        const body = h('div', { class: 'item-body' }, f.fields.map((sf) => {
          if (sf.type === 'toggle') {
            const sw = h('button', { type: 'button', class: 'sw', role: 'switch', 'aria-checked': item[sf.key] ? 'true' : 'false', 'aria-label': sf.label });
            sw.addEventListener('click', () => { item[sf.key] = !item[sf.key]; sw.setAttribute('aria-checked', item[sf.key] ? 'true' : 'false'); commit(); });
            return h('label', { class: sf.full ? 'full' : null }, sf.label, h('span', { class: 'mini-sw' }, sw, h('span', { text: sf.hint || '' })));
          }
          const i = h('input', { class: 'in' + (sf.mono ? ' mono' : ''), placeholder: sf.placeholder || '', value: item[sf.key] == null ? '' : item[sf.key], spellcheck: 'false' });
          i.addEventListener('input', () => { item[sf.key] = i.value; paintTitle(); commit(); });
          return h('label', { class: sf.full ? 'full' : null }, sf.label, i);
        }));
        const grip = h('span', { class: 'grip', title: 'Glisser pour réordonner' }, Bio.icon('grip', 16));
        const el = h('div', { class: 'item' + (idx >= limit ? ' unpublished' : ''), draggable: 'true' }, h('div', { class: 'item-head' }, grip, ibtn, title, idx >= limit ? h('span', { class: 'lock', 'data-min': gate.min, title: 'Non publié : plan ' + Bio.plans[gate.min].label }, Bio.icon('lock', 11), 'non publié') : null, acts), body);
        el.addEventListener('dragstart', (e) => { dragIdx = idx; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(idx)); } catch (err) { /* ignore */ } });
        el.addEventListener('dragend', () => { el.classList.remove('dragging'); $$('.item.over', list).forEach((x) => x.classList.remove('over')); });
        el.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('over'); });
        el.addEventListener('dragleave', () => el.classList.remove('over'));
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          el.classList.remove('over');
          if (dragIdx < 0 || dragIdx === idx) return;
          const moved = arr.splice(dragIdx, 1)[0];
          arr.splice(idx, 0, moved);
          dragIdx = -1;
          commit();
          render();
        });
        // empêche le drag quand on tape dans un champ
        body.addEventListener('mousedown', () => el.setAttribute('draggable', 'false'));
        body.addEventListener('mouseup', () => el.setAttribute('draggable', 'true'));
        list.append(el);
      });
    };
    add.addEventListener('click', () => { items().push(f.make()); commit(); render(); list.lastChild.querySelector('input') && list.lastChild.querySelector('input').focus(); });
    D.syncs.push(render);
    render();
    return field(f.label, h('div', { class: 'f-ctl col', style: { gap: '12px', alignItems: 'stretch' } }, list, add), Object.assign({ stack: true, partial: !!(Bio.gateFor(f.path) && Bio.gateFor(f.path).limit) }, f));
  };

  /* --------------------------------------------------------------- schéma */
  const sw = (a, b) => () => h('span', { class: 'sw-prev', style: { background: `linear-gradient(135deg, ${a}, ${b})` } });
  const fontPrev = (key) => () => h('span', { class: 'font-prev', text: 'Aa', style: { fontFamily: Bio.fonts[key].display } });
  const SECTIONS = [
    { id: 'profil', icon: 'user', title: 'Profil', desc: 'Identité, avatar, textes', groups: [
      { title: 'Images', fields: [
        { type: 'image', path: 'avatar', label: 'Avatar', hint: 'Carré de préférence. Importé → redimensionné à 512 px et intégré dans config.js (ou mets un chemin vers assets/).', empty: 'assets/avatar.svg' },
        { type: 'image', path: 'banner', label: 'Bannière', hint: 'Image large en haut de la carte, ou un dégradé animé aux couleurs du thème.', wide: true, gradient: true, max: 1200 },
      ] },
      { title: 'Identité', fields: [
        { type: 'text', path: 'displayName', label: 'Nom affiché' },
        { type: 'text', path: 'username', label: 'Nom d’utilisateur', prefix: '@' },
        { type: 'toggle', path: 'verified', label: 'Badge vérifié', hint: 'Étincelle à côté du nom' },
        { type: 'lines', path: 'bio', label: 'Accroche', hint: 'Une phrase par ligne, sous le nom : elles s’écrivent et s’effacent en boucle.' },
        { type: 'lines', path: 'about', label: 'À propos', hint: 'Texte libre du widget « À propos » (vide = widget masqué).', asText: true },
        { type: 'text', path: 'pronouns', label: 'Pronoms', placeholder: 'elle / she', hint: 'Affichés dans la ligne d’infos, optionnel' },
        { type: 'text', path: 'location', label: 'Localisation', placeholder: 'Paris, France' },
        { type: 'text', path: 'timezone', label: 'Fuseau horaire', placeholder: 'Europe/Paris', hint: 'Affiche ton heure locale en direct (laisse vide pour masquer)', mono: true },
        { type: 'number', path: 'uid', label: 'UID', hint: 'Ton numéro de membre' },
        { type: 'text', path: 'joined', label: 'Membre depuis', placeholder: '2026-01-01', mono: true },
        { type: 'text', path: 'pageTitle', label: 'Titre de l’onglet', placeholder: '@pseudo' },
      ] },
      { title: 'Écran d’entrée', fields: [
        { type: 'toggle', path: 'splash.enabled', label: 'Activer', hint: 'Le clic permet aussi de lancer la musique automatiquement' },
        { type: 'text', path: 'splash.text', label: 'Texte' },
      ] },
      { title: 'SEO & partage', fields: [
        { type: 'text', path: 'seo.title', label: 'Titre de partage', placeholder: 'Nova — tous mes liens', hint: 'og:title (par défaut : titre de l’onglet)' },
        { type: 'lines', path: 'seo.description', label: 'Description', hint: 'Affichée sous le lien quand ta page est partagée (Discord, X, iMessage…).', asText: true },
        { type: 'image', path: 'seo.image', label: 'Image de partage', hint: 'og:image — une URL https (1200 × 630 recommandé). Les images importées ne sont pas prises en charge ici.', wide: true, max: 1200 },
        { type: 'toggle', path: 'seo.noindex', label: 'Masquer des moteurs de recherche', hint: 'Ajoute robots: noindex' },
      ] },
    ] },
    { id: 'disposition', icon: 'layers', title: 'Disposition', desc: 'Les widgets de ta page et leur ordre', groups: [
      { fields: [
        { type: 'layout', path: 'layout', label: 'Widgets', hint: 'Active, désactive et ordonne les blocs. Le widget « À propos » n’apparaît que s’il a un texte ; « Discord » seulement avec une présence (ou la démo).' },
        { type: 'range', path: 'socialsLimit', label: 'Réseaux visibles', min: 0, max: 12, step: 1, format: (v) => (v === 0 ? 'tous' : v), hint: 'Au-delà, un bouton « + » déplie les autres' },
      ] },
    ] },
    { id: 'apparence', icon: 'palette', title: 'Apparence', desc: 'Modèles, couleurs, police, styles', groups: [
      { title: 'Modèles', fields: [{ type: 'presets' }] },
      { title: 'Couleurs', fields: [
        { type: 'themes' },
        { type: 'color', path: 'accent', label: 'Accent' },
        { type: 'color', path: 'accent2', label: 'Accent 2' },
      ] },
      { title: 'Typographie', fields: [
        { type: 'choice', path: 'font', label: 'Police', options: Object.entries(Bio.fonts).map(([k, f]) => ({ value: k, label: f.label, preview: fontPrev(k) })) },
        { type: 'choice', path: 'nameStyle', label: 'Style du nom', options: [
          { value: 'neon', label: 'Halo', icon: 'zap' }, { value: 'shimmer', label: 'Dégradé animé', icon: 'sparkles' }, { value: 'rainbow', label: 'Arc-en-ciel', icon: 'palette' }, { value: 'plain', label: 'Simple', icon: 'type' }] },
      ] },
      { title: 'Avatar', fields: [
        { type: 'seg', path: 'avatarShape', label: 'Forme', options: [['circle', 'Rond'], ['rounded', 'Arrondi'], ['hexagon', 'Hexagone']] },
        { type: 'seg', path: 'avatarRing', label: 'Anneau', options: [['gradient', 'Dégradé tournant'], ['pulse', 'Pulsation'], ['none', 'Aucun']] },
      ] },
      { title: 'Carte', fields: [
        { type: 'choice', path: 'card.style', label: 'Style de carte', options: [
          { value: 'glass', label: 'Verre dépoli', desc: 'glassmorphism' }, { value: 'solid', label: 'Pleine', desc: 'opaque, sobre' }, { value: 'outline', label: 'Contour', desc: 'léger, aéré' }, { value: 'neon', label: 'Néon', desc: 'halo lumineux' }] },
        { type: 'seg', path: 'card.border', label: 'Bordure', options: [['none', 'Aucune'], ['spotlight', 'Projecteur'], ['gradient', 'Anneau animé']] },
        { type: 'range', path: 'card.opacity', label: 'Opacité', min: 0.05, max: 1, step: 0.01, format: (v) => Math.round(v * 100), unit: '%' },
        { type: 'range', path: 'card.blur', label: 'Flou du verre', min: 0, max: 50, step: 1, unit: 'px' },
        { type: 'range', path: 'card.radius', label: 'Arrondi', min: 0, max: 48, step: 1, unit: 'px' },
        { type: 'range', path: 'page.shadow', label: 'Ombre', min: 0, max: 2, step: 0.1, format: (v) => Math.round(v * 100), unit: '%' },
        { type: 'range', path: 'page.width', label: 'Largeur de la colonne', min: 360, max: 760, step: 10, unit: 'px' },
        { type: 'range', path: 'page.gap', label: 'Espace entre widgets', min: 0, max: 32, step: 1, unit: 'px' },
        { type: 'seg', path: 'page.valign', label: 'Position', options: [['center', 'Centrée'], ['top', 'En haut']] },
        { type: 'choice', path: 'linkStyle', label: 'Style des boutons', options: [
          { value: 'glass', label: 'Verre', desc: 'translucide' }, { value: 'solid', label: 'Plein', desc: 'dégradé accent' }, { value: 'outline', label: 'Contour', desc: 'fin & net' }, { value: 'neon', label: 'Néon', desc: 'lueur' }] },
      ] },
    ] },
    { id: 'fond', icon: 'image', title: 'Fond & effets', desc: 'Arrière-plan, particules, décorations', groups: [
      { title: 'Arrière-plan', fields: [
        { type: 'choice', path: 'background.type', label: 'Type de fond', sync: true, options: [
          { value: 'shader', label: 'Fluide WebGL', desc: 'réagit à la musique', icon: 'sparkles' }, { value: 'aurora', label: 'Aurore', desc: 'voiles animés', icon: 'moon' },
          { value: 'grid', label: 'Grille rétro', desc: 'synthwave', icon: 'layers' }, { value: 'video', label: 'Vidéo', desc: 'fichier mp4/webm', icon: 'video' },
          { value: 'image', label: 'Image', desc: 'jpg, png, gif', icon: 'image' }, { value: 'none', label: 'Sobre', desc: 'dégradé simple', icon: 'moon' }] },
        { type: 'image', path: 'background.src', label: 'Fichier du fond', hint: 'Pour « Vidéo », mets le chemin (ex. assets/fond.mp4). Pour « Image », importe ou indique un chemin.', wide: true, max: 1920, placeholder: 'assets/fond.mp4 · assets/fond.jpg · https://…' },
        { type: 'toggle', path: 'background.mono', label: 'Noir & blanc', hint: 'Passe le fond en niveaux de gris' },
        { type: 'range', path: 'background.dim', label: 'Assombrir', min: 0, max: 0.9, step: 0.01, format: (v) => Math.round(v * 100), unit: '%' },
        { type: 'range', path: 'background.blur', label: 'Flou', min: 0, max: 24, step: 1, unit: 'px' },
      ] },
      { title: 'Particules', fields: [
        { type: 'choice', path: 'effects.particles', label: 'Particules', options: [
          { value: 'none', label: 'Aucune', icon: 'close' }, { value: 'snow', label: 'Neige', icon: 'moon' }, { value: 'fireflies', label: 'Lucioles', icon: 'sparkles' }, { value: 'stars', label: 'Étoiles', icon: 'star' },
          { value: 'shooting', label: 'Étoiles filantes', icon: 'zap' }, { value: 'bokeh', label: 'Bokeh', icon: 'camera' }, { value: 'rain', label: 'Pluie', icon: 'leaf' }] },
      ] },
      { title: 'Décorations', fields: [
        { type: 'toggle', path: 'decor.dots', label: 'Trame de points', hint: 'Motif halftone sur le fond' },
        { type: 'toggle', path: 'decor.orbs', label: 'Orbes flottantes', hint: 'Halos colorés derrière les widgets' },
        { type: 'toggle', path: 'decor.noise', label: 'Grain', hint: 'Texture fine façon film / verre givré' },
        { type: 'toggle', path: 'decor.vignette', label: 'Vignette', hint: 'Assombrit les bords de l’écran' },
        { type: 'toggle', path: 'decor.scanlines', label: 'Scanlines', hint: 'Lignes de balayage rétro' },
      ] },
      { title: 'Interactions', fields: [
        { type: 'range', path: 'effects.density', label: 'Densité des particules', min: 0.3, max: 2.5, step: 0.1, format: (v) => Math.round(v * 100), unit: '%' },
        { type: 'range', path: 'effects.tiltStrength', label: 'Force de l’inclinaison', min: 0, max: 2, step: 0.1, format: (v) => Math.round(v * 100), unit: '%' },
        { type: 'toggle', path: 'effects.tilt', label: 'Inclinaison 3D', hint: 'La carte suit la souris' },
        { type: 'toggle', path: 'effects.spotlight', label: 'Halo du curseur' },
        { type: 'toggle', path: 'effects.cursor', label: 'Curseur personnalisé' },
        { type: 'toggle', path: 'effects.trail', label: 'Traînée d’étincelles' },
        { type: 'toggle', path: 'effects.ripple', label: 'Onde au clic' },
        { type: 'toggle', path: 'effects.glitch', label: 'Glitch du nom' },
      ] },
    ] },
    { id: 'liens', icon: 'link', title: 'Liens', desc: 'Les gros boutons de ta page', groups: [{ fields: [
      { type: 'list', path: 'links', label: 'Boutons', iconKind: 'ui', addLabel: 'Ajouter un lien', empty: 'Aucun lien. Ajoute ton portfolio, ta boutique, ton serveur…',
        title: (l) => l.label, subtitle: (l) => l.url, make: () => ({ icon: 'link', label: 'Nouveau lien', sub: '', url: 'https://' }),
        fields: [{ key: 'label', label: 'Titre' }, { key: 'sub', label: 'Sous-titre' }, { key: 'url', label: 'URL (https://, mailto:, tel:)', full: true, mono: true, placeholder: 'https://…' }, { key: 'badge', label: 'Étiquette (ex. Nouveau)' }, { type: 'toggle', key: 'accent', label: 'Mettre en avant', hint: 'fond accentué' }, { type: 'toggle', key: 'sameTab', label: 'Même onglet', hint: 'ne pas ouvrir dans un nouvel onglet' }] },
    ] }] },
    { id: 'reseaux', icon: 'share', title: 'Réseaux', desc: 'Icônes sociales sous ton profil', groups: [{ fields: [
      { type: 'list', path: 'socials', label: 'Réseaux sociaux', iconKind: 'brand', addLabel: 'Ajouter un réseau', empty: 'Aucun réseau.',
        title: (s) => s.label, subtitle: (s) => s.copy ? 'copie « ' + s.copy + ' »' : s.url, make: () => ({ icon: 'instagram', label: 'Instagram', url: 'https://instagram.com/' }),
        fields: [{ key: 'label', label: 'Nom' }, { key: 'url', label: 'URL', mono: true, placeholder: 'https://…' }, { key: 'copy', label: 'Texte à copier au clic (remplace l’URL — ex. pseudo Discord)', full: true }] },
    ] }] },
    { id: 'badges', icon: 'star', title: 'Badges', desc: 'Petites icônes sous ton nom', groups: [{ fields: [
      { type: 'list', path: 'badges', label: 'Badges', iconKind: 'ui', addLabel: 'Ajouter un badge', empty: 'Aucun badge.',
        title: (b) => b.label, make: () => ({ icon: 'star', label: 'Nouveau badge' }),
        fields: [{ key: 'label', label: 'Libellé (affiché au survol)', full: true }] },
    ] }] },
    { id: 'musique', icon: 'music', title: 'Musique', desc: 'Lecteur et pistes', groups: [
      { fields: [
        { type: 'note', content: () => h('span', {}, 'Sans piste, la page joue ', h('b', { text: '3 ambiances générées en direct' }), ' dans le navigateur (lo-fi, synthwave, ambient). Ajoute tes fichiers pour les remplacer.') },
        { type: 'toggle', path: 'music.autoplay', label: 'Lecture automatique', hint: 'Après le clic sur l’écran d’entrée' },
        { type: 'range', path: 'music.volume', label: 'Volume par défaut', min: 0, max: 1, step: 0.01, format: (v) => Math.round(v * 100), unit: '%' },
        { type: 'toggle', path: 'music.loop', label: 'Lecture en boucle', hint: 'Repart au début après la dernière piste' },
        { type: 'toggle', path: 'music.shuffle', label: 'Aléatoire' },
        { type: 'toggle', path: 'music.showVolume', label: 'Afficher le volume' },
        { type: 'list', path: 'music.tracks', label: 'Pistes', iconKind: 'ui', addLabel: 'Ajouter une piste', empty: 'Aucune piste : les ambiances générées sont utilisées.',
          title: (t) => t.title, subtitle: (t) => t.artist, make: () => ({ icon: 'music', title: 'Nouvelle piste', artist: '', src: 'assets/son.mp3', cover: '' }),
          fields: [{ key: 'title', label: 'Titre' }, { key: 'artist', label: 'Artiste' }, { key: 'src', label: 'Fichier audio (assets/son.mp3 ou URL)', full: true, mono: true }, { key: 'cover', label: 'Pochette (optionnel)', mono: true }, { key: 'tag', label: 'Étiquette (ex. Explicit)' }, { type: 'toggle', key: 'cors', label: 'CORS', hint: 'fichier hébergé ailleurs, serveur avec Access-Control-Allow-Origin' }] },
      ] },
    ] },
    { id: 'discord', icon: 'discord', title: 'Discord', desc: 'Présence en direct (statut, jeu, Spotify)', groups: [{ fields: [
      { type: 'note', content: () => h('span', {}, 'La présence passe par l’API publique ', h('a', { href: 'https://github.com/Phineas/lanyard', target: '_blank', rel: 'noopener', text: 'Lanyard' }), ' :', h('ol', {}, h('li', { text: 'Rejoins le serveur discord.gg/lanyard (le bot doit te voir).' }), h('li', { text: 'Active le mode développeur dans Discord, clic droit sur ton profil → Copier l’identifiant.' }), h('li', { text: 'Colle-le ci-dessous et désactive la démo.' }))) },
      { type: 'text', path: 'discord.id', label: 'ID utilisateur Discord', placeholder: '123456789012345678', mono: true },
      { type: 'toggle', path: 'discord.demo', label: 'Mode démo', hint: 'Affiche une fausse activité tant qu’aucun ID n’est renseigné' },
      { type: 'toggle', path: 'discord.useAvatar', label: 'Utiliser l’avatar Discord', hint: 'Remplace ton avatar par celui de Discord' },
      { type: 'text', path: 'discord.tag', label: 'Pseudo Discord', hint: 'Affiché dans le widget (sans Lanyard) et copié au clic sur l’icône Discord' },
    ] }] },
    { id: 'integrations', icon: 'gamepad', title: 'Intégrations', desc: 'Roblox, osu!, lecteur intégré', groups: [
      { title: 'Roblox', fields: [
        { type: 'note', content: () => h('span', {}, 'Avec ton ID (ou ton pseudo) et « En direct » activé, les amis, abonnés, l’avatar et la présence sont récupérés via ', h('a', { href: 'https://roproxy.com', target: '_blank', rel: 'noopener', text: 'RoProxy' }), ' (miroir public de l’API Roblox). Les valeurs saisies servent de repli si la récupération échoue.') },
        { type: 'text', path: 'roblox.id', label: 'ID utilisateur', placeholder: '156', mono: true, hint: 'Dans l’URL de ton profil : roblox.com/users/ID/profile' },
        { type: 'text', path: 'roblox.username', label: 'Pseudo', placeholder: 'builderman' },
        { type: 'text', path: 'roblox.displayName', label: 'Nom affiché' },
        { type: 'toggle', path: 'roblox.live', label: 'En direct', hint: 'Récupère les données en direct (sinon valeurs ci-dessous)' },
        { type: 'number', path: 'roblox.friends', label: 'Amis' },
        { type: 'number', path: 'roblox.followers', label: 'Abonnés' },
        { type: 'text', path: 'roblox.proxy', label: 'Proxy CORS', placeholder: 'https://mon-proxy.workers.dev/?', mono: true, hint: 'Optionnel : remplace RoProxy par ton propre proxy (préfixe + URL)' },
      ] },
      { title: 'osu!', fields: [
        { type: 'note', content: () => h('span', {}, 'L’API osu! exige un jeton secret : fournis un ', h('b', { text: 'endpoint' }), ' (ex. un Cloudflare Worker, modèle dans le README) qui renvoie la réponse de ', h('code', { text: 'GET /api/v2/users/{id}/{mode}' }), '. Sans endpoint, les valeurs saisies sont affichées.') },
        { type: 'text', path: 'osu.username', label: 'Pseudo' },
        { type: 'text', path: 'osu.id', label: 'ID utilisateur', placeholder: '2', mono: true, hint: 'Avatar automatique via a.ppy.sh' },
        { type: 'seg', path: 'osu.mode', label: 'Mode', options: [['osu', 'standard'], ['taiko', 'taiko'], ['fruits', 'catch'], ['mania', 'mania']] },
        { type: 'text', path: 'osu.country', label: 'Pays', placeholder: 'FR', mono: true, hint: 'Code à 2 lettres → drapeau' },
        { type: 'number', path: 'osu.rank', label: 'Rang mondial' },
        { type: 'number', path: 'osu.countryRank', label: 'Rang national' },
        { type: 'number', path: 'osu.pp', label: 'pp' },
        { type: 'number', path: 'osu.accuracy', label: 'Précision (%)', step: 'any' },
        { type: 'number', path: 'osu.playcount', label: 'Parties jouées' },
        { type: 'number', path: 'osu.level', label: 'Niveau' },
        { type: 'text', path: 'osu.endpoint', label: 'Endpoint', placeholder: 'https://osu.mon-worker.workers.dev/', mono: true },
      ] },
      { title: 'Lecteur intégré', fields: [
        { type: 'note', content: () => h('span', {}, 'Colle un lien de partage ', h('b', { text: 'Spotify' }), ' (titre, album, playlist, artiste, podcast), ', h('b', { text: 'SoundCloud' }), ', ', h('b', { text: 'YouTube' }), ' (vidéo ou playlist), ', h('b', { text: 'Apple Music' }), ' ou ', h('b', { text: 'Deezer' }), ' : il devient un lecteur dans un widget.') },
        { type: 'text', path: 'embed.url', label: 'Lien', placeholder: 'https://open.spotify.com/track/…', mono: true },
        { type: 'text', path: 'embed.title', label: 'Titre du widget', placeholder: 'En écoute en ce moment', hint: 'Optionnel' },
      ] },
    ] },
    { id: 'abonnement', icon: 'crown', title: 'Abonnement', desc: 'Ton plan, les fonctions débloquées, les liens de paiement', groups: [
      { fields: [
        { type: 'planpicker' },
        { type: 'toggle', path: 'premium.badge', label: 'Badge de plan', hint: 'Affiche l’icône Premium / VIP à côté du nom' },
        { type: 'toggle', path: 'premium.branding', label: 'Mention « Fait avec biolink »', hint: 'Toujours affichée avec le plan Gratuit', path2: 'premium.branding' },
      ] },
      { title: 'Liens de paiement', fields: [
        { type: 'note', content: () => h('span', {}, 'Le site est statique : le paiement passe par un lien hébergé (', h('b', { text: 'Stripe Payment Link' }), ', Ko-fi, PayPal…). Après paiement, choisis ton plan ci-dessus et télécharge config.js. Ces liens sont utilisés par les boutons de la page d’accueil.') },
        { type: 'text', path: 'premium.checkout.premium', label: 'Lien Premium', placeholder: 'https://buy.stripe.com/…', mono: true, hint: 'https uniquement ; vide = le bouton renvoie vers cette section' },
        { type: 'text', path: 'premium.checkout.vip', label: 'Lien VIP', placeholder: 'https://buy.stripe.com/…', mono: true },
        { type: 'testlinks' },
      ] },
    ] },
    { id: 'avance', icon: 'cpu', title: 'Avancé', desc: 'Compteur, extras', groups: [
      { title: 'Compteur de vues', fields: [
        { type: 'number', path: 'views.base', label: 'Valeur de départ' },
        { type: 'text', path: 'views.endpoint', label: 'Endpoint global', hint: 'URL qui répond { "value": 123 }. Sans serveur, le compteur est local (+1 / jour / navigateur).', mono: true, placeholder: 'https://…' },
      ] },
      { title: 'Extras', fields: [
        { type: 'toggle', path: 'studio', label: 'Réglages rapides (touche E)', hint: 'Panneau de réglages sur la page publique' },
        { type: 'toggle', path: 'terminal', label: 'Terminal caché (touche `)' },
      ] },
      { title: 'Accès', fields: [
        { type: 'toggle', path: 'ageGate.enabled', label: 'Avertissement 18+', hint: 'Demande une confirmation avant d’afficher la page (mémorisée dans le navigateur)' },
        { type: 'text', path: 'ageGate.text', label: 'Texte de l’avertissement' },
      ] },
      { title: 'CSS personnalisé', fields: [
        { type: 'note', content: () => h('span', {}, 'Ajoute tes propres règles CSS, appliquées après celles de la page. Exemples : ', h('code', { text: '.name-text { letter-spacing: .1em }' }), ' ou ', h('code', { text: '.widget { border-radius: 8px }' }), '.') },
        { type: 'lines', path: 'customCss', label: 'CSS', asText: true, mono: true, placeholder: '.widget { … }' },
      ] },
    ] },
  ];

  /* ---------------------------------------------------------------- rendu */
  const main = $('#d-main'), nav = $('#d-nav');
  const hero = (() => {
    const name = h('b'), stats = h('div', { class: 'hero-stats' }), check = h('div', { class: 'hero-check' });
    const el = h('section', { class: 'hero' },
      h('div', { class: 'hero-top' }, h('div', {}, h('p', { class: 'hero-k', text: 'Vue d’ensemble' }), h('h1', {}, 'Bonjour, ', name, ' !'), h('p', { class: 'hero-sub', text: 'Tout ce que tu changes ici s’affiche en direct dans l’aperçu. Pense à télécharger config.js quand tu as fini.' })),
        h('a', { class: 'btn pill', href: 'profile.html', target: '_blank', rel: 'noopener' }, Bio.icon('external', 14), 'Voir ma page')),
      stats, check);
    const tile = (icon, label, val) => h('div', { class: 'tile' }, h('span', { class: 'tile-k' }, Bio.icon(icon, 13), label), h('b', { text: val }));
    D.heroSync = () => {
      const c = D.cfg;
      name.textContent = c.displayName || c.username;
      const items = [
        ['Avatar personnalisé', c.avatar && c.avatar !== 'assets/avatar.svg', '#s-profil'], ['Accroche', c.bio.length > 0, '#s-profil'], ['À propos', !!c.about.trim(), '#s-profil'],
        ['Au moins 3 liens', c.links.length >= 3, '#s-liens'], ['Au moins 3 réseaux', c.socials.length >= 3, '#s-reseaux'], ['Discord connecté', !!c.discord.id, '#s-discord'],
        ['Description de partage', !!c.seo.description, '#s-profil'], ['Lien de paiement', !!(c.premium.checkout.premium || c.premium.checkout.vip), '#s-abonnement'],
      ];
      const done = items.filter((i) => i[1]).length, pct = Math.round((done / items.length) * 100);
      check.textContent = '';
      check.append(h('div', { class: 'hc-head' }, h('span', {}, h('b', { text: pct + ' %' }), ' de ta page est prête'), h('span', { class: 'hc-bar' }, h('i', { style: { width: pct + '%' } }))),
        h('ul', { class: 'hc-list' }, items.map((i) => h('li', { class: i[1] ? 'ok' : '' }, h('a', { href: i[2] }, Bio.icon(i[1] ? 'check' : 'plus', 12), h('span', { text: i[0] }))))));
      stats.textContent = '';
      stats.append(tile('link', 'URL', '/' + c.username), tile('eye', 'Vues', new Intl.NumberFormat('fr-FR').format(c.views.base || 0)), tile('layers', 'Widgets', c.layout.length + ' / ' + Object.keys(Bio.widgets).length),
        tile('share', 'Réseaux', String(c.socials.length)), tile('link', 'Liens', String(c.links.length)), tile((Bio.plans[c.premium.plan] || {}).icon || 'user', 'Plan', (Bio.plans[c.premium.plan] || Bio.plans.free).label));
    };
    D.syncs.push(D.heroSync);
    return el;
  })();
  main.append(hero);
  SECTIONS.forEach((s) => {
    const body = h('div', { class: 'p-body' }, s.groups.map((g) => h('div', { class: 'p-group' }, g.title ? h('h3', { text: g.title }) : null, g.fields.map((f) => F[f.type](f)))));
    main.append(h('section', { class: 'd-panel', id: 's-' + s.id },
      h('header', {}, h('span', { class: 'p-ico' }, Bio.icon(s.icon, 19)), h('div', {}, h('h2', { text: s.title }), h('p', { text: s.desc }))), body));
    nav.append(h('a', { href: '#s-' + s.id, 'data-id': s.id }, Bio.icon(s.icon, 17), h('span', { text: s.title })));
  });
  nav.append(h('div', { class: 'nav-foot' }, h('kbd', { text: 'Ctrl' }), '+', h('kbd', { text: 'S' }), ' télécharge config.js', h('br'), 'Brouillon sauvegardé automatiquement dans ce navigateur.'));
  // recherche : filtre les champs par libellé / indice ; les panneaux vides se masquent
  const search = h('input', { class: 'in d-search', type: 'search', placeholder: 'Rechercher un réglage…', 'aria-label': 'Rechercher un réglage' });
  nav.prepend(h('div', { class: 'd-search-wrap' }, Bio.icon('search', 14), search));
  const applySearch = () => {
    const q = search.value.trim().toLowerCase();
    $$('.d-panel').forEach((panel) => {
      let any = false;
      $$('.field', panel).forEach((f) => { const hit = !q || f.textContent.toLowerCase().includes(q); f.classList.toggle('s-hide', !hit); if (hit) any = true; });
      $$('.p-group', panel).forEach((g) => g.classList.toggle('s-hide', !!q && !$$('.field:not(.s-hide)', g).length));
      panel.classList.toggle('s-hide', !!q && !any);
    });
    hero.classList.toggle('s-hide', !!q);
    links.forEach((a) => a.classList.toggle('s-hide', !!q && $('#s-' + a.dataset.id).classList.contains('s-hide')));
  };
  search.addEventListener('input', applySearch);
  addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); search.focus(); } if (e.key === 'Escape' && document.activeElement === search) { search.value = ''; applySearch(); search.blur(); } });
  const links = $$('a', nav);
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.dataset.id === en.target.id.slice(2))); });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
  $$('.d-panel').forEach((p) => obs.observe(p));
  links[0].classList.add('active');

  /* --------------------------------------------------------------- actions */
  const actions = $('#d-actions');
  const abtn = (icon, label, cls, fn) => { const b = h('button', { type: 'button', class: 'btn ' + (cls || ''), title: label, 'aria-label': label, onclick: fn }, Bio.icon(icon, 15), h('span', { class: 'btn-label', text: label })); actions.append(b); return b; };
  abtn('upload', 'Importer', 'ghost', () => openImport());
  abtn('reset', 'Réinitialiser', 'ghost danger', () => {
    if (!confirm('Revenir au config.js actuel ? Le brouillon sera perdu.')) return;
    store.del('dash-draft');
    D.cfg = U.deepMerge({}, original);
    D.dirty = false;
    setStatus();
    pushPreview();
    syncAll();
    U.toast('Configuration réinitialisée', 'reset');
  });
  abtn('copy', 'Copier', '', async () => { const ok = await U.copy(Bio.serialize(D.cfg)); U.toast(ok ? 'config.js copié dans le presse-papiers' : 'Copie impossible', ok ? 'check' : 'close'); });
  abtn('download', 'Télécharger config.js', 'primary', exportFile);
  const open = h('a', { class: 'btn ghost icon', href: 'profile.html', target: '_blank', rel: 'noopener', title: 'Voir la page' }, Bio.icon('external', 15));
  actions.append(open);
  function exportFile() {
    U.download('config.js', Bio.serialize(D.cfg));
    D.dirty = false;
    store.del('dash-draft');
    setStatus();
    U.toast('config.js téléchargé — remplace celui du site', 'download');
  }
  addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); exportFile(); } });

  /* ---------------------------------------------------------------- import */
  const modal = $('#modal-import'), impText = $('#imp-text');
  function openImport() { modal.hidden = false; impText.value = ''; setTimeout(() => impText.focus(), 30); }
  function closeImport() { modal.hidden = true; }
  $('#imp-cancel').addEventListener('click', closeImport);
  $('.modal-backdrop', modal).addEventListener('click', closeImport);
  $('#imp-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) f.text().then((t) => { impText.value = t; }); });
  $('#imp-ok').addEventListener('click', () => {
    const code = impText.value.trim();
    if (!code) return;
    let parsed = null;
    try { parsed = JSON.parse(code); } catch (e) {
      try {
        // config.js est du JavaScript : on l'exécute avec un faux "window" pour en extraire BIO_CONFIG
        const fake = {};
        new Function('window', 'self', 'globalThis', 'document', code)(fake, fake, fake, undefined);
        parsed = fake.BIO_CONFIG;
      } catch (err) { parsed = null; }
    }
    if (!parsed || typeof parsed !== 'object') { U.toast('Impossible de lire cette configuration', 'close'); return; }
    replaceConfig(parsed);
    closeImport();
    U.toast('Configuration importée', 'check');
  });

  /* ------------------------------------------------------------------ go */
  setStatus();
  syncAll();
  fitPreview();
  if (draft) U.toast('Brouillon restauré', 'info');
})();
