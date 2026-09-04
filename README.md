# AUF EnrollFlow Assist

A browser-based enrollment assistant for Angeles University Foundation, built for **PTF50 — Professional Track 5: Web-Based AI Development** (Applied Activity: Pre-Trained Models).

## Concept 1: AUF EnrollFlow Assist

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
3. MobileBERT QnA runs in-browser against the pre-loaded enrollment guidelines passage and returns the answer span.
4. The app displays the extracted answer, plus a reference "Procedure for enrolling" step cards and a "Dress Code" panel for quick browsing without needing to ask.

### Who benefits

New/incoming AUF students during peak enrollment — reducing repeat questions to the Registrar, Cashier, and Learning Commons front-line staff by letting students self-serve answers already published in the guidelines.

## Tech stack

- [TensorFlow.js](https://www.tensorflow.org/js) + [`@tensorflow-models/qna`](https://github.com/tensorflow/tfjs-models/tree/master/qna) (MobileBERT QnA, ~103 MB model download)
- Static HTML/CSS/JS, served locally via VS Code Live Server (camera/mic not required here, but QnA still needs `localhost`/HTTPS-safe serving for asset loading)

## Design reference

- **Palette:** Primary Base `#0C2340`, Primary Accent `#C5A059`, Tech Accent `#38BDF8`
- **Typography:** Montserrat (Bold headers / SemiBold sub-headers), Poppins (body text)

## Status

Concept and content defined; app UI not yet implemented.
