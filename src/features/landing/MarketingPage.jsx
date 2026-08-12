/**
 * Phase 4 marketing page — eight sections, teal-drench hero, no fake quotes.
 * Auth stays in Landing.jsx; this file is the logged-out story.
 */
import React from "react";
import { BrandMark } from "../../brand/BrandMark";
import { PredictorChart } from "./PredictorChart";
import { ProductTheater } from "./ProductTheater";

const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const FEATURES = [
  ["predictor", "feat-predictor"],
  ["novelty", "feat-novelty"],
  ["plan", "feat-plan"],
  ["exam", "feat-exam"],
  ["sync", "feat-sync"],
  ["streak", "feat-streak"],
];

export function MarketingPage({ t, lang, onLangChange, onSignup, onLogin, onDemo, onLegal }) {
  const [annual, setAnnual] = React.useState(true);
  const langs = Object.values(window.LANGS || {});
  const headline = t.land_hero_title || "";

  function tap(fn) {
    return () => {
      window.playSound?.("tap");
      fn();
    };
  }

  return (
    <div className="land">
      <a className="land-skip" href="#content">{t.land_skip}</a>

      <header className="land-nav">
        <a className="land-brand" href="#top" aria-label={t.land_wordmark}>
          <BrandMark size={28} framed />
          <span className="land-wordmark">{t.land_wordmark}</span>
        </a>
        <nav className="land-nav-links" aria-label={t.land_wordmark}>
          <a href="#features">{t.land_nav_features}</a>
          <a href="#pricing">{t.land_nav_pricing}</a>
          <a href="#faq">{t.land_nav_faq}</a>
        </nav>
        <div className="land-nav-end">
          <div className="land-langs" role="group" aria-label={t.settings_language || "language"}>
            {langs.map((l) => (
              <button
                key={l.code}
                type="button"
                title={l.label}
                aria-label={l.label}
                aria-pressed={lang === l.code}
                className={lang === l.code ? "is-on" : ""}
                onClick={() => onLangChange(l.code)}
              >
                {l.flag}
              </button>
            ))}
          </div>
          <button type="button" className="land-nav-login" onClick={tap(onLogin)}>{t.land_nav_login}</button>
        </div>
      </header>

      <section className="land-hero" id="top">
        <div className="land-hero-grid" aria-hidden="true" />
        <svg className="land-hero-graph" viewBox="0 0 1200 640" aria-hidden="true">
          <polyline
            className="land-hero-line"
            points="40,560 180,500 320,520 520,340 760,280 1040,80 1160,40"
            fill="none"
            stroke="rgba(245,245,244,0.22)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="1144" y="16" width="36" height="36" rx="4" transform="rotate(45 1162 34)" fill="#F3D062" />
        </svg>
        <div className="land-hero-copy">
          <h1 className="land-headline" id="content">
            {headline.split(" ").map((word, i) => (
              <span key={`${word}-${i}`} style={{ animationDelay: `${90 + i * 80}ms` }}>{word}</span>
            ))}
          </h1>
          <p className="land-sub">{t.land_hero_sub}</p>
          <div className="land-cta">
            <button type="button" className="land-btn land-btn-primary" onClick={tap(onSignup)}>{t.land_cta_trial}</button>
            <button type="button" className="land-btn land-btn-ghost" onClick={tap(onLogin)}>{t.land_cta_login}</button>
          </div>
          <button type="button" className="land-demo-link" onClick={tap(onDemo)}>{t.land_cta_demo}</button>
        </div>
        <div className="land-hero-chart">
          <PredictorChart nowLabel={t.land_hero_now} predLabel={t.land_hero_pred} />
        </div>
      </section>

      <section className="land-demo" aria-labelledby="land-demo-title">
        <div className="land-wrap">
          <h2 id="land-demo-title">{t.land_demo_title}</h2>
          <p className="land-lede">{t.land_demo_sub}</p>
          <ProductTheater labels={{ predictor: t.land_demo_predictor, practice: t.land_demo_practice, chat: t.land_demo_chat }} />
        </div>
      </section>

      <section className="land-features" id="features" aria-labelledby="land-feat-title">
        <div className="land-wrap">
          <h2 id="land-feat-title" className="visually-hidden">{t.land_nav_features}</h2>
          <div className="land-feat-grid">
            {FEATURES.map(([id, mod], i) => (
              <article key={id} className={`land-feat land-${mod}`} style={{ "--i": i }}>
                <h3>{t[`land_feat_${id}_title`]}</h3>
                <p>{t[`land_feat_${id}_body`]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="land-proof" aria-labelledby="land-proof-title">
        <div className="land-wrap">
          <h2 id="land-proof-title">{t.land_proof_title}</h2>
          <p className="land-lede">{t.land_proof_body}</p>
          <blockquote className="land-founder">
            <p>{t.land_proof_founder}</p>
          </blockquote>
          <p className="land-exams">{t.land_proof_exams}</p>
        </div>
      </section>

      <section className="land-pricing" id="pricing" aria-labelledby="land-price-title">
        <div className="land-wrap">
          <h2 id="land-price-title">{t.land_price_title}</h2>
          <p className="land-lede">{t.land_price_sub}</p>
          <div className="land-bill" role="group" aria-label={t.land_price_annual}>
            <button type="button" className={!annual ? "is-on" : ""} onClick={() => { setAnnual(false); window.playSound?.("select"); }}>{t.land_price_monthly}</button>
            <button type="button" className={annual ? "is-on" : ""} onClick={() => { setAnnual(true); window.playSound?.("select"); }}>{t.land_price_annual}</button>
          </div>
          <div className="land-plans">
            <article className="land-plan">
              <h3>{t.land_price_free_name}</h3>
              <p className="land-plan-price">{t.land_price_free_price}</p>
              <p>{t.land_price_free_body}</p>
              <button type="button" className="land-btn land-btn-ghost" onClick={tap(onSignup)}>{t.land_price_cta}</button>
            </article>
            <article className="land-plan is-featured">
              <h3>{t.land_price_pro_name}</h3>
              <p className="land-plan-price">
                {annual ? t.land_price_pro_year : t.land_price_pro_month}
                <span>{t.land_price_per_month}</span>
              </p>
              <p>{t.land_price_pro_body}</p>
              <button type="button" className="land-btn land-btn-primary" onClick={tap(onSignup)}>{t.land_price_cta}</button>
            </article>
            <article className="land-plan is-ink">
              <h3>{t.land_price_opus_name}</h3>
              <p className="land-plan-price">
                {annual ? t.land_price_opus_year : t.land_price_opus_month}
                <span>{t.land_price_per_month}</span>
              </p>
              <p>{t.land_price_opus_body}</p>
              <button type="button" className="land-btn land-btn-amber" onClick={tap(onSignup)}>{t.land_price_cta}</button>
            </article>
          </div>
          <p className="land-price-note">{t.land_price_note}</p>
          <p className="land-price-note">{t.land_price_ua}</p>
        </div>
      </section>

      <section className="land-faq" id="faq" aria-labelledby="land-faq-title">
        <div className="land-wrap land-faq-wrap">
          <h2 id="land-faq-title">{t.land_faq_title}</h2>
          <div className="land-faq-list">
            {FAQ_IDS.map((n) => (
              <details
                key={n}
                onToggle={(e) => { if (e.currentTarget.open) window.playSound?.("select"); }}
              >
                <summary>{t[`land_faq_${n}_q`]}</summary>
                <p>{t[`land_faq_${n}_a`]}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="land-about" aria-labelledby="land-about-title">
        <div className="land-wrap land-about-grid">
          <div>
            <h2 id="land-about-title">{t.land_about_title}</h2>
            <p>{t.land_about_p1}</p>
            <p>{t.land_about_p2}</p>
            <p>{t.land_about_p3}</p>
          </div>
          <div className="land-about-panel" aria-hidden="true">
            <BrandMark size={72} framed />
            <span className="land-wordmark">{t.land_wordmark}</span>
          </div>
        </div>
      </section>

      <footer className="land-foot">
        <div className="land-wrap land-foot-row">
          <span className="land-wordmark">{t.land_foot_copy}</span>
          <nav aria-label="legal">
            {["privacy", "terms", "eula", "refund", "cookies", "children"].map((id) => (
              <button key={id} type="button" onClick={() => onLegal(id)}>{t[`land_foot_${id}`]}</button>
            ))}
          </nav>
          <nav aria-label="social">
            <a href="https://github.com/pakhomchik2008/ai-exam-coach-v2">{t.land_foot_support}</a>
            <a href="https://t.me/examcoach_ua">{t.land_foot_telegram}</a>
            <a href="https://www.tiktok.com/@exam.coach">{t.land_foot_tiktok}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
