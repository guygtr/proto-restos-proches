# proto-restos-proches

## L'idée
Une petite page web pour le cell qui liste nos restos et microbrasseries à essayer et les trie **du plus proche au plus loin** selon ta position GPS (géolocalisation du navigateur). Chaque fiche montre la distance (à vol d'oiseau, en km), la catégorie, l'adresse, une courte note, l'horaire, et des boutons **Réserver** (quand connu), **Itinéraire** (Google Maps), **Site web** et **Appeler**.

Un filtre en haut permet d'afficher **Tout** (par défaut), seulement les **Restos** ou seulement les **Microbrasseries**, toujours triés par distance. Lien direct possible : `?filtre=microbrasserie` ou `?filtre=resto`.

Un endroit saisonnier fermé affiche un badge **Fermé jusqu'au …** (champ `ferme_jusqua`).

Si tu refuses la localisation (ou si elle échoue), la liste s'affiche quand même, non triée, avec un message.

Les restos marqués ⚠️ ont une position **à confirmer** (coordonnées approximatives).

## Comment lancer
- **En ligne** : GitHub Pages (HTTPS, donc la géolocalisation marche).
- **En local** :
  ```bash
  python3 -m http.server 8000
  ```
  puis ouvre http://localhost:8000. La géolocalisation ne marche que sur `localhost` ou en HTTPS (pas sur une adresse IP en `http://`).

## Ajouter un resto (restos.json)
Toutes les données sont dans `restos.json`. Pour ajouter un resto, copie une fiche dans le tableau `restos`, remplis-la et mets à jour `mise_a_jour`.

| Champ | Type | Description |
|---|---|---|
| `nom` | texte | Nom du resto |
| `categorie` | texte | `resto` ou `microbrasserie` (sert au filtre; `resto` par défaut si absent) |
| `note` | texte | Type de cuisine, prix, jours d'ouverture, etc. (court) |
| `adresse` | texte | Adresse civique (idéalement avec code postal) |
| `ville` | texte | Ville et quartier, ex. `Québec (Montcalm)` |
| `lat`, `lng` | nombre | Coordonnées en degrés décimaux (ex. `46.8047`, `-71.2256`) |
| `site` | URL | Site officiel |
| `horaire` | texte | Heures d'ouverture courtes, ex. `Mercredi au samedi, 17 h – 22 h` (vide si inconnu) |
| `reservation` | objet ou `null` | `{ "url": "…", "via": "Libro" }` : lien de réservation et service utilisé |
| `telephone` | texte | Numéro affiché (bouton Appeler), vide si inconnu |
| `ferme_jusqua` | date | `AAAA-MM-JJ` : fermé jusqu'à cette date (badge rouge), vide sinon |
| `source_horaire` | texte | D'où vient l'horaire |
| `source_adresse` | texte | D'où vient l'adresse (site officiel, etc.) |
| `source_coords` | texte | D'où viennent les coordonnées (OpenStreetMap/Nominatim, lien Google Maps du site, etc.) |
| `confirme` | booléen | `true` si l'adresse et la position sont vérifiées, sinon `false` (affiche ⚠️) |
| `remarque` | texte | Ce qui reste à confirmer (vide si rien) |

Exemple :
```json
{
  "nom": "Nouveau resto",
  "categorie": "resto",
  "note": "Bistro, 25-30 $, fermé le lundi.",
  "adresse": "123, rue Exemple, G1R 1A1",
  "ville": "Québec (Saint-Roch)",
  "lat": 46.8139,
  "lng": -71.2245,
  "site": "https://exemple.ca",
  "horaire": "Mardi au samedi, dès 17 h",
  "reservation": { "url": "https://exemple.ca/reserver", "via": "Libro" },
  "telephone": "418 555-0123",
  "ferme_jusqua": "",
  "source_horaire": "Site officiel",
  "source_adresse": "Site officiel",
  "source_coords": "OpenStreetMap (Nominatim)",
  "confirme": true,
  "remarque": ""
}
```
Astuce pour trouver les coordonnées : sur Google Maps, clic droit (ou appui long) sur le resto, puis copie les deux nombres. Ne mets pas de coordonnées au hasard : si tu n'es pas sûr, mets `confirme: false` et explique dans `remarque`.

## Design (Altair)
Refonte visuelle selon le skill **Altair (UI/UX)** de GrokBuild, style **GTR-Glass** inspiré de `shared-ui/glass-card.tsx` (verre dépoli `border-white/10`, coins 16 px, grande ombre) et de la variante **gold** de `shared-ui/neon-button.tsx` (`--color-gold`, comme bar-manager). HTML/CSS/JS simple, police Inter (Google Fonts), aucune étape de build.

**Tokens** (`style.css`, `:root`) :
- Couleurs : `--c-bg` #0c0a09, `--c-surface` (blanc 5,5 %), `--c-border` (blanc 10 %), `--c-text` #f7f3ee, `--c-text-muted` #b9aea3, `--color-gold` #e6c36a (accent, distance, filtre actif), `--c-gold-ink` (texte sur or), `--c-micro` #fbbf24 (microbrasseries), `--c-warn` (⚠️ à confirmer), `--c-closed` (fermé), `--c-focus`.
- Espacements `--s-1`…`--s-8` (échelle 4 px) · typo `--t-xs`…`--t-xl` · rayons `--r-sm/md/lg/pill` · `--glass-blur`, `--glass-shadow`, `--shadow-gold`.
- Z-index : `--z-header` 20 (en-tête collant en verre) < `--z-toast` 40.

**Composants** :
- `index.html` : en-tête collant `.entete.glass`, bouton neon gold `#btn-loc`, filtre segmenté `.filtres` (Tout / Restos / Microbrasseries, `aria-pressed`, compteurs), `#statut` (`role=status`), toast `#toast`.
- `style.css` : `.carte` (verre, rang, pastille de distance or), `.puce` (catégorie, ⚠️, `Fermé jusqu'au …`), `.horaire`, `.avert`, `.actions` (Réserver · Itinéraire · Site web · Appeler), `.toast`.
- `app.js` : `carte()`, `rendre()` (tri par distance puis filtre), `choisirFiltre()` (aussi via `?filtre=microbrasserie`), `toast()` (position trouvée / refusée, filtre appliqué), dates en `America/Toronto`.

**Accessibilité** : contrastes WCAG AA (texte secondaire ≈ 9:1, texte foncé sur or ≈ 11:1), focus visible or, cibles tactiles ≥ 44 px, `aria-label` sur les boutons et liens d'action, `prefers-reduced-motion` respecté. Mobile d'abord, colonne centrée à 760 px max sur grand écran.

Captures : `screenshots/before-mobile.png` (ancien design), `screenshots/after-mobile.png` (filtre Tout), `screenshots/after-microbrasseries.png` (filtre Microbrasseries), 390 × 844, position simulée 46.8122, -71.2054.

## Prochaines étapes
- Confirmer la position exacte du Relais des Florent, du Blaxton Lebourgneuf et du Plongeon (230 rue Principale absent d'OpenStreetMap).
- Confirmer l'horaire du Brasseur des Monts (le site affiche deux horaires).
- Filtres (ville, prix, jour d'ouverture) et « ouvert maintenant ».
- Distance et temps en auto réels (et non à vol d'oiseau).
- Petite carte avec les restos.
- Mise à jour hebdo automatique de `restos.json` depuis le bot Achat et réservation.
