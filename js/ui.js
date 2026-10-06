/* ==========================================================================
   ui.js — widgets empilés (profil, à propos, vues, Discord, musique, liens),
   écran d'entrée, tilt, curseur, magnétisme, ripple, mode aperçu
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const { $, $$, h, clamp, sleep, fmtTime, store, safeUrl, cssUrl } = Bio.util;
  const UI = (Bio.ui = { entered: false });

  Bio.preview = /[?&]preview\b/.test(location.search);

  const STATUS_FR = { online: 'En ligne', idle: 'Absent', dnd: 'Ne pas déranger', offline: 'Hors ligne' };

  /* ------------------------------------------------------------- helpers */
  function toolBtn(icon, label, onClick) {
    return h('button', { class: 'tool', type: 'button', 'aria-label': label, 'data-tip': label, 'data-tip-side': 'bottom', onclick: onClick }, Bio.icon(icon, 16));
  }
  function easeOutExpo(x) { return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  const widget = (id, ...kids) => h('section', { class: 'widget w-' + id, 'data-widget': id }, ...kids);

  /* ------------------------------------------------------------- outils */
  UI.buildTools = function () {
    const cfg = Bio.cfg, box = $('#tools');
    box.textContent = '';
    if (Bio.preview) { box.hidden = true; return; }
    box.hidden = false;
    box.append(
      toolBtn('search', 'Palette de commandes · Ctrl+K', () => Bio.overlays.open('palette')),
      cfg.terminal ? toolBtn('terminal', 'Terminal · `', () => Bio.overlays.open('terminal')) : null,
      cfg.studio ? toolBtn('sliders', 'Réglages rapides · E', () => Bio.overlays.open('studio')) : null);
  };

  /* ------------------------------------------------------------- widgets */
  UI.buildProfile = function () {
    const cfg = Bio.cfg;
    let banner = null;
    if (cfg.banner) {
      banner = h('div', { class: 'banner' + (cfg.banner === 'gradient' ? ' gradient' : '') });
      if (cfg.banner !== 'gradient') banner.style.backgroundImage = cssUrl(cfg.banner);
    }

    const img = h('img', { src: safeUrl(cfg.avatar), alt: 'Avatar de ' + cfg.displayName, width: 120, height: 120, draggable: 'false' });
    img.addEventListener('error', () => { if (!img.dataset.fb) { img.dataset.fb = 1; img.src = 'assets/avatar.svg'; } });
    const avatar = h('div', { class: 'avatar' }, h('span', { class: 'ring' }), h('span', { class: 'frame' }, img), h('span', { class: 'status', 'data-status': 'none' }));

    const nameText = h('span', { class: 'name-text', 'data-text': cfg.displayName, text: cfg.displayName });
    const plan = Bio.plans[cfg.premium.plan] || Bio.plans.free;
    const planBadge = plan.icon && cfg.premium.badge ? h('span', { class: 'plan-badge', 'data-plan': cfg.premium.plan, 'data-tip': 'Membre ' + plan.label }, Bio.icon(plan.icon, 13)) : null;
    const name = h('h1', { class: 'name' }, nameText, cfg.verified ? h('span', { class: 'verified', 'data-tip': 'Compte vérifié' }, Bio.icon('sparkles', 17)) : null, planBadge);

    const badges = (cfg.badges || []).length ? h('div', { class: 'badges' }, cfg.badges.map((b) =>
      h('span', { class: 'badge', 'data-tip': b.label, tabindex: '0', role: 'img', 'aria-label': b.label }, Bio.icon(b.icon, 15)))) : null;

    const bio = h('p', { class: 'bio', 'aria-live': 'off' }, h('span', { class: 'typed' }), h('span', { class: 'caret' }));
    const from = cfg.location ? h('div', { class: 'from' }, Bio.icon('pin', 13), h('span', { text: cfg.location })) : null;

    const metaBits = [];
    if (cfg.timezone) metaBits.push(h('span', { class: 'm-time', id: 'chip-time' }, Bio.icon('clock', 12), h('span', { class: 'chip-t', text: '--:--' })));
    metaBits.push(h('span', { text: '@' + cfg.username }));
    if (cfg.pronouns) metaBits.push(h('span', { class: 'm-pronouns', text: cfg.pronouns }));
    metaBits.push(h('span', { text: 'UID ' + cfg.uid }));
    if (cfg.joined) { const d = new Date(cfg.joined); if (!isNaN(d)) metaBits.push(h('span', { text: 'depuis ' + d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) })); }
    const meta = h('div', { class: 'meta' }, metaBits.flatMap((b, i) => (i ? [h('i', { class: 'sep' }), b] : [b])));

    const limit = cfg.socialsLimit > 0 ? cfg.socialsLimit : Infinity;
    const list = cfg.socials || [];
    const socials = h('div', { class: 'socials' }, list.map((s, i) => {
      const attrs = { class: 'social' + (i >= limit ? ' extra' : ''), 'data-mag': '', 'data-tip': s.label, 'aria-label': s.label };
      const ico = Bio.icon(s.icon, 24);
      if (s.copy) {
        return h('button', Object.assign(attrs, { type: 'button', onclick: async () => {
          const ok = await Bio.util.copy(s.copy);
          Bio.util.toast(ok ? s.label + ' copié : ' + s.copy : 'Copie impossible', ok ? 'check' : 'close');
        } }), ico);
      }
      return h('a', Object.assign(attrs, { href: safeUrl(s.url), target: '_blank', rel: 'noopener noreferrer' }), ico);
    }));
    if (list.length > limit) {
      const more = h('button', { class: 'social more', type: 'button', 'aria-label': 'Voir plus', 'data-tip': '+' + (list.length - limit) }, Bio.icon('plus', 20));
      more.addEventListener('click', () => {
        const open = socials.classList.toggle('expanded');
        more.textContent = '';
        more.append(Bio.icon(open ? 'close' : 'plus', 20));
        more.setAttribute('data-tip', open ? 'Réduire' : '+' + (list.length - limit));
      });
      socials.append(more);
    }

    const el = widget('profile', banner, avatar, name, badges, bio, from, meta, list.length ? socials : null);
    el.classList.toggle('has-banner', !!banner);
    UI.el.img = img;
    UI.el.status = avatar.querySelector('.status');
    UI.el.name = nameText;
    UI.el.bio = bio.querySelector('.typed');
    return el;
  };

  UI.buildAbout = function () {
    const t = (Bio.cfg.about || '').trim();
    if (!t) return null;
    return widget('about', h('h3', { text: 'À propos' }), h('p', { text: t }));
  };

  UI.buildViews = function () {
    const el = widget('views', Bio.icon('eye', 16), h('span', { class: 'chip-t', id: 'chip-views', text: UI.viewsText || '0' }));
    el.setAttribute('data-tip', 'Vues du profil');
    return el;
  };

  UI.buildDiscord = function () {
    const img = h('img', { alt: '', draggable: 'false' });
    img.addEventListener('error', () => { img.src = safeUrl(Bio.cfg.avatar); });
    const el = widget('discord',
      h('div', { class: 'dc-avatar' }, img, h('span', { class: 'dc-status', 'data-status': 'offline' })),
      h('div', { class: 'dc-body' },
        h('div', { class: 'dc-name' }, h('b', { class: 'dc-user' }), h('span', { class: 'dc-check', 'data-tip': 'Discord' }, Bio.icon('discord', 14))),
        h('div', { class: 'dc-sub' }),
        h('div', { class: 'dc-act', hidden: true })));
    el.hidden = true;
    UI.el.discord = { el, img, status: el.querySelector('.dc-status'), user: el.querySelector('.dc-user'), sub: el.querySelector('.dc-sub'), act: el.querySelector('.dc-act') };
    return el;
  };

  /* ---- intégrations : Roblox, osu!, lecteur intégré ---- */
  const fmtN = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
  const stat = (icon, value, label) => h('span', { class: 'ig-stat' }, Bio.icon(icon, 14), h('b', { text: value }), h('span', { text: label }));
  const igCard = (id, brand, tip) => {
    const img = h('img', { alt: '', draggable: 'false', hidden: true });
    img.addEventListener('error', () => { img.hidden = true; });
    img.addEventListener('load', () => { img.hidden = false; });
    const link = h('a', { class: 'ig-avatar', target: '_blank', rel: 'noopener noreferrer', 'aria-label': tip }, Bio.icon(brand, 26), img, h('span', { class: 'ig-status', 'data-status': 'none' }));
    const el = widget(id, link, h('div', { class: 'ig-body' },
      h('div', { class: 'ig-name' }, h('b'), h('span', { class: 'ig-brand', 'data-tip': tip }, Bio.icon(brand, 13))),
      h('div', { class: 'ig-sub' }), h('div', { class: 'ig-stats' })));
    return { el, img, link, status: link.querySelector('.ig-status'), name: el.querySelector('.ig-name b'), sub: el.querySelector('.ig-sub'), stats: el.querySelector('.ig-stats') };
  };

  UI.buildRoblox = function () {
    const c = Bio.cfg.roblox;
    if (!c.id && !c.username) return null;
    UI.el.roblox = igCard('roblox', 'roblox', 'Roblox');
    UI.renderRoblox(Bio.integrations.roblox);
    return UI.el.roblox.el;
  };
  UI.renderRoblox = function (d) {
    const r = UI.el && UI.el.roblox;
    if (!r) return;
    if (!d) { r.el.hidden = true; return; }
    r.el.hidden = false;
    if (d.avatar) { if (r.img.getAttribute('src') !== d.avatar) r.img.src = safeUrl(d.avatar); } else { r.img.hidden = true; r.img.removeAttribute('src'); }
    r.link.href = d.id ? 'https://www.roblox.com/users/' + d.id + '/profile' : d.name ? 'https://www.roblox.com/search/users?keyword=' + encodeURIComponent(d.name) : '#';
    r.name.textContent = d.displayName || d.name || 'Roblox';
    const where = d.presence && d.presence.type === 'ingame' && d.presence.where ? ' · joue à ' + d.presence.where : '';
    r.sub.textContent = (d.name ? '@' + d.name : '') + where;
    r.status.dataset.status = d.presence ? d.presence.type : 'none';
    r.status.setAttribute('data-tip', { online: 'En ligne', ingame: 'En jeu', studio: 'Dans Studio', offline: 'Hors ligne' }[d.presence ? d.presence.type : ''] || '');
    r.stats.textContent = '';
    r.stats.append(stat('user', fmtN(d.friends), 'amis'), stat('heart', fmtN(d.followers), 'abonnés'));
    if (d.created) { const y = new Date(d.created).getFullYear(); if (y) r.stats.append(stat('calendar', String(y), 'membre')); }
  };

  UI.buildOsu = function () {
    const c = Bio.cfg.osu;
    if (!c.username && !c.id) return null;
    UI.el.osu = igCard('osu', 'osu', 'osu!');
    UI.renderOsu(Bio.integrations.osu);
    return UI.el.osu.el;
  };
  UI.renderOsu = function (d) {
    const r = UI.el && UI.el.osu;
    if (!r) return;
    if (!d) { r.el.hidden = true; return; }
    r.el.hidden = false;
    if (d.avatar) { if (r.img.getAttribute('src') !== d.avatar) r.img.src = safeUrl(d.avatar); } else { r.img.hidden = true; r.img.removeAttribute('src'); }
    r.link.href = 'https://osu.ppy.sh/users/' + encodeURIComponent(d.id || d.name) + '/' + d.mode;
    r.name.textContent = '';
    r.name.append(d.name || 'osu!', d.country ? h('span', { class: 'ig-flag', text: Bio.integrations.flag(d.country), 'data-tip': d.country }) : null);
    r.sub.textContent = Bio.integrations.MODES[d.mode] + (d.level ? ' · niveau ' + Math.floor(d.level) : '');
    r.status.dataset.status = 'none';
    r.stats.textContent = '';
    if (d.rank) r.stats.append(stat('trophy', '#' + fmtN(d.rank), d.countryRank ? '(' + d.country + ' #' + fmtN(d.countryRank) + ')' : 'mondial'));
    if (d.pp) r.stats.append(stat('zap', fmtN(d.pp), 'pp'));
    if (d.accuracy) r.stats.append(stat('check', (Math.round(d.accuracy * 100) / 100).toLocaleString('fr-FR') + ' %', 'précision'));
    if (d.playcount) r.stats.append(stat('play', fmtN(d.playcount), 'parties'));
  };

  UI.buildEmbed = function () {
    const c = Bio.cfg.embed;
    const e = Bio.integrations.embed(c.url);
    if (!e) return null;
    // l'iframe est conservée tant que la source ne change pas (sinon elle rechargerait à chaque frappe dans le dashboard)
    if (!UI.embedEl || UI.embedEl.dataset.src !== e.src) {
      const frame = h('iframe', { src: e.src, title: c.title || e.label, loading: 'lazy', allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture', referrerpolicy: 'strict-origin-when-cross-origin', frameborder: '0' });
      if (e.ratio) frame.style.aspectRatio = '16 / 9'; else frame.style.height = e.height + 'px';
      UI.embedEl = h('div', { class: 'em-frame', 'data-src': e.src }, frame);
    }
    const head = c.title ? h('div', { class: 'em-head' }, Bio.hasIcon(e.provider) ? Bio.icon(e.provider, 14) : Bio.icon('headphones', 14), h('span', { text: c.title })) : null;
    return widget('embed', head, UI.embedEl);
  };

  UI.buildLinks = function () {
    const links = Bio.cfg.links || [];
    if (!links.length) return null;
    return h('nav', { class: 'links', 'aria-label': 'Liens' }, links.map((l) =>
      h('a', { class: 'widget link' + (l.accent ? ' accent' : ''), 'data-mag': '', href: safeUrl(l.url), target: /^mailto:|^tel:/.test(l.url || '') || l.sameTab ? null : '_blank', rel: 'noopener noreferrer' },
        h('span', { class: 'l-ico' }, Bio.icon(l.icon || 'link', 20)),
        h('span', { class: 'l-txt' }, h('b', {}, l.label, l.badge ? h('span', { class: 'l-badge', text: l.badge }) : null), l.sub ? h('small', { text: l.sub }) : null),
        h('span', { class: 'l-go' }, Bio.icon('arrow', 16)))));
  };

  /* ------------------------------------------------------------- colonne */
  UI.build = function () {
    const cfg = Bio.cfg;
    const col = $('#column');
    const rebuild = !!UI.el;
    col.classList.toggle('rebuilt', rebuild);
    col.textContent = '';
    UI.el = { col };
    let i = 0;
    const rev = (el) => { el.classList.add('reveal'); el.style.setProperty('--i', i++); return el; };

    const builders = {
      profile: UI.buildProfile,
      about: UI.buildAbout,
      views: UI.buildViews,
      discord: UI.buildDiscord,
      roblox: UI.buildRoblox,
      osu: UI.buildOsu,
      embed: UI.buildEmbed,
      music: () => { UI.playerEl = UI.playerEl || UI.buildPlayer(); return UI.playerEl; },
      links: UI.buildLinks,
    };
    (cfg.layout || []).forEach((id) => {
      const b = builders[id];
      const el = b && b();
      if (el) col.append(rev(el));
    });
    const branding = cfg.premium.plan === 'free' || cfg.premium.branding ? h('a', { class: 'brandlink', href: 'index.html', target: '_blank', rel: 'noopener' }, Bio.brand.mark(12), h('span', { text: 'Fait avec ' + Bio.brand.name })) : null;
    col.append(rev(h('footer', { class: 'foot' }, h('span', { text: '© ' + new Date().getFullYear() + ' @' + cfg.username }), branding, h('span', { class: 'hint' }, h('kbd', { text: 'Ctrl' }), '+', h('kbd', { text: 'K' })))));

    UI.buildTools();
    UI.applyCard();
    const bioKey = JSON.stringify(cfg.bio);
    if (UI.el.bio) {
      if (!rebuild || bioKey !== UI.bioKey) { UI.bioKey = bioKey; UI.startTypewriter(); }
      else UI.el.bio.textContent = UI.lastTyped || '';
    }
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
    root.style.setProperty('--col-w', cfg.page.width + 'px');
    root.style.setProperty('--col-gap', cfg.page.gap + 'px');
    root.style.setProperty('--shadow', String(cfg.page.shadow));
    root.dataset.valign = cfg.page.valign;
    Bio.applyFont(cfg.font);
    // CSS personnalisé (Premium) : inséré comme texte dans un <style> dédié
    let st = $('#custom-css');
    if (!st) { st = h('style', { id: 'custom-css' }); document.head.append(st); }
    st.textContent = cfg.customCss || '';
    // SEO : balises mises à jour (utile aux moteurs qui exécutent le JS et aux partages)
    const setMeta = (sel, attr, val) => { let m = $(sel); if (!val) { if (m && m.dataset.dyn) m.remove(); return; } if (!m) { m = h('meta', { 'data-dyn': '1' }); const [k, v] = sel.replace(/^meta\[|\]$/g, '').split('='); m.setAttribute(k, v.replace(/"/g, '')); document.head.append(m); } m.setAttribute(attr, val); };
    setMeta('meta[name="description"]', 'content', cfg.seo.description || '');
    setMeta('meta[property="og:description"]', 'content', cfg.seo.description || '');
    setMeta('meta[property="og:title"]', 'content', cfg.seo.title || cfg.pageTitle || '@' + cfg.username);
    setMeta('meta[property="og:image"]', 'content', /^https?:/.test(cfg.seo.image || '') ? cfg.seo.image : '');
    setMeta('meta[name="robots"]', 'content', cfg.seo.noindex ? 'noindex, nofollow' : '');
  };

  UI.setName = function (n) {
    if (UI.el.name) { UI.el.name.textContent = n; UI.el.name.setAttribute('data-text', n); }
    const sn = $('.splash-name');
    if (sn && !UI.entered) sn.textContent = n;
  };

  /* ---------------------------------------------------------- typewriter */
  let twToken = 0;
  UI.startTypewriter = async function () {
    const token = ++twToken;
    const el = { set textContent(v) { UI.lastTyped = v; if (UI.el.bio) UI.el.bio.textContent = v; } };
    const raw = Bio.cfg.bio;
    const lines = (Array.isArray(raw) ? raw : [raw]).map((s) => String(s).trim()).filter(Boolean);
    if (!lines.length) { el.textContent = ''; return; }
    if (Bio.util.reduceMotion()) { el.textContent = lines[0]; return; }
    let k = 0;
    while (token === twToken) {
      const text = lines[k++ % lines.length];
      for (let c = 1; c <= text.length && token === twToken; c++) { el.textContent = text.slice(0, c); await sleep(48 + Math.random() * 40); }
      await sleep(2200);
      if (lines.length === 1) { while (token === twToken) await sleep(1000); return; }
      for (let c = text.length - 1; c >= 0 && token === twToken; c--) { el.textContent = text.slice(0, c); await sleep(22); }
      await sleep(320);
    }
  };

  /* ------------------------------------------------------------ présence */
  let presenceTick = null;
  UI.renderPresence = function (p) {
    if (!UI.el) return;
    const cfg = Bio.cfg;
    if (UI.el.status) UI.el.status.dataset.status = p ? p.status : 'none';
    const dc = UI.el.discord;
    presenceTick = null;
    if (!dc) return;
    if (!p) { dc.el.hidden = true; return; }
    dc.el.hidden = false;
    dc.status.dataset.status = p.status;
    dc.status.setAttribute('data-tip', STATUS_FR[p.status] || '');
    const u = p.user;
    const ok = u && u.id && /^\d+$/.test(u.id) && u.avatar && /^[\w-]+$/.test(u.avatar);
    const dcAvatar = ok ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : safeUrl(cfg.avatar);
    if (dc.img.getAttribute('src') !== dcAvatar) dc.img.src = dcAvatar;
    if (cfg.discord.useAvatar && ok && UI.el.img) UI.el.img.src = dcAvatar.replace('size=128', 'size=256');
    dc.user.textContent = (u && (u.global_name || u.username)) || cfg.discord.tag || cfg.username;
    const custom = p.custom && (p.custom.text || p.custom.emoji) ? (p.custom.emoji ? p.custom.emoji + ' ' : '') + p.custom.text : '';
    dc.sub.textContent = custom || STATUS_FR[p.status] || '';

    const act = dc.act;
    act.textContent = '';
    const art = (src, fallbackIcon) => {
      const box = h('div', { class: 'act-art' }, Bio.icon(fallbackIcon, 18));
      if (/^https:\/\//.test(src || '')) {
        const im = h('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
        im.addEventListener('error', () => im.remove());
        box.append(im);
      }
      return box;
    };
    if (p.spotify) {
      const s = p.spotify, fill = h('i');
      act.append(art(s.art, 'music'), h('div', { class: 'act-body' },
        h('div', { class: 'act-kicker' }, h('span', { class: 'eq' }, h('i'), h('i'), h('i')), s.label),
        h('div', { class: 'act-title', text: s.song }), h('div', { class: 'act-sub', text: s.artist }),
        h('div', { class: 'act-bar' }, fill)));
      presenceTick = () => { fill.style.width = (clamp(s.progress(), 0, 1) * 100).toFixed(1) + '%'; };
      act.hidden = false;
    } else if (p.activity) {
      const a = p.activity, timer = h('span', { class: 'act-time' });
      act.append(art(a.image, 'gamepad'), h('div', { class: 'act-body' },
        h('div', { class: 'act-kicker', text: a.label }), h('div', { class: 'act-title', text: a.name }),
        (a.details || a.state) ? h('div', { class: 'act-sub', text: [a.details, a.state].filter(Boolean).join(' · ') }) : null,
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
      act.hidden = false;
    } else act.hidden = true;
    if (presenceTick) presenceTick();
  };

  /* ---------------------------------------------------------- lecteur UI */
  UI.buildPlayer = function () {
    const P = Bio.player;
    const cover = h('div', { class: 'p-cover' });
    const title = h('div', { class: 'p-title' });
    const artist = h('div', { class: 'p-artist' });
    const tag = h('span', { class: 'p-tag', hidden: true });
    const playBtn = h('button', { class: 'p-btn p-play', type: 'button', 'aria-label': 'Lecture / pause', onclick: () => P.toggle() });
    const prevBtn = h('button', { class: 'p-btn', type: 'button', 'aria-label': 'Piste précédente', onclick: () => P.prev() }, Bio.icon('prev', 16));
    const nextBtn = h('button', { class: 'p-btn', type: 'button', 'aria-label': 'Piste suivante', onclick: () => P.next() }, Bio.icon('next', 16));
    const fill = h('i', { class: 'p-fill' });
    const track = h('div', { class: 'p-track', role: 'slider', 'aria-label': 'Progression', tabindex: '0' }, fill);
    const tcur = h('span', { class: 'p-time', text: '00:00' });
    const tdur = h('span', { class: 'p-time', text: '∞' });
    const muteBtn = h('button', { class: 'p-btn p-mute', type: 'button', 'aria-label': 'Couper le son', onclick: () => P.toggleMute() });
    const vol = h('input', { class: 'p-vol', type: 'range', min: 0, max: 100, step: 1, 'aria-label': 'Volume', value: Math.round(P.volume * 100) });
    vol.addEventListener('input', () => P.setVolume(vol.value / 100));
    track.addEventListener('pointerdown', (e) => { const r = track.getBoundingClientRect(); P.seek((e.clientX - r.left) / r.width); });

    const root = widget('music',
      h('div', { class: 'p-top' }, cover, h('div', { class: 'p-meta' }, title, artist), tag, h('div', { class: 'p-ctrl' }, prevBtn, playBtn, nextBtn)),
      track,
      h('div', { class: 'p-times' }, tcur, h('span', { class: 'p-volrow' }, muteBtn, vol), tdur));
    root.setAttribute('aria-label', 'Lecteur de musique');

    const pad = (s) => (s === '∞' ? s : s.length < 5 ? '0' + s : s);
    const sync = () => {
      const t = P.track;
      if (!t) return;
      title.textContent = t.title;
      artist.textContent = t.artist;
      tag.hidden = !t.tag;
      tag.textContent = t.tag || '';
      playBtn.textContent = '';
      playBtn.append(Bio.icon(P.playing ? 'pause' : 'play', 18));
      muteBtn.textContent = '';
      muteBtn.append(Bio.icon(P.muted || P.volume === 0 ? 'mute' : 'volume', 15));
      muteBtn.setAttribute('aria-label', P.muted ? 'Rétablir le son' : 'Couper le son');
      vol.value = P.muted ? 0 : Math.round(P.volume * 100);
      vol.style.setProperty('--val', vol.value + '%');
      root.classList.toggle('playing', P.playing);
      root.classList.toggle('seekable', t.kind === 'file');
      root.classList.toggle('no-vol', Bio.cfg.music.showVolume === false);
      cover.textContent = '';
      if (t.cover) cover.append(h('img', { src: safeUrl(t.cover), alt: '' }));
      else cover.append(Bio.icon('music', 22));
    };
    Bio.on('player', sync);
    sync();
    let lastTime = '';
    Bio.frame(() => {
      fill.style.width = (P.progress() * 100).toFixed(2) + '%';
      const txt = pad(fmtTime(P.elapsed())) + '|' + pad(fmtTime(P.duration()));
      if (txt !== lastTime) { lastTime = txt; const [a, b] = txt.split('|'); tcur.textContent = a; tdur.textContent = b; }
      if (presenceTick) presenceTick();
    });
    return root;
  };

  /* ------------------------------------------------------- écran d'entrée */
  UI.buildAgeGate = function () {
    const cfg = Bio.cfg;
    if (!cfg.ageGate.enabled || Bio.preview || store.get('age-ok', false)) return false;
    const gate = h('div', { class: 'agegate', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Vérification' },
      h('div', { class: 'agegate-box' }, Bio.icon('shield', 26), h('h2', { text: '18+' }), h('p', { text: cfg.ageGate.text || 'Cette page est réservée aux adultes.' }),
        h('div', { class: 'agegate-btns' },
          h('button', { type: 'button', class: 'ag-btn primary', text: 'J’ai 18 ans ou plus', onclick: () => { store.set('age-ok', true); gate.remove(); document.body.classList.remove('gated'); } }),
          h('a', { class: 'ag-btn', href: 'https://www.google.com', text: 'Quitter' }))));
    document.body.append(gate);
    document.body.classList.add('gated');
    return true;
  };

  UI.buildSplash = function () {
    const cfg = Bio.cfg, s = $('#splash');
    s.textContent = '';
    if (!cfg.splash.enabled || Bio.preview) { s.hidden = true; return; }
    s.append(h('div', { class: 'splash-inner' },
      h('div', { class: 'splash-name', 'aria-hidden': 'true' }),
      h('div', { class: 'splash-cta' }, h('span', { text: cfg.splash.text })),
      h('div', { class: 'splash-hint' }, Bio.icon('headphones', 13), h('span', { text: 'avec le son, c’est mieux' }))));
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
    const el = $('#chip-views');
    if (!el) return;
    if (Bio.util.reduceMotion()) { el.textContent = UI.viewsText; return; }
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
    const col = $('#column');
    let tx = 0, ty = 0, cx = 0, cy = 0, hasPointer = false;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      hasPointer = true;
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
      if (document.documentElement.dataset.border === 'spotlight') {
        $$('.widget', col).forEach((w) => {
          const r = w.getBoundingClientRect();
          w.style.setProperty('--mx', e.clientX - r.left + 'px');
          w.style.setProperty('--my', e.clientY - r.top + 'px');
        });
      }
    }, { passive: true });
    document.addEventListener('mouseleave', () => { tx = ty = 0; });
    Bio.frame((dt) => {
      const on = Bio.cfg.effects.tilt && hasPointer && !Bio.util.reduceMotion();
      const k = 1 - Math.pow(0.0005, dt);
      cx += ((on ? tx : 0) - cx) * k;
      cy += ((on ? ty : 0) - cy) * k;
      const k2 = Bio.cfg.effects.tiltStrength;
      col.style.transform = on || Math.abs(cx) + Math.abs(cy) > 0.0005 ? `rotateX(${(-cy * 4 * k2).toFixed(3)}deg) rotateY(${(cx * 5 * k2).toFixed(3)}deg)` : '';
      col.style.setProperty('--bass', Bio.level.bass.toFixed(3));
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
      el.style.transform = `translate(${(dx * 6).toFixed(1)}px, ${(dy * 5).toFixed(1)}px)`;
    }, { passive: true });
    document.addEventListener('mouseleave', release);
    // étincelles au clic sur un lien + onde (ripple)
    const ripples = $('#ripples');
    addEventListener('pointerdown', (e) => {
      if (Bio.cfg.effects.trail && e.target.closest && e.target.closest('.link,.social,.p-btn,.tool')) Bio.fx.burst(e.clientX, e.clientY, 14, { speed: 150 });
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
    else if (/^(card\.|effects\.|page\.|font|nameStyle|linkStyle|avatarShape|avatarRing|customCss|seo\.)/.test(path)) UI.applyCard();
    else if (path === 'banner' || path === 'about') Bio.applyConfig(Bio.cfg);
  };

  UI.init = function () {
    UI.build();
    UI.buildAgeGate();
    UI.buildSplash();
    UI.initTilt();
    UI.initPointer();
    UI.initTitle();
    setInterval(UI.tickClock, 15000);
    Bio.on('presence', UI.renderPresence);
    Bio.on('roblox', UI.renderRoblox);
    Bio.on('osu', UI.renderOsu);
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
