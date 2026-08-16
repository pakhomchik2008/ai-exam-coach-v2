// Examik — Learn trees for NMT subjects other than Mathematics.
//
// Math already has a hand-authored 47-node tree (`nmt-math.ts`, taxonomy
// `nmt`) — do not replace it, or existing mastery keys reset. Every other
// NMT subject used to silently open that math tree.
//
// Topics below are the official 2026 programme headings from
// `curriculum-data.jsx` (testportal.gov.ua / UCEQA), grouped into units so
// Teach → Drill → Prove has a sane node count. AI-drafted grouping —
// Hlib edits titles/order later; node ids stay stable (Decision Log #42).

import type { LearnNode, LearnTree } from "./schema";

function node(
  id: string,
  en: string,
  uk: string,
  complexity: 1 | 2 | 3 | 4 | 5,
  estimatedMinutes: number,
  prerequisites: readonly string[] = [],
  paper?: "de" | "fr" | "es",
): LearnNode {
  return {
    id,
    title: {
      en,
      uk,
      ru: uk,
      ...(paper === "de" ? { de: uk } : {}),
      ...(paper === "fr" ? { fr: uk } : {}),
      ...(paper === "es" ? { es: uk } : {}),
    },
    complexity,
    estimatedMinutes,
    prerequisites,
  };
}

export const NMT_UKR: LearnTree = {
  examTaxonomy: "nmt-ukr",
  units: [
    {
      id: "uk-sound",
      title: { en: "Sounds and spelling", uk: "Звуки і правопис" },
      nodes: [
        node("uk-01", "Phonetics", "Фонетика", 2, 8),
        node("uk-02", "Graphics", "Графіка", 2, 7, ["uk-01"]),
        node("uk-03", "Orthoepy", "Орфоепія", 3, 8, ["uk-01"]),
        node("uk-04", "Orthography", "Орфографія", 4, 12, ["uk-02"]),
      ],
    },
    {
      id: "uk-word",
      title: { en: "Word and meaning", uk: "Слово і значення" },
      nodes: [
        node("uk-05", "Lexicology", "Лексикологія", 3, 10),
        node("uk-06", "Phraseology", "Фразеологія", 3, 8, ["uk-05"]),
        node("uk-07", "Word structure", "Будова слова", 3, 9),
        node("uk-08", "Word formation", "Словотвір", 3, 9, ["uk-07"]),
        node("uk-09", "Morphology", "Морфологія", 4, 14, ["uk-07"]),
      ],
    },
    {
      id: "uk-sent",
      title: { en: "Sentence and text", uk: "Речення і текст" },
      nodes: [
        node("uk-10", "Syntax", "Синтаксис", 4, 13, ["uk-09"]),
        node("uk-11", "Punctuation", "Пунктуація", 4, 12, ["uk-10"]),
        node("uk-12", "Stylistics", "Стилістика", 3, 9, ["uk-05"]),
        node("uk-13", "Speech development", "Розвиток мовлення", 3, 10, ["uk-10"]),
      ],
    },
  ],
};

export const NMT_HIST: LearnTree = {
  examTaxonomy: "nmt-hist",
  units: [
    {
      id: "hi-early",
      title: { en: "From antiquity to Cossacks", uk: "Від давнини до козацтва" },
      nodes: [
        node("hi-01", "Introduction to Ukrainian history", "Вступ до історії України", 1, 6),
        node("hi-02", "Ancient history of Ukraine", "Стародавня історія України", 2, 9, ["hi-01"]),
        node("hi-03", "Rus-Ukraine (Kyivan state)", "Русь-Україна (Київська держава)", 3, 12, ["hi-02"]),
        node("hi-04", "Galicia-Volhynia", "Галицько-Волинська держава", 3, 9, ["hi-03"]),
        node("hi-05", "Ukrainian lands in foreign states (14th–16th c.)", "Українські землі у складі іноземних держав (XIV–XVI ст.)", 3, 10, ["hi-04"]),
        node("hi-06", "Ukrainian Cossacks", "Українське козацтво", 3, 10, ["hi-05"]),
      ],
    },
    {
      id: "hi-het",
      title: { en: "Hetmanate to empires", uk: "Гетьманщина і імперії" },
      nodes: [
        node("hi-07", "National liberation war, mid-17th c.", "Національно-визвольна війна середини XVII ст.", 4, 12, ["hi-06"]),
        node("hi-08", "Hetmanate. The Ruin", "Гетьманщина. Руїна", 4, 11, ["hi-07"]),
        node("hi-09", "Ukrainian lands in the Russian and Austrian empires", "Українські землі у складі Російської та Австрійської імперій", 3, 10, ["hi-08"]),
        node("hi-10", "Ukrainian lands in the second half of the 19th c.", "Українські землі у другій половині XIX ст.", 3, 10, ["hi-09"]),
        node("hi-11", "Ukraine at the start of the 20th c.", "Україна на початку XX ст.", 3, 9, ["hi-10"]),
      ],
    },
    {
      id: "hi-mod",
      title: { en: "Revolution to today", uk: "Від революції до сьогодні" },
      nodes: [
        node("hi-12", "Ukrainian revolution 1917–1921", "Українська революція 1917–1921 років", 4, 12, ["hi-11"]),
        node("hi-13", "Ukraine in the USSR (1921–1939)", "Україна у складі СРСР (1921–1939)", 4, 12, ["hi-12"]),
        node("hi-14", "The Second World War", "Друга світова війна", 4, 11, ["hi-13"]),
        node("hi-15", "Ukraine after the war (1945–1991)", "Україна у повоєнний період (1945–1991)", 3, 10, ["hi-14"]),
        node("hi-16", "Restoration of independence", "Відновлення незалежності України", 3, 9, ["hi-15"]),
        node("hi-17", "Modern Ukraine", "Становлення сучасної України", 4, 10, ["hi-16"]),
        node("hi-18", "Historical terms and figures", "Історичні поняття та персоналії", 3, 10, ["hi-01"]),
      ],
    },
  ],
};

export const NMT_BIO: LearnTree = {
  examTaxonomy: "nmt-bio",
  units: [
    {
      id: "bi-cell",
      title: { en: "Cell and molecules", uk: "Клітина і молекули" },
      nodes: [
        node("bi-01", "Introduction to biology", "Вступ до біології", 1, 6),
        node("bi-02", "Chemical composition of the cell", "Хімічний склад клітини", 3, 10, ["bi-01"]),
        node("bi-03", "The cell", "Клітина", 3, 11, ["bi-02"]),
        node("bi-04", "Metabolism", "Обмін речовин", 4, 12, ["bi-03"]),
        node("bi-05", "Cell reproduction", "Розмноження клітин", 3, 9, ["bi-03"]),
        node("bi-06", "Molecular biology", "Молекулярна біологія", 4, 12, ["bi-02"]),
      ],
    },
    {
      id: "bi-life",
      title: { en: "Genetics and diversity", uk: "Генетика і різноманіття" },
      nodes: [
        node("bi-07", "Genetics", "Генетика", 4, 13, ["bi-06"]),
        node("bi-08", "Evolution", "Еволюція", 3, 10, ["bi-07"]),
        node("bi-09", "Biodiversity", "Біорізноманіття", 2, 8, ["bi-01"]),
        node("bi-10", "Bacteria and viruses", "Бактерії та віруси", 3, 9, ["bi-09"]),
        node("bi-11", "Fungi", "Гриби", 2, 7, ["bi-09"]),
        node("bi-12", "Plants", "Рослини", 3, 11, ["bi-09"]),
        node("bi-13", "Animals", "Тварини", 3, 11, ["bi-09"]),
      ],
    },
    {
      id: "bi-hum",
      title: { en: "Human and ecology", uk: "Людина і екологія" },
      nodes: [
        node("bi-14", "The human body", "Організм людини", 4, 14, ["bi-03"]),
        node("bi-15", "Ecology", "Екологія", 3, 10, ["bi-08"]),
      ],
    },
  ],
};

export const NMT_CHEM: LearnTree = {
  examTaxonomy: "nmt-chem",
  units: [
    {
      id: "ch-base",
      title: { en: "Foundations", uk: "Основи" },
      nodes: [
        node("ch-01", "Basic chemistry concepts", "Основні поняття хімії", 2, 8),
        node("ch-02", "Atomic structure", "Будова атома", 3, 10, ["ch-01"]),
        node("ch-03", "Chemical bonding", "Хімічний зв'язок", 3, 10, ["ch-02"]),
        node("ch-04", "Chemical reactions", "Хімічні реакції", 3, 10, ["ch-01"]),
      ],
    },
    {
      id: "ch-inorg",
      title: { en: "Inorganic", uk: "Неорганіка" },
      nodes: [
        node("ch-05", "Inorganic compounds", "Неорганічні сполуки", 3, 11, ["ch-04"]),
        node("ch-06", "Solutions", "Розчини", 3, 10, ["ch-05"]),
        node("ch-07", "Redox reactions", "Окисно-відновні реакції", 4, 11, ["ch-04"]),
        node("ch-08", "Non-metals", "Неметали", 3, 10, ["ch-05"]),
        node("ch-09", "Metals", "Метали", 3, 10, ["ch-05"]),
      ],
    },
    {
      id: "ch-org",
      title: { en: "Organic and life", uk: "Органіка і життя" },
      nodes: [
        node("ch-10", "Organic chemistry", "Органічна хімія", 4, 14, ["ch-03"]),
        node("ch-11", "Biologically important substances", "Біологічно важливі речовини", 3, 9, ["ch-10"]),
        node("ch-12", "Chemistry and life", "Хімія і життя", 2, 8, ["ch-01"]),
      ],
    },
  ],
};

export const NMT_PHYS: LearnTree = {
  examTaxonomy: "nmt-phys",
  units: [
    {
      id: "ph-mech",
      title: { en: "Mechanics and heat", uk: "Механіка і теплота" },
      nodes: [
        node("ph-01", "Mechanics", "Механіка", 3, 14),
        node("ph-02", "Molecular physics", "Молекулярна фізика", 3, 11, ["ph-01"]),
        node("ph-03", "Thermodynamics", "Термодинаміка", 4, 10, ["ph-02"]),
      ],
    },
    {
      id: "ph-em",
      title: { en: "Electricity and waves", uk: "Електрика і хвилі" },
      nodes: [
        node("ph-04", "Electrodynamics", "Електродинаміка", 4, 13, ["ph-01"]),
        node("ph-05", "Magnetic field", "Магнітне поле", 4, 10, ["ph-04"]),
        node("ph-06", "Electromagnetic induction", "Електромагнітна індукція", 4, 10, ["ph-05"]),
        node("ph-07", "Oscillations and waves", "Коливання і хвилі", 4, 12, ["ph-06"]),
        node("ph-08", "Optics", "Оптика", 3, 11, ["ph-07"]),
      ],
    },
    {
      id: "ph-mod",
      title: { en: "Modern physics", uk: "Сучасна фізика" },
      nodes: [
        node("ph-09", "Quantum physics", "Квантова фізика", 4, 11, ["ph-08"]),
        node("ph-10", "Atomic physics", "Атомна фізика", 4, 10, ["ph-09"]),
        node("ph-11", "Nuclear physics", "Ядерна фізика", 4, 11, ["ph-10"]),
        node("ph-12", "Astronomy elements", "Астрономічні елементи", 2, 8, ["ph-01"]),
      ],
    },
  ],
};

export const NMT_GEO: LearnTree = {
  examTaxonomy: "nmt-geo",
  units: [
    {
      id: "ge-earth",
      title: { en: "The planet", uk: "Планета" },
      nodes: [
        node("geo-01", "General geography", "Загальна географія", 2, 8),
        node("geo-02", "Earth as a planet", "Земля як планета", 2, 8, ["geo-01"]),
        node("geo-03", "Lithosphere", "Літосфера", 3, 10, ["geo-02"]),
        node("geo-04", "Atmosphere", "Атмосфера", 3, 10, ["geo-02"]),
        node("geo-05", "Hydrosphere", "Гідросфера", 3, 9, ["geo-02"]),
        node("geo-06", "Biosphere", "Біосфера", 3, 8, ["geo-03"]),
        node("geo-07", "Geographic envelope", "Географічна оболонка", 3, 8, ["geo-06"]),
        node("geo-08", "Continents and oceans", "Географія материків і океанів", 3, 11, ["geo-07"]),
      ],
    },
    {
      id: "ge-ua",
      title: { en: "Ukraine and the world", uk: "Україна і світ" },
      nodes: [
        node("geo-09", "Geography of Ukraine", "Географія України", 4, 13, ["geo-08"]),
        node("geo-10", "Population of Ukraine", "Населення України", 3, 9, ["geo-09"]),
        node("geo-11", "Economy of Ukraine", "Господарство України", 3, 11, ["geo-09"]),
        node("geo-12", "Regions of Ukraine", "Регіони України", 3, 9, ["geo-11"]),
        node("geo-13", "World economy", "Світове господарство", 3, 9, ["geo-11"]),
        node("geo-14", "World population", "Населення світу", 3, 8, ["geo-10"]),
        node("geo-15", "Global problems", "Глобальні проблеми людства", 3, 9, ["geo-07"]),
      ],
    },
  ],
};

export const NMT_ENG: LearnTree = {
  examTaxonomy: "nmt-eng",
  units: [
    {
      id: "en-use",
      title: { en: "Use of English", uk: "Мова" },
      nodes: [
        node("en-01", "Reading", "Reading (Читання)", 3, 11),
        node("en-02", "Vocabulary", "Vocabulary (Лексика)", 3, 12),
        node("en-03", "Grammar", "Grammar (Граматика)", 4, 14),
        node("en-04", "Word formation", "Word Formation", 3, 9, ["en-03"]),
      ],
    },
    {
      id: "en-exam",
      title: { en: "Exam skills", uk: "Екзамен" },
      nodes: [
        node("en-05", "Communication skills", "Communication Skills", 3, 9, ["en-02"]),
        node("en-06", "Text types", "Text Types", 3, 8, ["en-01"]),
        node("en-07", "Exam skills", "Exam Skills", 3, 10, ["en-01", "en-03"]),
      ],
    },
  ],
};

export const NMT_LIT: LearnTree = {
  examTaxonomy: "nmt-lit",
  units: [
    {
      id: "lt-old",
      title: { en: "Folk and early literature", uk: "Народна і давня література" },
      nodes: [
        node("lt-01", "Oral folk tradition", "Усна народна творчість", 2, 9),
        node("lt-02", "Old Ukrainian literature", "Давня українська література", 3, 9, ["lt-01"]),
        node("lt-03", "Hryhorii Skovoroda", "Григорій Сковорода", 3, 8, ["lt-02"]),
        node("lt-04", "Ivan Kotliarevsky", "Іван Котляревський", 3, 8, ["lt-03"]),
        node("lt-05", "Hryhorii Kvitka-Osnovianenko", "Григорій Квітка-Основ'яненко", 2, 7, ["lt-04"]),
      ],
    },
    {
      id: "lt-19",
      title: { en: "19th century", uk: "XIX століття" },
      nodes: [
        node("lt-06", "Taras Shevchenko", "Тарас Шевченко", 4, 12, ["lt-04"]),
        node("lt-07", "Panteleimon Kulish", "Пантелеймон Куліш", 3, 8, ["lt-06"]),
        node("lt-08", "Marko Vovchok", "Марко Вовчок", 2, 7, ["lt-06"]),
        node("lt-09", "Ivan Nechui-Levytsky", "Іван Нечуй-Левицький", 3, 8, ["lt-08"]),
        node("lt-10", "Panas Myrny", "Панас Мирний", 3, 8, ["lt-09"]),
        node("lt-11", "Ivan Karpenko-Karyi", "Іван Карпенко-Карий", 3, 8, ["lt-09"]),
        node("lt-12", "Ivan Franko", "Іван Франко", 4, 11, ["lt-06"]),
      ],
    },
    {
      id: "lt-20",
      title: { en: "20th century to now", uk: "XX століття і сучасність" },
      nodes: [
        node("lt-13", "Mykhailo Kotsiubynsky", "Михайло Коцюбинський", 3, 9, ["lt-12"]),
        node("lt-14", "Olha Kobylianska", "Ольга Кобилянська", 3, 8, ["lt-13"]),
        node("lt-15", "Vasyl Stefanyk", "Василь Стефаник", 3, 8, ["lt-13"]),
        node("lt-16", "Lesia Ukrainka", "Леся Українка", 4, 11, ["lt-12"]),
        node("lt-17", "Volodymyr Vynnychenko", "Володимир Винниченко", 3, 8, ["lt-16"]),
        node("lt-18", "Executed Renaissance", "Розстріляне відродження (Хвильовий, Підмогильний, Куліш)", 4, 12, ["lt-17"]),
        node("lt-19", "Dovzhenko, Honchar, Tiutiunnyk", "Довженко, Гончар, Тютюнник", 3, 10, ["lt-18"]),
        node("lt-20", "Sixtiers and Stus", "Шістдесятники і Стус", 4, 11, ["lt-19"]),
        node("lt-21", "Lina Kostenko and contemporaries", "Ліна Костенко і сучасна література", 3, 10, ["lt-20"]),
        node("lt-22", "Theory, movements, genres", "Теорія літератури, напрями, жанри", 3, 12),
      ],
    },
  ],
};

function langTree(taxonomy: string, reading: string, vocab: string, grammar: string): LearnTree {
  const p = taxonomy.replace("nmt-", "");
  const paper = taxonomy === "nmt-de" ? "de" as const : taxonomy === "nmt-fr" ? "fr" as const : "es" as const;
  const unitLang = paper === "de"
    ? { en: "Language", uk: "Мова", de: "Sprache" }
    : paper === "fr"
      ? { en: "Language", uk: "Мова", fr: "Langue" }
      : { en: "Language", uk: "Мова", es: "Idioma" };
  const examLang = paper === "de"
    ? { en: "Exam skills", uk: "Екзамен", de: "Prüfung" }
    : paper === "fr"
      ? { en: "Exam skills", uk: "Екзамен", fr: "Examen" }
      : { en: "Exam skills", uk: "Екзамен", es: "Examen" };
  return {
    examTaxonomy: taxonomy,
    units: [
      {
        id: `${p}-use`,
        title: unitLang,
        nodes: [
          node(`${p}-01`, "Reading", reading, 3, 11, [], paper),
          node(`${p}-02`, "Vocabulary", vocab, 3, 11, [], paper),
          node(`${p}-03`, "Grammar", grammar, 4, 13, [], paper),
          node(`${p}-04`, "Word formation", paper === "de" ? "Wortbildung" : paper === "fr" ? "Formation des mots" : "Formación de palabras", 3, 8, [`${p}-03`], paper),
        ],
      },
      {
        id: `${p}-exam`,
        title: examLang,
        nodes: [
          node(`${p}-05`, "Communication", paper === "de" ? "Kommunikation" : paper === "fr" ? "Communication" : "Comunicación", 3, 9, [`${p}-02`], paper),
          node(`${p}-06`, "Text types", paper === "de" ? "Textsorten" : paper === "fr" ? "Types de textes" : "Tipos de texto", 3, 8, [`${p}-01`], paper),
          node(`${p}-07`, "Exam tasks", paper === "de" ? "Prüfungsaufgaben" : paper === "fr" ? "Tâches d'examen" : "Tareas de examen", 3, 10, [`${p}-01`, `${p}-03`], paper),
        ],
      },
    ],
  };
}

export const NMT_DE = langTree("nmt-de", "Leseverstehen (Читання)", "Wortschatz (Лексика)", "Grammatik");
export const NMT_FR = langTree("nmt-fr", "Compréhension écrite (Читання)", "Vocabulaire (Лексика)", "Grammaire");
export const NMT_ES = langTree("nmt-es", "Comprensión de lectura (Читання)", "Vocabulario (Лексика)", "Gramática");
