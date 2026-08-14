// Baccalauréat général (France). Topic titles follow the programmes
// published in BO n°30 (25 juillet 2019) — still the 2025–26 sitting.
// AI-drafted grouping; Hlib edits against Eduscol. Not a licensed annales
// pack (Decision Log #37).
//
// Subject-split like Abitur: no bare `bac` tree. Node ids are stable.

import type { LearnNode, LearnTree, LearnUnit } from "./schema";

function node(
  id: string,
  fr: string,
  uk: string,
  complexity: 1 | 2 | 3 | 4 | 5,
  minutes: number,
  prerequisites: readonly string[] = [],
): LearnNode {
  return { id, title: { en: fr, fr, uk }, complexity, estimatedMinutes: minutes, prerequisites };
}

function subject(
  examTaxonomy: string,
  units: readonly LearnUnit[],
): LearnTree {
  return { examTaxonomy, units };
}

function unit(id: string, fr: string, uk: string, nodes: readonly LearnNode[]): LearnUnit {
  return { id, title: { en: fr, fr, uk }, nodes };
}

export const BAC_FR = subject("bac-fr", [
  unit("bfob", "Objets d'étude", "Об'єкти вивчення", [
    node("bfob-01", "La poésie du XIXe au XXIe siècle", "Поезія XIX–XXI ст.", 3, 10),
    node("bfob-02", "Le roman et le récit du Moyen Âge au XXIe siècle", "Роман і оповідь", 3, 10, ["bfob-01"]),
    node("bfob-03", "Le théâtre du XVIIe siècle au XXIe siècle", "Театр XVII–XXI ст.", 3, 10, ["bfob-01"]),
    node("bfob-04", "La littérature d'idées du XVIe au XVIIIe siècle", "Література ідей XVI–XVIII ст.", 4, 12, ["bfob-01"]),
    node("bfob-05", "Œuvre et parcours associé", "Твір і супутній маршрут", 4, 11, ["bfob-02"]),
  ]),
  unit("bfec", "Épreuve écrite", "Письмовий іспит", [
    node("bfec-01", "Le commentaire de texte", "Коментар тексту", 4, 14, ["bfob-05"]),
    node("bfec-02", "La dissertation littéraire", "Літературна дисертація", 5, 16, ["bfob-05"]),
    node("bfec-03", "Problématiser un sujet", "Проблематизація теми", 4, 12, ["bfec-02"]),
    node("bfec-04", "Construire un plan dialectique", "Діалектичний план", 4, 12, ["bfec-03"]),
    node("bfec-05", "Analyser les procédés littéraires", "Літературні прийоми", 4, 12, ["bfec-01"]),
    node("bfec-06", "La langue de la copie (orthographe, syntaxe)", "Мова твору", 3, 10, ["bfec-01"]),
  ]),
  unit("bfor", "Épreuve orale anticipée", "Усний іспит (1ère)", [
    node("bfor-01", "Les 12 textes du descriptif", "12 текстів дескриптиву", 3, 10, ["bfob-05"]),
    node("bfor-02", "La lecture linéaire", "Лінійне читання", 4, 14, ["bfor-01"]),
    node("bfor-03", "L'entretien avec l'examinateur", "Розмова з екзаменатором", 4, 12, ["bfor-02"]),
  ]),
]);

export const BAC_PHILO = subject("bac-philo", [
  unit("bpno", "Notions du programme", "Поняття програми", [
    node("bpno-01", "La conscience et l'inconscient", "Свідомість і несвідоме", 3, 12),
    node("bpno-02", "Autrui", "Інший", 3, 10, ["bpno-01"]),
    node("bpno-03", "Le désir et le bonheur", "Бажання і щастя", 3, 11, ["bpno-01"]),
    node("bpno-04", "La liberté", "Свобода", 4, 12, ["bpno-01"]),
    node("bpno-05", "Le devoir et la justice", "Обов'язок і справедливість", 4, 12, ["bpno-04"]),
    node("bpno-06", "L'État et la société", "Держава і суспільство", 4, 12, ["bpno-05"]),
    node("bpno-07", "La raison et le réel", "Розум і реальне", 4, 13, ["bpno-01"]),
    node("bpno-08", "La vérité et la science", "Істина і наука", 4, 12, ["bpno-07"]),
    node("bpno-09", "La technique et le travail", "Техніка і праця", 4, 11, ["bpno-08"]),
    node("bpno-10", "L'art", "Мистецтво", 3, 10, ["bpno-07"]),
    node("bpno-11", "La nature et le vivant", "Природа і живе", 3, 10, ["bpno-07"]),
    node("bpno-12", "Le temps", "Час", 4, 11, ["bpno-01"]),
    node("bpno-13", "Le langage", "Мова", 4, 11, ["bpno-07"]),
    node("bpno-14", "La religion", "Релігія", 3, 10, ["bpno-07"]),
  ]),
  unit("bpep", "Épreuve de philosophie", "Іспит з філософії", [
    node("bpep-01", "La dissertation philosophique", "Філософська дисертація", 5, 16, ["bpno-04"]),
    node("bpep-02", "L'explication de texte", "Пояснення тексту", 5, 16, ["bpno-07"]),
    node("bpep-03", "Problématiser et conceptualiser", "Проблематизація і концепції", 5, 14, ["bpep-01"]),
    node("bpep-04", "Exemples, références, auteurs", "Приклади й автори", 4, 12, ["bpep-01"]),
  ]),
]);

export const BAC_GO = subject("bac-go", [
  unit("bgor", "Grand oral", "Великий усний", [
    node("bgor-01", "Choisir et formuler une question", "Сформулювати питання", 3, 10),
    node("bgor-02", "Lier la question aux deux spécialités", "Зв'язок із двома спеціальностями", 4, 12, ["bgor-01"]),
    node("bgor-03", "L'exposé de 10 minutes", "10-хвилинний виступ", 4, 14, ["bgor-02"]),
    node("bgor-04", "L'échange avec le jury (20 min au total)", "Обмін із журі", 4, 12, ["bgor-03"]),
    node("bgor-05", "Argumenter à l'oral, sans notes lues", "Усна аргументація", 4, 12, ["bgor-03"]),
    node("bgor-06", "Projection : poursuite d'études", "Профорієнтація", 3, 8, ["bgor-01"]),
  ]),
]);

export const BAC_MATH = subject("bac-math", [
  unit("bma1", "Socle de première", "База 1ère", [
    node("bma1-01", "Second degré et polynômes", "Квадратні рівняння й многочлени", 3, 10),
    node("bma1-02", "Suites numériques", "Числові послідовності", 3, 11, ["bma1-01"]),
    node("bma1-03", "Dérivation", "Похідна", 4, 12, ["bma1-01"]),
    node("bma1-04", "Fonction exponentielle", "Експонента", 4, 12, ["bma1-03"]),
    node("bma1-05", "Trigonométrie", "Тригонометрія", 3, 10, ["bma1-01"]),
    node("bma1-06", "Probabilités conditionnelles", "Умовні ймовірності", 4, 12, ["bma1-02"]),
    node("bma1-07", "Produit scalaire du plan", "Скалярний добуток на площині", 3, 10, ["bma1-05"]),
    node("bma1-08", "Python : fonctions et listes", "Python: функції й списки", 3, 10, ["bma1-02"]),
  ]),
  unit("bman", "Analyse (terminale)", "Аналіз (terminale)", [
    node("bman-01", "Limites de fonctions", "Границя функції", 4, 12, ["bma1-03"]),
    node("bman-02", "Compléments sur la dérivation, convexité", "Опуклість", 4, 12, ["bman-01"]),
    node("bman-03", "Logarithme népérien", "Натуральний логарифм", 4, 12, ["bma1-04"]),
    node("bman-04", "Fonctions sinus et cosinus", "Синус і косинус як функції", 4, 11, ["bma1-05"]),
    node("bman-05", "Primitives et équations différentielles", "Первісні й диференціальні рівняння", 5, 14, ["bman-03"]),
    node("bman-06", "Calcul intégral", "Інтеграл", 5, 14, ["bman-05"]),
    node("bman-07", "Suites : limites, récurrence", "Послідовності: границя, рекурентність", 4, 12, ["bma1-02"]),
  ]),
  unit("bmge", "Géométrie dans l'espace", "Стереометрія", [
    node("bmge-01", "Vecteurs, droites et plans", "Вектори, прямі й площини", 4, 12, ["bma1-07"]),
    node("bmge-02", "Orthogonalité et distances", "Ортогональність і відстані", 4, 13, ["bmge-01"]),
    node("bmge-03", "Représentations paramétriques et cartésiennes", "Параметричні й декартові рівняння", 4, 12, ["bmge-01"]),
  ]),
  unit("bmpr", "Probabilités et combinatoire", "Ймовірності", [
    node("bmpr-01", "Combinatoire et dénombrement", "Комбінаторика", 4, 12, ["bma1-06"]),
    node("bmpr-02", "Sommes de variables aléatoires discrètes", "Суми дискретних ВВ", 4, 13, ["bmpr-01"]),
    node("bmpr-03", "Loi des grands nombres, concentration", "Закон великих чисел", 5, 13, ["bmpr-02"]),
    node("bmpr-04", "Python : simulation et échantillonnage", "Python: симуляція", 4, 11, ["bma1-08", "bmpr-02"]),
  ]),
]);

export const BAC_PC = subject("bac-pc", [
  unit("bpc1", "Constitution et transformations de la matière", "Будова і перетворення речовини", [
    node("bpc1-01", "Mesure et incertitudes", "Вимірювання й похибки", 3, 10),
    node("bpc1-02", "Transformations acide-base", "Кислотно-основні реакції", 4, 12, ["bpc1-01"]),
    node("bpc1-03", "Cinétique et catalyse", "Кінетика і каталіз", 4, 12, ["bpc1-02"]),
    node("bpc1-04", "Équilibre chimique", "Хімічна рівновага", 4, 12, ["bpc1-03"]),
    node("bpc1-05", "Chimie organique : groupes caractéristiques", "Органічна хімія", 4, 13, ["bpc1-02"]),
    node("bpc1-06", "Stratégies de synthèse", "Стратегії синтезу", 5, 14, ["bpc1-05"]),
  ]),
  unit("bpcm", "Mouvement et interactions", "Рух і взаємодії", [
    node("bpcm-01", "Description d'un mouvement", "Опис руху", 3, 10),
    node("bpcm-02", "Lois de Newton", "Закони Ньютона", 4, 12, ["bpcm-01"]),
    node("bpcm-03", "Mécanique : énergie et travail", "Енергія і робота", 4, 12, ["bpcm-02"]),
    node("bpcm-04", "Gravitation et satellites", "Гравітація", 4, 11, ["bpcm-02"]),
  ]),
  unit("bpco", "Ondes et signaux", "Хвилі й сигнали", [
    node("bpco-01", "Ondes mécaniques", "Механічні хвилі", 3, 10),
    node("bpco-02", "Lumière : modèles ondulatoire et particulaire", "Світло", 4, 12, ["bpco-01"]),
    node("bpco-03", "Physique quantique (introduction)", "Квантова фізика", 5, 13, ["bpco-02"]),
    node("bpco-04", "Signaux électriques", "Електричні сигнали", 3, 10, ["bpco-01"]),
  ]),
]);

export const BAC_SVT = subject("bac-svt", [
  unit("bsg", "Génétique et évolution", "Генетика й еволюція", [
    node("bsg-01", "Le vivant : unité et diversité", "Живе: єдність і різноманіття", 3, 10),
    node("bsg-02", "Génome, mutations, brassage", "Геном, мутації", 4, 12, ["bsg-01"]),
    node("bsg-03", "Phénotype, environnement", "Фенотип і середовище", 3, 10, ["bsg-02"]),
    node("bsg-04", "Mécanismes de l'évolution", "Механізми еволюції", 4, 12, ["bsg-02"]),
  ]),
  unit("bst", "La Terre, la vie, l'organisation du vivant", "Земля і організація живого", [
    node("bst-01", "La dynamique interne de la Terre", "Внутрішня динаміка Землі", 4, 12),
    node("bst-02", "Le temps géologique", "Геологічний час", 3, 10, ["bst-01"]),
    node("bst-03", "La plante, productrice de matière organique", "Рослина як продуцент", 3, 10),
    node("bst-04", "De la plante à l'écosystème", "Від рослини до екосистеми", 4, 12, ["bst-03"]),
  ]),
  unit("bsc", "Corps humain et santé / enjeux", "Тіло, здоров'я, сучасні виклики", [
    node("bsc-01", "Système immunitaire", "Імунітет", 4, 12),
    node("bsc-02", "Cerveau, mouvement, comportement", "Мозок і поведінка", 4, 12),
    node("bsc-03", "Climat, biodiversité, responsabilités", "Клімат і біорізноманіття", 4, 12, ["bst-04"]),
  ]),
]);

export const BAC_SES = subject("bac-ses", [
  unit("bse", "Science économique", "Економіка", [
    node("bse-01", "Comment un marché concurrentiel fonctionne-t-il ?", "Конкурентний ринок", 3, 11),
    node("bse-02", "La monnaie et le financement", "Гроші й фінансування", 4, 12, ["bse-01"]),
    node("bse-03", "La croissance économique", "Економічне зростання", 4, 12, ["bse-01"]),
    node("bse-04", "Chômage et politiques de l'emploi", "Безробіття", 4, 12, ["bse-03"]),
    node("bse-05", "Commerce international et mondialisation", "Світова торгівля", 4, 12, ["bse-03"]),
  ]),
  unit("bss", "Sociologie et science politique", "Соціологія й політологія", [
    node("bss-01", "Socialisation et construction des identités", "Соціалізація", 3, 10),
    node("bss-02", "Groupes, réseaux, stratification", "Стратифікація", 4, 11, ["bss-01"]),
    node("bss-03", "Contrôle social et déviance", "Соціальний контроль", 3, 10, ["bss-01"]),
    node("bss-04", "Voter, opinion, démocratie", "Вибори й демократія", 4, 12, ["bss-02"]),
    node("bss-05", "L'école et la mobilité sociale", "Школа й мобільність", 4, 11, ["bss-02"]),
  ]),
  unit("bsr", "Regards croisés et épreuve", "Перехресний погляд", [
    node("bsr-01", "Inégalités et justice sociale", "Нерівність і справедливість", 4, 12, ["bse-03", "bss-02"]),
    node("bsr-02", "Dissertation et épreuve composée", "Дисертація та складений іспит", 5, 14, ["bsr-01"]),
  ]),
]);

export const BAC_NSI = subject("bac-nsi", [
  unit("bnsd", "Données et algorithmique", "Дані й алгоритми", [
    node("bnsd-01", "Types de données et représentations", "Типи даних", 3, 10),
    node("bnsd-02", "Algorithmique de base", "Базові алгоритми", 3, 11, ["bnsd-01"]),
    node("bnsd-03", "Structures de données (listes, piles, files, arbres)", "Структури даних", 4, 13, ["bnsd-02"]),
    node("bnsd-04", "Algorithmes d'efficacité (tris, graphes)", "Ефективність алгоритмів", 5, 14, ["bnsd-03"]),
    node("bnsd-05", "Programmation Python (spé)", "Python (спеціальність)", 4, 12, ["bnsd-02"]),
  ]),
  unit("bnsh", "Architectures, OS, réseaux", "Архітектура, ОС, мережі", [
    node("bnsh-01", "Architecture matérielle", "Апаратна архітектура", 3, 10),
    node("bnsh-02", "Systèmes d'exploitation", "Операційні системи", 4, 11, ["bnsh-01"]),
    node("bnsh-03", "Réseaux et protocoles", "Мережі й протоколи", 4, 12, ["bnsh-02"]),
    node("bnsh-04", "Bases de données relationnelles, SQL", "Реляційні БД, SQL", 4, 12, ["bnsd-01"]),
    node("bnsh-05", "Cybersécurité au lycée", "Кібербезпека", 4, 11, ["bnsh-03"]),
  ]),
]);

export const BAC_HGGSP = subject("bac-hggsp", [
  unit("bhg1", "Première", "1ère", [
    node("bhg1-01", "Comprendre un régime politique : la démocratie", "Демократичний режим", 3, 11),
    node("bhg1-02", "Analyser les dynamiques des puissances internationales", "Міжнародні потуги", 4, 12, ["bhg1-01"]),
    node("bhg1-03", "Étudier les divisions politiques du monde : les frontières", "Кордони", 4, 11, ["bhg1-02"]),
    node("bhg1-04", "S'informer : un regard critique sur les sources et modes", "Критичне інформування", 3, 10),
    node("bhg1-05", "Analyser les relations entre États et religions", "Держава і релігії", 4, 11, ["bhg1-01"]),
  ]),
  unit("bhgt", "Terminale", "Terminale", [
    node("bhgt-01", "De nouveaux espaces de conquête", "Нові простори завоювання", 4, 12, ["bhg1-02"]),
    node("bhgt-02", "Faire la guerre, faire la paix", "Війна і мир", 4, 12, ["bhg1-02"]),
    node("bhgt-03", "Histoire et mémoires", "Історія і пам'ять", 4, 12, ["bhg1-04"]),
    node("bhgt-04", "Identifier, protéger et valoriser le patrimoine", "Спадщина", 3, 10, ["bhgt-03"]),
    node("bhgt-05", "L'environnement, entre exploitation et protection", "Довкілля", 4, 12, ["bhg1-03"]),
    node("bhgt-06", "L'enjeu de la connaissance", "Знання як ставка", 4, 11, ["bhg1-04"]),
  ]),
]);

export const BAC_HLP = subject("bac-hlp", [
  unit("bhl", "Humanités, littérature et philosophie", "HLP", [
    node("bhl-01", "Les pouvoirs de la parole", "Влада слова", 3, 11),
    node("bhl-02", "Les représentations du monde", "Уявлення про світ", 4, 12, ["bhl-01"]),
    node("bhl-03", "La recherche de soi", "Пошук себе", 4, 12, ["bhl-01"]),
    node("bhl-04", "L'humanité en question", "Людство під питанням", 4, 12, ["bhl-02"]),
    node("bhl-05", "Création, continuités et ruptures", "Творчість і розриви", 4, 12, ["bhl-02"]),
    node("bhl-06", "L'explication de texte HLP / essai", "Пояснення тексту / ессе", 5, 14, ["bhl-01"]),
  ]),
]);

export const BAC_LLCER = subject("bac-llcer", [
  unit("bll", "LLCER Anglais", "LLCER англійська", [
    node("bll-01", "Imaginaires", "Уявне", 3, 10),
    node("bll-02", "Rencontres", "Зустрічі", 3, 10, ["bll-01"]),
    node("bll-03", "Explorations", "Дослідження", 4, 11, ["bll-01"]),
    node("bll-04", "Arts et débats d'idées", "Мистецтво й дебати", 4, 12, ["bll-02"]),
    node("bll-05", "Traduction et médiation", "Переклад і медіація", 4, 12, ["bll-02"]),
    node("bll-06", "Synthèse de documents", "Синтез документів", 5, 14, ["bll-04"]),
    node("bll-07", "Épreuve orale de spécialité", "Усний іспит спеціальності", 4, 12, ["bll-06"]),
  ]),
]);
