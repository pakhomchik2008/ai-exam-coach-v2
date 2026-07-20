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
    subject: "Українська мова", aliases: ["Украинский язык", "Ukrainian Language", "Ukrainian", "укр мова", "укрмова", "укр", "мова"],
    topics: [
      { name: "Фонетика", difficulty: 5, importance: 6, subtopics: ["звуки української мови", "голосні звуки", "приголосні звуки", "дзвінкі та глухі", "тверді, м’які, пом’якшені", "склад", "наголос", "уподібнення приголосних", "спрощення в групах приголосних", "чергування голосних", "чергування приголосних"] },
      { name: "Графіка", difficulty: 5, importance: 6, subtopics: ["український алфавіт", "співвідношення букв і звуків", "позначення м’якості", "апостроф", "букви я, ю, є, ї", "буквосполучення йо, ьо"] },
      { name: "Орфоепія", difficulty: 5, importance: 6, subtopics: ["правильна вимова голосних", "правильна вимова приголосних", "нормативний наголос", "вимова іншомовних слів"] },
      { name: "Орфографія", difficulty: 5, importance: 6, subtopics: ["правопис префіксів", "правопис суфіксів", "написання складних слів", "написання разом, окремо, через дефіс", "велика літера", "м’який знак", "апостроф", "подвоєння букв", "спрощення", "чергування голосних і приголосних", "правопис іншомовних слів", "правопис числівників", "правопис прислівників", "перенесення слів"] },
      { name: "Лексикологія", difficulty: 5, importance: 6, subtopics: ["лексичне значення слова", "багатозначні слова", "пряме і переносне значення", "омоніми", "синоніми", "антоніми", "пароніми", "фразеологізми", "діалектизми", "професіоналізми", "терміни", "історизми", "архаїзми", "неологізми", "запозичена лексика"] },
      { name: "Фразеологія", difficulty: 5, importance: 6, subtopics: ["значення фразеологізмів", "уживання фразеологізмів", "синонімія фразеологізмів"] },
      { name: "Будова слова", difficulty: 5, importance: 6, subtopics: ["основа слова", "закінчення", "корінь", "префікс", "суфікс", "постфікс", "спільнокореневі слова", "словотвір"] },
      { name: "Словотвір", difficulty: 5, importance: 6, subtopics: ["способи творення слів", "префіксальний", "суфіксальний", "префіксально-суфіксальний", "безафіксний", "складання", "скорочення"] },
      { name: "Морфологія", difficulty: 5, importance: 6, subtopics: ["Іменник: рід", "Іменник: число", "Іменник: відмінок", "Іменник: відміни", "Іменник: групи", "Іменник: кличний відмінок", "Прикметник: розряди", "Прикметник: ступені порівняння", "Прикметник: відмінювання", "Числівник: кількісні", "Числівник: порядкові", "Числівник: відмінювання", "Числівник: правопис", "Займенник: розряди", "Займенник: відмінювання", "Дієслово: інфінітив", "Дієслово: вид", "Дієслово: час", "Дієслово: спосіб", "Дієслово: особа", "Дієслово: число", "Дієслово: рід", "Дієслово: дієвідміни", "Дієслово: безособові форми", "Дієприкметник: творення", "Дієприкметник: правопис", "Дієприслівник: творення", "Дієприслівник: правопис", "Прислівник: розряди", "Прислівник: ступені порівняння", "Прислівник: правопис", "Прийменник: види", "Прийменник: правопис", "Сполучник: види", "Сполучник: правопис", "Частка: види", "Частка: правопис"] },
      { name: "Синтаксис", difficulty: 5, importance: 6, subtopics: ["словосполучення", "просте речення", "граматична основа", "односкладні речення", "двоскладні речення", "неповні речення", "однорідні члени речення", "звертання", "вставні слова", "вставлені конструкції", "відокремлені члени речення", "складносурядне речення", "складнопідрядне речення", "безсполучникове речення", "складне речення з різними видами зв'язку", "пряма мова", "непряма мова", "діалог", "цитата"] },
      { name: "Пунктуація", difficulty: 5, importance: 6, subtopics: ["кома", "тире", "двокрапка", "крапка з комою", "лапки", "дужки", "розділові знаки у простому реченні", "розділові знаки у складному реченні", "пунктуація при звертанні", "пунктуація при вставних словах", "пунктуація при відокремлених членах", "пунктуація при прямій мові", "пунктуація при цитуванні"] },
      { name: "Стилістика", difficulty: 5, importance: 6, subtopics: ["розмовний стиль", "художній стиль", "науковий стиль", "публіцистичний стиль", "офіційно-діловий стиль", "конфесійний стиль"] },
      { name: "Розвиток мовлення", difficulty: 5, importance: 6, subtopics: ["тема тексту", "основна думка", "мікротема", "типи мовлення", "опис", "розповідь", "роздум", "засоби зв'язку речень", "редагування тексту", "логічність мовлення", "точність мовлення", "доречність мовлення"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Математика", aliases: ["Математика", "Mathematics", "Math", "Maths", "матем", "мат", "математика"],
    topics: [
      { name: "Числа і вирази", difficulty: 5, importance: 6, subtopics: ["натуральні числа", "цілі числа", "раціональні числа", "ірраціональні числа", "дійсні числа", "модуль числа", "порівняння чисел", "числові проміжки", "відсотки", "пропорції", "відношення", "середнє арифметичне", "степінь із цілим показником", "степінь із раціональним показником", "корінь n-го степеня", "арифметичний квадратний корінь", "властивості степенів", "властивості коренів", "логарифм", "властивості логарифмів", "числові вирази", "алгебраїчні вирази", "тотожні перетворення", "формули скороченого множення", "розкладання многочленів на множники", "раціональні дроби", "тотожності"] },
      { name: "Рівняння", difficulty: 5, importance: 6, subtopics: ["лінійні рівняння", "квадратні рівняння", "неповні квадратні рівняння", "біквадратні рівняння", "дробово-раціональні рівняння", "ірраціональні рівняння", "показникові рівняння", "логарифмічні рівняння", "тригонометричні рівняння", "рівняння з модулем", "рівняння з параметром (базові поняття)", "рівносильність рівнянь", "перевірка коренів"] },
      { name: "Нерівності", difficulty: 5, importance: 6, subtopics: ["лінійні нерівності", "квадратні нерівності", "дробово-раціональні нерівності", "ірраціональні нерівності", "показникові нерівності", "логарифмічні нерівності", "нерівності з модулем", "системи нерівностей", "метод інтервалів"] },
      { name: "Системи", difficulty: 5, importance: 6, subtopics: ["системи лінійних рівнянь", "системи нелінійних рівнянь", "системи нерівностей", "графічний метод", "метод підстановки", "метод додавання"] },
      { name: "Функції", difficulty: 5, importance: 6, subtopics: ["поняття функції", "область визначення", "область значень", "способи задання функції", "графік функції", "властивості функції", "зростання", "спадання", "найбільше значення", "найменше значення", "парність", "непарність", "періодичність", "нулі функції", "проміжки знакосталості", "читання графіків"] },
      { name: "Основні функції", difficulty: 5, importance: 6, subtopics: ["лінійна", "квадратична", "степенева", "обернена пропорційність", "показникова", "логарифмічна", "тригонометричні функції"] },
      { name: "Послідовності", difficulty: 5, importance: 6, subtopics: ["числова послідовність", "арифметична прогресія", "геометрична прогресія", "n-й член", "сума перших n членів"] },
      { name: "Комбінаторика", difficulty: 5, importance: 6, subtopics: ["правило суми", "правило добутку", "перестановки", "розміщення", "комбінації", "біном Ньютона (базові поняття)"] },
      { name: "Теорія ймовірностей", difficulty: 5, importance: 6, subtopics: ["випадкова подія", "достовірна подія", "неможлива подія", "класична ймовірність", "статистична ймовірність", "протилежні події", "незалежні події"] },
      { name: "Елементи статистики", difficulty: 5, importance: 6, subtopics: ["вибірка", "частота", "відносна частота", "середнє арифметичне", "медіана", "мода", "розмах", "таблиці", "діаграми", "гістограми"] },
      { name: "Планіметрія", difficulty: 5, importance: 6, subtopics: ["Основні поняття: точка", "Основні поняття: пряма", "Основні поняття: промінь", "Основні поняття: відрізок", "Основні поняття: кут", "Трикутники: види трикутників", "Трикутники: сума кутів", "Трикутники: рівність трикутників", "Трикутники: подібність", "Трикутники: медіана", "Трикутники: бісектриса", "Трикутники: висота", "Трикутники: середня лінія", "Трикутники: площа", "Трикутники: теорема Піфагора", "Трикутники: синуси", "Трикутники: косинуси", "Чотирикутники: паралелограм", "Чотирикутники: прямокутник", "Чотирикутники: ромб", "Чотирикутники: квадрат", "Чотирикутники: трапеція", "Чотирикутники: площі", "Многокутники: правильні многокутники", "Многокутники: сума кутів", "Многокутники: площі", "Коло і круг: хорда", "Коло і круг: дотична", "Коло і круг: січна", "Коло і круг: центральний кут", "Коло і круг: вписаний кут", "Коло і круг: довжина кола", "Коло і круг: площа круга", "Коло і круг: сектор", "Коло і круг: сегмент"] },
      { name: "Координатна геометрія", difficulty: 5, importance: 6, subtopics: ["декартова система координат", "координати точки", "відстань між точками", "середина відрізка", "рівняння прямої", "кутовий коефіцієнт", "рівняння кола"] },
      { name: "Вектори", difficulty: 5, importance: 6, subtopics: ["поняття вектора", "координати вектора", "довжина вектора", "додавання", "віднімання", "множення на число", "скалярний добуток"] },
      { name: "Стереометрія", difficulty: 5, importance: 6, subtopics: ["аксіоми стереометрії", "взаємне розміщення прямих", "взаємне розміщення площин", "призма", "паралелепіпед", "куб", "піраміда", "циліндр", "конус", "куля", "сфера", "площі поверхонь", "об'єми"] },
      { name: "Тригонометрія", difficulty: 5, importance: 6, subtopics: ["радіанна міра", "градусна міра", "синус", "косинус", "тангенс", "котангенс", "основні тригонометричні тотожності", "формули зведення", "значення тригонометричних функцій", "тригонометричні вирази"] },
      { name: "Похідна", difficulty: 5, importance: 6, subtopics: ["поняття похідної", "геометричний зміст", "фізичний зміст", "правила диференціювання", "похідні елементарних функцій", "дослідження функції за допомогою похідної", "екстремуми", "найбільше і найменше значення"] },
      { name: "Первісна та інтеграл", difficulty: 5, importance: 6, subtopics: ["поняття первісної", "невизначений інтеграл (базові поняття)", "визначений інтеграл", "площа криволінійної трапеції"] },
      { name: "Практичні задачі", difficulty: 5, importance: 6, subtopics: ["текстові задачі", "задачі на рух", "задачі на роботу", "задачі на суміші", "задачі на відсотки", "задачі на прогресії", "задачі з геометрії", "задачі з графіками", "аналіз таблиць", "аналіз діаграм"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Історія України", aliases: ["История Украины", "History of Ukraine", "History", "історія", "история", "истор"],
    topics: [
      { name: "Вступ до історії України", difficulty: 5, importance: 6, subtopics: ["історичні джерела", "археологічні джерела", "писемні джерела", "речові джерела", "етнографічні джерела", "усні історичні джерела", "історична карта", "історичний час", "літочислення", "хронологія", "історичні поняття"] },
      { name: "Стародавня історія України", difficulty: 5, importance: 6, subtopics: ["палеоліт", "мезоліт", "неоліт", "енеоліт", "трипільська культура", "бронзовий вік", "ранній залізний вік", "кіммерійці", "скіфи", "сармати", "античні міста-держави Північного Причорномор'я", "Велике переселення народів"] },
      { name: "Русь-Україна (Київська держава)", difficulty: 5, importance: 6, subtopics: ["утворення Київської держави", "князі Аскольд і Дір", "князь Олег", "князь Ігор", "княгиня Ольга", "князь Святослав", "Володимир Великий", "хрещення Русі", "Ярослав Мудрий", "Руська Правда", "Любецький з'їзд князів", "Володимир Мономах", "Мстислав Великий", "політична роздробленість", "культура Київської Русі"] },
      { name: "Галицько-Волинська держава", difficulty: 5, importance: 6, subtopics: ["утворення держави", "Роман Мстиславич", "Данило Романович", "коронація Данила", "боротьба з монголами", "розвиток міст", "культура"] },
      { name: "Українські землі у складі іноземних держав (XIV–XVI ст.)", difficulty: 5, importance: 6, subtopics: ["Велике князівство Литовське", "Польське королівство", "Кревська унія", "Люблінська унія", "Річ Посполита", "Кримське ханство", "Магдебурзьке право", "українська шляхта", "православна церква", "братства", "Острозька академія", "Пересопницьке Євангеліє"] },
      { name: "Українське козацтво", difficulty: 5, importance: 6, subtopics: ["виникнення козацтва", "Запорозька Січ", "Дмитро Вишневецький", "реєстрові козаки", "козацькі повстання", "Петро Конашевич-Сагайдачний", "морські походи козаків"] },
      { name: "Національно-визвольна війна середини XVII ст.", difficulty: 5, importance: 6, subtopics: ["Богдан Хмельницький", "причини війни", "Жовтоводська битва", "Корсунська битва", "Пилявецька битва", "Зборівський договір", "Берестецька битва", "Білоцерківський договір", "Батозька битва", "Переяславська рада", "Березневі статті", "українська козацька держава (Гетьманщина)"] },
      { name: "Гетьманщина. Руїна", difficulty: 5, importance: 6, subtopics: ["Іван Виговський", "Конотопська битва", "Юрій Хмельницький", "Андрусівське перемир'я", "Петро Дорошенко", "Дем'ян Многогрішний", "Іван Самойлович", "Іван Мазепа", "Пилип Орлик", "Конституція Пилипа Орлика", "Полтавська битва", "ліквідація гетьманства", "ліквідація Запорозької Січі"] },
      { name: "Українські землі у складі Російської та Австрійської імперій (кінець XVIII — перша половина XIX ст.)", difficulty: 5, importance: 6, subtopics: ["адміністративний поділ", "кріпацтво", "промисловий переворот", "національне відродження", "Кирило-Мефодіївське братство", "Тарас Шевченко", "західноукраїнські землі"] },
      { name: "Українські землі у другій половині XIX ст.", difficulty: 5, importance: 6, subtopics: ["скасування кріпацтва", "реформи", "індустріалізація", "урбанізація", "громадівський рух", "Валуєвський циркуляр", "Емський указ", "політичні партії", "Іван Франко", "Михайло Драгоманов", "Леся Українка", "Михайло Грушевський"] },
      { name: "Україна на початку XX ст.", difficulty: 5, importance: 6, subtopics: ["економічний розвиток", "політичні партії", "революція 1905–1907 років", "український рух", "Перша світова війна", "Українські січові стрільці"] },
      { name: "Українська революція 1917–1921 років", difficulty: 5, importance: 6, subtopics: ["Центральна Рада", "Михайло Грушевський", "Універсали Центральної Ради", "Українська Народна Республіка", "Павло Скоропадський", "Українська Держава", "Директорія", "Симон Петлюра", "ЗУНР", "Акт Злуки", "війна за незалежність", "поразка революції"] },
      { name: "Україна у складі СРСР (1921–1939)", difficulty: 5, importance: 6, subtopics: ["НЕП", "українізація", "індустріалізація", "колективізація", "Голодомор 1932–1933 років", "масові репресії", "Розстріляне відродження", "Конституція УРСР", "західноукраїнські землі міжвоєнного періоду", "ОУН"] },
      { name: "Друга світова війна", difficulty: 5, importance: 6, subtopics: ["початок війни", "пакт Молотова–Ріббентропа", "приєднання Західної України", "німецько-радянська війна", "окупаційний режим", "Голокост", "Бабин Яр", "рух Опору", "УПА", "визволення України", "завершення війни"] },
      { name: "Україна у повоєнний період (1945–1991)", difficulty: 5, importance: 6, subtopics: ["відбудова", "радянізація Західної України", "десталінізація", "шістдесятники", "дисидентський рух", "Українська Гельсінська група", "перебудова", "Чорнобильська катастрофа", "Декларація про державний суверенітет України"] },
      { name: "Відновлення незалежності України", difficulty: 5, importance: 6, subtopics: ["Акт проголошення незалежності України", "Всеукраїнський референдум 1 грудня 1991 року", "Конституція України 1996 року", "державна символіка", "формування органів влади", "економічні реформи"] },
      { name: "Становлення сучасної України", difficulty: 5, importance: 6, subtopics: ["Помаранчева революція", "Революція Гідності", "Євромайдан", "анексія Криму", "російсько-українська війна", "АТО", "ООС", "повномасштабне вторгнення РФ (у межах тем, визначених чинною програмою НМТ)"] },
      { name: "Історичні поняття та терміни", difficulty: 5, importance: 6, subtopics: ["держава", "цивілізація", "князь", "воєвода", "гетьман", "старшина", "автономія", "федерація", "республіка", "монархія", "імперія", "демократія", "колонізація", "індустріалізація", "модернізація", "колективізація", "українізація", "репресії", "тоталітаризм", "окупація", "депортація", "геноцид", "дисидент", "суверенітет", "незалежність"] },
      { name: "Історичні персоналії", difficulty: 5, importance: 6, subtopics: ["Кий", "Аскольд", "Дір", "Олег", "Ігор", "Ольга", "Святослав", "Володимир Великий", "Ярослав Мудрий", "Володимир Мономах", "Роман Мстиславич", "Данило Галицький", "Дмитро Вишневецький", "Петро Конашевич-Сагайдачний", "Богдан Хмельницький", "Іван Виговський", "Петро Дорошенко", "Іван Самойлович", "Іван Мазепа", "Пилип Орлик", "Кирило Розумовський", "Тарас Шевченко", "Михайло Драгоманов", "Іван Франко", "Леся Українка", "Михайло Грушевський", "Євген Коновалець", "Степан Бандера", "Роман Шухевич", "Симон Петлюра", "Павло Скоропадський", "В'ячеслав Чорновіл", "Левко Лук'яненко"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Англійська мова", aliases: ["Английский язык", "English", "English Language", "англійська", "английский", "англ", "инглиш"],
    topics: [
      { name: "Reading (Читання)", difficulty: 5, importance: 6, subtopics: ["розуміння основної думки тексту", "визначення теми", "визначення мети автора", "пошук конкретної інформації", "встановлення логічної послідовності", "встановлення відповідності", "розуміння деталей", "висновки за змістом тексту", "значення слова за контекстом", "аналіз структури тексту"] },
      { name: "Vocabulary (Лексика)", difficulty: 5, importance: 6, subtopics: ["Повсякденне життя: Family and Friends", "Повсякденне життя: Relationships", "Повсякденне життя: Personal Information", "Повсякденне життя: Daily Routine", "Повсякденне життя: House and Home", "Повсякденне життя: Food and Drinks", "Повсякденне життя: Shopping", "Повсякденне життя: Clothes and Fashion", "Повсякденне життя: Health", "Повсякденне життя: Sports", "Повсякденне життя: Hobbies", "Повсякденне життя: Entertainment", "Повсякденне життя: Music", "Повсякденне життя: Films", "Повсякденне життя: Books", "Повсякденне життя: Travel", "Повсякденне життя: Holidays", "Повсякденне життя: Transport", "Повсякденне життя: Nature", "Повсякденне життя: Weather", "Повсякденне життя: Environment", "Повсякденне життя: Technology", "Повсякденне життя: Education", "Повсякденне життя: Jobs and Professions", "Повсякденне життя: Communication", "Повсякденне життя: Mass Media", "Повсякденне життя: Science", "Повсякденне життя: Culture", "Повсякденне життя: Art", "Повсякденне життя: Ukraine", "Повсякденне життя: English-speaking Countries", "Лексичні теми: Phrasal Verbs", "Лексичні теми: Idioms", "Лексичні теми: Synonyms", "Лексичні теми: Antonyms", "Лексичні теми: Collocations", "Лексичні теми: Word Formation", "Лексичні теми: Prefixes", "Лексичні теми: Suffixes", "Лексичні теми: Compound Words", "Лексичні теми: False Friends", "Лексичні теми: Common Confusing Words"] },
      { name: "Grammar (Граматика)", difficulty: 5, importance: 6, subtopics: ["Nouns: Countable and Uncountable Nouns", "Nouns: Singular and Plural", "Nouns: Possessive Case", "Nouns: Articles", "Articles: a", "Articles: an", "Articles: the", "Articles: Zero Article", "Pronouns: Personal", "Pronouns: Possessive", "Pronouns: Reflexive", "Pronouns: Demonstrative", "Pronouns: Relative", "Pronouns: Interrogative", "Pronouns: Indefinite", "Adjectives: Degrees of Comparison", "Adjectives: Order of Adjectives", "Adverbs: Types of Adverbs", "Adverbs: Comparison of Adverbs", "Adverbs: Position of Adverbs", "Numerals: Cardinal Numbers", "Numerals: Ordinal Numbers", "Prepositions: Time", "Prepositions: Place", "Prepositions: Direction", "Prepositions: Movement", "Prepositions: Dependent Prepositions", "Conjunctions: Coordinating", "Conjunctions: Subordinating", "Conjunctions: Correlative", "Present Tenses: Present Simple", "Present Tenses: Present Continuous", "Present Tenses: Present Perfect", "Present Tenses: Present Perfect Continuous", "Past Tenses: Past Simple", "Past Tenses: Past Continuous", "Past Tenses: Past Perfect", "Past Tenses: Past Perfect Continuous", "Future Tenses: Future Simple", "Future Tenses: Future Continuous", "Future Tenses: Future Perfect", "Future Tenses: Future Perfect Continuous", "Future Tenses: be going to", "Future Tenses: Present Continuous for Future", "Future Tenses: Present Simple for Timetables", "Modal Verbs: can", "Modal Verbs: could", "Modal Verbs: may", "Modal Verbs: might", "Modal Verbs: must", "Modal Verbs: have to", "Modal Verbs: should", "Modal Verbs: ought to", "Modal Verbs: need", "Modal Verbs: shall", "Modal Verbs: will", "Modal Verbs: would", "Passive Voice: Present Passive", "Passive Voice: Past Passive", "Passive Voice: Future Passive", "Passive Voice: Perfect Passive", "Passive Voice: Modal Passive", "Conditionals: Zero Conditional", "Conditionals: First Conditional", "Conditionals: Second Conditional", "Conditionals: Third Conditional", "Conditionals: Mixed Conditionals", "Reported Speech: Statements", "Reported Speech: Questions", "Reported Speech: Commands", "Reported Speech: Requests", "Reported Speech: Time Changes", "Infinitive: Full Infinitive", "Infinitive: Bare Infinitive"] },
      { name: "Word Formation", difficulty: 5, importance: 6, subtopics: ["Noun Formation", "Verb Formation", "Adjective Formation", "Adverb Formation", "Negative Prefixes", "Suffixes", "Conversion"] },
      { name: "Communication Skills", difficulty: 5, importance: 6, subtopics: ["Functional Language", "Requests", "Suggestions", "Advice", "Invitations", "Apologies", "Complaints", "Agreement", "Disagreement", "Preferences", "Opinions", "Likes and Dislikes"] },
      { name: "Text Types", difficulty: 5, importance: 6, subtopics: ["Emails", "Letters", "Advertisements", "Notices", "Articles", "Stories", "Announcements", "Messages", "Instructions", "Blog Posts", "Reviews"] },
      { name: "Exam Skills", difficulty: 5, importance: 6, subtopics: ["Multiple Choice", "Matching", "Gap Filling", "Word Formation", "Grammar Transformation", "Reading for Gist", "Reading for Detail", "Context Guessing"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Географія", aliases: ["География", "Geography", "гео", "географія", "география"],
    topics: [
      { name: "Загальна географія", difficulty: 5, importance: 6, subtopics: ["географія як наука", "методи географічних досліджень", "географічні карти", "масштаб", "види масштабу", "топографічні карти", "умовні знаки", "координати", "географічна широта", "географічна довгота", "азимут", "план місцевості", "орієнтування", "дистанційне зондування Землі", "ГІС (геоінформаційні системи)"] },
      { name: "Земля як планета", difficulty: 5, importance: 6, subtopics: ["форма Землі", "розміри Землі", "рух Землі навколо осі", "рух Землі навколо Сонця", "доба", "рік", "пори року", "часові пояси", "місцевий час", "поясний час", "міжнародна лінія зміни дат"] },
      { name: "Літосфера", difficulty: 5, importance: 6, subtopics: ["будова Землі", "літосфера", "літосферні плити", "тектонічні структури", "вулканізм", "землетруси", "горотворення", "рельєф", "рівнини", "гори", "корисні копалини", "ендогенні процеси", "екзогенні процеси", "вивітрювання"] },
      { name: "Атмосфера", difficulty: 5, importance: 6, subtopics: ["склад атмосфери", "будова атмосфери", "температура повітря", "атмосферний тиск", "вітер", "вологість", "хмари", "опади", "циклони", "антициклони", "повітряні маси", "клімат", "кліматичні пояси", "кліматотвірні чинники"] },
      { name: "Гідросфера", difficulty: 5, importance: 6, subtopics: ["Світовий океан", "океани", "моря", "затоки", "протоки", "течії", "річки", "озера", "болота", "льодовики", "підземні води", "водні ресурси", "кругообіг води"] },
      { name: "Біосфера", difficulty: 5, importance: 6, subtopics: ["біосфера", "природні зони", "ґрунти", "рослинність", "тваринний світ", "природоохоронні території", "біорізноманіття"] },
      { name: "Географічна оболонка", difficulty: 5, importance: 6, subtopics: ["природні комплекси", "ландшафти", "взаємодія оболонок Землі", "природокористування", "екологічні проблеми", "сталий розвиток"] },
      { name: "Географія материків і океанів", difficulty: 5, importance: 6, subtopics: ["Африка", "Антарктида", "Австралія", "Північна Америка", "Південна Америка", "Євразія", "Тихий океан", "Атлантичний океан", "Індійський океан", "Північний Льодовитий океан", "географічне положення", "рельєф", "клімат", "внутрішні води", "природні зони", "населення", "господарство"] },
      { name: "Географія України", difficulty: 5, importance: 6, subtopics: ["Географічне положення: державний кордон", "Географічне положення: крайні точки", "Географічне положення: сусідні держави", "Рельєф: низовини", "Рельєф: височини", "Рельєф: Українські Карпати", "Рельєф: Кримські гори", "Геологічна будова: Український щит", "Геологічна будова: Донецька складчаста споруда", "Геологічна будова: Дніпровсько-Донецька западина", "Геологічна будова: корисні копалини", "Клімат: кліматичні особливості", "Клімат: повітряні маси", "Клімат: температури", "Клімат: опади", "Внутрішні води: Дніпро", "Внутрішні води: Дністер", "Внутрішні води: Дунай", "Внутрішні води: Південний Буг", "Внутрішні води: Сіверський Донець", "Внутрішні води: озера", "Внутрішні води: водосховища", "Ґрунти: чорноземи", "Ґрунти: дерново-підзолисті", "Ґрунти: сірі лісові", "Ґрунти: каштанові", "Рослинність: ліси", "Рослинність: лісостеп", "Рослинність: степ", "Рослинність: Карпати", "Рослинність: Крим", "Природно-заповідний фонд: біосферні заповідники", "Природно-заповідний фонд: природні заповідники", "Природно-заповідний фонд: національні природні парки"] },
      { name: "Населення України", difficulty: 5, importance: 6, subtopics: ["чисельність населення", "густота населення", "природний рух", "механічний рух", "урбанізація", "міграції", "національний склад", "статево-вікова структура", "трудові ресурси"] },
      { name: "Господарство України", difficulty: 5, importance: 6, subtopics: ["національна економіка", "первинний сектор", "вторинний сектор", "третинний сектор", "Промисловість: паливна", "Промисловість: електроенергетика", "Промисловість: чорна металургія", "Промисловість: кольорова металургія", "Промисловість: машинобудування", "Промисловість: хімічна", "Промисловість: деревообробна", "Промисловість: легка", "Промисловість: харчова", "Сільське господарство: рослинництво", "Сільське господарство: зернові", "Сільське господарство: технічні культури", "Сільське господарство: овочівництво", "Сільське господарство: садівництво", "Сільське господарство: тваринництво", "Транспорт: автомобільний", "Транспорт: залізничний", "Транспорт: морський", "Транспорт: річковий", "Транспорт: повітряний", "Транспорт: трубопровідний", "Зовнішньоекономічні зв'язки: експорт", "Зовнішньоекономічні зв'язки: імпорт", "Зовнішньоекономічні зв'язки: міжнародна торгівля"] },
      { name: "Регіони України", difficulty: 5, importance: 6, subtopics: ["економічні райони", "адміністративно-територіальний устрій", "області України", "найбільші міста"] },
      { name: "Світове господарство", difficulty: 5, importance: 6, subtopics: ["світова економіка", "міжнародний поділ праці", "глобалізація", "ТНК", "міжнародні організації", "країни світу", "типи країн", "розвинені країни", "країни, що розвиваються", "нові індустріальні країни"] },
      { name: "Населення світу", difficulty: 5, importance: 6, subtopics: ["чисельність населення", "демографічні процеси", "урбанізація", "міграції", "раси", "народи", "мови", "релігії"] },
      { name: "Глобальні проблеми людства", difficulty: 5, importance: 6, subtopics: ["зміна клімату", "забруднення довкілля", "дефіцит води", "продовольча проблема", "енергетична проблема", "демографічна проблема", "природні катастрофи", "сталий розвиток"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Фізика", aliases: ["Физика", "Physics", "фіз", "физ", "фізика", "физика"],
    topics: [
      { name: "Механіка", difficulty: 5, importance: 6, subtopics: ["Основні поняття: фізична величина", "Основні поняття: одиниці SI", "Основні поняття: скалярні величини", "Основні поняття: векторні величини", "Основні поняття: похибка вимірювань", "Кінематика: механічний рух", "Кінематика: матеріальна точка", "Кінематика: система відліку", "Кінематика: траєкторія", "Кінематика: шлях", "Кінематика: переміщення", "Кінематика: швидкість", "Кінематика: середня швидкість", "Кінематика: миттєва швидкість", "Кінематика: рівномірний рух", "Кінематика: нерівномірний рух", "Кінематика: прискорення", "Кінематика: рівноприскорений рух", "Кінематика: вільне падіння", "Кінематика: рух по колу", "Кінематика: період", "Кінематика: частота", "Кінематика: кутова швидкість", "Динаміка: інерція", "Динаміка: маса", "Динаміка: сила", "Динаміка: рівнодійна сил", "Динаміка: закони Ньютона", "Динаміка: сила тяжіння", "Динаміка: сила пружності", "Динаміка: закон Гука", "Динаміка: сила тертя", "Динаміка: сила реакції опори", "Динаміка: вага тіла", "Динаміка: імпульс сили", "Закони збереження: імпульс тіла", "Закони збереження: закон збереження імпульсу", "Закони збереження: реактивний рух", "Робота і енергія: механічна робота", "Робота і енергія: потужність", "Робота і енергія: ККД", "Робота і енергія: кінетична енергія", "Робота і енергія: потенціальна енергія", "Робота і енергія: закон збереження механічної енергії", "Статика: момент сили", "Статика: умови рівноваги", "Статика: центр мас"] },
      { name: "Молекулярна фізика", difficulty: 5, importance: 6, subtopics: ["молекулярно-кінетична теорія", "атом", "молекула", "кількість речовини", "моль", "число Авогадро", "ідеальний газ", "тиск газу", "температура", "абсолютна температура", "рівняння стану ідеального газу", "ізотермічний процес", "ізобарний процес", "ізохорний процес", "внутрішня енергія", "кількість теплоти", "теплоємність", "питома теплоємність", "питома теплота плавлення", "питома теплота пароутворення", "теплові двигуни", "ККД теплового двигуна"] },
      { name: "Термодинаміка", difficulty: 5, importance: 6, subtopics: ["перший закон термодинаміки", "робота газу", "теплові процеси", "необоротність процесів", "другий закон термодинаміки"] },
      { name: "Електродинаміка", difficulty: 5, importance: 6, subtopics: ["Електростатика: електричний заряд", "Електростатика: закон Кулона", "Електростатика: електричне поле", "Електростатика: напруженість", "Електростатика: потенціал", "Електростатика: напруга", "Електростатика: електроємність", "Електростатика: конденсатор", "Електростатика: енергія електричного поля", "Постійний струм: електричний струм", "Постійний струм: сила струму", "Постійний струм: густина струму", "Постійний струм: опір", "Постійний струм: питомий опір", "Постійний струм: закон Ома", "Постійний струм: послідовне з'єднання", "Постійний струм: паралельне з'єднання", "Постійний струм: робота струму", "Постійний струм: потужність струму", "Постійний струм: закон Джоуля—Ленца", "Постійний струм: ЕРС", "Постійний струм: закон Ома для повного кола"] },
      { name: "Магнітне поле", difficulty: 5, importance: 6, subtopics: ["магнітне поле", "магнітна індукція", "сила Ампера", "сила Лоренца", "рух заряджених частинок", "електромагніт", "магнітні властивості речовини"] },
      { name: "Електромагнітна індукція", difficulty: 5, importance: 6, subtopics: ["явище електромагнітної індукції", "закон Фарадея", "правило Ленца", "самоіндукція", "індуктивність", "енергія магнітного поля"] },
      { name: "Коливання і хвилі", difficulty: 5, importance: 6, subtopics: ["Механічні коливання: гармонічні коливання", "Механічні коливання: амплітуда", "Механічні коливання: період", "Механічні коливання: частота", "Механічні коливання: маятники", "Механічні коливання: резонанс", "Механічні хвилі: поздовжні хвилі", "Механічні хвилі: поперечні хвилі", "Механічні хвилі: швидкість хвилі", "Механічні хвилі: довжина хвилі", "Механічні хвилі: звук", "Механічні хвилі: характеристики звуку", "Електромагнітні коливання: коливальний контур", "Електромагнітні коливання: змінний струм", "Електромагнітні коливання: генератор змінного струму", "Електромагнітні коливання: трансформатор", "Електромагнітні коливання: передача електроенергії"] },
      { name: "Оптика", difficulty: 5, importance: 6, subtopics: ["світло", "швидкість світла", "прямолінійне поширення світла", "відбивання", "заломлення", "повне внутрішнє відбивання", "дисперсія світла", "інтерференція", "дифракція", "поляризація", "лінзи", "оптична сила", "дзеркала", "око", "оптичні прилади"] },
      { name: "Квантова фізика", difficulty: 5, importance: 6, subtopics: ["квант", "фотон", "фотоефект", "рівняння Ейнштейна", "модель атома", "спектри", "випромінювання", "лазер"] },
      { name: "Атомна фізика", difficulty: 5, importance: 6, subtopics: ["будова атома", "модель Бора", "енергетичні рівні", "ізотопи", "іонізація"] },
      { name: "Ядерна фізика", difficulty: 5, importance: 6, subtopics: ["атомне ядро", "протон", "нейтрон", "нуклони", "дефект мас", "енергія зв'язку", "радіоактивність", "альфа-випромінювання", "бета-випромінювання", "гамма-випромінювання", "період напіврозпаду", "ядерні реакції", "поділ ядер", "термоядерний синтез", "ядерна енергетика", "дозиметрія", "радіаційна безпека"] },
      { name: "Астрономічні елементи", difficulty: 5, importance: 6, subtopics: ["Сонячна система", "планети", "зорі", "галактики", "Всесвіт", "закони Кеплера", "закон всесвітнього тяжіння"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Біологія", aliases: ["Биология", "Biology", "Bio", "біо", "био", "біологія", "биология"],
    topics: [
      { name: "Вступ до біології", difficulty: 5, importance: 6, subtopics: ["біологія як наука", "методи біологічних досліджень", "рівні організації живої природи", "основні властивості живого", "науковий метод", "біологічні науки", "значення біології"] },
      { name: "Хімічний склад клітини", difficulty: 5, importance: 6, subtopics: ["неорганічні речовини", "вода", "мінеральні солі", "органічні речовини", "білки", "амінокислоти", "вуглеводи", "ліпіди", "жири", "нуклеїнові кислоти", "АТФ", "ферменти", "вітаміни"] },
      { name: "Клітина", difficulty: 5, importance: 6, subtopics: ["клітинна теорія", "прокаріоти", "еукаріоти", "будова клітини", "плазматична мембрана", "цитоплазма", "ядро", "рибосоми", "мітохондрії", "пластиди", "хлоропласти", "вакуолі", "ендоплазматична сітка", "комплекс Гольджі", "лізосоми", "клітинний центр", "цитоскелет", "клітинні включення"] },
      { name: "Обмін речовин", difficulty: 5, importance: 6, subtopics: ["метаболізм", "анаболізм", "катаболізм", "фотосинтез", "світлова фаза", "темнова фаза", "хемосинтез", "клітинне дихання", "гліколіз", "цикл Кребса", "окисне фосфорилювання", "енергетичний обмін"] },
      { name: "Розмноження клітин", difficulty: 5, importance: 6, subtopics: ["клітинний цикл", "інтерфаза", "мітоз", "мейоз", "амітоз", "апоптоз"] },
      { name: "Генетика", difficulty: 5, importance: 6, subtopics: ["спадковість", "мінливість", "ген", "алель", "домінантність", "рецесивність", "генотип", "фенотип", "гомозигота", "гетерозигота", "закони Менделя", "моногібридне схрещування", "дигібридне схрещування", "аналізуюче схрещування", "зчеплене успадкування", "кросинговер", "генетика статі", "мутації", "геном", "каріотип", "генетичні хвороби", "селекція", "біотехнологія", "генна інженерія"] },
      { name: "Молекулярна біологія", difficulty: 5, importance: 6, subtopics: ["ДНК", "РНК", "реплікація", "транскрипція", "трансляція", "генетичний код", "синтез білка", "регуляція експресії генів"] },
      { name: "Еволюція", difficulty: 5, importance: 6, subtopics: ["походження життя", "теорії виникнення життя", "еволюція", "природний добір", "штучний добір", "боротьба за існування", "адаптації", "вид", "популяція", "мікроеволюція", "макроеволюція", "видоутворення", "докази еволюції", "Чарльз Дарвін", "сучасна синтетична теорія еволюції"] },
      { name: "Біорізноманіття", difficulty: 5, importance: 6, subtopics: ["систематика", "таксономія", "домени", "царства", "бактерії", "археї", "протисти", "гриби", "рослини", "тварини", "віруси"] },
      { name: "Бактерії та віруси", difficulty: 5, importance: 6, subtopics: ["будова бактерій", "форми бактерій", "розмноження бактерій", "роль бактерій", "патогенні бактерії", "будова вірусів", "життєвий цикл вірусів", "профілактика вірусних захворювань"] },
      { name: "Гриби", difficulty: 5, importance: 6, subtopics: ["будова грибів", "міцелій", "шапинкові гриби", "цвілеві гриби", "дріжджі", "паразитичні гриби", "значення грибів"] },
      { name: "Рослини", difficulty: 5, importance: 6, subtopics: ["тканини рослин", "органи рослин", "корінь", "пагін", "стебло", "листок", "квітка", "насіння", "плід", "водорості", "мохи", "папороті", "голонасінні", "покритонасінні", "фотосинтез", "транспірація", "мінеральне живлення", "запилення", "запліднення", "життєві цикли рослин"] },
      { name: "Тварини", difficulty: 5, importance: 6, subtopics: ["тканини тварин", "органи", "системи органів", "губки", "кишковопорожнинні", "плоскі черви", "круглі черви", "кільчасті черви", "молюски", "членистоногі", "риби", "земноводні", "плазуни", "птахи", "ссавці"] },
      { name: "Організм людини", difficulty: 5, importance: 6, subtopics: ["Опорно-рухова система: кістки", "Опорно-рухова система: суглоби", "Опорно-рухова система: м'язи", "Кров: склад крові", "Кров: еритроцити", "Кров: лейкоцити", "Кров: тромбоцити", "Кров: групи крові", "Кров: імунітет", "Кровообіг: серце", "Кровообіг: судини", "Кровообіг: велике коло кровообігу", "Кровообіг: мале коло кровообігу", "Дихальна система: легені", "Дихальна система: газообмін", "Травна система: органи травлення", "Травна система: травні ферменти", "Видільна система: нирки", "Видільна система: нефрон", "Нервова система: нейрон", "Нервова система: головний мозок", "Нервова система: спинний мозок", "Нервова система: рефлекс", "Ендокринна система: гормони", "Ендокринна система: залози внутрішньої секреції", "Органи чуття: зір", "Органи чуття: слух", "Органи чуття: нюх", "Органи чуття: смак", "Органи чуття: дотик", "Розмноження людини: статева система", "Розмноження людини: ембріональний розвиток"] },
      { name: "Екологія", difficulty: 5, importance: 6, subtopics: ["екологічні фактори", "екосистема", "біоценоз", "біотоп", "популяція", "біосфера", "ланцюги живлення", "трофічні рівні", "колообіг речовин", "потік енергії", "сукцесії", "природоохоронні території", "Червона книга України", "глобальні екологічні проблеми", "сталий розвиток"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Хімія", aliases: ["Химия", "Chemistry", "Chem", "хім", "хим", "хімія", "химия"],
    topics: [
      { name: "Основні поняття хімії", difficulty: 5, importance: 6, subtopics: ["хімія як наука", "речовина", "фізичне тіло", "атом", "молекула", "хімічний елемент", "проста речовина", "складна речовина", "відносна атомна маса", "відносна молекулярна маса", "кількість речовини", "моль", "число Авогадро", "молярна маса", "масова частка елемента", "валентність", "ступінь окиснення", "закон збереження маси", "закон сталості складу", "закон Авогадро"] },
      { name: "Будова атома", difficulty: 5, importance: 6, subtopics: ["модель атома", "ядро", "протон", "нейтрон", "електрон", "ізотопи", "електронні оболонки", "енергетичні рівні", "електронна конфігурація", "періодичний закон", "Періодична система Менделєєва", "періоди", "групи", "радіус атома", "електронегативність"] },
      { name: "Хімічний зв'язок", difficulty: 5, importance: 6, subtopics: ["ковалентний зв'язок", "неполярний зв'язок", "полярний зв'язок", "йонний зв'язок", "металічний зв'язок", "водневий зв'язок", "кристалічні ґратки", "молекулярні речовини", "атомні речовини", "йонні речовини", "металічні речовини"] },
      { name: "Хімічні реакції", difficulty: 5, importance: 6, subtopics: ["ознаки реакцій", "рівняння реакцій", "коефіцієнти", "типи реакцій", "реакції сполучення", "реакції розкладу", "реакції заміщення", "реакції обміну", "оборотні реакції", "необоротні реакції", "тепловий ефект реакції", "екзотермічні реакції", "ендотермічні реакції", "швидкість реакції", "каталіз", "каталізатор", "хімічна рівновага"] },
      { name: "Неорганічні сполуки", difficulty: 5, importance: 6, subtopics: ["Оксиди: основні оксиди", "Оксиди: кислотні оксиди", "Оксиди: амфотерні оксиди", "Основи: луги", "Основи: нерозчинні основи", "Кислоти: безоксигенові", "Кислоти: оксигеновмісні", "Солі: середні", "Солі: кислі", "Солі: основні"] },
      { name: "Розчини", difficulty: 5, importance: 6, subtopics: ["розчин", "розчинник", "розчинена речовина", "масова частка", "молярна концентрація", "розчинність", "насичені розчини", "ненасичені розчини", "електроліти", "неелектроліти", "електролітична дисоціація", "сильні електроліти", "слабкі електроліти", "йонні рівняння"] },
      { name: "Окисно-відновні реакції", difficulty: 5, importance: 6, subtopics: ["окиснення", "відновлення", "окисник", "відновник", "електронний баланс"] },
      { name: "Неметали", difficulty: 5, importance: 6, subtopics: ["Гідроген", "Оксиген", "Озон", "Вода", "Галогени", "Хлор", "Бром", "Йод", "Сульфур", "Сірководень", "Сірчана кислота", "Нітроген", "Амоніак", "Нітратна кислота", "Фосфор", "Карбон", "Вуглекислий газ", "Кремній"] },
      { name: "Метали", difficulty: 5, importance: 6, subtopics: ["Натрій", "Калій", "Кальцій", "Магній", "Алюміній", "Ферум", "Мідь", "Цинк", "активність металів", "ряд активності металів", "корозія", "способи захисту від корозії"] },
      { name: "Органічна хімія", difficulty: 5, importance: 6, subtopics: ["Основні поняття: органічні речовини", "Основні поняття: ізомерія", "Основні поняття: гомологія", "Вуглеводні: алкани", "Вуглеводні: алкени", "Вуглеводні: алкіни", "Вуглеводні: арени", "Кисневмісні сполуки: спирти", "Кисневмісні сполуки: фенол", "Кисневмісні сполуки: альдегіди", "Кисневмісні сполуки: карбонові кислоти", "Кисневмісні сполуки: естери", "Кисневмісні сполуки: жири", "Вуглеводи: глюкоза", "Вуглеводи: фруктоза", "Вуглеводи: сахароза", "Вуглеводи: крохмаль", "Вуглеводи: целюлоза", "Нітрогеновмісні сполуки: аміни", "Нітрогеновмісні сполуки: амінокислоти", "Нітрогеновмісні сполуки: білки", "Полімери: поліетилен", "Полімери: поліпропілен", "Полімери: пластмаси", "Полімери: каучук", "Полімери: гума", "Полімери: синтетичні волокна"] },
      { name: "Біологічно важливі речовини", difficulty: 5, importance: 6, subtopics: ["білки", "жири", "вуглеводи", "нуклеїнові кислоти", "ферменти", "вітаміни", "гормони"] },
      { name: "Хімія і життя", difficulty: 5, importance: 6, subtopics: ["хімічне виробництво", "добрива", "паливо", "нафта", "природний газ", "кам'яне вугілля", "полімерні матеріали", "побутова хімія", "охорона довкілля", "зелена хімія", "екологічні проблеми", "правила безпеки під час роботи з речовинами"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Українська література", aliases: ["Украинская литература", "Ukrainian Literature", "Literature", "література", "литература", "укрліт", "літ", "лит"],
    topics: [
      { name: "Усна народна творчість", difficulty: 5, importance: 6, subtopics: ["історичні пісні", "народні думи", "балади", "календарно-обрядові пісні", "родинно-побутові пісні", "суспільно-побутові пісні", "колядки", "щедрівки", "веснянки", "купальські пісні", "жниварські пісні", "Обов'язкові твори: «Ой Морозе, Морозенку»", "Обов'язкові твори: «Чи не той то Хміль»", "Обов'язкові твори: «Зажурилась Україна»", "Обов'язкові твори: «Віють вітри»", "Обов'язкові твори: «Дума про Марусю Богуславку»"] },
      { name: "Давня українська література", difficulty: 5, importance: 6, subtopics: ["«Повість минулих літ»", "«Слово про похід Ігорів»", "українське бароко", "полемічна література"] },
      { name: "Григорій Сковорода", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "філософські погляди", "«De Libertate»", "«Всякому місту — звичай і права»", "«Бджола та Шершень»"] },
      { name: "Іван Котляревський", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Енеїда»", "«Наталка Полтавка»"] },
      { name: "Григорій Квітка-Основ'яненко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Маруся»"] },
      { name: "Тарас Шевченко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Катерина»", "«Кавказ»", "«Сон»", "«І мертвим, і живим...»", "«Заповіт»", "«Доля»", "«Розрита могила»"] },
      { name: "Пантелеймон Куліш", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Чорна рада»"] },
      { name: "Марко Вовчок", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Інститутка»"] },
      { name: "Іван Нечуй-Левицький", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Кайдашева сім'я»"] },
      { name: "Панас Мирний", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Хіба ревуть воли, як ясла повні?»"] },
      { name: "Іван Карпенко-Карий", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Мартин Боруля»"] },
      { name: "Іван Франко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Захар Беркут»", "«Мойсей»", "«Чого являєшся мені у сні?»", "«Гімн»"] },
      { name: "Михайло Коцюбинський", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Тіні забутих предків»", "«Intermezzo»"] },
      { name: "Ольга Кобилянська", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Valse mélancolique»", "«Земля»"] },
      { name: "Василь Стефаник", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Камінний хрест»"] },
      { name: "Леся Українка", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Лісова пісня»", "«Contra spem spero!»", "«Стояла я і слухала весну»"] },
      { name: "Володимир Винниченко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Момент»"] },
      { name: "Микола Хвильовий", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Я (Романтика)»"] },
      { name: "Юрій Яновський", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Майстер корабля»"] },
      { name: "Валер'ян Підмогильний", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Місто»"] },
      { name: "Остап Вишня", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Моя автобіографія»"] },
      { name: "Микола Куліш", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Мина Мазайло»"] },
      { name: "Олександр Довженко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Зачарована Десна»"] },
      { name: "Андрій Малишко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Пісня про рушник»"] },
      { name: "Василь Симоненко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Ти знаєш, що ти — людина?»", "«Лебеді материнства»"] },
      { name: "Ліна Костенко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Страшні слова, коли вони мовчать»", "«Маруся Чурай»"] },
      { name: "Дмитро Павличко", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Два кольори»"] },
      { name: "Іван Драч", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Балада про соняшник»"] },
      { name: "Василь Стус", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Господи, гніву пречистого»", "«Як добре те, що смерті не боюсь я»"] },
      { name: "Олесь Гончар", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Собор»"] },
      { name: "Григір Тютюнник", difficulty: 5, importance: 6, subtopics: ["життя і творчість", "«Три зозулі з поклоном»"] },
      { name: "Сучасна українська література", difficulty: 5, importance: 6, subtopics: ["Іван Багряний — «Тигролови»", "Юрій Андрухович (огляд)", "Сергій Жадан (огляд)", "сучасний літературний процес"] },
      { name: "Теорія літератури", difficulty: 5, importance: 6, subtopics: ["художній образ", "тема", "ідея", "композиція", "сюжет", "фабула", "конфлікт", "пролог", "епілог", "портрет", "пейзаж", "інтер'єр", "автор", "оповідач", "ліричний герой", "персонаж", "герой", "характер", "символ", "алегорія", "підтекст", "художня деталь", "метафора", "епітет", "порівняння", "персоніфікація", "гіпербола", "літота", "іронія", "сарказм", "антитеза", "оксиморон", "анафора", "епіфора", "риторичне питання", "риторичний оклик", "інверсія", "повтор"] },
      { name: "Літературні напрями", difficulty: 5, importance: 6, subtopics: ["бароко", "класицизм", "сентименталізм", "романтизм", "реалізм", "модернізм", "імпресіонізм", "експресіонізм", "неоромантизм", "символізм", "футуризм", "авангардизм", "постмодернізм"] },
      { name: "Жанри", difficulty: 5, importance: 6, subtopics: ["дума", "балада", "байка", "поема", "роман", "повість", "новела", "оповідання", "комедія", "трагедія", "драма", "лірика", "сонет", "елегія", "ода", "притча"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Німецька мова", aliases: ["Немецкий язык", "German", "Deutsch", "німецька", "немецкий", "нім", "нем"],
    topics: [
      { name: "Leseverstehen (Читання)", difficulty: 5, importance: 6, subtopics: ["розуміння основної ідеї тексту", "пошук конкретної інформації", "встановлення відповідності", "логічна послідовність", "висновки за текстом", "значення слова за контекстом", "визначення теми", "визначення мети автора", "аналіз структури тексту"] },
      { name: "Wortschatz (Лексика)", difficulty: 5, importance: 6, subtopics: ["Familie", "Freunde", "Persönlichkeit", "Alltag", "Tagesablauf", "Wohnen", "Essen und Trinken", "Einkaufen", "Kleidung", "Gesundheit", "Sport", "Freizeit", "Hobbys", "Reisen", "Ferien", "Verkehr", "Natur", "Umwelt", "Wetter", "Schule", "Bildung", "Studium", "Berufe", "Arbeit", "Medien", "Kommunikation", "Computer", "Internet", "Wissenschaft", "Kultur", "Kunst", "Musik", "Kino", "Bücher", "Deutschland", "Österreich", "Schweiz", "Ukraine"] },
      { name: "Grammatik", difficulty: 5, importance: 6, subtopics: ["Іменник: рід", "Іменник: множина", "Іменник: відмінки", "Іменник: артиклі", "Артиклі: der", "Артиклі: die", "Артиклі: das", "Артиклі: ein", "Артиклі: eine", "Артиклі: kein", "Займенники: особові", "Займенники: присвійні", "Займенники: вказівні", "Займенники: відносні", "Займенники: неозначені", "Займенники: питальні", "Прикметники: відмінювання", "Прикметники: ступені порівняння", "Прийменники: Akkusativ", "Прийменники: Dativ", "Прийменники: Genitiv", "Прийменники: Wechselpräpositionen", "Дієслово: Präsens", "Дієслово: Präteritum", "Дієслово: Perfekt", "Дієслово: Plusquamperfekt", "Дієслово: Futur I", "Модальні дієслова: können", "Модальні дієслова: müssen", "Модальні дієслова: dürfen", "Модальні дієслова: sollen", "Модальні дієслова: wollen", "Модальні дієслова: mögen", "Порядок слів: Hauptsatz", "Порядок слів: Nebensatz", "Сполучники: und", "Сполучники: aber", "Сполучники: denn", "Сполучники: weil", "Сполучники: dass", "Сполучники: obwohl", "Сполучники: wenn", "Заперечення: nicht", "Заперечення: kein"] },
      { name: "Wortbildung", difficulty: 5, importance: 6, subtopics: ["префікси", "суфікси", "складні слова", "словотворення"] },
      { name: "Kommunikation", difficulty: 5, importance: 6, subtopics: ["знайомство", "прохання", "запрошення", "вибачення", "порада", "згода", "незгода", "висловлення думки", "вподобання"] },
      { name: "Типи текстів", difficulty: 5, importance: 6, subtopics: ["лист", "email", "оголошення", "повідомлення", "стаття", "блог", "інструкція", "реклама"] },
      { name: "Екзаменаційні завдання", difficulty: 5, importance: 6, subtopics: ["Multiple Choice", "Matching", "Gap Filling", "Reading for Gist", "Reading for Detail", "Vocabulary", "Grammar", "Word Formation"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Французька мова", aliases: ["Французский язык", "French", "Français", "французька", "французский", "франц", "фр"],
    topics: [
      { name: "Compréhension écrite (Читання)", difficulty: 5, importance: 6, subtopics: ["розуміння основної ідеї тексту", "пошук конкретної інформації", "встановлення відповідності", "логічна послідовність", "визначення теми", "визначення мети автора", "висновки за текстом", "значення слова за контекстом", "аналіз структури тексту"] },
      { name: "Vocabulaire (Лексика)", difficulty: 5, importance: 6, subtopics: ["La famille", "Les amis", "La personnalité", "La vie quotidienne", "La maison", "Les repas", "Les boissons", "Les vêtements", "Les achats", "Les loisirs", "Les sports", "Les voyages", "Les vacances", "Les transports", "La nature", "L'environnement", "Le temps", "L'école", "L'éducation", "Les professions", "Le travail", "Les médias", "L'Internet", "La technologie", "La science", "La culture", "L'art", "La musique", "Le cinéma", "Les livres", "La France", "Les pays francophones", "L'Ukraine"] },
      { name: "Grammaire", difficulty: 5, importance: 6, subtopics: ["Іменник: рід", "Іменник: множина", "Артиклі: défini", "Артиклі: indéfini", "Артиклі: partitif", "Займенники: personnels", "Займенники: possessifs", "Займенники: démonstratifs", "Займенники: relatifs", "Займенники: interrogatifs", "Займенники: indéfinis", "Прикметники: узгодження", "Прикметники: ступені порівняння", "Заперечення: ne...pas", "Заперечення: ne...jamais", "Заперечення: ne...plus", "Заперечення: ne...rien", "Заперечення: ne...personne"] },
      { name: "Formation des mots", difficulty: 5, importance: 6, subtopics: ["префікси", "суфікси", "словотворення", "похідні слова"] },
      { name: "Communication", difficulty: 5, importance: 6, subtopics: ["знайомство", "прохання", "запрошення", "вибачення", "порада", "згода", "незгода", "висловлення думки", "побажання", "опис людей", "опис місць"] },
      { name: "Типи текстів", difficulty: 5, importance: 6, subtopics: ["lettre", "e-mail", "article", "publicité", "annonce", "message", "blog", "récit", "notice", "instructions"] },
      { name: "Формати завдань", difficulty: 5, importance: 6, subtopics: ["Multiple Choice", "Matching", "Gap Filling", "Reading for Gist", "Reading for Detail", "Vocabulary", "Grammar", "Word Formation"] },
    ],
    source: "official",
  },
  {
    countryId: "ua", educationSystemId: "k12", qualificationId: "nmt", board: null, specVersion: "2026",
    subject: "Іспанська мова", aliases: ["Испанский язык", "Spanish", "Español", "іспанська", "испанский", "ісп", "исп"],
    topics: [
      { name: "Comprensión de lectura (Читання)", difficulty: 5, importance: 6, subtopics: ["розуміння основної думки тексту", "визначення теми", "визначення мети автора", "пошук конкретної інформації", "встановлення відповідності", "логічна послідовність", "розуміння деталей", "висновки за змістом", "значення слова за контекстом", "аналіз структури тексту"] },
      { name: "Vocabulario (Лексика)", difficulty: 5, importance: 6, subtopics: ["La familia", "Los amigos", "La personalidad", "La vida cotidiana", "La casa", "La comida", "Las bebidas", "La ropa", "Las compras", "La salud", "El deporte", "Los pasatiempos", "El ocio", "Los viajes", "Las vacaciones", "El transporte", "La naturaleza", "El medio ambiente", "El clima", "La escuela", "La educación", "La universidad", "Las profesiones", "El trabajo", "La comunicación", "Los medios de comunicación", "La tecnología", "La informática", "La ciencia", "La cultura", "El arte", "La música", "El cine", "Los libros", "España", "América Latina", "Ucrania"] },
      { name: "Gramática", difficulty: 5, importance: 6, subtopics: ["Іменник: рід", "Іменник: число", "Артиклі: definidos", "Артиклі: indefinidos", "Займенники: personales", "Займенники: posesivos", "Займенники: demostrativos", "Займенники: relativos", "Займенники: interrogativos", "Займенники: indefinidos", "Прикметники: узгодження", "Прикметники: ступені порівняння"] },
      { name: "Formación de palabras", difficulty: 5, importance: 6, subtopics: ["префікси", "суфікси", "словотворення", "складні слова", "похідні слова"] },
      { name: "Comunicación", difficulty: 5, importance: 6, subtopics: ["знайомство", "прохання", "порада", "запрошення", "вибачення", "подяка", "згода", "незгода", "висловлення думки", "опис людей", "опис предметів", "опис місць", "висловлення емоцій", "плани на майбутнє"] },
      { name: "Типи текстів", difficulty: 5, importance: 6, subtopics: ["carta", "correo electrónico", "anuncio", "artículo", "mensaje", "blog", "historia", "instrucciones", "publicidad", "noticia"] },
      { name: "Формати завдань", difficulty: 5, importance: 6, subtopics: ["Multiple Choice", "Matching", "Gap Filling", "Reading for Gist", "Reading for Detail", "Vocabulary", "Grammar", "Word Formation"] },
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
  // NMT is a FIXED catalogue — all 12 official subjects are fully seeded in
  // CURRICULUM_SEED above (Ukrainian canonical names, full topic lists). No
  // AI-fallback list needed; leaving this empty prevents duplicate search
  // entries (English name here vs. Ukrainian name in the seed).
  nmt: [],
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
