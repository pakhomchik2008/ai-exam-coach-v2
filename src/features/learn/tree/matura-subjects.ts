// Matura (Poland, CKE, nowa matura). Topic titles from curriculum-data.jsx.
// Foreign-language papers other than English share the CKE skill tree.

import { tree, unit } from "./build-tree";

export const MATURA_PL = tree("matura-pl", [
  unit("mpl", "Polish Language", "Польська мова", [
    "Reading Comprehension", "Literature", "Literary Analysis",
    "Language", "Writing",
  ]),
]);

export const MATURA_MATH = tree("matura-math", [
  unit("mma", "Mathematics", "Математика", [
    "Numbers", "Algebra", "Functions", "Sequences", "Calculus",
    "Geometry", "Solid Geometry",
  ]),
]);

export const MATURA_ENG = tree("matura-eng", [
  unit("men", "English", "Англійська", [
    "Reading Comprehension", "Listening Comprehension", "Language in Use",
    "Writing", "Topic/Theme Areas",
  ]),
]);

export const MATURA_BIO = tree("matura-bio", [
  unit("mbi", "Biology", "Біологія", [
    "Cell Biology", "Biochemistry", "Genetics", "Evolution", "Ecology",
    "Plant Biology", "Animal Biology", "Human Physiology", "Microbiology",
    "Biotechnology", "Experimental Skills",
  ]),
]);

export const MATURA_CHEM = tree("matura-chem", [
  unit("mch", "Chemistry", "Хімія", [
    "Atomic Structure", "Periodic Table", "Chemical Bonding", "Stoichiometry",
    "Solutions", "Thermochemistry", "Reaction Rates", "Chemical Equilibrium",
    "Acids and Bases", "Redox", "Organic Chemistry", "Analytical Chemistry",
  ]),
]);

export const MATURA_PHYS = tree("matura-phys", [
  unit("mph", "Physics", "Фізика", [
    "Mechanics", "Thermodynamics", "Electricity", "Magnetism",
    "Oscillations", "Waves", "Optics", "Atomic Physics",
    "Nuclear Physics", "Modern Physics",
  ]),
]);

export const MATURA_CS = tree("matura-cs", [
  unit("mcs", "Informatyka", "Інформатика", [
    "Algorithms", "Programming", "Data Structures", "Databases",
    "Computer Systems", "Operating Systems", "Computer Networks",
    "Cybersecurity", "Logic", "Binary Representation", "Data Analysis", "Spreadsheets",
  ]),
]);

export const MATURA_GEO = tree("matura-geo", [
  unit("mge", "Geography", "Географія", [
    "Physical Geography", "Human Geography", "Economic Geography",
    "Population", "Climate", "Geomorphology", "Hydrology",
    "Agriculture", "Industry", "Globalization", "Maps", "GIS",
  ]),
]);

export const MATURA_HIST = tree("matura-hist", [
  unit("mhi", "History", "Історія", [
    "Ancient History", "Middle Ages", "Early Modern Europe",
    "Partitions of Poland", "World War I", "Interwar Period",
    "World War II", "Cold War", "Modern Poland", "Historical Source Analysis",
  ]),
]);

export const MATURA_WOS = tree("matura-wos", [
  unit("mwo", "WOS", "Суспільствознавство", [
    "Constitution", "Law", "Government", "Democracy", "Human Rights",
    "European Union", "International Organizations", "Economics",
    "Politics", "Citizenship",
  ]),
]);

export const MATURA_ECON = tree("matura-econ", [
  unit("mec", "Economics", "Економіка", [
    "Microeconomics", "Macroeconomics", "Business", "Public Finance",
    "International Trade", "Banking", "Labour Market", "Entrepreneurship",
  ]),
]);

export const MATURA_LANG = tree("matura-lang", [
  unit("mfl", "Foreign language", "Іноземна мова", [
    "Reading Comprehension", "Listening Comprehension", "Writing",
    "Grammar", "Vocabulary",
  ]),
]);
