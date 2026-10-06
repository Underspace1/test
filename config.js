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
  bio: ['click & sleep', 'designer · dev · insomniaque'],
  about: 'Je construis des trucs bizarres et beaux, souvent la nuit. Café, synthés, pixels.',
  location: 'Paris, France',
  timezone: 'Europe/Paris',         // affiche ton heure locale en direct (optionnel)
  uid: 1,                           // ton numéro de membre
  joined: '2026-01-01',             // optionnel
  pageTitle: '@nova',               // le titre de l'onglet s'écrit lettre par lettre

  /* ---------- disposition ----------
     L'ordre des widgets sur la page. Retire-en un pour le masquer.
     Disponibles : 'profile' 'about' 'views' 'discord' 'music' 'links'       */
  layout: ['profile', 'about', 'views', 'discord', 'roblox', 'osu', 'embed', 'music', 'links'],
  socialsLimit: 5,                  // icônes de réseaux visibles avant le bouton « + » (0 = toutes)

  /* ---------- style ----------
     font        : 'inter' | 'space' | 'sora' | 'outfit' | 'poppins' | 'syne' | 'playfair' | 'mono'
     nameStyle   : 'neon' (halo) | 'shimmer' (dégradé animé) | 'rainbow' | 'plain'
     linkStyle   : 'glass' | 'solid' | 'outline' | 'neon'
     avatarShape : 'circle' | 'rounded' | 'hexagon'
     avatarRing  : 'none' | 'gradient' (anneau tournant) | 'pulse'                */
  font: 'inter',
  nameStyle: 'neon',
  linkStyle: 'glass',
  avatarShape: 'circle',
  avatarRing: 'none',

  /* ---------- écran d'entrée ("click to enter") ---------- */
  splash: {
    enabled: true,                  // nécessaire pour lancer la musique automatiquement
    text: 'cliquer pour entrer',
  },

  /* ---------- fond ----------
     type : 'shader'  → fluide généré en direct, réagit à la musique (défaut)
            'aurora'  → voiles d'aurore boréale animés (CSS pur, très léger)
            'grid'    → grille rétro façon synthwave
            'video'   → une vidéo en boucle (mets son chemin dans src, ex. 'assets/fond.mp4')
            'image'   → une image / un gif (src)
            'none'    → dégradé simple
     mono : true → fond en noir et blanc                                        */
  background: { type: 'shader', src: '', dim: 0.35, blur: 0, mono: true },

  /* ---------- couleurs ----------
     theme : 'white' | 'violet' | 'ocean' | 'ember' | 'mint' | 'sakura' | 'gold' | 'ice' | 'mono'
     accent / accent2 : surcharge perso en hexadécimal (ex. '#ff5d8f'), optionnel  */
  theme: 'white',
  accent: '',
  accent2: '',

  /* ---------- widgets (cartes) ----------
     style  : 'glass' (verre sombre) | 'solid' | 'outline' | 'neon'
     border : 'none' | 'spotlight' (suit la souris) | 'gradient' (anneau animé)   */
  card: { style: 'glass', border: 'none', opacity: 0.5, blur: 16, radius: 26 },

  /* ---------- décorations ---------- */
  decor: {
    dots: true,                     // trame de points (halftone) sur le fond
    vignette: true,                 // assombrit les bords
    noise: false,                   // grain fin
    orbs: false,                    // orbes lumineuses flottantes
    scanlines: false,               // lignes de balayage rétro
  },

  /* ---------- effets ----------
     particles : 'none' | 'snow' | 'fireflies' | 'stars' | 'shooting' | 'bokeh' | 'rain' */
  effects: {
    particles: 'none',
    tilt: true,                     // la page suit légèrement la souris en 3D
    spotlight: true,                // halo lumineux qui suit la souris
    ripple: true,                   // onde au clic
    cursor: false,                  // curseur personnalisé
    trail: false,                   // étincelles derrière le curseur
    glitch: false,                  // le nom "glitch" de temps en temps
  },

  /* ---------- Discord en direct (via l'API publique Lanyard) ----------
     1. Rejoins https://discord.gg/lanyard (le bot doit te voir)
     2. Copie ton ID utilisateur (mode développeur → clic droit sur ton profil)
     3. Colle-le dans id et passe demo à false                                   */
  discord: {
    id: '',
    demo: true,                     // true = fausse activité de démonstration
    useAvatar: false,               // true = utilise ton avatar Discord à la place du tien
    tag: 'nova',                    // pseudo affiché dans le widget et copié au clic sur l'icône Discord
  },

  /* ---------- Roblox ----------
     Mets ton ID utilisateur (ou ton pseudo) : les amis, abonnés, l'avatar et la
     présence sont récupérés en direct via RoProxy (miroir public de l'API Roblox).
     Si la récupération échoue, les valeurs ci-dessous sont affichées.
     proxy : optionnel, un proxy CORS maison (ex. 'https://mon-proxy.workers.dev/?')  */
  roblox: {
    id: '',                         // ex. '156'
    username: 'nova',
    displayName: 'Nova',
    friends: 291,
    followers: 60,
    live: false,                    // passe à true avec ton vrai ID / pseudo
    proxy: '',
  },

  /* ---------- osu! ----------
     L'API osu! exige un jeton : fournis un endpoint (ex. un Cloudflare Worker, voir README)
     qui renvoie la réponse de GET /api/v2/users/{id}/{mode}. Sans endpoint, les
     valeurs ci-dessous sont affichées. mode : 'osu' | 'taiko' | 'fruits' | 'mania'  */
  osu: {
    username: 'nova',
    id: '',                         // ex. '2' → avatar automatique
    mode: 'osu',
    country: 'FR',
    rank: 48213,
    countryRank: 1120,
    pp: 4210,
    accuracy: 98.12,
    playcount: 52310,
    level: 97,
    endpoint: '',
  },

  /* ---------- lecteur intégré ----------
     Colle un lien de partage Spotify (titre, album, playlist…), SoundCloud, YouTube,
     Apple Music ou Deezer : il est converti en lecteur intégré.                 */
  embed: { url: '', title: '' },

  /* ---------- abonnement ----------
     plan : 'free' | 'premium' | 'vip' — déclaratif (site statique, aucune vérification).
     Les fonctions réservées à un plan supérieur sont remplacées par un repli sûr.
     checkout : liens de paiement hébergés (Stripe Payment Link, Ko-fi…) utilisés
     par les boutons de la page d'accueil (index.html).                           */
  premium: {
    plan: 'premium',
    checkout: { premium: '', vip: '' },
    badge: true,                    // icône Premium / VIP à côté du nom
    branding: false,                // false = retire « Fait avec biolink » (Premium et plus)
  },

  /* ---------- compteur de vues ----------
     base : valeur de départ. endpoint : URL optionnelle d'un compteur global
     qui répond { "value": 123 } (sinon le compteur est local au navigateur).   */
  views: { base: 135, endpoint: '' },

  /* ---------- musique ----------
     Sans pistes, le site joue 3 ambiances générées EN DIRECT dans le navigateur
     (aucun fichier audio nécessaire). Pour tes propres sons :
       tracks: [{ title: 'Mon son', artist: 'Moi', src: 'assets/son.mp3', cover: 'assets/cover.jpg', tag: 'Explicit' }]
     Pour que le visualiseur réagisse à un fichier hébergé ailleurs, ajoute cors: true
     (le serveur doit envoyer l'en-tête Access-Control-Allow-Origin).             */
  music: { autoplay: true, volume: 0.55, tracks: [] },

  /* ---------- badges (survole-les) ----------
     icônes : crown star heart zap flame code moon sparkles headphones gamepad
              rocket coffee shield trophy planet ghost skull leaf cpu paint …     */
  badges: [
    { icon: 'crown', label: 'Fondateur' },
    { icon: 'code', label: 'Développeur' },
    { icon: 'moon', label: 'Oiseau de nuit' },
  ],

  /* ---------- icônes de réseaux ----------
     icon : discord github x instagram tiktok youtube twitch spotify steam telegram
            snapchat gmail soundcloud reddit kick paypal applemusic roblox whatsapp linkedin
     Pour Discord, un clic copie le tag au lieu d'ouvrir un lien.                 */
  socials: [
    { icon: 'discord', label: 'Discord', copy: 'nova' },
    { icon: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/' },
    { icon: 'roblox', label: 'Roblox', url: 'https://roblox.com/' },
    { icon: 'github', label: 'GitHub', url: 'https://github.com/' },
    { icon: 'x', label: 'X / Twitter', url: 'https://x.com/' },
    { icon: 'instagram', label: 'Instagram', url: 'https://instagram.com/' },
    { icon: 'youtube', label: 'YouTube', url: 'https://youtube.com/' },
    { icon: 'spotify', label: 'Spotify', url: 'https://open.spotify.com/' },
  ],

  /* ---------- gros boutons de liens ---------- */
  links: [
    { icon: 'globe', label: 'Mon portfolio', sub: 'projets & expériences', url: 'https://example.com' },
    { icon: 'mail', label: 'Me contacter', sub: 'hello@example.com', url: 'mailto:hello@example.com' },
  ],

  /* ---------- extras ---------- */
  studio: true,    // touche E : réglages rapides en direct
  terminal: true,  // touche ` : terminal caché
};
