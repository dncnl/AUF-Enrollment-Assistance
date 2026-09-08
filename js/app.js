import { STEPS, DRESS_CODE, CHIPS, FAQS, PASSAGE, TRIPS, ONLINE } from './data.js';
import { answer, warmup, MODEL_INFO, LOW_CONFIDENCE } from './qna.js';
import { escapeHtml, icon } from './dom.js';
import { renderCampus, directionsLink, buildingById } from './campus.js';
import * as progress from './progress.js';

const form = document.getElementById('ask-form');
const input = document.getElementById('ask-input');
const button = document.getElementById('ask-button');
const answerEl = document.getElementById('answer');
const modelStateEl = document.getElementById('model-state');
const stepsEl = document.getElementById('steps');
const progressEl = document.getElementById('progress');

/** One definition drives both the desktop nav and the mobile tab bar. */
const NAV = [
  { href: '#home', label: 'Home', icon: 'house' },
  { href: '#guide', label: 'Steps', icon: 'steps' },
  { href: '#campus', label: 'Campus', icon: 'map' },
  { href: '#assist', label: 'Ask', icon: 'ask' },
  { href: '#faqs', label: 'FAQs', icon: 'faq' },
];

/* ---------- Steps -------------------------------------------------------- */

function tripFor(step) {
  return (
    TRIPS.find(
      (trip) => trip.buildingId === step.buildingId && trip.steps.includes(step.number),
    ) ?? null
  );
}

/** Where the head line says to go, in as few words as fit on a phone. */
function whereLabel(step) {
  if (step.buildingId === 'online') return 'Online — before you travel';
  return buildingById(step.buildingId)?.name ?? step.location;
}

function bringBlock(step) {
  if (!step.bring?.length) return '';
  return `
    <div class="bring">
      <p class="bring__label">Bring with you</p>
      <ul class="bring__list">
        ${step.bring
          .map((item) => `<li>${icon('check', 'icon icon--sm')}<span>${escapeHtml(item)}</span></li>`)
          .join('')}
      </ul>
    </div>`;
}

function stepFoot(step) {
  const done = progress.isDone(step.number);
  const building = buildingById(step.buildingId);
  const away =
    step.buildingId === 'online'
      ? `<a class="dirlink dirlink--compact" href="${escapeHtml(ONLINE.href)}" target="_blank" rel="noopener">` +
        `${icon('globe')}<span>Open myAU</span>${icon('external', 'icon icon--sm')}</a>`
      : directionsLink(building, { compact: true });

  return `
    <div class="step__foot">
      <button class="step__done" type="button" aria-pressed="${done}">
        ${done ? icon('check', 'icon icon--sm') : ''}<span>${done ? 'Marked as done' : 'Mark as done'}</span>
      </button>
      ${away}
    </div>`;
}

function stepMarkup(step, nextNumber) {
  const done = progress.isDone(step.number);
  const isNext = step.number === nextNumber;
  const trip = tripFor(step);
  const classes = ['step', done ? 'is-done' : '', isNext ? 'is-next' : ''].filter(Boolean);

  return `
    <li>
      <details class="${classes.join(' ')}" data-step="${escapeHtml(step.number)}" ${isNext ? 'open' : ''}>
        <summary class="step__head">
          <span class="step__num">${done ? icon('check', 'icon icon--sm') : escapeHtml(step.number)}</span>
          <span class="step__headings">
            <span class="step__label">Step ${escapeHtml(step.number)}${isNext ? ' · Do this next' : ''}</span>
            <span class="step__title">${escapeHtml(step.title)}</span>
            <span class="step__at">${escapeHtml(whereLabel(step))}</span>
          </span>
          ${icon('caret', 'icon step__caret')}
        </summary>
        <div class="step__body">
          <p class="step__detail">${escapeHtml(step.detail)}</p>
          ${trip ? `<p class="step__trip">${icon('check', 'icon icon--sm')}<span>${escapeHtml(trip.note)}</span></p>` : ''}
          ${bringBlock(step)}
          <p class="step__loc">${icon('pin', 'icon icon--sm')}<span>${escapeHtml(step.location)}</span></p>
          ${stepFoot(step)}
        </div>
      </details>
    </li>`;
}

function renderSteps() {
  const next = progress.nextStep(STEPS);
  stepsEl.innerHTML = STEPS.map((step) => stepMarkup(step, next?.number)).join('');
  renderProgress();
}

function renderProgress() {
  const total = STEPS.length;
  const count = progress.doneCount();
  const pct = Math.round((count / total) * 100);

  progressEl.innerHTML = `
    <p class="progress__text">${count === total ? 'All steps done' : `${count} of ${total} done`}</p>
    <div class="progress__bar" role="progressbar"
         aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${total}"
         aria-label="Enrollment steps completed">
      <div class="progress__fill"></div>
    </div>
    ${count > 0 ? '<button class="progress__reset" type="button" id="progress-reset">Reset</button>' : ''}
  `;

  // Set from script rather than a style attribute: CSP blocks inline styles,
  // and going through the CSSOM keeps style-src free of 'unsafe-inline'.
  const fill = progressEl.querySelector('.progress__fill');
  if (fill) fill.style.width = `${pct}%`;
}

/**
 * Update one step in place. Re-rendering the whole list would throw away which
 * panels the student has open, so only the changed card is rewritten.
 */
function refreshStep(details) {
  const number = details.dataset.step;
  const step = STEPS.find((s) => s.number === number);
  if (!step) return;

  const done = progress.isDone(number);
  details.classList.toggle('is-done', done);

  const num = details.querySelector('.step__num');
  if (num) num.innerHTML = done ? icon('check', 'icon icon--sm') : escapeHtml(number);

  const doneBtn = details.querySelector('.step__done');
  if (doneBtn) {
    doneBtn.setAttribute('aria-pressed', String(done));
    doneBtn.innerHTML =
      `${done ? icon('check', 'icon icon--sm') : ''}<span>${done ? 'Marked as done' : 'Mark as done'}</span>`;
  }

  // "Do this next" can move to a different card, so refresh that marker across
  // the whole list without rebuilding it.
  const next = progress.nextStep(STEPS);
  stepsEl.querySelectorAll('.step').forEach((el) => {
    const isNext = el.dataset.step === next?.number;
    el.classList.toggle('is-next', isNext);
    const label = el.querySelector('.step__label');
    if (label) {
      label.textContent = `Step ${el.dataset.step}${isNext ? ' · Do this next' : ''}`;
    }
  });
}

function wireSteps() {
  stepsEl.addEventListener('click', (event) => {
    const toggle = event.target.closest('.step__done');
    if (!toggle) return;
    const details = toggle.closest('.step');
    progress.toggle(details.dataset.step);
    refreshStep(details);
    renderProgress();
  });

  progressEl.addEventListener('click', (event) => {
    if (!event.target.closest('#progress-reset')) return;
    progress.reset();
    renderSteps();
  });
}

/* ---------- Other content ------------------------------------------------ */

function renderDressCode() {
  document.getElementById('dress-intro').textContent = DRESS_CODE.intro;
  document.getElementById('dress-note').textContent = DRESS_CODE.note;
  document.getElementById('dress-list').innerHTML = DRESS_CODE.prohibited
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
}

function renderChips() {
  const list = document.getElementById('chips-list');
  list.innerHTML = CHIPS.map(
    (text) => `<li><button class="chip" type="button">${escapeHtml(text)}</button></li>`,
  ).join('');

  list.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    input.value = chip.textContent.trim();
    form.requestSubmit();
  });
}

function renderFaqs() {
  document.getElementById('faq-list').innerHTML = FAQS.map(
    (faq) => `
      <details class="faq">
        <summary class="faq__q">
          <span>${escapeHtml(faq.question)}</span>
          ${icon('caret', 'icon faq__caret')}
        </summary>
        <p class="faq__a">${escapeHtml(faq.answer)}</p>
      </details>`,
  ).join('');
}

/** One NAV definition, two presentations: tab bar on mobile, rail on desktop. */
function renderNav() {
  document.getElementById('tabbar').innerHTML = NAV.map(
    (item) => `
      <a class="tab" href="${item.href}">
        ${icon(item.icon)}
        <span>${escapeHtml(item.label)}</span>
      </a>`,
  ).join('');

  document.getElementById('rail').innerHTML = NAV.map(
    (item) =>
      `<li><a class="rail__link" href="${item.href}">${icon(item.icon)}<span>${escapeHtml(item.label)}</span></a></li>`,
  ).join('');
}

/* ---------- Model state -------------------------------------------------- */

let modelPromise = null;

function setModelState(kind, text) {
  if (!text) {
    modelStateEl.hidden = true;
    return;
  }
  modelStateEl.hidden = false;
  modelStateEl.className = `modelstate is-${kind}`;
  modelStateEl.innerHTML = `<span class="modelstate__dot" aria-hidden="true"></span><span>${escapeHtml(text)}</span>`;
}

function onModelProgress(fraction) {
  if (!MODEL_INFO.needsDownload) return;
  const pct = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
  if (pct < 100) setModelState('loading', `Preparing the offline assistant… ${pct}%`);
}

/**
 * Load the model at most once. Deferred to the first question when it costs a
 * download, so nobody spends mobile data just by opening the page.
 */
function ensureModel() {
  if (!modelPromise) {
    modelPromise = warmup(onModelProgress)
      .then((ok) => {
        setModelState('ready', MODEL_INFO.needsDownload ? 'Assistant ready — works offline from here' : '');
        return ok;
      })
      .catch((error) => {
        setModelState('failed', 'Assistant unavailable — the steps and FAQs below still work.');
        throw error;
      });
  }
  return modelPromise;
}

/* ---------- Asking ------------------------------------------------------- */

async function onAsk(event) {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) {
    nudgeSearch();
    input.focus();
    return;
  }

  setBusy(true);
  showState(
    '<span class="spinner" aria-hidden="true"></span>' +
      '<span><strong>Searching the enrollment guidelines…</strong>' +
      'Reading the official AUF passage for your answer.</span>',
    // Bars in the shape of the answer that is coming. A blank pause reads as
    // a page that has stalled; this reads as a page that is working.
    '<div class="answer__loading" aria-hidden="true">' +
      '<span class="answer__skeleton"></span>' +
      '<span class="answer__skeleton"></span>' +
      '<span class="answer__skeleton"></span>' +
      '</div>',
  );

  try {
    await ensureModel();
    const result = await answer(question, PASSAGE);
    if (result) showAnswer(question, result);
    else showNoMatch();
  } catch (error) {
    console.error(error);
    showState(
      '<span><strong>Something went wrong.</strong>' +
        'The assistant could not read the guidelines just now. The steps and FAQs below still work.</span>',
      escalationActions(),
    );
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  button.disabled = busy;
  button.textContent = busy ? 'Asking…' : 'Ask Assist';
}

/**
 * Submitted with nothing typed. A shake says "this field, now" without
 * printing an error the student then has to dismiss. Focus moves there
 * regardless, so the animation is never the only thing carrying it.
 */
function nudgeSearch() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  form.classList.remove('is-empty');
  void form.offsetWidth; // reflow, so a second empty submit replays the shake
  form.classList.add('is-empty');
  form.addEventListener('animationend', () => form.classList.remove('is-empty'), {
    once: true,
  });
}

function escalationActions() {
  return `
    <div class="answer__actions">
      <a class="btn btn--ghost" href="#guide">Browse the seven steps</a>
      <a class="btn btn--ghost" href="#campus">Find the right office</a>
    </div>`;
}

function showAnswer(question, result) {
  const low = result.score < LOW_CONFIDENCE;
  reveal(`
    <p class="answer__question">You asked: <strong>${escapeHtml(question)}</strong></p>
    <p class="answer__label">Answer</p>
    <p class="answer__text">${escapeHtml(result.text)}</p>
    ${
      low
        ? `<p class="answer__caveat">${icon('warning', 'icon icon--sm')}<span>This is the closest match in the guidelines, but it may not be what you meant. Check the step cards below before you travel.</span></p>`
        : ''
    }
    <p class="answer__source">${highlightSpan(PASSAGE, result)}</p>
    <p class="answer__meta">
      Confidence ${(result.score * 100).toFixed(0)}% · extracted by ${escapeHtml(MODEL_INFO.name)}
      from the AUF New Student Enrollment Guidelines
    </p>
    ${low ? escalationActions() : ''}
  `);
}

function showNoMatch() {
  showState(
    '<span><strong>No confident match in the guidelines.</strong>' +
      'Try naming the step, the office, or what you need to bring — for example, ' +
      '“Where do I submit my documents?”</span>',
    escalationActions(),
  );
}

function showState(html, extra = '') {
  reveal(`<p class="answer__state">${html}</p>${extra}`);
}

function reveal(html) {
  answerEl.innerHTML = html;
  answerEl.hidden = false;
  // #assist only becomes a real destination once it holds something; start
  // tracking it now so the nav can highlight it. Re-observing is a no-op.
  sectionObserver?.observe(document.getElementById('assist'));
}

/**
 * Render the passage window around the answer with the span marked, so the
 * student can see the sentence the answer was pulled out of.
 */
function highlightSpan(passage, { startIndex, endIndex }) {
  let from = Math.max(0, startIndex - 90);
  let to = Math.min(passage.length, endIndex + 90);
  // Snap outward to whole words — a window opening mid-word reads as a glitch.
  if (from > 0) from = passage.indexOf(' ', from) + 1 || from;
  if (to < passage.length) {
    const nextSpace = passage.indexOf(' ', to);
    to = nextSpace === -1 ? passage.length : nextSpace;
  }
  return (
    (from > 0 ? '… ' : '') +
    escapeHtml(passage.slice(from, startIndex)) +
    `<mark>${escapeHtml(passage.slice(startIndex, endIndex))}</mark>` +
    escapeHtml(passage.slice(endIndex, to)) +
    (to < passage.length ? ' …' : '')
  );
}

/* ---------- Nav ---------------------------------------------------------- */

function navTargets() {
  return [...document.querySelectorAll('.tab, .rail__link')];
}

/**
 * Before a question has been asked the #assist section is empty, so sending
 * the student there would land them on blank space. Put them in the search
 * box instead — that is what "Ask" actually means at that point.
 */
function wireAssistNav() {
  navTargets()
    .filter((link) => link.getAttribute('href') === '#assist')
    .forEach((link) => {
      link.addEventListener('click', (event) => {
        if (!answerEl.hidden) return;
        event.preventDefault();
        document.getElementById('home').scrollIntoView({ block: 'start' });
        input.focus({ preventScroll: true });
      });
    });
}

let sectionObserver;

/** Move the active state to whichever section is currently in view. */
function trackActiveSection() {
  const links = navTargets();
  const hrefs = [...new Set(links.map((link) => link.getAttribute('href')))];
  const sections = hrefs
    .map((href) => document.querySelector(href))
    // An empty section would otherwise win the band and mislabel the nav.
    .filter((section) => section && section.offsetHeight > 120);

  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => {
        const active = link.getAttribute('href') === `#${visible.target.id}`;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    },
    { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

/**
 * Scroll reveal. The class is added from JS so that with no JS — or no
 * IntersectionObserver — every section simply stays visible.
 */
function wireReveal() {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = [...document.querySelectorAll('main .section')];
  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );

  targets.forEach((el) => observer.observe(el));
}

/* ---------- Start -------------------------------------------------------- */
// Runs last so every module-level binding above is already initialised.

renderChips();
renderSteps();
wireSteps();
renderCampus(document.getElementById('campus-body'));
renderDressCode();
renderFaqs();
renderNav();
trackActiveSection();
wireAssistNav();
wireReveal();

form.addEventListener('submit', onAsk);

if (MODEL_INFO.needsDownload) {
  // Say what it will cost before spending it; the load waits for the first ask.
  setModelState(
    'idle',
    `The assistant downloads about ${MODEL_INFO.downloadMB} MB the first time you ask.`,
  );
} else {
  ensureModel().catch(() => {
    /* Reported through the status chip; the rest of the page is unaffected. */
  });
}
