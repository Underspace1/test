# ✦ biolink

Une page de **bio link** minimaliste et moderne, 100 % statique (HTML + CSS + JS, **aucune dépendance, aucun build**) — dans l'esprit de *drift.rip* / *guns.lol* : des **widgets** empilés en verre sombre sur un fond monochrome, un **dashboard visuel** pour tout régler sans toucher au code, et quelques surprises en plus.

```
index.html      → la page d’accueil (présentation + tarifs)
profile.html    → ta page publique
dashboard.html  → l'éditeur (aperçu en direct, modèles, export de config.js)
```

Ouvre les fichiers directement dans un navigateur, ou lance un petit serveur :

```bash
npx http-server -p 8080 .
```

## Fonctionnalités

**Les widgets** (activables et réordonnables)

- **Profil** : bannière (image ou dégradé), avatar (rond / arrondi / hexagone, anneau optionnel), nom avec halo, badges, accroche qui s'écrit en boucle, localisation, heure locale, UID, icônes de réseaux (20 marques embarquées, bouton « + » au-delà de N)
- **À propos** : un court texte libre
- **Vues** : compteur animé en pastille
- **Discord** : présence en direct (pseudo, statut, statut perso, jeu ou Spotify) via l'API publique [Lanyard](https://github.com/Phineas/lanyard)
- **Roblox** : avatar, nom, amis, abonnés, année d'inscription et présence (en ligne / en jeu / Studio) en direct
- **osu!** : avatar, drapeau, mode, niveau, rang mondial et national, pp, précision, parties jouées
- **Lecteur intégré** : un lien Spotify, SoundCloud, YouTube, Apple Music ou Deezer devient un lecteur
- **Musique** : pochette, titre, étiquette (ex. *Explicit*), lecture / précédent / suivant, progression avec temps, volume
- **Liens** : les gros boutons, chacun dans sa carte

**Le style**

- Écran d'entrée « cliquer pour entrer » (qui déclenche aussi la musique, comme les navigateurs l'exigent)
- 9 thèmes dont **Blanc** (monochrome, par défaut) + couleurs libres, 8 polices (Google Fonts), styles de nom (halo, dégradé animé, arc-en-ciel, simple), styles de widget (verre sombre, plein, contour, néon) et de boutons, bordure projecteur ou anneau animé
- Fonds : **fluide** réactif à la musique (WebGL), **aurore** (CSS), **grille rétro** synthwave, vidéo, image, sobre — chacun passable en **noir & blanc**
- Décorations : **trame de points** (halftone), vignette, grain, orbes, scanlines
- Particules (désactivées par défaut) : neige, lucioles, étoiles, étoiles filantes, bokeh, pluie
- Interactions : inclinaison 3D légère, halo du curseur, onde au clic, boutons magnétiques ; en option curseur personnalisé, traînée d'étincelles, glitch du nom
- Responsive, `prefers-reduced-motion` respecté, navigation clavier

**Le dashboard** (`dashboard.html`)

- Vue d'ensemble (URL, vues, widgets, réseaux, liens, thème) puis formulaire par sections (profil, **disposition des widgets**, apparence, fond & effets, liens, réseaux, badges, musique, Discord, avancé)
- **Aperçu en direct** dans un cadre téléphone ou ordinateur — chaque réglage est appliqué instantanément
- 7 **modèles** prêts à l'emploi (Minimal, Nébuleuse, Aurore, Synthwave, Sobre, Sakura, Luxe) qui gardent tes textes et liens
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

Tout est dans [`config.js`](config.js), commenté en français : identité, à propos, disposition, bannière, police, styles, fond, couleurs, widgets, décorations, effets, Discord, compteur, musique, badges, réseaux, liens.

```js
avatar: 'assets/moi.png',
banner: 'assets/banniere.jpg',        // ou 'gradient', ou '' pour aucune
about: 'Just click and sleep',
layout: ['profile', 'about', 'views', 'discord', 'music', 'links'],   // retire un widget pour le masquer
socialsLimit: 5,                      // icônes visibles avant le « + »
font: 'inter',                        // inter | space | sora | outfit | poppins | syne | playfair | mono
nameStyle: 'neon',                    // neon | shimmer | rainbow | plain
background: { type: 'shader', src: '', dim: 0.35, blur: 0, mono: true },   // shader | aurora | grid | video | image | none
card: { style: 'glass', border: 'none', opacity: 0.5, blur: 16, radius: 26 },
decor: { dots: true, vignette: true, noise: false, orbs: false, scanlines: false },
music: { tracks: [{ title: 'Mon son', artist: 'Moi', src: 'assets/son.mp3', cover: 'assets/cover.jpg', tag: 'Explicit' }] },
```

Sans `tracks`, ce sont les ambiances générées qui jouent. Pour des fichiers hébergés sur un autre domaine, ajoute `cors: true` à la piste si tu veux que le visualiseur réagisse (le serveur doit envoyer `Access-Control-Allow-Origin`) ; sinon le fichier joue normalement et le visualiseur est simulé.

### Discord en direct

1. Rejoins le serveur [discord.gg/lanyard](https://discord.gg/lanyard) (le bot doit te voir).
2. Copie ton ID utilisateur (Paramètres → Avancés → Mode développeur, puis clic droit sur ton profil → *Copier l'identifiant*).
3. Dans le dashboard (section Discord) ou dans `config.js` : `discord: { id: '123456789012345678', demo: false }`.

Tant que `demo: true` et sans ID, une fausse activité de démonstration (qui reflète le lecteur) est affichée.

### Roblox

Renseigne ton **ID utilisateur** (dans l'URL de ton profil) ou ton pseudo et active `live`. Les données sont lues via [RoProxy](https://roproxy.com), un miroir public de l'API Roblox qui accepte les requêtes depuis un navigateur. Si la récupération échoue (miroir indisponible, bloqueur), les valeurs saisies (`friends`, `followers`, `displayName`) sont affichées. Tu peux remplacer RoProxy par ton propre proxy CORS avec `roblox.proxy` (préfixe auquel l'URL Roblox est ajoutée).

### osu!

L'API osu! exige un jeton secret qui ne peut pas être exposé dans une page statique. Deux options :

1. **Valeurs saisies** : rang, pp, précision… dans la config (ou le dashboard). L'avatar est automatique si tu donnes ton `id`.
2. **Endpoint** : un petit service qui renvoie la réponse de `GET /api/v2/users/{id}/{mode}`. Exemple de [Cloudflare Worker](https://workers.cloudflare.com) (crée un client OAuth sur osu.ppy.sh → paramètres → OAuth, puis ajoute `OSU_ID`, `OSU_SECRET` et `OSU_USER` dans les variables du worker) :

```js
export default {
  async fetch(req, env) {
    const tok = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: env.OSU_ID, client_secret: env.OSU_SECRET, grant_type: 'client_credentials', scope: 'public' }),
    }).then((r) => r.json());
    const user = await fetch(`https://osu.ppy.sh/api/v2/users/${env.OSU_USER}/osu`, { headers: { Authorization: 'Bearer ' + tok.access_token } }).then((r) => r.json());
    return new Response(JSON.stringify(user), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } });
  },
};
```

Mets l'URL du worker dans `osu.endpoint`. Un objet simplifié `{ username, id, avatar_url, country_code, global_rank, country_rank, pp, hit_accuracy, play_count, level }` est aussi accepté.

### Lecteur intégré

Colle un lien de partage dans `embed.url` : `https://open.spotify.com/track/…` (ou album, playlist, artiste, podcast), `https://soundcloud.com/…`, `https://youtu.be/…` (ou playlist), `https://music.apple.com/…`, `https://www.deezer.com/…`. Le lien est converti en lecteur intégré ; les liens non reconnus sont ignorés.

### Compteur de vues

Sans serveur, le compteur est **local** : `base` + 1 par jour et par navigateur. Pour un vrai compteur global, renseigne `views.endpoint` avec l'URL d'un service qui répond `{ "value": 123 }`.

## Abonnement premium

biolink est statique : il n'y a ni compte ni vérification de paiement. Le plan est **déclaratif** (`premium.plan` dans `config.js` : `free`, `premium` ou `vip`), le paiement passe par un **lien hébergé** (Stripe Payment Link, Ko-fi, PayPal…) renseigné dans `premium.checkout`, et la page d'accueil (`index.html`) présente les trois niveaux avec leurs prix (définis dans `site.js`).

| Plan | Prix | Débloque |
|---|---|---|
| Gratuit | 0 € | profil, à propos, vues, Discord, musique générée, 5 liens, 9 thèmes, 3 polices, fonds fluide / aurore / grille / image, dashboard complet ; mention « Fait avec biolink » |
| Premium | 3 €/mois · 30 €/an | widgets Roblox, osu! et lecteur intégré, pistes audio personnelles, 8 polices, particules, anneau d'avatar, liens sans limite, badge Premium, retrait de la mention |
| VIP | 6 €/mois · 60 €/an | fond vidéo, curseur personnalisé, traînée d'étincelles, glitch du nom, anneau animé autour des cartes, compteur de vues global, badge VIP doré |

Quand un réglage dépasse le plan déclaré, la page applique un **repli sûr** (fond fluide à la place de la vidéo, police Inter, particules désactivées, cinq premiers liens…) et rien ne casse. Dans le dashboard, le réglage porte l'étiquette du plan requis ; ta valeur reste dans le brouillon et dans `config.js` exporté, et se réactive dès que tu passes au plan supérieur. La table des verrous est `Bio.gates` dans `js/util.js`.

Parcours : le visiteur paie sur la page du prestataire → tu ouvres le dashboard, section **Abonnement** → tu sélectionnes le plan → **Télécharger config.js**.

## Déployer

Site statique : GitHub Pages, Netlify, Vercel, Cloudflare Pages… il suffit de servir le dossier tel quel (pas de build). Tu peux supprimer `dashboard.html`, `css/dashboard.css` et `js/dashboard.js` du déploiement si tu ne veux pas exposer l'éditeur (il ne modifie rien côté serveur de toute façon : il ne fait que générer un `config.js`).

## Structure

```
index.html         page d’accueil
profile.html       page publique (profil)
dashboard.html     éditeur visuel
config.js          ← ta configuration (profil, plan, liens de paiement)
site.js            textes, sections, tarifs et FAQ de la page d'accueil
css/style.css      styles de la page
css/dashboard.css  styles de l'éditeur
assets/            avatar, favicon (mets tes images ici)
js/
  util.js          événements, boucle d'animation, helpers, icônes, thèmes, polices, modèles, défauts
  background.js    shader WebGL, particules, pluie matrix
  audio.js         synthé génératif + lecteur de fichiers
  presence.js      Discord (Lanyard) + mode démo
  integrations.js  Roblox (RoProxy), osu! (endpoint), conversion des liens en lecteurs intégrés
  ui.js            widgets, écran d'entrée, lecteur, tilt, curseur, ripple
  overlays.js      palette, terminal, réglages rapides
  main.js          démarrage, réglages, raccourcis, Konami, rave, pont avec l'aperçu
  dashboard.js     l'éditeur
  landing.js       page d'accueil (rendue depuis site.js)
  icons.js         logos de marques (Simple Icons, CC0)
```

## Notes

- Les données externes (Discord…) sont toujours insérées comme **texte** (jamais en HTML) ; les URL de la config sont filtrées (`http(s)`, `mailto`, `tel`, images `data:`).
- L'aperçu du dashboard est la vraie page chargée dans une iframe (`profile.html?preview=1`) et pilotée par `postMessage` ; en mode aperçu, l'écran d'entrée est sauté et le compteur de vues n'est pas incrémenté.
- Polices : Inter, Space Grotesk, JetBrains Mono (+ Sora, Outfit, Poppins, Syne, Playfair Display à la demande) via Google Fonts, avec repli sur les polices système.
- Icônes de marques : [Simple Icons](https://simpleicons.org) (CC0). Les marques appartiennent à leurs propriétaires respectifs.
