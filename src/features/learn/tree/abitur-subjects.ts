// Abitur (Germany, KMK Bildungsstandards). Topic titles from
// curriculum-data.jsx. Länder differ — this is the shared core.

import { tree, unit } from "./build-tree";

export const ABITUR_DE = tree("abitur-de", [
  unit("adeu", "Deutsch", "Німецька", [
    "Reading Comprehension", "Literature", "Language",
    "Literary Analysis", "Writing",
  ]),
]);

export const ABITUR_MATH = tree("abitur-math", [
  unit("ama", "Mathematik", "Математика", [
    "Functions", "Calculus", "Analytic Geometry",
  ]),
]);

export const ABITUR_ENG = tree("abitur-eng", [
  unit("aen", "English", "Англійська", [
    "Reading", "Listening", "Writing", "Grammar", "Vocabulary",
    "Communication", "Literature", "Media Analysis", "Global Issues",
    "Culture", "Science and Technology",
  ]),
]);

export const ABITUR_BIO = tree("abitur-bio", [
  unit("abi", "Biology", "Біологія", [
    "Cell Biology", "Biochemistry", "Genetics", "Evolution", "Ecology",
    "Human Physiology", "Neurobiology", "Immunology", "Biotechnology",
  ]),
]);

export const ABITUR_CHEM = tree("abitur-chem", [
  unit("ach", "Chemistry", "Хімія", [
    "Atomic Structure", "Chemical Bonding", "Stoichiometry", "Thermodynamics",
    "Kinetics", "Equilibrium", "Acids and Bases", "Redox",
    "Organic Chemistry", "Analytical Chemistry",
  ]),
]);

export const ABITUR_PHYS = tree("abitur-phys", [
  unit("aph", "Physics", "Фізика", [
    "Mechanics", "Electricity", "Magnetism", "Oscillations", "Waves",
    "Optics", "Thermodynamics", "Quantum Physics", "Nuclear Physics",
  ]),
]);

export const ABITUR_CS = tree("abitur-cs", [
  unit("acs", "Informatik", "Інформатика", [
    "Algorithms", "Programming", "Data Structures", "Databases",
    "Computer Architecture", "Operating Systems", "Networks",
    "Cybersecurity", "Artificial Intelligence", "Software Engineering",
    "Logic", "Binary Systems",
  ]),
]);

export const ABITUR_HIST = tree("abitur-hist", [
  unit("ahi", "History", "Історія", [
    "Ancient History", "Middle Ages", "Early Modern Europe",
    "German Empire", "World War I", "Weimar Republic",
    "National Socialism", "World War II", "Cold War",
    "German Division", "German Reunification", "European Integration",
    "Historical Source Analysis",
  ]),
]);

export const ABITUR_GEO = tree("abitur-geo", [
  unit("age", "Geography", "Географія", [
    "Physical Geography", "Climate", "Geomorphology", "Population",
    "Urbanization", "Globalization", "Economic Geography",
    "Sustainability", "Development", "GIS",
  ]),
]);

export const ABITUR_POL = tree("abitur-pol", [
  unit("apo", "Politics / Economics", "Політика / економіка", [
    "Market Economy", "Microeconomics", "Macroeconomics", "Government",
    "Democracy", "European Union", "Globalization", "International Relations",
    "Law", "Public Finance", "Labour Market", "Sustainability",
  ]),
]);

export const ABITUR_MUSIC = tree("abitur-music", [
  unit("amu", "Musik", "Музика", [
    "Musiktheorie - Grundlagen", "Gehörbildung", "Formenlehre", "Harmonielehre",
    "Musikgeschichte - Antike bis Renaissance", "Musikgeschichte - Barock",
    "Musikgeschichte - Klassik", "Musikgeschichte - Romantik",
    "Musikgeschichte - Moderne und Gegenwart", "Kompositionslehre",
    "Musikästhetik und Interpretation", "Musikalische Gattungen",
  ]),
]);

export const ABITUR_LANG = tree("abitur-lang", [
  unit("afl", "Foreign language", "Іноземна мова", [
    "Reading Comprehension", "Listening Comprehension", "Writing",
    "Grammar", "Vocabulary", "Literature", "Cultural Studies",
  ]),
]);
