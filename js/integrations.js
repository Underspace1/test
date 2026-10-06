/* ==========================================================================
   integrations.js — Roblox (API publique via miroir CORS), osu! (endpoint
   fourni), lecteur intégré (Spotify / SoundCloud / YouTube / Apple Music)
   Émet 'roblox' et 'osu' avec des données normalisées. Tout texte reçu est
   inséré comme texte ; les images ne sont acceptées que depuis les CDN connus.
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;
  const I = (Bio.integrations = { roblox: null, osu: null, token: 0 });

  const num = (v) => (Number.isFinite(+v) ? +v : 0);
  const str = (v) => (v == null ? '' : String(v)).slice(0, 80);
  const getJSON = async (url, init) => {
    const r = await fetch(url, Object.assign({ cache: 'no-store' }, init || {}));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  };

  /* ---------- drapeau à partir du code pays (FR → 🇫🇷) ---------- */
  I.flag = (cc) => {
    const c = String(cc || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(c)) return '';
    return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
  };

  /* ================================================================ Roblox */
  I.robloxStatic = (c) => ({
    id: /^\d+$/.test(String(c.id)) ? String(c.id) : '',
    name: str(c.username), displayName: str(c.displayName || c.username),
    friends: num(c.friends), followers: num(c.followers),
    avatar: /^https:\/\/[\w.-]+\.rbxcdn\.com\//.test(c.avatar || '') || /^(assets\/|data:image\/)/.test(c.avatar || '') ? c.avatar : '',
    presence: null, live: false,
  });
  I.PRESENCE = { 0: 'offline', 1: 'online', 2: 'ingame', 3: 'studio' };

  I.fetchRoblox = async function (c, token) {
    const data = I.robloxStatic(c);
    const base = (svc) => (c.proxy ? c.proxy + 'https://' + svc + '.roblox.com' : 'https://' + svc + '.roproxy.com');
    try {
      if (!data.id && data.name) {
        const j = await getJSON(base('users') + '/v1/usernames/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ usernames: [data.name], excludeBannedUsers: false }) });
        if (j.data && j.data[0]) data.id = String(j.data[0].id);
      }
      if (!data.id) return data;
      const id = data.id;
      const [user, fr, fo, th, pr] = await Promise.allSettled([
        getJSON(base('users') + '/v1/users/' + id),
        getJSON(base('friends') + '/v1/users/' + id + '/friends/count'),
        getJSON(base('friends') + '/v1/users/' + id + '/followers/count'),
        getJSON(base('thumbnails') + '/v1/users/avatar-headshot?userIds=' + id + '&size=150x150&format=Png&isCircular=false'),
        getJSON(base('presence') + '/v1/presence/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userIds: [Number(id)] }) }),
      ]);
      if (token !== I.token) return null;
      if (user.status === 'fulfilled') { data.name = str(user.value.name) || data.name; data.displayName = str(user.value.displayName) || data.displayName; data.created = user.value.created; data.live = true; }
      if (fr.status === 'fulfilled' && fr.value.count != null) data.friends = num(fr.value.count);
      if (fo.status === 'fulfilled' && fo.value.count != null) data.followers = num(fo.value.count);
      if (th.status === 'fulfilled' && th.value.data && th.value.data[0] && /^https:\/\/[\w.-]+\.rbxcdn\.com\//.test(th.value.data[0].imageUrl || '')) data.avatar = th.value.data[0].imageUrl;
      if (pr.status === 'fulfilled' && pr.value.userPresences && pr.value.userPresences[0]) {
        const p = pr.value.userPresences[0];
        data.presence = { type: I.PRESENCE[p.userPresenceType] || 'offline', where: str(p.lastLocation) };
      }
    } catch (e) { /* on garde les valeurs statiques */ }
    return data;
  };

  /* =================================================================== osu! */
  I.MODES = { osu: 'osu!standard', taiko: 'osu!taiko', fruits: 'osu!catch', mania: 'osu!mania' };
  I.osuStatic = (c) => ({
    id: /^\d+$/.test(String(c.id)) ? String(c.id) : '',
    name: str(c.username), mode: I.MODES[c.mode] ? c.mode : 'osu', country: String(c.country || '').toUpperCase().slice(0, 2),
    rank: num(c.rank), countryRank: num(c.countryRank), pp: num(c.pp), accuracy: num(c.accuracy), playcount: num(c.playcount), level: num(c.level),
    avatar: /^https:\/\/a\.ppy\.sh\//.test(c.avatar || '') || /^(assets\/|data:image\/)/.test(c.avatar || '') ? c.avatar : (/^\d+$/.test(String(c.id)) ? 'https://a.ppy.sh/' + c.id : ''),
    live: false,
  });

  /* L'endpoint renvoie soit la réponse brute de l'API osu! v2 (GET /users/{id}/{mode}), soit un objet simplifié
     { username, id, avatar_url, country_code, global_rank, country_rank, pp, hit_accuracy, play_count, level } */
  I.fetchOsu = async function (c, token) {
    const data = I.osuStatic(c);
    if (!/^https:\/\//.test(c.endpoint || '')) return data;
    try {
      const u = await getJSON(c.endpoint);
      if (token !== I.token) return null;
      const st = u.statistics || u;
      data.name = str(u.username) || data.name;
      if (/^\d+$/.test(String(u.id || ''))) data.id = String(u.id);
      data.country = String((u.country_code || (u.country && u.country.code) || data.country || '')).toUpperCase().slice(0, 2);
      if (/^https:\/\/a\.ppy\.sh\//.test(u.avatar_url || '')) data.avatar = u.avatar_url;
      else if (data.id && !data.avatar) data.avatar = 'https://a.ppy.sh/' + data.id;
      data.rank = num(st.global_rank) || data.rank;
      data.countryRank = num(st.country_rank) || data.countryRank;
      data.pp = num(st.pp) || data.pp;
      data.accuracy = num(st.hit_accuracy) || data.accuracy;
      data.playcount = num(st.play_count) || data.playcount;
      data.level = num(st.level && st.level.current != null ? st.level.current : st.level) || data.level;
      if (u.playmode && I.MODES[u.playmode]) data.mode = u.playmode;
      data.live = true;
    } catch (e) { /* valeurs statiques */ }
    return data;
  };

  /* ================================================== lecteur intégré (iframe) */
  /* Construit une URL d'intégration sûre à partir d'un lien de partage. Retourne null si le lien n'est pas reconnu. */
  I.embed = (raw) => {
    let u;
    try { u = new URL(String(raw || '').trim()); } catch (e) { return null; }
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.replace(/^www\./, '');
    const seg = u.pathname.split('/').filter(Boolean);
    if (host === 'open.spotify.com') {
      const i = seg.findIndex((s) => ['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(s));
      if (i < 0 || !/^[A-Za-z0-9]{10,40}$/.test(seg[i + 1] || '')) return null;
      const type = seg[i];
      return { provider: 'spotify', label: 'Spotify', src: `https://open.spotify.com/embed/${type}/${seg[i + 1]}?theme=0`, height: type === 'track' || type === 'episode' ? 152 : 352 };
    }
    if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
      return { provider: 'soundcloud', label: 'SoundCloud', src: 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(u.origin + u.pathname) + '&color=%23ffffff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false', height: 166 };
    }
    if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const list = u.searchParams.get('list');
      let id = host === 'youtu.be' ? seg[0] : u.searchParams.get('v');
      if (!id && seg[0] === 'shorts') id = seg[1];
      if (list && /^[\w-]{10,60}$/.test(list) && !id) return { provider: 'youtube', label: 'YouTube', src: 'https://www.youtube-nocookie.com/embed/videoseries?list=' + list, ratio: 16 / 9 };
      if (!/^[\w-]{11}$/.test(id || '')) return null;
      return { provider: 'youtube', label: 'YouTube', src: 'https://www.youtube-nocookie.com/embed/' + id + (list && /^[\w-]{10,60}$/.test(list) ? '?list=' + list : ''), ratio: 16 / 9 };
    }
    if (host === 'music.apple.com' || host === 'embed.music.apple.com') {
      if (!/^\/[a-z]{2}\/(album|playlist|song|artist)\//.test(u.pathname)) return null;
      const song = u.searchParams.get('i');
      const path = u.pathname.split('/').map((p) => encodeURIComponent(decodeURIComponent(p))).join('/');
      return { provider: 'applemusic', label: 'Apple Music', src: 'https://embed.music.apple.com' + path + (song && /^\d+$/.test(song) ? '?i=' + song : '') + (song ? '&' : '?') + 'theme=dark', height: song || seg[1] === 'song' ? 175 : 450 };
    }
    if (host === 'deezer.com' || host === 'deezer.page.link') {
      const i = seg.findIndex((s) => ['track', 'album', 'playlist'].includes(s));
      if (i < 0 || !/^\d+$/.test(seg[i + 1] || '')) return null;
      return { provider: 'deezer', label: 'Deezer', src: `https://widget.deezer.com/widget/dark/${seg[i]}/${seg[i + 1]}`, height: seg[i] === 'track' ? 150 : 350 };
    }
    return null;
  };

  /* ================================================================== init */
  I.init = function (cfg) {
    const token = ++I.token;
    const r = cfg.roblox || {}, o = cfg.osu || {};
    const shown = (id) => Array.isArray(cfg.layout) && cfg.layout.includes(id);
    I.roblox = shown('roblox') && (r.id || r.username) ? I.robloxStatic(r) : null;
    I.osu = shown('osu') && (o.username || o.id) ? I.osuStatic(o) : null;
    Bio.emit('roblox', I.roblox);
    Bio.emit('osu', I.osu);
    if (I.roblox && r.live !== false && !Bio.preview) I.fetchRoblox(r, token).then((d) => { if (d && token === I.token) { I.roblox = d; Bio.emit('roblox', d); } });
    if (I.osu && o.endpoint && !Bio.preview) I.fetchOsu(o, token).then((d) => { if (d && token === I.token) { I.osu = d; Bio.emit('osu', d); } });
  };
})();
