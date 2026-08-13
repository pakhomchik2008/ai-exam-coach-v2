// IB Diploma trees. Topic titles from curriculum-data.jsx (IB DP 2019
// subject guides). Extra Diploma options (Psychology, Geography, ESS)
// use public IB topic lists. No bare `ib` key.

import { tree, unit } from "./build-tree";

export const IB_AA = tree("ib-aa", [
  unit("iaa-alg", "Number and algebra", "Число й алгебра", [
    "Number Systems", "Algebra", "Indices and Logarithms", "Sequences and Series",
  ]),
  unit("iaa-fn", "Functions and geometry", "Функції і геометрія", [
    "Function Concepts", "Types of Functions", "Graphs", "Coordinate Geometry",
    "Trigonometry", "Trigonometric Identities", "Triangles", "Vectors",
  ]),
  unit("iaa-calc", "Stats and calculus", "Статистика і числення", [
    "Data", "Statistics", "Probability", "Probability Distributions",
    "Differentiation", "Applications of Derivatives", "Integration", "Differential Equations",
  ]),
]);

export const IB_AI = tree("ib-ai", [
  unit("iai-num", "Number and modelling", "Число й моделі", [
    "Number Systems", "Financial Mathematics", "Algebra", "Sequences and Series",
    "Functions", "Types of Functions", "Graphing", "Technology",
  ]),
  unit("iai-geo", "Geometry and stats", "Геометрія і статистика", [
    "Coordinate Geometry", "Measurement", "Trigonometry", "Vectors (HL)",
    "Data Collection", "Data Presentation", "Descriptive Statistics",
    "Regression", "Statistical Inference (HL)", "Probability", "Probability Distributions",
  ]),
  unit("iai-calc", "Calculus", "Числення", [
    "Differentiation", "Integration", "Differential Equations",
  ]),
]);

export const IB_CS = tree("ib-cs", [
  unit("ics", "Computer Science", "Інформатика", [
    "Computer Systems", "Data Representation", "Operating Systems", "System Software",
    "Networks", "Security", "Logic Gates", "Algorithms", "SQL",
  ]),
]);

export const IB_PHYS = tree("ib-phys", [
  unit("iph-mech", "Mechanics and thermal", "Механіка і тепло", [
    "Kinematics", "Dynamics", "Momentum", "Energy", "Circular Motion",
    "Gravitation", "Thermal Physics", "Ideal Gas Model",
  ]),
  unit("iph-wave", "Waves and fields", "Хвилі і поля", [
    "Wave Fundamentals", "Wave Phenomena", "Sound", "Light",
    "Electric Fields", "Magnetic Fields", "Gravitational Fields",
    "Electric Circuits", "Circuit Analysis", "Capacitance",
  ]),
  unit("iph-nuc", "Atomic and nuclear", "Атом і ядро", [
    "Atomic Structure", "Quantum Physics", "Radioactivity", "Nuclear Reactions",
    "Particle Physics", "Measurements", "Data Analysis", "Experimental Design",
  ]),
]);

export const IB_CHEM = tree("ib-chem", [
  unit("ich", "Chemistry", "Хімія", [
    "The Mole Concept", "Chemical Equations", "Solutions", "Gas Calculations",
    "Subatomic Particles", "Atomic Models", "Electron Configuration", "Periodic Trends",
    "Intermolecular Forces", "Enthalpy Changes", "Hydrocarbons", "Functional Groups",
    "Reaction Types", "Isomerism",
  ]),
]);

export const IB_BIO = tree("ib-bio", [
  unit("ibi", "Biology", "Біологія", [
    "Cell Theory", "Cell Structure", "Membrane Structure", "Membrane Transport",
    "Cell Division", "Water", "Biological Molecules", "Enzymes",
    "DNA", "RNA", "Protein Synthesis", "Cellular Respiration",
    "Photosynthesis", "Inheritance",
  ]),
]);

export const IB_ECON = tree("ib-econ", [
  unit("iec-micro", "Microeconomics", "Мікроекономіка", [
    "The Nature of Economics", "Demand and Supply", "Elasticities",
    "Consumer Theory", "Producer Theory", "Market Structures",
    "Business Objectives", "Market Failure", "Government Intervention",
  ]),
  unit("iec-macro", "Macro and global", "Макро і світ", [
    "National Income", "Business Cycle", "Inflation", "Unemployment",
    "Fiscal Policy", "Monetary Policy", "International Trade",
    "Exchange Rates", "Economic Integration", "Development Economics",
  ]),
]);

export const IB_BUS = tree("ib-bus", [
  unit("ibu", "Business Management", "Бізнес", [
    "Business Activity", "Types of Organizations", "Business Objectives",
    "Stakeholders", "External Environment", "Leadership", "Motivation",
    "Organizational Structure", "Communication", "Sources of Finance",
    "Financial Statements", "Ratio Analysis", "Investment Appraisal",
    "Market Research", "Marketing Mix (4Ps)", "Production Methods", "Quality Management",
  ]),
]);

export const IB_ENG = tree("ib-eng", [
  unit("ien", "English A", "English A", [
    "Understanding Texts", "Language and Identity", "Language Choices", "Text Types",
    "Poetry", "Drama", "Prose Fiction", "Non-Fiction",
  ]),
]);

export const IB_HIST = tree("ib-hist", [
  unit("ihi-skill", "Skills", "Навички", [
    "Historical Inquiry", "Source Analysis", "Historiography",
  ]),
  unit("ihi-world", "Prescribed and world", "Світ", [
    "Military Leaders", "Rights and Protest", "Conflict and Intervention",
    "Move to Global War", "Rise to Power",
  ]),
  unit("ihi-reg", "Regional", "Регіони", [
    "History of Europe", "History of the Americas",
    "History of Asia and Oceania", "History of Africa and the Middle East",
  ]),
]);

export const IB_PSY = tree("ib-psy", [
  unit("ipsy", "Psychology", "Психологія", [
    "Biological approach", "Cognitive approach", "Sociocultural approach",
    "Research methods", "Abnormal psychology", "Health psychology",
    "Developmental psychology", "Human relationships",
  ]),
]);

export const IB_GEO = tree("ib-geo", [
  unit("igeo", "Geography", "Географія", [
    "Population", "Climate change", "Resource consumption",
    "Geophysical hazards", "Freshwater", "Oceans and coastal margins",
    "Extreme environments", "Urban environments", "Food and health",
    "Global climate — vulnerability and resilience",
  ]),
]);

export const IB_ESS = tree("ib-ess", [
  unit("iess", "Environmental Systems", "ESS", [
    "Foundations of environmental systems and societies",
    "Ecosystems and ecology", "Biodiversity and conservation",
    "Water, aquatic food production and societies",
    "Soil systems and terrestrial food production",
    "Atmospheric systems and societies", "Climate change and energy production",
    "Human systems and resource use",
  ]),
]);
