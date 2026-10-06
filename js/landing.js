/* ==========================================================================
   landing.js — page d'accueil : nav, hero, vitrine, sections, tarifs, FAQ
   Contenu : site.js (window.BIO_SITE). Plan actif et liens de paiement : config.js
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const U = Bio.util;
  const { $, h } = U;
  const site = window.BIO_SITE || {};
  const cfg = Bio.normalize(window.BIO_CONFIG || {});
  const plan = (cfg.premium && cfg.premium.plan) || 'free';
  const checkout = (cfg.premium && cfg.premium.checkout) || {};
  const fmtEur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
  const TIER_ICON = { free: 'user', premium: 'sparkles', vip: 'crown' };
  const PRESET_COLORS = Bio.presets.slice(0, 3).map((p) => p.colors);

  /* ------------------------------------------------------------ nav */
  const nav = $('#l-nav');
  nav.append(h('div', { class: 'wrap' },
    h('a', { class: 'brand', href: '#top' }, h('span', { class: 'brand-mark', text: '✦' }), 'biolink'),
    h('nav', { class: 'l-links', 'aria-label': 'Sections' }, (site.nav || []).map((n) => h('a', { href: n.href, text: n.label }))),
    h('span', { class: 'spacer' }),
    h('div', { class: 'nav-cta' },
      h('a', { class: 'btn ghost sm', href: 'profile.html', text: site.navDemo || 'Voir la démo' }),
      h('a', { class: 'btn primary sm', href: 'dashboard.html', text: site.navCta || 'Ouvrir le dashboard' }))));

  /* ------------------------------------------------------------ hero */
  const main = $('#l-main');
  main.id = 'top';
  const hero = site.hero || {};
  const titleParts = String(hero.title || 'Ton profil. Ton style.').split(/(?<=\.)\s+/);
  const h1 = h('h1', {}, titleParts.map((t, i) => h('span', { class: i ? 'dim' : null, text: (i ? ' ' : '') + t })));
  const avatars = h('span', { class: 'avatars' }, PRESET_COLORS.map((c) => h('i', { style: { '--c1': c[0], '--c2': c[1] } })));
  main.append(h('section', { class: 'hero' }, h('div', { class: 'wrap' },
    h('a', { class: 'pill', href: '#tarifs' }, avatars, h('span', { text: hero.badge || 'Rejoins les créateurs qui utilisent biolink' }), Bio.icon('arrow', 14)),
    h1,
    h('p', { class: 'sub', text: hero.subtitle || '' }),
    h('div', { class: 'ctas' },
      h('a', { class: 'btn primary lg', href: 'dashboard.html' }, hero.primaryCta || 'Commencer', Bio.icon('arrow', 16)),
      h('a', { class: 'btn lg', href: 'profile.html', text: hero.secondaryCta || 'Voir la démo' })),
    hero.hint ? h('p', { class: 'hint', text: hero.hint }) : null,
    buildShowcase())));

  function buildShowcase() {
    const fake = h('div', { class: 'fake' },
      h('div', { class: 'hero-fake' }, h('b', { text: 'Bonjour, ' + cfg.displayName + ' !' }), h('p', { text: 'Tout ce que tu changes s’affiche en direct dans l’aperçu.' })),
      h('div', { class: 'row' }, [['URL', '/' + cfg.username], ['Vues', new Intl.NumberFormat('fr-FR').format(cfg.views.base || 0)], ['Widgets', cfg.layout.length + ' / ' + Object.keys(Bio.widgets).length], ['Plan', (site.pricing && (site.pricing.tiers || []).find((t) => t.id === plan) || {}).name || plan]].map(([k, v]) => h('div', { class: 'tile' }, h('small', { text: k }), h('b', { text: v })))),
      h('div', { class: 'list' }, ['Profil · bannière, avatar, accroche', 'Disposition · 9 widgets réordonnables', 'Apparence · modèles, couleurs, polices', 'Intégrations · Discord, Roblox, osu!, musique'].map((t) => h('div', {}, h('i'), t))));
    const dash = h('div', { class: 'show-dash' }, h('div', { class: 'bar' }, h('i'), h('i'), h('i'), h('span', { text: 'dashboard.html' })), fake);
    const phone = h('div', { class: 'show-phone' });
    const frame = h('iframe', { src: 'profile.html?preview=1', title: 'Aperçu du profil', loading: 'lazy', tabindex: '-1' });
    phone.append(frame);
    let last = '';
    const fit = () => {
      const w = phone.clientWidth || 300, hh = phone.clientHeight || 560, s = w / 390;
      const key = w + 'x' + hh;
      if (key === last) return;
      last = key;
      frame.style.width = '390px'; frame.style.height = Math.round(hh / s) + 'px'; frame.style.transform = 'scale(' + s + ')'; frame.style.transformOrigin = 'top left';
    };
    fit();
    addEventListener('resize', fit);
    addEventListener('load', fit);
    requestAnimationFrame(fit);
    return h('div', { class: 'showcase' }, dash, phone);
  }

  /* ------------------------------------------------------------ slides (scroll) */
  const VISUALS = {
    personnalisation: () => buildCards3(),
    widgets: () => buildWidgetsVisual(),
    dashboard: () => buildDashVisual(),
    statique: () => buildCodeVisual(),
  };
  const sections = site.sections || [];
  const storySlides = sections.map((s) => ({ id: s.id, kicker: s.kicker || '', title: s.title, text: s.subtitle || '', visual: VISUALS[s.id] || (() => null), bullets: (s.items || []).slice(0, 3).map((i) => i.title) }));
  if (storySlides.length) main.append(buildStory(storySlides));

  function buildStory(slides) {
    const N = slides.length;
    const dots = h('div', { class: 'story-dots', role: 'tablist', 'aria-label': 'Diapositives' });
    const bar = h('div', { class: 'story-bar' }, h('i'));
    const els = slides.map((sl, i) => {
      const el = h('article', { class: 'slide', 'data-i': i, id: sl.id, 'aria-hidden': i === 0 ? 'false' : 'true' },
        h('div', { class: 'slide-text' },
          h('p', { class: 'k' }, h('span', { class: 'num', text: String(i + 1).padStart(2, '0') }), sl.kicker),
          h('h2', { text: sl.title }), h('p', { class: 'lead', text: sl.text }),
          sl.bullets.length ? h('ul', { class: 'slide-bullets' }, sl.bullets.map((b) => h('li', {}, Bio.icon('check', 14), h('span', { text: b })))) : null),
        h('div', { class: 'slide-visual' }, sl.visual()));
      const dot = h('button', { type: 'button', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false', 'aria-label': sl.title, 'data-i': i });
      dot.addEventListener('click', () => scrollToSlide(i));
      dots.append(dot);
      return el;
    });
    const pin = h('div', { class: 'story-pin' }, h('div', { class: 'story-stage' }, els), dots, bar,
      h('div', { class: 'story-hint' }, Bio.icon('down', 14), h('span', { text: 'Fais défiler' })));
    const story = h('section', { class: 'story', id: 'presentation', style: { '--n': N } }, pin);

    let current = -1;
    const setActive = (idx, local) => {
      els.forEach((el, i) => {
        el.classList.toggle('is-active', i === idx);
        el.classList.toggle('is-prev', i < idx);
        el.classList.toggle('is-next', i > idx);
        el.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
        if (i === idx) el.style.setProperty('--local', local.toFixed(3));
      });
      if (idx !== current) { current = idx; dots.querySelectorAll('button').forEach((d, i) => d.setAttribute('aria-selected', i === idx ? 'true' : 'false')); }
      bar.firstChild.style.transform = 'scaleX(' + ((idx + local) / N).toFixed(4) + ')';
      pin.classList.toggle('at-end', idx === N - 1 && local > 0.6);
    };
    const pinned = () => matchMedia('(min-width: 701px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)').matches;
    const update = () => {
      if (!pinned()) { story.classList.add('flat'); els.forEach((el) => { el.classList.add('is-active'); el.classList.remove('is-prev', 'is-next'); el.setAttribute('aria-hidden', 'false'); }); return; }
      story.classList.remove('flat');
      const top = story.getBoundingClientRect().top + scrollY;
      const span = story.offsetHeight - innerHeight;
      const p = U.clamp((scrollY - top) / Math.max(1, span), 0, 0.9999);
      const idx = Math.floor(p * N);
      setActive(idx, p * N - idx);
    };
    function scrollToSlide(i) {
      const top = story.getBoundingClientRect().top + scrollY;
      const span = story.offsetHeight - innerHeight;
      window.scrollTo({ top: Math.round(top + (span * (i + 0.15)) / N), behavior: 'smooth' });
    }
    let ticking = false;
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); } }, { passive: true });
    addEventListener('resize', update);
    addEventListener('keydown', (e) => {
      if (!pinned() || story.classList.contains('flat')) return;
      const r = story.getBoundingClientRect();
      if (r.top > innerHeight * 0.5 || r.bottom < innerHeight * 0.5) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { if (current < N - 1) { e.preventDefault(); scrollToSlide(current + 1); } }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { if (current > 0) { e.preventDefault(); scrollToSlide(current - 1); } }
    });
    requestAnimationFrame(update);
    setTimeout(update, 80);
    return story;
  }

  /* visuels des slides */
  function buildCards3() {
    const picks = [Bio.presets.find((p) => p.id === 'synthwave'), Bio.presets.find((p) => p.id === 'drift'), Bio.presets.find((p) => p.id === 'sakura')].filter(Boolean);
    return h('div', { class: 'cards3' }, picks.map((p, i) => {
      const mono = p.cfg.background && p.cfg.background.mono;
      return h('div', { class: 'mini', style: { '--c1': p.colors[0], '--c2': p.colors[1] } },
        h('div', { class: 'bgfx' + (mono ? ' mono' : '') }), p.cfg.decor && p.cfg.decor.dots ? h('div', { class: 'dots' }) : null,
        h('div', { class: 'inner' },
          h('div', { class: 'w p' }, h('span', { class: 'av' }), h('span', { class: 'nm', text: ['Aggelos', cfg.displayName, 'Lynn'][i] }), h('span', { class: 'tg', text: ['dev @ botforge', cfg.bio[0] || 'click & sleep', 'just doing stuff'][i] }), h('span', { class: 'ic' }, h('i'), h('i'), h('i'), h('i'))),
          h('div', { class: 'w m' }, h('i'), h('span', {}, h('b', { text: ['Chrome Beretta', 'Midnight Drive', 'Heaven With No M…'][i] }), h('small', { text: ['Softwilly', 'lo-fi · généré en direct', 'Yung Lean'][i] }))),
          h('div', { class: 'w l' }, h('i'), ['Mon serveur', 'Mon portfolio', 'My website'][i]),
          h('div', { class: 'w l' }, h('i'), ['Discord', 'Me contacter', 'Instagram'][i])),
        h('span', { class: 'tag', text: 'modèle ' + p.label }));
    }));
  }
  function buildWidgetsVisual() {
    const w = (cls, ...kids) => h('div', { class: 'vw ' + cls }, ...kids);
    return h('div', { class: 'vis vis-widgets' },
      w('float a', h('div', { class: 'vw-row' }, h('span', { class: 'vw-av' }), h('div', {}, h('b', { text: cfg.discord.tag || cfg.username }), h('small', { text: 'En ligne · joue à Visual Studio Code' })), h('span', { class: 'vw-dot on' }))),
      w('float b', h('div', { class: 'vw-row' }, h('span', { class: 'vw-av sq' }), h('div', {}, h('b', { text: cfg.roblox.displayName || 'Roblox' }), h('small', { text: (cfg.roblox.friends || 291) + ' amis · ' + (cfg.roblox.followers || 60) + ' abonnés' })), h('span', { class: 'vw-dot game' }))),
      w('float c', h('div', { class: 'vw-row' }, h('span', { class: 'vw-av sq' }), h('div', {}, h('b', { text: (cfg.osu.username || 'osu!') + ' 🇫🇷' }), h('small', { text: '#' + new Intl.NumberFormat('fr-FR').format(cfg.osu.rank || 48213) + ' · ' + (cfg.osu.pp || 4210) + ' pp · ' + (cfg.osu.accuracy || 98.12) + ' %' })))),
      w('float d', h('div', { class: 'vw-row' }, h('span', { class: 'vw-av music' }, Bio.icon('music', 16)), h('div', {}, h('b', { text: 'Midnight Drive' }), h('small', { text: 'lo-fi · généré en direct' })), h('span', { class: 'vw-eq' }, h('i'), h('i'), h('i')))),
      h('div', { class: 'vis-orbit' }));
  }
  function buildDashVisual() {
    const tile = (k, v) => h('div', { class: 'vd-tile' }, h('small', { text: k }), h('b', { text: v }));
    return h('div', { class: 'vis vis-dash' },
      h('div', { class: 'vd-side' }, ['Profil', 'Disposition', 'Apparence', 'Fond & effets', 'Liens', 'Abonnement'].map((t, i) => h('span', { class: i === 2 ? 'on' : '', text: t }))),
      h('div', { class: 'vd-main' },
        h('div', { class: 'vd-row' }, tile('Vues', new Intl.NumberFormat('fr-FR').format(cfg.views.base || 0)), tile('Widgets', cfg.layout.length + ' / ' + Object.keys(Bio.widgets).length), tile('Plan', (Bio.plans[plan] || Bio.plans.free).label)),
        h('div', { class: 'vd-field' }, h('span', { text: 'Thème' }), h('span', { class: 'vd-sw' }, Object.values(Bio.themes).slice(0, 6).map((t) => h('i', { style: { background: 'linear-gradient(135deg,' + t.a + ',' + t.b + ')' } })))),
        h('div', { class: 'vd-field' }, h('span', { text: 'Police' }), h('span', { class: 'vd-seg' }, ['Inter', 'Syne', 'Sora'].map((f, i) => h('b', { class: i === 1 ? 'on' : '', text: f })))),
        h('div', { class: 'vd-field' }, h('span', { text: 'Opacité' }), h('span', { class: 'vd-range' }, h('i')))),
      h('div', { class: 'vd-phone' }, h('span', { class: 'av' }), h('b', { text: cfg.displayName }), h('small', { text: cfg.bio[0] || '' }), h('span', { class: 'line' }), h('span', { class: 'line' }), h('span', { class: 'line short' })));
  }
  function buildCodeVisual() {
    const lines = [
      ['c', '/* config.js — tout ton profil tient ici */'],
      ['k', 'window.BIO_CONFIG', ' = {'],
      ['p', '  displayName', ': ', 's', '\'' + cfg.displayName + '\'', ','],
      ['p', '  layout', ': [', 's', '\'profile\', \'discord\', \'music\', \'links\'', '],'],
      ['p', '  theme', ': ', 's', '\'white\'', ',  ', 'c', '// 9 thèmes'],
      ['p', '  premium', ': { ', 'p', 'plan', ': ', 's', '\'premium\'', ' },'],
      ['k', '}', ';'],
    ];
    const code = h('pre', { class: 'vis vis-code' }, lines.map((l) => { const row = h('span', { class: 'row' }); for (let i = 0; i < l.length; i += 2) { if (l[i].length === 1 && i + 1 < l.length && typeof l[i + 1] === 'string' && l[i].match(/[ckps]/)) row.append(h('span', { class: 't-' + l[i], text: l[i + 1] })); else row.append(document.createTextNode(l[i])); } return row; }));
    const hosts = h('div', { class: 'vis-hosts' }, ['GitHub Pages', 'Netlify', 'Vercel', 'Cloudflare'].map((t) => h('span', { text: t })));
    return h('div', { class: 'vis-stack' }, code, hosts);
  }

  /* ------------------------------------------------------------ tout ce qui est inclus */
  const allItems = sections.flatMap((s) => s.items || []);
  if (allItems.length) {
    main.append(h('section', { class: 'sec', id: 'fonctionnalites' }, h('div', { class: 'wrap' },
      h('div', { class: 'sec-head center' }, h('p', { class: 'k', text: 'Tout ce qui est inclus' }), h('h2', { text: site.featuresTitle || 'Chaque détail, du premier pixel au dernier widget' }), site.featuresSubtitle ? h('p', { text: site.featuresSubtitle }) : null),
      h('div', { class: 'grid compact' }, allItems.map((it) => h('article', { class: 'feat reveal' },
        h('span', { class: 'f-ico' }, Bio.icon(Bio.hasIcon(it.icon) ? it.icon : 'sparkles', 17)), h('div', {}, h('h3', { text: it.title }), h('p', { text: it.text }))))))));
  }

  /* ------------------------------------------------------------ tarifs */
  const pr = site.pricing || { tiers: [] };
  let yearly = false;
  const tiersEl = h('div', { class: 'tiers' });
  const renderTiers = () => {
    tiersEl.textContent = '';
    (pr.tiers || []).forEach((t) => {
      const isFree = !t.priceMonth;
      const price = yearly ? t.priceYear : t.priceMonth;
      const per = isFree ? '' : yearly ? '/an' : '/mois';
      const note = isFree ? (t.freeNote || 'pour toujours') : yearly ? 'soit ' + fmtEur(Math.round((t.priceYear / 12) * 100) / 100) + ' par mois' : 'ou ' + fmtEur(t.priceYear) + ' par an';
      const current = t.id === plan;
      let href = 'dashboard.html', label = t.cta;
      if (!isFree) { href = checkout[t.id] || pr.fallbackUrl || 'dashboard.html#s-abonnement'; }
      const card = h('article', { class: 'tier reveal' + (t.highlight ? ' hl' : ''), 'data-tier': t.id },
        t.highlight ? h('span', { class: 'ribbon', text: t.ribbon || 'Le plus choisi' }) : null,
        h('div', { class: 't-head' }, h('h3', {}, t.name), h('span', { class: 't-badge' }, Bio.icon(t.icon || TIER_ICON[t.id] || 'star', 15))),
        h('p', { class: 'tag', text: t.tagline || '' }),
        h('div', { class: 'price' }, h('b', { text: fmtEur(price || 0) }), per ? h('span', { text: per }) : null, h('small', { text: note })),
        h('ul', {}, (t.features || []).map((f) => h('li', {}, Bio.icon('check', 15), h('span', { text: f })))),
        current ? h('p', { class: 'current', text: 'Ton plan actuel' }) : null,
        h('a', { class: 'btn cta block' + (t.highlight ? ' primary' : ''), href, target: /^https?:/.test(href) ? '_blank' : null, rel: /^https?:/.test(href) ? 'noopener noreferrer' : null, text: current && !isFree ? 'Gérer mon abonnement' : label }));
      tiersEl.append(card);
    });
    setTimeout(() => Array.from(tiersEl.children).forEach((c) => c.classList.add('in')), 20);
  };
  const toggle = h('div', { class: 'toggle', role: 'radiogroup', 'aria-label': 'Facturation' },
    h('button', { type: 'button', role: 'radio', 'aria-checked': 'true', text: 'Mensuel' }),
    h('button', { type: 'button', role: 'radio', 'aria-checked': 'false' }, 'Annuel', h('span', { class: 'save', text: pr.yearlyNote || '-2 mois' })));
  toggle.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => { yearly = i === 1; toggle.querySelectorAll('button').forEach((x, j) => x.setAttribute('aria-checked', j === i ? 'true' : 'false')); renderTiers(); }));
  main.append(h('section', { class: 'sec', id: 'tarifs' }, h('div', { class: 'wrap' },
    h('div', { class: 'sec-head center' }, h('p', { class: 'k', text: 'Tarifs' }), h('h2', { text: pr.title || 'Simple et sans surprise' }), pr.subtitle ? h('p', { text: pr.subtitle }) : null),
    h('div', { style: { textAlign: 'center' } }, toggle), tiersEl,
    pr.note ? h('p', { class: 'hint', style: { textAlign: 'center', marginTop: '18px', color: 'var(--faint)', fontSize: '12.5px' }, text: pr.note }) : null)));
  renderTiers();

  /* ------------------------------------------------------------ FAQ */
  if ((site.faq || []).length) {
    main.append(h('section', { class: 'sec', id: 'faq' }, h('div', { class: 'wrap' },
      h('div', { class: 'sec-head center' }, h('p', { class: 'k', text: 'FAQ' }), h('h2', { text: site.faqTitle || 'Questions fréquentes' })),
      h('div', { class: 'faq' }, site.faq.map((f, i) => h('details', { open: i === 0 ? '' : null }, h('summary', {}, h('span', { text: f.q }), Bio.icon('plus', 16)), h('p', { text: f.a })))))));
  }

  /* ------------------------------------------------------------ CTA final + footer */
  const fin = site.final || {};
  main.append(h('section', { class: 'final' }, h('div', { class: 'wrap' },
    h('h2', { text: fin.title || 'Prêt à faire ta page ?' }), h('p', { text: fin.text || '' }),
    h('div', { class: 'ctas' }, h('a', { class: 'btn primary lg', href: 'dashboard.html' }, fin.cta || 'Ouvrir le dashboard', Bio.icon('arrow', 16)), h('a', { class: 'btn lg', href: 'profile.html', text: fin.secondary || 'Voir la démo' })))));
  $('#l-foot').append(h('div', { class: 'wrap' },
    h('span', { text: '© ' + new Date().getFullYear() + ' biolink · statique, sans compte, sans backend' }),
    h('nav', { class: 'links', 'aria-label': 'Pied de page' }, h('a', { href: 'profile.html', text: 'Démo' }), h('a', { href: 'dashboard.html', text: 'Dashboard' }), h('a', { href: '#tarifs', text: 'Tarifs' }), h('a', { href: '#faq', text: 'FAQ' }))));

  /* ------------------------------------------------------------ apparition au scroll */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
})();
