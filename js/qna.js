/**
 * The model seam.
 *
 * Today this is a keyword-overlap stub so the whole answer UI — loading,
 * answer, no-match, error — is built and exercised before the model lands.
 * When MobileBERT QnA is wired in, only the bodies of `warmup()` and
 * `answer()` change; `app.js` never learns which one produced the result.
 *
 * The return shape matches @tensorflow-models/qna's findAnswers() entries:
 *   { text, score, startIndex, endIndex }
 *
 * To swap in the real model:
 *   1. Add the tfjs + qna script tags to index.html.
 *   2. warmup()  ->  model = await qna.load();
 *   3. answer()  ->  const [best] = await model.findAnswers(question, passage);
 *                    return best ?? null;
 */

/** Below this score we show "no confident match" instead of guessing. */
const CONFIDENCE_FLOOR = 0.18;

/** Words too common to carry meaning when matching a question to a sentence. */
const STOPWORDS = new Set([
  'a', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'by', 'can',
  'did', 'do', 'does', 'for', 'from', 'get', 'go', 'has', 'have', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'me', 'much', 'must', 'my', 'need',
  'allowed', 'not', 'of', 'on', 'or', 'should', 'that', 'the', 'their',
  'there', 'they', 'this',
  'to', 'was', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with',
  'you', 'your',
]);

/**
 * Prepare the answering engine. No-op for the stub; becomes qna.load() later,
 * which is why callers must already treat it as slow and failable.
 */
export async function warmup() {
  return true;
}

/**
 * Find the best answer span for `question` inside `passage`.
 * Resolves to null when nothing in the passage is a confident match.
 */
export async function answer(question, passage) {
  const terms = tokenize(question).filter((t) => !STOPWORDS.has(t));
  if (terms.length === 0) return null;

  // Keep each sentence's offsets so the UI can highlight it inside the passage.
  const sentences = splitSentences(passage);

  let best = null;
  for (const sentence of sentences) {
    const words = new Set(tokenize(sentence.text));
    let hits = 0;
    for (const term of terms) {
      if (words.has(term) || [...words].some((w) => w.startsWith(term) || term.startsWith(w))) {
        hits += 1;
      }
    }
    if (hits === 0) continue;

    // One incidental word in common is coincidence, not an answer: a question
    // carrying several content words has to match on more than one of them.
    if (terms.length >= 3 && hits < 2) continue;

    // Overlap normalised by question length, nudged down for very long
    // sentences so a sprawling one cannot win on sheer surface area.
    const score = (hits / terms.length) * (1 - Math.min(words.size, 60) / 240);
    if (!best || score > best.score) {
      best = {
        text: sentence.text,
        score,
        startIndex: sentence.startIndex,
        endIndex: sentence.endIndex,
      };
    }
  }

  // A beat of latency so the loading state is real rather than a flash.
  await new Promise((resolve) => setTimeout(resolve, 350));

  if (!best || best.score < CONFIDENCE_FLOOR) return null;
  return best;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

/** Split into sentences, carrying each one's offset within the passage. */
function splitSentences(passage) {
  const sentences = [];
  const pattern = /[^.!?]+[.!?]*/g;
  let match;
  while ((match = pattern.exec(passage)) !== null) {
    const raw = match[0];
    const text = raw.trim();
    if (!text) continue;
    const startIndex = match.index + raw.indexOf(text[0]);
    sentences.push({ text, startIndex, endIndex: startIndex + text.length });
  }
  return sentences;
}
