// AI Exam Coach — Learn tree for IELTS.
//
// One tree covers Academic + General Training — the sub-skills tested are
// the same, only the passage/task genres differ, and Sonnet is prompted
// per-node to pick the right register at Teach time.
//
// Node ids follow the section prefix (l-* / r-* / w-*) chosen for
// stability across a future migration to different taxonomies (IELTS
// Academic / General). Titles are the standard band-descriptor skill
// headings.

import type { LearnTree } from "./schema";

const IELTS: LearnTree = {
  examTaxonomy: "ielts",
  units: [
    {
      id: "l",
      title: { en: "Listening", uk: "Аудіювання", ru: "Аудирование" },
      nodes: [
        { id: "l-01", title: { en: "Understanding gist and main ideas", uk: "Загальне розуміння" }, complexity: 2, estimatedMinutes: 8, prerequisites: [] },
        { id: "l-02", title: { en: "Listening for specific detail", uk: "Пошук деталей" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["l-01"] },
        { id: "l-03", title: { en: "Understanding opinion and attitude", uk: "Розуміння думки й ставлення" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["l-01"] },
        { id: "l-04", title: { en: "Following a lecture or monologue", uk: "Розуміння лекції" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["l-01"] },
        { id: "l-05", title: { en: "Multiple choice questions", uk: "Питання з вибором відповіді" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["l-02"] },
        { id: "l-06", title: { en: "Form and note completion", uk: "Заповнення форм і нотаток" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["l-02"] },
        { id: "l-07", title: { en: "Matching (speakers, features)", uk: "Відповідність" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["l-03"] },
        { id: "l-08", title: { en: "Plan / map / diagram labeling", uk: "Позначення на плані/схемі" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["l-02"] },
        { id: "l-09", title: { en: "Handling accents (UK, US, AU, NZ)", uk: "Різні акценти" }, complexity: 3, estimatedMinutes: 8, prerequisites: ["l-01"] },
        { id: "l-10", title: { en: "Time management, transferring answers", uk: "Тайм-менеджмент" }, complexity: 2, estimatedMinutes: 6, prerequisites: [] },
      ],
    },
    {
      id: "r",
      title: { en: "Reading", uk: "Читання", ru: "Чтение" },
      nodes: [
        { id: "r-01", title: { en: "Skimming for gist", uk: "Швидке читання: загальний зміст" }, complexity: 2, estimatedMinutes: 8, prerequisites: [] },
        { id: "r-02", title: { en: "Scanning for specific info", uk: "Пошук конкретної інформації" }, complexity: 2, estimatedMinutes: 8, prerequisites: ["r-01"] },
        { id: "r-03", title: { en: "True / False / Not Given", uk: "True / False / Not Given" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["r-02"] },
        { id: "r-04", title: { en: "Matching headings to paragraphs", uk: "Заголовки до абзаців" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["r-01"] },
        { id: "r-05", title: { en: "Sentence and summary completion", uk: "Завершення речень і резюме" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["r-02"] },
        { id: "r-06", title: { en: "Multiple choice (reading)", uk: "Питання з вибором (читання)" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["r-02"] },
        { id: "r-07", title: { en: "Understanding writer's opinion", uk: "Позиція автора" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["r-03"] },
        { id: "r-08", title: { en: "Inference from context", uk: "Висновки з контексту" }, complexity: 5, estimatedMinutes: 12, prerequisites: ["r-07"] },
        { id: "r-09", title: { en: "Vocabulary from context", uk: "Значення слова з контексту" }, complexity: 3, estimatedMinutes: 8, prerequisites: [] },
        { id: "r-10", title: { en: "Reading pacing (3 passages / 60 min)", uk: "Розподіл часу" }, complexity: 3, estimatedMinutes: 8, prerequisites: ["r-01"] },
      ],
    },
    {
      id: "w",
      title: { en: "Writing", uk: "Письмо", ru: "Письмо" },
      nodes: [
        { id: "w-01", title: { en: "Task 1: describing charts and graphs", uk: "Task 1: опис графіків" }, complexity: 4, estimatedMinutes: 12, prerequisites: [] },
        { id: "w-02", title: { en: "Task 1: describing processes / maps", uk: "Task 1: процеси та мапи" }, complexity: 4, estimatedMinutes: 12, prerequisites: ["w-01"] },
        { id: "w-03", title: { en: "Task 2: essay structure", uk: "Task 2: структура есе" }, complexity: 3, estimatedMinutes: 10, prerequisites: [] },
        { id: "w-04", title: { en: "Task 2: opinion essays", uk: "Task 2: есе-думка" }, complexity: 4, estimatedMinutes: 12, prerequisites: ["w-03"] },
        { id: "w-05", title: { en: "Task 2: discussion / both views", uk: "Task 2: обговорення обох поглядів" }, complexity: 4, estimatedMinutes: 12, prerequisites: ["w-03"] },
        { id: "w-06", title: { en: "Cohesion and linking devices", uk: "Зв'язність і зв'язки" }, complexity: 3, estimatedMinutes: 9, prerequisites: [] },
        { id: "w-07", title: { en: "Lexical resource, paraphrasing", uk: "Лексика й перефразування" }, complexity: 4, estimatedMinutes: 10, prerequisites: [] },
        { id: "w-08", title: { en: "Grammatical range and accuracy", uk: "Граматика: розмаїття та точність" }, complexity: 4, estimatedMinutes: 11, prerequisites: [] },
        { id: "w-09", title: { en: "Task response, addressing all parts", uk: "Відповідність завданню" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["w-03"] },
        { id: "w-10", title: { en: "Time management (20 + 40 min)", uk: "Тайм-менеджмент" }, complexity: 2, estimatedMinutes: 7, prerequisites: [] },
      ],
    },
    // Speaking is omitted on purpose: we have no mic / Whisper path
    // (Decision Log #39). Shipping a silent "talk about your hometown"
    // drill would be worse than leaving the paper out.
  ],
};

export default IELTS;
