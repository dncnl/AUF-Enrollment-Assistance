/**
 * Shared rendering helpers.
 *
 * `escapeHtml` lives here rather than in app.js because campus.js needs it too,
 * and importing it from app.js would make the two modules circular.
 */

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

/**
 * Outline icon set, drawn in the Phosphor manner: 24x24 box, 1.5px stroke, no
 * fills. Every icon here sits beside its own visible text label, so callers
 * mark them aria-hidden — none of them is the only carrier of meaning.
 */
const PATHS = {
  house: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  steps:
    '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 5.5 1.4 1.4L7 4.3M3 11.5l1.4 1.4L7 10.3M3 17.5l1.4 1.4L7 16.3"/>',
  map: '<path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z"/><path d="M9 4v13M15 7v13"/>',
  ask: '<path d="M20 4H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3v4l5-4h8a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z"/>',
  faq:
    '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.4v.5"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  caret: '<path d="m6 9.5 6 6 6-6"/>',
  external:
    '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.75"/><path d="M15.6 15.6 21 21"/>',
  warning: '<path d="M12 4 2.6 20.2h18.8z"/><path d="M12 10.2v4.2"/><circle cx="12" cy="17.4" r=".9" fill="currentColor" stroke="none"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.6 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.6-3.6-9S9.6 5.5 12 3z"/>',
};

/**
 * @param {keyof PATHS} name
 * @param {string} [className]
 */
export function icon(name, className = 'icon') {
  const body = PATHS[name];
  if (!body) return '';
  return (
    `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ` +
    `fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ` +
    `stroke-linejoin="round">${body}</svg>`
  );
}
