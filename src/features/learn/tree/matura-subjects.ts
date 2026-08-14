// Matura (Poland, CKE, nowa matura).
//
// Polish-medium papers put Polish on `en` and `pl` (same Bac trick) so
// copyLangFor("matura") → "pl" does not fall back to English titles.
// Język angielski stays English. Other foreign papers share one skill
// tree; paper language is picked from the subject name.

import type { LearnNode, LearnTree, LearnUnit } from "./schema";

function node(
  id: string,
  pl: string,
  uk: string,
  complexity: 1 | 2 | 3 | 4 | 5,
  minutes: number,
  prerequisites: readonly string[] = [],
): LearnNode {
  return { id, title: { en: pl, pl, uk }, complexity, estimatedMinutes: minutes, prerequisites };
}

function enNode(
  id: string,
  en: string,
  uk: string,
  complexity: 1 | 2 | 3 | 4 | 5,
  minutes: number,
  prerequisites: readonly string[] = [],
): LearnNode {
  return { id, title: { en, uk }, complexity, estimatedMinutes: minutes, prerequisites };
}

function unit(id: string, pl: string, uk: string, nodes: readonly LearnNode[]): LearnUnit {
  return { id, title: { en: pl, pl, uk }, nodes };
}

function enUnit(id: string, en: string, uk: string, nodes: readonly LearnNode[]): LearnUnit {
  return { id, title: { en, uk }, nodes };
}

function subject(examTaxonomy: string, units: readonly LearnUnit[]): LearnTree {
  return { examTaxonomy, units };
}

export const MATURA_PL = subject("matura-pl", [
  unit("mpl", "Język polski", "Польська мова", [
    node("mpl-01", "Czytanie ze zrozumieniem", "Читання", 3, 10),
    node("mpl-02", "Literatura", "Література", 3, 12, ["mpl-01"]),
    node("mpl-03", "Analiza utworu literackiego", "Аналіз твору", 4, 12, ["mpl-02"]),
    node("mpl-04", "Język: gramatyka i stylistyka", "Мова: граматика й стилістика", 3, 10),
    node("mpl-05", "Wypracowanie", "Твір", 5, 16, ["mpl-03"]),
    node("mpl-06", "Egzamin ustny", "Усний іспит", 4, 12, ["mpl-02"]),
  ]),
]);

export const MATURA_MATH = subject("matura-math", [
  unit("mma", "Matematyka", "Математика", [
    node("mma-01", "Liczby rzeczywiste", "Дійсні числа", 3, 10),
    node("mma-02", "Algebra", "Алгебра", 3, 11, ["mma-01"]),
    node("mma-03", "Funkcje", "Функції", 4, 12, ["mma-02"]),
    node("mma-04", "Ciągi", "Послідовності", 3, 10, ["mma-02"]),
    node("mma-05", "Rachunek różniczkowy", "Похідна", 4, 12, ["mma-03"]),
    node("mma-06", "Planimetria", "Планіметрія", 4, 12, ["mma-01"]),
    node("mma-07", "Stereometria", "Стереометрія", 4, 12, ["mma-06"]),
  ]),
]);

export const MATURA_ENG = subject("matura-eng", [
  enUnit("men", "English", "Англійська", [
    enNode("men-01", "Reading Comprehension", "Читання", 3, 10),
    enNode("men-02", "Listening Comprehension", "Аудіювання", 3, 10),
    enNode("men-03", "Language in Use", "Мова в ужитку", 4, 11, ["men-01"]),
    enNode("men-04", "Writing", "Письмо", 4, 14, ["men-03"]),
    enNode("men-05", "Topic/Theme Areas", "Теми", 3, 9),
  ]),
]);

export const MATURA_BIO = subject("matura-bio", [
  unit("mbi", "Biologia", "Біологія", [
    node("mbi-01", "Biologia komórki", "Біологія клітини", 3, 10),
    node("mbi-02", "Biochemia", "Біохімія", 4, 11, ["mbi-01"]),
    node("mbi-03", "Genetyka", "Генетика", 4, 12, ["mbi-02"]),
    node("mbi-04", "Ewolucjonizm", "Еволюція", 3, 10, ["mbi-03"]),
    node("mbi-05", "Ekologia", "Екологія", 3, 10),
    node("mbi-06", "Biologia roślin", "Біологія рослин", 3, 10, ["mbi-01"]),
    node("mbi-07", "Biologia zwierząt", "Біологія тварин", 3, 10, ["mbi-01"]),
    node("mbi-08", "Fizjologia człowieka", "Фізіологія людини", 4, 12, ["mbi-07"]),
    node("mbi-09", "Mikrobiologia", "Мікробіологія", 3, 9, ["mbi-01"]),
    node("mbi-10", "Biotechnologia", "Біотехнологія", 4, 11, ["mbi-03"]),
    node("mbi-11", "Umiejętności doświadczalne", "Дослідницькі вміння", 3, 10),
  ]),
]);

export const MATURA_CHEM = subject("matura-chem", [
  unit("mch", "Chemia", "Хімія", [
    node("mch-01", "Budowa atomu", "Будова атома", 3, 10),
    node("mch-02", "Układ okresowy", "Періодична система", 3, 10, ["mch-01"]),
    node("mch-03", "Wiązania chemiczne", "Хімічний зв'язок", 4, 11, ["mch-01"]),
    node("mch-04", "Stechiometria", "Стехіометрія", 4, 12, ["mch-02"]),
    node("mch-05", "Roztwory", "Розчини", 3, 10, ["mch-04"]),
    node("mch-06", "Termochemia", "Термохімія", 4, 11, ["mch-04"]),
    node("mch-07", "Kinetyka reakcji", "Кінетика", 4, 11, ["mch-04"]),
    node("mch-08", "Równowaga chemiczna", "Хімічна рівновага", 4, 12, ["mch-07"]),
    node("mch-09", "Kwasy i zasady", "Кислоти й основи", 4, 12, ["mch-08"]),
    node("mch-10", "Reakcje redoks", "Окисно-відновні реакції", 4, 11, ["mch-04"]),
    node("mch-11", "Chemia organiczna", "Органічна хімія", 4, 13, ["mch-03"]),
    node("mch-12", "Chemia analityczna", "Аналітична хімія", 4, 11, ["mch-09"]),
  ]),
]);

export const MATURA_PHYS = subject("matura-phys", [
  unit("mph", "Fizyka", "Фізика", [
    node("mph-01", "Mechanika", "Механіка", 3, 11),
    node("mph-02", "Termodynamika", "Термодинаміка", 4, 11, ["mph-01"]),
    node("mph-03", "Elektryczność", "Електрика", 4, 12),
    node("mph-04", "Magnetyzm", "Магнетизм", 4, 11, ["mph-03"]),
    node("mph-05", "Drgania", "Коливання", 3, 10, ["mph-01"]),
    node("mph-06", "Fale", "Хвилі", 3, 10, ["mph-05"]),
    node("mph-07", "Optyka", "Оптика", 4, 11, ["mph-06"]),
    node("mph-08", "Fizyka atomowa", "Атомна фізика", 4, 11, ["mph-03"]),
    node("mph-09", "Fizyka jądrowa", "Ядерна фізика", 4, 11, ["mph-08"]),
    node("mph-10", "Fizyka współczesna", "Сучасна фізика", 4, 11, ["mph-08"]),
  ]),
]);

export const MATURA_CS = subject("matura-cs", [
  unit("mcs", "Informatyka", "Інформатика", [
    node("mcs-01", "Algorytmy", "Алгоритми", 3, 11),
    node("mcs-02", "Programowanie", "Програмування", 4, 14, ["mcs-01"]),
    node("mcs-03", "Struktury danych", "Структури даних", 4, 12, ["mcs-02"]),
    node("mcs-04", "Bazy danych", "Бази даних", 3, 10),
    node("mcs-05", "Systemy komputerowe", "Комп'ютерні системи", 3, 10),
    node("mcs-06", "Systemy operacyjne", "Операційні системи", 3, 10, ["mcs-05"]),
    node("mcs-07", "Sieci komputerowe", "Комп'ютерні мережі", 4, 11, ["mcs-05"]),
    node("mcs-08", "Cyberbezpieczeństwo", "Кібербезпека", 4, 11, ["mcs-07"]),
    node("mcs-09", "Logika", "Логіка", 3, 9, ["mcs-01"]),
    node("mcs-10", "Zapis binarny", "Двійковий запис", 3, 9, ["mcs-05"]),
    node("mcs-11", "Analiza danych", "Аналіз даних", 3, 10),
    node("mcs-12", "Arkusze kalkulacyjne", "Електронні таблиці", 2, 8, ["mcs-11"]),
  ]),
]);

export const MATURA_GEO = subject("matura-geo", [
  unit("mge", "Geografia", "Географія", [
    node("mge-01", "Geografia fizyczna", "Фізична географія", 3, 10),
    node("mge-02", "Geografia społeczna", "Суспільна географія", 3, 10),
    node("mge-03", "Geografia ekonomiczna", "Економічна географія", 3, 10, ["mge-02"]),
    node("mge-04", "Ludność", "Населення", 3, 9, ["mge-02"]),
    node("mge-05", "Klimat", "Клімат", 3, 10, ["mge-01"]),
    node("mge-06", "Geomorfologia", "Геоморфологія", 4, 11, ["mge-01"]),
    node("mge-07", "Hydrologia", "Гідрологія", 3, 10, ["mge-01"]),
    node("mge-08", "Rolnictwo", "Сільське господарство", 3, 9, ["mge-03"]),
    node("mge-09", "Przemysł", "Промисловість", 3, 9, ["mge-03"]),
    node("mge-10", "Globalizacja", "Глобалізація", 3, 9, ["mge-03"]),
    node("mge-11", "Mapy", "Карти", 3, 9),
    node("mge-12", "GIS", "GIS", 4, 10, ["mge-11"]),
  ]),
]);

export const MATURA_HIST = subject("matura-hist", [
  unit("mhi", "Historia", "Історія", [
    node("mhi-01", "Starożytność", "Давнина", 3, 10),
    node("mhi-02", "Średniowiecze", "Середньовіччя", 3, 10, ["mhi-01"]),
    node("mhi-03", "Nowożytność", "Новий час", 3, 11, ["mhi-02"]),
    node("mhi-04", "Rozbiory Polski", "Поділи Польщі", 4, 11, ["mhi-03"]),
    node("mhi-05", "I wojna światowa", "Перша світова", 3, 10, ["mhi-04"]),
    node("mhi-06", "Dwudziestolecie międzywojenne", "Міжвоєння", 4, 11, ["mhi-05"]),
    node("mhi-07", "II wojna światowa", "Друга світова", 4, 12, ["mhi-06"]),
    node("mhi-08", "Zimna wojna", "Холодна війна", 3, 10, ["mhi-07"]),
    node("mhi-09", "Polska współczesna", "Сучасна Польща", 4, 11, ["mhi-08"]),
    node("mhi-10", "Analiza źródeł historycznych", "Аналіз джерел", 4, 12, ["mhi-01"]),
  ]),
]);

export const MATURA_WOS = subject("matura-wos", [
  unit("mwo", "Wiedza o społeczeństwie", "Суспільствознавство", [
    node("mwo-01", "Konstytucja", "Конституція", 3, 10),
    node("mwo-02", "Prawo", "Право", 4, 11, ["mwo-01"]),
    node("mwo-03", "Władza państwowa", "Державна влада", 3, 10, ["mwo-01"]),
    node("mwo-04", "Demokracja", "Демократія", 3, 10, ["mwo-03"]),
    node("mwo-05", "Prawa człowieka", "Права людини", 3, 10, ["mwo-02"]),
    node("mwo-06", "Unia Europejska", "Європейський Союз", 3, 10),
    node("mwo-07", "Organizacje międzynarodowe", "Міжнародні організації", 3, 9, ["mwo-06"]),
    node("mwo-08", "Gospodarka", "Економіка", 3, 10),
    node("mwo-09", "Polityka", "Політика", 3, 10, ["mwo-04"]),
    node("mwo-10", "Obywatelstwo", "Громадянство", 3, 9, ["mwo-05"]),
  ]),
]);

export const MATURA_ECON = subject("matura-econ", [
  unit("mec", "Ekonomia", "Економіка", [
    node("mec-01", "Mikroekonomia", "Мікроекономіка", 3, 11),
    node("mec-02", "Makroekonomia", "Макроекономіка", 4, 12, ["mec-01"]),
    node("mec-03", "Przedsiębiorstwo", "Підприємство", 3, 10, ["mec-01"]),
    node("mec-04", "Finanse publiczne", "Публічні фінанси", 4, 11, ["mec-02"]),
    node("mec-05", "Handel międzynarodowy", "Міжнародна торгівля", 3, 10, ["mec-02"]),
    node("mec-06", "Bankowość", "Банківська справа", 3, 10, ["mec-02"]),
    node("mec-07", "Rynek pracy", "Ринок праці", 3, 10, ["mec-01"]),
    node("mec-08", "Przedsiębiorczość", "Підприємництво", 3, 9, ["mec-03"]),
  ]),
]);

export const MATURA_LANG = subject("matura-lang", [
  enUnit("mfl", "Język obcy", "Іноземна мова", [
    enNode("mfl-01", "Reading Comprehension", "Читання", 3, 10),
    enNode("mfl-02", "Listening Comprehension", "Аудіювання", 3, 10),
    enNode("mfl-03", "Writing", "Письмо", 4, 12, ["mfl-01"]),
    enNode("mfl-04", "Grammar", "Граматика", 3, 10),
    enNode("mfl-05", "Vocabulary", "Словник", 3, 9, ["mfl-04"]),
  ]),
]);
