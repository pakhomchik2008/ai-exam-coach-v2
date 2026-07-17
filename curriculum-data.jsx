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
    countryId: "us", educationSystemId: "k12", qualificationId: "ap", board: null, specVersion: "2024-25",
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
    countryId: "us", educationSystemId: "k12", qualificationId: "ap", board: null, specVersion: "2024-25",
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
  // NMT (Національний мультитест) — Ukraine's university-entrance test. Unlike
  // GCSE/A-Level/AP, this isn't a pick-from-dozens catalogue: every student sits
  // the SAME 3 mandatory subjects, plus one elective 4th (see KNOWN_SUBJECTS.nmt
  // below). Verified against testportal.gov.ua (Ukrainian Center for Educational
  // Quality Assessment, the exam's own administering body) and cross-checked
  // against independent prep-site breakdowns — 2026 cycle, programs unchanged
  // since 2018.
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Mathematics", aliases: ["НМТ Математика", "Математика", "NMT Math"],
    topics: [
      { name: "Numbers & Expressions", difficulty: 4, importance: 7, subtopics: ["Real numbers, ratios & percentages", "Word problems", "Exponential, logarithmic & trigonometric expressions"] },
      { name: "Equations & Inequalities", difficulty: 6, importance: 8, subtopics: ["Linear & quadratic", "Rational & irrational", "Trigonometric", "Exponential & logarithmic"] },
      { name: "Functions & Calculus Basics", difficulty: 7, importance: 8, subtopics: ["Sequences", "Linear, quadratic & power functions", "Exponential, logarithmic & trig functions", "Derivative", "Antiderivative & definite integral"] },
      { name: "Planar Geometry", difficulty: 6, importance: 7, subtopics: ["Triangle & right triangle", "Parallelogram, trapezoid, rhombus", "Square, rectangle, polygon", "Circle & disk"] },
      { name: "Coordinates & Vectors", difficulty: 5, importance: 4, subtopics: ["Coordinates on the plane", "Vector operations"] },
      { name: "Combinatorics, Probability & Statistics", difficulty: 5, importance: 5, subtopics: ["Permutations, combinations, arrangements", "Sum & product rules", "Probability of random events", "Sample characteristics"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Ukrainian Language", aliases: ["НМТ Українська мова", "Українська мова", "NMT Ukrainian"],
    topics: [
      { name: "Phonetics, Orthoepy & Graphics", difficulty: 4, importance: 5, subtopics: ["Sound system", "Stress patterns", "Sound-letter correspondence"] },
      { name: "Orthography", difficulty: 6, importance: 9, subtopics: ["Unstressed vowels е/и, о/а in roots", "Prefixes пре-/при-, з-/с-, роз-, без-", "Noun & adjective suffixes", "Capitalization", "Together/apart/hyphenated spelling", "2019 orthography update"] },
      { name: "Lexicology & Phraseology", difficulty: 4, importance: 5, subtopics: ["Word meaning & usage", "Synonyms, antonyms, homonyms", "Set phrases & idioms"] },
      { name: "Word Structure & Word Formation", difficulty: 4, importance: 5, subtopics: ["Morphemes", "Formation methods"] },
      { name: "Morphology", difficulty: 5, importance: 6, subtopics: ["Parts of speech", "Grammatical forms & categories"] },
      { name: "Syntax & Punctuation", difficulty: 6, importance: 9, subtopics: ["Sentence structure", "Punctuation with isolated parts & complex sentences", "Simple vs. compound/complex sentences"] },
      { name: "Stylistics & Speech Culture", difficulty: 4, importance: 5, subtopics: ["Reading comprehension", "Register & style recognition"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "History of Ukraine", aliases: ["НМТ Історія України", "Історія України", "NMT History of Ukraine"],
    topics: [
      { name: "Ancient History, Kyivan Rus & Galicia-Volhynia", difficulty: 5, importance: 7, subtopics: ["Early Slavic tribes", "Kyivan Rus statehood", "Galicia-Volhynia principality"] },
      { name: "Ukrainian Lands under Foreign Rule (14th–18th c.)", difficulty: 5, importance: 7, subtopics: ["Lithuanian & Polish rule", "Cossack era & the Zaporizhian Sich", "Khmelnytsky uprising & the Hetmanate"] },
      { name: "Ukrainian Lands in the 19th Century", difficulty: 5, importance: 7, subtopics: ["Russian & Austro-Hungarian empires", "National revival movements"] },
      { name: "Ukrainian Revolution (1917–1921)", difficulty: 6, importance: 8, subtopics: ["Central Rada, Hetmanate, Directorate", "West Ukrainian People's Republic"] },
      { name: "Soviet Ukraine & World War II", difficulty: 6, importance: 8, subtopics: ["Interwar Soviet Ukraine, Holodomor", "Ukraine in WWII"] },
      { name: "Independent Ukraine", difficulty: 5, importance: 7, subtopics: ["1991 independence", "Post-Soviet development", "21st-century events"] },
    ],
    source: "official",
  },
  // A-Level (AQA) — verified against AQA's own specification-at-a-glance pages
  // (7357 Maths, 7402 Biology, 7405 Chemistry, 7408 Physics).
  {
    countryId: "gb", educationSystemId: "k12", qualificationId: "alevel", board: "AQA", specVersion: "7357",
    subject: "Mathematics", aliases: ["A-Level Maths", "A-Level Mathematics"],
    topics: [
      { name: "Proof & Algebra", difficulty: 5, importance: 8, subtopics: ["Proof methods", "Algebraic manipulation", "Functions & graphs"] },
      { name: "Coordinate Geometry & Sequences", difficulty: 5, importance: 6, subtopics: ["Straight lines & circles", "Arithmetic & geometric sequences", "Series & sigma notation"] },
      { name: "Trigonometry", difficulty: 6, importance: 8, subtopics: ["Trig identities & equations", "Small-angle approximations", "Addition formulae"] },
      { name: "Exponentials & Logarithms", difficulty: 6, importance: 7, subtopics: ["Exponential growth/decay", "Laws of logarithms", "Natural logarithm & e"] },
      { name: "Differentiation", difficulty: 7, importance: 9, subtopics: ["Differentiation from first principles", "Chain, product & quotient rules", "Applications: stationary points, rates of change"] },
      { name: "Integration & Numerical Methods", difficulty: 7, importance: 8, subtopics: ["Integration techniques", "Area under a curve", "Numerical solving of equations"] },
      { name: "Vectors", difficulty: 5, importance: 4, subtopics: ["Vectors in 2D & 3D", "Vector geometry"] },
      { name: "Statistics", difficulty: 5, importance: 7, subtopics: ["Sampling methods", "Data presentation & interpretation", "Probability & statistical distributions", "Hypothesis testing"] },
      { name: "Mechanics", difficulty: 6, importance: 7, subtopics: ["Kinematics (SUVAT, graphs)", "Forces & Newton's laws", "Moments"] },
    ],
    source: "official",
  },
  {
    countryId: "gb", educationSystemId: "k12", qualificationId: "alevel", board: "AQA", specVersion: "7402",
    subject: "Biology", aliases: ["A-Level Biology"],
    topics: [
      { name: "Biological Molecules", difficulty: 5, importance: 7, subtopics: ["Carbohydrates, lipids & proteins", "Nucleic acids", "Enzymes"] },
      { name: "Cells", difficulty: 5, importance: 7, subtopics: ["Cell structure", "Cell division", "Transport across membranes"] },
      { name: "Organisms Exchange Substances with Their Environment", difficulty: 6, importance: 6, subtopics: ["Surface area to volume ratio", "Gas exchange", "Mass transport"] },
      { name: "Genetic Information, Variation & Relationships Between Organisms", difficulty: 6, importance: 7, subtopics: ["DNA, genes & the genetic code", "Meiosis & variation", "Classification & biodiversity"] },
      { name: "Energy Transfers in and Between Organisms", difficulty: 7, importance: 7, subtopics: ["Photosynthesis", "Respiration", "Energy & ecosystems"] },
      { name: "Organisms Respond to Changes in Their Environment", difficulty: 6, importance: 6, subtopics: ["Nervous coordination", "Homeostasis", "Plant & animal responses"] },
      { name: "Genetics, Populations, Evolution & Ecosystems", difficulty: 7, importance: 8, subtopics: ["Inheritance", "Populations & evolution", "Ecosystem dynamics"] },
      { name: "The Control of Gene Expression", difficulty: 8, importance: 7, subtopics: ["Gene mutation", "Regulation of gene expression", "Genome sequencing"] },
    ],
    source: "official",
  },
  {
    countryId: "gb", educationSystemId: "k12", qualificationId: "alevel", board: "AQA", specVersion: "7405",
    subject: "Chemistry", aliases: ["A-Level Chemistry"],
    topics: [
      { name: "Physical Chemistry: Foundations", difficulty: 5, importance: 7, subtopics: ["Atomic structure", "Amount of substance", "Bonding", "Energetics", "Kinetics", "Equilibria & redox"] },
      { name: "Physical Chemistry: Advanced", difficulty: 7, importance: 7, subtopics: ["Thermodynamics", "Rate equations", "Equilibrium constant Kp", "Electrode potentials & cells", "Acids & bases"] },
      { name: "Inorganic Chemistry: Foundations", difficulty: 5, importance: 6, subtopics: ["Periodicity", "Group 2 (alkaline earth metals)", "Group 7/17 (halogens)"] },
      { name: "Inorganic Chemistry: Advanced", difficulty: 6, importance: 6, subtopics: ["Period 3 elements & oxides", "Transition metals", "Reactions of ions in solution"] },
      { name: "Organic Chemistry: Foundations", difficulty: 5, importance: 7, subtopics: ["Alkanes", "Halogenoalkanes", "Alkenes", "Alcohols", "Organic analysis"] },
      { name: "Organic Chemistry: Advanced", difficulty: 7, importance: 7, subtopics: ["Optical isomerism", "Aldehydes & ketones", "Carboxylic acids & derivatives", "Aromatic chemistry", "Amines", "Polymers", "Amino acids, proteins & DNA", "Organic synthesis", "NMR spectroscopy", "Chromatography"] },
    ],
    source: "official",
  },
  {
    countryId: "gb", educationSystemId: "k12", qualificationId: "alevel", board: "AQA", specVersion: "7408",
    subject: "Physics", aliases: ["A-Level Physics"],
    topics: [
      { name: "Measurements & Their Errors", difficulty: 4, importance: 5, subtopics: ["Use of SI units", "Uncertainty & error analysis"] },
      { name: "Particles & Radiation", difficulty: 6, importance: 6, subtopics: ["Particle structure of matter", "Quarks & leptons", "Photons & energy levels"] },
      { name: "Waves", difficulty: 5, importance: 7, subtopics: ["Wave properties", "Refraction & interference", "Diffraction"] },
      { name: "Mechanics & Materials", difficulty: 6, importance: 8, subtopics: ["Motion, force & momentum", "Work, energy & power", "Materials (stress, strain, Young's modulus)"] },
      { name: "Electricity", difficulty: 6, importance: 7, subtopics: ["Current & charge", "Resistance & circuits", "EMF & internal resistance"] },
      { name: "Further Mechanics & Thermal Physics", difficulty: 7, importance: 6, subtopics: ["Circular motion", "Simple harmonic motion", "Thermal physics & gases"] },
      { name: "Fields & Their Consequences", difficulty: 7, importance: 7, subtopics: ["Gravitational fields", "Electric fields", "Capacitance", "Magnetic fields"] },
      { name: "Nuclear Physics", difficulty: 6, importance: 6, subtopics: ["Radioactive decay", "Nuclear instability", "Nuclear energy"] },
    ],
    source: "official",
  },
  // IB Diploma Programme — board:null since IB has no boardOptions in
  // EXAM_TYPES (exam-wizard.jsx only asks for a board for gcse/alevel), so the
  // lookup always queries with board=null regardless of qualification.
  {
    countryId: null, educationSystemId: "k12", qualificationId: "ib", board: null, specVersion: "2019",
    subject: "Mathematics: Analysis and Approaches", aliases: ["IB Math AA", "Math AA", "Analysis and Approaches"],
    topics: [
      { name: "Number & Algebra", difficulty: 5, importance: 7, subtopics: ["Sequences & series", "Exponents & logarithms", "Binomial theorem", "Proof"] },
      { name: "Functions", difficulty: 6, importance: 8, subtopics: ["Domain, range & inverse functions", "Transformations", "Quadratic, exponential & logarithmic functions"] },
      { name: "Geometry & Trigonometry", difficulty: 6, importance: 7, subtopics: ["3D volume & surface area", "Angles between lines/planes", "Trig identities & the unit circle"] },
      { name: "Statistics & Probability", difficulty: 5, importance: 6, subtopics: ["Descriptive statistics", "Probability & distributions", "Correlation & regression"] },
      { name: "Calculus", difficulty: 8, importance: 9, subtopics: ["Limits & continuity", "Differentiation & applications", "Integration & applications"] },
    ],
    source: "official",
  },
  {
    countryId: null, educationSystemId: "k12", qualificationId: "ib", board: null, specVersion: "2023",
    subject: "Biology", aliases: ["IB Biology"],
    topics: [
      { name: "Unity & Diversity", difficulty: 6, importance: 8, subtopics: ["Molecules: water & carbon compounds", "Cells: cell structure & division", "Organisms: classification", "Ecosystems: biodiversity"] },
      { name: "Form & Function", difficulty: 6, importance: 8, subtopics: ["Molecules: enzymes & membranes", "Cells: organelles", "Organisms: exchange & transport", "Ecosystems: adaptation"] },
      { name: "Interaction & Interdependence", difficulty: 6, importance: 7, subtopics: ["Molecules: cell signalling", "Cells: cell communities", "Organisms: coordination & response", "Ecosystems: energy & nutrient flow"] },
      { name: "Continuity & Change", difficulty: 7, importance: 8, subtopics: ["Molecules: DNA replication & gene expression", "Cells: cell division & cancer", "Organisms: reproduction & inheritance", "Ecosystems: evolution & natural selection"] },
    ],
    source: "official",
  },
  {
    countryId: null, educationSystemId: "k12", qualificationId: "ib", board: null, specVersion: "2025",
    subject: "Chemistry", aliases: ["IB Chemistry"],
    topics: [
      { name: "Structure 1: Models of Particulate Matter", difficulty: 5, importance: 7, subtopics: ["Kinetic molecular theory", "States of matter & changes of state"] },
      { name: "Structure 2: Models of Bonding & Structure", difficulty: 6, importance: 8, subtopics: ["Ionic model", "Covalent model", "Metallic model"] },
      { name: "Structure 3: Classification of Matter", difficulty: 6, importance: 7, subtopics: ["Periodic trends", "Organic chemistry", "Spectroscopy"] },
      { name: "Reactivity 1: What Drives Chemical Reactions", difficulty: 7, importance: 7, subtopics: ["Enthalpy & entropy", "Gibbs energy & reaction feasibility"] },
      { name: "Reactivity 2: How Much, How Fast, How Far", difficulty: 7, importance: 8, subtopics: ["Enthalpy change (how much)", "Rate of reaction (how fast)", "Equilibrium (how far)"] },
      { name: "Reactivity 3: Mechanisms of Chemical Change", difficulty: 7, importance: 7, subtopics: ["Redox chemistry", "Acid-base theory", "Organic reaction mechanisms"] },
    ],
    source: "official",
  },
  // Matura (Poland) — mandatory: Polish, Mathematics, a modern foreign
  // language (all podstawa/basic level, Polish & the language also have an
  // oral component), plus at least one elective at rozszerzenie/extended
  // level (see KNOWN_SUBJECTS.matura). Verified against CKE-referencing
  // sources for the current cycle; board:null for the same reason as
  // AP/IB/NMT above (matura has no boardOptions in EXAM_TYPES).
  {
    countryId: "pl", educationSystemId: "k12", qualificationId: "matura", board: null, specVersion: "podstawa",
    subject: "Mathematics", aliases: ["Matematyka", "Matura Matematyka"],
    topics: [
      { name: "Real Numbers & Operations", difficulty: 4, importance: 6, subtopics: ["Powers, roots & logarithms", "Absolute value", "Number intervals"] },
      { name: "Equations & Inequalities", difficulty: 5, importance: 7, subtopics: ["Linear & quadratic equations", "Systems of equations"] },
      { name: "Sequences", difficulty: 5, importance: 6, subtopics: ["Arithmetic sequences", "Geometric sequences"] },
      { name: "Functions", difficulty: 6, importance: 8, subtopics: ["Function properties", "Linear & quadratic functions"] },
      { name: "Trigonometry", difficulty: 5, importance: 5, subtopics: ["Trig functions in right triangles"] },
      { name: "Plane & Spatial Geometry", difficulty: 6, importance: 8, subtopics: ["Area & perimeter of plane figures", "Equations of lines in coordinate systems", "Solids & volumes"] },
      { name: "Combinatorics, Probability & Statistics", difficulty: 5, importance: 6, subtopics: ["Combinatorics", "Probability", "Reading data from tables & charts"] },
    ],
    source: "official",
  },
  {
    countryId: "pl", educationSystemId: "k12", qualificationId: "matura", board: null, specVersion: "podstawa",
    subject: "Polish", aliases: ["Język polski", "Matura Polski"],
    topics: [
      { name: "Antiquity, the Bible & the Middle Ages", difficulty: 5, importance: 6, subtopics: ["Antiquity", "The Bible", "Medieval literature"] },
      { name: "Renaissance, Baroque & Enlightenment", difficulty: 5, importance: 6, subtopics: ["Renaissance", "Baroque", "Enlightenment"] },
      { name: "Romanticism & Positivism", difficulty: 6, importance: 8, subtopics: ["Romanticism (incl. Dziady III)", "Positivism (incl. Lalka)"] },
      { name: "Young Poland & the Interwar Period", difficulty: 6, importance: 7, subtopics: ["Young Poland (incl. Wesele)", "Interwar literature"] },
      { name: "War, Occupation & 1945–1989 Literature", difficulty: 6, importance: 7, subtopics: ["Wartime & occupation literature", "Domestic & émigré literature 1945-1989"] },
      { name: "Literature after 1989", difficulty: 5, importance: 5, subtopics: ["Contemporary Polish literature"] },
      { name: "Required Readings (Lektury)", difficulty: 6, importance: 8, subtopics: ["Plot, characters & motifs", "Key quotations", "32 required texts across all epochs"] },
      { name: "Language in Use & Essay Writing", difficulty: 5, importance: 7, subtopics: ["Reading comprehension", "Argumentative essay structure"] },
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
  // Mathematics, Ukrainian Language, and History of Ukraine are mandatory for
  // every NMT student (full topic breakdowns in CURRICULUM_SEED above). This is
  // the elective 4th subject — students pick exactly one.
  nmt: [
    "Ukrainian Literature", "Biology", "Chemistry", "Physics", "Geography",
    "Foreign Language: English", "Foreign Language: German", "Foreign Language: French", "Foreign Language: Spanish",
  ],
  // Polish, Mathematics, and a modern foreign language (basic level) are
  // mandatory for every Matura student (Polish & Mathematics topic
  // breakdowns in CURRICULUM_SEED above). This is the extended-level
  // (rozszerzenie) elective — students sit at least one, up to six.
  matura: [
    "Biology", "Chemistry", "Physics", "Geography", "History", "Civics (WOS)", "Computer Science", "Philosophy",
    "History of Art", "History of Music", "Latin & Ancient Culture", "Polish", "Mathematics",
    "Foreign Language: English", "Foreign Language: German", "Foreign Language: French", "Foreign Language: Spanish",
    "Foreign Language: Russian", "Foreign Language: Italian",
  ],
  // Abitur is set at the German STATE (Bundesland) level, not nationally — the
  // KMK only coordinates broad standards, so there's no single national
  // syllabus to hand-curate topics from the way GCSE/AP/IB have one. This is
  // only the real, common subject NAMES offered across German Gymnasien —
  // still honest (not invented courses), just without a topic breakdown,
  // same as the other KNOWN_SUBJECTS lists.
  abitur: [
    "Deutsch", "Mathematik", "Englisch", "Französisch", "Spanisch", "Biologie", "Chemie", "Physik", "Geschichte",
    "Erdkunde", "Politik/Wirtschaft", "Philosophie", "Religion/Ethik", "Kunst", "Musik", "Sport", "Informatik",
  ],
};

Object.assign(window, { CURRICULUM_SEED, KNOWN_SUBJECTS });
