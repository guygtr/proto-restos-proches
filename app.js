'use strict';
let restos = [];
const $ = (s) => document.querySelector(s);

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, rad = (d) => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtKm(km) {
  return km.toLocaleString('fr-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function aCoords(r) { return Number.isFinite(r.lat) && Number.isFinite(r.lng); }

function statut(msg, type) {
  const el = $('#statut');
  el.textContent = msg;
  el.className = type || '';
}

function afficher(liste) {
  $('#liste').innerHTML = liste.map((r) => {
    const dist = r.distance != null
      ? `<span class="distance">${fmtKm(r.distance)}</span>`
      : `<span class="distance vide">— km</span>`;
    const avert = !r.confirme
      ? `<p class="avert">⚠️ Position à confirmer${r.remarque ? ' : ' + esc(r.remarque) : ''}</p>` : '';
    const iti = aCoords(r)
      ? `<a class="btn-iti" href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener">Itinéraire</a>` : '';
    const site = r.site ? `<a class="btn-site" href="${esc(r.site)}" target="_blank" rel="noopener">Site web</a>` : '';
    return `<article class="carte" data-nom="${esc(r.nom)}">
      <div class="haut"><div><h2>${esc(r.nom)}${r.confirme ? '' : ' ⚠️'}</h2><p class="ville">${esc(r.ville)}</p></div>${dist}</div>
      <p class="adresse">${esc(r.adresse)}</p>
      <p class="note">${esc(r.note)}</p>
      ${avert}
      <div class="actions">${site}${iti}</div>
    </article>`;
  }).join('');
}

function trierDepuis(lat, lng) {
  const liste = restos.map((r) => ({ ...r, distance: aCoords(r) ? haversineKm(lat, lng, r.lat, r.lng) : null }));
  liste.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  afficher(liste);
  statut(`Trié du plus proche au plus loin (précision de ta position : ±${Math.round(window.__precision || 0)} m).`, 'ok');
}

function localiser() {
  const btn = $('#btn-loc');
  if (!('geolocation' in navigator)) {
    afficher(restos);
    statut('Ton navigateur ne permet pas la géolocalisation. Liste non triée.', 'erreur');
    return;
  }
  btn.disabled = true;
  statut('Recherche de ta position…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btn.disabled = false;
      window.__precision = pos.coords.accuracy;
      trierDepuis(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      btn.disabled = false;
      afficher(restos);
      const msg = {
        1: 'Tu as refusé l\'accès à ta position. Liste non triée. Autorise la localisation puis appuie sur « Me localiser ».',
        2: 'Position introuvable pour l\'instant. Liste non triée. Réessaie avec « Me localiser ».',
        3: 'La recherche de position a pris trop de temps. Liste non triée. Réessaie avec « Me localiser ».'
      }[err.code] || 'Impossible d\'obtenir ta position. Liste non triée.';
      statut(msg, 'erreur');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

async function init() {
  $('#btn-loc').addEventListener('click', localiser);
  try {
    const rep = await fetch('restos.json', { cache: 'no-cache' });
    if (!rep.ok) throw new Error('HTTP ' + rep.status);
    const data = await rep.json();
    restos = data.restos || [];
    if (data.mise_a_jour) $('#maj').textContent = 'Liste mise à jour le ' + data.mise_a_jour + ' · ' + restos.length + ' restos';
  } catch (e) {
    statut('Impossible de charger la liste des restos (' + e.message + ').', 'erreur');
    return;
  }
  afficher(restos);
  localiser();
}

init();
