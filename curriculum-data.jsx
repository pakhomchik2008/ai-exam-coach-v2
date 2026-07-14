// AI Exam Coach — curriculum data layer, part 1: static "official" seed.
//
// This is a SMALL, hand-curated set of syllabi I can actually vouch for —
// not a claim of licensed access to real exam-board specifications. Every
// row here is source:"official" and skips the AI-verification-before-save
// step (curriculum-store.jsx / CurriculumStep.jsx). Everything NOT covered
// here falls through to AI generation + user confirmation instead of being
// silently invented and presented as verified.
//
// Row shape (flat array, one row per Country+Qualification+Board+Subject+
// SpecVersion combo — flat, not deeply nested, so lookup is a simple filter):
//   countryId, educationSystemId, qualificationId, board, specVersion,
//   subject, aliases: [...], topics: [{ name, difficulty, importance, subtopics: [] }],
//   source: "official"
//
// board/specVersion are nullable — qualifications without EXAM_TYPES[].boardOptions
// (see onboarding-data.jsx) always have board: null here too, so a lookup never
// asks for a board field that shouldn't exist for that qualification.

const CURRICULUM_SEED = [
  {
    countryId: "gb", educationSystemId: "k12", qualificationId: "gcse", board: "AQA", specVersion: "2024",
    subject: "Mathematics", aliases: ["GCSE Maths", "Maths", "Math", "GCSE Mathematics"],
    topics: [
      { name: "Number", difficulty: 3, importance: 7, subtopics: ["Place value", "Fractions, decimals & percentages", "Standard form", "Surds"] },
      { name: "Algebra", difficulty: 6, importance: 9, subtopics: ["Expanding & factorising", "Solving equations", "Sequences", "Graphs of functions"] },
      { name: "Ratio, Proportion & Rates of Change", difficulty: 4, importance: 6, subtopics: ["Ratio", "Direct & inverse proportion", "Compound measures"] },
      { name: "Geometry & Measures", difficulty: 5, importance: 8, subtopics: ["Angles", "Area & perimeter", "Circle theorems", "Vectors", "Transformations"] },
      { name: "Probability", difficulty: 4, importance: 6, subtopics: ["Single & combined events", "Tree diagrams", "Venn diagrams"] },
      { name: "Statistics", difficulty: 4, importance: 6, subtopics: ["Averages & spread", "Charts & diagrams", "Sampling"] },
      { name: "Trigonometry", difficulty: 7, importance: 7, subtopics: ["Sine & cosine rule", "Trig graphs", "Pythagoras"] },
    ],
    source: "official",
  },
  {
    countryId: "gb", educationSystemId: "k12", qualificationId: "gcse", board: "AQA", specVersion: "2024",
    subject: "Combined Science", aliases: ["GCSE Combined Science", "Trilogy", "Double Science"],
    topics: [
      { name: "Cell Biology", difficulty: 4, importance: 7, subtopics: ["Cell structure", "Cell division", "Transport in cells"] },
      { name: "Organisation", difficulty: 5, importance: 7, subtopics: ["Digestive system", "Circulatory system", "Plant organisation"] },
      { name: "Infection & Response", difficulty: 4, importance: 6, subtopics: ["Pathogens", "Human defence systems", "Vaccination"] },
      { name: "Bioenergetics", difficulty: 5, importance: 6, subtopics: ["Photosynthesis", "Respiration"] },
      { name: "Atomic Structure & the Periodic Table", difficulty: 5, importance: 7, subtopics: ["Atomic model", "Periodic table trends"] },
      { name: "Bonding, Structure & Properties of Matter", difficulty: 6, importance: 7, subtopics: ["Ionic bonding", "Covalent bonding", "States of matter"] },
      { name: "Chemical Changes", difficulty: 6, importance: 6, subtopics: ["Reactivity series", "Electrolysis", "Acids & bases"] },
      { name: "Energy Changes", difficulty: 5, importance: 5, subtopics: ["Exothermic & endothermic reactions"] },
      { name: "Energy (Physics)", difficulty: 5, importance: 7, subtopics: ["Energy stores & transfers", "Efficiency"] },
      { name: "Electricity", difficulty: 6, importance: 7, subtopics: ["Circuits", "Current, voltage & resistance"] },
      { name: "Particle Model of Matter", difficulty: 5, importance: 5, subtopics: ["Density", "Changes of state"] },
      { name: "Forces", difficulty: 6, importance: 7, subtopics: ["Motion", "Newton's laws", "Momentum"] },
      { name: "Waves", difficulty: 5, importance: 6, subtopics: ["Wave properties", "Electromagnetic spectrum"] },
      { name: "Magnetism & Electromagnetism", difficulty: 5, importance: 5, subtopics: ["Magnetic fields", "The motor effect"] },
    ],
    source: "official",
  },
  {
    countryId: "gb", educationSystemId: "k12", qualificationId: "gcse", board: "AQA", specVersion: "2024",
    subject: "English Language", aliases: ["GCSE English Language", "English"],
    topics: [
      { name: "Explorations in Creative Reading & Writing", difficulty: 5, importance: 8, subtopics: ["Reading unseen fiction", "Descriptive & narrative writing"] },
      { name: "Writers' Viewpoints & Perspectives", difficulty: 5, importance: 7, subtopics: ["Reading non-fiction", "Transactional writing"] },
      { name: "Spoken Language", difficulty: 3, importance: 4, subtopics: ["Presenting", "Responding to questions"] },
    ],
    source: "official",
  },
  {
    countryId: "us", educationSystemId: "k12", qualificationId: "ap", board: "College Board", specVersion: "2024-25",
    subject: "AP Calculus AB", aliases: ["AP Calc AB", "Calculus AB"],
    topics: [
      { name: "Limits & Continuity", difficulty: 5, importance: 7, subtopics: ["Limit laws", "Continuity", "Asymptotes"] },
      { name: "Differentiation: Definition & Fundamental Properties", difficulty: 6, importance: 9, subtopics: ["Derivative rules", "Product & quotient rule"] },
      { name: "Differentiation: Composite, Implicit & Inverse Functions", difficulty: 7, importance: 8, subtopics: ["Chain rule", "Implicit differentiation"] },
      { name: "Contextual Applications of Differentiation", difficulty: 6, importance: 7, subtopics: ["Related rates", "Optimization"] },
      { name: "Analytical Applications of Differentiation", difficulty: 6, importance: 7, subtopics: ["Mean value theorem", "Curve sketching"] },
      { name: "Integration & Accumulation of Change", difficulty: 7, importance: 9, subtopics: ["Riemann sums", "Fundamental theorem of calculus"] },
      { name: "Differential Equations", difficulty: 6, importance: 6, subtopics: ["Slope fields", "Separation of variables"] },
      { name: "Applications of Integration", difficulty: 6, importance: 7, subtopics: ["Area between curves", "Volumes of revolution"] },
    ],
    source: "official",
  },
  {
    countryId: "us", educationSystemId: "k12", qualificationId: "ap", board: "College Board", specVersion: "2024-25",
    subject: "AP Biology", aliases: ["AP Bio"],
    topics: [
      { name: "Chemistry of Life", difficulty: 4, importance: 6, subtopics: ["Water properties", "Macromolecules"] },
      { name: "Cell Structure & Function", difficulty: 5, importance: 8, subtopics: ["Cell components", "Membrane transport"] },
      { name: "Cellular Energetics", difficulty: 6, importance: 8, subtopics: ["Photosynthesis", "Cellular respiration"] },
      { name: "Cell Communication & Cell Cycle", difficulty: 6, importance: 7, subtopics: ["Signal transduction", "Mitosis & meiosis"] },
      { name: "Heredity", difficulty: 6, importance: 7, subtopics: ["Mendelian genetics", "Non-Mendelian inheritance"] },
      { name: "Gene Expression & Regulation", difficulty: 7, importance: 8, subtopics: ["DNA/RNA structure", "Transcription & translation"] },
      { name: "Natural Selection", difficulty: 5, importance: 7, subtopics: ["Evolution evidence", "Population genetics"] },
      { name: "Ecology", difficulty: 4, importance: 6, subtopics: ["Population dynamics", "Ecosystem energy flow"] },
    ],
    source: "official",
  },
];

// Real, publicly-known subject/course NAMES (no topics) for qualifications
// that don't have full hand-curated syllabi yet — these are official exam
// board / awarding body subject titles (GCSE, A-Level, AP, IB), not invented
// courses, so listing the NAME is honest even though we don't have the real
// topic breakdown. Exists purely so autocomplete feels populated instead of
// dead-ending in "not found" for completely ordinary subjects like Biology
// or Sociology — selecting one skips straight to AI-generate (still
// confirm-before-save, still labelled source:"ai", never silently accepted).
const KNOWN_SUBJECTS = {
  gcse: [
    "Mathematics", "English Language", "English Literature", "Combined Science", "Biology", "Chemistry", "Physics",
    "Computer Science", "Geography", "History", "French", "Spanish", "German", "Religious Studies", "Art & Design",
    "Business Studies", "Economics", "Psychology", "Sociology", "Physical Education", "Music", "Drama",
    "Design & Technology", "Food Preparation & Nutrition", "Media Studies", "Statistics",
  ],
  alevel: [
    "Mathematics", "Further Mathematics", "English Literature", "English Language", "Biology", "Chemistry", "Physics",
    "Computer Science", "Geography", "History", "Economics", "Business", "Psychology", "Sociology", "Art & Design",
    "Politics", "Law", "Philosophy", "Religious Studies", "French", "Spanish", "German", "Physical Education",
    "Music", "Drama and Theatre", "Design & Technology", "Media Studies",
  ],
  ap: [
    "AP Calculus AB", "AP Calculus BC", "AP Statistics", "AP Biology", "AP Chemistry", "AP Physics 1", "AP Physics 2",
    "AP Physics C: Mechanics", "AP Computer Science A", "AP Computer Science Principles",
    "AP English Language and Composition", "AP English Literature and Composition", "AP US History",
    "AP World History", "AP European History", "AP Psychology", "AP Microeconomics", "AP Macroeconomics",
    "AP Environmental Science", "AP Human Geography", "AP Art History", "AP Spanish Language", "AP French Language",
  ],
  ib: [
    "Mathematics: Analysis and Approaches", "Mathematics: Applications and Interpretation", "Biology", "Chemistry",
    "Physics", "English A: Literature", "Economics", "History", "Geography", "Psychology", "Computer Science",
    "Business Management", "Visual Arts",
  ],
};

Object.assign(window, { CURRICULUM_SEED, KNOWN_SUBJECTS });
