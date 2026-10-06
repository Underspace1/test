# ✦ biolink

Une page de **bio link** moderne, 100 % statique (HTML + CSS + JS, **aucune dépendance, aucun build**) — dans l'esprit des sites type *guns.lol* / *drift.rip*, avec quelques surprises en plus.

Ouvre `index.html` directement dans un navigateur, ou lance un petit serveur :

```bash
npx http-server -p 8080 .
```

## Fonctionnalités

**Le socle**

- Écran d'entrée « cliquer pour entrer » (qui déclenche aussi la musique, comme les navigateurs l'exigent)
- Carte en verre dépoli avec avatar animé, nom, badges (avec infobulles), bio qui s'écrit en boucle, localisation, heure locale, UID
- Compteur de vues animé
- Icônes de réseaux sociaux (20 marques embarquées) + gros boutons de liens
- Présence **Discord en direct** (statut, activité/jeu, Spotify) via l'API publique [Lanyard](https://github.com/Phineas/lanyard)
- Lecteur de musique : play/pause, précédent/suivant, volume, barre de progression, visualiseur
- Fond personnalisable : shader, vidéo, image · particules · thèmes de couleurs
- Inclinaison 3D de la carte, bordure « projecteur », curseur personnalisé + traînée, boutons magnétiques, glitch du nom
- Responsive, `prefers-reduced-motion` respecté, navigation clavier

**Les surprises**

| | |
|---|---|
| 🌌 **Fond fluide WebGL** | un shader généré en direct qui **réagit aux basses** de la musique (repli CSS si WebGL est absent) |
| 🎹 **Musique générée en direct** | 3 ambiances (*lo-fi*, *synthwave*, *ambient*) synthétisées par WebAudio dans le navigateur : **aucun fichier audio** à fournir |
| ⌘ **Palette de commandes** | `Ctrl/⌘ + K` ou `/` — liens, musique, thèmes, effets… recherche floue |
| 💻 **Terminal caché** | `` ` `` (ou `²`) — `help`, `neofetch`, `theme`, `fx`, `play`, `matrix`, `cat .secret`… (Tab complète) |
| 🎛 **Studio** | `E` — éditeur visuel **en direct** (nom, bio, couleurs, fond, particules, verre…) puis « Copier la config » |
| ⚡ **Mode rave** | code Konami `↑ ↑ ↓ ↓ ← → ← → B A` — couleurs qui tournent, confettis calés sur les basses (`Échap` pour quitter) |

Autres raccourcis : `Espace` lecture/pause · `M` couper le son · `Échap` fermer.

## Personnaliser

**Tout se passe dans [`config.js`](config.js)** (commenté en français) : nom, bio, avatar, liens, réseaux, badges, thème, fond, effets, musique, Discord…

Tu peux aussi tout régler visuellement avec le **Studio** (touche `E`), puis cliquer sur « Copier la config » et coller le résultat dans `config.js`. Les changements faits dans le Studio sont mémorisés dans *ton* navigateur uniquement ; « Réinitialiser » les efface.

### Avatar, fond, musique

```js
avatar: 'assets/moi.png',
background: { type: 'video', src: 'assets/fond.mp4', dim: 0.35, blur: 2 },   // ou 'image' / 'shader' / 'none'
music: { tracks: [{ title: 'Mon son', artist: 'Moi', src: 'assets/son.mp3', cover: 'assets/cover.jpg' }] },
```

Sans `tracks`, ce sont les ambiances générées qui jouent. Pour des fichiers hébergés sur un autre domaine, ajoute `cors: true` à la piste si tu veux que le visualiseur réagisse (le serveur doit envoyer `Access-Control-Allow-Origin`) ; sans ça le fichier joue normalement et le visualiseur est simulé.

### Discord en direct

1. Rejoins le serveur [discord.gg/lanyard](https://discord.gg/lanyard) (le bot doit te voir).
2. Copie ton ID utilisateur (Paramètres → Avancés → Mode développeur, puis clic droit sur ton profil → *Copier l'identifiant*).
3. Dans `config.js` : `discord: { id: '123456789012345678', demo: false }`.

Tant que `demo: true` et sans ID, une fausse activité de démonstration (qui reflète le lecteur) est affichée.

### Compteur de vues

Sans serveur, le compteur est **local** : `base` + 1 par jour et par navigateur. Pour un vrai compteur global, renseigne `views.endpoint` avec l'URL d'un service qui répond `{ "value": 123 }`.

## Déployer

Site statique : GitHub Pages, Netlify, Vercel, Cloudflare Pages… il suffit de servir le dossier tel quel (pas de build).

## Structure

```
index.html        squelette
config.js         ← ta configuration
css/style.css     styles
assets/           avatar, favicon
js/
  util.js         événements, boucle d'animation, helpers, icônes, thèmes
  background.js   shader WebGL, particules, pluie matrix
  audio.js        synthé génératif + lecteur de fichiers
  presence.js     Discord (Lanyard) + mode démo
  ui.js           carte, écran d'entrée, lecteur, tilt, curseur
  overlays.js     palette, terminal, studio
  main.js         démarrage, réglages, raccourcis, Konami, rave
  icons.js        logos de marques (Simple Icons, CC0)
```

## Notes

- Les données externes (Discord…) sont toujours insérées comme **texte** (jamais en HTML) et les URL de `config.js` sont filtrées (`http(s)`, `mailto`, `tel`).
- Polices : Inter, Space Grotesk et JetBrains Mono via Google Fonts, avec repli sur les polices système si elles ne se chargent pas.
- Icônes de marques : [Simple Icons](https://simpleicons.org) (CC0). Les marques appartiennent à leurs propriétaires respectifs.
