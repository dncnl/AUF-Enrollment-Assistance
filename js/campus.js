/**
 * Campus wayfinding.
 *
 * Two layers, deliberately independent:
 *
 *   1. Directions links — a Google Maps search URL per building. No API key, no
 *      coordinates, and on a phone it hands off to the native Maps app. This
 *      always works.
 *   2. A schematic campus map — rendered only once every building in data.js
 *      carries real x/y coordinates. Until then this module renders layer 1
 *      alone rather than drawing pins in invented positions.
 */

import { BUILDINGS, TRIPS } from './data.js';
import { escapeHtml, icon } from './dom.js';

/** @param {string} query */
export function mapsHref(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** @param {string} id */
export function buildingById(id) {
  return BUILDINGS.find((building) => building.id === id) ?? null;
}

/** True once the real campus layout has been filled into data.js. */
export function hasLayout() {
  return BUILDINGS.every(
    (b) => typeof b.x === 'number' && typeof b.y === 'number',
  );
}

function tripFor(buildingId) {
  return TRIPS.find((trip) => trip.buildingId === buildingId) ?? null;
}

/**
 * A directions link. Rendered as an anchor rather than a button because it
 * genuinely navigates, and students expect long-press to work on it.
 */
export function directionsLink(building, { compact = false } = {}) {
  if (!building) return '';
  // `shortName` keeps the pill button on one line for a building whose full,
  // correct name is too long to sit inside "Directions to …" — the card's
  // own heading nearby still carries the full name.
  const displayName = building.shortName || building.name;
  const label = compact ? 'Directions' : `Directions to ${displayName}`;
  // Compact mode always sits right under the building's own name, but three
  // of these can end up on one screen at once (place cards) or announced out
  // of that context (a screen reader's links list) — spell it out for
  // assistive tech even when the visible label stays short.
  const ariaLabel = compact ? ` aria-label="${escapeHtml(`Directions to ${building.name}`)}"` : '';
  return (
    `<a class="dirlink${compact ? ' dirlink--compact' : ''}" ` +
    `href="${escapeHtml(mapsHref(building.mapQuery))}"${ariaLabel} ` +
    `target="_blank" rel="noopener">` +
    `${icon('pin')}<span>${escapeHtml(label)}</span>${icon('external', 'icon icon--sm')}` +
    `</a>`
  );
}

/**
 * WebP with the JPEG as the fallback source. Every photo ships as both, so the
 * .webp path is derived rather than carried in data.js. The wrapper's
 * aspect-ratio already reserves the space; width/height carry the file's real
 * intrinsic size so nothing depends on the CSS having loaded first.
 */
function photoMarkup({ photo, photoWidth, photoHeight }) {
  const webp = photo.replace(/\.jpe?g$/i, '.webp');
  return `
    <div class="place__photo">
      <picture>
        <source srcset="${escapeHtml(webp)}" type="image/webp">
        <img src="${escapeHtml(photo)}" alt="" loading="lazy" decoding="async"
             width="${escapeHtml(photoWidth)}" height="${escapeHtml(photoHeight)}">
      </picture>
    </div>`;
}

function placeCard(building) {
  const trip = tripFor(building.id);
  return `
    <li class="place" id="place-${escapeHtml(building.id)}">
      ${building.photo ? photoMarkup(building) : ''}
      <div class="place__head">
        <h3 class="place__name">${escapeHtml(building.name)}</h3>
        <p class="place__aka">${escapeHtml(building.aka)}</p>
      </div>
      ${
        trip
          ? `<p class="place__trip">${icon('check', 'icon icon--sm')}<span>${escapeHtml(trip.note)}</span></p>`
          : ''
      }
      ${
        building.rooms.length
          ? `<ul class="place__rooms">
               ${building.rooms.map((room) => `<li>${escapeHtml(room)}</li>`).join('')}
             </ul>`
          : ''
      }
      ${directionsLink(building)}
    </li>`;
}

/**
 * The schematic map. Only called when hasLayout() is true, so every pin has a
 * real position behind it.
 */
function schematic() {
  const pins = BUILDINGS.map(
    (b) => `
      <a class="campusmap__pin" href="#place-${escapeHtml(b.id)}"
         data-x="${b.x}" data-y="${b.y}">
        <span class="campusmap__dot" aria-hidden="true"></span>
        <span class="campusmap__label">${escapeHtml(b.name)}</span>
      </a>`,
  ).join('');

  return `
    <div class="campusmap">
      <div class="campusmap__frame">
        <img class="campusmap__base" src="assets/campus-map.png" alt="" loading="lazy">
        ${pins}
      </div>
      <p class="campusmap__hint">Tap a building to jump to its details.</p>
    </div>`;
}

/** @param {HTMLElement} el */
export function renderCampus(el) {
  if (!el) return;
  el.innerHTML = `
    ${hasLayout() ? schematic() : ''}
    <ul class="places">${BUILDINGS.map(placeCard).join('')}</ul>
  `;

  // Positioned from script rather than a style attribute: CSP blocks inline
  // styles, and the CSSOM route keeps style-src free of 'unsafe-inline'.
  el.querySelectorAll('.campusmap__pin').forEach((pin) => {
    pin.style.left = `${pin.dataset.x}%`;
    pin.style.top = `${pin.dataset.y}%`;
  });
}
