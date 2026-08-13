// AP subject trees. Seeded courses use College Board CED unit titles from
// curriculum-data.jsx (specVersion 2024-25). Extra popular APs use public
// CED unit names so Learn is not empty for those presets.

import { tree, unit } from "./build-tree";

export const AP_CALC_AB = tree("ap-calc-ab", [
  unit("acab", "Calculus AB", "Calculus AB", [
    "Limits and Continuity",
    "Differentiation: Definition and Fundamental Properties",
    "Composite, Implicit and Inverse Functions",
    "Contextual Applications of Differentiation",
    "Analytical Applications of Differentiation",
    "Integration and Accumulation of Change",
    "Differential Equations",
    "Applications of Integration",
  ]),
]);

export const AP_CALC_BC = tree("ap-calc-bc", [
  unit("acbc-core", "Core calculus", "Ядро", [
    "Limits and Continuity", "Differentiation", "Applications of Differentiation",
    "Integration", "Applications of Integration", "Differential Equations",
  ]),
  unit("acbc-bc", "BC only", "Лише BC", [
    "Parametric Equations", "Polar Functions", "Vector Functions",
    "Sequences", "Series", "Convergence Tests", "Power Series",
    "Taylor and Maclaurin Series",
  ]),
]);

export const AP_CSA = tree("ap-csa", [
  unit("acsa", "Computer Science A", "CS A", [
    "Using Objects", "Selection", "Iteration", "Randomness", "Class Design",
    "Encapsulation", "Static Members", "Arrays", "Array Algorithms", "ArrayList",
    "Object-Oriented Programming", "Method Design", "Searching", "Sorting",
  ]),
]);

export const AP_PHYS1 = tree("ap-phys1", [
  unit("ap1", "Physics 1", "Фізика 1", [
    "Motion", "Motion Graphs", "Projectile Motion", "Forces", "Potential Energy",
  ]),
]);

export const AP_CHEM = tree("ap-chem", [
  unit("achm", "Chemistry", "Хімія", [
    "Structure of the Atom", "Electron Configuration", "Periodic Trends",
    "Chemical Bonds", "Intermolecular Forces", "Properties of Solids",
    "Gas Laws", "Types of Reactions",
  ]),
]);

export const AP_HUG = tree("ap-hug", [
  unit("ahug", "Human Geography", "Географія людини", [
    "Thinking Geographically",
    "Population and Migration Patterns and Processes",
    "Cultural Patterns and Processes",
    "Political Patterns and Processes",
    "Agriculture and Rural Land-Use Patterns and Processes",
    "Cities and Urban Land-Use Patterns and Processes",
    "Industrialization and Economic Development Patterns and Processes",
    "Resource Management and Environmental Change",
  ]),
]);

export const AP_STAT = tree("ap-stat", [
  unit("astat", "Statistics", "Статистика", [
    "Exploring One-Variable Data", "Exploring Two-Variable Data",
    "Collecting Data", "Probability, Random Variables, and Probability Distributions",
    "Sampling Distributions", "Inference for Categorical Data: Proportions",
    "Inference for Quantitative Data: Means", "Inference for Categorical Data: Chi-Square",
    "Inference for Quantitative Data: Slopes",
  ]),
]);

export const AP_BIO = tree("ap-bio", [
  unit("abio", "Biology", "Біологія", [
    "Chemistry of Life", "Cell Structure and Function", "Cellular Energetics",
    "Cell Communication and Cell Cycle", "Heredity", "Gene Expression and Regulation",
    "Natural Selection", "Ecology",
  ]),
]);

export const AP_PHYS_C = tree("ap-phys-c", [
  unit("apc", "Physics C: Mechanics", "Механіка", [
    "Kinematics", "Newton's Laws of Motion", "Work, Energy, and Power",
    "Systems of Particles and Linear Momentum", "Rotation",
    "Oscillations", "Gravitation",
  ]),
]);

export const AP_ENV = tree("ap-env", [
  unit("aenv", "Environmental Science", "Екологія", [
    "The Living World: Ecosystems", "The Living World: Biodiversity",
    "Populations", "Earth Systems and Resources", "Land and Water Use",
    "Energy Resources and Consumption", "Atmospheric Pollution",
    "Aquatic and Terrestrial Pollution", "Global Change",
  ]),
]);

export const AP_USH = tree("ap-ush", [
  unit("aush", "US History", "Історія США", [
    "Period 1: 1491–1607", "Period 2: 1607–1754", "Period 3: 1754–1800",
    "Period 4: 1800–1848", "Period 5: 1844–1877", "Period 6: 1865–1898",
    "Period 7: 1890–1945", "Period 8: 1945–1980", "Period 9: 1980–Present",
  ]),
]);

export const AP_WH = tree("ap-wh", [
  unit("awh", "World History", "Всесвітня історія", [
    "The Global Tapestry", "Networks of Exchange", "Land-Based Empires",
    "Transoceanic Interconnections", "Revolutions", "Consequences of Industrialization",
    "Global Conflict", "Cold War and Decolonization", "Globalization",
  ]),
]);

export const AP_EUH = tree("ap-euh", [
  unit("aeuh", "European History", "Історія Європи", [
    "Renaissance and Exploration", "Age of Reformation",
    "Absolutism and Constitutionalism", "Scientific, Philosophical, and Political Developments",
    "Conflict, Crisis, and Reaction in the Late 18th Century",
    "Industrialization and Its Effects", "19th-Century Perspectives and Political Developments",
    "20th-Century Global Conflicts", "Cold War and Contemporary Europe",
  ]),
]);

export const AP_LANG = tree("ap-lang", [
  unit("alang", "English Language", "English Language", [
    "Rhetorical Situation", "Claims and Evidence", "Reasoning and Organization",
    "Style", "Argument", "Synthesis", "Rhetorical analysis",
  ]),
]);

export const AP_LIT = tree("ap-lit", [
  unit("alit", "English Literature", "English Literature", [
    "Short Fiction", "Poetry", "Longer Fiction and Drama",
    "Character", "Setting", "Structure", "Narration", "Figurative Language", "Literary Argumentation",
  ]),
]);

export const AP_PSY = tree("ap-psy", [
  unit("apsy", "Psychology", "Психологія", [
    "Biological Bases of Behavior", "Cognition", "Development and Learning",
    "Social Psychology and Personality", "Mental and Physical Health",
  ]),
]);

export const AP_MICRO = tree("ap-micro", [
  unit("amic", "Microeconomics", "Мікроекономіка", [
    "Basic Economic Concepts", "Supply and Demand", "Production, Cost, and the Perfect Competition Model",
    "Imperfect Competition", "Factor Markets", "Market Failure and the Role of Government",
  ]),
]);

export const AP_MACRO = tree("ap-macro", [
  unit("amac", "Macroeconomics", "Макроекономіка", [
    "Basic Economic Concepts", "Economic Indicators and the Business Cycle",
    "National Income and Price Determination", "Financial Sector",
    "Long-Run Consequences of Stabilization Policies", "Open Economy—International Trade and Finance",
  ]),
]);

export const AP_GOV = tree("ap-gov", [
  unit("agov", "US Government", "Уряд США", [
    "Foundations of American Democracy", "Interactions Among Branches of Government",
    "Civil Liberties and Civil Rights", "American Political Ideologies and Beliefs",
    "Political Participation",
  ]),
]);

export const AP_CSP = tree("ap-csp", [
  unit("acsp", "Computer Science Principles", "CSP", [
    "Creative Development", "Data", "Algorithms and Programming",
    "Computer Systems and Networks", "Impact of Computing",
  ]),
]);

function apLang(slug: string, prefix: string) {
  return tree(slug, [
    unit(prefix, "Skills", "Навички", [
      "Interpretive communication", "Interpersonal writing", "Presentational writing",
      "Interpersonal speaking", "Presentational speaking",
    ]),
  ]);
}

export const AP_FR = apLang("ap-fr", "afr");
export const AP_ES = apLang("ap-es", "aes");
