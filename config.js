/* ==========================================================================
   config.js — C'EST LE SEUL FICHIER À MODIFIER POUR PERSONNALISER TA PAGE

   Astuce : ouvre dashboard.html pour tout régler visuellement avec un aperçu
   en direct, puis « Télécharger config.js » et remplace ce fichier.
   Tout ce qui est marqué "optionnel" peut être supprimé sans rien casser.
   ========================================================================== */
window.BIO_CONFIG = {
  /* ---------- identité ---------- */
  username: 'nova',                 // affiché sous forme @nova
  displayName: 'Nova',              // le grand titre
  avatar: 'assets/avatar.svg',      // chemin local ou URL https://…
  banner: 'gradient',               // '' (aucune), 'gradient', ou une image : 'assets/banner.jpg'
  verified: true,                   // petite étincelle à côté du nom
  // Phrases qui s'écrivent / s'effacent en boucle sous le nom
  bio: [
    'designer · dev · insomniaque',
    'je construis des trucs bizarres et beaux',
    'café, synthés & nuits blanches',
  ],
  location: 'Paris, France',
  timezone: 'Europe/Paris',         // affiche ton heure locale en direct (optionnel)
  uid: 1,                           // ton numéro de membre
  joined: '2026-01-01',             // optionnel
  pageTitle: '@nova',               // le titre de l'onglet s'écrit lettre par lettre

  /* ---------- style ----------
     font        : 'space' | 'inter' | 'sora' | 'outfit' | 'poppins' | 'syne' | 'playfair' | 'mono'
     nameStyle   : 'shimmer' (dégradé animé) | 'neon' | 'rainbow' | 'plain'
     linkStyle   : 'glass' | 'solid' | 'outline' | 'neon'
     avatarShape : 'circle' | 'rounded' | 'hexagon'
     avatarRing  : 'gradient' (anneau tournant) | 'pulse' | 'none'                */
  font: 'space',
  nameStyle: 'shimmer',
  linkStyle: 'glass',
  avatarShape: 'circle',
  avatarRing: 'gradient',

  /* ---------- écran d'entrée ("click to enter") ---------- */
  splash: {
    enabled: true,                  // nécessaire pour lancer la musique automatiquement
    text: 'cliquer pour entrer',
  },

  /* ---------- fond ----------
     type : 'shader'  → fluide WebGL généré en direct, réagit à la musique (défaut)
            'aurora'  → voiles d'aurore boréale animés (CSS pur, très léger)
            'grid'    → grille rétro façon synthwave
            'video'   → une vidéo en boucle (mets son chemin dans src, ex. 'assets/fond.mp4')
            'image'   → une image / un gif (src)
            'none'    → dégradé simple                                          */
  background: { type: 'shader', src: '', dim: 0.25, blur: 0 },

  /* ---------- couleurs ----------
     theme : 'violet' | 'ocean' | 'ember' | 'mint' | 'sakura' | 'gold' | 'ice' | 'mono'
     accent / accent2 : surcharge perso en hexadécimal (ex. '#ff5d8f'), optionnel  */
  theme: 'violet',
  accent: '',
  accent2: '',

  /* ---------- carte ----------
     style  : 'glass' (verre dépoli) | 'solid' | 'outline' | 'neon'
     border : 'spotlight' (suit la souris) | 'gradient' (anneau animé) | 'none'   */
  card: { style: 'glass', border: 'spotlight', opacity: 0.55, blur: 22, radius: 28 },

  /* ---------- décorations ---------- */
  decor: {
    orbs: true,                     // orbes lumineuses flottantes derrière la carte
    noise: true,                    // grain fin (rend le verre plus "physique")
    vignette: true,                 // assombrit les bords
    scanlines: false,               // lignes de balayage rétro
  },

  /* ---------- effets ----------
     particles : 'fireflies' | 'snow' | 'stars' | 'shooting' | 'bokeh' | 'rain' | 'none' */
  effects: {
    particles: 'fireflies',
    tilt: true,                     // la carte suit la souris en 3D
    cursor: true,                   // curseur personnalisé
    trail: true,                    // étincelles derrière le curseur
    glitch: true,                   // le nom "glitch" de temps en temps
    spotlight: true,                // halo lumineux qui suit la souris
    ripple: true,                   // onde au clic
  },

  /* ---------- Discord en direct (via l'API publique Lanyard) ----------
     1. Rejoins https://discord.gg/lanyard (le bot doit te voir)
     2. Copie ton ID utilisateur (mode développeur → clic droit sur ton profil)
     3. Colle-le dans id et passe demo à false                                   */
  discord: {
    id: '',
    demo: true,                     // true = fausse activité de démonstration
    useAvatar: false,               // true = utilise ton avatar Discord à la place du tien
    tag: 'nova',                    // texte copié au clic sur l'icône Discord
  },

  /* ---------- compteur de vues ----------
     base : valeur de départ. endpoint : URL optionnelle d'un compteur global
     qui répond { "value": 123 } (sinon le compteur est local au navigateur).   */
  views: { base: 1284, endpoint: '' },

  /* ---------- musique ----------
     Sans pistes, le site joue 3 ambiances générées EN DIRECT dans le navigateur
     (aucun fichier audio nécessaire). Pour tes propres sons :
       tracks: [{ title: 'Mon son', artist: 'Moi', src: 'assets/son.mp3', cover: 'assets/cover.jpg' }]
     Pour que le visualiseur réagisse à un fichier hébergé ailleurs, ajoute cors: true
     (le serveur doit envoyer l'en-tête Access-Control-Allow-Origin).             */
  music: { autoplay: true, volume: 0.55, tracks: [] },

  /* ---------- badges (survole-les) ----------
     icônes : crown star heart zap flame code moon sparkles headphones gamepad
              rocket coffee shield trophy planet ghost skull leaf cpu paint …     */
  badges: [
    { icon: 'crown', label: 'Fondateur' },
    { icon: 'code', label: 'Développeur' },
    { icon: 'headphones', label: 'Mélomane' },
    { icon: 'moon', label: 'Oiseau de nuit' },
  ],

  /* ---------- icônes de réseaux ----------
     icon : discord github x instagram tiktok youtube twitch spotify steam telegram
            snapchat gmail soundcloud reddit kick paypal applemusic roblox whatsapp linkedin
     Pour Discord, un clic copie le tag au lieu d'ouvrir un lien.                 */
  socials: [
    { icon: 'discord', label: 'Discord', copy: 'nova' },
    { icon: 'github', label: 'GitHub', url: 'https://github.com/' },
    { icon: 'x', label: 'X / Twitter', url: 'https://x.com/' },
    { icon: 'instagram', label: 'Instagram', url: 'https://instagram.com/' },
    { icon: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/' },
    { icon: 'youtube', label: 'YouTube', url: 'https://youtube.com/' },
    { icon: 'twitch', label: 'Twitch', url: 'https://twitch.tv/' },
    { icon: 'spotify', label: 'Spotify', url: 'https://open.spotify.com/' },
  ],

  /* ---------- gros boutons de liens ---------- */
  links: [
    { icon: 'globe', label: 'Mon portfolio', sub: 'projets & expériences', url: 'https://example.com' },
    { icon: 'code', label: 'Open source', sub: 'le code est libre', url: 'https://github.com/' },
    { icon: 'mail', label: 'Me contacter', sub: 'hello@example.com', url: 'mailto:hello@example.com' },
  ],

  /* ---------- extras ---------- */
  studio: true,    // touche E : réglages rapides en direct
  terminal: true,  // touche ` : terminal caché
};
