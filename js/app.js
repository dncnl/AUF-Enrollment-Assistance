import { STEPS, DRESS_CODE, CHIPS, FAQS, PASSAGE } from './data.js';
import { answer, warmup } from './qna.js';

const form = document.getElementById('ask-form');
const input = document.getElementById('ask-input');
const button = document.getElementById('ask-button');
const answerEl = document.getElementById('answer');

const PIN_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';

/* ---------- Rendering ---------------------------------------------------- */

function renderSteps() {
  document.getElementById('steps').innerHTML = STEPS.map(
    (step) => `
      <li class="card step">
        <div class="step__spine" aria-hidden="true">${step.number}</div>
        <div class="step__body">
          <p class="step__label">Step ${step.number}</p>
          <h3 class="step__title">${escapeHtml(step.title)}</h3>
          <p class="step__detail">${escapeHtml(step.detail)}</p>
          <p class="step__where">${PIN_ICON}<span>${escapeHtml(step.location)}</span></p>
        </div>
      </li>`,
  ).join('');
}

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
        <summary class="faq__q">${escapeHtml(faq.question)}</summary>
        <p class="faq__a">${escapeHtml(faq.answer)}</p>
      </details>`,
  ).join('');
}

/* ---------- Asking ------------------------------------------------------- */

async function onAsk(event) {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) {
    input.focus();
    return;
  }

  setBusy(true);
  showState('<span class="spinner" aria-hidden="true"></span>' +
    '<span><strong>Searching the enrollment guidelines…</strong>Reading the official AUF passage for your answer.</span>');

  try {
    const result = await answer(question, PASSAGE);
    if (result) {
      showAnswer(question, result);
    } else {
      showState(
        '<span><strong>No confident match in the guidelines.</strong>' +
          'Try naming the step, the office, or what you need to bring — for example, ' +
          '“Where do I submit my documents?”</span>',
      );
    }
  } catch (error) {
    console.error(error);
    showState(
      '<span><strong>Something went wrong.</strong>The assistant could not read the guidelines just now. Please try again.</span>',
    );
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  button.disabled = busy;
  button.textContent = busy ? 'Asking…' : 'Ask Assist';
}

function showAnswer(question, result) {
  reveal(`
    <p class="answer__question">You asked: <strong>${escapeHtml(question)}</strong></p>
    <p class="answer__label">Answer</p>
    <p class="answer__text">${escapeHtml(result.text)}</p>
    <p class="answer__source">${highlightSpan(PASSAGE, result)}</p>
    <p class="answer__meta">Confidence ${(result.score * 100).toFixed(0)}% · extracted from the AUF New Student Enrollment Guidelines</p>
  `);
}

function showState(html) {
  reveal(`<p class="answer__state">${html}</p>`);
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

/**
 * Before a question has been asked the #assist section is empty, so sending
 * the student there would land them on blank space. Put them in the search
 * box instead — that is what "Ask Assist" actually means at that point.
 */
function wireAssistNav() {
  const link = document.querySelector('.nav__link[href="#assist"]');
  if (!link) return;
  link.addEventListener('click', (event) => {
    if (!answerEl.hidden) return;
    event.preventDefault();
    document.getElementById('home').scrollIntoView({ block: 'start' });
    input.focus();
  });
}

let sectionObserver;

/** Move the active nav state to whichever section is currently in view. */
function trackActiveSection() {
  const links = [...document.querySelectorAll('.nav__link')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    // An empty section would otherwise win the band and mislabel the nav.
    .filter((section) => section && section.offsetHeight > 120);

  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) =>
        link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`),
      );
    },
    { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

/* ---------- Start -------------------------------------------------------- */
// Runs last so every module-level binding above is already initialised.

renderSteps();
renderDressCode();
renderChips();
renderFaqs();
trackActiveSection();
wireAssistNav();

form.addEventListener('submit', onAsk);

// Kick off model preparation early — a no-op today, qna.load() once the real
// model lands, at which point the first question should not pay for the load.
warmup().catch(() => {
  /* A failed warmup is not fatal; answer() surfaces the error when asked. */
});
