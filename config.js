/* ==========================================================================
   config.js — C'EST LE SEUL FICHIER À MODIFIER POUR PERSONNALISER TA PAGE
   Tout ce qui est commenté "optionnel" peut être supprimé sans rien casser.
   ========================================================================== */
window.BIO_CONFIG = {
  /* ---------- identité ---------- */
  username: 'nova',                 // affiché sous forme @nova
  displayName: 'Nova',              // le grand titre
  avatar: 'assets/avatar.svg',      // chemin local ou URL https://…
  verified: true,                   // petite étincelle à côté du nom
  // Phrases qui s'écrivent / s'effacent en boucle sous le nom
  bio: [
    'designer · dev · insomniaque',
    'je construis des trucs bizarres et beaux',
    'cafe, synthés & nuits blanches',
  ],
  location: 'Paris, France',
  timezone: 'Europe/Paris',         // affiche ton heure locale en direct (optionnel)
  uid: 1,                           // ton numéro de membre
  joined: '2026-01-01',             // optionnel
  pageTitle: '@nova',               // le titre de l'onglet s'écrit lettre par lettre

  /* ---------- écran d'entrée ("click to enter") ---------- */
  splash: {
    enabled: true,                  // nécessaire pour lancer la musique automatiquement
    text: 'cliquer pour entrer',
  },

  /* ---------- fond ----------
     type : 'shader'  → fluide WebGL généré en direct, réagit à la musique (défaut)
            'video'   → une vidéo en boucle (mets son chemin dans src, ex. 'assets/fond.mp4')
            'image'   → une image / un gif (src)
            'none'    → dégradé simple                                          */
  background: { type: 'shader', src: '', dim: 0.25, blur: 0 },

  /* ---------- couleurs ----------
     theme : 'violet' | 'ocean' | 'ember' | 'mint' | 'sakura' | 'mono'
     accent / accent2 : surcharge perso en hexadécimal (ex. '#ff5d8f'), optionnel  */
  theme: 'violet',
  accent: '',
  accent2: '',

  /* ---------- carte en verre dépoli ---------- */
  card: { opacity: 0.55, blur: 22, radius: 28 },

  /* ---------- effets ----------
     particles : 'fireflies' | 'snow' | 'stars' | 'none'                        */
  effects: {
    particles: 'fireflies',
    tilt: true,                     // la carte suit la souris en 3D
    cursor: true,                   // curseur personnalisé
    trail: true,                    // étincelles derrière le curseur
    glitch: true,                   // le nom "glitch" de temps en temps
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
     icônes : crown star heart zap flame code moon sparkles headphones gamepad … */
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
  studio: true,    // touche E : éditeur visuel en direct (comme un dashboard)
  terminal: true,  // touche ` : terminal caché
};
