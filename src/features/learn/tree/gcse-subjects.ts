// GCSE subject trees. Seeded subjects (Maths, Combined Science, English
// Language) use curriculum-data.jsx 2024 headings (AQA/Edexcel/OCR overlap).
// Other popular papers use public AQA specification unit titles so Learn
// is not empty — AI-grouped, Hlib edits later; node ids stay stable.

import { tree, unit } from "./build-tree";

export const GCSE_MATH = tree("gcse-math", [
  unit("gm-core", "Mathematics", "Математика", [
    "Number", "Algebra", "Ratio, Proportion & Rates of Change",
    "Geometry & Measures", "Probability", "Statistics", "Trigonometry",
  ]),
]);

export const GCSE_SCI = tree("gcse-sci", [
  unit("gs-bio", "Biology", "Біологія", [
    "Cell Biology", "Organisation", "Infection & Response", "Bioenergetics",
  ]),
  unit("gs-chem", "Chemistry", "Хімія", [
    "Atomic Structure & the Periodic Table", "Bonding, Structure & Properties of Matter",
    "Chemical Changes", "Energy Changes",
  ]),
  unit("gs-phys", "Physics", "Фізика", [
    "Energy (Physics)", "Electricity", "Particle Model of Matter",
    "Forces", "Waves", "Magnetism & Electromagnetism",
  ]),
]);

export const GCSE_ENG = tree("gcse-eng", [
  unit("ge-lang", "English Language", "Англійська мова", [
    "Explorations in Creative Reading & Writing",
    "Writers' Viewpoints & Perspectives",
    "Spoken Language",
  ]),
]);

export const GCSE_LIT = tree("gcse-lit", [
  unit("gl-lit", "English Literature", "Література", [
    "Shakespeare", "19th-century novel", "Modern texts",
    "Poetry anthology", "Unseen poetry",
  ]),
]);

export const GCSE_BIO = tree("gcse-bio", [
  unit("gb-bio", "Biology", "Біологія", [
    "Cell biology", "Organisation", "Infection and response", "Bioenergetics",
    "Homeostasis and response", "Inheritance, variation and evolution", "Ecology",
  ]),
]);

export const GCSE_CHEM = tree("gcse-chem", [
  unit("gc-chem", "Chemistry", "Хімія", [
    "Atomic structure and the periodic table", "Bonding, structure and the properties of matter",
    "Quantitative chemistry", "Chemical changes", "Energy changes",
    "The rate and extent of chemical change", "Organic chemistry",
    "Chemical analysis", "Chemistry of the atmosphere", "Using resources",
  ]),
]);

export const GCSE_PHYS = tree("gcse-phys", [
  unit("gp-phys", "Physics", "Фізика", [
    "Energy", "Electricity", "Particle model of matter", "Atomic structure",
    "Forces", "Waves", "Magnetism and electromagnetism", "Space physics",
  ]),
]);

export const GCSE_HIST = tree("gcse-hist", [
  unit("gh-hist", "History", "Історія", [
    "Period study", "Thematic study", "British depth study",
    "Wider world depth study", "Historic environment",
  ]),
]);

export const GCSE_GEO = tree("gcse-geo", [
  unit("gg-geo", "Geography", "Географія", [
    "The challenge of natural hazards", "The living world",
    "Physical landscapes in the UK", "Urban issues and challenges",
    "The changing economic world", "The challenge of resource management",
  ]),
]);

export const GCSE_CS = tree("gcse-cs", [
  unit("gcs-cs", "Computer Science", "Інформатика", [
    "Systems architecture", "Memory and storage", "Computer networks",
    "Network security", "Systems software", "Ethical, legal and environmental impacts",
    "Algorithms", "Programming", "Boolean logic", "Data representation",
  ]),
]);

function lang(slug: string, prefix: string) {
  return tree(slug, [
    unit(prefix, "Skills", "Навички", [
      "Listening", "Speaking", "Reading", "Writing", "Grammar and vocabulary",
    ]),
  ]);
}

export const GCSE_FR = lang("gcse-fr", "gfr");
export const GCSE_DE = lang("gcse-de", "gde");
export const GCSE_ES = lang("gcse-es", "ges");

export const GCSE_BUS = tree("gcse-bus", [
  unit("gbu-bus", "Business", "Бізнес", [
    "Business activity", "Influences on business", "Business operations",
    "Human resources", "Marketing", "Finance",
  ]),
]);

export const GCSE_ECON = tree("gcse-econ", [
  unit("gec-econ", "Economics", "Економіка", [
    "How markets work", "How the economy works",
  ]),
]);

export const GCSE_RS = tree("gcse-rs", [
  unit("grs-rs", "Religious Studies", "Релігієзнавство", [
    "Beliefs and teachings", "Practices", "Religion, peace and conflict",
    "Religion and life", "Religion, crime and punishment",
  ]),
]);

export const GCSE_PE = tree("gcse-pe", [
  unit("gpe-pe", "Physical Education", "Фізкультура", [
    "Applied anatomy and physiology", "Movement analysis", "Physical training",
    "Sports psychology", "Socio-cultural influences", "Health, fitness and well-being",
  ]),
]);

export const GCSE_SOC = tree("gcse-soc", [
  unit("gso-soc", "Sociology", "Соціологія", [
    "The sociology of families", "The sociology of education",
    "The sociology of crime and deviance", "Social stratification",
  ]),
]);

export const GCSE_PSY = tree("gcse-psy", [
  unit("gps-psy", "Psychology", "Психологія", [
    "Memory", "Perception", "Development", "Research methods",
    "Social influence", "Language, thought and communication", "The brain and neuropsychology",
  ]),
]);
