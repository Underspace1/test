/* ==========================================================================
   site.js — contenu de la page d'accueil (textes, sections, tarifs, FAQ)
   Le plan actif et les liens de paiement sont dans config.js (premium.*)
   ========================================================================== */
window.BIO_SITE = {
  "nav": [
    {
      "label": "Présentation",
      "href": "#presentation"
    },
    {
      "label": "Fonctionnalités",
      "href": "#fonctionnalites"
    },
    {
      "label": "Tarifs",
      "href": "#tarifs"
    },
    {
      "label": "FAQ",
      "href": "#faq"
    }
  ],
  "navDemo": "Voir la démo",
  "navCta": "Ouvrir le dashboard",
  "hero": {
    "badge": "Rejoins les créateurs qui publient avec Arcturus",
    "title": "Ton profil. Ton style.",
    "subtitle": "Une page de bio en verre sombre, avec Discord, Roblox, osu! et ta musique en direct. Tout se règle dans un dashboard visuel, sans coder. Statique, sans compte, hébergée où tu veux.",
    "primaryCta": "Créer ma page",
    "secondaryCta": "Voir la démo",
    "hint": "Statique · sans compte · gratuit pour commencer"
  },
  "sections": [
    {
      "id": "personnalisation",
      "title": "Chaque détail se règle",
      "subtitle": "Fond, cartes, couleurs, polices, effets : rien n’est imposé, tout s’ajuste depuis le dashboard.",
      "items": [
        {
          "title": "Fonds animés",
          "text": "Fluide WebGL qui réagit aux basses, aurore, grille rétro, vidéo ou image, chacun passable en noir et blanc.",
          "icon": "image"
        },
        {
          "title": "Cartes en verre",
          "text": "Verre sombre, plein, contour ou néon ; opacité, flou et arrondi réglables, bordure projecteur ou anneau animé.",
          "icon": "layers"
        },
        {
          "title": "Polices et styles de nom",
          "text": "Huit polices Google Fonts et un nom en halo, dégradé animé, arc-en-ciel ou simple.",
          "icon": "type"
        },
        {
          "title": "Thèmes et couleurs",
          "text": "Neuf thèmes, dont le blanc monochrome, ou tes deux couleurs d’accent en hexadécimal.",
          "icon": "palette"
        },
        {
          "title": "Sept modèles",
          "text": "Minimal, Nébuleuse, Aurore, Synthwave, Sobre, Sakura, Luxe : un clic change le style, tes textes et tes liens restent.",
          "icon": "wand"
        },
        {
          "title": "Particules et interactions",
          "text": "Neige, lucioles, étoiles filantes, bokeh, pluie ; inclinaison 3D, halo du curseur, onde au clic.",
          "icon": "sparkles"
        }
      ],
      "kicker": "Personnalisation",
      "showcase": true
    },
    {
      "id": "widgets",
      "title": "Des widgets qui vivent en direct",
      "subtitle": "Neuf widgets réordonnables. Plusieurs se mettent à jour tout seuls, depuis le navigateur du visiteur.",
      "items": [
        {
          "title": "Discord",
          "text": "Pseudo, statut, jeu ou morceau Spotify en cours, via l’API publique Lanyard. Aucun bot à héberger.",
          "icon": "discord"
        },
        {
          "title": "Roblox",
          "text": "Avatar, amis, abonnés et présence en ligne, en jeu ou dans Studio, lus en direct depuis ton profil.",
          "icon": "roblox"
        },
        {
          "title": "osu!",
          "text": "Rang mondial et national, pp, précision, parties jouées et niveau, pour le mode de ton choix.",
          "icon": "osu"
        },
        {
          "title": "Lecteur intégré",
          "text": "Un lien Spotify, SoundCloud, YouTube, Apple Music ou Deezer devient un lecteur dans ta page.",
          "icon": "headphones"
        },
        {
          "title": "Musique",
          "text": "Tes pistes avec pochette et progression, ou trois ambiances générées dans le navigateur sans aucun fichier audio.",
          "icon": "music"
        },
        {
          "title": "Liens et réseaux",
          "text": "Des gros boutons avec sous-titre, vingt icônes de marques et la copie de ton tag Discord au clic.",
          "icon": "link"
        }
      ],
      "kicker": "Widgets & intégrations"
    },
    {
      "id": "dashboard",
      "title": "Un dashboard, un fichier",
      "subtitle": "Tu règles à gauche, tu vois le résultat à droite, tu télécharges config.js. Rien d’autre à installer.",
      "items": [
        {
          "title": "Aperçu en direct",
          "text": "Ta vraie page dans un cadre téléphone ou ordinateur, mise à jour à chaque réglage.",
          "icon": "monitor"
        },
        {
          "title": "Disposition par glisser-déposer",
          "text": "Active, masque et réordonne les neuf widgets ; duplique, déplace ou supprime tes liens et réseaux.",
          "icon": "layers"
        },
        {
          "title": "Export en un clic",
          "text": "Copie ou télécharge config.js avec Ctrl+S et remplace le fichier du site : aucun build, aucun serveur.",
          "icon": "code"
        },
        {
          "title": "Brouillon et import",
          "text": "Ton travail reste dans le navigateur entre deux sessions, et tu peux importer un config.js existant à tout moment.",
          "icon": "shield"
        },
        {
          "title": "Pensé pour le mobile",
          "text": "Responsive, navigation au clavier et respect de prefers-reduced-motion, sur la page comme dans l’éditeur.",
          "icon": "phone"
        }
      ],
      "kicker": "Dashboard"
    },
    {
      "id": "statique",
      "title": "Statique, sans compte, sans backend",
      "subtitle": "Arcturus est un dossier de fichiers. Voilà ce que ça change pour toi et pour tes visiteurs.",
      "items": [
        {
          "title": "Héberge où tu veux",
          "text": "GitHub Pages, Netlify, Vercel, Cloudflare Pages ou ton serveur : tu déposes le dossier tel quel, sans build.",
          "icon": "globe"
        },
        {
          "title": "Tes données restent chez toi",
          "text": "Pas de compte ni de base : tout vit dans config.js, et les données externes sont insérées en texte brut, jamais en HTML.",
          "icon": "lock"
        },
        {
          "title": "Paiement par lien hébergé",
          "text": "Stripe Payment Link, Ko-fi ou PayPal : tu paies sur leur page, puis tu déclares ton plan dans le dashboard.",
          "icon": "crown"
        },
        {
          "title": "Léger par construction",
          "text": "HTML, CSS et JavaScript vanilla, polices chargées à la demande, repli CSS si WebGL est absent.",
          "icon": "bolt"
        }
      ],
      "kicker": "Sous le capot"
    }
  ],
  "pricing": {
    "title": "Un prix simple, sans surprise",
    "subtitle": "Commence gratuitement. Le plan se déclare dans config.js et le paiement passe par un lien hébergé : rien à installer, rien à connecter.",
    "yearlyNote": "2 mois offerts",
    "tiers": [
      {
        "id": "free",
        "name": "Gratuit",
        "priceMonth": 0,
        "priceYear": 0,
        "tagline": "Tout pour publier ta page aujourd’hui.",
        "features": [
          "Profil, à propos, vues, Discord en direct, musique générée et liens",
          "Jusqu’à 5 liens ; réseaux et badges sans limite",
          "Fonds fluide WebGL, aurore, grille et image",
          "9 thèmes, 3 polices, 7 modèles",
          "Dashboard complet avec aperçu en direct",
          "Mention « Fait avec Arcturus » en pied de page"
        ],
        "cta": "Créer ma page",
        "highlight": false
      },
      {
        "id": "premium",
        "name": "Premium",
        "priceMonth": 3,
        "priceYear": 30,
        "tagline": "Plus de widgets, plus de style, sans la mention.",
        "features": [
          "Tout le plan Gratuit",
          "Widgets Roblox et osu! en direct",
          "Lecteur intégré Spotify, SoundCloud, YouTube, Apple Music et Deezer",
          "Tes propres pistes audio avec pochette",
          "Les 8 polices, les 6 effets de particules et l’anneau d’avatar",
          "Liens sans limite",
          "Badge Premium à côté du nom et retrait de la mention « Fait avec Arcturus »"
        ],
        "cta": "Passer Premium",
        "highlight": true
      },
      {
        "id": "vip",
        "name": "VIP",
        "priceMonth": 6,
        "priceYear": 60,
        "tagline": "Les effets exclusifs et le fond vidéo.",
        "features": [
          "Tout le plan Premium",
          "Fond vidéo en boucle",
          "Curseur personnalisé, traînée d’étincelles et glitch du nom",
          "Anneau animé autour des cartes",
          "Compteur de vues global via ton endpoint",
          "Badge VIP doré à côté du nom"
        ],
        "cta": "Passer VIP",
        "highlight": false
      }
    ],
    "note": "Le plan est déclaratif : Arcturus ne vérifie aucun paiement, config.js fait foi. Les abonnements financent le développement, le support et les prochains widgets.",
    "fallbackUrl": ""
  },
  "faqTitle": "Questions fréquentes",
  "faq": [
    {
      "q": "Comment fonctionne le paiement sans serveur ?",
      "a": "Arcturus n’a ni compte ni backend. Le bouton d’un plan ouvre un lien de paiement hébergé (Stripe Payment Link, Ko-fi, PayPal…) renseigné dans config.js, dans premium.checkout. Une fois payé, tu ouvres le dashboard, section Abonnement, tu sélectionnes ton plan et tu télécharges config.js : les fonctions se débloquent sur ta page."
    },
    {
      "q": "Le plan est-il vérifié quelque part ?",
      "a": "Non. Le site est statique, donc le plan est déclaratif : tu paies, tu déclares premium.plan dans config.js, la page et le dashboard lisent cette déclaration. C’est le même principe qu’une licence, fondé sur la confiance. Les abonnements financent le développement, le support et les prochains widgets."
    },
    {
      "q": "Que se passe-t-il si un réglage dépasse mon plan ?",
      "a": "Rien ne casse. La page applique un repli : fond fluide à la place de la vidéo, police Inter, particules désactivées, les cinq premiers liens, etc. Dans le dashboard, le réglage porte l’étiquette du plan requis, mais ta valeur reste dans config.js et se réactive dès que tu passes au plan supérieur."
    },
    {
      "q": "Comment changer de plan ou arrêter ?",
      "a": "L’abonnement se gère chez le prestataire de paiement, depuis le reçu ou son portail client. Pour monter de niveau, déclare le nouveau plan dans le dashboard et exporte config.js. Si tu arrêtes, repasse sur Gratuit : ta page reste en ligne avec les replis, rien n’est supprimé."
    },
    {
      "q": "Où héberger ma page, et que deviennent les données ?",
      "a": "GitHub Pages, Netlify, Vercel, Cloudflare Pages ou n’importe quel hébergeur de fichiers : tu déposes le dossier tel quel. Les intégrations (Discord via Lanyard, Roblox via RoProxy, osu! via ton endpoint) sont appelées depuis le navigateur du visiteur ; le compteur de vues est local sauf si tu fournis un endpoint. Tu peux retirer dashboard.html du déploiement et brancher ton propre domaine chez l’hébergeur."
    }
  ],
  "final": {
    "title": "Tout gravite autour de toi.",
    "text": "Ouvre le dashboard, règle ta page en regardant l’aperçu, télécharge config.js. Rien d’autre à installer : ta page, et tout ce qui brille autour.",
    "cta": "Créer ma page",
    "secondary": "Voir la démo"
  }
};
