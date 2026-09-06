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
```

Navigation is a bottom tab bar on mobile and a sticky section rail on desktop;
both render from the one `NAV` array in `js/app.js`.

Run it with VS Code Live Server, or `python -m http.server 5500` and open
<http://localhost:5500>. No build step and no dependencies.

## Wiring in MobileBERT QnA

`js/qna.js` is the only file that changes. It currently answers with a
keyword-overlap stub so the full UI — loading, answer, no-match, and error
states — is already built and exercised. It exports the same shape the real
model returns (`{ text, score, startIndex, endIndex }`), so integration is:

1. Add the `tfjs` and `@tensorflow-models/qna` script tags to `index.html`.
2. `warmup(onProgress)` → `model = await qna.load();`, forwarding tf's loading
   progress to `onProgress`, and set `MODEL_INFO.needsDownload = true`.
3. `answer()` → `const [best] = await model.findAnswers(question, passage); return best ?? null;`

Setting `needsDownload` flips the UI to its metered-connection behaviour: it
states the ~103 MB cost up front and defers the load to the first question
instead of spending a student's data on page load.

`js/app.js` never learns which one produced the result.

## Tech stack

- [TensorFlow.js](https://www.tensorflow.org/js) + [`@tensorflow-models/qna`](https://github.com/tensorflow/tfjs-models/tree/master/qna) (MobileBERT QnA, ~103 MB model download)
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

**When MobileBERT QnA lands, the CSP must be widened** or the model will fail
to load with only a console error:

- `script-src` — add the CDN serving `tfjs` and `@tensorflow-models/qna`
- `connect-src` — add the origin the model weights are fetched from

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
