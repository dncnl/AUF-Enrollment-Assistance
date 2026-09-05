/**
 * Single source of content for EnrollFlow Assist.
 *
 * PASSAGE is deliberately prose, not a table: MobileBERT QnA extracts an answer
 * span out of natural text, so the passage the model reads is the same material
 * the step cards render below it. Every fact rendered anywhere on the page must
 * stay traceable to PASSAGE — that is what keeps the app honest.
 */

/**
 * The physical places a student has to visit.
 *
 * `mapQuery` is handed to Google Maps as a plain search string, so wayfinding
 * needs no API key and no coordinates. `x`/`y` place the building's pin on the
 * schematic campus map, as a percentage of that map's viewBox.
 *
 * TODO(layout): x and y are null until the real campus layout is supplied.
 * While they are null the Campus section renders the building list and its
 * directions links, and simply omits the schematic map. It never guesses a
 * position — a wrong pin walks a freshman to the wrong building.
 */
export const BUILDINGS = [
  {
    id: 'angeles-hall',
    name: 'Angeles Hall',
    aka: 'Administration Building',
    mapQuery: 'Angeles Hall, Angeles University Foundation, Angeles City, Pampanga',
    rooms: [
      'Office of the University Registrar and Admissions — Room A-203, 2nd Floor',
      'AUF Cashier Accounting Office — Ground Floor, beside the Chapel',
    ],
    x: null,
    y: null,
  },
  {
    id: 'library-commons',
    name: 'University Library Building',
    aka: 'Learning Commons, 2nd Floor',
    mapQuery: 'University Library, Angeles University Foundation, Angeles City, Pampanga',
    rooms: ['Learning Commons — 2nd Floor'],
    x: null,
    y: null,
  },
  {
    id: 'college-office',
    name: 'Your college office',
    aka: 'for example, the College of Computer Studies',
    mapQuery: 'Angeles University Foundation, Angeles City, Pampanga',
    rooms: ['Ask at your own college — each one issues its own registration form'],
    x: null,
    y: null,
  },
];

/** Step 1 happens before the student travels, so it has no building. */
export const ONLINE = {
  id: 'online',
  name: 'myAU portal',
  href: 'https://www.auf.edu.ph/',
};

export const STEPS = [
  {
    number: '1',
    title: 'Online Enlistment',
    detail:
      'Enlist in your subjects through the online myAU portal before going to campus.',
    location: 'myAU portal — auf.edu.ph',
    buildingId: 'online',
  },
  {
    number: '2',
    title: 'Document Submission',
    detail:
      'Submit your PSA Birth Certificate, printed GSPIS, and Form 138 / SF10 inside a long brown envelope.',
    location:
      'Office of the University Registrar and Admissions, Room A-203, 2nd Floor, Angeles Hall',
    buildingId: 'angeles-hall',
    bring: [
      'PSA Birth Certificate',
      'Printed GSPIS',
      'Form 138 / SF10',
      'Long brown envelope',
    ],
  },
  {
    number: '3',
    title: 'Payment of Fees',
    detail: 'Settle your enrollment fees and keep the official receipt.',
    location:
      'AUF Cashier Accounting Office, Ground Floor, Angeles Hall, beside the Chapel',
    buildingId: 'angeles-hall',
  },
  {
    number: '4',
    title: 'Student ID Processing',
    detail: 'Have your photo taken and your student ID processed.',
    location: 'Learning Commons, 2nd Floor, University Library Building',
    buildingId: 'library-commons',
  },
  {
    number: '5',
    title: 'AUF Email Account',
    detail: 'Claim your official AUF student email account.',
    location: 'Learning Commons, 2nd Floor, University Library Building',
    buildingId: 'library-commons',
  },
  {
    number: '6',
    title: 'Registration Form',
    detail:
      'Claim your registration form at your respective college office, for example the College of Computer Studies.',
    location: 'Your respective college office',
    buildingId: 'college-office',
  },
  {
    number: '7',
    title: 'Medical Exam & Uniforms',
    detail: 'Complete your medical examination and order your school uniforms.',
    location: 'Learning Commons, 2nd Floor, University Library Building',
    buildingId: 'library-commons',
  },
];

/**
 * Steps 4, 5 and 7 are handled together at one counter. The official numbering
 * stays intact — students quote those numbers at the office — but the page
 * surfaces the grouping so nobody queues at the Learning Commons three times.
 */
export const TRIPS = [
  {
    buildingId: 'library-commons',
    steps: ['4', '5', '7'],
    label: 'One trip to the Learning Commons',
    note: 'Steps 4, 5 and 7 are handled together — do all three while you are there.',
  },
];

export const DRESS_CODE = {
  intro:
    'The official AUF campus dress code applies to every student transacting on campus during the enrollment period.',
  prohibited: [
    'Sleeveless tops',
    'Crop tops',
    'Muscle shirts',
    'Spaghetti straps',
    'Shorts',
  ],
  note:
    'Students wearing prohibited attire may be refused entry or service at the offices handling enrollment.',
};

/** Quick-pick chips shown under the search bar. */
export const CHIPS = [
  'Where do I submit my documents?',
  'Where do I pay the enrollment fees?',
  'What am I not allowed to wear?',
];

/** Accordion entries for the FAQs section. */
export const FAQS = [
  {
    question: 'Where do I submit my enrollment documents?',
    answer:
      'At the Office of the University Registrar and Admissions, Room A-203, 2nd Floor of Angeles Hall. Bring your PSA Birth Certificate, printed GSPIS, and Form 138 / SF10 in a long brown envelope.',
  },
  {
    question: 'Where do I pay my enrollment fees?',
    answer:
      'At the AUF Cashier Accounting Office on the Ground Floor of Angeles Hall, beside the Chapel.',
  },
  {
    question: 'Where do I get my student ID, email, and uniform?',
    answer:
      'Steps 4, 5, and 7 are handled together at the Learning Commons on the 2nd Floor of the University Library Building.',
  },
  {
    question: 'Where do I claim my registration form?',
    answer:
      'At your respective college office — for example, the College of Computer Studies.',
  },
  {
    question: 'What am I not allowed to wear on campus?',
    answer:
      'Sleeveless tops, crop tops, muscle shirts, spaghetti straps, and shorts are strictly prohibited.',
  },
  {
    question: 'Do I need to enlist online before coming to campus?',
    answer:
      'Yes. Step 1 is online enlistment through the myAU portal at auf.edu.ph, done before you visit any office.',
  },
];

/**
 * The context passage fed to the QnA model. Every fact rendered on the page
 * appears here so the model can only answer from published guidelines.
 */
export const PASSAGE = [
  'The Angeles University Foundation new student enrollment process has seven steps.',
  'Step 1 is online enlistment, which is managed through the online myAU portal at auf.edu.ph.',
  'Step 2 is document submission, where the student submits a PSA Birth Certificate, a printed GSPIS, and Form 138 or SF10 inside a long brown envelope at the Office of the University Registrar and Admissions in Room A-203 on the 2nd Floor of Angeles Hall, also called the Administration Building.',
  'Step 3 is payment, where the student settles the enrollment fees at the AUF Cashier Accounting Office on the Ground Floor of Angeles Hall, beside the Chapel.',
  'Steps 4, 5, and 7 cover the student ID, the AUF student email account, the medical examination, and the school uniforms, and they are handled together at the Learning Commons on the 2nd Floor of the University Library Building.',
  'Step 6 is the registration form, which the student claims at their respective college office, for example the College of Computer Studies.',
  'The official campus dress code strictly prohibits students from wearing sleeveless tops, crop tops, muscle shirts, spaghetti straps, and shorts on campus.',
].join(' ');
