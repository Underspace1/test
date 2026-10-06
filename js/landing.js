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

  /* ------------------------------------------------------------ sections */
  (site.sections || []).forEach((s) => {
    const body = [];
    if (s.showcase) body.push(buildCards3());
    body.push(h('div', { class: 'grid' }, (s.items || []).map((it) => h('article', { class: 'feat reveal' },
      h('span', { class: 'f-ico' }, Bio.icon(Bio.hasIcon(it.icon) ? it.icon : 'sparkles', 19)), h('h3', { text: it.title }), h('p', { text: it.text })))));
    main.append(h('section', { class: 'sec', id: s.id }, h('div', { class: 'wrap' },
      h('div', { class: 'sec-head' + (s.center ? ' center' : '') }, s.kicker ? h('p', { class: 'k', text: s.kicker }) : null, h('h2', { text: s.title }), s.subtitle ? h('p', { text: s.subtitle }) : null), ...body)));
  });

  function buildCards3() {
    const picks = [Bio.presets.find((p) => p.id === 'synthwave'), Bio.presets.find((p) => p.id === 'drift'), Bio.presets.find((p) => p.id === 'sakura')].filter(Boolean);
    return h('div', { class: 'cards3' }, picks.map((p, i) => {
      const mono = p.cfg.background && p.cfg.background.mono;
      return h('div', { class: 'mini reveal', style: { '--c1': p.colors[0], '--c2': p.colors[1] } },
        h('div', { class: 'bgfx' + (mono ? ' mono' : '') }), p.cfg.decor && p.cfg.decor.dots ? h('div', { class: 'dots' }) : null,
        h('div', { class: 'inner' },
          h('div', { class: 'w p' }, h('span', { class: 'av' }), h('span', { class: 'nm', text: ['Aggelos', cfg.displayName, 'Lynn'][i] }), h('span', { class: 'tg', text: ['dev @ botforge', 'click & sleep', 'just doing stuff'][i] }), h('span', { class: 'ic' }, h('i'), h('i'), h('i'), h('i'))),
          h('div', { class: 'w m' }, h('i'), h('span', {}, h('b', { text: ['Chrome Beretta', 'Midnight Drive', 'Heaven With No M…'][i] }), h('small', { text: ['Softwilly', 'lo-fi · généré en direct', 'Yung Lean'][i] }))),
          h('div', { class: 'w l' }, h('i'), ['Mon serveur', 'Mon portfolio', 'My website'][i]),
          h('div', { class: 'w l' }, h('i'), ['Discord', 'Me contacter', 'Instagram'][i])),
        h('span', { class: 'tag', text: 'modèle ' + p.label }));
    }));
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
