# Wiring in the real MobileBERT QnA

Everything needed to replace the keyword stub in `js/qna.js` with the actual
pre-trained model, without loosening the site's Content-Security-Policy and
without a build step you have to babysit.

Every version, URL, file size and constant below was checked against the live
registry and the published bundle on **6 September 2026**. Where something has
changed since the README was written, it is called out.

---

## 0. Read this before you start

Four things about this model are not obvious and will each cost you an
afternoon if you meet them by surprise.

| | What bites | Where it is handled |
|---|---|---|
| 1 | `tfhub.dev` was retired in Nov 2023. The package still hardcodes it. Loads now depend on a redirect chain into Kaggle that issues **signed URLs expiring in 3 hours**, and has a standing intermittent-CORS bug. | [§2](#2-get-the-weights) — self-host instead |
| 2 | The tokenizer's vocabulary URL is a **hardcoded constant**, not derived from the `modelUrl` you pass. Self-hosting the model alone still reaches out to `tfhub.dev`. | [§4](#4-the-vocabulary-shim) |
| 3 | `score` is **not** 0–1. It is `startLogit + endLogit`, unbounded, with a no-answer threshold of 4.398. The current UI prints `score * 100` as a percentage — real scores would render as *"Confidence 1650%"* and the low-confidence caveat would never fire. | [§6](#6-the-score-scale) |
| 4 | The tokenizer **throws** on a question longer than 64 word-piece tokens. Today nothing guards that. | [§5](#5-rewrite-jsqnajs) |

---

## 1. What you are adding

### Packages

| Package | Version | Published | Notes |
|---|---|---|---|
| `@tensorflow-models/qna` | **1.0.2** | 22 Aug 2023 | Latest. Effectively frozen — no release in three years. |
| `@tensorflow/tfjs` | **4.22.0** | current `latest` | There is no 5.x. `4.23.0-rc.0` exists on the `next` tag; do not use it. |

`qna@1.0.2` peer-depends on `@tensorflow/tfjs-core` and `@tensorflow/tfjs-converter`
at `^4.10.0`. Pin tfjs to `4.22.0` and leave it pinned — an unmaintained model
package and a floating peer range is how this breaks six months from now.

### Model files

`qna.load()` pulls 26 files totalling **101.5 MB** (96.8 MiB):

```
model.json                     1,496,016 B
processed_vocab.json             351,992 B
group1-shard1of24.bin  …  23 × 4,194,304 B
group1-shard24of24.bin         3,198,124 B
```

Largest single file is 4 MiB, so no per-file upload limit anywhere is a
problem. The total is what matters — see [§7](#7-gitignore-and-what-ships).

`MODEL_INFO.downloadMB` in `js/qna.js` currently says `103`. The measured
figure is `101.5`. Close enough that it was never wrong, but set it to `102`
so the number on screen matches something real.

### Model behaviour constants

Straight out of the published 1.0.2 bundle — these govern how you write the
context passage, so they matter more than they look:

| Constant | Value | Consequence |
|---|---|---|
| `MAX_SEQ_LEN` / `INPUT_SIZE` | 384 | The window the model sees at once, in word-piece tokens. |
| `docStride` | 128 | Long passages **are** chunked with a sliding window, so the passage may be long. An answer just has to fit inside one window. |
| `MAX_QUERY_LEN` | 64 | Longer questions throw. |
| `MAX_ANSWER_LEN` | 32 | The returned span is at most 32 word-piece tokens — roughly 20 words. |
| `PREDICT_ANSWER_NUM` | 5 | Up to 5 answers come back, sorted best first. |
| `NO_ANSWER_THRESHOLD` | 4.3980759382247925 | Below this the model is saying *"not in the passage"*. |

---

## 2. Get the weights

### Why not just call `qna.load()`

The default path still technically resolves:

```
https://tfhub.dev/tensorflow/tfjs-model/mobilebert/1/model.json?tfjs-format=file
  → 302 → https://storage.googleapis.com/kagglesdsdata/models/2332/3121/model.json
          ?X-Goog-Expires=10800&X-Goog-Signature=…
```

Three reasons not to depend on it:

- The final URL is **signed and expires in 3 hours**. You cannot cache it, and
  you cannot put a stable origin in your CSP because the chain crosses
  `tfhub.dev` → `kaggle.com` → `storage.googleapis.com`.
- `tensorflow/hub#913` tracks intermittent CORS failures on exactly this fetch.
  A student on campus data getting a silent CORS error is the worst possible
  failure mode for this app.
- It would force `connect-src` open to three third-party origins.

### Fetch the bundle

Kaggle serves the whole thing as one unauthenticated tarball:

```bash
curl -L -o mobilebert.tar.gz \
  "https://kaggle.com/api/v1/models/tensorflow/mobilebert/tfJs/mobilebert/1/download"
mkdir -p models/mobilebert
tar -xzf mobilebert.tar.gz -C models/mobilebert
rm mobilebert.tar.gz
```

The tarball is 88.6 MiB (the weights are floats, so gzip only saves ~8%).

`scripts/fetch-model.sh` in this repo does exactly that, idempotently. Run it
locally once:

```bash
sh scripts/fetch-model.sh
```

You should end up with `models/mobilebert/model.json` and 24 shards beside it.

---

## 3. Get the libraries

The site ships `script-src 'self'` with no `'unsafe-inline'` and no nonce. You
have two options and only one of them keeps that.

**Vendor them (recommended).** Download the UMD bundles once and commit them —
they are small and they are the only two `<script>` tags on the page:

```bash
mkdir -p vendor
curl -L -o vendor/tf.min.js \
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"
curl -L -o vendor/qna.min.js \
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/qna@1.0.2/dist/qna.min.js"
```

`qna.min.js` is ~29 KB; `tf.min.js` is a few hundred KB. Both belong in git —
unlike the weights, they are small, and pinning them in the repo is the whole
point.

Then in `index.html`, **before** the module script:

```html
<script src="vendor/tf.min.js"></script>
<script src="vendor/qna.min.js"></script>
<script type="module" src="js/app.js"></script>
```

Order matters: `qna.min.js` expects `tf` to already be global, and both must be
defined before `js/qna.js` runs.

**Or use a CDN**, and add to `vercel.json`'s `script-src`:
`https://cdn.jsdelivr.net`. This is the option that costs you the strict CSP
the project deliberately set, for the sake of two files you could have
committed. Prefer vendoring.

---

## 4. The vocabulary shim

This is the part that is not in any documentation.

`bert_tokenizer` in the published bundle contains:

```js
var VOCAB_BASE = 'https://tfhub.dev/tensorflow/tfjs-model/mobilebert/1/';
var VOCAB_URL  = VOCAB_BASE + 'processed_vocab.json?tfjs-format=file';
```

`VOCAB_URL` is a module constant. It is **not** derived from the `modelUrl` in
your `ModelConfig`. So self-hosting the model gets you 25 of the 26 files from
your own origin and then the tokenizer reaches out to `tfhub.dev` anyway — and
your `connect-src 'self'` blocks it, and the load fails.

Three ways out. The shim is the least bad:

- ~~Fork and rebuild the package~~ — introduces a build step to change one string.
- ~~Widen `connect-src`~~ — reopens the exact dependency you self-hosted to avoid.
- **Rewrite that one URL at fetch time.** `tf.util.fetch` delegates to the
  platform fetch, which in the browser is `window.fetch`. Intercept, rewrite,
  restore. It is scoped to one URL and it undoes itself.

The implementation is in the `qna.js` below.

---

## 5. Rewrite `js/qna.js`

Replace `warmup()` and `answer()`. Everything above them — `MODEL_INFO`,
`LOW_CONFIDENCE`, the exported shape — stays, because `js/app.js` is written
against that contract and must not need to change. The stub's helpers
(`tokenize`, `splitSentences`, `STOPWORDS`, `CONFIDENCE_FLOOR`) can go.

```js
/** Where the self-hosted weights live, relative to the site root. */
const MODEL_BASE = '/models/mobilebert/';

/** The one URL the tokenizer hardcodes. See docs/mobilebert-setup.md §4. */
const VOCAB_REMOTE =
  'https://tfhub.dev/tensorflow/tfjs-model/mobilebert/1/processed_vocab.json?tfjs-format=file';

export const MODEL_INFO = {
  name: 'MobileBERT QnA',
  /** Printed under every answer. Now that the model really is doing the
      extracting, this stops saying 'keyword matching'. */
  engine: 'MobileBERT QnA',
  downloadMB: 102,
  /** Now true: the weights really are a ~102 MB download on first ask. */
  needsDownload: true,
};

export const LOW_CONFIDENCE = 0.3;

/**
 * The model's own no-answer threshold, straight from the bundle. A raw score
 * below this is the model saying "not in this passage" — not a weak answer.
 */
const NO_ANSWER_THRESHOLD = 4.3980759382247925;

/** The tokenizer throws above this; we would rather explain than crash. */
const MAX_QUERY_TOKENS = 64;

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
  // model.json and the vocab are ~1.8 MB of the total; counting shards alone
  // is close enough that the bar does not visibly lie.
  for (const path of paths) {
    await fetch(MODEL_BASE + path);
    done += 1;
    onProgress?.(done / paths.length);
  }
}

/**
 * Load the model. Safe to call repeatedly — only the first call does work.
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

  // A word-piece token is shorter than a word, so this is deliberately
  // conservative — it is a guard against a throw, not a precise count.
  if (question.split(/\s+/).length > MAX_QUERY_TOKENS / 2) return null;

  const [best] = await model.findAnswers(question, passage);
  if (!best || best.score < NO_ANSWER_THRESHOLD) return null;

  return { ...best, score: normaliseScore(best.score) };
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
```

`js/app.js` needs no changes at all. That was the point of the seam.

---

## 6. The score scale

Worth being explicit, because getting this wrong is silent rather than loud.

Inside the bundle, each candidate answer is scored:

```js
origResults.push({ start, end, score: startLogits[start] + endLogits[end] });
```

A sum of two raw logits. Unbounded above, frequently negative, no probabilistic
meaning on its own. The only calibrated point on the scale is
`NO_ANSWER_THRESHOLD = 4.398`, which the SQuAD 2.0 training produced as the
line between "answerable" and "not in the passage".

The UI in `js/app.js` does two things with `score`:

```js
const low = result.score < LOW_CONFIDENCE;              // 0.3
… Confidence ${(result.score * 100).toFixed(0)}% …
```

Ship the raw score into that and a good answer reads **"Confidence 1650%"**
while `low` is never true, so the caveat that tells a student to double-check
before walking across campus silently stops appearing. `normaliseScore()` above
is what keeps both correct.

One honesty note: the mapping is monotonic but arbitrary. It preserves ordering
and puts the model's own no-answer floor just under the caveat threshold, which
is the behaviour the UI was designed around. It is not a probability, and the
word "Confidence" in `js/app.js` is doing more work than it should. Consider
softening that label to "Match strength" when you ship this.

---

## 7. `.gitignore` and what ships

The weights are **101.5 MB across 26 files**. Committing them is the decision
you cannot easily walk back — git keeps them in history forever, every clone
pays for them, and the repo goes from ~200 KB to ~100 MB.

So `.gitignore` now carries:

```gitignore
# Model weights — ~101 MB, fetched by scripts/fetch-model.sh. Never committed:
# git would keep every byte in history forever, and they are reproducible.
models/
*.tar.gz
```

Which leaves the question of how the weights reach production, since Vercel
deploys from git and ignored files are not uploaded. Pick one:

**A. Fetch during the build (recommended).** Add to `vercel.json`:

```json
"buildCommand": "sh scripts/fetch-model.sh"
```

Keeps the repo small, keeps the weights first-party, keeps `connect-src 'self'`.
Costs ~90 MB of download on every cold build. Make sure `.vercelignore` does
**not** exclude `scripts/` — the build needs it.

**B. Commit them via Git LFS.** Simplest to reason about, no build step. You
are still storing 100 MB, now against an LFS quota.

**C. Serve them from object storage** (Vercel Blob, R2, S3). Repo stays clean
and builds stay fast, but you must add that origin to `connect-src`, and you
are back to a cross-origin dependency — the thing §2 talked you out of.

`.vercelignore` excludes `docs/` so this guide is not published as part of the
site. `scripts/` stays, because option A needs it at build time.

---

## 8. CSP: what changes

If you vendored the libraries (§3) and self-hosted the weights (§2) with the
vocab shim (§4), then **nothing in `vercel.json` changes**. Everything is
same-origin. That is the whole reason for doing it this way.

You only touch the CSP if you deviate:

| If you… | Add to |
|---|---|
| load tfjs/qna from a CDN | `script-src https://cdn.jsdelivr.net` |
| skip the vocab shim | `connect-src https://tfhub.dev https://storage.googleapis.com https://www.kaggle.com` |
| serve weights from object storage | `connect-src <that origin>` |
| switch to the WASM backend | `script-src 'wasm-unsafe-eval'` |

The default WebGL backend needs no CSP change. Keep it unless you have measured
a reason not to.

Also note `js/` and `css/` are served `must-revalidate` by `vercel.json`, but
`/models/` is not covered by any rule — it falls back to Vercel's default. Add
a long-lived immutable rule for it; the weights are versioned by URL path and
never change in place:

```json
{
  "source": "/models/(.*)",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
  ]
}
```

Without this a returning student may re-download 102 MB.

---

## 9. Authoring the 2026 context passage

`PASSAGE` in `js/data.js` is the only thing the model can read. It cannot know
anything that is not in there, which is the property that keeps this app
honest — and it means the passage *is* the product.

### Rules that come from the model, not from taste

- **Answers are capped at 32 word-piece tokens** (~20 words). Write facts so
  the answer is a short, self-contained span. "Room A-203, 2nd Floor, Angeles
  Hall" is a good span. A sentence that buries the room number in clause three
  is not.
- **The window is 384 tokens, sliding by 128.** Long passages are fine — they
  get chunked. But a question and its answer must land in the *same* window, so
  keep each fact's context local. Do not write "the office in step 2" 200 tokens
  after step 2 was named.
- **Repeat key nouns instead of pronouns.** "The student submits…" survives
  chunking; "they submit it there" does not.
- **One fact per sentence.** The model returns a span, not a summary.
- **Questions over 64 tokens throw** — already guarded in §5, but it means very
  long student questions get a null rather than an answer.

### The invariant to keep

`js/data.js` says it and it is the thing worth defending:

> Every fact rendered anywhere on the page must stay traceable to PASSAGE.

If you add a step card, a FAQ, or a room number to `STEPS`/`FAQS`/`BUILDINGS`,
add the same fact to `PASSAGE` in the same commit. Otherwise the page starts
asserting things the model cannot back up, and the "extracted from the official
guidelines" line under every answer becomes false.

### What I could not fill in

**I have not written 2026 enrollment facts into `js/data.js`, and you should be
suspicious of any tool that offers to.**

AUF does not publish the step-by-step new-student guidelines openly. The public
2026 information is that enrollment for incoming freshmen for **AY 2026–2027
opened on 4 May 2026**, with accepted students directed to their email and MyAU
account for their own schedule and procedure. The detail this app needs — room
numbers, office names, document lists, what is handled at which counter — is
distributed per student, not published.

Inventing it would be worse than leaving it out. This app sends a first-year
student walking to a specific room in a specific building; a plausible-sounding
wrong room number is a genuinely bad outcome, and it would be indistinguishable
from a real one because the UI labels every answer as coming from the official
guidelines.

So the current `PASSAGE` — the seven steps, three buildings, and the dress code
— is what the repo can honestly assert today. To make it comprehensive for
2026, get the official document and extend it using the template below.

### Template

Keep the existing array-of-sentences shape; it keeps diffs readable and makes
each fact reviewable on its own line.

```js
export const PASSAGE = [
  // ——— Process ————————————————————————————————————————————————
  'The Angeles University Foundation new student enrollment process has seven steps.',
  'Step 1 is online enlistment, which is managed through the online myAU portal at auf.edu.ph.',
  // … one sentence per step, each naming its own office and building in full

  // ——— Dates (AY 2026–2027) ——————————————————————————————————————
  // Source: AUF Office of Admissions. Verify before each term — these are the
  // facts most likely to be stale, and the ones a student is most hurt by.
  'Enrollment for incoming freshmen for Academic Year 2026 to 2027 begins on May 4, 2026.',
  // 'The last day to enroll without a late fee is …',
  // 'Classes for the first semester begin on …',

  // ——— Requirements ——————————————————————————————————————————————
  // One sentence per document. Name the document exactly as the Registrar does.
  // 'A student must submit …',

  // ——— Fees ———————————————————————————————————————————————————————
  // Only if the official document states them. Never approximate a peso amount.

  // ——— Offices and hours —————————————————————————————————————————
  // 'The Office of the University Registrar and Admissions is open from … to ….',

  // ——— Conduct ———————————————————————————————————————————————————
  'The official campus dress code strictly prohibits students from wearing sleeveless tops, crop tops, muscle shirts, spaghetti straps, and shorts on campus.',
].join(' ');
```

Add a dated provenance line at the top of `js/data.js` when you extend it:

```js
/** Source: AUF New Student Enrollment Guidelines, AY 2026–2027. Retrieved DD Mon YYYY. */
```

### After you extend it

Add the new questions to `CHIPS` or `FAQS` and ask them through the real model.
A fact that is in the passage but that the model cannot retrieve is usually
phrased across two sentences, or its answer span is longer than 32 tokens.

---

## 10. Verify

Run through this in order — each step fails distinctly.

1. **Files land.** `sh scripts/fetch-model.sh`, then confirm 26 files in
   `models/mobilebert/`.
2. **Served correctly.** `python -m http.server 5500`, then
   `curl -I http://localhost:5500/models/mobilebert/model.json` → `200`,
   `content-type: application/json`.
3. **No CSP violations.** Open the page, DevTools console. Any
   `Refused to connect to …` means the vocab shim is not covering a URL.
4. **Progress reports.** First ask should show the status chip climbing
   0→100%, not sitting still.
5. **Second load is instant.** Reload and ask again — the shards come from
   cache. If not, check the `/models/` cache header from §8.
6. **A known answer.** Ask *"Where do I pay the enrollment fees?"* → the AUF
   Cashier Accounting Office span, highlighted inside the passage.
7. **Confidence is sane.** The figure should read somewhere in 20–99%, never
   above 100. Above 100 means `normaliseScore` is not being applied.
8. **A no-answer.** Ask *"What is the tuition for a masters degree?"* → the
   "No confident match" state, not a confident wrong answer.
9. **A long question.** Paste 80 words → null, not an uncaught throw.
10. **Offline.** Reload with the network throttled to offline after a
    successful ask. The model is cached; the steps and FAQs render regardless.

---

## 11. Rolling back

The stub is worth keeping. If the model has to come out under time pressure:

```bash
git revert <the integration commit>
```

Or set `MODEL_INFO.needsDownload = false` and restore the stub's `warmup()`
and `answer()` — `js/app.js` cannot tell the difference, which is what the seam
was for. The page degrades to keyword matching over the same passage, and the
steps, campus wayfinding, dress code and FAQs are unaffected either way.

---

## Sources

- [`@tensorflow-models/qna` on npm](https://www.npmjs.com/package/@tensorflow-models/qna) — version 1.0.2, peer ranges
- [`@tensorflow/tfjs` on npm](https://www.npmjs.com/package/@tensorflow/tfjs) — version 4.22.0
- [qna model source](https://github.com/tensorflow/tfjs-models/tree/master/qna) — `MODEL_URL`, `findAnswers`, scoring
- [TensorFlow Hub is moving to Kaggle Models](https://discuss.ai.google.dev/t/tensorflow-hub-is-moving-to-kaggle-models/31936) — the tfhub.dev retirement
- [TF Hub → Kaggle FAQs](https://www.kaggle.com/tfhub-dev-faqs) — redirect behaviour, asset deletion March 2024
- [mobilebert on Kaggle Models](https://www.kaggle.com/models/tensorflow/mobilebert/tfJs/mobilebert/1) — the tfjs bundle
- [tensorflow/hub#913](https://github.com/tensorflow/hub/issues/913) — intermittent CORS on the qna fetch
- [AUF Office of Admissions](https://www.facebook.com/MagingAngelenean/photos/good-news-future-angeleneans-enrollment-for-incoming-freshmen-for-ay-20262027-of/984705524136032/) — AY 2026–2027 enrollment opens 4 May 2026
