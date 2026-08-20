/**
 * In-app legal pages. English got the Phase 6 pass (real sections, not a
 * one-paragraph stub) — see src/i18n/legal-en.ts. uk/ru/fr/de still fall
 * back to the old single-paragraph draft until translated (Decision:
 * English first, since it's the language most reviewers/App Store/ad
 * platforms actually read). Footer on the landing must not 404 either way.
 */
import React from "react";

const PAGES = ["privacy", "terms", "eula", "refund", "cookies", "children"];

export function Legal({ page, t, onBack }) {
  const key = PAGES.includes(page) ? page : "privacy";
  const title = t[`legal_${key}_title`];
  const sections = t[`legal_${key}_sections`];
  const body = t[`legal_${key}_body`];
  return (
    <article className="land-legal" id="content">
      {onBack ? <button type="button" className="land-legal-back" onClick={onBack}>{t.legal_back}</button> : null}
      <p className="land-legal-stub">{t.legal_stub}</p>
      <h1>{title}</h1>
      {Array.isArray(sections) && sections.length > 0
        ? sections.map((s, i) => (
            <React.Fragment key={i}>
              {s.h ? <h2>{s.h}</h2> : null}
              <p>{s.p}</p>
            </React.Fragment>
          ))
        : <p>{body}</p>}
    </article>
  );
}

window.Legal = Legal;
export {};
