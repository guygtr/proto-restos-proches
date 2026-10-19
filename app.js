'use strict';
// Restos proches — prototype. Tri par distance (géolocalisation du navigateur) + filtre par catégorie.
const TZ = 'America/Toronto';
const CATS = { resto: { label: 'Resto', icone: '🍽️' }, microbrasserie: { label: 'Microbrasserie', icone: '🍺' } };
let restos = [];
let position = null;          // { lat, lng, precision }
let filtre = 'tout';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const fmtDate = new Intl.DateTimeFormat('fr-CA', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const fmtHeure = new Intl.DateTimeFormat('fr-CA', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
// Date « AAAA-MM-JJ » → objet Date à midi UTC (évite le décalage d'un jour selon le fuseau)
const jour = (iso) => new Date(iso + 'T12:00:00Z');
const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); // AAAA-MM-JJ

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, rad = (d) => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function fmtKm(km) { return km.toLocaleString('fr-CA', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km'; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function aCoords(r) { return Number.isFinite(r.lat) && Number.isFinite(r.lng); }
function estFerme(r) { return !!r.ferme_jusqua && aujourdhui() < r.ferme_jusqua; }


const NC = /non confirm|contradictoire|incertain/i;
const vide = (v) => v == null || v === '' || /^(introuvable|sans objet)/i.test(String(v).trim());
const PRIX_LBL = { entrees: 'Entrées', plats: 'Plats', pates: 'Pâtes', desserts: 'Desserts', burgers: 'Burgers', bieres: 'Bières', bouchees: 'Bouchées', menu_midi: 'Midi', cocktails: 'Cocktails' };
function court(t, n = 48) { t = String(t).replace(/\s*\(.*?\)/g, '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
function prixPuces(p) {
  if (!p || typeof p !== 'object') return '';
  return Object.entries(PRIX_LBL).filter(([k]) => !vide(p[k])).slice(0, 4)
    .map(([k, l]) => `<span class="puce prix"><b>${l}</b> ${esc(court(p[k], 40))}</span>`).join('');
}
function liste3(v) {
  if (Array.isArray(v)) return v.slice(0, 3);
  if (v && typeof v === 'object') { const a = Object.values(v).find(Array.isArray); return a ? a.slice(0, 3) : []; }
  return [];
}
function ligne(lbl, html, cls = '') { return html ? `<p class="info ${cls}"><b>${lbl}</b><span>${html}</span></p>` : ''; }
const badgeNC = '<span class="badge-nc">⚠️ non confirmé</span>';

function statut(msg, type) { const el = $('#statut'); el.textContent = msg; el.className = 'statut ' + (type || ''); }

let toastTimer;
function toast(msg, err) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false; t.className = 'toast' + (err ? ' err' : '');
  requestAnimationFrame(() => t.classList.add('visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('visible'); setTimeout(() => { t.hidden = true; }, 300); }, 3000);
}

function carte(r, i) {
  const cat = CATS[r.categorie] || CATS.resto;
  const dist = r.distance != null
    ? `<span class="distance" aria-label="À ${fmtKm(r.distance)}">${fmtKm(r.distance)}</span>`
    : `<span class="distance vide" aria-label="Distance inconnue">— km</span>`;
  const ferme = estFerme(r);
  const puces = [
    `<span class="puce ${r.categorie === 'microbrasserie' ? 'micro' : 'resto'}"><span aria-hidden="true">${cat.icone}</span> ${cat.label}</span>`,
    ferme ? `<span class="puce ferme">Fermée pour la saison · réouverture prévue vers le ${fmtDate.format(jour(r.ferme_jusqua))}</span>` : '',
    !r.confirme ? `<span class="puce">⚠️ Position à confirmer</span>` : ''
  ].join('');
  const horaire = r.horaire ? `<p class="horaire"><b>Horaire${NC.test(r.horaire) ? ' ' + badgeNC : ''}</b><span>${esc(r.horaire)}</span></p>` : '';
  const telNum = r.telephone ? r.telephone.replace(/\s*\(.*$/, '') : '';
  const infos = [
    r.statut ? ligne('Statut', esc(court(r.statut, 110)), ferme ? 'st-ferme' : '') : '',
    r.code_postal && NC.test(r.code_postal) ? ligne('Code postal', `${esc(r.code_postal.replace(/\s*\(.*$/, ''))} ${badgeNC}`) : '',
    telNum ? ligne('Téléphone', `<a href="tel:${esc(telNum.replace(/\D/g, ''))}">${esc(telNum)}</a>${NC.test(r.telephone) ? ' ' + badgeNC : ''}`) : '',
    r.reservation?.url || r.reservation?.via ? ligne('Réservation', (r.reservation.url ? `<a href="${esc(r.reservation.url)}" target="_blank" rel="noopener">${esc(court(r.reservation.via || 'En ligne', 60))} ↗</a>` : esc(court(r.reservation.via, 90))) + (r.reservation.non_confirme || NC.test(r.reservation.via || '') ? ' ' + badgeNC : '')) : '',
    ligne('Plats phares', liste3(r.specialites).map((x) => esc(court(x))).join(' · ')),
    ligne('Bières phares', liste3(r.bieres).map((x) => esc(court(x.split(' — ')[0], 30))).join(' · '))
  ].join('');
  const prix = prixPuces(r.prix);
  const avert = !r.confirme && r.remarque ? `<p class="avert">⚠️ ${esc(r.remarque)}</p>` : '';
  const nom = esc(r.nom);
  const actions = [
    r.reservation?.url ? `<a class="btn-plein" href="${esc(r.reservation.url)}" target="_blank" rel="noopener" aria-label="Réserver chez ${nom} (${esc(r.reservation.via || '')})">Réserver${r.reservation.via ? ' · ' + esc(r.reservation.via) : ''}</a>` : '',
    aCoords(r) ? `<a class="${r.reservation?.url ? 'btn-ligne' : 'btn-plein'}" href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}" target="_blank" rel="noopener" aria-label="Itinéraire vers ${nom} dans Google Maps">Itinéraire</a>` : '',
    r.site ? `<a class="btn-ligne" href="${esc(r.site)}" target="_blank" rel="noopener" aria-label="Site web de ${nom}">Site web</a>` : '',
    r.telephone ? `<a class="btn-ligne" href="tel:${esc(r.telephone.replace(/\D/g, ''))}" aria-label="Appeler ${nom}">Appeler</a>` : ''
  ].join('');
  return `<article class="carte${ferme ? ' ferme' : ''}" data-nom="${nom}" data-categorie="${esc(r.categorie)}" style="animation-delay:${Math.min(i, 10) * 30}ms">
    <div class="haut"><div><h2><span class="rang" aria-hidden="true">${i + 1}</span>${nom}</h2><p class="ville">${esc(r.ville)}</p></div>${dist}</div>
    <div class="puces">${puces}</div>
    <p class="adresse">${esc(r.adresse)}</p>
    <p class="note">${esc(r.note)}</p>
    ${prix ? `<div class="puces prix-l">${prix}</div>` : ''}
    ${horaire}
    <div class="infos">${infos}</div>
    ${avert}
    <div class="actions">${actions}</div>
  </article>`;
}

function rendre() {
  let liste = restos.map((r) => ({ ...r, distance: position && aCoords(r) ? haversineKm(position.lat, position.lng, r.lat, r.lng) : null }));
  if (position) liste.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  if (filtre !== 'tout') liste = liste.filter((r) => r.categorie === filtre);
  $('#liste').innerHTML = liste.length ? liste.map(carte).join('') : '<p class="vide-liste">Aucun endroit dans cette catégorie.</p>';
}

function compter() {
  $('#nb-tout').textContent = restos.length;
  for (const c of Object.keys(CATS)) { const el = $('#nb-' + c); if (el) el.textContent = restos.filter((r) => r.categorie === c).length; }
}

function choisirFiltre(f, annonce) {
  filtre = ['resto', 'microbrasserie'].includes(f) ? f : 'tout';
  $$('.filtre').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtre === filtre)));
  const url = new URL(location.href);
  if (filtre === 'tout') url.searchParams.delete('filtre'); else url.searchParams.set('filtre', filtre);
  history.replaceState(null, '', url);
  rendre();
  if (annonce) {
    const n = $$('#liste .carte').length;
    toast(`${n} ${filtre === 'microbrasserie' ? 'microbrasserie' : filtre === 'resto' ? 'resto' : 'endroit'}${n > 1 ? 's' : ''}${position ? ', du plus proche au plus loin' : ''}`);
  }
}

function localiser() {
  const btn = $('#btn-loc');
  if (!('geolocation' in navigator)) {
    rendre();
    statut('Ton navigateur ne permet pas la géolocalisation. Liste non triée.', 'erreur');
    toast('📍 Géolocalisation non disponible', true);
    return;
  }
  btn.disabled = true; btn.setAttribute('aria-busy', 'true');
  statut('Recherche de ta position…');
  const fin = () => { btn.disabled = false; btn.removeAttribute('aria-busy'); };
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fin();
      position = { lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy };
      rendre();
      statut(`Trié du plus proche au plus loin · position à ±${Math.round(position.precision || 0)} m · ${fmtHeure.format(new Date())}`, 'ok');
      toast('📍 Position trouvée : liste triée par distance');
    },
    (err) => {
      fin();
      rendre();
      const msg = {
        1: 'Tu as refusé l\'accès à ta position. Liste non triée. Autorise la localisation puis appuie sur « Me localiser ».',
        2: 'Position introuvable pour l\'instant. Liste non triée. Réessaie avec « Me localiser ».',
        3: 'La recherche de position a pris trop de temps. Liste non triée. Réessaie avec « Me localiser ».'
      }[err.code] || 'Impossible d\'obtenir ta position. Liste non triée.';
      statut(msg, 'erreur');
      toast(err.code === 1 ? '📍 Position refusée' : '📍 Position introuvable', true);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
}

async function init() {
  $('#btn-loc').addEventListener('click', localiser);
  $$('.filtre').forEach((b) => b.addEventListener('click', () => choisirFiltre(b.dataset.filtre, true)));
  try {
    const rep = await fetch('restos.json', { cache: 'no-cache' });
    if (!rep.ok) throw new Error('HTTP ' + rep.status);
    const data = await rep.json();
    restos = (data.restos || []).map((r) => ({ categorie: 'resto', ...r }));
    if (data.mise_a_jour) $('#maj').textContent = `Liste mise à jour le ${fmtDate.format(jour(data.mise_a_jour))} · ${restos.length} endroits`;
  } catch (e) {
    statut('Impossible de charger la liste (' + e.message + ').', 'erreur');
    return;
  }
  compter();
  choisirFiltre(new URLSearchParams(location.search).get('filtre') || 'tout', false);
  localiser();
}

init();
