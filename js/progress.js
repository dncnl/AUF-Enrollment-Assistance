/**
 * Which enrollment steps the student has ticked off, persisted per browser.
 *
 * This is a convenience for someone walking the campus with a phone — it is not
 * a university record, and nothing on the page claims the school can see it.
 *
 * Every storage access is guarded. A private window, cleared site data, or a
 * browser set to block storage can throw on plain access, and the page has to
 * render correctly with no stored value. When storage is unavailable the set
 * still works for the current session; it just does not survive a reload.
 */

const KEY = 'auf-enrollflow-progress-v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...done]));
  } catch {
    /* Storage unavailable — progress stays in memory for this session only. */
  }
}

let done = new Set(load());

/** @param {string} number */
export function isDone(number) {
  return done.has(number);
}

export function doneCount() {
  return done.size;
}

/**
 * Flip one step and persist. Returns the step's new state.
 * @param {string} number
 */
export function toggle(number) {
  if (done.has(number)) done.delete(number);
  else done.add(number);
  save();
  return done.has(number);
}

export function reset() {
  done = new Set();
  save();
}

/**
 * The first step not yet ticked — the answer to "where do I go next?", which
 * the README names as the whole point of the app.
 * @param {{number: string}[]} steps
 */
export function nextStep(steps) {
  return steps.find((step) => !done.has(step.number)) ?? null;
}
