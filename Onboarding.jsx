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
      onFinish={() => onFinish()}
    />
  );
}
window.Onboarding = Onboarding;
