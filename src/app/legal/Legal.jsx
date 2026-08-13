/**
 * In-app legal stubs. Counsel-grade pass is Phase 6 (Decision Log #51).
 * Footer on the landing must not 404 in the meantime.
 */
import React from "react";

const PAGES = ["privacy", "terms", "eula", "refund", "cookies", "children"];

export function Legal({ page, t, onBack }) {
  const key = PAGES.includes(page) ? page : "privacy";
  const title = t[`legal_${key}_title`];
  const body = t[`legal_${key}_body`];
  return (
    <article className="land-legal" id="content">
      <button type="button" className="land-legal-back" onClick={onBack}>{t.legal_back}</button>
      <p className="land-legal-stub">{t.legal_stub}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </article>
  );
}

window.Legal = Legal;
export {};
