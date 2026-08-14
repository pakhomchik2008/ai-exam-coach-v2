/**
 * Phase 4 marketing page. Hero stays put (line draw, no swipe).
 * Next: stacked product surfaces. Auth stays in Landing.jsx.
 */
import React from "react";
import { BrandLockup, BrandMark } from "../../brand/BrandMark";
import { ExamMarquee } from "./ExamMarquee";
import { FeatureReel } from "./FeatureReel";
import { startLenis } from "../../lib/motion-runtime";

const CTA_DAYS = [
  ["1", "land_cta_d1"],
  ["3", "land_cta_d3"],
  ["7", "land_cta_d7"],
  ["47", "land_cta_d47"],
];

const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function CtaTrio({ t, tap, onSignup, onLogin, onDemo, withTimeline }) {
  return (
    <div className="land-cta">
      {withTimeline ? (
        <div className="land-cta-primary">
          <ol className="land-cta-tl">
            {CTA_DAYS.map(([day, key]) => (
              <li key={day}>
                <b>{t.land_cta_day} {day}</b>
                <span>{t[key]}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="land-btn land-btn-primary" onClick={tap(onSignup)}>{t.land_cta_trial}</button>
        </div>
      ) : (
        <button type="button" className="land-btn land-btn-primary" onClick={tap(onSignup)}>{t.land_cta_trial}</button>
      )}
      <button type="button" className="land-btn land-btn-ghost" onClick={tap(onLogin)}>{t.land_cta_login}</button>
      <button type="button" className="land-btn land-btn-demo" onClick={tap(onDemo)}>{t.land_cta_demo}</button>
    </div>
  );
}

export function MarketingPage({ t, lang, onLangChange, onSignup, onLogin, onDemo, onLegal }) {
  const [annual, setAnnual] = React.useState(true);
  const landRef = React.useRef(null);
  React.useEffect(() => {
    let stop = () => undefined;
    startLenis().then((fn) => { stop = fn; });
    return () => stop();
  }, []);
  const langs = Object.values(window.LANGS || {});
  const headlineLines = (t.land_hero_title || "").split(/(?<=[.?])\s+/).filter(Boolean);

  function onGlow(e) {
    const el = landRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--glow-x", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--glow-y", `${((e.clientY - r.top) / r.height) * 100}%`);
  }

  function tap(fn) {
    return () => {
      window.playSound?.("tap");
      fn();
    };
  }

  return (
    <div className="land energy" ref={landRef} onMouseMove={onGlow}>
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
        <div className="land-hero-sticky">
          <svg className="land-hero-graph" viewBox="0 0 1200 640" aria-hidden="true">
            <polyline
              className="land-hero-line"
              points="40,560 180,500 320,520 520,340 760,280 1040,80 1160,40"
              fill="none"
              stroke="rgba(20,24,34,0.14)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g transform="translate(1162 34)">
              <g className="land-hero-peak">
                <rect x="-16" y="-16" width="32" height="32" rx="4" transform="rotate(45)" fill="#C6A572" />
              </g>
            </g>
          </svg>
          <div className="land-hero-stage">
            <div className="land-hero-copy">
              <p className="land-kicker">{t.land_kicker}</p>
              <h1 className="land-headline" id="content">
                {headlineLines.map((line, i) => (
                  <span key={`${line}-${i}`} style={{ animationDelay: `${90 + i * 120}ms` }}>{line}</span>
                ))}
              </h1>
              <p className="land-sub">{t.land_hero_sub}</p>
              <CtaTrio t={t} tap={tap} onSignup={onSignup} onLogin={onLogin} onDemo={onDemo} withTimeline />
            </div>
          </div>
          <ExamMarquee label={t.land_marquee} />
        </div>
      </section>

      <FeatureReel
        t={t}
        lang={lang}
        actions={<CtaTrio t={t} tap={tap} onSignup={onSignup} onLogin={onLogin} onDemo={onDemo} />}
      />

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
              <button type="button" className="land-btn land-btn-ghost" onClick={tap(onSignup)}>{t.land_price_free_cta}</button>
            </article>
            <article className="land-plan is-featured">
              <h3>{t.land_price_pro_name}</h3>
              <p className="land-plan-price">
                {annual ? t.land_price_pro_year : t.land_price_pro_month}
                <span>{annual ? t.land_price_per_year : t.land_price_per_month}</span>
              </p>
              <p>{t.land_price_pro_body}</p>
              <button type="button" className="land-btn land-btn-primary" onClick={tap(onSignup)}>{t.land_price_cta}</button>
            </article>
            <article className="land-plan is-ink">
              <h3>{t.land_price_max_name}</h3>
              <p className="land-plan-price">
                {annual ? t.land_price_max_year : t.land_price_max_month}
                <span>{annual ? t.land_price_per_year : t.land_price_per_month}</span>
              </p>
              <p>{t.land_price_max_body}</p>
              <button type="button" className="land-btn land-btn-amber" onClick={tap(onSignup)}>{t.land_price_cta}</button>
            </article>
          </div>
          <p className="land-price-note">{t.land_price_note}</p>
          <CtaTrio t={t} tap={tap} onSignup={onSignup} onLogin={onLogin} onDemo={onDemo} />
        </div>
      </section>

      <section className="land-faq" id="faq" aria-labelledby="land-faq-title">
        <div className="land-wrap land-faq-wrap">
          <div>
            <h2 id="land-faq-title">{t.land_faq_title}</h2>
            <CtaTrio t={t} tap={tap} onSignup={onSignup} onLogin={onLogin} onDemo={onDemo} />
          </div>
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
            <CtaTrio t={t} tap={tap} onSignup={onSignup} onLogin={onLogin} onDemo={onDemo} />
          </div>
          <div className="land-about-panel" aria-hidden="true">
            <BrandLockup width={220} />
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
