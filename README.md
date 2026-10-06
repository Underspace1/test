# ✦ biolink

Une page de **bio link** moderne, 100 % statique (HTML + CSS + JS, **aucune dépendance, aucun build**) — dans l'esprit des sites type *guns.lol* / *drift.rip*, avec un **dashboard visuel** pour tout régler sans toucher au code, et quelques surprises en plus.

```
index.html      → ta page publique
dashboard.html  → l'éditeur (aperçu en direct, modèles, export de config.js)
```

Ouvre les fichiers directement dans un navigateur, ou lance un petit serveur :

```bash
npx http-server -p 8080 .
```

## Fonctionnalités

**Le socle**

- Écran d'entrée « cliquer pour entrer » (qui déclenche aussi la musique, comme les navigateurs l'exigent)
- Carte avec **bannière** (image ou dégradé animé), avatar (rond / arrondi / hexagone, anneau tournant ou pulsé), nom, badges avec infobulles, bio qui s'écrit en boucle, localisation, heure locale, UID
- Compteur de vues animé
- Icônes de réseaux (20 marques embarquées) + gros boutons de liens
- Présence **Discord en direct** (statut, activité/jeu, Spotify) via l'API publique [Lanyard](https://github.com/Phineas/lanyard)
- Lecteur de musique : play/pause, précédent/suivant, volume, progression, visualiseur
- 8 thèmes de couleurs + couleurs libres, 8 polices (Google Fonts), styles de nom (dégradé animé, néon, arc-en-ciel, simple), styles de carte (verre dépoli, pleine, contour, néon) et de boutons (verre, plein, contour, néon), bordure projecteur ou anneau animé
- Fonds : **fluide WebGL** réactif à la musique, **aurore** (CSS), **grille rétro** synthwave, vidéo, image, sobre
- Particules : lucioles, neige, étoiles, **étoiles filantes**, **bokeh**, pluie
- Décorations : orbes flottantes, **grain**, vignette, **scanlines**
- Interactions : inclinaison 3D, halo du curseur, curseur personnalisé, traînée d'étincelles, onde au clic, boutons magnétiques, glitch du nom
- Responsive, `prefers-reduced-motion` respecté, navigation clavier

**Le dashboard** (`dashboard.html`)

- Formulaire complet par sections (profil, apparence, fond & effets, liens, réseaux, badges, musique, Discord, avancé)
- **Aperçu en direct** dans un cadre téléphone ou ordinateur — chaque réglage est appliqué instantanément
- 6 **modèles** prêts à l'emploi (Nébuleuse, Aurore, Synthwave, Minimal, Sakura, Luxe) qui gardent tes textes et liens
- Listes **réordonnables** (glisser-déposer ou flèches), dupliquer, supprimer ; sélecteur d'icônes avec recherche
- Import d'images (avatar, bannière, fond) redimensionnées et intégrées, ou simples chemins vers `assets/`
- Brouillon sauvegardé automatiquement dans le navigateur ; **Importer** un `config.js` existant ; **Copier** ou **Télécharger config.js** (`Ctrl+S`)

**Les surprises**

| | |
|---|---|
| 🌌 **Fond fluide WebGL** | un shader généré en direct qui **réagit aux basses** de la musique (repli CSS si WebGL est absent) |
| 🎹 **Musique générée en direct** | 3 ambiances (*lo-fi*, *synthwave*, *ambient*) synthétisées par WebAudio dans le navigateur : **aucun fichier audio** à fournir |
| ⌘ **Palette de commandes** | `Ctrl/⌘ + K` ou `/` — liens, musique, thèmes, modèles, effets… recherche floue |
| 💻 **Terminal caché** | `` ` `` (ou `²`) — `help`, `neofetch`, `theme`, `preset`, `fx`, `bg`, `matrix`, `cat .secret`… (Tab complète) |
| 🎛 **Réglages rapides** | `E` — panneau de réglages en direct sur la page publique, avec lien vers le dashboard |
| ⚡ **Mode rave** | code Konami `↑ ↑ ↓ ↓ ← → ← → B A` — couleurs qui tournent, confettis calés sur les basses (`Échap` pour quitter) |

Autres raccourcis : `Espace` lecture/pause · `M` couper le son · `Échap` fermer.

## Personnaliser

### Avec le dashboard (recommandé)

1. Ouvre `dashboard.html`.
2. Règle tout à gauche, regarde le résultat à droite.
3. Clique sur **Télécharger config.js** et remplace le fichier `config.js` du site.

Les images importées sont intégrées dans `config.js` (en base64). Pour garder un fichier léger, place plutôt tes images dans `assets/` et indique leur chemin (`assets/moi.png`).

### À la main

Tout est dans [`config.js`](config.js), commenté en français : identité, bannière, police, styles, fond, couleurs, carte, décorations, effets, Discord, compteur, musique, badges, réseaux, liens.

```js
avatar: 'assets/moi.png',
banner: 'assets/banniere.jpg',        // ou 'gradient', ou '' pour aucune
font: 'syne',                         // space | inter | sora | outfit | poppins | syne | playfair | mono
nameStyle: 'neon',                    // shimmer | neon | rainbow | plain
background: { type: 'aurora', src: '', dim: 0.2, blur: 0 },   // shader | aurora | grid | video | image | none
card: { style: 'glass', border: 'gradient', opacity: 0.5, blur: 24, radius: 28 },
effects: { particles: 'shooting', tilt: true, spotlight: true, ripple: true, /* … */ },
music: { tracks: [{ title: 'Mon son', artist: 'Moi', src: 'assets/son.mp3', cover: 'assets/cover.jpg' }] },
```

Sans `tracks`, ce sont les ambiances générées qui jouent. Pour des fichiers hébergés sur un autre domaine, ajoute `cors: true` à la piste si tu veux que le visualiseur réagisse (le serveur doit envoyer `Access-Control-Allow-Origin`) ; sinon le fichier joue normalement et le visualiseur est simulé.

### Discord en direct

1. Rejoins le serveur [discord.gg/lanyard](https://discord.gg/lanyard) (le bot doit te voir).
2. Copie ton ID utilisateur (Paramètres → Avancés → Mode développeur, puis clic droit sur ton profil → *Copier l'identifiant*).
3. Dans le dashboard (section Discord) ou dans `config.js` : `discord: { id: '123456789012345678', demo: false }`.

Tant que `demo: true` et sans ID, une fausse activité de démonstration (qui reflète le lecteur) est affichée.

### Compteur de vues

Sans serveur, le compteur est **local** : `base` + 1 par jour et par navigateur. Pour un vrai compteur global, renseigne `views.endpoint` avec l'URL d'un service qui répond `{ "value": 123 }`.

## Déployer

Site statique : GitHub Pages, Netlify, Vercel, Cloudflare Pages… il suffit de servir le dossier tel quel (pas de build). Tu peux supprimer `dashboard.html`, `css/dashboard.css` et `js/dashboard.js` du déploiement si tu ne veux pas exposer l'éditeur (il ne modifie rien côté serveur de toute façon : il ne fait que générer un `config.js`).

## Structure

```
index.html         page publique
dashboard.html     éditeur visuel
config.js          ← ta configuration
css/style.css      styles de la page
css/dashboard.css  styles de l'éditeur
assets/            avatar, favicon (mets tes images ici)
js/
  util.js          événements, boucle d'animation, helpers, icônes, thèmes, polices, modèles, défauts
  background.js    shader WebGL, particules, pluie matrix
  audio.js         synthé génératif + lecteur de fichiers
  presence.js      Discord (Lanyard) + mode démo
  ui.js            carte, écran d'entrée, lecteur, tilt, curseur, ripple
  overlays.js      palette, terminal, réglages rapides
  main.js          démarrage, réglages, raccourcis, Konami, rave, pont avec l'aperçu
  dashboard.js     l'éditeur
  icons.js         logos de marques (Simple Icons, CC0)
```

## Notes

- Les données externes (Discord…) sont toujours insérées comme **texte** (jamais en HTML) ; les URL de la config sont filtrées (`http(s)`, `mailto`, `tel`, images `data:`).
- L'aperçu du dashboard est la vraie page chargée dans une iframe (`index.html?preview=1`) et pilotée par `postMessage` ; en mode aperçu, l'écran d'entrée est sauté et le compteur de vues n'est pas incrémenté.
- Polices : Inter, Space Grotesk, JetBrains Mono (+ Sora, Outfit, Poppins, Syne, Playfair Display à la demande) via Google Fonts, avec repli sur les polices système.
- Icônes de marques : [Simple Icons](https://simpleicons.org) (CC0). Les marques appartiennent à leurs propriétaires respectifs.
