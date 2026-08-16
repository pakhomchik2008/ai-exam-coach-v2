// Examik — Learn trees for A-Level subjects.
//
// Same split as NMT: qualificationId "alevel" is not one tree. Mathematics
// and Chemistry are different sittings. Topic titles are the official 2025
// programme headings from curriculum-data.jsx (AQA/Edexcel/OCR overlap).
// Grouping is AI-drafted — Hlib edits later; node ids stay stable.

import type { LearnTree, LearnUnit } from "./schema";

function unit(prefix: string, en: string, uk: string, names: readonly string[]): LearnUnit {
  return {
    id: prefix,
    title: { en, uk },
    nodes: names.map((name, i) => ({
      id: `${prefix}-${String(i + 1).padStart(2, "0")}`,
      title: { en: name, uk: name },
      complexity: (i < 2 ? 2 : i < 5 ? 3 : 4) as 2 | 3 | 4,
      estimatedMinutes: 10,
      prerequisites: i === 0 ? [] : [`${prefix}-${String(i).padStart(2, "0")}`],
    })),
  };
}

function tree(examTaxonomy: string, units: readonly LearnUnit[]): LearnTree {
  return { examTaxonomy, units };
}

export const ALEVEL_MATH = tree("alevel-math", [
  unit("al-pure", "Pure Mathematics", "Чиста математика", [
    "Algebra and Proof", "Functions and Graphs", "Coordinate Geometry", "Quadratics",
    "Equations and Inequalities", "Sequences and Series", "Trigonometry",
    "Exponentials and Logarithms", "Differentiation", "Integration", "Numerical Methods", "Vectors",
  ]),
  unit("al-stat", "Statistics", "Статистика", [
    "Data Presentation", "Measures", "Probability", "Statistical Distributions", "Regression",
  ]),
  unit("al-mech", "Mechanics", "Механіка", [
    "Quantities and Units", "Kinematics", "Forces", "Moments", "Projectiles", "Momentum", "Work, Energy and Power",
  ]),
]);

export const ALEVEL_FM = tree("alevel-fm", [
  unit("af-core", "Core pure", "Ядро", [
    "Proof", "Complex Numbers", "Matrices", "Linear Algebra", "Further Algebra", "Further Functions",
  ]),
  unit("af-calc", "Further calculus", "Подальше числення", [
    "Further Calculus", "Taylor and Maclaurin Series", "Polar Coordinates", "Vectors",
  ]),
  unit("af-app", "Applied", "Прикладна", [
    "Discrete Random Variables", "Continuous Random Variables", "Statistical Inference",
    "Probability Models", "Momentum",
  ]),
]);

export const ALEVEL_PHYS = tree("alevel-phys", [
  unit("ap-core", "Core physics", "Ядро", [
    "Measurements and Their Errors", "Particles and Radiation", "Waves", "Motion", "Forces", "Energy", "Materials",
  ]),
  unit("ap-em", "Electricity and fields", "Електрика і поля", [
    "Charge", "Circuits", "Electrical Power", "Capacitance", "Circular Motion", "Simple Harmonic Motion",
    "Gravitational Fields", "Electric Fields", "Magnetic Fields",
  ]),
  unit("ap-mod", "Thermal, nuclear, options", "Тепло, ядро, опції", [
    "Thermal Physics", "Nuclear Physics", "Astrophysics (optional module)", "Practical Skills",
  ]),
]);

export const ALEVEL_CHEM = tree("alevel-chem", [
  unit("ac-phys", "Physical", "Фізична", [
    "Atomic Structure", "Amount of Substance", "Bonding and Structure", "Energetics",
    "Kinetics", "Chemical Equilibrium", "Redox Chemistry", "Electrochemistry",
  ]),
  unit("ac-inorg", "Inorganic", "Неорганічна", [
    "Periodicity", "Group 2", "Group 7 (Halogens)", "Transition Metals", "Analytical Chemistry",
  ]),
  unit("ac-org", "Organic", "Органічна", [
    "Introduction", "Alkanes", "Alkenes", "Haloalkanes", "Alcohols", "Arenes",
    "Carbonyl Compounds", "Carboxylic Acids", "Amines", "Polymers", "Organic Analysis", "Practical Skills",
  ]),
]);

export const ALEVEL_BIO = tree("alevel-bio", [
  unit("ab-cell", "Molecules and cells", "Молекули і клітини", [
    "Biological Molecules", "Cell Structure", "Cell Membranes", "Transport Across Membranes",
    "Cell Division", "Microscopy",
  ]),
  unit("ab-body", "Exchange and systems", "Обмін і системи", [
    "Exchange Surfaces", "Human Gas Exchange", "Circulatory System", "Blood",
  ]),
  unit("ab-life", "Genetics and ecology", "Генетика і екологія", [
    "DNA, genes and protein synthesis", "Genetic diversity", "Biodiversity",
    "Photosynthesis", "Respiration", "Energy transfer", "Response to stimuli", "Homeostasis",
    "Populations and ecosystems", "Practical Skills",
  ]),
]);

export const ALEVEL_CS = tree("alevel-cs", [
  unit("as-prog", "Programming", "Програмування", [
    "Fundamentals of Programming", "Problem Solving", "Searching", "Sorting",
    "Recursion", "Object-Oriented Programming", "Practical Programming Project (NEA)",
  ]),
  unit("as-data", "Data and algorithms", "Дані й алгоритми", [
    "Arrays", "Stacks", "Queues", "Linked Lists", "Trees", "Hash Tables", "Graphs",
    "Graph Algorithms", "Optimisation", "Boolean Algebra",
  ]),
  unit("as-sys", "Systems and networks", "Системи і мережі", [
    "CPU", "Memory", "Storage", "Number Systems", "Binary Arithmetic",
    "Operating Systems", "Databases", "Network Types", "Protocols", "Cyber Security",
  ]),
]);

export const ALEVEL_ECON = tree("alevel-econ", [
  unit("ae-micro", "Microeconomics", "Мікроекономіка", [
    "Introduction to Economics", "Demand", "Supply", "Market Equilibrium", "Elasticity",
    "Costs and Revenues", "Perfect Competition", "Oligopoly", "Monopoly", "Labour Market",
  ]),
  unit("ae-macro", "Macroeconomics", "Макроекономіка", [
    "National Economy", "Economic Growth", "Inflation", "Unemployment",
    "Fiscal Policy", "Monetary Policy", "International Trade", "Globalisation",
  ]),
]);

export const ALEVEL_BUS = tree("alevel-bus", [
  unit("abu-core", "Business", "Бізнес", [
    "What is Business?", "Managers, leadership and decision making", "Marketing",
    "Operations", "Finance", "Human resources", "Strategic analysis", "Strategic choice",
  ]),
]);

export const ALEVEL_ENG = tree("alevel-eng", [
  unit("aen-lang", "English Language", "Англійська мова", [
    "Phonetics", "Lexis and semantics", "Grammar", "Discourse", "Pragmatics",
    "Language and social context", "Child language", "Language change",
  ]),
]);

export const ALEVEL_LIT = tree("alevel-lit", [
  unit("ali-form", "Forms", "Форми", ["Poetry", "Prose", "Drama"]),
  unit("ali-skill", "Skills", "Навички", [
    "Close reading", "Context and interpretation", "Comparison", "Critical debate",
  ]),
]);

export const ALEVEL_HIST = tree("alevel-hist", [
  unit("ah-skill", "Historical skills", "Історичні навички", [
    "Historical Skills and Methods",
  ]),
  unit("ah-study", "Period study", "Період", [
    "Political change", "Social and economic change", "War and diplomacy", "Interpretations",
  ]),
]);

export const ALEVEL_GEO = tree("alevel-geo", [
  unit("ag-phys", "Physical", "Фізична", [
    "The Water and Carbon Cycles", "Coastal systems", "Glacial systems", "Hazards",
  ]),
  unit("ag-hum", "Human", "Суспільна", [
    "Global systems and governance", "Changing places", "Contemporary urban environments",
    "Population and the environment",
  ]),
]);

export const ALEVEL_PSY = tree("alevel-psy", [
  unit("ay-core", "Core approaches", "Підходи", [
    "Types of Social Influence", "Memory", "Attachment", "Psychopathology",
    "Approaches in Psychology", "Biopsychology", "Research methods",
  ]),
  unit("ay-opt", "Issues and options", "Питання й опції", [
    "Issues and debates", "Relationships", "Schizophrenia", "Aggression",
  ]),
]);

export const ALEVEL_POL = tree("alevel-pol", [
  unit("ao-uk", "UK politics", "Політика UK", [
    "Democracy", "Political parties", "Electoral systems", "Voting behaviour", "The constitution",
    "Parliament", "The prime minister and cabinet", "The judiciary",
  ]),
]);

function langTree(taxonomy: string, prefix: string, listening: string, reading: string): LearnTree {
  return tree(taxonomy, [
    unit(`${prefix}-skill`, "Skills", "Навички", [
      listening, reading, "Writing", "Speaking", "Grammar and vocabulary", "Film and literature",
    ]),
  ]);
}

export const ALEVEL_FR = langTree("alevel-fr", "afr", "Listening (Compréhension orale)", "Reading");
export const ALEVEL_DE = langTree("alevel-de", "ade", "Listening (Hörverstehen)", "Reading");
export const ALEVEL_ES = langTree("alevel-es", "aes", "Listening (Comprensión Auditiva)", "Reading");
