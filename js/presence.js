/* ==========================================================================
   presence.js — présence Discord en direct (API publique Lanyard) + mode démo
   Émet l'événement 'presence' avec un objet normalisé :
   { status, custom:{emoji,text}|null, activity:{…}|null, spotify:{…}|null }
   ========================================================================== */
(function () {
  'use strict';
  const Bio = window.Bio;

  const ACTIVITY_LABELS = { 0: 'Joue à', 1: 'En live sur', 3: 'Regarde', 5: 'Compétition' };

  function activityImage(a) {
    const img = a.assets && (a.assets.large_image || a.assets.small_image);
    if (!img) return '';
    if (img.startsWith('mp:external/')) return 'https://media.discordapp.net/' + img.slice(3);
    if (img.startsWith('mp:')) return '';
    if (a.application_id) return `https://cdn.discordapp.com/app-assets/${a.application_id}/${img}.png`;
    return '';
  }

  function normalize(d) {
    const out = { status: d.discord_status || 'offline', custom: null, activity: null, spotify: null, user: d.discord_user || null };
    for (const a of d.activities || []) {
      if (a.type === 4) out.custom = { emoji: (a.emoji && a.emoji.name) || '', text: a.state || '' };
      else if (a.type === 2 && a.name === 'Spotify') continue;
      else if (!out.activity && ACTIVITY_LABELS[a.type]) {
        out.activity = {
          label: ACTIVITY_LABELS[a.type], name: a.name || '', details: a.details || '', state: a.state || '',
          image: activityImage(a), start: a.timestamps && a.timestamps.start ? a.timestamps.start : 0,
        };
      }
    }
    if (d.listening_to_spotify && d.spotify) {
      const s = d.spotify, st = s.timestamps || {};
      out.spotify = {
        label: 'Écoute sur Spotify', song: s.song || '', artist: (s.artist || '').replace(/;/g, ','), art: s.album_art_url || '',
        progress: () => (st.end > st.start ? Bio.util.clamp((Date.now() - st.start) / (st.end - st.start), 0, 1) : 0),
      };
    }
    return out;
  }

  const P = (Bio.presence = { data: null, ws: null, hb: 0, retry: 0, mode: 'off' });

  P.set = function (data) {
    this.data = data;
    Bio.emit('presence', data);
  };

  /* --- mode démo : reflète le lecteur local --- */
  P.demo = function () {
    this.mode = 'demo';
    const started = Date.now() - 47 * 60 * 1000;
    const build = () => {
      const pl = Bio.player;
      const tr = pl && pl.track;
      const data = {
        status: 'online',
        custom: { emoji: '', text: 'code & chill' },
        activity: { label: 'Joue à', name: 'Visual Studio Code', details: 'Édite config.js', state: 'Espace de travail : biolink', image: '', start: started },
        spotify: null,
      };
      if (pl && pl.playing && tr) {
        data.spotify = {
          label: 'Écoute en ce moment', song: tr.title, artist: tr.artist, art: tr.cover || '',
          progress: () => pl.progress(),
        };
      }
      return data;
    };
    this.set(build());
    Bio.on('player', () => { if (this.mode === 'demo') this.set(build()); });
  };

  /* --- Lanyard : WebSocket avec reprise, REST en secours --- */
  P.rest = async function (id) {
    try {
      const res = await fetch('https://api.lanyard.rest/v1/users/' + encodeURIComponent(id));
      const j = await res.json();
      if (j.success) this.set(normalize(j.data));
      else if (j.error && j.error.message) console.warn('[bio] Lanyard :', j.error.message);
    } catch (e) { /* hors-ligne */ }
  };

  P.connect = function (id) {
    this.mode = 'live';
    let ws;
    try { ws = new WebSocket('wss://api.lanyard.rest/socket'); } catch (e) { this.rest(id); return; }
    this.ws = ws;
    ws.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.op === 1) {
        clearInterval(this.hb);
        this.hb = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ op: 3 })); }, m.d.heartbeat_interval || 30000);
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: id } }));
      } else if (m.op === 0 && m.d) {
        this.retry = 0;
        this.set(normalize(m.d));
      }
    };
    ws.onclose = () => {
      clearInterval(this.hb);
      if (this.mode !== 'live') return;
      if (!this.data) this.rest(id);
      const wait = Math.min(30000, 2000 * Math.pow(2, this.retry++));
      setTimeout(() => this.mode === 'live' && this.connect(id), wait);
    };
    ws.onerror = () => ws.close();
  };

  P.init = function (cfg) {
    const d = cfg.discord || {};
    if (d.id && /^\d{5,25}$/.test(String(d.id))) this.connect(String(d.id));
    else if (d.demo) this.demo();
    else this.set(null);
  };
})();
