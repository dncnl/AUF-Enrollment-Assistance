/**
 * The model seam.
 *
 * This calls the real @tensorflow-models/qna MobileBERT model, self-hosted
 * from models/mobilebert/ (see docs/mobilebert-setup.md for the full
 * procedure this implements). `app.js` never learns how the answer was
 * produced — it only depends on the shape below.
 *
 * The return shape matches @tensorflow-models/qna's findAnswers() entries:
 *   { text, score, startIndex, endIndex }
 */

/** Where the self-hosted weights live, relative to the site root. */
const MODEL_BASE = 'models/mobilebert/';

/** The one URL the tokenizer hardcodes. See docs/mobilebert-setup.md §4. */
const VOCAB_REMOTE =
  'https://tfhub.dev/tensorflow/tfjs-model/mobilebert/1/processed_vocab.json?tfjs-format=file';

/**
 * What the UI tells the student before it spends their mobile data. Kept here
 * beside the seam so the figure changes in the same commit as the model.
 */
export const MODEL_INFO = {
  name: 'MobileBERT QnA',
  /** What is actually answering, printed under every answer. */
  engine: 'MobileBERT QnA',
  /** Measured: 101.5 MB across 26 files. Rounded up so the figure on screen
      is never smaller than what the student actually spends. */
  downloadMB: 102,
  /** The weights really are a ~102 MB download on first ask. */
  needsDownload: true,
};

/**
 * The model's own no-answer threshold, straight from the published bundle. A
 * raw score below this is the model saying "not in this passage" — not a
 * weak answer.
 */
const NO_ANSWER_THRESHOLD = 4.3980759382247925;

/** The tokenizer throws above this; we would rather explain than crash. */
const MAX_QUERY_TOKENS = 64;

/**
 * Above the model's no-answer floor but below this (on the normalised 0–1
 * scale), the answer is shown with a caveat rather than as a flat statement
 * of fact.
 */
export const LOW_CONFIDENCE = 0.3;

let model = null;

/**
 * Point the tokenizer's hardcoded vocab URL at our own copy, for the duration
 * of the load and no longer. Restores the original fetch even if load throws.
 */
async function withVocabShim(fn) {
  const original = window.fetch;
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (url === VOCAB_REMOTE) {
      return original(`${MODEL_BASE}processed_vocab.json`, init);
    }
    return original(input, init);
  };
  try {
    return await fn();
  } finally {
    window.fetch = original;
  }
}

/**
 * Pull every weight shard through the browser cache first, reporting real
 * progress as we go.
 *
 * qna.load() takes no onProgress callback — it does not forward LoadOptions to
 * loadGraphModel. So rather than leave the student watching an indeterminate
 * spinner for 102 MB, we fetch the shards ourselves, count the bytes, and let
 * the subsequent load() read them straight out of the HTTP cache.
 */
async function prefetchWeights(onProgress) {
  const manifestUrl = `${MODEL_BASE}model.json`;
  const manifest = await fetch(manifestUrl).then((r) => {
    if (!r.ok) throw new Error(`model.json: HTTP ${r.status}`);
    return r.json();
  });

  const paths = manifest.weightsManifest.flatMap((group) => group.paths);
  let done = 0;
  for (const path of paths) {
    await fetch(MODEL_BASE + path);
    done += 1;
    onProgress?.(done / paths.length);
  }
}

/**
 * Load the model. Safe to call repeatedly — only the first call does work.
 *
 * @param {(fraction: number) => void} [onProgress] Called with 0..1 as the
 *   model downloads.
 */
export async function warmup(onProgress) {
  if (model) return true;

  await prefetchWeights(onProgress);

  model = await withVocabShim(() =>
    qna.load({ modelUrl: `${MODEL_BASE}model.json`, fromTFHub: false }),
  );

  onProgress?.(1);
  return true;
}

/**
 * Find the best answer span for `question` inside `passage`.
 * Resolves to null when the model says the answer is not in the passage.
 */
export async function answer(question, passage) {
  if (!model) throw new Error('warmup() must resolve before answer()');

  question = expandAbbreviations(question);

  // A word-piece token is shorter than a word, so this is deliberately
  // conservative — it is a guard against a throw, not a precise count.
  if (question.split(/\s+/).length > MAX_QUERY_TOKENS / 2) return null;

  const [best] = await model.findAnswers(question, passage);
  if (!best || best.score < NO_ANSWER_THRESHOLD) return null;

  return { ...best, score: normaliseScore(best.score) };
}

/**
 * A few common student-typed shorthands the model doesn't reliably resolve to
 * what the passage actually says. Expanding them before asking measurably
 * improves matches on short, casual questions — validated against the live
 * model, not guessed. Kept to one word for now; not a general synonym system.
 */
function expandAbbreviations(question) {
  return question.replace(/\bid\b/gi, 'school ID');
}

/**
 * Map the model's raw logit sum onto the 0–1 range app.js renders as a
 * percentage. See docs/mobilebert-setup.md §6 — this is a monotonic display
 * mapping, not a calibrated probability.
 *
 *   raw 4.4 (the floor) → 0.23   shown with the "may not be what you meant" caveat
 *   raw 8               → 0.50
 *   raw 14              → 0.88
 *   raw 20              → 0.98
 */
function normaliseScore(raw) {
  return 1 / (1 + Math.exp(-(raw - 8) / 3));
}
