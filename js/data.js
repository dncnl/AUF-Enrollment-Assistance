/**
 * Single source of content for AUF Enrollment Assistance.
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
    photo: 'assets/auf-angeleshall.jpg',
    photoWidth: 800,
    photoHeight: 600,
    x: null,
    y: null,
  },
  {
    id: 'library-commons',
    name: 'University Library Building',
    shortName: 'Library',
    aka: 'Learning Commons, 2nd Floor',
    mapQuery: 'University Library, Angeles University Foundation, Angeles City, Pampanga',
    // No separate rooms list here — the Learning Commons is the whole story,
    // and it is already named in `aka` right above. A one-item list here just
    // repeated that line.
    rooms: [],
    photo: 'assets/auf-library.jpg',
    photoWidth: 397,
    photoHeight: 300,
    x: null,
    y: null,
  },
  {
    id: 'college-office',
    name: 'Emmanuel Y. Angeles Center for Learning and Innovation (EYACLI)',
    shortName: 'EYACLI',
    aka: 'College offices building',
    mapQuery:
      'Emmanuel Y. Angeles Center for Learning and Innovation, Angeles University Foundation, Angeles City, Pampanga',
    rooms: ['Ask at your own college — each one issues its own registration form'],
    photo: 'assets/auf-office.jpg',
    photoWidth: 800,
    photoHeight: 533,
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
    detail: 'Enlist in your subjects through the online myAU portal before going to campus.',
    location: 'myAU portal — auf.edu.ph',
    buildingId: 'online',
  },
  {
    number: '2',
    title: 'Document Submission',
    detail:
      'Accomplish the General Student Personal Information Sheet (GSPIS) in MyAU, then submit your entrance credentials inside a long brown envelope.',
    location:
      'Office of the University Registrar and Admissions, Room A-203, 2nd Floor, Angeles Hall',
    buildingId: 'angeles-hall',
    bring: [
      'PSA Birth Certificate (original and 1 photocopy)',
      '2x2 picture with name (1 copy)',
      'Printed and signed GSPIS',
      'Original Form 138 / SF10 (once available)',
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
    title: 'Student ID & AUF Email',
    detail: 'Have your school ID processed and your official AUF email account activated.',
    location: 'Learning Commons, 2nd Floor, University Library Building',
    buildingId: 'library-commons',
  },
  {
    number: '5',
    title: 'Student Medical Form',
    detail: 'Accomplish the Student Medical Form.',
    location: 'Learning Commons, 2nd Floor, University Library Building',
    buildingId: 'library-commons',
  },
  {
    number: '6',
    title: 'Registration Form',
    detail:
      'Claim your registration form at your respective college office inside EYACLI, for example the College of Computer Studies.',
    location: 'Your respective college office, EYACLI',
    buildingId: 'college-office',
  },
  {
    number: '7',
    title: 'Books, Uniforms & Materials',
    detail: 'Purchase your books, uniforms, and other materials.',
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
    'Tank tops',
    'Spaghetti strap tops',
    'Tube tops',
    'Pajama tops',
    'Flimsy tops',
    'Shorts',
  ],
  note:
    'Students wearing prohibited attire may be refused entry or service at the offices handling enrollment.',
};

/** Quick-pick chips shown under the search bar. */
export const CHIPS = [
  'Where do I submit my documents?',
  'Where do I pay the enrollment fees?',
  'What am I not allowed to wear on campus?',
];

/** Accordion entries for the FAQs section. */
export const FAQS = [
  {
    question: 'Where do I submit my enrollment documents?',
    answer:
      'At the Office of the University Registrar and Admissions, Room A-203, 2nd Floor of Angeles Hall, after accomplishing the GSPIS in MyAU. Bring the original and 1 photocopy of your PSA Birth Certificate, a 2x2 picture with name, a printed and signed GSPIS, and your original Form 138 / SF10 in a long brown envelope.',
  },
  {
    question: 'Where do I pay my enrollment fees?',
    answer:
      'At the AUF Cashier Accounting Office on the Ground Floor of Angeles Hall, beside the Chapel.',
  },
  {
    question: 'Where do I get my student ID and AUF email account?',
    answer:
      'At the Learning Commons on the 2nd Floor of the University Library Building — this is Step 4.',
  },
  {
    question: 'Where do I accomplish my Student Medical Form?',
    answer:
      'At the Learning Commons on the 2nd Floor of the University Library Building — this is Step 5.',
  },
  {
    question: 'Where do I buy my books and uniforms?',
    answer:
      'At the Learning Commons on the 2nd Floor of the University Library Building — this is Step 7, done after claiming your registration form.',
  },
  {
    question: 'Where do I claim my registration form?',
    answer:
      'At your respective college office inside the Emmanuel Y. Angeles Center for Learning and Innovation (EYACLI) — for example, the College of Computer Studies.',
  },
  {
    question: 'What am I not allowed to wear on campus?',
    answer:
      'Sleeveless tops, crop tops, muscle shirts, tank tops, spaghetti strap tops, tube tops, pajama tops, flimsy tops, and shorts are strictly prohibited.',
  },
  {
    question: 'Do I need to enlist online before coming to campus?',
    answer:
      'Yes. Step 1 is online enlistment through the myAU portal at auf.edu.ph, done before you visit any office.',
  },
  {
    question: 'Who do I contact for College of Computer Studies admission concerns?',
    answer:
      'Call or text (+63) 961-061-2987, or email ccs@auf.edu.ph or ccs.admissions@auf.edu.ph.',
  },
];

/**
 * The context passage fed to the QnA model. Every fact rendered on the page
 * appears here so the model can only answer from published guidelines.
 */
export const PASSAGE = [
  'The Angeles University Foundation new student enrollment process has seven steps.',
  'Step 1 is online enlistment of subjects, checked through the myAU portal at auf.edu.ph.',
  'Step 2 is document submission, which begins with the accomplishment of the General Student Personal Information Sheet, or GSPIS, in MyAU.',
  'For document submission, the student submits entrance credential documents inside a long brown envelope at the Office of the University Registrar and Admissions in Room A-203 on the 2nd Floor of Angeles Hall, also called the Administration Building.',
  'The entrance credential documents for Step 2 are the original and one photocopy of the PSA Birth Certificate, one 2x2 picture with name, a printed and signed copy of the GSPIS, and the original Form 138 or SF10 once available.',
  'Step 3 is payment of the enrollment fee at the AUF Cashier Accounting Office on the Ground Floor of Angeles Hall, beside the Chapel.',
  'Step 4 is the processing of the school ID, where the student gets their school ID, and the activation of the AUF email account, both done at the Learning Commons on the 2nd Floor of the University Library Building.',
  'Step 5 is the accomplishment of the Student Medical Form, also done at the Learning Commons on the 2nd Floor of the University Library Building.',
  'Step 6 is claiming the registration form, which the student picks up at their respective college office.',
  'Each college has its own office inside the Emmanuel Y. Angeles Center for Learning and Innovation, or EYACLI, for example the College of Computer Studies.',
  'Step 7 is purchasing books, uniforms, and other materials at the Learning Commons on the 2nd Floor of the University Library Building.',
  'The official campus dress code requires appropriate attire such as a t-shirt, polo shirt, blouse, or dress with sleeves and suitable bottoms, and strictly prohibits students from wearing sleeveless tops, crop tops, and shorts on campus.',
  'For College of Computer Studies admission concerns, the contact number is 0961-061-2987 and the email is ccs@auf.edu.ph.',
].join(' ');
