// Examik — Learn tree for NMT Mathematics.
//
// AI-drafted first pass covering the standard Ukrainian secondary-school
// math syllabus grouped as the six units the mega-prompt spec names:
// Numbers → Algebra → Functions → Geometry (plane) → Stereometry →
// Stochastics. 47 nodes total. Reviewed and edited against the real
// ЗНО/НМТ programme by Hlib post-ship — Decision Log #42.
//
// Node ids are stable identifiers (nm-*, al-*, fn-*, ge-*, st-*, sh-*) — a
// title rewording in this file never resets learner progress, because
// learn-store keys by id (see schema.ts).
//
// `prerequisites` are populated where they're obvious ("logarithms" needs
// "exponents") and enforced from Phase 3.7e — a node stays locked until
// every parent is bronze+. Entry-point nodes keep `prerequisites: []`.

import type { LearnTree } from "./schema";

const NMT_MATH: LearnTree = {
  examTaxonomy: "nmt",
  units: [
    {
      id: "nm",
      title: { en: "Numbers & Expressions", uk: "Числа та вирази", ru: "Числа и выражения" },
      nodes: [
        { id: "nm-01", title: { en: "Natural numbers, divisibility", uk: "Натуральні числа, подільність" }, complexity: 1, estimatedMinutes: 5, prerequisites: [] },
        { id: "nm-02", title: { en: "Fractions, decimals, percentages", uk: "Дроби, десяткові, відсотки" }, complexity: 2, estimatedMinutes: 7, prerequisites: ["nm-01"] },
        { id: "nm-03", title: { en: "Ratio and proportion", uk: "Пропорція" }, complexity: 2, estimatedMinutes: 6, prerequisites: ["nm-02"] },
        { id: "nm-04", title: { en: "Integer and rational numbers", uk: "Цілі та раціональні числа" }, complexity: 2, estimatedMinutes: 6, prerequisites: ["nm-01"] },
        { id: "nm-05", title: { en: "Real numbers, irrationals", uk: "Дійсні числа, ірраціональні" }, complexity: 3, estimatedMinutes: 8, prerequisites: ["nm-04"] },
        { id: "nm-06", title: { en: "Absolute value", uk: "Модуль числа" }, complexity: 3, estimatedMinutes: 7, prerequisites: ["nm-05"] },
        { id: "nm-07", title: { en: "Powers with integer exponents", uk: "Степінь із цілим показником" }, complexity: 2, estimatedMinutes: 6, prerequisites: ["nm-04"] },
      ],
    },
    {
      id: "al",
      title: { en: "Algebra", uk: "Алгебра", ru: "Алгебра" },
      nodes: [
        { id: "al-01", title: { en: "Polynomials, factoring", uk: "Многочлени, розкладання на множники" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["nm-07"] },
        { id: "al-02", title: { en: "Roots and radicals", uk: "Корені та радикали" }, complexity: 3, estimatedMinutes: 8, prerequisites: ["nm-05"] },
        { id: "al-03", title: { en: "Powers with rational exponents", uk: "Степінь із раціональним показником" }, complexity: 3, estimatedMinutes: 8, prerequisites: ["al-02"] },
        { id: "al-04", title: { en: "Linear equations", uk: "Лінійні рівняння" }, complexity: 2, estimatedMinutes: 6, prerequisites: ["al-01"] },
        { id: "al-05", title: { en: "Quadratic equations", uk: "Квадратні рівняння" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["al-01"] },
        { id: "al-06", title: { en: "Systems of equations", uk: "Системи рівнянь" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["al-04", "al-05"] },
        { id: "al-07", title: { en: "Inequalities, intervals", uk: "Нерівності, інтервали" }, complexity: 3, estimatedMinutes: 8, prerequisites: ["al-04"] },
        { id: "al-08", title: { en: "Exponential equations", uk: "Показникові рівняння" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["al-03"] },
        { id: "al-09", title: { en: "Logarithms and log equations", uk: "Логарифми та логарифмічні рівняння" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["al-08"] },
        { id: "al-10", title: { en: "Word problems, motion/mixture", uk: "Текстові задачі" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["al-06"] },
      ],
    },
    {
      id: "fn",
      title: { en: "Functions", uk: "Функції", ru: "Функции" },
      nodes: [
        { id: "fn-01", title: { en: "Function basics, domain, range", uk: "Функція, область визначення" }, complexity: 2, estimatedMinutes: 6, prerequisites: [] },
        { id: "fn-02", title: { en: "Linear and quadratic functions", uk: "Лінійна та квадратична функції" }, complexity: 3, estimatedMinutes: 8, prerequisites: ["fn-01", "al-05"] },
        { id: "fn-03", title: { en: "Power and root functions", uk: "Степенева та коренева функції" }, complexity: 3, estimatedMinutes: 8, prerequisites: ["al-02"] },
        { id: "fn-04", title: { en: "Exponential and log functions", uk: "Показникова та логарифмічна функції" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["al-09"] },
        { id: "fn-05", title: { en: "Trigonometric functions", uk: "Тригонометричні функції" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["fn-01"] },
        { id: "fn-06", title: { en: "Trig identities, transformations", uk: "Тригонометричні тотожності" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["fn-05"] },
        { id: "fn-07", title: { en: "Derivative — meaning and rules", uk: "Похідна: означення та правила" }, complexity: 4, estimatedMinutes: 12, prerequisites: ["fn-02"] },
        { id: "fn-08", title: { en: "Applying derivatives (extrema, tangents)", uk: "Застосування похідної" }, complexity: 5, estimatedMinutes: 13, prerequisites: ["fn-07"] },
      ],
    },
    {
      id: "ge",
      title: { en: "Plane Geometry", uk: "Планіметрія", ru: "Планиметрия" },
      nodes: [
        { id: "ge-01", title: { en: "Points, lines, angles", uk: "Точки, прямі, кути" }, complexity: 1, estimatedMinutes: 5, prerequisites: [] },
        { id: "ge-02", title: { en: "Triangles: types and properties", uk: "Трикутники" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["ge-01"] },
        { id: "ge-03", title: { en: "Right triangles, Pythagoras", uk: "Прямокутні трикутники, теорема Піфагора" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["ge-02"] },
        { id: "ge-04", title: { en: "Trig in right triangles", uk: "Тригонометрія в прямокутному трикутнику" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["ge-03", "fn-05"] },
        { id: "ge-05", title: { en: "Quadrilaterals, parallelograms", uk: "Чотирикутники, паралелограми" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["ge-02"] },
        { id: "ge-06", title: { en: "Circles, chords, tangents", uk: "Коло, хорди, дотичні" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["ge-02"] },
        { id: "ge-07", title: { en: "Similarity and congruence", uk: "Подібність і рівність фігур" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["ge-02"] },
        { id: "ge-08", title: { en: "Areas of plane figures", uk: "Площі плоских фігур" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["ge-05", "ge-06"] },
        { id: "ge-09", title: { en: "Coordinate geometry, vectors", uk: "Координати, вектори" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["ge-01"] },
      ],
    },
    {
      id: "st",
      title: { en: "Stereometry", uk: "Стереометрія", ru: "Стереометрия" },
      nodes: [
        { id: "st-01", title: { en: "Lines and planes in space", uk: "Прямі і площини у просторі" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["ge-09"] },
        { id: "st-02", title: { en: "Prisms and parallelepipeds", uk: "Призми та паралелепіпеди" }, complexity: 3, estimatedMinutes: 10, prerequisites: ["st-01"] },
        { id: "st-03", title: { en: "Pyramids", uk: "Піраміди" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["st-01"] },
        { id: "st-04", title: { en: "Cylinders, cones", uk: "Циліндри, конуси" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["st-01"] },
        { id: "st-05", title: { en: "Spheres and balls", uk: "Сфери та кулі" }, complexity: 4, estimatedMinutes: 10, prerequisites: ["st-04"] },
        { id: "st-06", title: { en: "Volume formulas", uk: "Об'єми тіл" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["st-02", "st-03", "st-04"] },
        { id: "st-07", title: { en: "Surface area formulas", uk: "Площі поверхонь тіл" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["st-02", "st-04"] },
      ],
    },
    {
      id: "sh",
      title: { en: "Stochastics", uk: "Стохастика", ru: "Стохастика" },
      nodes: [
        { id: "sh-01", title: { en: "Combinations and permutations", uk: "Комбінаторика: перестановки, розміщення" }, complexity: 3, estimatedMinutes: 9, prerequisites: [] },
        { id: "sh-02", title: { en: "Classical probability", uk: "Класична ймовірність" }, complexity: 3, estimatedMinutes: 9, prerequisites: ["sh-01"] },
        { id: "sh-03", title: { en: "Conditional probability, independence", uk: "Умовна ймовірність, незалежність" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["sh-02"] },
        { id: "sh-04", title: { en: "Descriptive statistics", uk: "Описова статистика: середні, медіана, мода" }, complexity: 2, estimatedMinutes: 7, prerequisites: [] },
        { id: "sh-05", title: { en: "Reading tables and charts", uk: "Читання таблиць і діаграм" }, complexity: 2, estimatedMinutes: 6, prerequisites: ["sh-04"] },
        { id: "sh-06", title: { en: "Word problems with probability", uk: "Задачі на ймовірність" }, complexity: 4, estimatedMinutes: 11, prerequisites: ["sh-03"] },
      ],
    },
  ],
};

export default NMT_MATH;
