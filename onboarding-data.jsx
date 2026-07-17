// AI Exam Coach — onboarding data model: exam types, dynamic grading, prefs, copy

// ─── Exam types & dynamic grading ──────────────────────────────────────────────
// kind: "scale"  → ordered list of grade labels (best→worst), pick via segmented buttons
// kind: "score"  → numeric range, pick via slider (min/max/step/suffix)
const EXAM_TYPES = [
  { id: "gcse",   label: "GCSE",       emoji: "🇬🇧", blurb: { en: "9–1 grading", uk: "Оцінки 9–1", ru: "Оценки 9–1", fr: "Notation 9–1", de: "Notenskala 9–1" }, board: "AQA",
    boardOptions: ["AQA", "Edexcel", "OCR", "WJEC"], educationSystemId: "k12",
    grade: { kind: "scale", options: ["9","8","7","6","5","4","3"], current: "6", target: "8" } },
  { id: "alevel", label: "A-Level",    emoji: "🇬🇧", blurb: { en: "A*–E grading", uk: "Оцінки A*–E", ru: "Оценки A*–E", fr: "Notation A*–E", de: "Notenskala A*–E" }, board: "AQA",
    boardOptions: ["AQA", "Edexcel", "OCR", "WJEC"], educationSystemId: "k12",
    grade: { kind: "scale", options: ["A*","A","B","C","D","E"], current: "B", target: "A" } },
  { id: "sat",    label: "SAT",        emoji: "🇺🇸", blurb: { en: "400–1600", uk: "400–1600", ru: "400–1600", fr: "400–1600", de: "400–1600" }, board: "College Board", educationSystemId: "k12",
    grade: { kind: "score", min: 400, max: 1600, step: 10, current: 1180, target: 1450 } },
  { id: "act",    label: "ACT",        emoji: "🇺🇸", blurb: { en: "Composite 1–36", uk: "Композит 1–36", ru: "Композит 1–36", fr: "Composite 1–36", de: "Gesamt 1–36" }, board: "ACT, Inc.", educationSystemId: "k12",
    grade: { kind: "score", min: 1, max: 36, step: 1, current: 26, target: 32 } },
  { id: "ap",     label: "AP",         emoji: "🇺🇸", blurb: { en: "Advanced Placement 1–5", uk: "Advanced Placement 1–5", ru: "Advanced Placement 1–5", fr: "Advanced Placement 1–5", de: "Advanced Placement 1–5" }, board: "College Board", educationSystemId: "k12",
    grade: { kind: "scale", options: ["5","4","3","2","1"], current: "3", target: "5" } },
  { id: "ib",     label: "IB",         emoji: "🌍", blurb: { en: "Diploma 1–7 / 45", uk: "Диплом 1–7 / 45", ru: "Диплом 1–7 / 45", fr: "Diplôme 1–7 / 45", de: "Diplom 1–7 / 45" }, board: "Int. Baccalaureate", educationSystemId: "k12",
    grade: { kind: "scale", options: ["7","6","5","4","3","2"], current: "4", target: "6" } },
  { id: "nmt",    label: "NMT",        emoji: "🇺🇦", blurb: { en: "NMT · 100–200", uk: "НМТ · 100–200", ru: "НМТ · 100–200", fr: "NMT · 100–200", de: "NMT · 100–200" }, board: "UCEQA", educationSystemId: "k12",
    grade: { kind: "score", min: 100, max: 200, step: 1, current: 145, target: 180 } },
  { id: "matura", label: "Matura",     emoji: "🇵🇱", blurb: { en: "0–100%", uk: "0–100%", ru: "0–100%", fr: "0–100%", de: "0–100%" }, board: "CKE", educationSystemId: "k12",
    grade: { kind: "score", min: 0, max: 100, step: 1, suffix: "%", current: 60, target: 85 } },
  { id: "abitur", label: "Abitur",     emoji: "🇩🇪", blurb: { en: "1.0 best → 4.0", uk: "1.0 найкраще → 4.0", ru: "1.0 лучшее → 4.0", fr: "1.0 meilleur → 4.0", de: "1,0 beste → 4,0" }, board: "KMK", educationSystemId: "k12",
    grade: { kind: "scale", options: ["1.0","1.3","1.7","2.0","2.3","2.7","3.0"], current: "2.3", target: "1.3" } },
  { id: "uni",    label: "University", emoji: "🎓", blurb: { en: "Degree classifications", uk: "Класифікації ступенів", ru: "Классификации степеней", fr: "Classifications de diplôme", de: "Abschlussklassen" }, board: "Custom modules", educationSystemId: "higher-ed",
    grade: { kind: "scale", options: ["1st","2:1","2:2","3rd","Pass"], current: "2:1", target: "1st" } },
  { id: "custom", label: "Custom",     emoji: "✏️", blurb: { en: "Set your own", uk: "Налаштуйте самі", ru: "Настройте сами", fr: "Personnalisé", de: "Selbst festlegen" }, board: "Any exam", educationSystemId: null,
    grade: { kind: "scale", options: ["A","B","C","D","Pass"], current: "C", target: "A" } },
];

function examType(id) { return EXAM_TYPES.find((e) => e.id === id) || EXAM_TYPES[1]; }

// ─── Study materials & learning preferences ────────────────────────────────────
const MATERIALS = [
  { id: "notes",      emoji: "📝", en: "Notes",        uk: "Конспекти",   ru: "Конспекты",     fr: "Notes",       de: "Notizen" },
  { id: "textbooks",  emoji: "📚", en: "Textbooks",    uk: "Підручники",  ru: "Учебники",      fr: "Manuels",     de: "Lehrbücher" },
  { id: "papers",     emoji: "📄", en: "Past papers",  uk: "Минулі тести",ru: "Прошлые тесты", fr: "Annales",     de: "Altklausuren" },
  { id: "pdfs",       emoji: "📑", en: "PDFs",         uk: "PDF",         ru: "PDF",           fr: "PDF",         de: "PDFs" },
  { id: "shots",      emoji: "🖼️", en: "Screenshots",  uk: "Скриншоти",   ru: "Скриншоты",     fr: "Captures",    de: "Screenshots" },
  { id: "slides",     emoji: "📊", en: "PowerPoints",  uk: "Презентації", ru: "Презентации",   fr: "Diaporamas",  de: "Folien" },
];
const PREFERENCES = [
  { id: "chat",   emoji: "🤖", en: "AI chat explanations", uk: "Пояснення AI-чату", ru: "Объяснения AI-чата", fr: "Explications par IA", de: "KI-Chat-Erklärungen" },
  { id: "cards",  emoji: "🃏", en: "Flashcards",           uk: "Флешкартки",        ru: "Флешкарты",          fr: "Cartes mémoire",      de: "Lernkarten" },
  { id: "quiz",   emoji: "✍️", en: "Practice questions",   uk: "Практичні питання", ru: "Практические вопросы",fr: "Questions pratiques", de: "Übungsfragen" },
  { id: "video",  emoji: "🎬", en: "Videos",               uk: "Відео",             ru: "Видео",              fr: "Vidéos",              de: "Videos" },
  { id: "recall", emoji: "🧠", en: "Active recall",        uk: "Активне пригадування",ru: "Активное припоминание",fr: "Rappel actif",       de: "Aktives Erinnern" },
  { id: "spaced", emoji: "🔁", en: "Spaced repetition",    uk: "Інтервальне повторення",ru: "Интервальное повторение",fr: "Répétition espacée",de: "Verteiltes Lernen" },
];

// ─── Timezones (GMT offsets, auto-detect friendly) ─────────────────────────────
const TIMEZONES = [
  { id: "-08", label: "GMT−8", place: "Los Angeles" },
  { id: "-05", label: "GMT−5", place: "New York" },
  { id: "+00", label: "GMT+0", place: "London" },
  { id: "+01", label: "GMT+1", place: "Paris · Berlin" },
  { id: "+02", label: "GMT+2", place: "Kyiv · Warsaw" },
  { id: "+03", label: "GMT+3", place: "Moscow · Istanbul" },
  { id: "+04", label: "GMT+4", place: "Dubai" },
  { id: "+05:30", label: "GMT+5:30", place: "India" },
  { id: "+08", label: "GMT+8", place: "Singapore" },
  { id: "+09", label: "GMT+9", place: "Tokyo · Seoul" },
  { id: "+10", label: "GMT+10", place: "Sydney" },
];
// Map a JS minute-offset to the nearest entry id; returns a label + place.
function detectTimezone() {
  const offMin = -new Date().getTimezoneOffset(); // east of GMT positive
  const hours = offMin / 60;
  const sign = hours < 0 ? "-" : "+";
  const abs = Math.abs(hours);
  const whole = Math.floor(abs);
  const frac = abs - whole;
  const want = sign + String(whole).padStart(2, "0") + (frac ? ":" + String(Math.round(frac * 60)).padStart(2, "0") : "");
  return TIMEZONES.find((z) => z.id === want) || TIMEZONES.find((z) => z.id === "+00");
}

// ─── Default subjects pre-filled in step 2 (per advisor demo) ──────────────────
const DEFAULT_SUBJECTS = [
  { id: "bio",  name: "Biology",   color: "var(--subject-indigo)" },
  { id: "chem", name: "Chemistry", color: "var(--subject-rose)" },
];

// ─── New onboarding copy, all five languages ───────────────────────────────────
const ONB = {
  en: {
    advisor: "Your AI advisor", greeting: "Hi 👋 I'm your study coach. A few quick questions and I'll build your plan.",
    step_of: (n, total) => `Step ${n} of ${total || 5}`,
    s1_title: "What are you preparing for?", s1_sub: "Pick your exam — I'll match the grading system to it.",
    s2_title: "Where are you right now?", s2_sub: "Be honest — I size your plan around the gap.",
    s2_add: "+ Add subject", s2_current: "Current", s2_target: "Target", s2_name_ph: "Subject name",
    s2_examdate: "Exam date", s2_topics: "Topics covered", s2_board: "Exam board",
    s3_title: "How many hours can you realistically study each week?", s3_sub: "I'll spread it across your subjects.",
    s3_hours: "hours / week",
    s4_title: "What can I work from?", s4_sub: "Upload anything — I'll read it and map your topics.",
    s4_upload: "Drop files or tap to upload", s4_upload_sub: "PDFs, screenshots, notes, slides, past papers",
    s4_materials: "I have", s4_prefs: "I learn best with",
    s5_title: "Your personalised plan", s5_sub: "Here's what I'd recommend. Tweak it, or accept and start.",
    settings_title: "Your study setup", settings_sub: "We'll reuse this for every exam you add.", settings_edit: "Edit", settings_done: "Done",
    analysing: "Analysing your materials…", building: "Building your roadmap…",
    accept: "Accept plan & start", finish_add: "Add exam", edit: "Edit plan",
    prob: "chance of target", sessions: "sessions / week", exam: "Exam",
    back: "Back", next: "Continue", close: "Close",
    forecast_locked: "Forecast unlocks after your first sessions",
    s2_days_per_week: "Days per week", s2_session_length: "Session length", s2_when_unavailable: "When are you unavailable?", all_day: "All",
    ai_estimate_link: "✨ Let AI estimate this for me", ai_estimate_title: "✨ Let AI estimate this",
    ai_estimate_sub: "Tell me about school, work, sports — anything that affects your free time.",
    ai_estimate_placeholder: "e.g. school 9-5, karate 7-11 on Tuesdays and Thursdays",
    cancel: "Cancel", thinking: "Thinking…", estimate: "Estimate", remove: "Remove",
    day_abbr: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
    period_abbr: { morning: "AM", afternoon: "PM", evening: "Eve" },
  },
  uk: {
    advisor: "Ваш AI-радник", greeting: "Привіт 👋 Я ваш навчальний коуч. Кілька питань — і я складу план.",
    step_of: (n, total) => `Крок ${n} з ${total || 5}`,
    s1_title: "До чого ви готуєтеся?", s1_sub: "Оберіть іспит — я підлаштую систему оцінювання.",
    s2_title: "Де ви зараз?", s2_sub: "Будьте чесні — я будую план навколо різниці.",
    s2_add: "+ Додати предмет", s2_current: "Зараз", s2_target: "Ціль", s2_name_ph: "Назва предмета",
    s2_examdate: "Дата іспиту", s2_topics: "Кількість тем", s2_board: "Екзаменаційна рада",
    s3_title: "Скільки годин на тиждень ти реально можеш навчатися?", s3_sub: "Я розподілю їх між предметами.",
    s3_hours: "год / тиждень",
    s4_title: "З чим мені працювати?", s4_sub: "Завантажте будь-що — я прочитаю й складу теми.",
    s4_upload: "Перетягніть файли або натисніть", s4_upload_sub: "PDF, скриншоти, конспекти, презентації, тести",
    s4_materials: "У мене є", s4_prefs: "Найкраще вчуся через",
    s5_title: "Ваш персональний план", s5_sub: "Ось що я раджу. Змініть або прийміть і почніть.",
    settings_title: "Ваші налаштування навчання", settings_sub: "Використаємо це для кожного нового іспиту.", settings_edit: "Редагувати", settings_done: "Готово",
    analysing: "Аналізую ваші матеріали…", building: "Будую ваш маршрут…",
    accept: "Прийняти план", finish_add: "Додати іспит", edit: "Змінити план",
    prob: "шанс на ціль", sessions: "сесій / тиждень", exam: "Іспит",
    back: "Назад", next: "Продовжити", close: "Закрити",
    forecast_locked: "Прогноз відкриється після перших сесій",
    s2_days_per_week: "Днів на тиждень", s2_session_length: "Тривалість сесії", s2_when_unavailable: "Коли ви недоступні?", all_day: "Увесь день",
    ai_estimate_link: "✨ Нехай AI оцінить за мене", ai_estimate_title: "✨ Нехай AI оцінить це",
    ai_estimate_sub: "Розкажіть про навчання, роботу, спорт — усе, що впливає на ваш вільний час.",
    ai_estimate_placeholder: "напр. школа 9-17, карате 19-23 у вівторок і четвер",
    cancel: "Скасувати", thinking: "Думаю…", estimate: "Оцінити", remove: "Видалити",
    day_abbr: { mon: "Пн", tue: "Вт", wed: "Ср", thu: "Чт", fri: "Пт", sat: "Сб", sun: "Нд" },
    period_abbr: { morning: "Ранок", afternoon: "День", evening: "Вечір" },
  },
  ru: {
    advisor: "Ваш AI-советник", greeting: "Привет 👋 Я ваш коуч по учёбе. Несколько вопросов — и план готов.",
    step_of: (n, total) => `Шаг ${n} из ${total || 5}`,
    s1_title: "К чему вы готовитесь?", s1_sub: "Выберите экзамен — я подберу систему оценок.",
    s2_title: "Где вы сейчас?", s2_sub: "Честно — я строю план вокруг разрыва.",
    s2_add: "+ Добавить предмет", s2_current: "Сейчас", s2_target: "Цель", s2_name_ph: "Название предмета",
    s2_examdate: "Дата экзамена", s2_topics: "Количество тем", s2_board: "Экзаменационная комиссия",
    s3_title: "Сколько часов в неделю ты реально можешь учиться?", s3_sub: "Я распределю их по предметам.",
    s3_hours: "ч / неделю",
    s4_title: "С чем мне работать?", s4_sub: "Загрузите что угодно — я прочитаю и составлю темы.",
    s4_upload: "Перетащите файлы или нажмите", s4_upload_sub: "PDF, скриншоты, конспекты, презентации, тесты",
    s4_materials: "У меня есть", s4_prefs: "Лучше всего учусь через",
    s5_title: "Ваш персональный план", s5_sub: "Вот что я рекомендую. Измените или примите и начните.",
    settings_title: "Ваши настройки учёбы", settings_sub: "Используем это для каждого нового экзамена.", settings_edit: "Изменить", settings_done: "Готово",
    analysing: "Анализирую материалы…", building: "Строю ваш маршрут…",
    accept: "Принять план", finish_add: "Добавить экзамен", edit: "Изменить план",
    prob: "шанс на цель", sessions: "сессий / неделю", exam: "Экзамен",
    back: "Назад", next: "Продолжить", close: "Закрыть",
    forecast_locked: "Прогноз откроется после первых сессий",
    s2_days_per_week: "Дней в неделю", s2_session_length: "Длительность сессии", s2_when_unavailable: "Когда вы недоступны?", all_day: "Весь день",
    ai_estimate_link: "✨ Пусть AI оценит за меня", ai_estimate_title: "✨ Пусть AI оценит это",
    ai_estimate_sub: "Расскажите об учёбе, работе, спорте — всё, что влияет на ваше свободное время.",
    ai_estimate_placeholder: "напр. учёба 9-17, карате 19-23 по вторникам и четвергам",
    cancel: "Отмена", thinking: "Думаю…", estimate: "Оценить", remove: "Удалить",
    day_abbr: { mon: "Пн", tue: "Вт", wed: "Ср", thu: "Чт", fri: "Пт", sat: "Сб", sun: "Вс" },
    period_abbr: { morning: "Утро", afternoon: "День", evening: "Вечер" },
  },
  fr: {
    advisor: "Votre conseiller IA", greeting: "Bonjour 👋 Je suis votre coach. Quelques questions et je crée votre plan.",
    step_of: (n, total) => `Étape ${n} sur ${total || 5}`,
    s1_title: "Pour quoi vous préparez-vous ?", s1_sub: "Choisissez l'examen — j'adapte la notation.",
    s2_title: "Où en êtes-vous ?", s2_sub: "Soyez honnête — je calibre sur l'écart.",
    s2_add: "+ Ajouter une matière", s2_current: "Actuel", s2_target: "Objectif", s2_name_ph: "Nom de la matière",
    s2_examdate: "Date de l'examen", s2_topics: "Nombre de sujets", s2_board: "Organisme d'examen",
    s3_title: "Combien d'heures par semaine peux-tu réalistement étudier ?", s3_sub: "Je les répartis entre tes matières.",
    s3_hours: "h / semaine",
    s4_title: "Sur quoi puis-je travailler ?", s4_sub: "Importez tout — je lis et je cartographie vos sujets.",
    s4_upload: "Déposez des fichiers ou cliquez", s4_upload_sub: "PDF, captures, notes, diapos, annales",
    s4_materials: "J'ai", s4_prefs: "J'apprends mieux avec",
    s5_title: "Votre plan personnalisé", s5_sub: "Voici ma recommandation. Ajustez ou acceptez.",
    settings_title: "Vos préférences d'étude", settings_sub: "Réutilisées pour chaque nouvel examen.", settings_edit: "Modifier", settings_done: "Terminé",
    analysing: "Analyse de vos documents…", building: "Création de votre feuille de route…",
    accept: "Accepter le plan", finish_add: "Ajouter un examen", edit: "Modifier le plan",
    prob: "chance d'objectif", sessions: "séances / semaine", exam: "Examen",
    back: "Retour", next: "Continuer", close: "Fermer",
    forecast_locked: "Les prévisions se débloquent après vos premières séances",
    s2_days_per_week: "Jours par semaine", s2_session_length: "Durée de la séance", s2_when_unavailable: "Quand n'êtes-vous pas disponible ?", all_day: "Tout",
    ai_estimate_link: "✨ Laissez l'IA estimer pour moi", ai_estimate_title: "✨ Laissez l'IA estimer cela",
    ai_estimate_sub: "Parlez-moi de l'école, du travail, du sport — tout ce qui affecte votre temps libre.",
    ai_estimate_placeholder: "ex. école 9h-17h, karaté 19h-23h les mardis et jeudis",
    cancel: "Annuler", thinking: "Réflexion…", estimate: "Estimer", remove: "Supprimer",
    day_abbr: { mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam", sun: "Dim" },
    period_abbr: { morning: "Matin", afternoon: "Après-midi", evening: "Soir" },
  },
  de: {
    advisor: "Dein KI-Berater", greeting: "Hallo 👋 Ich bin dein Lerncoach. Ein paar Fragen und dein Plan steht.",
    step_of: (n, total) => `Schritt ${n} von ${total || 5}`,
    s1_title: "Worauf bereitest du dich vor?", s1_sub: "Wähle die Prüfung — ich passe das Notensystem an.",
    s2_title: "Wo stehst du gerade?", s2_sub: "Ehrlich — ich plane um die Lücke herum.",
    s2_add: "+ Fach hinzufügen", s2_current: "Aktuell", s2_target: "Ziel", s2_name_ph: "Fachname",
    s2_examdate: "Prüfungsdatum", s2_topics: "Anzahl der Themen", s2_board: "Prüfungsausschuss",
    s3_title: "Wie viele Stunden pro Woche kannst du realistisch lernen?", s3_sub: "Ich verteile sie auf deine Fächer.",
    s3_hours: "Std / Woche",
    s4_title: "Womit kann ich arbeiten?", s4_sub: "Lade alles hoch — ich lese es und ordne deine Themen.",
    s4_upload: "Dateien ablegen oder tippen", s4_upload_sub: "PDFs, Screenshots, Notizen, Folien, Altklausuren",
    s4_materials: "Ich habe", s4_prefs: "Ich lerne am besten mit",
    s5_title: "Dein persönlicher Plan", s5_sub: "Das empfehle ich. Anpassen oder annehmen.",
    settings_title: "Deine Lerneinstellungen", settings_sub: "Wir verwenden dies für jede neue Prüfung.", settings_edit: "Bearbeiten", settings_done: "Fertig",
    analysing: "Analysiere deine Materialien…", building: "Erstelle deine Roadmap…",
    accept: "Plan annehmen", finish_add: "Prüfung hinzufügen", edit: "Plan bearbeiten",
    prob: "Zielchance", sessions: "Einheiten / Woche", exam: "Prüfung",
    back: "Zurück", next: "Weiter", close: "Schließen",
    forecast_locked: "Prognose wird nach deinen ersten Sitzungen freigeschaltet",
    s2_days_per_week: "Tage pro Woche", s2_session_length: "Sitzungsdauer", s2_when_unavailable: "Wann bist du nicht verfügbar?", all_day: "Ganzer Tag",
    ai_estimate_link: "✨ Lass die KI das für mich schätzen", ai_estimate_title: "✨ Lass die KI das schätzen",
    ai_estimate_sub: "Erzähl mir von Schule, Arbeit, Sport — alles, was deine Freizeit beeinflusst.",
    ai_estimate_placeholder: "z. B. Schule 9-17 Uhr, Karate 19-23 Uhr dienstags und donnerstags",
    cancel: "Abbrechen", thinking: "Denke nach…", estimate: "Schätzen", remove: "Entfernen",
    day_abbr: { mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa", sun: "So" },
    period_abbr: { morning: "Morgen", afternoon: "Nachmittag", evening: "Abend" },
  },
};

const COUNTRIES = [
  { id: "gb", en: "United Kingdom", uk: "Велика Британія", ru: "Великобритания", fr: "Royaume-Uni", de: "Vereinigtes Königreich", flag: "🇬🇧" },
  { id: "us", en: "United States", uk: "США", ru: "США", fr: "États-Unis", de: "USA", flag: "🇺🇸" },
  { id: "ua", en: "Ukraine", uk: "Україна", ru: "Украина", fr: "Ukraine", de: "Ukraine", flag: "🇺🇦" },
  { id: "pl", en: "Poland", uk: "Польща", ru: "Польша", fr: "Pologne", de: "Polen", flag: "🇵🇱" },
  { id: "de", en: "Germany", uk: "Німеччина", ru: "Германия", fr: "Allemagne", de: "Deutschland", flag: "🇩🇪" },
  { id: "fr", en: "France", uk: "Франція", ru: "Франция", fr: "France", de: "Frankreich", flag: "🇫🇷" },
  { id: "other", en: "Other", uk: "Інше", ru: "Другое", fr: "Autre", de: "Andere", flag: "🌍" },
];

const COUNTRY_TO_EXAM_TYPE = {
  gb: "alevel",
  us: "sat",
  ua: "nmt",
  pl: "matura",
  de: "abitur",
  fr: "ib",
  other: "custom",
};

const EDUCATION_LEVELS = [
  { id: "secondary", en: "Secondary school", uk: "Середня школа", ru: "Средняя школа", fr: "Collège/Lycée", de: "Sekundarschule" },
  { id: "sixth_form", en: "Sixth form / High school", uk: "Старша школа", ru: "Старшая школа", fr: "Terminale", de: "Oberstufe" },
  { id: "university", en: "University", uk: "Університет", ru: "Университет", fr: "Université", de: "Universität" },
  { id: "postgrad", en: "Postgraduate", uk: "Аспірантура", ru: "Аспирантура", fr: "Master/Doctorat", de: "Postgraduiert" },
  { id: "other", en: "Other", uk: "Інше", ru: "Другое", fr: "Autre", de: "Andere" },
];

// ─── Subject presets per exam type ─────────────────────────────────────────────
const SUBJECT_PRESETS = {
  gcse: ["Maths","English Language","English Literature","Biology","Chemistry","Physics","History","Geography","French","Spanish","German","Computer Science","Art & Design","Music","Business Studies","Drama","Religious Studies","Physical Education","Sociology","Economics"],
  alevel: ["Mathematics","Further Mathematics","English Literature","Biology","Chemistry","Physics","History","Geography","French","Spanish","German","Computer Science","Art & Design","Music","Business Studies","Economics","Psychology","Sociology","Law","Film Studies","Physical Education"],
  sat: ["Math","Reading & Writing"],
  act: ["Math","English","Reading","Science"],
  ap: ["AP Calculus AB","AP Calculus BC","AP Statistics","AP Physics 1","AP Physics C","AP Chemistry","AP Biology","AP Environmental Science","AP US History","AP World History","AP European History","AP English Language","AP English Literature","AP Computer Science A","AP Psychology","AP Economics (Micro)","AP Economics (Macro)","AP US Government","AP Spanish","AP French"],
  ib: ["Mathematics AA","Mathematics AI","Physics","Chemistry","Biology","Environmental Systems","History","Geography","Economics","English A","English B","Computer Science","Visual Arts","Psychology","Philosophy"],
  nmt: ["Українська мова","Математика","Історія України","Біологія","Хімія","Фізика","Географія","Англійська мова","Іноземна мова"],
  matura: ["Matematyka","Język polski","Język angielski","Biologia","Chemia","Fizyka","Historia","Geografia","Informatyka","Wiedza o społeczeństwie","Język niemiecki","Język rosyjski"],
  abitur: ["Mathematik","Deutsch","Englisch","Biologie","Chemie","Physik","Geschichte","Geographie","Informatik","Sozialkunde","Französisch","Kunst","Musik","Sport","Wirtschaft"],
  uni: ["Mathematics","Physics","Chemistry","Biology","Computer Science","Economics","Psychology","History","English Literature","Philosophy","Sociology","Political Science","Law","Business Administration","Accounting","Finance","Marketing","Engineering","Medicine","Nursing","Architecture","Statistics","Linguistics","Geography","Environmental Science","Art History","Music"],
  custom: [],
};

// ─── University year options ────────────────────────────────────────────────────
const UNIVERSITY_YEARS = [
  { id: "year1", en: "1st year", uk: "1 курс", ru: "1 курс", fr: "1ère année", de: "1. Jahr", suggested: true },
  { id: "year2", en: "2nd year", uk: "2 курс", ru: "2 курс", fr: "2ème année", de: "2. Jahr" },
  { id: "year3", en: "3rd year", uk: "3 курс", ru: "3 курс", fr: "3ème année", de: "3. Jahr" },
  { id: "year4", en: "4th year", uk: "4 курс", ru: "4 курс", fr: "4ème année", de: "4. Jahr" },
  { id: "masters", en: "Masters", uk: "Магістратура", ru: "Магистратура", fr: "Master", de: "Master" },
  { id: "phd", en: "PhD", uk: "Аспірантура", ru: "Аспирантура", fr: "Doctorat", de: "Promotion" },
];

// ─── Study intensity presets ────────────────────────────────────────────────────
const INTENSITY_PRESETS = [
  { id: "minimal",   emoji: "🌱",
    label: { en: "Minimal", uk: "Мінімум", ru: "Минимум", fr: "Minimal", de: "Minimal" },
    blurb: { en: "Light revision, weekdays only", uk: "Легке повторення, лише будні", ru: "Лёгкое повторение, только будни", fr: "Révision légère, jours de semaine uniquement", de: "Leichte Wiederholung, nur Wochentage" },
    multiplier: 0.7 },
  { id: "balanced",  emoji: "⚖️",
    label: { en: "Balanced", uk: "Збалансовано", ru: "Сбалансированно", fr: "Équilibré", de: "Ausgewogen" },
    blurb: { en: "Steady pace, 5 days/week", uk: "Стабільний темп, 5 днів/тиждень", ru: "Стабильный темп, 5 дней/неделю", fr: "Rythme régulier, 5 jours/semaine", de: "Gleichmäßiges Tempo, 5 Tage/Woche" },
    multiplier: 1.0, default: true },
  { id: "ambitious", emoji: "🚀",
    label: { en: "Ambitious", uk: "Амбітно", ru: "Амбициозно", fr: "Ambitieux", de: "Ambitioniert" },
    blurb: { en: "Push hard, incl. weekends", uk: "Інтенсивно, включно з вихідними", ru: "Интенсивно, включая выходные", fr: "Effort soutenu, week-ends inclus", de: "Intensiv, inkl. Wochenenden" },
    multiplier: 1.4 },
];

Object.assign(window, { EXAM_TYPES, examType, MATERIALS, PREFERENCES, TIMEZONES, detectTimezone, DEFAULT_SUBJECTS, ONB, COUNTRIES, COUNTRY_TO_EXAM_TYPE, EDUCATION_LEVELS, SUBJECT_PRESETS, UNIVERSITY_YEARS, INTENSITY_PRESETS });
