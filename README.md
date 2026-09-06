# AUF Enrollment Assist

A browser-based enrollment assistant for Angeles University Foundation, built for **PTF50 — Professional Track 5: Web-Based AI Development** (Applied Activity: Pre-Trained Models).

## Concept 1: AUF Enrollment Assist

**Chosen model:** MobileBERT QnA (`@tensorflow-models/qna`)
**Reads:** a text passage + a typed question
**Produces:** the best matching answer span extracted from that passage

During AUF's enrollment period, new students have to navigate a multi-step process spread across several offices and buildings, with no single place to quickly ask "where do I go next?" or "what do I need?" EnrollFlow Assist answers that by pre-loading the official AUF enrollment guidelines as context and letting MobileBERT QnA pull out the exact answer span for whatever a student types.

### Context passage (the data fed to the model)

The app pre-loads the official **AUF New Student Enrollment Guidelines** as its context passage:

| Step | What happens | Where |
|---|---|---|
| 1 — Online Enlistment | Managed via the online myAU portal ([auf.edu.ph](https://www.auf.edu.ph/)) | — |
| 2 — Document Submission | Submit PSA Birth Certificate, printed GSPIS, and Form 138/SF10 inside a long brown envelope | Office of the University Registrar and Admissions, Room A-203, 2nd Floor, Angeles Hall / Administration Building |
| 3 — Payment | Settle enrollment fees | AUF Cashier Accounting Office, Ground Floor, Angeles Hall, beside the Chapel |
| 4, 5 & 7 — ID, Email, Medical & Uniforms | Handled together | Learning Commons, 2nd Floor, University Library Building |
| 6 — Registration Form | Claimed at the student's respective college office | e.g. College of Computer Studies |

**Official campus dress code:** sleeveless tops, crop tops, muscle shirts, spaghetti straps, and shorts are strictly prohibited.

### Planned app flow

1. Student opens the EnrollFlow Assist page and sees a search bar under "How can we help you enroll?"
2. Student types a question (or taps a quick FAQ chip, e.g. "How much?", "Is the office open on Saturday?") and hits **Ask Assist**.
3. MobileBERT QnA runs in-browser against the pre-loaded enrollment guidelines passage and returns the answer span, shown with its confidence and the source sentence highlighted inside the passage.
4. The app displays the extracted answer, plus a reference "Procedure for enrolling" step cards and a "Dress Code" panel for quick browsing without needing to ask.

### Who benefits

New/incoming AUF students during peak enrollment — reducing repeat questions to the Registrar, Cashier, and Learning Commons front-line staff by letting students self-serve answers already published in the guidelines.

## Project layout

```
index.html          single page; sections #home #assist #guide #campus #faqs
css/styles.css      design tokens + components (mobile-first)
js/data.js          BUILDINGS, STEPS, TRIPS, DRESS_CODE, CHIPS, FAQS, PASSAGE
js/qna.js           answer() / warmup() — the model seam
js/campus.js        campus wayfinding: maps links + schematic map
js/progress.js      per-browser step completion (localStorage, guarded)
js/dom.js           escapeHtml + the outline icon set
js/app.js           rendering + event wiring
assets/             AUF seal, Angeles Hall photo
css/motion.css      easing tokens + the moving parts (delete it and the page
                    still works, it just stops moving)
docs/               setup guides; excluded from the deployment
scripts/            fetch-model.sh — pulls the MobileBERT weights
models/             the weights themselves; gitignored, ~101 MB
```

Navigation is a bottom tab bar on mobile and a sticky section rail on desktop;
both render from the one `NAV` array in `js/app.js`.

Run it with VS Code Live Server, or `python -m http.server 5500` and open
<http://localhost:5500>. No build step and no dependencies.

## Wiring in MobileBERT QnA

**Full setup guide: [`docs/mobilebert-setup.md`](docs/mobilebert-setup.md).**

`js/qna.js` is the only file that changes. It currently answers with a
keyword-overlap stub so the full UI — loading, answer, no-match, and error
states — is already built and exercised. It exports the same shape the real
model returns (`{ text, score, startIndex, endIndex }`), so `js/app.js` never
learns which one produced the result.

The outline is: vendor `tfjs@4.22.0` and `@tensorflow-models/qna@1.0.2`,
self-host the ~101 MB of weights under `models/`, rewrite `warmup()` and
`answer()`, and set `MODEL_INFO.needsDownload = true` — which flips the UI to
its metered-connection behaviour, stating the cost up front and deferring the
load to the first question rather than spending a student's data on page load.

Four things in that guide are not obvious and are each worth reading before you
start:

- `tfhub.dev` was retired in Nov 2023; the package still hardcodes it, and the
  redirect chain now issues signed URLs that expire in three hours.
- The tokenizer's vocabulary URL is a hardcoded constant, *not* derived from
  the `modelUrl` you pass — self-hosting the model alone is not enough.
- `score` is a raw logit sum, not 0–1. Rendered as-is, the UI would print
  “Confidence 1650%” and the low-confidence caveat would never appear.
- Questions over 64 word-piece tokens make the tokenizer throw.

## Tech stack

- [TensorFlow.js](https://www.tensorflow.org/js) + [`@tensorflow-models/qna`](https://github.com/tensorflow/tfjs-models/tree/master/qna) (MobileBERT QnA — 26 files, 101.5 MB, pinned at `tfjs@4.22.0` / `qna@1.0.2`)
- Static HTML/CSS/JS, served locally via VS Code Live Server (camera/mic not required here, but QnA still needs `localhost`/HTTPS-safe serving for asset loading)

## Deploying to Vercel

No build step and no `package.json` — import the repo and keep the framework
preset as **Other**, with the root directory as the output. `vercel.json`
supplies the security headers and caching.

The Content-Security-Policy is deliberately strict: `script-src 'self'` with no
nonce (there are no inline `<script>` blocks) and `style-src` without
`'unsafe-inline'` (the progress bar and map pins are positioned through the
CSSOM, not `style` attributes). Keep it that way — reintroducing a `style="…"`
attribute silently breaks under this policy.

`js/` and `css/` are served `must-revalidate` because nothing is
content-hashed; long-lived caching there strands users on stale modules.

**When MobileBERT QnA lands, the CSP does not have to change** — provided you
vendor the two libraries and self-host the weights, which is what
[`docs/mobilebert-setup.md`](docs/mobilebert-setup.md) walks through. Everything
stays same-origin. You only widen the policy if you deviate: a CDN needs
`script-src`, and remote weights (or skipping the vocabulary shim) need
`connect-src`. §8 of the guide has the exact table.

Platform-level options worth enabling in project settings: Deployment
Protection, so preview URLs are not publicly readable, and Vercel WAF rate
limiting if the page is ever put behind a form that costs anything to run.

## Design reference

- **Palette:** Primary Base `#0C2340`, Primary Accent `#C5A059`.
  Gold only carries text on dark surfaces — on white it measures 2.46:1, so
  `--gold-ink` `#87692F` and `--gold-line` `#AB853C` cover light surfaces.
  Focus rings are navy on light and gold on navy; no shade of the old
  `#38BDF8` clears 3:1 against both the card and the page, so it is now used
  only as the answer-highlight fill.
- **Typography:** Fraunces (display and headings), League Spartan at −5%
  tracking (labels, nav, buttons — the UI voice), Poppins (body prose).
- **Layout:** mobile-first. The seven steps are one vertical timeline at every
  width — a grid of equal cards reads as a list, not a flow.

## Status

UI implemented against the stub: the step timeline with progress tracking,
campus wayfinding, dress code, FAQ accordion, quick-pick chips, and the full
ask flow (loading, answer, low-confidence, no-match, error). Contrast is
verified — every text pair ≥4.5:1 and every focus ring and boundary ≥3:1.

Two things outstanding:

1. **Campus layout.** `BUILDINGS` in `js/data.js` carries `x`/`y` of `null`.
   While they are null the Campus section renders the building list and its
   directions links and omits the schematic map — it never guesses a pin
   position. Fill in real coordinates (as a percentage of the map viewBox) and
   add `assets/campus-map.png` to switch the map on.
2. **The model.** Swap the stub in `js/qna.js` for MobileBERT QnA.
