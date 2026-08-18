/**
 * Marketing cover. Markup and rhythm follow the Grill-me DC:
 * Examik Landing.dc.html (desktop) + Examik Landing Mobile.dc.html.
 * Auth stays in Landing.jsx.
 */
import React from "react";
import { BrandLockup } from "../../brand/BrandMark";
import { ExamMarquee } from "./ExamMarquee";
import { startLenis } from "../../lib/motion-runtime";

const FAQ_LANDING = [1, 2, 3, 5, 6, 8, 9];

function tap(fn) {
  return () => {
    window.playSound?.("tap");
    fn();
  };
}

function PhoneMock({ t, onDemo, clipped }) {
  return (
    <div className={`land-phone-scene${clipped ? " is-clipped" : ""}`}>
      <div className="land-phone-glow" aria-hidden="true" />
      <div className="land-phone-spin">
        <div className="land-phone-float">
          <div className="land-phone">
            <div className="land-phone-screen">
              {!clipped && (
                <>
                  <div className="land-phone-notch" aria-hidden="true" />
                  <div className="land-phone-status">
                    <span>01:12</span>
                    <span>▮▮▮ ▮</span>
                  </div>
                </>
              )}
              <div className="land-phone-body">
                <div className="land-phone-head">
                  <span className="land-phone-dot" />
                  <span className="land-phone-title">{t.land_phone_coach}</span>
                  <span className="land-phone-meta">{t.land_phone_meta}</span>
                </div>
                <div className="land-phone-thread">
                  <p className="land-bubble is-me">{t.land_reel_chat_me}</p>
                  <p className="land-bubble is-ai">{t.land_reel_chat_ai}</p>
                  {!clipped && (
                    <div className="land-phone-stats">
                      <span>
                        <b>12/47</b>
                        <i>{t.land_phone_topics}</i>
                      </span>
                      <span>
                        <b className="is-purple">180</b>
                        <i>{t.land_phone_target}</i>
                      </span>
                    </div>
                  )}
                </div>
                <div className="land-phone-cta-wrap">
                  <button type="button" className="land-btn land-btn-ink" onClick={tap(onDemo)}>
                    {t.land_phone_cta}
                  </button>
                  {!clipped && <p className="land-phone-note">{t.land_phone_note}</p>}
                </div>
              </div>
              {!clipped && <div className="land-phone-home" aria-hidden="true" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CtaPair({ t, onSignup, onDemo, size = "md" }) {
  return (
    <div className={`land-cta is-${size}`}>
      <button type="button" className="land-btn land-btn-paper" onClick={tap(onSignup)}>
        {t.land_cta_trial}
      </button>
      <button type="button" className="land-btn land-btn-ghost" onClick={tap(onDemo)}>
        {t.land_cta_demo}
      </button>
    </div>
  );
}

export function MarketingPage({ t, lang, onLangChange, onSignup, onLogin, onDemo, onLegal }) {
  const landRef = React.useRef(null);
  // Toggle is display-only — the real interval choice happens in Checkout
  // after signup (see startCheckout in src/lib/billing.ts). Landing CTAs
  // still route through onSignup for every plan, same as before Ultra.
  const [yearly, setYearly] = React.useState(false);
  React.useEffect(() => {
    let stop = () => undefined;
    startLenis().then((fn) => { stop = fn; });
    return () => stop();
  }, []);
  const langs = Object.values(window.LANGS || {});

  return (
    <div className="land" ref={landRef}>
      <a className="land-skip" href="#content">{t.land_skip}</a>

      <header className="land-nav">
        <a className="land-brand" href="#hero" aria-label={t.land_wordmark}>
          <BrandLockup mark={25} title={t.land_wordmark} />
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
                {String(l.code).toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="land-nav-login" onClick={tap(onLogin)}>{t.land_nav_login}</button>
        </div>
      </header>

      <section className="land-hero" id="hero">
        <div className="land-hero-copy">
          <p className="land-kicker">{t.land_kicker}</p>
          <h1 className="land-headline" id="content">
            <span>{t.land_hero_l1}</span>
            <span>{t.land_hero_l2}</span>
            <span className="is-em">{t.land_hero_em}</span>
          </h1>
          <p className="land-sub">{t.land_hero_sub}</p>
          <CtaPair t={t} onSignup={onSignup} onDemo={onDemo} />
          <p className="land-hero-price">{t.land_hero_price}</p>
          <div className="land-hero-stats">
            <span>{t.land_stat_nmt}</span>
            <span>{t.land_stat_ielts}</span>
            <span>{t.land_stat_one}</span>
          </div>
        </div>
        <PhoneMock t={t} onDemo={onDemo} clipped={false} />
        <div className="land-hero-phone-m">
          <PhoneMock t={t} onDemo={onDemo} clipped />
        </div>
      </section>

      <ExamMarquee label={t.land_marquee} />

      <section className="land-extra land-how">
        <p className="land-kicker">{t.land_how_kicker}</p>
        <h2>{t.land_how_title}</h2>
        <div className="land-how-list">
          {[1, 2, 3].map((n) => (
            <article key={n}>
              <span>0{n}</span>
              <h3>{t[`land_how_${n}_t`]}</h3>
              <p>{t[`land_how_${n}_b`]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="land-extra land-product" id="features">
        <p className="land-kicker">{t.land_nav_features}</p>
        <h2>{t.land_reel_title}</h2>
        <p className="land-lede">{t.land_reel_sub}</p>
        <div className="land-product-list">
          <article>
            <h3>{t.land_reel_chat_title}</h3>
            <p>{t.land_reel_chat_body}</p>
            <div className="land-mini-chat">
              <p className="land-bubble is-me">{t.land_reel_chat_me}</p>
              <p className="land-bubble is-ai">{t.land_reel_chat_ai}</p>
            </div>
          </article>
          <article>
            <h3>{t.land_reel_learn_title}</h3>
            <p>{t.land_reel_learn_body}</p>
            <div className="land-mini-learn">
              <p>{t.land_learn_progress}</p>
              <div className="land-mini-bar"><i /></div>
              <ul>
                <li className="is-gold">{t.land_learn_n1}</li>
                <li className="is-now">{t.land_learn_n2}</li>
                <li className="is-dim">{t.land_learn_n3}</li>
              </ul>
            </div>
          </article>
          <article>
            <div className="land-product-head">
              <h3>{t.land_reel_journal_title}</h3>
              <span className="land-pro">{t.land_pro_badge}</span>
            </div>
            <p>{t.land_reel_journal_body}</p>
            <div className="land-mini-journal">
              <div className="land-mini-meta">
                <span>{t.land_journal_logged}</span>
                <span>{t.land_journal_recovered}</span>
                <span>{t.land_journal_due}</span>
              </div>
              <ul>
                <li className="is-miss">
                  <b>{t.land_journal_q1}</b>
                  <span>{t.land_journal_q1_sub}</span>
                </li>
                <li className="is-gold">
                  <b>{t.land_journal_q2}</b>
                  <span>{t.land_journal_q2_sub}</span>
                </li>
              </ul>
            </div>
          </article>
          <article>
            <div className="land-product-head">
              <h3>{t.land_reel_cal_title}</h3>
              <span className="land-pro">{t.land_pro_badge}</span>
            </div>
            <p>{t.land_reel_cal_body}</p>
            <div className="land-mini-cal">
              <div className="land-mini-cal-days">
                {(t.land_reel_cal_days || "").split("·").map((d) => (
                  <span key={d}>{d.trim().charAt(0)}</span>
                ))}
              </div>
              <div className="land-mini-cal-grid">
                <span className="is-study" style={{ marginTop: 14 }}>{t.land_cal_b1}</span>
                <span className="is-study" style={{ marginTop: 5 }}>{t.land_cal_b2}</span>
                <span className="is-review" style={{ marginTop: 32 }}>{t.land_cal_b3}</span>
                <span className="is-study" style={{ marginTop: 14 }}>{t.land_cal_b4}</span>
                <span className="is-study">{t.land_cal_b5}</span>
                <span className="is-exam">{t.land_cal_b6}</span>
                <span className="is-review" style={{ marginTop: 32 }}>{t.land_cal_b7}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="land-extra land-vs">
        <p className="land-kicker">{t.land_vs_kicker}</p>
        <h2>{t.land_vs_title}</h2>
        <p className="land-lede">{t.land_vs_body}</p>
        <div className="land-vs-table" role="table">
          <div className="land-vs-row is-head" role="row">
            <span />
            <span>{t.land_vs_examik}</span>
            <span className="is-mute">{t.land_vs_chat}</span>
          </div>
          <div className="land-vs-row" role="row">
            <span>{t.land_vs_row_date}</span>
            <span className="is-yes">{t.land_vs_yes}</span>
            <span className="is-no">{t.land_vs_no}</span>
          </div>
          <div className="land-vs-row" role="row">
            <span>{t.land_vs_row_tree}</span>
            <span className="is-yes">{t.land_vs_yes}</span>
            <span className="is-no">{t.land_vs_no}</span>
          </div>
          <div className="land-vs-row" role="row">
            <span>{t.land_vs_row_repeat}</span>
            <span className="is-yes">{t.land_vs_yes}</span>
            <span className="is-no">{t.land_vs_no}</span>
          </div>
        </div>
      </section>

      <section className="land-pricing" id="pricing" aria-labelledby="land-price-title">
        <p className="land-kicker">{t.land_nav_pricing}</p>
        <h2 id="land-price-title">{t.land_price_title}</h2>
        <p className="land-lede">{t.land_price_sub}</p>
        <div className="land-price-toggle" role="group" aria-label={t.land_price_sub}>
          <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>{t.land_price_bill_month}</button>
          <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>{t.land_price_bill_year}</button>
        </div>
        <div className="land-plans">
          <article className="land-plan">
            <h3>{t.land_price_free_name}</h3>
            <p className="land-plan-price">{t.land_price_free_price}</p>
            <p>{t.land_price_free_body}</p>
            <button type="button" className="land-btn land-btn-ghost" onClick={tap(onSignup)}>{t.land_price_free_cta}</button>
          </article>
          <article className="land-plan is-pro">
            <h3>{t.land_price_pro_name}</h3>
            <p className="land-plan-price">
              {yearly ? t.land_price_pro_year : t.land_price_pro_month}
              <span>{yearly ? t.land_price_per_year : t.land_price_per_month}</span>
              {yearly && <span className="land-price-badge">{t.land_price_save_badge}</span>}
            </p>
            {yearly && <p className="land-price-was">{t.land_price_pro_year_full}</p>}
            <p>{t.land_price_pro_body}</p>
            <button type="button" className="land-btn land-btn-purple" onClick={tap(onSignup)}>{t.land_price_pro_cta}</button>
          </article>
          <article className="land-plan is-ultra">
            <h3>{t.land_price_ultra_name}</h3>
            <p className="land-plan-price">
              {yearly ? t.land_price_ultra_year : t.land_price_ultra_month}
              <span>{yearly ? t.land_price_per_year : t.land_price_per_month}</span>
              {yearly && <span className="land-price-badge">{t.land_price_save_badge}</span>}
            </p>
            {yearly && <p className="land-price-was">{t.land_price_ultra_year_full}</p>}
            <p>{t.land_price_ultra_body}</p>
            <button type="button" className="land-btn land-btn-purple" onClick={tap(onSignup)}>{t.land_price_ultra_cta}</button>
          </article>
        </div>
        <p className="land-price-note">{t.land_price_note}</p>
      </section>

      <section className="land-who" aria-labelledby="land-who-title">
        <div>
          <p className="land-kicker">{t.land_who_kicker}</p>
          <h2 id="land-who-title">{t.land_who_title}</h2>
          <p>{t.land_who_p1}</p>
          <p>{t.land_who_p2}</p>
        </div>
        <div className="land-who-card">
          <div className="land-who-meta">
            <span>{t.land_who_no_fake}</span>
            <span>{t.land_who_year}</span>
          </div>
          <div className="land-who-rows">
            <div><span>{t.land_who_trees_l}</span><b>{t.land_who_trees_v}</b></div>
            <div><span>{t.land_who_nodes_l}</span><b>{t.land_who_nodes_v}</b></div>
            <div><span>{t.land_who_langs_l}</span><b>{t.land_who_langs_v}</b></div>
            <div><span>{t.land_who_ios_l}</span><b className="is-gold">{t.land_who_ios_v}</b></div>
          </div>
        </div>
      </section>

      <section className="land-faq" id="faq" aria-labelledby="land-faq-title">
        <div className="land-faq-head">
          <p className="land-kicker">{t.land_nav_faq}</p>
          <h2 id="land-faq-title">{t.land_faq_title}</h2>
        </div>
        <div className="land-faq-list">
          {FAQ_LANDING.map((n, i) => (
            <details
              key={n}
              open={i === 0}
              onToggle={(e) => { if (e.currentTarget.open) window.playSound?.("select"); }}
            >
              <summary>{t[`land_faq_${n}_q`]}</summary>
              <p>{t[`land_faq_${n}_a`]}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="land-final">
        <h2>{t.land_about_title}</h2>
        <p>{t.land_about_p2}</p>
        <CtaPair t={t} onSignup={onSignup} onDemo={onDemo} size="lg" />
        <p className="land-final-note">{t.land_cta_final_note}</p>
      </section>

      <footer className="land-foot">
        <BrandLockup mark={21} title={t.land_foot_copy} />
        <nav aria-label="legal">
          {["privacy", "terms", "eula", "refund", "cookies", "children"].map((id) => (
            <button key={id} type="button" onClick={() => onLegal(id)}>{t[`land_foot_${id}`]}</button>
          ))}
        </nav>
        <a className="land-foot-write" href="mailto:hlibpakh@gmail.com">{t.land_foot_support}</a>
      </footer>
    </div>
  );
}
