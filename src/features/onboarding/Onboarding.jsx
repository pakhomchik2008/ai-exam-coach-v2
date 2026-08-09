// AI Exam Coach — Onboarding: thin wrapper around the shared ExamWizard.
// All step UI, validation, and persistence logic lives in exam-wizard.jsx /
// exams-store.jsx so Onboarding and "Add Exam" (Exams.jsx) share exactly one
// implementation.
function Onboarding({ onFinish, lang, onLangChange }) {
  return (
    <window.ExamWizard
      config={window.EXAM_WIZARD_PRESETS.onboarding}
      lang={lang}
      onLangChange={onLangChange}
      onFinish={(newExams) => onFinish(newExams)}
    />
  );
}
window.Onboarding = Onboarding;

// Module marker: these files carry no import/export of their own (they still
// communicate via `window` globals), and without one the JSX transform treats
// the file as a CommonJS script and emits a bare `require()` call that throws
// in the browser. Removed once this module uses real imports.
export {};
