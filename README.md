# proto-restos-proches

## L'idée
Une petite page web pour le cell qui liste nos restos à essayer et les trie **du plus proche au plus loin** selon ta position GPS (géolocalisation du navigateur). Chaque fiche montre la distance (à vol d'oiseau, en km), l'adresse, une courte note, le lien du site officiel et un bouton **Itinéraire** (Google Maps).

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
| `note` | texte | Type de cuisine, prix, jours d'ouverture, etc. (court) |
| `adresse` | texte | Adresse civique (idéalement avec code postal) |
| `ville` | texte | Ville et quartier, ex. `Québec (Montcalm)` |
| `lat`, `lng` | nombre | Coordonnées en degrés décimaux (ex. `46.8047`, `-71.2256`) |
| `site` | URL | Site officiel |
| `source_adresse` | texte | D'où vient l'adresse (site officiel, etc.) |
| `source_coords` | texte | D'où viennent les coordonnées (OpenStreetMap/Nominatim, lien Google Maps du site, etc.) |
| `confirme` | booléen | `true` si l'adresse et la position sont vérifiées, sinon `false` (affiche ⚠️) |
| `remarque` | texte | Ce qui reste à confirmer (vide si rien) |

Exemple :
```json
{
  "nom": "Nouveau resto",
  "note": "Bistro, 25-30 $, fermé le lundi.",
  "adresse": "123, rue Exemple, G1R 1A1",
  "ville": "Québec (Saint-Roch)",
  "lat": 46.8139,
  "lng": -71.2245,
  "site": "https://exemple.ca",
  "source_adresse": "Site officiel",
  "source_coords": "OpenStreetMap (Nominatim)",
  "confirme": true,
  "remarque": ""
}
```
Astuce pour trouver les coordonnées : sur Google Maps, clic droit (ou appui long) sur le resto, puis copie les deux nombres. Ne mets pas de coordonnées au hasard : si tu n'es pas sûr, mets `confirme: false` et explique dans `remarque`.

## Prochaines étapes
- Confirmer la position exacte du Relais des Florent et du Blaxton Lebourgneuf.
- Filtres (ville, prix, jour d'ouverture) et « ouvert maintenant ».
- Distance et temps en auto réels (et non à vol d'oiseau).
- Petite carte avec les restos.
- Mise à jour hebdo automatique de `restos.json` depuis le bot Achat et réservation.
