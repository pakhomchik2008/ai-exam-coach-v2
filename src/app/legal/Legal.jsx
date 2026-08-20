/**
 * In-app legal pages, Phase 6 pass — real sections in all 5 languages
 * (src/i18n/legal-{en,uk,ru,fr,de}.ts). `sections` array wins when present;
 * `body` (the old single-paragraph draft) is a fallback that's now
 * effectively dead code but stays as a safety net if a language's array
 * is ever missing or empty. Footer on the landing must not 404 either way.
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
