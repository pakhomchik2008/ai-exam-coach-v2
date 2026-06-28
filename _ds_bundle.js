/* @ds-bundle: {"format":3,"namespace":"AIExamCoachDesignSystem_99e467","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"GaugeRing","sourcePath":"components/core/GaugeRing.jsx"},{"name":"ProgressBar","sourcePath":"components/core/ProgressBar.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"CourseCard","sourcePath":"components/study/CourseCard.jsx"},{"name":"RatingButtons","sourcePath":"components/study/RatingButtons.jsx"},{"name":"SessionCard","sourcePath":"components/study/SessionCard.jsx"},{"name":"StreakBanner","sourcePath":"components/study/StreakBanner.jsx"},{"name":"WeekStrip","sourcePath":"components/study/WeekStrip.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"b765aee625d8","components/core/Button.jsx":"27eb3b4e8311","components/core/Card.jsx":"c05a65dbfdb2","components/core/GaugeRing.jsx":"dce5b2e37d8c","components/core/ProgressBar.jsx":"861606537033","components/forms/Input.jsx":"d71d85782418","components/forms/Select.jsx":"3c69294de897","components/study/CourseCard.jsx":"cd0ce70f42a0","components/study/RatingButtons.jsx":"9ac5f8c7977a","components/study/SessionCard.jsx":"c0bb922ed57d","components/study/StreakBanner.jsx":"b826d95288c6","components/study/WeekStrip.jsx":"0a38cdb0ea1d","ui_kits/web-app/AIChat.jsx":"645ea8fd0306","ui_kits/web-app/Achievements.jsx":"7a7e5f195194","ui_kits/web-app/AppNav.jsx":"b267679b6f54","ui_kits/web-app/BurnoutAlert.jsx":"5b5e604c1481","ui_kits/web-app/CourseDetail.jsx":"c3438410999b","ui_kits/web-app/Dashboard.jsx":"531d4df59703","ui_kits/web-app/DayDetail.jsx":"738ea5eacfac","ui_kits/web-app/Exams.jsx":"4ef2a9880b84","ui_kits/web-app/FlashcardMode.jsx":"36e92527c484","ui_kits/web-app/Landing.jsx":"dbe126f7bb77","ui_kits/web-app/MistakeJournal.jsx":"dbc464ceb82c","ui_kits/web-app/MockExam.jsx":"5390df416f5e","ui_kits/web-app/MonthlyInsights.jsx":"685500ff3bbc","ui_kits/web-app/Onboarding.jsx":"ca9e5db19b50","ui_kits/web-app/Progress.jsx":"0beb7d6272ba","ui_kits/web-app/QuizMode.jsx":"59629e7e3c73","ui_kits/web-app/Schedule.jsx":"256a90621969","ui_kits/web-app/Settings.jsx":"96ff809ae1a9","ui_kits/web-app/ShareProgress.jsx":"04e641896e3b","ui_kits/web-app/StudyHub.jsx":"5f62bec0ff02","ui_kits/web-app/StudySession.jsx":"17f47b63e29a","ui_kits/web-app/SuccessSimulation.jsx":"6e6340f46909","ui_kits/web-app/UploadFlow.jsx":"bf4bf5c1388a","ui_kits/web-app/WeeklyReview.jsx":"9500316df690","ui_kits/web-app/data.jsx":"c49141193915","ui_kits/web-app/i18n.jsx":"e2dbf2d3c701","ui_kits/web-app/onboarding-data.jsx":"e73870d33cdd","ui_kits/web-app/onboarding-steps.jsx":"18def3d333f8","ui_kits/web-app/study-data.jsx":"c103eb81a99c","ui_kits/web-app/tweaks-panel.jsx":"6591467622ed"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AIExamCoachDesignSystem_99e467 = window.AIExamCoachDesignSystem_99e467 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI Exam Coach — Badge / pill
 * Used for difficulty (easy/medium/hard), risk levels, and status chips.
 * Soft tinted background + saturated text, fully rounded.
 */
function Badge({
  children,
  tone = "neutral",
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      bg: "var(--surface-sunken)",
      fg: "var(--text-muted)"
    },
    easy: {
      bg: "var(--diff-easy-bg)",
      fg: "var(--diff-easy-fg)"
    },
    medium: {
      bg: "var(--diff-medium-bg)",
      fg: "var(--diff-medium-fg)"
    },
    hard: {
      bg: "var(--diff-hard-bg)",
      fg: "var(--diff-hard-fg)"
    },
    success: {
      bg: "var(--emerald-100)",
      fg: "var(--emerald-700)"
    },
    warn: {
      bg: "var(--amber-100)",
      fg: "var(--amber-700)"
    },
    danger: {
      bg: "var(--red-100)",
      fg: "var(--red-700)"
    },
    accent: {
      bg: "var(--indigo-100)",
      fg: "var(--indigo-700)"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 10px",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-medium)",
      fontFamily: "var(--font-sans)",
      lineHeight: 1.4,
      borderRadius: "var(--radius-full)",
      background: t.bg,
      color: t.fg,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI Exam Coach — Button
 * Primary actions are emerald; accent (indigo) is used in onboarding/links;
 * secondary is a slate-bordered neutral; ghost is borderless.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "6px 12px",
      fontSize: "var(--text-sm)",
      radius: "var(--radius-md)"
    },
    md: {
      padding: "10px 20px",
      fontSize: "var(--text-sm)",
      radius: "var(--radius-lg)"
    },
    lg: {
      padding: "16px 24px",
      fontSize: "var(--text-lg)",
      radius: "var(--radius-xl)"
    }
  };
  const variants = {
    primary: {
      background: "var(--action-primary)",
      color: "var(--text-invert)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-md)"
    },
    accent: {
      background: "var(--action-accent)",
      color: "var(--text-invert)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    },
    secondary: {
      background: "var(--surface-card)",
      color: "var(--text-body)",
      border: "1px solid var(--border-strong)",
      boxShadow: "none"
    },
    ghost: {
      background: "transparent",
      color: "var(--action-accent)",
      border: "1px solid transparent",
      boxShadow: "none"
    },
    danger: {
      background: "var(--red-500)",
      color: "var(--text-invert)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-sm)"
    }
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  const [hover, setHover] = React.useState(false);
  const hoverBg = {
    primary: "var(--action-primary-hover)",
    accent: "var(--action-accent-hover)",
    secondary: "var(--surface-muted)",
    ghost: "var(--surface-muted)",
    danger: "var(--red-600)"
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "var(--space-2)",
      width: fullWidth ? "100%" : "auto",
      padding: s.padding,
      fontSize: s.fontSize,
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-semibold)",
      lineHeight: 1,
      borderRadius: s.radius,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: "background var(--dur-fast) ease, box-shadow var(--dur-fast) ease",
      boxShadow: hover && variant === "primary" ? "var(--shadow-lg)" : v.boxShadow,
      background: hover && !disabled ? hoverBg : v.background,
      color: v.color,
      border: v.border,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI Exam Coach — Card
 * The workhorse surface: white, soft border, sm shadow, lifts on hover.
 * Optional subject color "rail" on the left (default) or top edge.
 */
function Card({
  children,
  railColor,
  railEdge = "left",
  interactive = false,
  padding = "var(--space-5)",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const rail = railColor ? railEdge === "top" ? {
    borderTop: `4px solid ${railColor}`
  } : {
    borderLeft: `var(--border-accent-width) solid ${railColor}`
  } : {};
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-xl)",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
      padding,
      cursor: interactive ? "pointer" : "default",
      transition: "box-shadow var(--dur-fast) ease",
      overflow: "hidden",
      ...rail,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/GaugeRing.jsx
try { (() => {
/**
 * AI Exam Coach — GaugeRing
 * Circular readiness dial used on coaching cards. Color follows the
 * same thresholds as ProgressBar (emerald / amber / red).
 */
function GaugeRing({
  value = 0,
  size = 56,
  label,
  strokeColor
}) {
  const pct = Math.max(0, Math.min(100, value));
  const color = strokeColor || (pct >= 80 ? "var(--emerald-500)" : pct >= 55 ? "var(--amber-500)" : "var(--red-500)");
  const r = 15.9;
  const circ = 2 * Math.PI * r;
  const dash = pct / 100 * circ;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: size,
      height: size,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 36 36",
    style: {
      width: size,
      height: size,
      transform: "rotate(-90deg)"
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: r,
    fill: "none",
    stroke: "var(--slate-200)",
    strokeWidth: "3.4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: r,
    fill: "none",
    stroke: color,
    strokeWidth: "3.4",
    strokeLinecap: "round",
    strokeDasharray: `${dash} ${circ - dash}`,
    style: {
      transition: "stroke-dasharray var(--dur-slow) var(--ease-out)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)",
      fontSize: size * 0.22
    }
  }, label ?? `${Math.round(pct)}%`));
}
Object.assign(__ds_scope, { GaugeRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/GaugeRing.jsx", error: String((e && e.message) || e) }); }

// components/core/ProgressBar.jsx
try { (() => {
/**
 * AI Exam Coach — ProgressBar
 * Thin rounded track + fill. Used for exam completion, pace, confidence.
 * Color auto-derives from value (readiness thresholds) unless `color` set.
 */
function ProgressBar({
  value = 0,
  color,
  height = 8,
  autoColor = false,
  trackColor,
  style
}) {
  const pct = Math.max(0, Math.min(100, value));
  const auto = pct >= 80 ? "var(--emerald-500)" : pct >= 55 ? "var(--amber-500)" : "var(--red-500)";
  const fill = color || (autoColor ? auto : "var(--action-primary)");
  return /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": Math.round(pct),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    style: {
      height,
      width: "100%",
      background: trackColor || "var(--surface-sunken)",
      borderRadius: "var(--radius-full)",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: `${pct}%`,
      background: fill,
      borderRadius: "var(--radius-full)",
      transition: "width var(--dur-slow) var(--ease-out)"
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI Exam Coach — Input
 * Rounded-xl field, slate border, emerald-free focus (indigo border in
 * onboarding). Optional label above.
 */
function Input({
  label,
  hint,
  type = "text",
  style,
  id,
  ...rest
}) {
  const inputId = id || (label ? `in-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-1)"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-body)"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 16px",
      fontSize: "var(--text-base)",
      fontFamily: "var(--font-sans)",
      color: "var(--text-strong)",
      background: "var(--surface-card)",
      border: `1px solid ${focus ? "var(--indigo-500)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-xl)",
      outline: "none",
      transition: "border-color var(--dur-fast) ease",
      ...style
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI Exam Coach — Select
 * Matches Input styling. Native select for accessibility.
 */
function Select({
  label,
  hint,
  children,
  style,
  id,
  ...rest
}) {
  const selId = id || (label ? `sel-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-1)"
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selId,
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-body)"
    }
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    id: selId,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 16px",
      fontSize: "var(--text-base)",
      fontFamily: "var(--font-sans)",
      color: "var(--text-strong)",
      background: "var(--surface-card)",
      border: `1px solid ${focus ? "var(--indigo-500)" : "var(--border-default)"}`,
      borderRadius: "var(--radius-xl)",
      outline: "none",
      appearance: "none",
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748B' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 16px center",
      cursor: "pointer",
      transition: "border-color var(--dur-fast) ease",
      ...style
    }
  }, rest), children), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/study/CourseCard.jsx
try { (() => {
/**
 * AI Exam Coach — CourseCard (exam coaching card)
 * The hero card on the dashboard: course name, days-to-exam, readiness
 * gauge, a 3-cell stat strip, pace bar, prediction line, and CTA footer.
 * Top subject rail.
 */
function CourseCard({
  name,
  daysAway,
  examBoard,
  readinessPct = 0,
  confidencePct = 0,
  targetGrade = "—",
  riskLevel = "low",
  // low | medium | high
  predictedGrade,
  gradeProbability = 0,
  paceStatus = "on_track",
  // on_track | slightly_behind | very_behind
  todayCount = 0,
  color = "var(--indigo-500)",
  onClick,
  onStatClick
}) {
  const risk = {
    low: {
      label: "Low",
      fg: "var(--risk-low-fg)",
      bg: "var(--risk-low-bg)"
    },
    medium: {
      label: "Medium",
      fg: "var(--risk-med-fg)",
      bg: "var(--risk-med-bg)"
    },
    high: {
      label: "High",
      fg: "var(--risk-high-fg)",
      bg: "var(--risk-high-bg)"
    }
  }[riskLevel];
  const pace = {
    on_track: {
      label: "On track",
      color: "var(--emerald-500)",
      width: "100%"
    },
    slightly_behind: {
      label: "Slightly behind",
      color: "var(--amber-400)",
      width: "66%"
    },
    very_behind: {
      label: "Very behind",
      color: "var(--red-500)",
      width: "33%"
    }
  }[paceStatus];
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: onClick,
    style: {
      borderRadius: "var(--radius-2xl)",
      border: "1px solid var(--border-default)",
      borderTop: `4px solid ${color}`,
      background: "var(--surface-card)",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      transition: "box-shadow var(--dur-fast) ease",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      padding: "16px 20px 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)",
      lineHeight: "var(--leading-tight)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, "Exam in ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-body)"
    }
  }, daysAway, " days"), examBoard ? ` · ${examBoard}` : "")), /*#__PURE__*/React.createElement(__ds_scope.GaugeRing, {
    value: readinessPct,
    size: 52
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 1,
      background: "var(--border-subtle)",
      borderTop: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    label: "Confidence",
    value: `${confidencePct}%`,
    onStatClick: onStatClick && (() => onStatClick("confidence"))
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Target",
    value: targetGrade,
    onStatClick: onStatClick && (() => onStatClick("target"))
  }), /*#__PURE__*/React.createElement(Stat, {
    label: "Risk",
    value: risk.label,
    bg: risk.bg,
    fg: risk.fg,
    onStatClick: onStatClick && (() => onStatClick("risk"))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.ProgressBar, {
    value: parseInt(pace.width),
    color: pace.color,
    height: 6
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, pace.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, predictedGrade ? /*#__PURE__*/React.createElement(React.Fragment, null, "Predicted: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-body)"
    }
  }, predictedGrade)) : /*#__PURE__*/React.createElement("em", null, "No prediction yet")), /*#__PURE__*/React.createElement("span", {
    onClick: onStatClick && (e => {
      e.stopPropagation();
      onStatClick("probability");
    }),
    style: {
      fontWeight: "var(--weight-medium)",
      color: "var(--indigo-600)",
      cursor: onStatClick ? "pointer" : "inherit",
      textDecoration: onStatClick ? "underline" : "none",
      textDecorationStyle: "dotted",
      textUnderlineOffset: "2px"
    }
  }, gradeProbability, "% chance of target"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-2)",
      borderTop: "1px solid var(--border-subtle)",
      padding: "10px 20px",
      background: "var(--surface-muted)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, todayCount > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: "var(--weight-semibold)",
      color: "var(--indigo-700)"
    }
  }, todayCount, " session", todayCount === 1 ? "" : "s"), " today") : "No sessions today"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--indigo-600)"
    }
  }, todayCount > 0 ? "Start studying →" : "View roadmap →")));
}
function Stat({
  label,
  value,
  bg = "var(--surface-card)",
  fg = "var(--text-strong)",
  onStatClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onStatClick && (e => {
      e.stopPropagation();
      onStatClick();
    }),
    style: {
      background: bg,
      padding: "8px 12px",
      textAlign: "center",
      cursor: onStatClick ? "pointer" : "inherit"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "10px",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-faint)",
      fontWeight: "var(--weight-medium)"
    }
  }, label), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-bold)",
      color: fg
    }
  }, value));
}
Object.assign(__ds_scope, { CourseCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/study/CourseCard.jsx", error: String((e && e.message) || e) }); }

// components/study/RatingButtons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AI Exam Coach — RatingButtons
 * The four-button SM-2 self-grade prompt shown after a study session.
 * Blackout=red, Hard=orange, Good=sky, Easy=emerald.
 */
function RatingButtons({
  onRate,
  disabled = false
}) {
  const buttons = [{
    rating: 1,
    label: "Blackout",
    sub: "Had no idea",
    bg: "var(--rate-blackout)"
  }, {
    rating: 2,
    label: "Hard",
    sub: "Remembered with difficulty",
    bg: "var(--rate-hard)"
  }, {
    rating: 3,
    label: "Good",
    sub: "Remembered with some effort",
    bg: "var(--rate-good)"
  }, {
    rating: 4,
    label: "Easy",
    sub: "Knew it perfectly",
    bg: "var(--rate-easy)"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-3)",
      gridTemplateColumns: "repeat(2, 1fr)"
    }
  }, buttons.map(b => /*#__PURE__*/React.createElement(RateButton, _extends({
    key: b.rating
  }, b, {
    disabled: disabled,
    onClick: () => onRate && onRate(b.rating)
  }))));
}
function RateButton({
  label,
  sub,
  bg,
  disabled,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      textAlign: "left",
      padding: "20px 16px",
      borderRadius: "var(--radius-xl)",
      border: "none",
      background: bg,
      color: "var(--text-invert)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      filter: hover && !disabled ? "brightness(0.92)" : "none",
      transition: "filter var(--dur-fast) ease",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      opacity: 0.9,
      marginTop: 2
    }
  }, sub));
}
Object.assign(__ds_scope, { RatingButtons });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/study/RatingButtons.jsx", error: String((e && e.message) || e) }); }

// components/study/SessionCard.jsx
try { (() => {
/**
 * AI Exam Coach — SessionCard
 * A single scheduled study session: subject eyebrow, topic, difficulty
 * badge, review number, estimate, and a Start button. Left subject rail.
 */
function SessionCard({
  subject,
  subjectColor = "var(--indigo-500)",
  topicName,
  difficulty = 1,
  reviewNumber,
  estMinutes = 45,
  onStart
}) {
  const diffLabel = {
    1: "Easy",
    2: "Medium",
    3: "Hard"
  };
  const diffTone = {
    1: "easy",
    2: "medium",
    3: "hard"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderLeft: `var(--border-accent-width) solid ${subjectColor}`,
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-muted)"
    }
  }, subject), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-strong)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, topicName), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-2)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: diffTone[difficulty]
  }, diffLabel[difficulty]), reviewNumber ? /*#__PURE__*/React.createElement("span", null, "Review ", reviewNumber) : null, /*#__PURE__*/React.createElement("span", null, "~", estMinutes, " min"))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "md",
    onClick: onStart
  }, "Start"));
}
Object.assign(__ds_scope, { SessionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/study/SessionCard.jsx", error: String((e && e.message) || e) }); }

// components/study/StreakBanner.jsx
try { (() => {
/**
 * AI Exam Coach — StreakBanner
 * The motivational streak banner with a warm gradient and 🔥 emoji.
 * Emoji is intentional brand vocabulary here.
 */
function StreakBanner({
  days = 0,
  message = "Keep it going — study at least one session today."
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      borderRadius: "var(--radius-xl)",
      background: "linear-gradient(to right, var(--orange-50), var(--amber-50))",
      border: "1px solid var(--amber-100)",
      padding: "12px 20px",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-2xl)"
    },
    "aria-hidden": "true"
  }, "\uD83D\uDD25"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: "var(--weight-bold)",
      color: "var(--amber-700)"
    }
  }, days, "-day streak"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--amber-700)"
    }
  }, message)));
}
Object.assign(__ds_scope, { StreakBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/study/StreakBanner.jsx", error: String((e && e.message) || e) }); }

// components/study/WeekStrip.jsx
try { (() => {
/**
 * AI Exam Coach — WeekStrip
 * Seven day-cells with completed/scheduled counts. Today gets an emerald
 * ring; a fully-completed day turns emerald-tinted.
 */
function WeekStrip({
  days = [],
  onDayClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: "var(--space-2)"
    }
  }, days.map((d, i) => {
    const allDone = d.scheduled > 0 && d.completed >= d.scheduled;
    const isPast = !d.today && d.completed > 0;
    const hasPlanned = d.scheduled > 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => onDayClick && onDayClick(d, i),
      style: {
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${allDone ? "var(--emerald-100)" : "var(--border-default)"}`,
        background: allDone ? "var(--emerald-50)" : "var(--surface-card)",
        boxShadow: d.today ? "0 0 0 2px var(--emerald-500)" : "none",
        padding: "var(--space-2)",
        textAlign: "center",
        fontFamily: "var(--font-sans)",
        cursor: onDayClick ? "pointer" : "default",
        transition: "box-shadow 0.15s ease, background 0.15s ease"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)"
      }
    }, d.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "var(--text-lg)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--text-strong)"
      }
    }, d.date), hasPlanned ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "var(--text-xs)",
        color: allDone ? "var(--emerald-600)" : d.today ? "var(--indigo-600)" : "var(--text-muted)"
      }
    }, allDone ? "✓ " : "", d.completed, "/", d.scheduled) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: "var(--text-xs)",
        color: "var(--text-faint)"
      }
    }, "\u2013"));
  }));
}
Object.assign(__ds_scope, { WeekStrip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/study/WeekStrip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/AIChat.jsx
try { (() => {
// AI Exam Coach — AI Coach Chat tab v2 (all feedback fixes applied)
function AIChat({
  t,
  initialQuery,
  onConsumeQuery
}) {
  const L = (en, uk) => ({
    en,
    uk
  })[t && t.code || "en"] || en;
  const courses = window.COURSES;
  const weakCourse = courses.reduce((a, b) => b.gradeProbability < a.gradeProbability ? b : a, courses[0]);
  const focusTopic = window.TODAY_SESSIONS[0];
  const STORAGE_KEY = "aicoach_messages_v2";
  const [messages, setMessages] = React.useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [headerCollapsed, setHeaderCollapsed] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").length > 0;
    } catch {
      return false;
    }
  });
  const [answeredQuiz, setAnsweredQuiz] = React.useState({});
  const bodyRef = React.useRef(null);
  const handled = React.useRef(false);
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
    if (messages.length > 0) setHeaderCollapsed(true);
  }, [messages]);
  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);
  React.useEffect(() => {
    if (initialQuery && !handled.current) {
      handled.current = true;
      if (onConsumeQuery) onConsumeQuery();
      setTimeout(() => send(initialQuery), 60);
    }
  }, [initialQuery]);
  const clearConversation = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setMessages([]);
    setHeaderCollapsed(false);
    setAnsweredQuiz({});
    handled.current = false;
  };
  const detectMCQ = text => {
    const opts = [];
    text.split('\n').forEach(line => {
      const m = line.match(/^([A-D])\)\s+(.+)$/);
      if (m) opts.push({
        letter: m[1],
        label: m[2].trim()
      });
    });
    return opts.length >= 2 ? opts : null;
  };
  const getContextualChips = lastAiText => {
    const s = (lastAiText || "").toLowerCase();
    if (/type [a-d]/i.test(lastAiText || "") || s.includes("↓")) {
      return ["Explain this topic", "Show the answer", "Skip question"];
    }
    if (s.includes("plan") || s.includes("week")) {
      return ["Quiz me on Biology", "What should I do first?", "What are my weakest topics?"];
    }
    if (s.includes("biology") || s.includes("chemistry") || s.includes("weak") || s.includes("photosynthesis")) {
      return ["Quiz me on this", "Explain differently", "What should I study next?"];
    }
    return ["Quiz me on Biology", "Make a study plan", "What are my weakest topics?"];
  };
  const getResponse = q => {
    const s = q.toLowerCase();
    if (s.includes("tonight") || s.includes("study now") || s.includes("start a study") || s.includes("reaction rates") || s.includes("study session")) {
      return `Start with **${focusTopic.topic}** — ${focusTopic.est} min.\n\nRetention is only **${focusTopic.retention}%**, last reviewed **${focusTopic.lastReviewed}** ago — longest gap on your list.\n\nAfter that: **Reaction Rates & Equilibria** (Chemistry). Exam in 28 days, confidence dropping.\n\nThese two sessions push readiness from 61% → 64%.`;
    }
    if (s.includes("still") || s.includes("get an a")) {
      return `**${weakCourse.subject}** is your biggest challenge — **${weakCourse.gradeProbability}%** chance of reaching **${weakCourse.targetGrade}** from **${weakCourse.predictedGrade}**.\n\nMain blockers:\n• **${weakCourse.weakTopics[0]}** — 4 wrong in a row\n• **${weakCourse.weakTopics[1]}** — confidence dropping\n\nIncrease to **${weakCourse.recommendedSessions + 2} sessions/week** and tackle those two first → model puts you at **~58% in 3 weeks**. That's a real shot.`;
    }
    if (s.includes("plan") || s.includes("next week")) {
      return `Here's your optimal plan for next week:\n\n**Biology — 2 sessions**\n• DNA replication (45 min)\n• Genetics & inheritance (45 min)\n\n**Chemistry — 6 sessions** ⚠️ Priority\n• Organic chemistry × 3 (60 min)\n• Electrochemistry × 2 (45 min)\n• Past paper × 1 (60 min)\n\n**History — 2 sessions**\n• Cold War consolidation (45 min)\n• Essay practice (45 min)\n\nTotal: ~13 hours. Chemistry gets extra weight — highest-risk subject.`;
    }
    if (s.includes("weak") || s.includes("spots")) {
      return `Your three weakest areas right now:\n\n1. **Organic Chemistry** (Chemistry)\n→ 4 incorrect in a row · last reviewed 12 days ago ⚠️\n\n2. **Cellular Respiration** (Biology)\n→ 41% retention · confidence decreasing\n\n3. **Genetics & Inheritance** (Biology)\n→ Not reviewed in 6 days · exam in 23 days\n\nOrganic Chemistry is most urgent — one focused session could break the streak.`;
    }
    if (s.includes("explain") || s.includes("photosynthesis")) {
      return `Photosynthesis converts light energy into glucose. Two stages:\n\n**1. Light-dependent reactions** (thylakoid membrane)\n• Chlorophyll absorbs light → splits H₂O → releases O₂\n• Produces ATP and NADPH\n\n**2. Calvin cycle** (stroma)\n• ATP + NADPH + CO₂ → G3P → glucose\n\n**Key equation:**\n6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂\n\nHigh-frequency AQA topic. Want me to quiz you on it?`;
    }
    if (s.includes("quiz") || s.includes("test me")) {
      return `Biology quiz! 🧬\n\n**Q1.** What is the role of NADPH in the Calvin cycle?\n\nA) Provides energy to split water\nB) Transfers hydrogen to reduce GP to G3P\nC) Acts as electron donor in photosystem I\nD) Synthesises glucose directly from CO₂\n\nType A, B, C or D ↓`;
    }
    if (s === "b" || s.startsWith("b —") || s.startsWith("b—")) {
      return `Correct! ✓ **B** — NADPH transfers hydrogen to reduce glycerate-3-phosphate (GP) to glyceraldehyde-3-phosphate (G3P).\n\n**Q2.** Where do the light-dependent reactions take place?\n\nA) Stroma of the chloroplast\nB) Outer chloroplast membrane\nC) Thylakoid membrane\nD) Mitochondria matrix\n\nType A, B, C or D ↓`;
    }
    if (s === "c" || s.startsWith("c —") || s.startsWith("c—")) {
      return `Not quite — C is incorrect. Correct answer is **B** — NADPH transfers hydrogen to reduce GP to G3P.\n\n**Q2.** Where do the light-dependent reactions take place?\n\nA) Stroma of the chloroplast\nB) Outer chloroplast membrane\nC) Thylakoid membrane\nD) Mitochondria matrix\n\nType A, B, C or D ↓`;
    }
    if (s === "c" && messages.some(m => m.text && m.text.includes("Q2."))) {
      return `Correct! ✓ **C** — The light-dependent reactions take place on the thylakoid membrane.\n\nGreat work! You've got the basics of photosynthesis down. Want to continue with the Calvin cycle, or move to a different topic?`;
    }
    return `Based on your current profile:\n\n• **Biology** — 62% chance of A (exam in 23 days)\n• **Chemistry** — 31% chance of A (highest risk ⚠️)\n• **History** — 78% chance of A* (on track)\n\nMost impactful next step: **${focusTopic.topic}** — ${focusTopic.retention}% retention after ${focusTopic.lastReviewed}. Want a targeted session plan?`;
  };
  const send = (rawText, displayText) => {
    const msg = (rawText || "").trim();
    if (!msg || typing) return;
    setInput("");
    const shown = displayText !== undefined ? displayText : rawText;
    setMessages(m => [...m, {
      role: "user",
      text: shown
    }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(m => [...m, {
        role: "ai",
        text: getResponse(msg)
      }]);
    }, 900 + Math.random() * 500);
  };
  const fmtMsg = text => {
    const renderInline = str => str.split(/\*\*(.*?)\*\*/g).map((p, j) => j % 2 === 1 ? React.createElement('strong', {
      key: j
    }, p) : p);
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (trimmed === "") return React.createElement('div', {
        key: i,
        style: {
          height: 4
        }
      });
      const bullet = trimmed.match(/^[•\-]\s+(.+)$/);
      const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (bullet) return React.createElement('div', {
        key: i,
        style: {
          display: "flex",
          gap: 6,
          marginLeft: 2
        }
      }, React.createElement('span', {
        style: {
          color: "#6366f1",
          flexShrink: 0
        }
      }, "•"), React.createElement('span', null, renderInline(bullet[1])));
      if (numbered) return React.createElement('div', {
        key: i,
        style: {
          display: "flex",
          gap: 6,
          marginLeft: 2
        }
      }, React.createElement('span', {
        style: {
          color: "#6366f1",
          flexShrink: 0,
          minWidth: 18
        }
      }, numbered[1] + "."), React.createElement('span', null, renderInline(numbered[2])));
      return React.createElement('div', {
        key: i
      }, renderInline(line));
    });
  };
  const lastAiMsg = [...messages].reverse().find(m => m.role === "ai");
  const chips = lastAiMsg && !typing ? getContextualChips(lastAiMsg.text) : null;
  const CoachIcon = ({
    size = 32
  }) => React.createElement('div', {
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      background: "linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, React.createElement('svg', {
    width: size * 0.54,
    height: size * 0.54,
    viewBox: "0 0 20 20",
    fill: "none"
  }, React.createElement('path', {
    d: "M10 2C7.24 2 5 4.24 5 7c0 1.9 1.05 3.55 2.6 4.4L7.3 12h5.4l-.3-.6C14.05 10.55 15 8.9 15 7c0-2.76-2.24-5-5-5z",
    fill: "white",
    opacity: "0.95"
  }), React.createElement('rect', {
    x: "7.5",
    y: "13",
    width: "5",
    height: "1.5",
    rx: "0.75",
    fill: "white",
    opacity: "0.75"
  }), React.createElement('rect', {
    x: "8.5",
    y: "15",
    width: "3",
    height: "1.2",
    rx: "0.6",
    fill: "white",
    opacity: "0.55"
  })));
  return React.createElement('div', {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 140px)",
      minHeight: 480,
      fontFamily: "var(--font-sans)"
    }
  },
  // Header — collapses to 44px slim bar
  React.createElement('div', {
    style: {
      padding: headerCollapsed ? "8px 20px" : "16px 20px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: headerCollapsed ? 44 : 68,
      transition: "min-height 0.2s ease, padding 0.2s ease"
    }
  }, React.createElement('div', {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, React.createElement(CoachIcon, {
    size: headerCollapsed ? 28 : 40
  }), headerCollapsed ? React.createElement('div', {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, React.createElement('span', {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: "var(--text-strong)"
    }
  }, "AI Coach"), React.createElement('span', {
    style: {
      fontSize: 11,
      color: "#059669"
    }
  }, "● Online")) : React.createElement('div', null, React.createElement('p', {
    style: {
      margin: 0,
      fontWeight: 700,
      color: "var(--text-strong)",
      fontSize: 15
    }
  }, "AI Coach"), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: "#059669"
    }
  }, "● Online · knows your exams"))), messages.length > 0 ? React.createElement('button', {
    onClick: clearConversation,
    style: {
      border: "1px solid var(--border-default)",
      background: "transparent",
      color: "var(--text-muted)",
      borderRadius: 8,
      padding: "4px 10px",
      fontSize: 11,
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, "Clear chat") : null),
  // Messages area
  React.createElement('div', {
    ref: bodyRef,
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      background: "var(--surface-page)"
    }
  },
  // Welcome bubble
  React.createElement('div', {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }
  }, React.createElement(CoachIcon, {
    size: 32
  }), React.createElement('div', {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "16px",
      borderTopLeftRadius: 4,
      padding: "10px 14px",
      maxWidth: "80%",
      fontSize: 13,
      color: "var(--text-body)",
      lineHeight: 1.6
    }
  }, "Hi 👋 I'm your AI coach. I have access to your exams, grades, confidence scores, and study history. Ask me anything.")),
  // Onboarding tiles (only when no messages)
  messages.length === 0 && React.createElement('div', {
    style: {
      paddingLeft: 44,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, ...[{
    icon: "📚",
    label: "Make a study plan",
    q: "Create a plan for next week"
  }, {
    icon: "🧪",
    label: "Quiz me topic by topic",
    q: "Quiz me on Biology"
  }, {
    icon: "📊",
    label: "Analyse my weak spots",
    q: "What are my weakest topics?"
  }].map((tile, idx) => React.createElement('button', {
    key: idx,
    onClick: () => send(tile.q),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%",
      maxWidth: 420,
      textAlign: "left",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 16,
      padding: "12px 16px",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--text-body)",
      fontWeight: 500
    }
  }, React.createElement('span', {
    style: {
      fontSize: 20
    }
  }, tile.icon), tile.label)), React.createElement('div', {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4
    }
  }, ...["What should I study tonight?", "Can I still get an A?", "Explain photosynthesis"].map((c, ci) => React.createElement('button', {
    key: ci,
    onClick: () => send(c),
    style: {
      border: "1px solid #c7d2fe",
      background: "#eef2ff",
      color: "#4338ca",
      borderRadius: 999,
      padding: "6px 14px",
      fontSize: 11,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, c)))),
  // Message bubbles
  ...messages.map((m, i) => {
    const isUser = m.role === "user";
    const mcqOpts = !isUser ? detectMCQ(m.text) : null;
    const isAnswered = answeredQuiz[i] !== undefined;
    return React.createElement('div', {
      key: i,
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: isUser ? "flex-end" : "flex-start"
      }
    }, React.createElement('div', {
      style: {
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        flexDirection: isUser ? "row-reverse" : "row"
      }
    }, !isUser && React.createElement(CoachIcon, {
      size: 32
    }), React.createElement('div', {
      style: {
        background: isUser ? "#4f46e5" : "var(--surface-card)",
        color: isUser ? "#fff" : "var(--text-body)",
        border: isUser ? "none" : "1px solid var(--border-subtle)",
        borderRadius: 16,
        borderTopLeftRadius: !isUser ? 4 : 16,
        borderTopRightRadius: isUser ? 4 : 16,
        padding: "10px 14px",
        maxWidth: "80%",
        fontSize: 13,
        lineHeight: 1.65
      }
    }, fmtMsg(m.text))),
    // MCQ answer buttons
    mcqOpts && !isAnswered && React.createElement('div', {
      style: {
        paddingLeft: 44,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 480,
        width: "100%"
      }
    }, ...mcqOpts.map(opt => React.createElement('button', {
      key: opt.letter,
      onClick: () => {
        setAnsweredQuiz(prev => ({
          ...prev,
          [i]: opt.letter
        }));
        send(opt.letter.toLowerCase(), opt.letter + " — " + opt.label);
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        borderRadius: 10,
        padding: "10px 14px",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-body)",
        textAlign: "left"
      }
    }, React.createElement('span', {
      style: {
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: "#e0e7ff",
        color: "#4338ca",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        flexShrink: 0
      }
    }, opt.letter), opt.label))), mcqOpts && isAnswered && React.createElement('div', {
      style: {
        paddingLeft: 44
      }
    }, React.createElement('span', {
      style: {
        fontSize: 11,
        color: "var(--text-faint)"
      }
    }, "Answered: ", React.createElement('strong', {
      style: {
        color: "#4f46e5"
      }
    }, answeredQuiz[i]))));
  }),
  // Typing indicator
  typing && React.createElement('div', {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }
  }, React.createElement(CoachIcon, {
    size: 32
  }), React.createElement('div', {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 16,
      borderTopLeftRadius: 4,
      padding: "14px 18px",
      display: "flex",
      gap: 5,
      alignItems: "center"
    }
  }, ...[0, 1, 2].map(d => React.createElement('span', {
    key: d,
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "#6366f1",
      animation: "aiTyping 1.2s ease-in-out infinite",
      animationDelay: d * 0.2 + "s"
    }
  })))),
  // Contextual chips after AI response
  chips && React.createElement('div', {
    style: {
      paddingLeft: 44,
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, ...chips.map((c, ci) => React.createElement('button', {
    key: ci,
    onClick: () => send(c),
    style: {
      border: "1px solid #c7d2fe",
      background: "#eef2ff",
      color: "#4338ca",
      borderRadius: 999,
      padding: "6px 14px",
      fontSize: 11,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, c)))),
  // Input bar
  React.createElement('div', {
    style: {
      padding: "12px 16px",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-card)",
      display: "flex",
      gap: 8,
      alignItems: "flex-end"
    }
  }, React.createElement('textarea', {
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(input);
      }
    },
    placeholder: "Ask your coach anything… (Enter to send, Shift+Enter for new line)",
    rows: 1,
    style: {
      flex: 1,
      border: "1px solid var(--border-default)",
      borderRadius: 12,
      padding: "10px 14px",
      fontSize: 13,
      fontFamily: "var(--font-sans)",
      color: "var(--text-body)",
      background: "var(--surface-page)",
      resize: "none",
      outline: "none",
      lineHeight: 1.5,
      maxHeight: 100,
      overflowY: "auto"
    }
  }), React.createElement('button', {
    onClick: () => send(input),
    disabled: !input.trim() || typing,
    style: {
      background: input.trim() && !typing ? "#4f46e5" : "#c7d2fe",
      color: "white",
      border: "none",
      borderRadius: 12,
      padding: "10px 18px",
      fontSize: 13,
      fontWeight: 600,
      cursor: input.trim() && !typing ? "pointer" : "default",
      fontFamily: "var(--font-sans)",
      transition: "background 0.15s",
      whiteSpace: "nowrap"
    }
  }, "Send →")));
}
Object.assign(window, {
  AIChat
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/AIChat.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Achievements.jsx
try { (() => {
// AI Exam Coach — Achievements Screen
function Achievements({
  onBack
}) {
  const achs = window.ALL_ACHIEVEMENTS;
  const unlocked = achs.filter(a => a.unlocked).length;
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      fontFamily: 'var(--font-sans)'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, React.createElement('button', {
    onClick: onBack,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      padding: 0
    }
  }, '← Back'), React.createElement('div', null, React.createElement('h1', {
    style: {
      margin: 0,
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, 'Achievements'), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, unlocked + ' of ' + achs.length + ' unlocked'))),
  // Progress bar
  React.createElement('div', null, React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 6,
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)'
    }
  }), React.createElement('div', {
    style: {
      background: 'var(--surface-muted)',
      borderRadius: 999,
      height: 6
    }
  }, React.createElement('div', {
    style: {
      height: '100%',
      width: Math.round(unlocked / achs.length * 100) + '%',
      background: 'linear-gradient(90deg,var(--indigo-600),#7c3aed)',
      borderRadius: 999,
      transition: 'width 0.4s'
    }
  })), React.createElement('p', {
    style: {
      margin: '6px 0 0',
      fontSize: 11,
      color: 'var(--text-muted)',
      textAlign: 'right'
    }
  }, Math.round(unlocked / achs.length * 100) + '% complete')),
  // Recently unlocked
  React.createElement('div', null, React.createElement('h3', {
    style: {
      margin: '0 0 10px',
      fontSize: 'var(--text-sm)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: 'var(--text-faint)'
    }
  }, 'Recently Unlocked'), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, ...achs.filter(a => a.unlocked).map(a => React.createElement('div', {
    key: a.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: 'linear-gradient(135deg,var(--indigo-50),#f5f3ff)',
      border: '1px solid var(--indigo-100)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 16px'
    }
  }, React.createElement('span', {
    style: {
      fontSize: 28,
      flexShrink: 0
    }
  }, a.icon), React.createElement('div', {
    style: {
      flex: 1
    }
  }, React.createElement('p', {
    style: {
      margin: '0 0 2px',
      fontWeight: 700,
      color: 'var(--indigo-700)',
      fontSize: 'var(--text-sm)'
    }
  }, '' + a.title), React.createElement('p', {
    style: {
      margin: '0 0 2px',
      fontSize: 'var(--text-xs)',
      color: 'var(--indigo-500)',
      lineHeight: 1.4
    }
  }, '' + a.desc), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 10,
      color: 'var(--indigo-400)'
    }
  }, 'Unlocked ' + a.date)), React.createElement('span', {
    style: {
      fontSize: 18
    }
  }, '✓'))))),
  // In progress
  React.createElement('div', null, React.createElement('h3', {
    style: {
      margin: '0 0 10px',
      fontSize: 'var(--text-sm)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: 'var(--text-faint)'
    }
  }, 'In Progress'), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, ...achs.filter(a => !a.unlocked).map(a => React.createElement('div', {
    key: a.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 16px',
      opacity: a.progress === 0 ? 0.5 : 1
    }
  }, React.createElement('span', {
    style: {
      fontSize: 28,
      flexShrink: 0,
      filter: a.progress === 0 ? 'grayscale(1)' : 'none'
    }
  }, a.icon), React.createElement('div', {
    style: {
      flex: 1
    }
  }, React.createElement('p', {
    style: {
      margin: '0 0 2px',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)'
    }
  }, '' + a.title), React.createElement('p', {
    style: {
      margin: '0 0 6px',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      lineHeight: 1.4
    }
  }, '' + a.desc), a.progress > 0 && React.createElement('div', null, React.createElement('div', {
    style: {
      background: 'var(--surface-muted)',
      borderRadius: 999,
      height: 4
    }
  }, React.createElement('div', {
    style: {
      height: '100%',
      width: a.progress + '%',
      background: 'var(--indigo-600)',
      borderRadius: 999
    }
  })), React.createElement('p', {
    style: {
      margin: '3px 0 0',
      fontSize: 10,
      color: 'var(--text-faint)'
    }
  }, a.progress + '% complete'))))))));
}
window.Achievements = Achievements;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Achievements.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/AppNav.jsx
try { (() => {
// AI Exam Coach — top navigation + language switcher
function AppNav({
  current,
  onNavigate,
  onLogout,
  lang,
  onLangChange
}) {
  const t = window.LANGS[lang] || window.LANGS.en;
  const links = [{
    id: "dashboard",
    label: t.nav_dashboard
  }, {
    id: "chat",
    label: t.nav_chat || "AI Coach"
  }, {
    id: "study",
    label: "Study"
  }, {
    id: "schedule",
    label: t.nav_schedule
  }, {
    id: "exams",
    label: t.nav_exams
  }, {
    id: "progress",
    label: t.nav_progress
  }, {
    id: "settings",
    label: t.nav_settings
  }];
  const [langOpen, setLangOpen] = React.useState(false);
  const langs = Object.values(window.LANGS);
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      borderBottom: "1px solid var(--border-default)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-app)",
      margin: "0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--indigo-600)"
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("span", null, "AI Exam Coach")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "4px"
    }
  }, links.map(l => {
    const active = current === l.id;
    return /*#__PURE__*/React.createElement("button", {
      key: l.id,
      onClick: () => onNavigate(l.id),
      style: {
        border: "none",
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        padding: "6px 12px",
        fontSize: "var(--text-sm)",
        fontFamily: "var(--font-sans)",
        background: active ? "var(--slate-100)" : "transparent",
        color: active ? "var(--text-strong)" : "var(--text-muted)",
        fontWeight: active ? "var(--weight-medium)" : "var(--weight-normal)"
      }
    }, l.label);
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      marginLeft: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setLangOpen(o => !o),
    style: {
      border: "1px solid var(--border-default)",
      cursor: "pointer",
      borderRadius: "var(--radius-md)",
      padding: "5px 10px",
      fontSize: "var(--text-sm)",
      fontFamily: "var(--font-sans)",
      background: "var(--surface-card)",
      color: "var(--text-body)",
      display: "flex",
      alignItems: "center",
      gap: "4px"
    }
  }, /*#__PURE__*/React.createElement("span", null, t.flag), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "10px",
      color: "var(--text-faint)"
    }
  }, "\u25BE")), langOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 6px)",
      right: 0,
      zIndex: 100,
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
      minWidth: "160px"
    }
  }, langs.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.code,
    onClick: () => {
      onLangChange(l.code);
      setLangOpen(false);
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      width: "100%",
      textAlign: "left",
      padding: "10px 14px",
      border: "none",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)",
      background: lang === l.code ? "var(--indigo-50)" : "var(--surface-card)",
      color: lang === l.code ? "var(--indigo-700)" : "var(--text-body)",
      fontWeight: lang === l.code ? "var(--weight-medium)" : "var(--weight-normal)"
    }
  }, /*#__PURE__*/React.createElement("span", null, l.flag), /*#__PURE__*/React.createElement("span", null, l.label))))), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      marginLeft: "4px",
      fontSize: "var(--text-sm)",
      color: "var(--text-faint)",
      fontFamily: "var(--font-sans)"
    }
  }, t.nav_logout))));
}
window.AppNav = AppNav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/AppNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/BurnoutAlert.jsx
try { (() => {
// AI Exam Coach — Predictive Burnout Detection (#9)
function BurnoutAlert({
  t
}) {
  const [dismissed, setDismissed] = React.useState(() => {
    try {
      return sessionStorage.getItem('burnout_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [aiMsg, setAiMsg] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const week = window.WEEK || [];
  // Past days Mon-Wed (indices 0-2 since today = Wed in mock data)
  const past = week.slice(0, 3);
  const pastDone = past.reduce((a, d) => a + d.completed, 0);
  const studyHours = Math.round(pastDone * 0.75 * 10) / 10; // ~45 min each
  const totalMissed = week.reduce((a, d) => a + Math.max(0, d.scheduled - d.completed), 0);
  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('burnout_dismissed', '1');
    } catch {}
  };

  // High intensity: >4h in 3 days; Missed: >3 scheduled sessions skipped
  const scenario = studyHours >= 4.5 ? 'intensity' : totalMissed >= 4 ? 'missed' : null;
  if (!scenario || dismissed) return null;
  const isIntensity = scenario === 'intensity';
  const getAdvice = async () => {
    setLoading(true);
    try {
      const p = isIntensity ? `A student studied ${studyHours}h in 3 days (${pastDone} sessions). Write a 1-sentence warm, supportive message about sustainable study and rest. Don't be alarming.` : `A student missed ${totalMissed} sessions this week. Write a 1-sentence encouraging message about rebuilding consistency with a lighter schedule.`;
      setAiMsg(await window.claude.complete(p));
    } catch {
      setAiMsg(null);
    }
    setLoading(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-xl)',
      background: isIntensity ? '#fffbeb' : '#f0f9ff',
      border: `1px solid ${isIntensity ? '#fde68a' : '#bae6fd'}`,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      flexShrink: 0,
      marginTop: 1
    }
  }, isIntensity ? '⚠️' : '💙'), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 3px',
      fontWeight: 700,
      fontSize: 'var(--text-sm)',
      color: isIntensity ? '#92400e' : '#0369a1'
    }
  }, isIntensity ? `You've studied ${studyHours}h in the last 3 days` : `You've missed ${totalMissed} sessions this week`), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 6px',
      fontSize: 'var(--text-xs)',
      color: isIntensity ? '#b45309' : '#0284c7',
      lineHeight: 1.5
    }
  }, aiMsg || (isIntensity ? 'Consider a rest day or lighter session today — consistent pacing leads to better long-term retention.' : "Let's scale back next week's load and rebuild momentum gradually. Small consistent steps matter more than big catchups.")), !aiMsg && !loading && /*#__PURE__*/React.createElement("button", {
    onClick: getAdvice,
    style: {
      border: 'none',
      background: 'transparent',
      padding: 0,
      fontSize: 11,
      color: isIntensity ? '#d97706' : '#0284c7',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      textDecoration: 'underline'
    }
  }, "Get personalised advice \u2192"), loading && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "\uD83E\uDD16 Thinking\u2026")), /*#__PURE__*/React.createElement("button", {
    onClick: dismiss,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-faint)',
      fontSize: 16,
      padding: 0,
      flexShrink: 0,
      lineHeight: 1
    }
  }, "\u2715"));
}
window.BurnoutAlert = BurnoutAlert;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/BurnoutAlert.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/CourseDetail.jsx
try { (() => {
// AI Exam Coach — CourseDetail: deep-dive modal for an exam coach card.
// Investigate readiness/risk, and change target grade, confidence & study
// intensity with the success probability recomputing live.
function CourseDetail({
  course,
  onClose,
  onStart,
  onSave,
  focus,
  t
}) {
  const {
    Button,
    GaugeRing,
    Badge
  } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({
    en,
    uk,
    ru,
    fr,
    de
  })[t && t.code || "en"] || en;
  const grade = window.examType ? window.examType(course.examTypeId) : null;
  const opts = grade ? grade.grade.options : ["A*", "A", "B", "C", "D", "E"];
  const [target, setTarget] = React.useState(course.targetGrade);
  const [confidence, setConfidence] = React.useState(course.confidencePct);
  const [sessions, setSessions] = React.useState(course.recommendedSessions || 3);
  const [savedFlash, setSavedFlash] = React.useState(false);

  // live success-probability model
  const prob = React.useMemo(() => {
    const origIdx = opts.indexOf(String(course.targetGrade));
    const newIdx = opts.indexOf(String(target));
    const harder = origIdx >= 0 && newIdx >= 0 ? origIdx - newIdx : 0;
    let p = course.gradeProbability + (sessions - (course.recommendedSessions || 3)) * 6 + (confidence - course.confidencePct) * 0.4 - harder * 14;
    return Math.max(3, Math.min(97, Math.round(p)));
  }, [target, confidence, sessions]);
  const readiness = Math.max(3, Math.min(99, Math.round(course.readinessPct + (confidence - course.confidencePct) * 0.5 + (sessions - (course.recommendedSessions || 3)) * 4)));
  const risk = prob >= 60 ? {
    id: "low",
    tone: "easy",
    label: L("Low", "Низький", "Низкий", "Faible", "Niedrig"),
    color: "var(--emerald-600)"
  } : prob >= 40 ? {
    id: "medium",
    tone: "medium",
    label: L("Medium", "Середній", "Средний", "Moyen", "Mittel"),
    color: "var(--amber-600)"
  } : {
    id: "high",
    tone: "hard",
    label: L("High", "Високий", "Высокий", "Élevé", "Hoch"),
    color: "var(--red-500)"
  };
  const probColor = prob >= 60 ? "var(--emerald-600)" : prob >= 40 ? "var(--amber-600)" : "var(--red-500)";
  const coachLine = prob >= 75 ? L("You're comfortably on track for this target. Hold the pace.", "Ви впевнено йдете до цілі. Тримайте темп.", "Вы уверенно идёте к цели. Держите темп.", "Vous êtes en bonne voie. Gardez le rythme.", "Du bist klar auf Kurs. Halte das Tempo.") : prob >= 50 ? L("Within reach — a couple more sessions a week would lock it in.", "У межах досяжності — ще кілька сесій на тиждень закріплять результат.", "В пределах досягаемости — пара дополнительных сессий закрепит результат.", "À portée — quelques séances de plus par semaine suffiraient.", "In Reichweite — ein paar Einheiten mehr pro Woche sichern es.") : L("This target is a stretch right now. Add sessions or revisit your weak topics.", "Ця ціль зараз амбітна. Додайте сесій або поверніться до слабких тем.", "Эта цель сейчас амбициозна. Добавьте сессий или вернитесь к слабым темам.", "Cet objectif est ambitieux. Ajoutez des séances ou revoyez vos points faibles.", "Dieses Ziel ist ambitioniert. Mehr Einheiten oder Schwachstellen wiederholen.");
  const bodyRef = React.useRef(null);
  const secRefs = {
    target: React.useRef(null),
    confidence: React.useRef(null),
    risk: React.useRef(null),
    probability: React.useRef(null)
  };
  const [glow, setGlow] = React.useState(focus || null);
  React.useEffect(() => {
    if (focus && secRefs[focus] && secRefs[focus].current && bodyRef.current) {
      bodyRef.current.scrollTop = Math.max(0, secRefs[focus].current.offsetTop - 12);
      const id = setTimeout(() => setGlow(null), 1600);
      return () => clearTimeout(id);
    }
  }, []);
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const examDate = new Date(Date.now() + course.daysAway * 864e5).toLocaleDateString(t && t.code === "uk" ? "uk-UA" : t && t.code === "ru" ? "ru-RU" : t && t.code === "fr" ? "fr-FR" : t && t.code === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "short"
  });
  const sec = id => ({
    borderRadius: "var(--radius-xl)",
    border: glow === id ? `2px solid ${course.color}` : "1px solid var(--border-subtle)",
    background: "var(--surface-card)",
    padding: "var(--space-4)",
    transition: "border-color var(--dur-normal) ease",
    boxShadow: glow === id ? "var(--shadow-sm)" : "none"
  });
  const segBtn = selected => ({
    minWidth: 46,
    minHeight: 44,
    padding: "0 var(--space-3)",
    borderRadius: "var(--radius-lg)",
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-semibold)",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    border: selected ? "2px solid var(--indigo-600)" : "1.5px solid var(--border-default)",
    background: selected ? "var(--indigo-50)" : "var(--surface-card)",
    color: selected ? "var(--indigo-700)" : "var(--text-muted)"
  });
  const eyebrow = {
    margin: "0 0 var(--space-3)",
    fontSize: "var(--text-xs)",
    fontWeight: "var(--weight-semibold)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-wide)",
    color: "var(--text-faint)"
  };
  const dirty = target !== course.targetGrade || confidence !== course.confidencePct || sessions !== (course.recommendedSessions || 3);
  const save = () => {
    onSave && onSave({
      ...course,
      targetGrade: target,
      confidencePct: confidence,
      recommendedSessions: sessions,
      gradeProbability: prob,
      readinessPct: readiness,
      riskLevel: risk.id
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };
  const startSession = () => {
    const s = (window.TODAY_SESSIONS || []).find(x => x.subject === course.name) || {
      id: course.id + "-s",
      subject: course.name,
      color: course.color,
      topic: course.weakTopics[0],
      difficulty: 3,
      review: 1,
      est: 45
    };
    onStart && onStart(s);
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 60,
      background: "rgba(15,23,42,0.45)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      padding: "0",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: 600,
      maxHeight: "94vh",
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-page)",
      borderTopLeftRadius: "var(--radius-2xl)",
      borderTopRightRadius: "var(--radius-2xl)",
      borderTop: `5px solid ${course.color}`,
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      padding: "var(--space-5) var(--space-5) var(--space-4)",
      background: "var(--surface-card)",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)"
    }
  }, course.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, L("Exam", "Іспит", "Экзамен", "Examen", "Prüfung"), " ", examDate, " \xB7 ", course.daysAway, " ", L("days away", "дн. лишилось", "дн. осталось", "j restants", "Tage"), course.examBoard ? ` · ${course.examBoard}` : "")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      border: "none",
      background: "var(--surface-muted)",
      width: 36,
      height: 36,
      borderRadius: "var(--radius-full)",
      cursor: "pointer",
      fontSize: 18,
      color: "var(--text-muted)",
      lineHeight: 1,
      flexShrink: 0
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    ref: bodyRef,
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: secRefs.probability,
    style: {
      ...sec("probability"),
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: "var(--space-5)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(GaugeRing, {
    value: readiness,
    size: 92
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-muted)"
    }
  }, L("Readiness", "Готовність", "Готовность", "Préparation", "Bereitschaft"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-5xl)",
      fontWeight: "var(--weight-bold)",
      color: probColor,
      lineHeight: 1
    }
  }, prob, "%"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 var(--space-2)",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, L("chance of hitting", "шанс досягти", "шанс достичь", "chance d'atteindre", "Chance auf"), " ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--indigo-700)"
    }
  }, target)), /*#__PURE__*/React.createElement("span", {
    ref: secRefs.risk,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, L("Risk", "Ризик", "Риск", "Risque", "Risiko"), ": ", /*#__PURE__*/React.createElement(Badge, {
    tone: risk.tone
  }, risk.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "flex-start",
      padding: "var(--space-3) var(--space-4)",
      borderRadius: "var(--radius-xl)",
      background: "var(--indigo-50)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: 20
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      lineHeight: 1.5
    }
  }, coachLine)), /*#__PURE__*/React.createElement("div", {
    ref: secRefs.target,
    style: sec("target")
  }, /*#__PURE__*/React.createElement("p", {
    style: eyebrow
  }, L("Target grade", "Цільова оцінка", "Целевая оценка", "Note visée", "Zielnote"), " \xB7 ", grade ? grade.label : "A-Level"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-3)",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, L("Predicted now", "Прогноз зараз", "Прогноз сейчас", "Prédit", "Aktuell prognostiziert"), ": ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-body)"
    }
  }, course.predictedGrade)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-2)"
    }
  }, opts.map(g => /*#__PURE__*/React.createElement("button", {
    key: g,
    type: "button",
    onClick: () => setTarget(g),
    style: segBtn(String(target) === String(g))
  }, g)))), /*#__PURE__*/React.createElement("div", {
    ref: secRefs.confidence,
    style: sec("confidence")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      ...eyebrow,
      margin: 0
    }
  }, L("Your confidence", "Ваша впевненість", "Ваша уверенность", "Votre confiance", "Deine Sicherheit")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--indigo-600)"
    }
  }, confidence, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 5,
    value: confidence,
    onChange: e => setConfidence(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: "var(--indigo-600)",
      height: 28
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: sec("intensity")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      ...eyebrow,
      margin: 0
    }
  }, L("Sessions per week", "Сесій на тиждень", "Сессий в неделю", "Séances / semaine", "Einheiten / Woche")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--indigo-600)"
    }
  }, sessions, "\xD7")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 1,
    max: 7,
    value: sessions,
    onChange: e => setSessions(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: "var(--indigo-600)",
      height: 28
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--space-2) 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, L("Coach recommends", "Коуч радить", "Коуч советует", "Le coach recommande", "Coach empfiehlt"), " ", course.recommendedSessions, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: sec("topics")
  }, /*#__PURE__*/React.createElement("p", {
    style: eyebrow
  }, "\uD83C\uDFAF ", L("Focus topics", "Слабкі теми", "Слабые темы", "Sujets à travailler", "Schwerpunktthemen"), " \xB7 ", course.topicCount, " ", L("total", "усього", "всего", "au total", "gesamt")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, course.weakTopics.map((tp, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--space-2)",
      padding: "var(--space-2) var(--space-3)",
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-body)"
    }
  }, tp), /*#__PURE__*/React.createElement("button", {
    onClick: () => onStart && onStart({
      id: course.id + "-" + i,
      subject: course.name,
      color: course.color,
      topic: tp,
      difficulty: 3,
      review: 1,
      est: 45
    }),
    style: {
      border: "none",
      background: "transparent",
      color: "var(--indigo-600)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-xs)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      flexShrink: 0
    }
  }, L("Study", "Вчити", "Учить", "Étudier", "Lernen"), " \u2192")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      padding: "var(--space-4) var(--space-5)",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: save,
    disabled: !dirty && !savedFlash
  }, savedFlash ? L("Saved ✓", "Збережено ✓", "Сохранено ✓", "Enregistré ✓", "Gespeichert ✓") : L("Save changes", "Зберегти", "Сохранить", "Enregistrer", "Speichern")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: startSession
  }, L("Start studying", "Почати навчання", "Начать занятие", "Commencer", "Lernen starten"), " \u2192"))));
}
window.CourseDetail = CourseDetail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/CourseDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Dashboard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// AI Exam Coach — Dashboard: AI-advisor view (readiness, predicted/target, impact task)
function Dashboard({
  onStart,
  onOpenCourse,
  onGoToChat,
  t
}) {
  const {
    StreakBanner,
    SessionCard,
    CourseCard,
    WeekStrip,
    GaugeRing,
    Button,
    ProgressBar
  } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({
    en,
    uk,
    ru,
    fr,
    de
  })[t.code] || en;
  const today = new Date().toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "ru" ? "ru-RU" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
  const [courses, setCourses] = React.useState(() => window.COURSES.map(c => ({
    ...c
  })));
  const [detail, setDetail] = React.useState(null);
  const [dayDetail, setDayDetail] = React.useState(null);
  const [showWeekly, setShowWeekly] = React.useState(false);
  const [showSim, setShowSim] = React.useState(false);
  const weakness = (window.WEAKNESS_ALERTS || [])[0] || null;
  const openCourse = (course, focus) => setDetail({
    course,
    focus
  });
  const saveCourse = updated => setCourses(cs => cs.map(c => c.id === updated.id ? {
    ...c,
    ...updated
  } : c));
  const overall = Math.round(courses.reduce((a, c) => a + c.readinessPct, 0) / courses.length);
  const onTrack = courses.filter(c => c.gradeProbability >= 55).length;
  // highest-impact = lowest probability course (biggest grade lever)
  const focus = courses.reduce((a, b) => b.gradeProbability < a.gradeProbability ? b : a, courses[0]);
  const focusSession = window.TODAY_SESSIONS.find(s => s.subject === focus.name) || window.TODAY_SESSIONS[0];
  const H2 = ({
    children,
    size
  }) => /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: size || "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)",
      fontFamily: "var(--font-sans)"
    }
  }, children);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      borderRadius: "var(--radius-2xl)",
      background: "linear-gradient(135deg, var(--indigo-50), #FAF5FF)",
      border: "1px solid var(--border-subtle)",
      padding: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-3)",
      marginBottom: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      flexShrink: 0,
      width: 40,
      height: 40,
      borderRadius: "var(--radius-full)",
      background: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      boxShadow: "var(--shadow-sm)"
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 2px",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--indigo-600)"
    }
  }, L("Your AI advisor", "Ваш AI-радник", "Ваш AI-советник", "Votre conseiller IA", "Dein KI-Berater")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)",
      lineHeight: 1.4,
      textWrap: "pretty"
    }
  }, L(`You're on track for ${onTrack} of ${courses.length} targets. Chemistry is the one to fight for.`, `Ви на шляху до ${onTrack} з ${courses.length} цілей. За хімію варто поборотися.`, `Вы на пути к ${onTrack} из ${courses.length} целей. За химию стоит побороться.`, `Vous êtes en bonne voie pour ${onTrack} objectifs sur ${courses.length}. La chimie reste à conquérir.`, `Du bist auf Kurs für ${onTrack} von ${courses.length} Zielen. Chemie ist die Herausforderung.`)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      gap: "var(--space-5)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-1)"
    }
  }, /*#__PURE__*/React.createElement(GaugeRing, {
    value: overall,
    size: 104
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-muted)"
    }
  }, L("Exam readiness", "Готовність", "Готовность", "Préparation", "Bereitschaft"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      background: "#fff",
      border: "1px solid var(--border-subtle)",
      padding: "var(--space-4)",
      boxShadow: "var(--shadow-sm)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-1)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-faint)"
    }
  }, "\uD83C\uDFAF ", L("Highest-impact task", "Найважливіше завдання", "Самая важная задача", "Tâche prioritaire", "Wichtigste Aufgabe")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-3)",
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, focusSession.topic, " \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontWeight: "var(--weight-normal)"
    }
  }, focus.subject)), /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "md",
    onClick: () => onGoToChat && onGoToChat(`Start a study session on ${focusSession.topic}`)
  }, L("Start now", "Почати зараз", "Начать сейчас", "Commencer", "Jetzt starten"), " \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, courses.map(c => {
    const pc = c.gradeProbability >= 60 ? "var(--emerald-600)" : c.gradeProbability >= 40 ? "var(--amber-600)" : "var(--red-500)";
    return /*#__PURE__*/React.createElement("div", {
      key: c.id,
      onClick: () => openCourse(c, "probability"),
      style: {
        display: "grid",
        gridTemplateColumns: "1fr auto 120px 48px",
        alignItems: "center",
        gap: "var(--space-3)",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        color: "var(--text-body)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "var(--radius-full)",
        background: c.color,
        flexShrink: 0
      }
    }), c.subject), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        whiteSpace: "nowrap"
      }
    }, c.predictedGrade, " ", /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        color: "var(--text-faint)"
      }
    }, "\u2192"), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--indigo-700)",
        fontWeight: "var(--weight-bold)"
      }
    }, c.targetGrade)), /*#__PURE__*/React.createElement(ProgressBar, {
      value: c.gradeProbability,
      autoColor: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: "right",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-bold)",
        color: pc
      }
    }, c.gradeProbability, "%"));
  }))), /*#__PURE__*/React.createElement(StreakBanner, {
    days: 12,
    message: t.streak_keep
  }), /*#__PURE__*/React.createElement(window.BurnoutAlert, {
    t: t
  }), weakness && /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      border: "1.5px solid var(--red-200)",
      background: "#FFF1F2",
      padding: "var(--space-4)",
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      flexShrink: 0
    }
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 2px",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--red-700)"
    }
  }, L("High-risk topic", "Тема високого ризику", "Тема высокого риска", "Sujet à haut risque", "Hochrisiko-Thema"), ": ", /*#__PURE__*/React.createElement("strong", null, weakness.topic)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      color: "var(--red-600)"
    }
  }, weakness.reasons.join(" · "), " \xB7 ", L("Review within", "Повторіть протягом", "Повторите в течение", "À réviser dans", "Wiederholen innerhalb"), " ", weakness.reviewWithin), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => onStart(weakness.sessionRef)
  }, L("Start review now", "Почати повторення", "Начать повторение", "Commencer la révision", "Jetzt wiederholen"), " \u2192"))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "var(--space-3)",
      flexWrap: "wrap",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(H2, null, L("Exam forecast", "Прогноз іспитів", "Прогноз экзаменов", "Prévision des examens", "Prüfungsprognose")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSim(true),
    style: {
      border: "1px solid var(--indigo-200)",
      background: "var(--indigo-50)",
      color: "var(--indigo-700)",
      borderRadius: "var(--radius-full)",
      padding: "6px 14px",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, "\uD83D\uDD2E ", L("Simulate scenarios", "Симулювати сценарії", "Симулировать сценарии", "Simuler des scénarios", "Szenarien simulieren"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border-subtle)",
      background: "var(--surface-card)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-3) var(--space-4)",
      background: "var(--emerald-50)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--emerald-700)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)"
    }
  }, "\u2713 ", L("If current pace continues", "Якщо темп збережеться", "Если темп сохранится", "Si le rythme continue", "Bei aktuellem Tempo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-3) var(--space-4)",
      background: "#FFF8F0",
      borderLeft: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--amber-700)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)"
    }
  }, "\u2717 ", L("If sessions are missed", "Якщо сесії пропустити", "Если сессии пропустить", "Si des séances sont manquées", "Bei verpassten Einheiten")))), courses.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      borderBottom: i < courses.length - 1 ? "1px solid var(--border-subtle)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-3) var(--space-4)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: c.color,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      flex: 1
    }
  }, c.subject), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-bold)",
      color: "var(--emerald-700)"
    }
  }, c.forecastOnTrack)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-3) var(--space-4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      borderLeft: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-bold)",
      color: "var(--amber-600)"
    }
  }, c.forecastMissed)))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(H2, {
    size: "var(--text-2xl)"
  }, t.dash_today, " \u2014 ", today), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-4)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, window.TODAY_SESSIONS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id
  }, /*#__PURE__*/React.createElement(SessionCard, {
    subject: s.subject,
    subjectColor: s.color,
    topicName: s.topic,
    difficulty: s.difficulty,
    reviewNumber: s.review,
    estMinutes: s.est,
    onStart: () => onStart(s)
  }), s.retention && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      padding: "var(--space-2) var(--space-4)",
      borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
      background: "var(--surface-muted)",
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-3)",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDDE0 ", L("Retention", "Ретенція", "Ретенция", "Rétention", "Retention"), ": ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: s.retention < 60 ? "var(--red-500)" : "var(--text-muted)"
    }
  }, s.retention, "%")), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD50 ", L("Last reviewed", "Останній перегляд", "Последний повтор", "Dernière révision", "Letzte Wiederholung"), ": ", s.lastReviewed), s.expectedOutcome && /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC8 ", s.expectedOutcome)))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(H2, null, t.dash_upcoming_exams), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-3)",
      display: "grid",
      gap: "var(--space-4)",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))"
    }
  }, courses.map(c => /*#__PURE__*/React.createElement(CourseCard, _extends({
    key: c.id
  }, c, {
    onClick: () => openCourse(c),
    onStatClick: stat => openCourse(c, stat)
  }))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "var(--space-3)",
      flexWrap: "wrap",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement(H2, null, t.dash_this_week), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowWeekly(true),
    style: {
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      color: "var(--text-muted)",
      borderRadius: "var(--radius-full)",
      padding: "6px 14px",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, "\uD83D\uDCCA ", L("Weekly review", "Тижневий огляд", "Недельный обзор", "Bilan de la semaine", "Wochenbericht"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-1)"
    }
  }, /*#__PURE__*/React.createElement(WeekStrip, {
    days: window.WEEK.map((d, i) => ({
      ...d,
      label: [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun][i]
    })),
    onDayClick: (d, i) => setDayDetail({
      day: d,
      dayIndex: i
    })
  }))), showWeekly && /*#__PURE__*/React.createElement(window.WeeklyReview, {
    t: t,
    onClose: () => setShowWeekly(false)
  }), showSim && /*#__PURE__*/React.createElement(window.SuccessSimulation, {
    t: t,
    onClose: () => setShowSim(false)
  }), dayDetail && /*#__PURE__*/React.createElement(window.DayDetail, {
    day: dayDetail.day,
    dayIndex: dayDetail.dayIndex,
    t: t,
    onClose: () => setDayDetail(null),
    onStart: s => {
      setDayDetail(null);
      onStart(s);
    }
  }), detail && /*#__PURE__*/React.createElement(window.CourseDetail, {
    course: detail.course,
    focus: detail.focus,
    t: t,
    onClose: () => setDetail(null),
    onStart: s => {
      setDetail(null);
      onStart(s);
    },
    onSave: saveCourse
  }));
}
window.Dashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/DayDetail.jsx
try { (() => {
// AI Exam Coach — DayDetail: tap a WeekStrip cell to see what happened or what's planned.
function DayDetail({
  day,
  dayIndex,
  onClose,
  onStart,
  t
}) {
  const {
    Button,
    Badge
  } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({
    en,
    uk,
    ru,
    fr,
    de
  })[t && t.code || "en"] || en;
  const fullLabels = {
    en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    uk: ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"],
    ru: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
    fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
    de: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
  };
  const lang = t && t.code || "en";
  const fullDay = (fullLabels[lang] || fullLabels.en)[dayIndex] || day.label;
  const isPast = !day.today && day.sessions && day.sessions.every(s => s.done);
  const isToday = !!day.today;
  const isFuture = !isToday && !isPast && day.sessions && day.sessions.some(s => !s.done);
  const isEmpty = !day.sessions || day.sessions.length === 0;
  const done = (day.sessions || []).filter(s => s.done);
  const pending = (day.sessions || []).filter(s => !s.done);
  const totalMins = (day.sessions || []).reduce((a, s) => a + (s.duration || 0), 0);
  const doneMins = done.reduce((a, s) => a + (s.duration || 0), 0);
  const statusTone = isPast ? "easy" : isToday ? "medium" : "default";
  const statusLabel = isEmpty ? L("Rest day", "Вихідний", "Выходной", "Repos", "Ruhetag") : isPast ? L("Complete", "Виконано", "Выполнено", "Complété", "Abgeschlossen") : isToday ? L("Today", "Сьогодні", "Сегодня", "Aujourd'hui", "Heute") : L("Planned", "Заплановано", "Запланировано", "Planifié", "Geplant");
  const coachLine = isEmpty ? L("No sessions scheduled — rest and recover. Consistent rest improves retention.", "Сесій немає — відпочивайте. Відпочинок покращує запам'ятовування.", "Сессий нет — отдыхайте. Отдых улучшает запоминание.", "Pas de séance — reposez-vous. Le repos améliore la rétention.", "Keine Einheiten — erhol dich. Erholung verbessert die Retention.") : isPast && done.length === day.scheduled ? L(`Great work — all ${done.length} sessions completed. `, `Чудова робота — всі ${done.length} сесії виконані. `, `Отличная работа — все ${done.length} сессии выполнены. `, `Excellent — ${done.length} séances complétées. `, `Super — alle ${done.length} Einheiten abgeschlossen. `) + L("Keep this momentum.", "Тримайте темп.", "Держите темп.", "Gardez ce rythme.", "Halte dieses Tempo.") : isToday && pending.length > 0 ? L(`${done.length} done, ${pending.length} remaining today. `, `${done.length} виконано, ${pending.length} залишилось сьогодні. `, `${done.length} выполнено, ${pending.length} осталось сегодня. `, `${done.length} faites, ${pending.length} restantes. `, `${done.length} erledigt, ${pending.length} verbleiben heute. `) + L("You're on track!", "Ви на правильному шляху!", "Вы на правильном пути!", "Vous êtes dans les temps!", "Du bist auf Kurs!") : L(`${day.scheduled} sessions planned — `, `${day.scheduled} сесій заплановано — `, `${day.scheduled} сессий запланировано — `, `${day.scheduled} séances prévues — `, `${day.scheduled} Einheiten geplant — `) + L(`${totalMins} min total.`, `${totalMins} хв загалом.`, `${totalMins} мин всего.`, `${totalMins} min au total.`, `${totalMins} Min. gesamt.`);
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const pill = color => ({
    width: 8,
    height: 8,
    borderRadius: "999px",
    background: color,
    flexShrink: 0,
    marginTop: 4
  });
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 60,
      background: "rgba(15,23,42,0.45)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: 480,
      background: "var(--surface-page)",
      borderTopLeftRadius: "var(--radius-2xl)",
      borderTopRightRadius: "var(--radius-2xl)",
      borderTop: "4px solid var(--indigo-500)",
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "var(--space-3)",
      padding: "var(--space-5) var(--space-5) var(--space-4)",
      background: "var(--surface-card)",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)"
    }
  }, fullDay, " ", day.date), /*#__PURE__*/React.createElement(Badge, {
    tone: statusTone
  }, statusLabel)), !isEmpty && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, L("Sessions", "Сесій", "Сессий", "Séances", "Einheiten"), ": ", day.completed, "/", day.scheduled, " \xB7 ", doneMins, "/", totalMins, " ", L("min", "хв", "мин", "min", "Min"))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      border: "none",
      background: "var(--surface-muted)",
      width: 36,
      height: 36,
      borderRadius: "var(--radius-full)",
      cursor: "pointer",
      fontSize: 18,
      color: "var(--text-muted)",
      lineHeight: 1,
      flexShrink: 0
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4) var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      maxHeight: "60vh",
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "flex-start",
      padding: "var(--space-3) var(--space-4)",
      borderRadius: "var(--radius-xl)",
      background: "var(--indigo-50)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: 18
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      lineHeight: 1.5
    }
  }, coachLine)), isEmpty ?
  /*#__PURE__*/
  /* Rest day illustration */
  React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "var(--space-6) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: "var(--space-3)"
    },
    "aria-hidden": "true"
  }, "\uD83D\uDE34"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, L("No sessions planned. Rest up!", "Сесій немає. Відпочивайте!", "Сессий нет. Отдыхайте!", "Aucune séance prévue. Reposez-vous!", "Keine Einheiten geplant. Erhole dich!"))) : /*#__PURE__*/React.createElement(React.Fragment, null, done.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--emerald-600)"
    }
  }, "\u2713 ", L("Completed", "Виконано", "Выполнено", "Complétées", "Abgeschlossen")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, done.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-3)",
      padding: "var(--space-3)",
      borderRadius: "var(--radius-lg)",
      background: "var(--emerald-50)",
      border: "1px solid var(--emerald-100)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: pill(s.color)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, s.topic), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, s.subject, " \xB7 ", s.duration, " ", L("min", "хв", "мин", "min", "Min"))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      color: "var(--emerald-500)"
    }
  }, "\u2713"))))), pending.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-faint)"
    }
  }, isToday ? L("Up next", "Далі", "Далее", "Ensuite", "Als nächstes") : L("Planned", "Заплановано", "Запланировано", "Planifié", "Geplant")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, pending.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-3)",
      padding: "var(--space-3)",
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: pill(s.color)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, s.topic), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, s.subject, " \xB7 ", s.duration, " ", L("min", "хв", "мин", "min", "Min"))), (isToday || isFuture) && onStart && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      onClose();
      onStart({
        id: s.subject + i,
        subject: s.subject,
        color: s.color,
        topic: s.topic,
        difficulty: 3,
        review: 1,
        est: s.duration
      });
    },
    style: {
      border: "none",
      background: "transparent",
      color: "var(--indigo-600)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-xs)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      flexShrink: 0,
      padding: "2px 0"
    }
  }, L("Study →", "Вчити →", "Учить →", "Étudier →", "Lernen →")))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4) var(--space-5)",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    fullWidth: true,
    onClick: onClose
  }, L("Close", "Закрити", "Закрыть", "Fermer", "Schließen")))));
}
window.DayDetail = DayDetail;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/DayDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Exams.jsx
try { (() => {
// AI Exam Coach — Exams screen (i18n-aware)
function Exams({
  onAddExam,
  t
}) {
  const {
    Button
  } = window.AIExamCoachDesignSystem_99e467;
  const UPCOMING = [{
    id: "bio",
    name: "A-Level Biology",
    color: "#6366F1",
    examDate: "2026-07-04",
    examBoard: "AQA",
    topicCount: 18,
    completionPct: 44
  }, {
    id: "chem",
    name: "AP Chemistry",
    color: "#F43F5E",
    examDate: "2026-06-20",
    examBoard: "AP",
    topicCount: 12,
    completionPct: 29
  }, {
    id: "hist",
    name: "History 101",
    color: "#14B8A6",
    examDate: "2026-08-01",
    examBoard: "IB",
    topicCount: 22,
    completionPct: 68
  }];
  const PAST = [{
    id: "maths",
    name: "A-Level Maths",
    color: "#8B5CF6",
    examDate: "2026-05-15",
    examBoard: "Edexcel",
    topicCount: 30,
    completionPct: 100
  }, {
    id: "eng",
    name: "English Lit",
    color: "#F97316",
    examDate: "2026-05-22",
    examBoard: "AQA",
    topicCount: 8,
    completionPct: 100
  }];
  function daysAway(s) {
    return Math.ceil((new Date(s) - new Date()) / 86400000);
  }
  function sessionsNeeded(completionPct, daysLeft) {
    if (daysLeft <= 0) return 0;
    const remaining = 100 - completionPct;
    const totalSessions = Math.ceil(remaining / 6); // ~6% per session
    const weeksLeft = Math.max(1, daysLeft / 7);
    return Math.ceil(totalSessions / weeksLeft);
  }
  function requiredPct(completionPct, daysLeft, totalDays) {
    if (totalDays <= 0) return 100;
    const elapsed = totalDays - daysLeft;
    return Math.round(elapsed / totalDays * 100);
  }
  function fmtDate(s) {
    return new Date(s).toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }
  function ExamCard({
    exam
  }) {
    const days = daysAway(exam.examDate);
    const past = days < 0;
    const soon = days >= 0 && days <= 7;
    const totalDays = Math.ceil((new Date(exam.examDate) - new Date('2026-05-01')) / 86400000);
    const needed = !past ? sessionsNeeded(exam.completionPct, days) : 0;
    const required = !past ? requiredPct(exam.completionPct, days, totalDays) : 100;
    const behind = !past && exam.completionPct < required;
    const [hover, setHover] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border-default)",
        borderLeft: `6px solid ${exam.color}`,
        background: "var(--surface-card)",
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        padding: "var(--space-4)",
        cursor: "pointer",
        opacity: past ? 0.6 : 1,
        transition: "box-shadow var(--dur-fast) ease",
        fontFamily: "var(--font-sans)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "var(--space-2)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontWeight: "var(--weight-semibold)",
        color: "var(--text-strong)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, exam.name), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "2px 0 0",
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)"
      }
    }, fmtDate(exam.examDate)), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "2px 0 0",
        fontSize: "var(--text-xs)",
        color: "var(--text-faint)"
      }
    }, exam.examBoard)), /*#__PURE__*/React.createElement("span", {
      style: {
        flexShrink: 0,
        borderRadius: "var(--radius-full)",
        padding: "2px 8px",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-medium)",
        background: past ? "var(--slate-100)" : soon ? "var(--amber-100)" : "var(--emerald-100)",
        color: past ? "var(--slate-500)" : soon ? "var(--amber-700)" : "var(--emerald-700)"
      }
    }, past ? t.exams_past_label : `${days}${t.exams_days_away}`)), !past && /*#__PURE__*/React.createElement("div", {
      style: {
        margin: "var(--space-2) 0",
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-xs)",
        color: behind ? "var(--red-500)" : "var(--emerald-600)",
        fontWeight: "var(--weight-medium)"
      }
    }, behind ? `⚠️ Behind — needs ${needed} sessions/week` : `✓ On track — ${needed} sessions/week`)), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "var(--space-2) 0",
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)"
      }
    }, exam.topicCount, " ", t.exams_topics), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 8,
        background: "var(--surface-sunken)",
        borderRadius: "var(--radius-full)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        width: `${exam.completionPct}%`,
        background: "var(--action-primary)",
        borderRadius: "var(--radius-full)",
        transition: "width var(--dur-slow) var(--ease-out)"
      }
    })));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: "var(--text-2xl)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, t.exams_title), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "md",
    onClick: onAddExam
  }, t.exams_add)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 12px",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-muted)"
    }
  }, t.exams_upcoming), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-4)",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))"
    }
  }, UPCOMING.map(e => /*#__PURE__*/React.createElement(ExamCard, {
    key: e.id,
    exam: e
  })))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 12px",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-muted)"
    }
  }, t.exams_past), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-4)",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))"
    }
  }, PAST.map(e => /*#__PURE__*/React.createElement(ExamCard, {
    key: e.id,
    exam: e
  })))));
}
window.Exams = Exams;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Exams.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/FlashcardMode.jsx
try { (() => {
// AI Exam Coach — Flashcard Active Recall + Voice Mode (#7)
function FlashcardMode({
  cards,
  allCards,
  onBack,
  onUpdateCards
}) {
  const [idx, setIdx] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [session, setSession] = React.useState([]);
  const [done, setDone] = React.useState(false);
  const [expl, setExpl] = React.useState(null);
  const [loadingExpl, setLe] = React.useState(false);
  const [voiceOn, setVoiceOn] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef(null);
  const EASE = {
    hard: -0.3,
    ok: 0,
    easy: 0.2
  };

  // Flip CSS
  React.useEffect(() => {
    if (!document.getElementById('fc-flip')) {
      const s = document.createElement('style');
      s.id = 'fc-flip';
      s.textContent = '.fc-inner{transform-style:preserve-3d;transition:transform 0.42s cubic-bezier(.4,0,.2,1)}.fc-inner.flipped{transform:rotateY(180deg)}.fc-face{backface-visibility:hidden;-webkit-backface-visibility:hidden}.fc-back{transform:rotateY(180deg)}';
      document.head.appendChild(s);
    }
  }, []);
  const card = cards[idx];

  // Voice: speak card front when idx changes and voice is on
  React.useEffect(() => {
    if (!voiceOn || !card) return;
    window.speechSynthesis && window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(card.front);
    u.rate = 0.88;
    u.pitch = 1;
    window.speechSynthesis && window.speechSynthesis.speak(u);
  }, [voiceOn, idx]);

  // Voice: start/stop SpeechRecognition
  React.useEffect(() => {
    if (!voiceOn) {
      if (recRef.current) {
        try {
          recRef.current.stop();
        } catch {}
        recRef.current = null;
      }
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Voice not supported in this browser. Try Chrome.');
      setVoiceOn(false);
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onstart = () => setListening(true);
    r.onend = () => {
      setListening(false);
      if (voiceOn && recRef.current) {
        try {
          recRef.current.start();
        } catch {}
      }
    };
    r.onresult = e => {
      const txt = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
      if (txt.includes('flip') || txt.includes('show') || txt.includes('reveal')) setFlipped(true);else if (txt.includes('easy')) rate('easy');else if (txt.includes('hard')) rate('hard');else if (txt.includes('ok') || txt.includes('okay')) rate('ok');else if (txt.includes('back')) {
        setFlipped(false);
        setExpl(null);
      }
    };
    try {
      r.start();
    } catch {}
    recRef.current = r;
    return () => {
      try {
        r.stop();
      } catch {}
    };
  }, [voiceOn]);
  const rate = rating => {
    const ns = [...session, {
      cardId: card.id,
      rating
    }];
    setSession(ns);
    setExpl(null);
    setFlipped(false);
    window.speechSynthesis && window.speechSynthesis.cancel();
    if (idx + 1 >= cards.length) {
      const updated = allCards.map(c => {
        const r = ns.find(s => s.cardId === c.id);
        return r ? {
          ...c,
          ease: Math.max(1.3, Math.min(3.5, c.ease + EASE[r.rating])),
          dueNow: r.rating === 'hard'
        } : c;
      });
      if (onUpdateCards) onUpdateCards(updated);
      setDone(true);
    } else {
      setTimeout(() => setIdx(i => i + 1), 180);
    }
  };
  const explain = async () => {
    if (loadingExpl || !flipped) return;
    setLe(true);
    try {
      setExpl(await window.claude.complete(`Explain in 2 sentences with a memory tip for an A-level student.\nQ: "${card.front}"\nA: "${card.back}"`));
    } catch {
      setExpl('AI explanation unavailable.');
    }
    setLe(false);
  };
  if (done) {
    const c = {
      hard: session.filter(s => s.rating === 'hard').length,
      ok: session.filter(s => s.rating === 'ok').length,
      easy: session.filter(s => s.rating === 'easy').length
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        fontFamily: 'var(--font-sans)'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)',
        textAlign: 'left',
        padding: 0
      }
    }, "\u2190 Back to Study Hub"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        padding: '20px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 56,
        marginBottom: 12
      }
    }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: '0 0 6px',
        fontSize: 'var(--text-2xl)',
        fontWeight: 700,
        color: 'var(--text-strong)'
      }
    }, "Session complete!"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)'
      }
    }, cards.length, " cards reviewed")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: 12
      }
    }, [['Hard', c.hard, '#ef4444'], ['Ok', c.ok, '#f59e0b'], ['Easy', c.easy, '#10b981']].map(([l, n, col]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: 16,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '0 0 4px',
        fontSize: 32,
        fontWeight: 700,
        color: col
      }
    }, n), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, l)))), c.hard > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--indigo-50)',
        border: '1px solid var(--indigo-100)',
        borderRadius: 'var(--radius-xl)',
        padding: 16,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: '0 0 8px',
        fontWeight: 600,
        color: 'var(--indigo-700)',
        fontSize: 'var(--text-sm)'
      }
    }, c.hard, " card", c.hard > 1 ? 's' : '', " marked Hard \u2014 scheduled for tomorrow"), /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        background: 'var(--indigo-600)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        padding: '8px 20px',
        fontWeight: 600,
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)'
      }
    }, "Back to hub")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      padding: 0
    }
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, idx + 1, " / ", cards.length), /*#__PURE__*/React.createElement("button", {
    onClick: () => setVoiceOn(v => !v),
    title: voiceOn ? 'Turn off voice' : 'Study hands-free with voice',
    style: {
      border: '1px solid ' + (voiceOn ? 'var(--indigo-500)' : 'var(--border-default)'),
      background: voiceOn ? 'var(--indigo-50)' : 'var(--surface-card)',
      color: voiceOn ? 'var(--indigo-700)' : 'var(--text-muted)',
      borderRadius: 'var(--radius-lg)',
      padding: '5px 10px',
      fontSize: 12,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, listening ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#ef4444',
      display: 'inline-block',
      animation: 'pulse 1s infinite'
    }
  }) : '🎤', voiceOn ? listening ? 'Listening…' : 'Voice on' : 'Voice')), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-muted)',
      borderRadius: 999,
      height: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: idx / cards.length * 100 + '%',
      background: 'var(--indigo-600)',
      borderRadius: 999,
      transition: 'width 0.3s'
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'var(--indigo-50)',
      color: 'var(--indigo-600)',
      borderRadius: 999,
      padding: '4px 12px',
      fontSize: 11,
      fontWeight: 600
    }
  }, card.topic)), voiceOn && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--indigo-50)',
      border: '1px solid var(--indigo-100)',
      borderRadius: 'var(--radius-xl)',
      padding: '10px 14px',
      fontSize: 11,
      color: 'var(--indigo-600)'
    }
  }, "\uD83C\uDFA4 Say: ", /*#__PURE__*/React.createElement("strong", null, "\"flip\""), " to reveal \xB7 ", /*#__PURE__*/React.createElement("strong", null, "\"easy\""), " / ", /*#__PURE__*/React.createElement("strong", null, "\"ok\""), " / ", /*#__PURE__*/React.createElement("strong", null, "\"hard\""), " to rate"), /*#__PURE__*/React.createElement("div", {
    style: {
      perspective: '1200px'
    },
    onClick: () => {
      setFlipped(f => !f);
      setExpl(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: 'fc-inner' + (flipped ? ' flipped' : ''),
    style: {
      position: 'relative',
      height: 260
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "fc-face",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-2xl)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 14px',
      fontSize: 11,
      color: 'var(--text-faint)',
      textTransform: 'uppercase',
      letterSpacing: 1
    }
  }, "Question"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      lineHeight: 1.4
    }
  }, card.front), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '18px 0 0',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, voiceOn ? 'Say "flip" or tap' : 'Tap to reveal answer')), /*#__PURE__*/React.createElement("div", {
    className: "fc-face fc-back",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(135deg,var(--indigo-50),#f5f3ff)',
      border: '1px solid var(--indigo-200)',
      borderRadius: 'var(--radius-2xl)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 14px',
      fontSize: 11,
      color: 'var(--indigo-400)',
      textTransform: 'uppercase',
      letterSpacing: 1
    }
  }, "Answer"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-lg)',
      fontWeight: 600,
      color: 'var(--text-strong)',
      lineHeight: 1.5
    }
  }, card.back)))), flipped && /*#__PURE__*/React.createElement("div", null, !expl && !loadingExpl && /*#__PURE__*/React.createElement("button", {
    onClick: explain,
    style: {
      border: '1px solid var(--border-default)',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '8px 14px',
      fontSize: 11,
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, "\uD83E\uDD16 Explain with AI"), loadingExpl && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, "\uD83E\uDD16 Thinking\u2026"), expl && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 6px',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--indigo-600)',
      textTransform: 'uppercase'
    }
  }, "\uD83E\uDD16 AI Explanation"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      lineHeight: 1.6
    }
  }, expl))), flipped && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, [['Hard', 'hard', '#ef4444', '#fef2f2'], ['Ok', 'ok', '#f59e0b', '#fffbeb'], ['Easy', 'easy', '#10b981', '#f0fdf4']].map(([l, v, col, bg]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => rate(v),
    style: {
      flex: 1,
      background: bg,
      border: '1px solid ' + col + '30',
      borderRadius: 'var(--radius-xl)',
      padding: 12,
      fontWeight: 700,
      fontSize: 'var(--text-sm)',
      color: col,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, voiceOn ? /*#__PURE__*/React.createElement(React.Fragment, null, "Say \"", l, "\"", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      opacity: 0.7
    }
  }, "or tap")) : l))), /*#__PURE__*/React.createElement("style", null, `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`));
}
window.FlashcardMode = FlashcardMode;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/FlashcardMode.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Landing.jsx
try { (() => {
// AI Exam Coach — Landing screen
function Landing({
  onGetStarted
}) {
  const {
    Button
  } = window.AIExamCoachDesignSystem_99e467;
  const features = [{
    icon: "🎯",
    title: "SM-2 Algorithm",
    body: "Science-backed spaced repetition adapts to how well you know each topic."
  }, {
    icon: "📅",
    title: "Smart Scheduling",
    body: "Auto-generated daily plans that fit your available hours and preferences."
  }, {
    icon: "📊",
    title: "Track Progress",
    body: "Visualise your study streak, confidence per subject, and topic mastery."
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "42rem",
      margin: "0 auto",
      padding: "var(--space-12) var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-5xl)",
      marginBottom: "var(--space-4)"
    },
    "aria-hidden": "true"
  }, "\uD83D\uDCDA"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: "var(--text-4xl)",
      fontWeight: "var(--weight-bold)",
      letterSpacing: "var(--tracking-tight)",
      color: "var(--text-strong)"
    }
  }, "Study smarter, not longer"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--space-3) auto 0",
      maxWidth: "32rem",
      fontSize: "var(--text-lg)",
      color: "var(--text-muted)"
    }
  }, "Your AI coach builds a day-by-day study plan that adapts as you go. Add a course, set your exam date, and start revising."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-8)",
      display: "flex",
      justifyContent: "center",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    onClick: onGetStarted
  }, "Get started"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: onGetStarted
  }, "Log in"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-16)",
      display: "grid",
      gap: "var(--space-6)",
      gridTemplateColumns: "repeat(3, 1fr)"
    }
  }, features.map(f => /*#__PURE__*/React.createElement("div", {
    key: f.title,
    style: {
      borderRadius: "var(--radius-2xl)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-5)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-3xl)",
      marginBottom: "var(--space-2)"
    },
    "aria-hidden": "true"
  }, f.icon), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, f.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--space-1) 0 0",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, f.body)))), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: "var(--space-12)",
      textAlign: "center",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, "Free \xB7 Open Source \xB7 No ads"));
}
window.Landing = Landing;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Landing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/MistakeJournal.jsx
try { (() => {
// AI Exam Coach — Mistake Journal with Pattern Analysis
function MistakeJournal({
  mistakes,
  onBack
}) {
  const [analysis, setAnalysis] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  // Group by topic
  const groups = mistakes.reduce((acc, m) => {
    if (!acc[m.topic]) acc[m.topic] = {
      topic: m.topic,
      subject: m.subject,
      items: []
    };
    acc[m.topic].items.push(m);
    return acc;
  }, {});
  const analyse = async () => {
    setLoading(true);
    try {
      const summary = mistakes.map(m => `Q: ${m.question} | Wrong: ${m.studentAnswer} | Correct: ${m.correctAnswer}`).join('\n');
      const r = await window.claude.complete(`Identify 2-3 error patterns from these A-level student mistakes. Reply ONLY with JSON array: [{"pattern":"pattern name","detail":"one sentence","advice":"one actionable tip"}].\n\n${summary}`);
      const clean = r.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      setAnalysis(JSON.parse(clean));
    } catch {
      setAnalysis([{
        pattern: 'Pattern analysis unavailable',
        detail: 'Please try again.',
        advice: ''
      }]);
    }
    setLoading(false);
  };
  const subjectColor = {
    Biology: 'var(--indigo-600)',
    Chemistry: 'var(--subject-rose)',
    History: 'var(--subject-teal)'
  };
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      fontFamily: 'var(--font-sans)'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, React.createElement('button', {
    onClick: onBack,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      padding: 0
    }
  }, '← Back'), React.createElement('div', null, React.createElement('h1', {
    style: {
      margin: 0,
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, 'Mistake Journal'), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, mistakes.length + ' mistakes recorded · ' + mistakes.filter(m => m.count > 1).length + ' recurring'))),
  // AI Pattern analysis
  React.createElement('div', {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-2xl)',
      padding: 20
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: analysis ? 14 : 0
    }
  }, React.createElement('div', null, React.createElement('p', {
    style: {
      margin: '0 0 2px',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)'
    }
  }, '🤖 AI Pattern Analysis'), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, 'Identify recurring error patterns in your mistakes')), !analysis && React.createElement('button', {
    onClick: analyse,
    disabled: loading,
    style: {
      background: 'var(--indigo-600)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-lg)',
      padding: '8px 16px',
      fontWeight: 600,
      fontSize: 'var(--text-xs)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      whiteSpace: 'nowrap'
    }
  }, loading ? 'Analysing…' : 'Analyse now')), loading && React.createElement('p', {
    style: {
      margin: '12px 0 0',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, '🤖 Identifying patterns…'), analysis && React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, ...analysis.map((p, i) => React.createElement('div', {
    key: i,
    style: {
      background: 'var(--indigo-50)',
      border: '1px solid var(--indigo-100)',
      borderRadius: 'var(--radius-xl)',
      padding: '12px 14px'
    }
  }, React.createElement('p', {
    style: {
      margin: '0 0 3px',
      fontWeight: 700,
      color: 'var(--indigo-700)',
      fontSize: 'var(--text-sm)'
    }
  }, 'Pattern ' + (i + 1) + ': ' + p.pattern), React.createElement('p', {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-xs)',
      color: 'var(--indigo-600)',
      lineHeight: 1.5
    }
  }, p.detail), p.advice && React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--indigo-500)',
      fontStyle: 'italic'
    }
  }, '💡 ' + p.advice))))),
  // Mistakes grouped by topic
  ...Object.values(groups).map(g => React.createElement('div', {
    key: g.topic
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    }
  }, React.createElement('span', {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: subjectColor[g.subject] || 'var(--indigo-600)',
      flexShrink: 0
    }
  }), React.createElement('h3', {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, '' + g.topic), React.createElement('span', {
    style: {
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, g.items.length + ' mistake' + (g.items.length > 1 ? 's' : ''))), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, ...g.items.map((m, i) => React.createElement('div', {
    key: i,
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderLeft: '3px solid ' + (m.count > 1 ? '#ef4444' : 'var(--border-default)'),
      borderRadius: 'var(--radius-xl)',
      padding: '12px 14px'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 6
    }
  }, React.createElement('p', {
    style: {
      margin: 0,
      fontWeight: 600,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)',
      lineHeight: 1.4
    }
  }, m.question), m.count > 1 && React.createElement('span', {
    style: {
      background: '#fef2f2',
      color: '#ef4444',
      borderRadius: 999,
      padding: '2px 7px',
      fontSize: 10,
      fontWeight: 700,
      whiteSpace: 'nowrap'
    }
  }, m.count + '×')), React.createElement('p', {
    style: {
      margin: '0 0 2px',
      fontSize: 'var(--text-xs)',
      color: '#ef4444'
    }
  }, 'Your answer: ' + m.studentAnswer), React.createElement('p', {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-xs)',
      color: '#10b981'
    }
  }, 'Correct: ' + m.correctAnswer), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 10,
      color: 'var(--text-faint)'
    }
  }, m.date)))))));
}
window.MistakeJournal = MistakeJournal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/MistakeJournal.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/MockExam.jsx
try { (() => {
// AI Exam Coach — Mock Exam with AI Marking
function MockExam({
  onBack
}) {
  const DURATION = 600; // 10 min demo (real: 90 min)
  const Qs = [{
    id: 'mq1',
    type: 'mcq',
    q: 'Where does glycolysis occur?',
    opts: ['Mitochondrial matrix', 'Cytoplasm', 'Thylakoid membrane', 'Nucleus'],
    correct: 1,
    marks: 1,
    topic: 'Cellular Respiration'
  }, {
    id: 'mq2',
    type: 'short',
    q: 'Describe two differences between aerobic and anaerobic respiration.',
    model: 'Aerobic uses oxygen; anaerobic does not. Aerobic produces ~38 ATP; anaerobic only 2 ATP. Aerobic end-products are CO₂ and water; anaerobic produces lactic acid (or ethanol in plants).',
    marks: 4,
    topic: 'Cellular Respiration'
  }, {
    id: 'mq3',
    type: 'mcq',
    q: 'Which is the final electron acceptor in oxidative phosphorylation?',
    opts: ['NAD⁺', 'FADH₂', 'Oxygen', 'ADP'],
    correct: 2,
    marks: 1,
    topic: 'Respiration'
  }, {
    id: 'mq4',
    type: 'short',
    q: 'Explain how increasing temperature affects enzyme activity. Reference activation energy and denaturation.',
    model: 'Rising temperature increases kinetic energy, boosting collision frequency and reducing effective activation energy — reaction rate rises. Above the optimum, bonds in the active site break (denaturation), permanently altering its shape so substrate can no longer bind.',
    marks: 4,
    topic: 'Enzymes'
  }];
  const [phase, setPhase] = React.useState('intro');
  const [ans, setAns] = React.useState({});
  const [time, setTime] = React.useState(DURATION);
  const [mkPct, setMkPct] = React.useState(0);
  const [results, setResults] = React.useState(null);
  React.useEffect(() => {
    if (phase !== 'exam') return;
    if (time <= 0) {
      doSubmit();
      return;
    }
    const t = setInterval(() => setTime(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, time]);
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const doSubmit = async () => {
    setPhase('marking');
    const out = [];
    let tot = 0,
      max = 0;
    for (let i = 0; i < Qs.length; i++) {
      const q = Qs[i];
      max += q.marks;
      setMkPct(Math.round(i / Qs.length * 100));
      if (q.type === 'mcq') {
        const ok = ans[q.id] === q.correct;
        const sc = ok ? q.marks : 0;
        tot += sc;
        out.push({
          ...q,
          studentAns: ans[q.id] !== undefined ? q.opts[ans[q.id]] : 'No answer',
          score: sc,
          feedback: ok ? 'Correct.' : 'Incorrect. Correct: ' + q.opts[q.correct] + '.'
        });
      } else {
        const sa = ans[q.id] || '';
        if (!sa.trim()) {
          out.push({
            ...q,
            studentAns: sa,
            score: 0,
            feedback: 'No answer provided.'
          });
          continue;
        }
        try {
          const prompt = `You are an AQA A-level examiner. Mark strictly (max ${q.marks} marks).\nQ: "${q.q}"\nModel answer: "${q.model}"\nStudent: "${sa}"\nReply ONLY with JSON (no markdown): {"score":0-${q.marks},"feedback":"one marking comment"}`;
          const res = await window.claude.complete(prompt);
          const clean = res.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(clean);
          const sc = Math.min(q.marks, Math.max(0, Number(parsed.score) || 0));
          tot += sc;
          out.push({
            ...q,
            studentAns: sa,
            score: sc,
            feedback: parsed.feedback
          });
        } catch {
          out.push({
            ...q,
            studentAns: sa,
            score: 0,
            feedback: 'Marking error — review manually.'
          });
        }
      }
    }
    setMkPct(100);
    await new Promise(r => setTimeout(r, 400));
    const pct = tot / max;
    const grade = pct >= 0.8 ? 'A' : pct >= 0.7 ? 'B' : pct >= 0.6 ? 'C' : pct >= 0.5 ? 'D' : 'E';
    setResults({
      qs: out,
      tot,
      max,
      grade
    });
    setPhase('results');
  };
  if (phase === 'intro') return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      fontFamily: 'var(--font-sans)'
    }
  }, React.createElement('button', {
    onClick: onBack,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      textAlign: 'left',
      padding: 0
    }
  }, '← Back'), React.createElement('div', {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-2xl)',
      padding: 28
    }
  }, React.createElement('p', {
    style: {
      margin: '0 0 12px',
      fontSize: 36,
      textAlign: 'center'
    }
  }, '📝'), React.createElement('h2', {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      textAlign: 'center'
    }
  }, 'Biology Mock Paper'), React.createElement('p', {
    style: {
      margin: '0 0 24px',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      textAlign: 'center'
    }
  }, 'Personalised · AQA A-Level style · AI marked'), React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 12,
      marginBottom: 20
    }
  }, ...[['Questions', Qs.length], ['Total marks', Qs.reduce((a, q) => a + q.marks, 0)], ['Time', '10 min']].map(([l, v]) => React.createElement('div', {
    key: l,
    style: {
      textAlign: 'center',
      padding: 14,
      background: 'var(--surface-muted)',
      borderRadius: 'var(--radius-xl)'
    }
  }, React.createElement('p', {
    style: {
      margin: '0 0 4px',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-lg)'
    }
  }, '' + v), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, l)))), React.createElement('div', {
    style: {
      background: 'var(--indigo-50)',
      borderRadius: 'var(--radius-xl)',
      padding: '12px 16px',
      marginBottom: 20,
      fontSize: 'var(--text-sm)',
      color: 'var(--indigo-700)'
    }
  }, 'ℹ️ Focused on your weak topics: ', React.createElement('strong', null, 'Cellular Respiration'), ' & ', React.createElement('strong', null, 'Enzymes')), React.createElement('button', {
    onClick: () => setPhase('exam'),
    style: {
      width: '100%',
      background: 'var(--indigo-600)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: 14,
      fontWeight: 700,
      fontSize: 'var(--text-base)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, 'Start Exam →')));
  if (phase === 'exam') return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      fontFamily: 'var(--font-sans)'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }
  }, React.createElement('span', {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, 'Biology Mock'), React.createElement('span', {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      color: time < 120 ? '#ef4444' : 'var(--text-strong)',
      fontSize: 'var(--text-lg)'
    }
  }, fmt(time))), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, ...Qs.map((q, i) => React.createElement('div', {
    key: q.id,
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-2xl)',
      padding: 20
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, React.createElement('span', {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-faint)',
      textTransform: 'uppercase'
    }
  }, `Q${i + 1} · ${q.topic}`), React.createElement('span', {
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      background: 'var(--surface-muted)',
      borderRadius: 999,
      padding: '2px 8px'
    }
  }, q.marks + ' mark' + (q.marks > 1 ? 's' : ''))), React.createElement('p', {
    style: {
      margin: '0 0 14px',
      fontWeight: 600,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)',
      lineHeight: 1.5
    }
  }, q.q), q.type === 'mcq' ? React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, ...q.opts.map((opt, oi) => React.createElement('button', {
    key: oi,
    onClick: () => setAns(a => ({
      ...a,
      [q.id]: oi
    })),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: ans[q.id] === oi ? 'var(--indigo-50)' : 'var(--surface-muted)',
      border: '1px solid ' + (ans[q.id] === oi ? 'var(--indigo-500)' : 'var(--border-subtle)'),
      borderRadius: 'var(--radius-lg)',
      padding: '10px 14px',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      color: ans[q.id] === oi ? 'var(--indigo-700)' : 'var(--text-body)'
    }
  }, React.createElement('span', {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: ans[q.id] === oi ? 'var(--indigo-600)' : 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      color: ans[q.id] === oi ? '#fff' : 'var(--text-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      fontWeight: 700,
      flexShrink: 0
    }
  }, ['A', 'B', 'C', 'D'][oi]), opt))) : React.createElement('textarea', {
    value: ans[q.id] || '',
    onChange: e => setAns(a => ({
      ...a,
      [q.id]: e.target.value
    })),
    rows: 4,
    placeholder: 'Write your answer here…',
    style: {
      width: '100%',
      boxSizing: 'border-box',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: '12px 14px',
      fontSize: 'var(--text-sm)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-body)',
      background: 'var(--surface-page)',
      resize: 'vertical',
      outline: 'none',
      lineHeight: 1.6
    }
  })))), React.createElement('button', {
    onClick: doSubmit,
    style: {
      background: 'var(--indigo-600)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: 14,
      fontWeight: 700,
      fontSize: 'var(--text-base)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, 'Submit & Get AI Feedback →'));
  if (phase === 'marking') return React.createElement('div', {
    style: {
      textAlign: 'center',
      padding: '80px 24px',
      fontFamily: 'var(--font-sans)'
    }
  }, React.createElement('div', {
    style: {
      fontSize: 52,
      marginBottom: 16
    }
  }, '🤖'), React.createElement('h2', {
    style: {
      margin: '0 0 8px',
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, 'AI is marking your exam…'), React.createElement('p', {
    style: {
      margin: '0 0 24px',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, 'Comparing answers against mark scheme'), React.createElement('div', {
    style: {
      background: 'var(--surface-muted)',
      borderRadius: 999,
      height: 8,
      overflow: 'hidden',
      maxWidth: 280,
      margin: '0 auto 10px'
    }
  }, React.createElement('div', {
    style: {
      height: '100%',
      width: mkPct + '%',
      background: 'var(--indigo-600)',
      borderRadius: 999,
      transition: 'width 0.5s ease'
    }
  })), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, mkPct + '% complete'));
  if (phase === 'results' && results) {
    const {
      qs,
      tot,
      max,
      grade
    } = results;
    const pct = Math.round(tot / max * 100);
    const gc = {
      A: '#10b981',
      B: '#6366f1',
      C: '#f59e0b',
      D: '#ef4444',
      E: '#dc2626'
    }[grade] || '#6366f1';
    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        fontFamily: 'var(--font-sans)'
      }
    }, React.createElement('button', {
      onClick: onBack,
      style: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)',
        textAlign: 'left',
        padding: 0
      }
    }, '← Back'), React.createElement('div', {
      style: {
        background: gc + '12',
        border: '1px solid ' + gc + '30',
        borderRadius: 'var(--radius-2xl)',
        padding: 28,
        textAlign: 'center'
      }
    }, React.createElement('p', {
      style: {
        margin: '0 0 4px',
        fontSize: 72,
        fontWeight: 800,
        color: gc
      }
    }, '' + grade), React.createElement('p', {
      style: {
        margin: '0 0 6px',
        fontSize: 'var(--text-xl)',
        fontWeight: 700,
        color: 'var(--text-strong)'
      }
    }, `${tot} / ${max} marks (${pct}%)`), React.createElement('p', {
      style: {
        margin: 0,
        fontSize: 'var(--text-sm)',
        color: 'var(--text-muted)'
      }
    }, pct >= 70 ? 'Strong performance' : 'Review the feedback below and add weak topics to your schedule')), React.createElement('h3', {
      style: {
        margin: 0,
        fontSize: 'var(--text-base)',
        fontWeight: 700,
        color: 'var(--text-strong)'
      }
    }, 'Question breakdown'), React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, ...qs.map((r, i) => React.createElement('div', {
      key: i,
      style: {
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: 16
      }
    }, React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 8
      }
    }, React.createElement('p', {
      style: {
        margin: 0,
        fontWeight: 600,
        color: 'var(--text-strong)',
        fontSize: 'var(--text-sm)',
        flex: 1
      }
    }, `Q${i + 1}. ${r.q}`), React.createElement('span', {
      style: {
        fontWeight: 700,
        fontSize: 'var(--text-sm)',
        color: r.score === r.marks ? '#10b981' : r.score > 0 ? '#f59e0b' : '#ef4444',
        whiteSpace: 'nowrap'
      }
    }, `${r.score}/${r.marks}`)), r.studentAns && r.type === 'short' && React.createElement('p', {
      style: {
        margin: '0 0 6px',
        fontSize: 11,
        color: 'var(--text-muted)',
        fontStyle: 'italic',
        lineHeight: 1.5
      }
    }, 'Your answer: ' + r.studentAns.slice(0, 140) + (r.studentAns.length > 140 ? '…' : '')), React.createElement('p', {
      style: {
        margin: 0,
        fontSize: 'var(--text-xs)',
        color: r.score === r.marks ? '#065f46' : '#92400e',
        background: r.score === r.marks ? '#f0fdf4' : '#fffbeb',
        padding: '6px 10px',
        borderRadius: 8,
        lineHeight: 1.5
      }
    }, r.feedback)))), React.createElement('button', {
      onClick: onBack,
      style: {
        background: 'var(--indigo-600)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-xl)',
        padding: 14,
        fontWeight: 700,
        fontSize: 'var(--text-base)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)'
      }
    }, 'Back to Study Hub'));
  }
  return null;
}
window.MockExam = MockExam;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/MockExam.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/MonthlyInsights.jsx
try { (() => {
// AI Exam Coach — Personal Learning Insights / Monthly Report (#14)
function MonthlyInsights({
  onBack
}) {
  const [summary, setSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const stats = {
    hours: 42,
    sessions: 56,
    topicsMastered: 18,
    cards: 340,
    confidenceChange: 16,
    streak: 12
  };
  const subjects = [{
    name: 'Biology',
    color: '#6366f1',
    from: 'B',
    to: 'A',
    pFrom: 54,
    pTo: 62
  }, {
    name: 'Chemistry',
    color: '#f43f5e',
    from: 'D',
    to: 'C',
    pFrom: 24,
    pTo: 31
  }, {
    name: 'History',
    color: '#14b8a6',
    from: 'A',
    to: 'A*',
    pFrom: 76,
    pTo: 78
  }];
  const getAiSummary = async () => {
    setLoading(true);
    try {
      const p = `Write a 3-sentence personalised monthly study summary for a student: studied 42h, reviewed 340 flashcards, mastered 18 topics, Biology 54%→62%, Chemistry 24%→31%, History 76%→78% grade probability, 12-day study streak. Be specific, encouraging and give one clear focus for next month.`;
      setSummary(await window.claude.complete(p));
    } catch {
      setSummary('Unable to generate summary — please try again.');
    }
    setLoading(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      padding: 0
    }
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, "June Report"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "Personal learning insights \xB7 June 2026"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 10
    }
  }, [['⏱️', stats.hours + 'h', 'Study time'], ['📚', stats.topicsMastered, 'Topics mastered'], ['🃏', stats.cards, 'Cards reviewed'], ['📈', '+' + stats.confidenceChange + '%', 'Confidence gain'], ['✓', stats.sessions, 'Sessions done'], ['🔥', stats.streak, 'Best streak']].map(([icon, val, label]) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: 14,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      marginBottom: 4
    }
  }, icon), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 2px',
      fontWeight: 800,
      fontSize: 'var(--text-xl)',
      color: 'var(--text-strong)'
    }
  }, val), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 10,
      color: 'var(--text-muted)'
    }
  }, label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-2xl)',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: '0 0 14px',
      fontSize: 'var(--text-base)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, "Grade Trajectory"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, subjects.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: s.color,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, s.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, s.from), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-faint)'
    }
  }, "\u2192"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#10b981',
      fontWeight: 700
    }
  }, s.to), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: '#10b981',
      background: '#f0fdf4',
      borderRadius: 999,
      padding: '1px 6px'
    }
  }, "+", s.pTo - s.pFrom, "%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--surface-muted)',
      borderRadius: 999,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: s.pFrom + '%',
      background: 'var(--slate-300)',
      borderRadius: 999
    }
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 9,
      color: 'var(--text-faint)'
    }
  }, "June start: ", s.pFrom, "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--surface-muted)',
      borderRadius: 999,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: s.pTo + '%',
      background: s.color,
      borderRadius: 999
    }
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 9,
      color: 'var(--text-faint)',
      textAlign: 'right'
    }
  }, "June end: ", s.pTo, "%"))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-2xl)',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: summary ? 12 : 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 2px',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)'
    }
  }, "\uD83E\uDD16 AI Monthly Summary"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "Personalised insight on your June progress")), !summary && /*#__PURE__*/React.createElement("button", {
    onClick: getAiSummary,
    disabled: loading,
    style: {
      background: 'var(--indigo-600)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-lg)',
      padding: '8px 16px',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      whiteSpace: 'nowrap'
    }
  }, loading ? 'Generating…' : 'Generate')), loading && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, "\uD83E\uDD16 Writing your summary\u2026"), summary && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      lineHeight: 1.7
    }
  }, summary)), /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      background: 'var(--indigo-600)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: 14,
      fontWeight: 700,
      fontSize: 'var(--text-base)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, "Back to Study Hub"));
}
window.MonthlyInsights = MonthlyInsights;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/MonthlyInsights.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Onboarding.jsx
try { (() => {
// AI Exam Coach — Onboarding: mobile-first, 5-step "personal advisor" flow
function Onboarding({
  onFinish,
  lang,
  onLangChange
}) {
  const {
    Button
  } = window.AIExamCoachDesignSystem_99e467;
  const c = window.ONB[lang] || window.ONB.en;
  const langs = Object.values(window.LANGS);
  const [step, setStep] = React.useState(1);
  const [examId, setExamId] = React.useState("alevel");
  const exam = window.examType(examId);

  // subjects seeded from defaults; grades follow the chosen exam system
  const seed = () => window.DEFAULT_SUBJECTS.map(s => ({
    ...s,
    current: exam.grade.current,
    target: exam.grade.target
  }));
  const [subjects, setSubjects] = React.useState(seed);
  const [weeklyHours, setWeeklyHours] = React.useState(12);
  const [materials, setMaterials] = React.useState(() => new Set(["notes", "papers"]));
  const [prefs, setPrefs] = React.useState(() => new Set(["chat", "recall", "spaced"]));
  const [files, setFiles] = React.useState([]);
  const [tz, setTz] = React.useState(() => window.detectTimezone());
  const [tzOpen, setTzOpen] = React.useState(false);
  const [analysisDone, setAnalysisDone] = React.useState(false);
  const [plan, setPlan] = React.useState(() => window.PLAN_REVIEW.map(p => ({
    ...p
  })));

  // when the exam system changes, re-default every subject's grades to it
  const pickExam = id => {
    const e = window.examType(id);
    setExamId(id);
    setSubjects(subs => subs.map(s => ({
      ...s,
      current: e.grade.current,
      target: e.grade.target
    })));
  };
  const COLORS = ["indigo", "rose", "teal", "violet", "orange", "cyan", "pink", "emerald"];
  const addSubject = () => setSubjects(subs => [...subs, {
    id: "s" + Date.now(),
    name: "",
    color: `var(--subject-${COLORS[subs.length % COLORS.length]})`,
    current: exam.grade.current,
    target: exam.grade.target
  }]);
  const removeSubject = id => setSubjects(subs => subs.filter(s => s.id !== id));
  const setSubject = (id, patch) => setSubjects(subs => subs.map(s => s.id === id ? {
    ...s,
    ...patch
  } : s));
  const toggle = setFn => id => setFn(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const accent = "var(--indigo-600)";
  const canNext = step !== 2 || subjects.length > 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "linear-gradient(to bottom, var(--indigo-50), #FAF5FF)",
      display: "flex",
      justifyContent: "center",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes onb-spin{to{transform:rotate(360deg)}}@keyframes onb-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 460,
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-5) var(--space-5) var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)",
      fontSize: "var(--text-base)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("span", null, "AI Exam Coach")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 2
    }
  }, langs.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.code,
    onClick: () => onLangChange(l.code),
    title: l.label,
    style: {
      border: lang === l.code ? "2px solid var(--indigo-500)" : "2px solid transparent",
      borderRadius: "var(--radius-full)",
      background: "transparent",
      cursor: "pointer",
      fontSize: "var(--text-lg)",
      padding: "2px",
      lineHeight: 1
    }
  }, l.flag)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, [1, 2, 3, 4, 5].map(n => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      flex: 1,
      height: 5,
      borderRadius: "var(--radius-full)",
      background: n <= step ? "var(--indigo-500)" : "var(--slate-200)",
      transition: "background var(--dur-normal) ease"
    }
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--space-2) 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      fontWeight: "var(--weight-medium)"
    }
  }, c.step_of(step))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: "var(--space-3) var(--space-5) var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)"
    }
  }, step === 1 && /*#__PURE__*/React.createElement(window.CoachBubble, {
    advisor: c.advisor
  }, c.greeting), step > 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)"
    }
  }, c["s" + step + "_title"]), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, c["s" + step + "_sub"])), step === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 4px",
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)"
    }
  }, c.s1_title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-4)",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, c.s1_sub), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-2)"
    }
  }, window.EXAM_TYPES.map(e => {
    const sel = examId === e.id;
    return /*#__PURE__*/React.createElement("button", {
      key: e.id,
      type: "button",
      onClick: () => pickExam(e.id),
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minHeight: 76,
        padding: "var(--space-3)",
        borderRadius: "var(--radius-xl)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-sans)",
        border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
        background: sel ? "var(--indigo-50)" : "var(--surface-card)",
        boxShadow: sel ? "var(--shadow-sm)" : "none",
        transition: "all var(--dur-fast) ease"
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        fontSize: 20
      }
    }, e.emoji), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-base)",
        fontWeight: "var(--weight-bold)",
        color: sel ? "var(--indigo-700)" : "var(--text-strong)"
      }
    }, e.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-xs)",
        color: "var(--text-faint)"
      }
    }, e.blurb));
  })))), step === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, subjects.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      borderRadius: "var(--radius-2xl)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderLeft: `5px solid ${s.color}`,
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-4)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: s.name,
    onChange: e => setSubject(s.id, {
      name: e.target.value
    }),
    placeholder: c.s2_name_ph,
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)",
      fontFamily: "var(--font-sans)"
    }
  }), subjects.length > 1 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => removeSubject(s.id),
    "aria-label": "Remove",
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--text-faint)",
      fontSize: 16,
      padding: 4
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-faint)"
    }
  }, c.s2_current), /*#__PURE__*/React.createElement(window.GradePicker, {
    grade: exam.grade,
    value: s.current,
    onChange: v => setSubject(s.id, {
      current: v
    }),
    accent: "var(--text-muted)"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--indigo-600)"
    }
  }, c.s2_target), /*#__PURE__*/React.createElement(window.GradePicker, {
    grade: exam.grade,
    value: s.target,
    onChange: v => setSubject(s.id, {
      target: v
    }),
    accent: "var(--indigo-600)"
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: addSubject,
    style: {
      minHeight: 48,
      borderRadius: "var(--radius-xl)",
      border: "1.5px dashed var(--border-default)",
      background: "transparent",
      color: "var(--indigo-600)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-sm)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, c.s2_add))), step === 3 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.CoachBubble, {
    advisor: c.advisor
  }, c.s3_rec(weeklyHours)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-6xl)",
      fontWeight: "var(--weight-bold)",
      color: accent,
      lineHeight: 1
    }
  }, weeklyHours), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--space-1) 0 0",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, c.s3_hours)), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 2,
    max: 40,
    step: 1,
    value: weeklyHours,
    onChange: e => setWeeklyHours(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: accent,
      height: 28
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      marginTop: "var(--space-3)"
    }
  }, [5, 10, 15, 20].map(h => /*#__PURE__*/React.createElement("button", {
    key: h,
    type: "button",
    onClick: () => setWeeklyHours(h),
    style: {
      flex: 1,
      minHeight: 44,
      borderRadius: "var(--radius-lg)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      border: weeklyHours === h ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
      background: weeklyHours === h ? "var(--indigo-50)" : "var(--surface-card)",
      color: weeklyHours === h ? "var(--indigo-700)" : "var(--text-muted)"
    }
  }, h, "h")))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      padding: "var(--space-3) var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83C\uDF0D"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: "var(--text-sm)",
      color: "var(--text-body)"
    }
  }, c.tz_detected(`${tz.label} · ${tz.place}`)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setTzOpen(o => !o),
    style: {
      border: "none",
      background: "transparent",
      color: "var(--indigo-600)",
      fontWeight: "var(--weight-semibold)",
      fontSize: "var(--text-sm)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)"
    }
  }, c.tz_change)), tzOpen && /*#__PURE__*/React.createElement("select", {
    value: tz.id,
    onChange: e => {
      setTz(window.TIMEZONES.find(z => z.id === e.target.value));
      setTzOpen(false);
    },
    style: {
      marginTop: "var(--space-3)",
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 12px",
      fontSize: "var(--text-sm)",
      fontFamily: "var(--font-sans)",
      color: "var(--text-strong)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-lg)",
      appearance: "none"
    }
  }, window.TIMEZONES.map(z => /*#__PURE__*/React.createElement("option", {
    key: z.id,
    value: z.id
  }, z.label, " \u2014 ", z.place))))), step === 4 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(window.UploadZone, {
    files: files,
    copy: c,
    onAdd: fs => setFiles(prev => [...prev, ...fs]),
    onRemove: i => setFiles(prev => prev.filter((_, j) => j !== i))
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-faint)"
    }
  }, c.s4_materials), /*#__PURE__*/React.createElement(window.ChipGrid, {
    items: window.MATERIALS,
    selected: materials,
    onToggle: toggle(setMaterials),
    lang: lang
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-faint)"
    }
  }, c.s4_prefs), /*#__PURE__*/React.createElement(window.ChipGrid, {
    items: window.PREFERENCES,
    selected: prefs,
    onToggle: toggle(setPrefs),
    lang: lang
  }))), step === 5 && /*#__PURE__*/React.createElement(React.Fragment, null, !analysisDone ? /*#__PURE__*/React.createElement(window.AnalysisAnimation, {
    lang: lang,
    copy: c,
    onComplete: () => setAnalysisDone(true)
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, plan.map((row, i) => /*#__PURE__*/React.createElement(window.PlanRow, {
    key: row.id,
    row: row,
    copy: c,
    onSessions: v => setPlan(p => p.map((r, j) => j === i ? {
      ...r,
      sessions: v
    } : r))
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "sticky",
      bottom: 0,
      padding: "var(--space-4) var(--space-5)",
      background: "linear-gradient(to top, #FAF5FF 70%, transparent)",
      display: "flex",
      gap: "var(--space-3)"
    }
  }, step > 1 && /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: () => setStep(s => s - 1)
  }, c.back), step < 5 ? /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg",
    fullWidth: true,
    disabled: !canNext,
    onClick: () => setStep(s => s + 1)
  }, c.next) : analysisDone ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onFinish
  }, c.accept) : /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "lg",
    fullWidth: true,
    disabled: true
  }, c.analysing))));
}
window.Onboarding = Onboarding;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Onboarding.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Progress.jsx
try { (() => {
// AI Exam Coach — Progress screen (i18n-aware) — v2 with feedback fixes
function Progress({
  t
}) {
  const {
    Card,
    ProgressBar,
    Badge
  } = window.AIExamCoachDesignSystem_99e467;
  const maxBar = 3;

  // FIX #11: Human-readable ease labels instead of raw SM-2 float
  const easeLabel = ease => {
    if (ease < 2.0) return {
      label: "Struggling",
      emoji: "😟",
      color: "var(--red-500)"
    };
    if (ease < 2.5) return {
      label: "Getting there",
      emoji: "📈",
      color: "var(--amber-600)"
    };
    if (ease < 3.0) return {
      label: "Confident",
      emoji: "✓",
      color: "var(--emerald-600)"
    };
    return {
      label: "Mastered",
      emoji: "⭐",
      color: "var(--indigo-600)"
    };
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-8)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: "var(--text-2xl)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, t.progress_title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-4)",
      gridTemplateColumns: "1fr 2fr"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-muted)"
    }
  }, t.progress_streak), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: "var(--text-5xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--action-primary)"
    }
  }, "12"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, t.progress_streak_days)), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-3)",
      fontSize: "var(--text-sm)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-muted)"
    }
  }, t.progress_this_week), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-2)",
      alignItems: "stretch"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text-faint)",
      writingMode: "vertical-rl",
      transform: "rotate(180deg)",
      whiteSpace: "nowrap",
      letterSpacing: 0.5
    }
  }, "Sessions")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: "var(--space-3)",
      height: "80px"
    }
  }, window.WEEK.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: 3,
      height: "60px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    title: `Scheduled: ${d.scheduled} sessions`,
    style: {
      width: 8,
      height: `${d.scheduled / maxBar * 100}%`,
      background: "var(--slate-200)",
      borderRadius: "3px 3px 0 0",
      cursor: "default",
      minHeight: d.scheduled > 0 ? 4 : 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    title: `Completed: ${d.completed} sessions`,
    style: {
      width: 8,
      height: `${d.completed / maxBar * 100}%`,
      background: "var(--emerald-500)",
      borderRadius: "3px 3px 0 0",
      cursor: "default",
      minHeight: d.completed > 0 ? 4 : 0
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)"
    }
  }, [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun][i])))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-4)",
      marginTop: "var(--space-2)",
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      background: "var(--slate-200)",
      borderRadius: 2,
      display: "inline-block"
    }
  }), " Scheduled"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      background: "var(--emerald-500)",
      borderRadius: 2,
      display: "inline-block"
    }
  }), " Completed")))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 var(--space-3)",
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, t.progress_confidence), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, window.COURSES.map(c => {
    const el = easeLabel(c.confidencePct / 100 * 2.7 + 1.3);
    return /*#__PURE__*/React.createElement("div", {
      key: c.id
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "var(--text-sm)",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-body)"
      }
    }, c.subject), /*#__PURE__*/React.createElement("span", {
      style: {
        color: el.color,
        fontWeight: "var(--weight-medium)",
        fontSize: "var(--text-xs)"
      }
    }, el.emoji, " ", el.label)), /*#__PURE__*/React.createElement(ProgressBar, {
      value: c.confidencePct,
      autoColor: true
    }));
  })))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 var(--space-3)",
      fontSize: "var(--text-lg)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, t.progress_mastery), /*#__PURE__*/React.createElement(Card, {
    padding: "0"
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "var(--text-sm)"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--surface-muted)",
      color: "var(--text-muted)",
      textAlign: "left"
    }
  }, [t.progress_topic, t.progress_subject, t.progress_last_studied, "Mastery", t.progress_next_review].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "8px 12px",
      fontWeight: "var(--weight-medium)"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, window.MASTERY.map((r, i) => {
    const el = easeLabel(r.ease);
    return /*#__PURE__*/React.createElement("tr", {
      key: i,
      style: {
        borderTop: "1px solid var(--border-subtle)"
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px 12px",
        color: "var(--text-strong)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: r.tone
    }, el.emoji), r.topic)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px 12px",
        color: "var(--text-muted)"
      }
    }, r.subject), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px 12px",
        color: "var(--text-muted)"
      }
    }, r.last), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px 12px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: el.color,
        fontWeight: "var(--weight-medium)",
        fontSize: "var(--text-xs)"
      }
    }, el.emoji, " ", el.label)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "10px 12px",
        color: "var(--text-muted)"
      }
    }, r.next));
  }))))));
}
window.Progress = Progress;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Progress.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/QuizMode.jsx
try { (() => {
// AI Exam Coach — Adaptive Quiz Mode
function QuizMode({
  onBack
}) {
  const questions = window.DEFAULT_QUIZ;
  const [idx, setIdx] = React.useState(0);
  const [sel, setSel] = React.useState(null);
  const [submitted, setSubmit] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [results, setResults] = React.useState([]);
  const [done, setDone] = React.useState(false);
  const [expl, setExpl] = React.useState(null);
  const [loadingExpl, setLoadingExpl] = React.useState(false);
  const q = questions[idx];
  const isCorrect = sel === q.correct;
  const submit = () => {
    if (sel === null) return;
    setSubmit(true);
    if (isCorrect) setScore(s => s + 1);
    setResults(r => [...r, {
      qid: q.id,
      correct: isCorrect,
      sel,
      q: q.question,
      correctTxt: q.options[q.correct],
      selTxt: q.options[sel]
    }]);
  };
  const next = () => {
    setExpl(null);
    setSel(null);
    setSubmit(false);
    if (idx + 1 >= questions.length) setDone(true);else setIdx(i => i + 1);
  };
  const explain = async () => {
    if (loadingExpl) return;
    setLoadingExpl(true);
    try {
      const r = await window.claude.complete(`A-level student answered "${q.options[sel]}" for "${q.question}". Correct: "${q.options[q.correct]}". In 2 sentences: why were they wrong and what should they remember?`);
      setExpl(r);
    } catch {
      setExpl('AI explanation unavailable.');
    }
    setLoadingExpl(false);
  };
  if (done) {
    const pct = Math.round(score / questions.length * 100);
    const wrong = results.filter(r => !r.correct);
    return React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        fontFamily: 'var(--font-sans)'
      }
    }, React.createElement('button', {
      onClick: onBack,
      style: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)',
        padding: 0
      }
    }, '← Back'), React.createElement('div', {
      style: {
        textAlign: 'center',
        padding: '20px 0'
      }
    }, React.createElement('p', {
      style: {
        margin: '0 0 6px',
        fontSize: 72,
        fontWeight: 800,
        color: pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
        fontFamily: 'var(--font-mono)'
      }
    }, pct + '%'), React.createElement('h2', {
      style: {
        margin: '0 0 4px',
        fontSize: 'var(--text-xl)',
        fontWeight: 700,
        color: 'var(--text-strong)'
      }
    }, score + ' / ' + questions.length + ' correct'), React.createElement('p', {
      style: {
        margin: 0,
        fontSize: 'var(--text-sm)',
        color: 'var(--text-muted)'
      }
    }, pct >= 70 ? 'Great work!' : pct >= 50 ? 'Getting there — review below.' : 'These topics need more work.')), wrong.length > 0 && React.createElement('div', null, React.createElement('h3', {
      style: {
        margin: '0 0 12px',
        fontSize: 'var(--text-base)',
        fontWeight: 700,
        color: 'var(--text-strong)'
      }
    }, 'Review these mistakes:'), React.createElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, ...wrong.map((r, i) => React.createElement('div', {
      key: i,
      style: {
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '14px 16px'
      }
    }, React.createElement('p', {
      style: {
        margin: '0 0 6px',
        fontWeight: 600,
        color: 'var(--text-strong)',
        fontSize: 'var(--text-sm)'
      }
    }, r.q), React.createElement('p', {
      style: {
        margin: '0 0 2px',
        fontSize: 'var(--text-xs)',
        color: '#ef4444'
      }
    }, 'Your answer: ' + r.selTxt), React.createElement('p', {
      style: {
        margin: 0,
        fontSize: 'var(--text-xs)',
        color: '#10b981'
      }
    }, 'Correct: ' + r.correctTxt))))), React.createElement('button', {
      onClick: onBack,
      style: {
        background: 'var(--indigo-600)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-xl)',
        padding: '14px',
        fontWeight: 700,
        fontSize: 'var(--text-base)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)'
      }
    }, 'Back to Study Hub'));
  }
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      fontFamily: 'var(--font-sans)'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, React.createElement('button', {
    onClick: onBack,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      padding: 0
    }
  }, '← Back'), React.createElement('span', {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, idx + 1 + ' / ' + questions.length)), React.createElement('div', {
    style: {
      background: 'var(--surface-muted)',
      borderRadius: 999,
      height: 4
    }
  }, React.createElement('div', {
    style: {
      height: '100%',
      width: idx / questions.length * 100 + '%',
      background: 'var(--indigo-600)',
      borderRadius: 999,
      transition: 'width 0.3s'
    }
  })), React.createElement('span', {
    style: {
      background: 'var(--indigo-50)',
      color: 'var(--indigo-600)',
      borderRadius: 999,
      padding: '3px 10px',
      fontSize: 11,
      fontWeight: 600,
      alignSelf: 'flex-start'
    }
  }, q.topic),
  // Question card
  React.createElement('div', {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-2xl)',
      padding: '24px 20px'
    }
  }, React.createElement('p', {
    style: {
      margin: '0 0 6px',
      fontSize: 11,
      color: 'var(--text-faint)',
      textTransform: 'uppercase',
      letterSpacing: 1
    }
  }, 'Question ' + (idx + 1)), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 'var(--text-lg)',
      fontWeight: 600,
      color: 'var(--text-strong)',
      lineHeight: 1.4
    }
  }, q.question)),
  // Answer options
  React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, ...q.options.map((opt, oi) => {
    let bg = 'var(--surface-card)',
      border = 'var(--border-default)',
      col = 'var(--text-body)';
    if (submitted) {
      if (oi === q.correct) {
        bg = '#f0fdf4';
        border = '#10b981';
        col = '#065f46';
      } else if (oi === sel && !isCorrect) {
        bg = '#fef2f2';
        border = '#ef4444';
        col = '#991b1b';
      }
    } else if (oi === sel) {
      bg = 'var(--indigo-50)';
      border = 'var(--indigo-500)';
      col = 'var(--indigo-700)';
    }
    return React.createElement('button', {
      key: oi,
      onClick: () => !submitted && setSel(oi),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: bg,
        border: '1px solid ' + border,
        borderRadius: 'var(--radius-xl)',
        padding: '14px 16px',
        cursor: submitted ? 'default' : 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        color: col,
        transition: 'all 0.15s'
      }
    }, React.createElement('span', {
      style: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: oi === sel ? 'var(--indigo-600)' : 'var(--surface-muted)',
        color: oi === sel ? '#fff' : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 11,
        flexShrink: 0
      }
    }, ['A', 'B', 'C', 'D'][oi]), opt);
  })),
  // Submit / next
  !submitted ? React.createElement('button', {
    onClick: submit,
    disabled: sel === null,
    style: {
      background: sel !== null ? 'var(--indigo-600)' : 'var(--slate-200)',
      color: sel !== null ? '#fff' : 'var(--text-faint)',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: '14px',
      fontWeight: 700,
      fontSize: 'var(--text-base)',
      cursor: sel !== null ? 'pointer' : 'default',
      fontFamily: 'var(--font-sans)'
    }
  }, 'Submit Answer') : React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, React.createElement('div', {
    style: {
      background: isCorrect ? '#f0fdf4' : '#fef2f2',
      border: '1px solid ' + (isCorrect ? '#10b98130' : '#ef444430'),
      borderRadius: 'var(--radius-xl)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, React.createElement('span', {
    style: {
      fontSize: 20
    }
  }, isCorrect ? '✅' : '❌'), React.createElement('p', {
    style: {
      margin: 0,
      fontWeight: 600,
      fontSize: 'var(--text-sm)',
      color: isCorrect ? '#065f46' : '#991b1b'
    }
  }, isCorrect ? 'Correct!' : 'Incorrect — correct: ' + q.options[q.correct])), !isCorrect && React.createElement('div', null, !expl && !loadingExpl && React.createElement('button', {
    onClick: explain,
    style: {
      border: '1px solid var(--border-default)',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '8px 14px',
      fontSize: 11,
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, '🤖 Explain why I was wrong'), loadingExpl && React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)'
    }
  }, '🤖 Thinking…'), expl && React.createElement('div', {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 16px'
    }
  }, React.createElement('p', {
    style: {
      margin: '0 0 6px',
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--indigo-600)',
      textTransform: 'uppercase'
    }
  }, '🤖 AI Explanation'), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      lineHeight: 1.6
    }
  }, expl))), React.createElement('button', {
    onClick: next,
    style: {
      background: 'var(--indigo-600)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: '14px',
      fontWeight: 700,
      fontSize: 'var(--text-base)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, idx + 1 >= questions.length ? 'See Results →' : 'Next Question →')));
}
window.QuizMode = QuizMode;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/QuizMode.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Schedule.jsx
try { (() => {
// AI Exam Coach — Schedule screen (i18n-aware)
function Schedule({
  t
}) {
  const todayDate = new Date();
  const [cursor, setCursor] = React.useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [selected, setSelected] = React.useState(todayDate);
  const SESSIONS_BY_DAY = {
    "2026-06-09": [{
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "Cellular respiration",
      status: "completed"
    }, {
      subject: "AP Chemistry",
      color: "#F43F5E",
      topic: "Reaction rates",
      status: "completed"
    }, {
      subject: "History 101",
      color: "#14B8A6",
      topic: "Cold War",
      status: "completed"
    }],
    "2026-06-10": [{
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "DNA replication",
      status: "completed"
    }, {
      subject: "AP Chemistry",
      color: "#F43F5E",
      topic: "Equilibria",
      status: "completed"
    }],
    "2026-06-11": [{
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "Cellular respiration",
      status: "pending"
    }, {
      subject: "AP Chemistry",
      color: "#F43F5E",
      topic: "Reaction rates",
      status: "completed"
    }, {
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "DNA replication",
      status: "pending"
    }],
    "2026-06-12": [{
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "Photosynthesis",
      status: "pending"
    }, {
      subject: "History 101",
      color: "#14B8A6",
      topic: "Korean War",
      status: "pending"
    }],
    "2026-06-13": [{
      subject: "AP Chemistry",
      color: "#F43F5E",
      topic: "Acids & bases",
      status: "pending"
    }, {
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "Meiosis",
      status: "pending"
    }],
    "2026-06-15": [{
      subject: "History 101",
      color: "#14B8A6",
      topic: "Detente",
      status: "pending"
    }, {
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "Respiration review",
      status: "pending"
    }],
    "2026-06-17": [{
      subject: "AP Chemistry",
      color: "#F43F5E",
      topic: "Redox reactions",
      status: "pending"
    }],
    "2026-06-19": [{
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "Genetics",
      status: "pending"
    }, {
      subject: "History 101",
      color: "#14B8A6",
      topic: "Arms race",
      status: "pending"
    }],
    "2026-06-20": [{
      subject: "AP Chemistry",
      color: "#F43F5E",
      topic: "Electrochemistry",
      status: "pending"
    }, {
      subject: "A-Level Biology",
      color: "#6366F1",
      topic: "Evolution",
      status: "pending"
    }]
  };
  const EXAM_DATES = {
    "2026-06-20": {
      subject: "AP Chemistry",
      color: "#F43F5E"
    }
  };
  function getDaysInGrid(cursor) {
    const y = cursor.getFullYear(),
      m = cursor.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    let start = new Date(firstDay);
    const dow = (firstDay.getDay() + 6) % 7;
    start.setDate(start.getDate() - dow);
    let end = new Date(lastDay);
    const edow = (lastDay.getDay() + 6) % 7;
    if (edow < 6) end.setDate(end.getDate() + (6 - edow));
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    return days;
  }
  const days = getDaysInGrid(cursor);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = fmt(new Date());
  const selKey = fmt(selected);
  const selSessions = SESSIONS_BY_DAY[selKey] || [];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekdays = [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: "var(--text-2xl)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, t.schedule_title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--space-4)",
      gridTemplateColumns: "1fr 300px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)),
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "4px 8px",
      color: "var(--text-muted)",
      fontSize: "var(--text-lg)"
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, monthNames[cursor.getMonth()], " ", cursor.getFullYear()), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)),
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "4px 8px",
      color: "var(--text-muted)",
      fontSize: "var(--text-lg)"
    }
  }, "\u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: "var(--space-1)",
      textAlign: "center",
      marginBottom: "var(--space-1)"
    }
  }, weekdays.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      padding: "4px 0"
    }
  }, d))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: "var(--space-1)"
    }
  }, days.map(d => {
    const key = fmt(d);
    const inMonth = d.getMonth() === cursor.getMonth();
    const isToday = key === today;
    const isSel = key === selKey;
    const sess = SESSIONS_BY_DAY[key] || [];
    const exam = EXAM_DATES[key];
    const colors = [...new Set(sess.map(s => s.color))].slice(0, 4);
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      onClick: () => setSelected(new Date(d)),
      style: {
        minHeight: "64px",
        borderRadius: "var(--radius-lg)",
        textAlign: "left",
        padding: "6px",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        border: isSel ? "2px solid var(--indigo-500)" : isToday ? "1px solid var(--slate-700)" : "1px solid var(--border-subtle)",
        background: inMonth ? "var(--surface-card)" : "var(--surface-muted)",
        opacity: inMonth ? 1 : 0.5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-sm)",
        color: inMonth ? "var(--text-strong)" : "var(--text-faint)"
      }
    }, d.getDate()), exam && /*#__PURE__*/React.createElement("span", {
      style: {
        color: exam.color,
        fontSize: "10px"
      }
    }, "\u2605")), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: "4px",
        display: "flex",
        flexWrap: "wrap",
        gap: "2px"
      }
    }, colors.map(c => /*#__PURE__*/React.createElement("span", {
      key: c,
      style: {
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: c,
        display: "inline-block"
      }
    }))));
  }))), /*#__PURE__*/React.createElement("aside", {
    style: {
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 12px",
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, selected ? selected.toLocaleDateString(t.code === "uk" ? "uk-UA" : t.code === "fr" ? "fr-FR" : t.code === "de" ? "de-DE" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short"
  }) : t.schedule_pick_day), selSessions.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, t.schedule_no_sessions) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, selSessions.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border-default)",
      borderLeft: `4px solid ${s.color}`,
      padding: "8px 10px"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, s.subject), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-sm)",
      color: "var(--text-strong)"
    }
  }, s.topic), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-xs)",
      color: s.status === "completed" ? "var(--emerald-600)" : "var(--text-faint)"
    }
  }, s.status === "completed" ? "✓ " + t.schedule_completed : t.schedule_pending)))), EXAM_DATES[selKey] && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-3)",
      borderRadius: "var(--radius-lg)",
      background: "var(--amber-50)",
      border: "1px solid var(--amber-100)",
      padding: "8px 10px",
      fontSize: "var(--text-sm)",
      color: "var(--amber-700)"
    }
  }, "\u2605 ", EXAM_DATES[selKey].subject, " ", t.schedule_exam_today))));
}
window.Schedule = Schedule;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Schedule.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Settings.jsx
try { (() => {
// AI Exam Coach — Settings screen (i18n-aware)
function Settings({
  t,
  lang,
  onLangChange
}) {
  const {
    Button
  } = window.AIExamCoachDesignSystem_99e467;
  const [fullName, setFullName] = React.useState("Alex Johnson");
  const [tz, setTz] = React.useState(() => window.detectTimezone ? window.detectTimezone() : {
    id: "+00",
    label: "GMT+0",
    place: "London"
  });
  const [reminderEnabled, setReminderEnabled] = React.useState(true);
  const [reminderHour, setReminderHour] = React.useState(9);
  const [saved, setSaved] = React.useState(false);
  const ZONES = window.TIMEZONES || [];
  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2800);
  }
  function Section({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "0 0 12px",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-semibold)",
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-wide)",
        color: "var(--text-faint)",
        fontFamily: "var(--font-sans)"
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)"
      }
    }, children));
  }
  function Field({
    label,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        display: "block",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        color: "var(--text-body)",
        marginBottom: "var(--space-1)",
        fontFamily: "var(--font-sans)"
      }
    }, label), children);
  }
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 16px",
    fontSize: "var(--text-base)",
    fontFamily: "var(--font-sans)",
    color: "var(--text-strong)",
    background: "var(--surface-card)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-xl)",
    outline: "none"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: "var(--text-2xl)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, t.settings_title), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-form)",
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-6)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement(Section, {
    title: "Account"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Full name"
  }, /*#__PURE__*/React.createElement("input", {
    value: fullName,
    onChange: e => setFullName(e.target.value),
    placeholder: "Your name",
    style: inputStyle
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Email"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...inputStyle,
      background: "var(--surface-muted)",
      color: "var(--text-muted)"
    }
  }, "alex@example.com"))), /*#__PURE__*/React.createElement(Section, {
    title: t.settings_timezone
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83C\uDF0D"), /*#__PURE__*/React.createElement("span", null, lang === "uk" ? "Визначено автоматично" : lang === "ru" ? "Определено автоматически" : lang === "fr" ? "Détecté automatiquement" : lang === "de" ? "Automatisch erkannt" : "Auto-detected", " \u2014 ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-strong)"
    }
  }, tz.label, " \xB7 ", tz.place))), /*#__PURE__*/React.createElement(Field, {
    label: t.settings_timezone
  }, /*#__PURE__*/React.createElement("select", {
    value: tz.id,
    onChange: e => setTz(ZONES.find(z => z.id === e.target.value)),
    style: {
      ...inputStyle,
      appearance: "none"
    }
  }, ZONES.map(z => /*#__PURE__*/React.createElement("option", {
    key: z.id,
    value: z.id
  }, z.label, " \u2014 ", z.place))))), /*#__PURE__*/React.createElement(Section, {
    title: "Daily reminders"
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: reminderEnabled,
    onChange: e => setReminderEnabled(e.target.checked),
    style: {
      width: 16,
      height: 16,
      accentColor: "var(--indigo-600)",
      cursor: "pointer"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-body)"
    }
  }, lang === "uk" ? "Надсилати щоденний нагадувальний лист" : lang === "fr" ? "Envoyer un rappel quotidien par email" : lang === "de" ? "Tägliche Erinnerungs-E-Mail senden" : "Send me a daily study reminder email")), reminderEnabled && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-body)",
      marginBottom: "var(--space-1)"
    }
  }, lang === "uk" ? "Час нагадування" : lang === "fr" ? "Heure de rappel" : lang === "de" ? "Erinnerungszeit" : "Reminder time", " \u2014 ", String(reminderHour).padStart(2, "0"), ":00"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 6,
    max: 22,
    value: reminderHour,
    onChange: e => setReminderHour(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: "var(--indigo-600)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      marginTop: "2px"
    }
  }, /*#__PURE__*/React.createElement("span", null, "6:00"), /*#__PURE__*/React.createElement("span", null, "22:00")))), /*#__PURE__*/React.createElement(Section, {
    title: t.settings_language
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-2)"
    }
  }, Object.values(window.LANGS).map(l => /*#__PURE__*/React.createElement("button", {
    key: l.code,
    onClick: () => onLangChange(l.code),
    style: {
      padding: "8px 16px",
      borderRadius: "var(--radius-lg)",
      fontSize: "var(--text-sm)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      border: lang === l.code ? "1px solid var(--indigo-500)" : "1px solid var(--border-default)",
      background: lang === l.code ? "var(--indigo-50)" : "var(--surface-card)",
      color: lang === l.code ? "var(--indigo-700)" : "var(--text-muted)",
      fontWeight: lang === l.code ? "var(--weight-medium)" : "var(--weight-normal)"
    }
  }, /*#__PURE__*/React.createElement("span", null, l.flag), /*#__PURE__*/React.createElement("span", null, l.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    size: "md",
    onClick: save
  }, t.settings_save))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      bottom: 28,
      right: 28,
      zIndex: 9999,
      background: "var(--slate-900)",
      color: "#fff",
      borderRadius: "var(--radius-xl)",
      padding: "12px 20px",
      fontSize: "var(--text-sm)",
      fontFamily: "var(--font-sans)",
      display: "flex",
      alignItems: "center",
      gap: 10,
      boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      transform: saved ? "translateY(0)" : "translateY(80px)",
      opacity: saved ? 1 : 0,
      transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "var(--emerald-500)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      flexShrink: 0
    }
  }, "\u2713"), "Settings saved"));
}
window.Settings = Settings;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Settings.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/ShareProgress.jsx
try { (() => {
// AI Exam Coach — Share Progress / Parent & Teacher View (#11)
function ShareProgress({
  onBack
}) {
  const [copied, setCopied] = React.useState(false);
  const courses = window.COURSES;
  const weekSessions = (window.WEEK || []).reduce((a, d) => a + d.completed, 0);
  const copy = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      padding: 0
    }
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, "Share Progress"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "For parents and teachers \xB7 always optional"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
      borderRadius: 'var(--radius-2xl)',
      padding: 24,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 1px',
      fontWeight: 700,
      fontSize: 'var(--text-base)'
    }
  }, "Alex Johnson"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      opacity: 0.7
    }
  }, "AI Exam Coach \xB7 Progress report \xB7 June 25, 2026"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 10,
      marginBottom: 20
    }
  }, [['🔥 12', 'Day streak'], [weekSessions + ' ✓', 'Sessions/week'], ['61%', 'Exam readiness']].map(([v, l]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 12,
      padding: '12px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 3px',
      fontWeight: 800,
      fontSize: 'var(--text-lg)'
    }
  }, v), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 10,
      opacity: 0.75
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, courses.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.7)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 'var(--text-sm)',
      opacity: 0.9
    }
  }, c.subject), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      opacity: 0.65
    }
  }, c.predictedGrade, " \u2192"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 700
    }
  }, c.targetGrade), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 4,
      background: 'rgba(255,255,255,0.2)',
      borderRadius: 999,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: c.gradeProbability + '%',
      background: '#fff',
      borderRadius: 999
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      opacity: 0.75,
      minWidth: 32,
      textAlign: 'right'
    }
  }, c.gradeProbability, "%"))))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--text-muted)',
      lineHeight: 1.6
    }
  }, "Sharing is always optional. The link shows only this summary card \u2014 no session notes, uploaded materials, or private data are included."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: copy,
    style: {
      flex: 1,
      background: copied ? '#10b981' : 'var(--indigo-600)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: '12px',
      fontWeight: 700,
      fontSize: 'var(--text-sm)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      transition: 'background 0.15s'
    }
  }, copied ? '✓ Link copied!' : '🔗 Copy shareable link'), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1,
      background: 'var(--surface-card)',
      color: 'var(--text-body)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)',
      padding: '12px',
      fontWeight: 600,
      fontSize: 'var(--text-sm)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, "\uD83D\uDCC4 Export as PDF")));
}
window.ShareProgress = ShareProgress;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/ShareProgress.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/StudyHub.jsx
try { (() => {
// AI Exam Coach — Phase C Study Hub (sub-router)
function StudyHub({
  t
}) {
  const [mode, setMode] = React.useState(null);
  const [cards, setCards] = React.useState(() => {
    try {
      const s = localStorage.getItem(window.PHASE_C_CARDS_KEY);
      return s ? JSON.parse(s) : window.DEFAULT_CARDS;
    } catch {
      return window.DEFAULT_CARDS;
    }
  });
  const saveCards = c => {
    setCards(c);
    try {
      localStorage.setItem(window.PHASE_C_CARDS_KEY, JSON.stringify(c));
    } catch {}
  };
  const dueCards = cards.filter(c => c.dueNow);
  const mistakes = window.DEFAULT_MISTAKES;
  const achs = window.ALL_ACHIEVEMENTS;
  if (mode === 'upload') return React.createElement(window.UploadFlow, {
    onBack: () => setMode(null),
    onGenerated: nc => {
      saveCards([...cards, ...nc]);
      setMode('flashcard');
    }
  });
  if (mode === 'flashcard') return React.createElement(window.FlashcardMode, {
    cards: dueCards.length > 0 ? dueCards : cards,
    allCards: cards,
    onBack: () => setMode(null),
    onUpdateCards: saveCards
  });
  if (mode === 'quiz') return React.createElement(window.QuizMode, {
    onBack: () => setMode(null)
  });
  if (mode === 'exam') return React.createElement(window.MockExam, {
    onBack: () => setMode(null)
  });
  if (mode === 'journal') return React.createElement(window.MistakeJournal, {
    mistakes,
    onBack: () => setMode(null)
  });
  if (mode === 'achievements') return React.createElement(window.Achievements, {
    onBack: () => setMode(null)
  });
  if (mode === 'insights') return React.createElement(window.MonthlyInsights, {
    onBack: () => setMode(null)
  });
  if (mode === 'share') return React.createElement(window.ShareProgress, {
    onBack: () => setMode(null)
  });
  const ModeCard = ({
    icon,
    title,
    desc,
    badge,
    onClick
  }) => React.createElement('button', {
    onClick,
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-2xl)',
      padding: '20px',
      textAlign: 'left',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.15s, box-shadow 0.15s',
      width: '100%'
    },
    onMouseEnter: e => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }
  }, badge && React.createElement('span', {
    style: {
      position: 'absolute',
      top: 14,
      right: 14,
      background: 'var(--indigo-600)',
      color: '#fff',
      borderRadius: 999,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 700
    }
  }, badge), React.createElement('div', {
    style: {
      fontSize: 28,
      marginBottom: 10
    }
  }, icon), React.createElement('p', {
    style: {
      margin: '0 0 4px',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-base)'
    }
  }, title), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      lineHeight: 1.5
    }
  }, desc));
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-6)'
    }
  },
  // Header
  React.createElement('div', null, React.createElement('h1', {
    style: {
      margin: '0 0 4px',
      fontSize: 'var(--text-2xl)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontFamily: 'var(--font-sans)'
    }
  }, 'Study Mode'), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)'
    }
  }, `${dueCards.length} cards due · ${mistakes.filter(m => m.count > 1).length} recurring mistakes · 12-day streak`)),
  // Banner — cards due
  dueCards.length > 0 && React.createElement('div', {
    style: {
      background: 'linear-gradient(135deg,var(--indigo-600),#7c3aed)',
      borderRadius: 'var(--radius-2xl)',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16
    }
  }, React.createElement('div', null, React.createElement('p', {
    style: {
      margin: '0 0 2px',
      color: 'rgba(255,255,255,0.7)',
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: 'var(--font-sans)'
    }
  }, 'Due for review'), React.createElement('p', {
    style: {
      margin: 0,
      color: '#fff',
      fontWeight: 700,
      fontSize: 'var(--text-lg)',
      fontFamily: 'var(--font-sans)'
    }
  }, `${dueCards.length} flashcards ready`)), React.createElement('button', {
    onClick: () => setMode('flashcard'),
    style: {
      background: '#fff',
      color: 'var(--indigo-700)',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: '10px 20px',
      fontWeight: 700,
      fontSize: 'var(--text-sm)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      whiteSpace: 'nowrap'
    }
  }, 'Start now →')),
  // 2×2 grid
  React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 'var(--space-3)'
    }
  }, React.createElement(ModeCard, {
    icon: '⚡',
    title: 'Active Recall',
    desc: `${cards.length} cards · ${dueCards.length} due today`,
    badge: dueCards.length || null,
    onClick: () => setMode('flashcard')
  }), React.createElement(ModeCard, {
    icon: '🧠',
    title: 'Adaptive Quiz',
    desc: 'Questions targeting your weak topics',
    onClick: () => setMode('quiz')
  }), React.createElement(ModeCard, {
    icon: '📝',
    title: 'Mock Exam',
    desc: 'AI-marked · personalised to your syllabus',
    onClick: () => setMode('exam')
  }), React.createElement(ModeCard, {
    icon: '✨',
    title: 'Generate from Notes',
    desc: 'Paste notes → AI creates flashcards instantly',
    onClick: () => setMode('upload')
  })),
  // Secondary row
  React.createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,1fr)',
      gap: 'var(--space-3)'
    }
  }, ...[{
    icon: '🔴',
    title: 'Mistake Journal',
    sub: `${mistakes.filter(m => m.count > 1).length} recurring patterns`,
    onClick: () => setMode('journal')
  }, {
    icon: '🏆',
    title: 'Achievements',
    sub: `${achs.filter(a => a.unlocked).length}/${achs.length} unlocked`,
    onClick: () => setMode('achievements')
  }, {
    icon: '📊',
    title: 'June Report',
    sub: 'Monthly learning insights',
    onClick: () => setMode('insights')
  }, {
    icon: '👥',
    title: 'Share Progress',
    sub: 'For parents & teachers',
    onClick: () => setMode('share')
  }].map(({
    icon,
    title,
    sub,
    onClick
  }) => React.createElement('button', {
    key: title,
    onClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 16px',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      textAlign: 'left',
      width: '100%'
    }
  }, React.createElement('span', {
    style: {
      fontSize: 22
    }
  }, icon), React.createElement('div', null, React.createElement('p', {
    style: {
      margin: 0,
      fontWeight: 600,
      fontSize: 'var(--text-sm)',
      color: 'var(--text-strong)'
    }
  }, title), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, sub))))));
}
window.StudyHub = StudyHub;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/StudyHub.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/StudySession.jsx
try { (() => {
// AI Exam Coach — Study session screen (timer + SM-2 rating)
function StudySession({
  session,
  onDone,
  onCancel
}) {
  const {
    RatingButtons,
    Button
  } = window.AIExamCoachDesignSystem_99e467;
  const [seconds, setSeconds] = React.useState(0);
  const [showRating, setShowRating] = React.useState(false);
  React.useEffect(() => {
    if (showRating) return;
    const i = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(i);
  }, [showRating]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const s = session;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-read)",
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border-default)",
      borderLeft: `var(--border-accent-width) solid ${s.color}`,
      background: "var(--surface-card)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: s.color,
      fontWeight: "var(--weight-medium)"
    }
  }, s.subject), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, "Review ", s.review)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-6)",
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border-default)",
      background: "var(--surface-card)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-8)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: "var(--text-3xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)"
    }
  }, s.topic), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: "var(--space-8)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-4xl)",
      color: "var(--text-body)"
    }
  }, mm, ":", ss), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: "var(--space-1)",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, "Auto-stops at 60 minutes")), !showRating ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-6)",
      display: "flex",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: () => setShowRating(true)
  }, "I've finished studying this"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: onCancel
  }, "Cancel")) : /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-6)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: "center",
      color: "var(--text-body)",
      marginBottom: "var(--space-3)"
    }
  }, "How well did you know it?"), /*#__PURE__*/React.createElement(RatingButtons, {
    onRate: () => onDone()
  })));
}
window.StudySession = StudySession;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/StudySession.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/SuccessSimulation.jsx
try { (() => {
// AI Exam Coach — Success Simulation modal: scenario A vs B (Phase B)
function SuccessSimulation({
  onClose,
  t
}) {
  const {
    Button,
    Badge
  } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({
    en,
    uk,
    ru,
    fr,
    de
  })[t && t.code || "en"] || en;
  const sims = window.SIMULATIONS;
  const [chosen, setChosen] = React.useState(null);
  React.useEffect(() => {
    const fn = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const probColor = p => p >= 65 ? "var(--emerald-600)" : p >= 45 ? "var(--amber-600)" : "var(--red-500)";
  const probBg = p => p >= 65 ? "var(--emerald-50)" : p >= 45 ? "var(--amber-50)" : "#FFF1F2";
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 60,
      background: "rgba(15,23,42,0.45)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: 600,
      background: "var(--surface-page)",
      borderTopLeftRadius: "var(--radius-2xl)",
      borderTopRightRadius: "var(--radius-2xl)",
      borderTop: "4px solid var(--indigo-500)",
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-5) var(--space-5) var(--space-4)",
      background: "var(--surface-card)",
      borderBottom: "1px solid var(--border-subtle)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 4px",
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)"
    }
  }, "\uD83D\uDD2E ", L("Success Simulation", "Симуляція успіху", "Симуляция успеха", "Simulation de réussite", "Erfolgssimulation")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, L("See how your results change with more study time", "Дивись як змінюються результати зі збільшенням часу", "Посмотри как меняются результаты с ростом времени", "Découvrez comment vos résultats changent avec plus de travail", "Sieh wie sich deine Ergebnisse mit mehr Lernzeit verändern"))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      border: "none",
      background: "var(--surface-muted)",
      width: 36,
      height: 36,
      borderRadius: "var(--radius-full)",
      cursor: "pointer",
      fontSize: 18,
      color: "var(--text-muted)"
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "flex-start",
      padding: "var(--space-3) var(--space-4)",
      borderRadius: "var(--radius-xl)",
      background: "var(--indigo-50)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      lineHeight: 1.5
    }
  }, L("Compare two study scenarios. Pick the one that fits your life — then I'll build the plan around it.", "Порівняй два сценарії навчання. Вибери той, що підходить тобі — і я побудую план навколо нього.", "Сравни два сценария учёбы. Выбери подходящий — и я построю план вокруг него.", "Compare deux scénarios d'étude. Choisis celui qui te convient — je construirai le plan autour.", "Vergleiche zwei Lernszenarien. Wähle das, das zu dir passt — ich baue den Plan drumherum."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-4)"
    }
  }, sims.map((sim, si) => {
    const isChosen = chosen === si;
    return /*#__PURE__*/React.createElement("div", {
      key: si,
      onClick: () => setChosen(si),
      style: {
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-4)",
        border: isChosen ? "2px solid var(--indigo-600)" : "1.5px solid var(--border-default)",
        background: isChosen ? "var(--indigo-50)" : "var(--surface-card)",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        boxShadow: isChosen ? "var(--shadow-sm)" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "var(--space-3)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-lg)",
        fontWeight: "var(--weight-bold)",
        color: isChosen ? "var(--indigo-700)" : "var(--text-strong)"
      }
    }, L("Scenario", "Сценарій", "Сценарий", "Scénario", "Szenario"), " ", sim.label), isChosen && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-xs)",
        color: "var(--indigo-600)",
        fontWeight: "var(--weight-semibold)"
      }
    }, "\u2713 ", L("Selected", "Вибрано", "Выбрано", "Sélectionné", "Ausgewählt"))), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "0 0 var(--space-3)",
        fontSize: "var(--text-2xl)",
        fontWeight: "var(--weight-bold)",
        color: "var(--text-strong)",
        fontFamily: "var(--font-mono)"
      }
    }, sim.hours, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-sans)",
        fontWeight: "var(--weight-normal)",
        marginLeft: 4
      }
    }, L("hrs / week", "год / тиж", "ч / нед", "h / semaine", "Std / Woche"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)"
      }
    }, sim.results.map((r, ri) => /*#__PURE__*/React.createElement("div", {
      key: ri,
      style: {
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-2) var(--space-3)",
        background: probBg(r.prob)
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: r.color,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        flex: 1
      }
    }, r.subject), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-lg)",
        fontWeight: "var(--weight-bold)",
        color: "var(--text-strong)"
      }
    }, r.grade)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 4,
        borderRadius: 999,
        background: "rgba(0,0,0,0.08)",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${r.prob}%`,
        height: "100%",
        background: probColor(r.prob),
        borderRadius: 999,
        transition: "width 0.6s ease"
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-bold)",
        color: probColor(r.prob),
        minWidth: 36,
        textAlign: "right"
      }
    }, r.prob, "%"))))));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--border-subtle)",
      background: "var(--surface-card)",
      padding: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-faint)"
    }
  }, L("The difference", "Різниця", "Разница", "La différence", "Der Unterschied")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, sims[0].results.map((r0, i) => {
    const r1 = sims[1].results[i];
    const diff = r1.prob - r0.prob;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        fontSize: "var(--text-sm)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: r0.color,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        color: "var(--text-body)"
      }
    }, r0.subject), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        color: "var(--text-muted)"
      }
    }, r0.grade, " \u2192 ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: "var(--text-strong)"
      }
    }, r1.grade)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        color: "var(--emerald-600)",
        fontWeight: "var(--weight-semibold)"
      }
    }, "+", diff, "%"));
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "var(--space-3) 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, L("4 extra hours/week changes Chemistry from B → A and gives Biology an A*-level shot.", "4 додаткові години/тиж змінюють хімію з B → A і дають шанс на A* з біології.", "4 дополнительных часа/нед меняют химию с B → A и дают шанс на A* по биологии.", "4 heures de plus par semaine font passer la chimie de B → A et offrent une chance d'A* en biologie.", "4 Stunden mehr pro Woche ändern Chemie von B → A und geben Biologie eine A*-Chance.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4) var(--space-5)",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-card)",
      display: "flex",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    onClick: onClose
  }, L("Cancel", "Скасувати", "Отмена", "Annuler", "Abbrechen")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    disabled: chosen === null,
    onClick: onClose
  }, chosen !== null ? L(`Apply Scenario ${sims[chosen].label} (${sims[chosen].hours}h/week)`, `Застосувати сценарій ${sims[chosen].label} (${sims[chosen].hours}г/тиж)`, `Применить сценарий ${sims[chosen].label} (${sims[chosen].hours}ч/нед)`, `Appliquer Scénario ${sims[chosen].label} (${sims[chosen].hours}h/sem)`, `Szenario ${sims[chosen].label} anwenden (${sims[chosen].hours}Std/Woche)`) : L("Select a scenario", "Виберіть сценарій", "Выберите сценарий", "Choisissez un scénario", "Szenario wählen")))));
}
window.SuccessSimulation = SuccessSimulation;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/SuccessSimulation.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/UploadFlow.jsx
try { (() => {
// AI Exam Coach — Upload & AI Generate Flow
function UploadFlow({
  onBack,
  onGenerated
}) {
  const SAMPLE = `Cellular Respiration releases energy from glucose as ATP.

Glycolysis occurs in the cytoplasm. Glucose (6C) → 2 pyruvate (3C). Net yield: 2 ATP, 2 NADH.

Link reaction: pyruvate → acetyl-CoA in mitochondrial matrix. Produces CO₂ and NADH.

Krebs cycle (mitochondrial matrix): each turn yields 3 NADH, 1 FADH₂, 1 ATP, 2 CO₂. Runs twice per glucose.

Oxidative phosphorylation (inner mitochondrial membrane): NADH and FADH₂ feed the electron transport chain. O₂ is the final electron acceptor. ~32 ATP produced via ATP synthase (chemiosmosis).`;
  const [step, setStep] = React.useState('input');
  const [text, setText] = React.useState('');
  const [cards, setCards] = React.useState([]);
  const [pct, setPct] = React.useState(0);
  const [label, setLabel] = React.useState('');
  const [err, setErr] = React.useState(null);
  const generate = async () => {
    if (!text.trim()) return;
    setStep('generating');
    setPct(0);
    setErr(null);
    const steps = [[15, 'Reading your notes…'], [40, 'Identifying key concepts…'], [65, 'Generating flashcards…'], [85, 'Reviewing accuracy…']];
    for (const [p, l] of steps) {
      await new Promise(r => setTimeout(r, 420));
      setPct(p);
      setLabel(l);
    }
    try {
      const prompt = `You are an expert exam prep tutor. Create exactly 6 high-quality flashcards from these study notes. Return ONLY a valid JSON array, no other text: [{"front":"concise question","back":"concise answer (max 2 sentences)","topic":"topic name"}]. Notes:\n\n${text.slice(0, 1400)}`;
      const res = await window.claude.complete(prompt);
      const clean = res.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(clean);
      const nc = parsed.map((c, i) => ({
        id: 'gen_' + Date.now() + '_' + i,
        front: c.front,
        back: c.back,
        subject: 'Generated',
        topic: c.topic || 'Notes',
        ease: 2.5,
        dueNow: true
      }));
      setPct(100);
      setLabel('Done!');
      await new Promise(r => setTimeout(r, 300));
      setCards(nc);
      setStep('preview');
    } catch (e) {
      setErr('Could not parse AI response — please try again.');
      setStep('input');
    }
  };
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: '12px 16px',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    color: 'var(--text-body)',
    background: 'var(--surface-page)',
    outline: 'none',
    lineHeight: 1.6
  };
  if (step === 'generating') return React.createElement('div', {
    style: {
      textAlign: 'center',
      padding: '80px 24px'
    }
  }, React.createElement('div', {
    style: {
      fontSize: 52,
      marginBottom: 16
    }
  }, '🧠'), React.createElement('h2', {
    style: {
      margin: '0 0 8px',
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)',
      fontFamily: 'var(--font-sans)'
    }
  }, 'AI is reading your notes…'), React.createElement('p', {
    style: {
      margin: '0 0 24px',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)'
    }
  }, label), React.createElement('div', {
    style: {
      background: 'var(--surface-muted)',
      borderRadius: 999,
      height: 8,
      overflow: 'hidden',
      maxWidth: 300,
      margin: '0 auto 10px'
    }
  }, React.createElement('div', {
    style: {
      height: '100%',
      width: pct + '%',
      background: 'var(--indigo-600)',
      borderRadius: 999,
      transition: 'width 0.45s ease'
    }
  })), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-faint)',
      fontFamily: 'var(--font-sans)'
    }
  }, pct + '%'));
  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      fontFamily: 'var(--font-sans)'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, React.createElement('button', {
    onClick: onBack,
    style: {
      border: '1px solid var(--border-default)',
      background: 'transparent',
      borderRadius: 'var(--radius-lg)',
      padding: '6px 12px',
      fontSize: 'var(--text-sm)',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)'
    }
  }, '← Back'), React.createElement('div', null, React.createElement('h1', {
    style: {
      margin: 0,
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--text-strong)'
    }
  }, 'Generate from Notes'), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, 'AI creates flashcards from your study materials'))), step === 'input' && React.createElement(React.Fragment, null, React.createElement('div', {
    onClick: () => setText(SAMPLE),
    style: {
      borderRadius: 'var(--radius-xl)',
      border: '2px dashed var(--border-default)',
      padding: '24px',
      textAlign: 'center',
      cursor: 'pointer',
      background: 'var(--surface-page)'
    }
  }, React.createElement('div', {
    style: {
      fontSize: 32,
      marginBottom: 8
    }
  }, '📎'), React.createElement('p', {
    style: {
      margin: '0 0 4px',
      fontWeight: 600,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)'
    }
  }, 'Click to load sample Biology notes'), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, 'In production: PDF · DOCX · Image · Paste')), React.createElement('div', null, React.createElement('p', {
    style: {
      margin: '0 0 8px',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--text-body)'
    }
  }, 'Or paste your notes:'), React.createElement('textarea', {
    value: text,
    onChange: e => setText(e.target.value),
    rows: 7,
    placeholder: 'Paste study notes, lecture slides or textbook content…',
    style: {
      ...inputStyle,
      resize: 'vertical'
    }
  })), err && React.createElement('p', {
    style: {
      margin: 0,
      color: 'var(--red-500)',
      fontSize: 'var(--text-sm)'
    }
  }, err), React.createElement('button', {
    onClick: generate,
    disabled: !text.trim(),
    style: {
      background: text.trim() ? 'var(--indigo-600)' : 'var(--slate-200)',
      color: text.trim() ? '#fff' : 'var(--text-faint)',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 24px',
      fontWeight: 700,
      fontSize: 'var(--text-base)',
      cursor: text.trim() ? 'pointer' : 'default',
      fontFamily: 'var(--font-sans)',
      transition: 'background 0.15s'
    }
  }, '✨ Generate Flashcards with AI')), step === 'preview' && React.createElement(React.Fragment, null, React.createElement('div', {
    style: {
      background: 'var(--indigo-50)',
      border: '1px solid var(--indigo-100)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, React.createElement('span', {
    style: {
      color: 'var(--indigo-600)',
      fontWeight: 700,
      fontSize: 18
    }
  }, '✓'), React.createElement('div', null, React.createElement('p', {
    style: {
      margin: '0 0 1px',
      fontWeight: 700,
      color: 'var(--indigo-700)',
      fontSize: 'var(--text-sm)'
    }
  }, cards.length + ' flashcards generated'), React.createElement('p', {
    style: {
      margin: 0,
      fontSize: 11,
      color: 'var(--indigo-500)'
    }
  }, 'Review below, then start studying'))), React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, ...cards.map((c, i) => React.createElement('div', {
    key: i,
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 16px'
    }
  }, React.createElement('p', {
    style: {
      margin: '0 0 6px',
      fontWeight: 600,
      color: 'var(--text-strong)',
      fontSize: 'var(--text-sm)'
    }
  }, c.front), React.createElement('p', {
    style: {
      margin: '0 0 8px',
      color: 'var(--text-muted)',
      fontSize: 'var(--text-sm)',
      lineHeight: 1.5
    }
  }, c.back), React.createElement('span', {
    style: {
      background: 'var(--indigo-50)',
      color: 'var(--indigo-600)',
      borderRadius: 999,
      padding: '2px 8px',
      fontSize: 10,
      fontWeight: 600
    }
  }, c.topic)))), React.createElement('button', {
    onClick: () => onGenerated(cards),
    style: {
      background: 'var(--indigo-600)',
      color: '#fff',
      border: 'none',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 24px',
      fontWeight: 700,
      fontSize: 'var(--text-base)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, 'Start studying these ' + cards.length + ' cards →')));
}
window.UploadFlow = UploadFlow;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/UploadFlow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/WeeklyReview.jsx
try { (() => {
// AI Exam Coach — Weekly Review modal (Phase B)
function WeeklyReview({
  onClose,
  t
}) {
  const {
    Button,
    Badge
  } = window.AIExamCoachDesignSystem_99e467;
  const L = (en, uk, ru, fr, de) => ({
    en,
    uk,
    ru,
    fr,
    de
  })[t && t.code || "en"] || en;
  const r = window.WEEKLY_REVIEW;
  React.useEffect(() => {
    const fn = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const eyebrow = {
    margin: "0 0 var(--space-3)",
    fontSize: "var(--text-xs)",
    fontWeight: "var(--weight-semibold)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-wide)",
    color: "var(--text-faint)"
  };
  const card = {
    borderRadius: "var(--radius-xl)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-card)",
    padding: "var(--space-4)"
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 60,
      background: "rgba(15,23,42,0.45)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: 560,
      background: "var(--surface-page)",
      borderTopLeftRadius: "var(--radius-2xl)",
      borderTopRightRadius: "var(--radius-2xl)",
      borderTop: "4px solid var(--indigo-500)",
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-5) var(--space-5) var(--space-4)",
      background: "var(--surface-card)",
      borderBottom: "1px solid var(--border-subtle)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 4px",
      fontSize: "var(--text-xl)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)"
    }
  }, "\uD83D\uDCCA ", L("Weekly Review", "Тижневий огляд", "Недельный обзор", "Bilan de la semaine", "Wöchentliche Auswertung")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, r.weekLabel)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      border: "none",
      background: "var(--surface-muted)",
      width: 36,
      height: 36,
      borderRadius: "var(--radius-full)",
      cursor: "pointer",
      fontSize: 18,
      color: "var(--text-muted)"
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "var(--space-5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "var(--space-3)"
    }
  }, [{
    label: L("Completed", "Виконано", "Выполнено", "Complétées", "Abgeschlossen"),
    value: r.completed,
    tone: "easy",
    suffix: ""
  }, {
    label: L("Missed", "Пропущено", "Пропущено", "Manquées", "Verpasst"),
    value: r.missed,
    tone: "hard",
    suffix: ""
  }, {
    label: L("Confidence", "Впевненість", "Уверенность", "Confiance", "Sicherheit"),
    value: `+${r.confidenceChange}%`,
    tone: "easy",
    suffix: ""
  }].map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      ...card,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 4px",
      fontSize: "var(--text-2xl)",
      fontWeight: "var(--weight-bold)",
      color: s.tone === "easy" ? "var(--emerald-600)" : "var(--red-500)"
    }
  }, s.value, s.suffix), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, s.label)))), /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("p", {
    style: eyebrow
  }, L("Grade probability changes", "Зміни ймовірності оцінок", "Изменения вероятности оценок", "Évolution des probabilités", "Wahrscheinlichkeitsänderungen")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, r.probChanges.map((c, i) => {
    const diff = c.to - c.from;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: c.color,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        color: "var(--text-body)"
      }
    }, c.subject), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)"
      }
    }, c.from, "%"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-faint)"
      }
    }, "\u2192"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-bold)",
        color: "var(--indigo-600)"
      }
    }, c.to, "%"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        color: diff > 0 ? "var(--emerald-600)" : "var(--red-500)",
        fontWeight: "var(--weight-semibold)",
        minWidth: 40,
        textAlign: "right"
      }
    }, diff > 0 ? "+" : "", diff, "%"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("p", {
    style: eyebrow
  }, "\uD83D\uDD04 ", L("Adapted plan for next week", "Оновлений план на тиждень", "Обновлённый план на неделю", "Plan ajusté pour la semaine", "Angepasster Plan für nächste Woche")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-3)",
      marginBottom: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      fontWeight: "var(--weight-semibold)"
    }
  }, L("Original", "Початковий", "Исходный", "Original", "Original")), r.adaptedPlan.original.map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, row.subject), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, row.sessions, "\xD7")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 var(--space-2)",
      fontSize: "var(--text-xs)",
      color: "var(--indigo-600)",
      fontWeight: "var(--weight-semibold)"
    }
  }, L("Recalculated", "Перерахований", "Пересчитанный", "Recalculé", "Neu berechnet")), r.adaptedPlan.recalculated.map((row, i) => {
    const orig = r.adaptedPlan.original[i];
    const changed = orig && row.sessions !== orig.sessions;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "var(--text-sm)",
        fontWeight: changed ? "var(--weight-semibold)" : "var(--weight-normal)",
        color: changed ? "var(--indigo-700)" : "var(--text-muted)",
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", null, row.subject, changed ? " ⚠️" : ""), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)"
      }
    }, row.sessions, "\xD7"));
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      color: "var(--amber-700)",
      background: "var(--amber-50)",
      border: "1px solid var(--amber-100)",
      borderRadius: "var(--radius-lg)",
      padding: "var(--space-2) var(--space-3)"
    }
  }, r.adaptedPlan.reason)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "flex-start",
      padding: "var(--space-3) var(--space-4)",
      borderRadius: "var(--radius-xl)",
      background: "var(--indigo-50)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      lineHeight: 1.5
    }
  }, r.recommendation))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4) var(--space-5)",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--surface-card)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    onClick: onClose
  }, L("Accept plan", "Прийняти план", "Принять план", "Accepter le plan", "Plan annehmen")))));
}
window.WeeklyReview = WeeklyReview;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/WeeklyReview.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/data.jsx
try { (() => {
// AI Exam Coach — shared mock data for the UI kit
const COURSES = [{
  id: "bio",
  name: "A-Level Biology",
  subject: "Biology",
  examBoard: "AQA",
  examTypeId: "alevel",
  color: "var(--subject-indigo)",
  daysAway: 23,
  readinessPct: 62,
  confidencePct: 60,
  targetGrade: "A",
  predictedGrade: "B",
  gradeProbability: 62,
  riskLevel: "medium",
  paceStatus: "slightly_behind",
  todayCount: 2,
  recommendedSessions: 3,
  topicCount: 18,
  weakTopics: ["Cellular respiration", "Genetics & inheritance", "Protein synthesis"],
  forecastOnTrack: "A",
  forecastMissed: "B",
  remainingWork: {
    sessions: 8,
    papers: 3,
    hours: 22
  }
}, {
  id: "chem",
  name: "A-Level Chemistry",
  subject: "Chemistry",
  examBoard: "AQA",
  examTypeId: "alevel",
  color: "var(--subject-rose)",
  daysAway: 28,
  readinessPct: 38,
  confidencePct: 35,
  targetGrade: "A",
  predictedGrade: "C",
  gradeProbability: 31,
  riskLevel: "high",
  paceStatus: "very_behind",
  todayCount: 1,
  recommendedSessions: 5,
  topicCount: 12,
  weakTopics: ["Organic chemistry", "Reaction rates & equilibria", "Electrochemistry", "Thermodynamics"],
  forecastOnTrack: "B",
  forecastMissed: "C",
  remainingWork: {
    sessions: 14,
    papers: 5,
    hours: 36
  }
}, {
  id: "hist",
  name: "A-Level History",
  subject: "History",
  examBoard: "AQA",
  examTypeId: "alevel",
  color: "var(--subject-teal)",
  daysAway: 41,
  readinessPct: 84,
  confidencePct: 80,
  targetGrade: "A*",
  predictedGrade: "A",
  gradeProbability: 78,
  riskLevel: "low",
  paceStatus: "on_track",
  todayCount: 0,
  recommendedSessions: 2,
  topicCount: 9,
  weakTopics: ["Cold War origins"],
  forecastOnTrack: "A*",
  forecastMissed: "A",
  remainingWork: {
    sessions: 4,
    papers: 2,
    hours: 10
  }
}];
const TODAY_SESSIONS = [{
  id: "s1",
  subject: "A-Level Biology",
  color: "var(--subject-indigo)",
  topic: "Cellular respiration",
  difficulty: 3,
  review: 2,
  est: 45,
  retention: 41,
  confidenceTrend: "decreasing",
  examRelevance: "high",
  lastReviewed: "8 days ago",
  expectedOutcome: "Biology readiness 62% → 64%"
}, {
  id: "s2",
  subject: "A-Level Chemistry",
  color: "var(--subject-rose)",
  topic: "Reaction rates & equilibria",
  difficulty: 2,
  review: 1,
  est: 45,
  retention: 55,
  confidenceTrend: "stable",
  examRelevance: "high",
  lastReviewed: "4 days ago",
  expectedOutcome: "Chemistry readiness 38% → 41%"
}, {
  id: "s3",
  subject: "A-Level Biology",
  color: "var(--subject-indigo)",
  topic: "DNA replication",
  difficulty: 1,
  review: 4,
  est: 30,
  retention: 72,
  confidenceTrend: "increasing",
  examRelevance: "medium",
  lastReviewed: "3 days ago",
  expectedOutcome: "Reinforce Biology retention"
}];
const WEEK = [{
  label: "Mon",
  date: 9,
  scheduled: 3,
  completed: 3,
  sessions: [{
    subject: "Biology",
    topic: "Photosynthesis",
    color: "var(--subject-indigo)",
    done: true,
    duration: 45
  }, {
    subject: "Chemistry",
    topic: "Atomic structure",
    color: "var(--subject-rose)",
    done: true,
    duration: 45
  }, {
    subject: "History",
    topic: "WW1 causes",
    color: "var(--subject-teal)",
    done: true,
    duration: 30
  }]
}, {
  label: "Tue",
  date: 10,
  scheduled: 2,
  completed: 2,
  sessions: [{
    subject: "Biology",
    topic: "Cell division",
    color: "var(--subject-indigo)",
    done: true,
    duration: 45
  }, {
    subject: "Chemistry",
    topic: "Bonding & structure",
    color: "var(--subject-rose)",
    done: true,
    duration: 45
  }]
}, {
  label: "Wed",
  date: 11,
  scheduled: 3,
  completed: 1,
  today: true,
  sessions: [{
    subject: "Biology",
    topic: "Cellular respiration",
    color: "var(--subject-indigo)",
    done: true,
    duration: 45
  }, {
    subject: "Chemistry",
    topic: "Reaction rates & equilibria",
    color: "var(--subject-rose)",
    done: false,
    duration: 45
  }, {
    subject: "Biology",
    topic: "DNA replication",
    color: "var(--subject-indigo)",
    done: false,
    duration: 30
  }]
}, {
  label: "Thu",
  date: 12,
  scheduled: 2,
  completed: 0,
  sessions: [{
    subject: "Chemistry",
    topic: "Organic chemistry",
    color: "var(--subject-rose)",
    done: false,
    duration: 60
  }, {
    subject: "History",
    topic: "Cold War origins",
    color: "var(--subject-teal)",
    done: false,
    duration: 45
  }]
}, {
  label: "Fri",
  date: 13,
  scheduled: 2,
  completed: 0,
  sessions: [{
    subject: "Biology",
    topic: "Genetics & inheritance",
    color: "var(--subject-indigo)",
    done: false,
    duration: 45
  }, {
    subject: "Chemistry",
    topic: "Electrochemistry",
    color: "var(--subject-rose)",
    done: false,
    duration: 45
  }]
}, {
  label: "Sat",
  date: 14,
  scheduled: 0,
  completed: 0,
  sessions: []
}, {
  label: "Sun",
  date: 15,
  scheduled: 2,
  completed: 0,
  sessions: [{
    subject: "Biology",
    topic: "Protein synthesis",
    color: "var(--subject-indigo)",
    done: false,
    duration: 45
  }, {
    subject: "History",
    topic: "Korean War",
    color: "var(--subject-teal)",
    done: false,
    duration: 30
  }]
}];
const MASTERY = [{
  topic: "Cellular respiration",
  subject: "Biology",
  last: "2 days ago",
  ease: 1.9,
  next: "Tomorrow",
  tone: "hard"
}, {
  topic: "DNA replication",
  subject: "Biology",
  last: "Yesterday",
  ease: 2.6,
  next: "In 7 days",
  tone: "easy"
}, {
  topic: "Reaction rates",
  subject: "Chemistry",
  last: "3 days ago",
  ease: 2.1,
  next: "Today",
  tone: "medium"
}, {
  topic: "Cold War origins",
  subject: "History",
  last: "Today",
  ease: 2.9,
  next: "In 14 days",
  tone: "easy"
}];
const WEAKNESS_ALERTS = [{
  id: "w1",
  subject: "Chemistry",
  topic: "Organic Chemistry",
  color: "var(--subject-rose)",
  reasons: ["4 incorrect answers in a row", "Last reviewed 12 days ago", "Exam in 18 days"],
  priority: "high",
  reviewWithin: "48 hours",
  sessionRef: {
    id: "w-s1",
    subject: "A-Level Chemistry",
    color: "var(--subject-rose)",
    topic: "Organic chemistry",
    difficulty: 3,
    review: 1,
    est: 60
  }
}];
const WEEKLY_REVIEW = {
  weekLabel: "June 16–22",
  completed: 14,
  missed: 3,
  totalHours: 10.5,
  confidenceChange: +8,
  probChanges: [{
    subject: "Biology",
    color: "var(--subject-indigo)",
    from: 54,
    to: 62
  }, {
    subject: "Chemistry",
    color: "var(--subject-rose)",
    from: 24,
    to: 31
  }, {
    subject: "History",
    color: "var(--subject-teal)",
    from: 76,
    to: 78
  }],
  adaptedPlan: {
    original: [{
      subject: "Biology",
      sessions: 3
    }, {
      subject: "Chemistry",
      sessions: 4
    }, {
      subject: "History",
      sessions: 2
    }],
    recalculated: [{
      subject: "Biology",
      sessions: 2
    }, {
      subject: "Chemistry",
      sessions: 6
    }, {
      subject: "History",
      sessions: 2
    }],
    reason: "Chemistry risk increased significantly — needs 2 extra sessions."
  },
  recommendation: "Prioritise Organic Chemistry and Electrochemistry. Aim for 6 Chemistry sessions next week."
};
const SIMULATIONS = [{
  label: "A",
  hours: 8,
  results: [{
    subject: "Biology",
    color: "var(--subject-indigo)",
    grade: "A",
    prob: 62
  }, {
    subject: "Chemistry",
    color: "var(--subject-rose)",
    grade: "B",
    prob: 48
  }, {
    subject: "History",
    color: "var(--subject-teal)",
    grade: "A",
    prob: 84
  }]
}, {
  label: "B",
  hours: 12,
  results: [{
    subject: "Biology",
    color: "var(--subject-indigo)",
    grade: "A*",
    prob: 81
  }, {
    subject: "Chemistry",
    color: "var(--subject-rose)",
    grade: "A",
    prob: 67
  }, {
    subject: "History",
    color: "var(--subject-teal)",
    grade: "A",
    prob: 91
  }]
}];
Object.assign(window, {
  COURSES,
  TODAY_SESSIONS,
  WEEK,
  MASTERY,
  WEAKNESS_ALERTS,
  WEEKLY_REVIEW,
  SIMULATIONS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/i18n.jsx
try { (() => {
// AI Exam Coach — i18n strings (EN + UK subset for the UI kit)
const LANGS = {
  en: {
    code: "en",
    flag: "🇬🇧",
    label: "English",
    nav_dashboard: "Dashboard",
    nav_chat: "AI Coach",
    nav_schedule: "Schedule",
    nav_exams: "Exams",
    nav_progress: "Progress",
    nav_settings: "Settings",
    nav_logout: "Log out",
    dash_today: "Today",
    dash_this_week: "This week",
    dash_all_done: "All done for today. Great work! 🎉",
    dash_upcoming_exams: "Your exam coach",
    exams_title: "Your exams",
    exams_add: "+ Add exam",
    exams_upcoming: "Upcoming",
    exams_past: "Past exams",
    exams_days_away: "d away",
    exams_past_label: "Past",
    exams_topics: "topics",
    schedule_title: "Schedule",
    schedule_pick_day: "Pick a day",
    schedule_no_sessions: "No sessions scheduled.",
    schedule_completed: "Completed",
    schedule_pending: "Pending",
    schedule_exam_today: "exam today",
    progress_title: "Progress",
    progress_streak: "Study streak",
    progress_streak_days: "days in a row",
    progress_this_week: "This week",
    progress_confidence: "Per-subject confidence",
    progress_mastery: "Topic mastery",
    progress_topic: "Topic",
    progress_subject: "Subject",
    progress_last_studied: "Last studied",
    progress_ease: "Ease",
    progress_next_review: "Next review",
    progress_no_topics: "No topics yet.",
    settings_title: "Settings",
    settings_save: "Save settings",
    settings_saved: "Saved.",
    settings_language: "Language",
    settings_timezone: "Timezone",
    study_how_well: "How well did you know it?",
    study_finished: "I've finished studying this",
    rating_blackout: "Blackout",
    rating_blackout_sub: "Had no idea",
    rating_hard: "Hard",
    rating_hard_sub: "Remembered with difficulty",
    rating_good: "Good",
    rating_good_sub: "Remembered with some effort",
    rating_easy: "Easy",
    rating_easy_sub: "Knew it perfectly",
    onboard_step1: "What are you studying for?",
    onboard_step1_sub: "Your coach will build a personalised plan around your exam.",
    onboard_course: "Course name",
    onboard_course_ph: "e.g. Biology, Linear Algebra, History",
    onboard_system: "Exam system / board",
    onboard_system_hint: "Type your country's system or leave blank for custom",
    onboard_step2: "When is your exam?",
    onboard_step2_sub: "Your coach counts backwards from this date to build your plan.",
    onboard_date: "Exam date",
    onboard_daily: "Daily study time",
    onboard_weekends: "Include weekends in my study plan",
    onboard_step3: "How confident do you feel right now?",
    onboard_step3_sub: "Be honest — your coach needs this to size your plan correctly.",
    onboard_step4: "What grade are you aiming for?",
    onboard_step4_sub: "Your coach will calibrate depth and workload to hit this target.",
    onboard_step5: "Do you have a syllabus?",
    onboard_step5_sub: "Paste it below and your coach will extract topics. Or skip.",
    onboard_continue: "Continue",
    onboard_back: "Back",
    onboard_build: "Build my study plan →",
    onboard_colour: "Colour",
    streak_keep: "Keep it going — study at least one session today.",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun"
  },
  uk: {
    code: "uk",
    flag: "🇺🇦",
    label: "Українська",
    nav_dashboard: "Головна",
    nav_chat: "AI Коуч",
    nav_schedule: "Розклад",
    nav_exams: "Іспити",
    nav_progress: "Прогрес",
    nav_settings: "Налаштування",
    nav_logout: "Вийти",
    dash_today: "Сьогодні",
    dash_this_week: "Цього тижня",
    dash_all_done: "Все зроблено на сьогодні. Чудова робота! 🎉",
    dash_upcoming_exams: "Ваш навчальний коуч",
    exams_title: "Ваші іспити",
    exams_add: "+ Додати іспит",
    exams_upcoming: "Майбутні",
    exams_past: "Минулі іспити",
    exams_days_away: "дн",
    exams_past_label: "Минув",
    exams_topics: "тем",
    schedule_title: "Розклад",
    schedule_pick_day: "Оберіть день",
    schedule_no_sessions: "Немає запланованих сесій.",
    schedule_completed: "Завершено",
    schedule_pending: "Заплановано",
    schedule_exam_today: "іспит сьогодні",
    progress_title: "Прогрес",
    progress_streak: "Серія навчання",
    progress_streak_days: "днів поспіль",
    progress_this_week: "Цього тижня",
    progress_confidence: "Впевненість по предметах",
    progress_mastery: "Засвоєння тем",
    progress_topic: "Тема",
    progress_subject: "Предмет",
    progress_last_studied: "Останнє вивчення",
    progress_ease: "Легкість",
    progress_next_review: "Наступне повторення",
    progress_no_topics: "Тем поки немає.",
    settings_title: "Налаштування",
    settings_save: "Зберегти",
    settings_saved: "Збережено.",
    settings_language: "Мова",
    settings_timezone: "Часовий пояс",
    study_how_well: "Наскільки добре ви це знали?",
    study_finished: "Я закінчив вивчення",
    rating_blackout: "Не знав",
    rating_blackout_sub: "Взагалі не пам'ятав",
    rating_hard: "Складно",
    rating_hard_sub: "Згадав з труднощами",
    rating_good: "Добре",
    rating_good_sub: "Згадав з деяким зусиллям",
    rating_easy: "Легко",
    rating_easy_sub: "Знав ідеально",
    onboard_step1: "До якого іспиту ви готуєтеся?",
    onboard_step1_sub: "Ваш коуч побудує персональний план навколо вашого іспиту.",
    onboard_course: "Назва курсу",
    onboard_course_ph: "напр. Біологія, Алгебра, Історія",
    onboard_system: "Система / рада іспитів",
    onboard_system_hint: "Введіть систему вашої країни або залиште пустим для власного",
    onboard_step2: "Коли ваш іспит?",
    onboard_step2_sub: "Ваш коуч рахує назад від цієї дати, щоб побудувати план.",
    onboard_date: "Дата іспиту",
    onboard_daily: "Час навчання на день",
    onboard_weekends: "Включити вихідні в мій план навчання",
    onboard_step3: "Наскільки впевнено ви почуваєтеся зараз?",
    onboard_step3_sub: "Будьте чесними — вашому коучу потрібно це, щоб правильно оцінити план.",
    onboard_step4: "На яку оцінку ви розраховуєте?",
    onboard_step4_sub: "Коуч налаштує глибину та навантаження для досягнення цієї мети.",
    onboard_step5: "Чи є у вас навчальна програма?",
    onboard_step5_sub: "Вставте її нижче, і ваш коуч витягне теми. Або пропустіть.",
    onboard_continue: "Продовжити",
    onboard_back: "Назад",
    onboard_build: "Побудувати план навчання →",
    onboard_colour: "Колір",
    streak_keep: "Продовжуйте — пройдіть хоча б одну сесію сьогодні.",
    mon: "Пн",
    tue: "Вт",
    wed: "Ср",
    thu: "Чт",
    fri: "Пт",
    sat: "Сб",
    sun: "Нд"
  },
  fr: {
    code: "fr",
    flag: "🇫🇷",
    label: "Français",
    nav_dashboard: "Tableau de bord",
    nav_chat: "Coach IA",
    nav_schedule: "Planning",
    nav_exams: "Examens",
    nav_progress: "Progrès",
    nav_settings: "Paramètres",
    nav_logout: "Déconnexion",
    dash_today: "Aujourd'hui",
    dash_this_week: "Cette semaine",
    dash_all_done: "Tout est fait pour aujourd'hui. Bravo ! 🎉",
    dash_upcoming_exams: "Votre coach d'examen",
    exams_title: "Vos examens",
    exams_add: "+ Ajouter un examen",
    exams_upcoming: "À venir",
    exams_past: "Examens passés",
    exams_days_away: "j restants",
    exams_past_label: "Passé",
    exams_topics: "sujets",
    schedule_title: "Planning",
    schedule_pick_day: "Choisir un jour",
    schedule_no_sessions: "Aucune session planifiée.",
    schedule_completed: "Terminé",
    schedule_pending: "En attente",
    schedule_exam_today: "examen aujourd'hui",
    progress_title: "Progrès",
    progress_streak: "Série d'étude",
    progress_streak_days: "jours consécutifs",
    progress_this_week: "Cette semaine",
    progress_confidence: "Confiance par matière",
    progress_mastery: "Maîtrise des sujets",
    progress_topic: "Sujet",
    progress_subject: "Matière",
    progress_last_studied: "Dernière étude",
    progress_ease: "Facilité",
    progress_next_review: "Prochaine révision",
    progress_no_topics: "Aucun sujet encore.",
    settings_title: "Paramètres",
    settings_save: "Enregistrer",
    settings_saved: "Enregistré.",
    settings_language: "Langue",
    settings_timezone: "Fuseau horaire",
    study_how_well: "À quel point connaissiez-vous cela ?",
    study_finished: "J'ai fini d'étudier ceci",
    rating_blackout: "Blanc total",
    rating_blackout_sub: "Aucune idée",
    rating_hard: "Difficile",
    rating_hard_sub: "Souvenu avec difficulté",
    rating_good: "Bien",
    rating_good_sub: "Souvenu avec effort",
    rating_easy: "Facile",
    rating_easy_sub: "Connu parfaitement",
    onboard_step1: "Pour quel examen vous préparez-vous ?",
    onboard_step1_sub: "Votre coach créera un plan personnalisé autour de votre examen.",
    onboard_course: "Nom du cours",
    onboard_course_ph: "ex. Biologie, Algèbre, Histoire",
    onboard_system: "Système d'examen",
    onboard_system_hint: "Entrez le système de votre pays ou laissez vide",
    onboard_step2: "Quand est votre examen ?",
    onboard_step2_sub: "Votre coach compte à rebours depuis cette date.",
    onboard_date: "Date de l'examen",
    onboard_daily: "Temps d'étude quotidien",
    onboard_weekends: "Inclure les week-ends dans mon plan",
    onboard_step3: "Quel est votre niveau de confiance ?",
    onboard_step3_sub: "Soyez honnête — votre coach en a besoin pour calibrer le plan.",
    onboard_step4: "Quelle note visez-vous ?",
    onboard_step4_sub: "Votre coach calibrera la profondeur et la charge de travail.",
    onboard_step5: "Avez-vous un programme ?",
    onboard_step5_sub: "Collez-le ci-dessous et votre coach en extraira les sujets.",
    onboard_continue: "Continuer",
    onboard_back: "Retour",
    onboard_build: "Créer mon plan →",
    onboard_colour: "Couleur",
    streak_keep: "Continuez — étudiez au moins une session aujourd'hui.",
    mon: "Lun",
    tue: "Mar",
    wed: "Mer",
    thu: "Jeu",
    fri: "Ven",
    sat: "Sam",
    sun: "Dim"
  },
  de: {
    code: "de",
    flag: "🇩🇪",
    label: "Deutsch",
    nav_dashboard: "Dashboard",
    nav_chat: "KI-Coach",
    nav_schedule: "Zeitplan",
    nav_exams: "Prüfungen",
    nav_progress: "Fortschritt",
    nav_settings: "Einstellungen",
    nav_logout: "Abmelden",
    dash_today: "Heute",
    dash_this_week: "Diese Woche",
    dash_all_done: "Für heute alles erledigt. Großartige Arbeit! 🎉",
    dash_upcoming_exams: "Dein Prüfungscoach",
    exams_title: "Deine Prüfungen",
    exams_add: "+ Prüfung hinzufügen",
    exams_upcoming: "Bevorstehend",
    exams_past: "Vergangene Prüfungen",
    exams_days_away: "T verbleibend",
    exams_past_label: "Vergangen",
    exams_topics: "Themen",
    schedule_title: "Zeitplan",
    schedule_pick_day: "Tag auswählen",
    schedule_no_sessions: "Keine geplanten Sitzungen.",
    schedule_completed: "Abgeschlossen",
    schedule_pending: "Ausstehend",
    schedule_exam_today: "Prüfung heute",
    progress_title: "Fortschritt",
    progress_streak: "Lernserie",
    progress_streak_days: "Tage in Folge",
    progress_this_week: "Diese Woche",
    progress_confidence: "Vertrauen pro Fach",
    progress_mastery: "Themenkompetenz",
    progress_topic: "Thema",
    progress_subject: "Fach",
    progress_last_studied: "Zuletzt gelernt",
    progress_ease: "Leichtigkeit",
    progress_next_review: "Nächste Wiederholung",
    progress_no_topics: "Noch keine Themen.",
    settings_title: "Einstellungen",
    settings_save: "Speichern",
    settings_saved: "Gespeichert.",
    settings_language: "Sprache",
    settings_timezone: "Zeitzone",
    study_how_well: "Wie gut wusstest du das?",
    study_finished: "Ich habe dieses Thema durchgearbeitet",
    rating_blackout: "Blackout",
    rating_blackout_sub: "Keine Ahnung gehabt",
    rating_hard: "Schwer",
    rating_hard_sub: "Mit Mühe erinnert",
    rating_good: "Gut",
    rating_good_sub: "Mit etwas Anstrengung erinnert",
    rating_easy: "Einfach",
    rating_easy_sub: "Perfekt gewusst",
    onboard_step1: "Für welche Prüfung bereitest du dich vor?",
    onboard_step1_sub: "Dein Coach erstellt einen personalisierten Plan für deine Prüfung.",
    onboard_course: "Kursname",
    onboard_course_ph: "z.B. Biologie, Algebra, Geschichte",
    onboard_system: "Prüfungssystem",
    onboard_system_hint: "Gib das System deines Landes ein oder lass es leer",
    onboard_step2: "Wann ist deine Prüfung?",
    onboard_step2_sub: "Dein Coach zählt rückwärts von diesem Datum.",
    onboard_date: "Prüfungsdatum",
    onboard_daily: "Tägliche Lernzeit",
    onboard_weekends: "Wochenenden in meinen Plan einbeziehen",
    onboard_step3: "Wie sicher fühlst du dich gerade?",
    onboard_step3_sub: "Sei ehrlich — dein Coach braucht das zur Planung.",
    onboard_step4: "Welche Note strebst du an?",
    onboard_step4_sub: "Dein Coach kalibriert Tiefe und Arbeitsbelastung dafür.",
    onboard_step5: "Hast du einen Lehrplan?",
    onboard_step5_sub: "Füge ihn unten ein und dein Coach extrahiert Themen.",
    onboard_continue: "Weiter",
    onboard_back: "Zurück",
    onboard_build: "Meinen Lernplan erstellen →",
    onboard_colour: "Farbe",
    streak_keep: "Weiter so — lerne heute mindestens eine Sitzung.",
    mon: "Mo",
    tue: "Di",
    wed: "Mi",
    thu: "Do",
    fri: "Fr",
    sat: "Sa",
    sun: "So"
  },
  ru: {
    code: "ru",
    flag: "🇷🇺",
    label: "Русский",
    nav_dashboard: "Главная",
    nav_chat: "AI Коуч",
    nav_schedule: "Расписание",
    nav_exams: "Экзамены",
    nav_progress: "Прогресс",
    nav_settings: "Настройки",
    nav_logout: "Выйти",
    dash_today: "Сегодня",
    dash_this_week: "На этой неделе",
    dash_all_done: "На сегодня всё готово. Отличная работа! 🎉",
    dash_upcoming_exams: "Ваш экзаменационный коуч",
    exams_title: "Ваши экзамены",
    exams_add: "+ Добавить экзамен",
    exams_upcoming: "Предстоящие",
    exams_past: "Прошедшие экзамены",
    exams_days_away: "дн",
    exams_past_label: "Прошёл",
    exams_topics: "тем",
    schedule_title: "Расписание",
    schedule_pick_day: "Выберите день",
    schedule_no_sessions: "Нет запланированных сессий.",
    schedule_completed: "Завершено",
    schedule_pending: "Ожидает",
    schedule_exam_today: "экзамен сегодня",
    progress_title: "Прогресс",
    progress_streak: "Серия занятий",
    progress_streak_days: "дней подряд",
    progress_this_week: "На этой неделе",
    progress_confidence: "Уверенность по предметам",
    progress_mastery: "Освоение тем",
    progress_topic: "Тема",
    progress_subject: "Предмет",
    progress_last_studied: "Последнее занятие",
    progress_ease: "Лёгкость",
    progress_next_review: "Следующее повторение",
    progress_no_topics: "Тем пока нет.",
    settings_title: "Настройки",
    settings_save: "Сохранить",
    settings_saved: "Сохранено.",
    settings_language: "Язык",
    settings_timezone: "Часовой пояс",
    study_how_well: "Насколько хорошо вы это знали?",
    study_finished: "Я закончил изучение",
    rating_blackout: "Не знал",
    rating_blackout_sub: "Совсем не помнил",
    rating_hard: "Сложно",
    rating_hard_sub: "Вспомнил с трудом",
    rating_good: "Хорошо",
    rating_good_sub: "Вспомнил с усилием",
    rating_easy: "Легко",
    rating_easy_sub: "Знал отлично",
    onboard_step1: "К какому экзамену вы готовитесь?",
    onboard_step1_sub: "Ваш коуч построит персональный план вокруг экзамена.",
    onboard_course: "Название курса",
    onboard_course_ph: "напр. Биология, Алгебра, История",
    onboard_system: "Система / совет экзаменов",
    onboard_system_hint: "Введите систему вашей страны или оставьте пустым",
    onboard_step2: "Когда ваш экзамен?",
    onboard_step2_sub: "Коуч отсчитывает назад от этой даты, чтобы построить план.",
    onboard_date: "Дата экзамена",
    onboard_daily: "Время занятий в день",
    onboard_weekends: "Включить выходные в мой план",
    onboard_step3: "Насколько уверенно вы себя чувствуете сейчас?",
    onboard_step3_sub: "Будьте честны — коучу это нужно, чтобы верно рассчитать план.",
    onboard_step4: "На какую оценку вы рассчитываете?",
    onboard_step4_sub: "Коуч настроит глубину и нагрузку под эту цель.",
    onboard_step5: "Есть ли у вас учебная программа?",
    onboard_step5_sub: "Вставьте её ниже, и коуч извлечёт темы. Или пропустите.",
    onboard_continue: "Продолжить",
    onboard_back: "Назад",
    onboard_build: "Построить план →",
    onboard_colour: "Цвет",
    streak_keep: "Продолжайте — пройдите хотя бы одну сессию сегодня.",
    mon: "Пн",
    tue: "Вт",
    wed: "Ср",
    thu: "Чт",
    fri: "Пт",
    sat: "Сб",
    sun: "Вс"
  }
};

// Global exam systems by country/region
const EXAM_SYSTEMS = [{
  group: "🇬🇧 United Kingdom",
  options: ["AQA", "Edexcel", "OCR", "WJEC", "Cambridge IGCSE", "Cambridge A-Level", "SQA (Scotland)"]
}, {
  group: "🌍 International",
  options: ["IB (International Baccalaureate)", "Cambridge International AS & A-Level", "Cambridge IGCSE"]
}, {
  group: "🇺🇸 United States",
  options: ["AP (Advanced Placement)", "SAT Subject Tests", "ACT", "Common Core"]
}, {
  group: "🇺🇦 Ukraine",
  options: ["НМТ (Національний мультипредметний тест)", "ЗНО", "ДПА"]
}, {
  group: "🇷🇺 Russia",
  options: ["ЕГЭ (Единый государственный экзамен)", "ОГЭ", "ВПР"]
}, {
  group: "🇫🇷 France",
  options: ["Baccalauréat Général", "Baccalauréat Technologique", "Baccalauréat Professionnel", "BTS", "Classes Préparatoires"]
}, {
  group: "🇩🇪 Germany",
  options: ["Abitur", "Realschulabschluss", "Hauptschulabschluss", "Fachabitur"]
}, {
  group: "🇦🇺 Australia",
  options: ["HSC (NSW)", "VCE (Victoria)", "WACE (Western Australia)", "QCE (Queensland)", "SACE (South Australia)", "TCE (Tasmania)"]
}, {
  group: "🇨🇦 Canada",
  options: ["Ontario OSSLT", "BC Diploma", "Alberta Diploma", "Quebec DECS"]
}, {
  group: "🇮🇳 India",
  options: ["CBSE", "ICSE / ISC", "JEE (Main & Advanced)", "NEET", "State Board"]
}, {
  group: "🇨🇳 China",
  options: ["Gaokao (高考)", "Zhongkao (中考)"]
}, {
  group: "🇯🇵 Japan",
  options: ["共通テスト (CUAT)", "大学入試"]
}, {
  group: "🇰🇷 South Korea",
  options: ["수능 (CSAT / Suneung)", "내신"]
}, {
  group: "🇧🇷 Brazil",
  options: ["ENEM", "FUVEST", "UNICAMP", "ENADE"]
}, {
  group: "🇪🇸 Spain",
  options: ["EBAU / Selectividad", "EVAU", "Bachillerato"]
}, {
  group: "🇮🇹 Italy",
  options: ["Maturità (Esame di Stato)", "Concorsi universitari"]
}, {
  group: "🇵🇱 Poland",
  options: ["Matura", "Olimpiada"]
}, {
  group: "🇿🇦 South Africa",
  options: ["NSC (Matric)", "IEB"]
}, {
  group: "🇸🇬 Singapore",
  options: ["GCE A-Level", "GCE O-Level", "GCE N-Level", "Polytechnic Diploma"]
}, {
  group: "🇳🇿 New Zealand",
  options: ["NCEA", "Cambridge NZ", "IB NZ"]
}, {
  group: "🇳🇱 Netherlands",
  options: ["VWO", "HAVO", "VMBO"]
}, {
  group: "🇸🇪 Sweden",
  options: ["Gymnasieexamen (Studentexamen)", "Högskoleprov (SweSAT)"]
}, {
  group: "🇳🇴 Norway",
  options: ["Vitnemål VGS", "Privatisteksamen"]
}, {
  group: "🇩🇰 Denmark",
  options: ["Studentereksamen (STX)", "HF", "HTX", "EUX"]
}, {
  group: "🇫🇮 Finland",
  options: ["Ylioppilastutkinto (Matriculation Exam)"]
}, {
  group: "🇹🇷 Turkey",
  options: ["YKS (Yükseköğretim Kurumları Sınavı)", "LGS"]
}, {
  group: "🇦🇪 UAE / Middle East",
  options: ["Emirates Standardized Test (EmSAT)", "TOEFL", "IELTS"]
}, {
  group: "✏️ Custom / Other",
  options: ["University custom exam", "School internal exam", "Professional certification", "Other"]
}];
window.LANGS = LANGS;
window.EXAM_SYSTEMS = EXAM_SYSTEMS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/i18n.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/onboarding-data.jsx
try { (() => {
// AI Exam Coach — onboarding data model: exam types, dynamic grading, prefs, copy

// ─── Exam types & dynamic grading ──────────────────────────────────────────────
// kind: "scale"  → ordered list of grade labels (best→worst), pick via segmented buttons
// kind: "score"  → numeric range, pick via slider (min/max/step/suffix)
const EXAM_TYPES = [{
  id: "gcse",
  label: "GCSE",
  emoji: "🇬🇧",
  blurb: "9–1 grading",
  board: "AQA · Edexcel · OCR",
  grade: {
    kind: "scale",
    options: ["9", "8", "7", "6", "5", "4", "3"],
    current: "6",
    target: "8"
  }
}, {
  id: "alevel",
  label: "A-Level",
  emoji: "🇬🇧",
  blurb: "A*–E grading",
  board: "AQA · Edexcel · OCR",
  grade: {
    kind: "scale",
    options: ["A*", "A", "B", "C", "D", "E"],
    current: "B",
    target: "A"
  }
}, {
  id: "sat",
  label: "SAT",
  emoji: "🇺🇸",
  blurb: "400–1600",
  board: "College Board",
  grade: {
    kind: "score",
    min: 400,
    max: 1600,
    step: 10,
    current: 1180,
    target: 1450
  }
}, {
  id: "act",
  label: "ACT",
  emoji: "🇺🇸",
  blurb: "Composite 1–36",
  board: "ACT, Inc.",
  grade: {
    kind: "score",
    min: 1,
    max: 36,
    step: 1,
    current: 26,
    target: 32
  }
}, {
  id: "ap",
  label: "AP",
  emoji: "🇺🇸",
  blurb: "Advanced Placement 1–5",
  board: "College Board",
  grade: {
    kind: "scale",
    options: ["5", "4", "3", "2", "1"],
    current: "3",
    target: "5"
  }
}, {
  id: "ib",
  label: "IB",
  emoji: "🌍",
  blurb: "Diploma 1–7 / 45",
  board: "Int. Baccalaureate",
  grade: {
    kind: "scale",
    options: ["7", "6", "5", "4", "3", "2"],
    current: "4",
    target: "6"
  }
}, {
  id: "nmt",
  label: "NMT",
  emoji: "🇺🇦",
  blurb: "НМТ · 100–200",
  board: "UCEQA",
  grade: {
    kind: "score",
    min: 100,
    max: 200,
    step: 1,
    current: 145,
    target: 180
  }
}, {
  id: "matura",
  label: "Matura",
  emoji: "🇵🇱",
  blurb: "0–100%",
  board: "CKE",
  grade: {
    kind: "score",
    min: 0,
    max: 100,
    step: 1,
    suffix: "%",
    current: 60,
    target: 85
  }
}, {
  id: "abitur",
  label: "Abitur",
  emoji: "🇩🇪",
  blurb: "1.0 best → 4.0",
  board: "KMK",
  grade: {
    kind: "scale",
    options: ["1.0", "1.3", "1.7", "2.0", "2.3", "2.7", "3.0"],
    current: "2.3",
    target: "1.3"
  }
}, {
  id: "uni",
  label: "University",
  emoji: "🎓",
  blurb: "Degree classifications",
  board: "Custom modules",
  grade: {
    kind: "scale",
    options: ["1st", "2:1", "2:2", "3rd", "Pass"],
    current: "2:1",
    target: "1st"
  }
}, {
  id: "custom",
  label: "Custom",
  emoji: "✏️",
  blurb: "Set your own",
  board: "Any exam",
  grade: {
    kind: "scale",
    options: ["A", "B", "C", "D", "Pass"],
    current: "C",
    target: "A"
  }
}];
function examType(id) {
  return EXAM_TYPES.find(e => e.id === id) || EXAM_TYPES[1];
}

// ─── Study materials & learning preferences ────────────────────────────────────
const MATERIALS = [{
  id: "notes",
  emoji: "📝",
  en: "Notes",
  uk: "Конспекти",
  ru: "Конспекты",
  fr: "Notes",
  de: "Notizen"
}, {
  id: "textbooks",
  emoji: "📚",
  en: "Textbooks",
  uk: "Підручники",
  ru: "Учебники",
  fr: "Manuels",
  de: "Lehrbücher"
}, {
  id: "papers",
  emoji: "📄",
  en: "Past papers",
  uk: "Минулі тести",
  ru: "Прошлые тесты",
  fr: "Annales",
  de: "Altklausuren"
}, {
  id: "pdfs",
  emoji: "📑",
  en: "PDFs",
  uk: "PDF",
  ru: "PDF",
  fr: "PDF",
  de: "PDFs"
}, {
  id: "shots",
  emoji: "🖼️",
  en: "Screenshots",
  uk: "Скриншоти",
  ru: "Скриншоты",
  fr: "Captures",
  de: "Screenshots"
}, {
  id: "slides",
  emoji: "📊",
  en: "PowerPoints",
  uk: "Презентації",
  ru: "Презентации",
  fr: "Diaporamas",
  de: "Folien"
}];
const PREFERENCES = [{
  id: "chat",
  emoji: "🤖",
  en: "AI chat explanations",
  uk: "Пояснення AI-чату",
  ru: "Объяснения AI-чата",
  fr: "Explications par IA",
  de: "KI-Chat-Erklärungen"
}, {
  id: "cards",
  emoji: "🃏",
  en: "Flashcards",
  uk: "Флешкартки",
  ru: "Флешкарты",
  fr: "Cartes mémoire",
  de: "Lernkarten"
}, {
  id: "quiz",
  emoji: "✍️",
  en: "Practice questions",
  uk: "Практичні питання",
  ru: "Практические вопросы",
  fr: "Questions pratiques",
  de: "Übungsfragen"
}, {
  id: "video",
  emoji: "🎬",
  en: "Videos",
  uk: "Відео",
  ru: "Видео",
  fr: "Vidéos",
  de: "Videos"
}, {
  id: "recall",
  emoji: "🧠",
  en: "Active recall",
  uk: "Активне пригадування",
  ru: "Активное припоминание",
  fr: "Rappel actif",
  de: "Aktives Erinnern"
}, {
  id: "spaced",
  emoji: "🔁",
  en: "Spaced repetition",
  uk: "Інтервальне повторення",
  ru: "Интервальное повторение",
  fr: "Répétition espacée",
  de: "Verteiltes Lernen"
}];

// ─── Timezones (GMT offsets, auto-detect friendly) ─────────────────────────────
const TIMEZONES = [{
  id: "-08",
  label: "GMT−8",
  place: "Los Angeles"
}, {
  id: "-05",
  label: "GMT−5",
  place: "New York"
}, {
  id: "+00",
  label: "GMT+0",
  place: "London"
}, {
  id: "+01",
  label: "GMT+1",
  place: "Paris · Berlin"
}, {
  id: "+02",
  label: "GMT+2",
  place: "Kyiv · Warsaw"
}, {
  id: "+03",
  label: "GMT+3",
  place: "Moscow · Istanbul"
}, {
  id: "+04",
  label: "GMT+4",
  place: "Dubai"
}, {
  id: "+05:30",
  label: "GMT+5:30",
  place: "India"
}, {
  id: "+08",
  label: "GMT+8",
  place: "Singapore"
}, {
  id: "+09",
  label: "GMT+9",
  place: "Tokyo · Seoul"
}, {
  id: "+10",
  label: "GMT+10",
  place: "Sydney"
}];
// Map a JS minute-offset to the nearest entry id; returns a label + place.
function detectTimezone() {
  const offMin = -new Date().getTimezoneOffset(); // east of GMT positive
  const hours = offMin / 60;
  const sign = hours < 0 ? "-" : "+";
  const abs = Math.abs(hours);
  const whole = Math.floor(abs);
  const frac = abs - whole;
  const want = sign + String(whole).padStart(2, "0") + (frac ? ":" + String(Math.round(frac * 60)).padStart(2, "0") : "");
  return TIMEZONES.find(z => z.id === want) || TIMEZONES.find(z => z.id === "+00");
}

// ─── Default subjects pre-filled in step 2 (per advisor demo) ──────────────────
const DEFAULT_SUBJECTS = [{
  id: "bio",
  name: "Biology",
  color: "var(--subject-indigo)"
}, {
  id: "chem",
  name: "Chemistry",
  color: "var(--subject-rose)"
}];

// ─── Simulated AI analysis lines (step 5) ──────────────────────────────────────
const ANALYSIS_LINES = {
  en: ["18 Biology topics found", "12 Chemistry topics found", "6 weak areas detected", "Estimated revision time: 74 hours"],
  uk: ["Знайдено 18 тем з біології", "Знайдено 12 тем з хімії", "Виявлено 6 слабких місць", "Орієнтовний час підготовки: 74 год"],
  ru: ["Найдено 18 тем по биологии", "Найдено 12 тем по химии", "Обнаружено 6 слабых мест", "Примерное время подготовки: 74 ч"],
  fr: ["18 sujets de biologie trouvés", "12 sujets de chimie trouvés", "6 points faibles détectés", "Temps de révision estimé : 74 h"],
  de: ["18 Biologie-Themen gefunden", "12 Chemie-Themen gefunden", "6 Schwachstellen erkannt", "Geschätzte Lernzeit: 74 Std."]
};

// ─── Generated plan shown in the review step ───────────────────────────────────
const PLAN_REVIEW = [{
  id: "bio",
  name: "Biology",
  examDate: "4 Jul",
  color: "var(--subject-indigo)",
  current: "B",
  target: "A",
  probability: 62,
  sessions: 3
}, {
  id: "chem",
  name: "Chemistry",
  examDate: "9 Jul",
  color: "var(--subject-rose)",
  current: "C",
  target: "A",
  probability: 31,
  sessions: 5
}];

// ─── New onboarding copy, all five languages ───────────────────────────────────
const ONB = {
  en: {
    advisor: "Your AI advisor",
    greeting: "Hi 👋 I'm your study coach. Five quick questions and I'll build your plan.",
    step_of: n => `Step ${n} of 5`,
    s1_title: "What are you preparing for?",
    s1_sub: "Pick your exam — I'll match the grading system to it.",
    s2_title: "Where are you right now?",
    s2_sub: "Be honest — I size your plan around the gap.",
    s2_add: "+ Add subject",
    s2_current: "Current",
    s2_target: "Target",
    s2_name_ph: "Subject name",
    s3_title: "How much can you study each week?",
    s3_sub: "Realistically — I'll spread it across your subjects.",
    s3_rec: h => `Based on your exams and goals, I recommend ${h} hours per week.`,
    s3_custom: "Custom",
    s3_hours: "hours / week",
    s4_title: "What can I work from?",
    s4_sub: "Upload anything — I'll read it and map your topics.",
    s4_upload: "Drop files or tap to upload",
    s4_upload_sub: "PDFs, screenshots, notes, slides, past papers",
    s4_materials: "I have",
    s4_prefs: "I learn best with",
    s5_title: "Your personalised plan",
    s5_sub: "Here's what I'd recommend. Tweak it, or accept and start.",
    analysing: "Analysing your materials…",
    building: "Building your roadmap…",
    accept: "Accept plan & start →",
    edit: "Edit plan",
    prob: "chance of target",
    sessions: "sessions / week",
    exam: "Exam",
    tz_detected: p => `I detected ${p}.`,
    tz_change: "Change",
    tz_title: "Your timezone",
    back: "Back",
    next: "Continue"
  },
  uk: {
    advisor: "Ваш AI-радник",
    greeting: "Привіт 👋 Я ваш навчальний коуч. П'ять питань — і я складу план.",
    step_of: n => `Крок ${n} з 5`,
    s1_title: "До чого ви готуєтеся?",
    s1_sub: "Оберіть іспит — я підлаштую систему оцінювання.",
    s2_title: "Де ви зараз?",
    s2_sub: "Будьте чесні — я будую план навколо різниці.",
    s2_add: "+ Додати предмет",
    s2_current: "Зараз",
    s2_target: "Ціль",
    s2_name_ph: "Назва предмета",
    s3_title: "Скільки годин на тиждень?",
    s3_sub: "Реалістично — я розподілю їх між предметами.",
    s3_rec: h => `З огляду на ваші іспити, раджу ${h} годин на тиждень.`,
    s3_custom: "Інше",
    s3_hours: "год / тиждень",
    s4_title: "З чим мені працювати?",
    s4_sub: "Завантажте будь-що — я прочитаю й складу теми.",
    s4_upload: "Перетягніть файли або натисніть",
    s4_upload_sub: "PDF, скриншоти, конспекти, презентації, тести",
    s4_materials: "У мене є",
    s4_prefs: "Найкраще вчуся через",
    s5_title: "Ваш персональний план",
    s5_sub: "Ось що я раджу. Змініть або прийміть і почніть.",
    analysing: "Аналізую ваші матеріали…",
    building: "Будую ваш маршрут…",
    accept: "Прийняти план →",
    edit: "Змінити план",
    prob: "шанс на ціль",
    sessions: "сесій / тиждень",
    exam: "Іспит",
    tz_detected: p => `Я визначив ${p}.`,
    tz_change: "Змінити",
    tz_title: "Ваш часовий пояс",
    back: "Назад",
    next: "Продовжити"
  },
  ru: {
    advisor: "Ваш AI-советник",
    greeting: "Привет 👋 Я ваш коуч по учёбе. Пять вопросов — и план готов.",
    step_of: n => `Шаг ${n} из 5`,
    s1_title: "К чему вы готовитесь?",
    s1_sub: "Выберите экзамен — я подберу систему оценок.",
    s2_title: "Где вы сейчас?",
    s2_sub: "Честно — я строю план вокруг разрыва.",
    s2_add: "+ Добавить предмет",
    s2_current: "Сейчас",
    s2_target: "Цель",
    s2_name_ph: "Название предмета",
    s3_title: "Сколько часов в неделю?",
    s3_sub: "Реалистично — я распределю их по предметам.",
    s3_rec: h => `С учётом ваших экзаменов рекомендую ${h} часов в неделю.`,
    s3_custom: "Другое",
    s3_hours: "ч / неделю",
    s4_title: "С чем мне работать?",
    s4_sub: "Загрузите что угодно — я прочитаю и составлю темы.",
    s4_upload: "Перетащите файлы или нажмите",
    s4_upload_sub: "PDF, скриншоты, конспекты, презентации, тесты",
    s4_materials: "У меня есть",
    s4_prefs: "Лучше всего учусь через",
    s5_title: "Ваш персональный план",
    s5_sub: "Вот что я рекомендую. Измените или примите и начните.",
    analysing: "Анализирую материалы…",
    building: "Строю ваш маршрут…",
    accept: "Принять план →",
    edit: "Изменить план",
    prob: "шанс на цель",
    sessions: "сессий / неделю",
    exam: "Экзамен",
    tz_detected: p => `Я определил ${p}.`,
    tz_change: "Изменить",
    tz_title: "Ваш часовой пояс",
    back: "Назад",
    next: "Продолжить"
  },
  fr: {
    advisor: "Votre conseiller IA",
    greeting: "Bonjour 👋 Je suis votre coach. Cinq questions et je crée votre plan.",
    step_of: n => `Étape ${n} sur 5`,
    s1_title: "Pour quoi vous préparez-vous ?",
    s1_sub: "Choisissez l'examen — j'adapte la notation.",
    s2_title: "Où en êtes-vous ?",
    s2_sub: "Soyez honnête — je calibre sur l'écart.",
    s2_add: "+ Ajouter une matière",
    s2_current: "Actuel",
    s2_target: "Objectif",
    s2_name_ph: "Nom de la matière",
    s3_title: "Combien d'heures par semaine ?",
    s3_sub: "Réalistement — je les répartis entre vos matières.",
    s3_rec: h => `Vu vos examens, je recommande ${h} heures par semaine.`,
    s3_custom: "Autre",
    s3_hours: "h / semaine",
    s4_title: "Sur quoi puis-je travailler ?",
    s4_sub: "Importez tout — je lis et je cartographie vos sujets.",
    s4_upload: "Déposez des fichiers ou cliquez",
    s4_upload_sub: "PDF, captures, notes, diapos, annales",
    s4_materials: "J'ai",
    s4_prefs: "J'apprends mieux avec",
    s5_title: "Votre plan personnalisé",
    s5_sub: "Voici ma recommandation. Ajustez ou acceptez.",
    analysing: "Analyse de vos documents…",
    building: "Création de votre feuille de route…",
    accept: "Accepter le plan →",
    edit: "Modifier le plan",
    prob: "chance d'objectif",
    sessions: "séances / semaine",
    exam: "Examen",
    tz_detected: p => `J'ai détecté ${p}.`,
    tz_change: "Changer",
    tz_title: "Votre fuseau horaire",
    back: "Retour",
    next: "Continuer"
  },
  de: {
    advisor: "Dein KI-Berater",
    greeting: "Hallo 👋 Ich bin dein Lerncoach. Fünf Fragen und dein Plan steht.",
    step_of: n => `Schritt ${n} von 5`,
    s1_title: "Worauf bereitest du dich vor?",
    s1_sub: "Wähle die Prüfung — ich passe das Notensystem an.",
    s2_title: "Wo stehst du gerade?",
    s2_sub: "Ehrlich — ich plane um die Lücke herum.",
    s2_add: "+ Fach hinzufügen",
    s2_current: "Aktuell",
    s2_target: "Ziel",
    s2_name_ph: "Fachname",
    s3_title: "Wie viele Stunden pro Woche?",
    s3_sub: "Realistisch — ich verteile sie auf deine Fächer.",
    s3_rec: h => `Angesichts deiner Prüfungen empfehle ich ${h} Stunden pro Woche.`,
    s3_custom: "Andere",
    s3_hours: "Std / Woche",
    s4_title: "Womit kann ich arbeiten?",
    s4_sub: "Lade alles hoch — ich lese es und ordne deine Themen.",
    s4_upload: "Dateien ablegen oder tippen",
    s4_upload_sub: "PDFs, Screenshots, Notizen, Folien, Altklausuren",
    s4_materials: "Ich habe",
    s4_prefs: "Ich lerne am besten mit",
    s5_title: "Dein persönlicher Plan",
    s5_sub: "Das empfehle ich. Anpassen oder annehmen.",
    analysing: "Analysiere deine Materialien…",
    building: "Erstelle deine Roadmap…",
    accept: "Plan annehmen →",
    edit: "Plan bearbeiten",
    prob: "Zielchance",
    sessions: "Einheiten / Woche",
    exam: "Prüfung",
    tz_detected: p => `Ich habe ${p} erkannt.`,
    tz_change: "Ändern",
    tz_title: "Deine Zeitzone",
    back: "Zurück",
    next: "Weiter"
  }
};
Object.assign(window, {
  EXAM_TYPES,
  examType,
  MATERIALS,
  PREFERENCES,
  TIMEZONES,
  detectTimezone,
  DEFAULT_SUBJECTS,
  ANALYSIS_LINES,
  PLAN_REVIEW,
  ONB
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/onboarding-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/onboarding-steps.jsx
try { (() => {
// AI Exam Coach — Onboarding bits: coach bubble, grade picker, upload, plan review
// All exported to window for Onboarding.jsx to compose. Inline styles, mobile-first.

// ── Coach speech bubble — sells the "talking to an advisor" feel ───────────────
function CoachBubble({
  children,
  advisor
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      flexShrink: 0,
      width: 40,
      height: 40,
      borderRadius: "var(--radius-full)",
      background: "var(--indigo-100)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20
    }
  }, "\uD83E\uDD16"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 4px",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--indigo-600)"
    }
  }, advisor), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-2xl)",
      borderTopLeftRadius: "var(--radius-xs)",
      padding: "var(--space-3) var(--space-4)",
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      lineHeight: 1.5,
      boxShadow: "var(--shadow-sm)"
    }
  }, children)));
}

// ── Dynamic grade picker — adapts UI to the exam's grading system ───────────────
function GradePicker({
  grade,
  value,
  onChange,
  accent
}) {
  if (grade.kind === "score") {
    const pct = (value - grade.min) / (grade.max - grade.min) * 100;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-2)",
        marginBottom: "var(--space-2)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-3xl)",
        fontWeight: "var(--weight-bold)",
        color: accent,
        lineHeight: 1
      }
    }, value, grade.suffix || ""), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-xs)",
        color: "var(--text-faint)"
      }
    }, grade.min, "\u2013", grade.max, grade.suffix || "")), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: grade.min,
      max: grade.max,
      step: grade.step,
      value: value,
      onChange: e => onChange(Number(e.target.value)),
      style: {
        width: "100%",
        accentColor: accent,
        height: 28
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        borderRadius: "var(--radius-full)",
        background: "var(--slate-100)",
        overflow: "hidden",
        marginTop: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: "100%",
        width: `${pct}%`,
        background: accent,
        borderRadius: "var(--radius-full)"
      }
    })));
  }
  // scale — segmented pill buttons
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--space-2)"
    }
  }, grade.options.map(g => {
    const sel = String(value) === String(g);
    return /*#__PURE__*/React.createElement("button", {
      key: g,
      type: "button",
      onClick: () => onChange(g),
      style: {
        minWidth: 48,
        minHeight: 44,
        padding: "0 var(--space-3)",
        borderRadius: "var(--radius-lg)",
        fontSize: "var(--text-base)",
        fontWeight: "var(--weight-semibold)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        border: sel ? `2px solid ${accent}` : "1.5px solid var(--border-default)",
        background: sel ? "var(--indigo-50)" : "var(--surface-card)",
        color: sel ? "var(--indigo-700)" : "var(--text-muted)",
        transition: "all var(--dur-fast) ease"
      }
    }, g);
  }));
}

// ── Multi-select chip grid (materials / preferences) ───────────────────────────
function ChipGrid({
  items,
  selected,
  onToggle,
  lang
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-2)"
    }
  }, items.map(it => {
    const sel = selected.has(it.id);
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      type: "button",
      onClick: () => onToggle(it.id),
      style: {
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        minHeight: 48,
        padding: "0 var(--space-3)",
        borderRadius: "var(--radius-xl)",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        border: sel ? "2px solid var(--indigo-500)" : "1.5px solid var(--border-default)",
        background: sel ? "var(--indigo-50)" : "var(--surface-card)",
        color: sel ? "var(--indigo-700)" : "var(--text-body)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        fontSize: 18
      }
    }, it.emoji), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, it[lang] || it.en), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 18,
        height: 18,
        borderRadius: "var(--radius-full)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        color: "#fff",
        border: sel ? "none" : "1.5px solid var(--border-default)",
        background: sel ? "var(--indigo-500)" : "transparent"
      }
    }, sel ? "✓" : ""));
  }));
}

// ── File upload zone — real <input type=file>, shows picked files ──────────────
function UploadZone({
  files,
  onAdd,
  onRemove,
  copy
}) {
  const inputRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  const pick = list => {
    if (list && list.length) onAdd(Array.from(list).map(f => ({
      name: f.name,
      size: f.size
    })));
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => inputRef.current && inputRef.current.click(),
    onDragOver: e => {
      e.preventDefault();
      setDrag(true);
    },
    onDragLeave: () => setDrag(false),
    onDrop: e => {
      e.preventDefault();
      setDrag(false);
      pick(e.dataTransfer.files);
    },
    style: {
      width: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "var(--space-6)",
      borderRadius: "var(--radius-2xl)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      border: `2px dashed ${drag ? "var(--indigo-500)" : "var(--border-default)"}`,
      background: drag ? "var(--indigo-50)" : "var(--surface-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: 28,
      lineHeight: 1
    }
  }, "\uD83D\uDCE4"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)",
      lineHeight: 1.3,
      textAlign: "center"
    }
  }, copy.s4_upload), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      lineHeight: 1.3,
      textAlign: "center"
    }
  }, copy.s4_upload_sub)), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    type: "file",
    multiple: true,
    accept: ".pdf,.png,.jpg,.jpeg,.ppt,.pptx,.doc,.docx,.txt",
    onChange: e => {
      pick(e.target.files);
      e.target.value = "";
    },
    style: {
      display: "none"
    }
  }), files.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      marginTop: "var(--space-3)"
    }
  }, files.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "var(--space-2) var(--space-3)",
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCCE"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, f.name), f.size != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)",
      fontFamily: "var(--font-mono)"
    }
  }, (f.size / 1024).toFixed(0), " KB"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onRemove(i),
    "aria-label": "Remove",
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--text-faint)",
      fontSize: 16,
      lineHeight: 1,
      padding: 2
    }
  }, "\u2715")))));
}

// ── AI analysis animation → reveals found-topics checklist ─────────────────────
function AnalysisAnimation({
  lang,
  copy,
  onComplete
}) {
  const lines = window.ANALYSIS_LINES[lang] || window.ANALYSIS_LINES.en;
  const [shown, setShown] = React.useState(0);
  const [phase, setPhase] = React.useState("analysing"); // analysing → building → done
  React.useEffect(() => {
    if (shown < lines.length) {
      const id = setTimeout(() => setShown(n => n + 1), 650);
      return () => clearTimeout(id);
    }
    const a = setTimeout(() => setPhase("building"), 500);
    const b = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 1900);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [shown]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      padding: "var(--space-4) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      width: 22,
      height: 22,
      borderRadius: "var(--radius-full)",
      border: "3px solid var(--indigo-100)",
      borderTopColor: "var(--indigo-500)",
      animation: phase === "done" ? "none" : "onb-spin 0.8s linear infinite"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-strong)"
    }
  }, phase === "building" ? copy.building : copy.analysing)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)"
    }
  }, lines.slice(0, shown).map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      fontSize: "var(--text-sm)",
      color: "var(--text-body)",
      animation: "onb-rise var(--dur-normal) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--emerald-500)",
      fontWeight: "var(--weight-bold)"
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("span", null, l)))));
}

// ── Plan review card per subject — editable sessions/week ──────────────────────
function PlanRow({
  row,
  copy,
  onSessions
}) {
  const probColor = row.probability >= 60 ? "var(--emerald-600)" : row.probability >= 40 ? "var(--amber-600)" : "var(--red-500)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: "var(--radius-2xl)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderTop: `4px solid ${row.color}`,
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-4)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-base)",
      fontWeight: "var(--weight-bold)",
      color: "var(--text-strong)"
    }
  }, row.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, copy.exam, ": ", row.examDate)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-2xl)",
      fontWeight: "var(--weight-bold)",
      color: probColor,
      lineHeight: 1
    }
  }, row.probability, "%"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, copy.prob))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      fontSize: "var(--text-sm)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, copy.s2_current), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--text-strong)"
    }
  }, row.current), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--text-faint)"
    }
  }, "\u2192"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-faint)"
    }
  }, copy.s2_target), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--indigo-700)"
    }
  }, row.target)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, copy.sessions), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--text-strong)",
      fontWeight: "var(--weight-semibold)"
    }
  }, row.sessions, "\xD7")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 1,
    max: 7,
    value: row.sessions,
    onChange: e => onSessions(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: row.color,
      height: 24
    }
  })));
}
function copy_label(copy) {
  return copy.s2_current;
}
Object.assign(window, {
  CoachBubble,
  GradePicker,
  ChipGrid,
  UploadZone,
  AnalysisAnimation,
  PlanRow
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/onboarding-steps.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/study-data.jsx
try { (() => {
// AI Exam Coach — Phase C shared study data & defaults
const PHASE_C_CARDS_KEY = 'aicoach_cards_v1';
const PHASE_C_MISTAKES_KEY = 'aicoach_mistakes_v1';
const DEFAULT_CARDS = [{
  id: 'fc1',
  front: 'Where does glycolysis occur?',
  back: 'In the cytoplasm (cytosol) — not the mitochondria. Glucose → 2× pyruvate + 2 ATP net + 2 NADH.',
  subject: 'Biology',
  topic: 'Cellular Respiration',
  ease: 2.1,
  dueNow: true
}, {
  id: 'fc2',
  front: 'What is the net ATP yield of glycolysis?',
  back: '2 ATP net (4 produced, 2 consumed). Also yields 2 NADH and 2 pyruvate molecules.',
  subject: 'Biology',
  topic: 'Cellular Respiration',
  ease: 2.4,
  dueNow: true
}, {
  id: 'fc3',
  front: 'What is the role of NADPH in the Calvin cycle?',
  back: 'NADPH transfers hydrogen to reduce glycerate-3-phosphate (GP) to glyceraldehyde-3-phosphate (G3P) — the key reduction step.',
  subject: 'Biology',
  topic: 'Photosynthesis',
  ease: 2.6,
  dueNow: false
}, {
  id: 'fc4',
  front: 'What does a catalyst do to activation energy?',
  back: 'A catalyst lowers the activation energy needed for a reaction, increasing rate without being consumed.',
  subject: 'Chemistry',
  topic: 'Reaction Rates',
  ease: 1.8,
  dueNow: true
}, {
  id: 'fc5',
  front: "State Le Chatelier's principle.",
  back: "If a system at equilibrium is disturbed, it shifts to oppose the change and restore equilibrium.",
  subject: 'Chemistry',
  topic: 'Equilibria',
  ease: 2.9,
  dueNow: false
}, {
  id: 'fc6',
  front: 'What are the products of one Krebs cycle turn?',
  back: '3 NADH, 1 FADH₂, 1 ATP (or GTP), 2 CO₂. Cycle turns twice per glucose.',
  subject: 'Biology',
  topic: 'Cellular Respiration',
  ease: 1.9,
  dueNow: true
}];
const DEFAULT_QUIZ = [{
  id: 'q1',
  question: 'Where does glycolysis occur in the cell?',
  options: ['Mitochondrial matrix', 'Thylakoid membrane', 'Cytoplasm', 'Nucleus'],
  correct: 2,
  topic: 'Cellular Respiration',
  difficulty: 1
}, {
  id: 'q2',
  question: 'What is the correct sequence of aerobic respiration stages?',
  options: ['Krebs → Glycolysis → Oxidative phosphorylation', 'Glycolysis → Krebs cycle → Oxidative phosphorylation', 'Oxidative phosphorylation → Glycolysis → Krebs', 'Glycolysis → Oxidative phosphorylation → Krebs'],
  correct: 1,
  topic: 'Cellular Respiration',
  difficulty: 2
}, {
  id: 'q3',
  question: 'Which molecule is the final electron acceptor in oxidative phosphorylation?',
  options: ['NAD⁺', 'FADH₂', 'Oxygen', 'ADP'],
  correct: 2,
  topic: 'Cellular Respiration',
  difficulty: 2
}, {
  id: 'q4',
  question: 'What is the role of NADPH in the Calvin cycle?',
  options: ['Splits water in photolysis', 'Transfers H to reduce GP to G3P', 'Absorbs light energy', 'Produces ATP directly'],
  correct: 1,
  topic: 'Photosynthesis',
  difficulty: 2
}, {
  id: 'q5',
  question: 'A catalyst increases reaction rate by:',
  options: ['Adding energy to reactants', 'Lowering activation energy', 'Increasing concentration', 'Raising temperature'],
  correct: 1,
  topic: 'Reaction Rates',
  difficulty: 1
}, {
  id: 'q6',
  question: "Le Chatelier's principle states an equilibrium system:",
  options: ['Speeds up when heated', 'Opposes any change applied to it', 'Always shifts towards products', 'Maximises entropy'],
  correct: 1,
  topic: 'Equilibria',
  difficulty: 2
}];
const DEFAULT_MISTAKES = [{
  id: 'e1',
  question: 'Where does glycolysis occur?',
  studentAnswer: 'In the mitochondria',
  correctAnswer: 'In the cytoplasm',
  subject: 'Biology',
  topic: 'Cellular Respiration',
  date: '3 days ago',
  count: 2
}, {
  id: 'e2',
  question: 'Net ATP yield of glycolysis?',
  studentAnswer: '4 ATP',
  correctAnswer: '2 ATP net (4 produced, 2 used)',
  subject: 'Biology',
  topic: 'Cellular Respiration',
  date: '2 days ago',
  count: 1
}, {
  id: 'e3',
  question: 'Name the functional group in an alcohol.',
  studentAnswer: 'Carbonyl group',
  correctAnswer: 'Hydroxyl group (–OH)',
  subject: 'Chemistry',
  topic: 'Organic Chemistry',
  date: '5 days ago',
  count: 3
}, {
  id: 'e4',
  question: 'What type of bond joins amino acids?',
  studentAnswer: 'Hydrogen bond',
  correctAnswer: 'Peptide bond (condensation reaction)',
  subject: 'Biology',
  topic: 'Protein Synthesis',
  date: '1 day ago',
  count: 2
}, {
  id: 'e5',
  question: 'Define activation energy.',
  studentAnswer: 'The energy released in a reaction',
  correctAnswer: 'The minimum energy needed for a reaction to occur',
  subject: 'Chemistry',
  topic: 'Reaction Rates',
  date: '4 days ago',
  count: 1
}];
const ALL_ACHIEVEMENTS = [{
  id: 'a1',
  title: 'First Study Session',
  desc: 'Complete your first active recall session',
  icon: '🃏',
  unlocked: true,
  date: '2 days ago'
}, {
  id: 'a2',
  title: 'Perfect Quiz',
  desc: 'Score 100% on any quiz',
  icon: '💯',
  unlocked: false,
  progress: 85
}, {
  id: 'a3',
  title: 'Weakness Conquered',
  desc: 'Study your weakest topic 3 times',
  icon: '🎯',
  unlocked: false,
  progress: 67
}, {
  id: 'a4',
  title: '100 Cards Reviewed',
  desc: 'Review 100 flashcards total',
  icon: '📚',
  unlocked: true,
  date: 'Today'
}, {
  id: 'a5',
  title: 'Mock Exam Complete',
  desc: 'Complete your first mock exam',
  icon: '📝',
  unlocked: false,
  progress: 0
}, {
  id: 'a6',
  title: '7-Day Consistency',
  desc: 'Study every day for 7 days',
  icon: '🔥',
  unlocked: false,
  progress: 71
}, {
  id: 'a7',
  title: 'Grade +10%',
  desc: 'Increase target grade probability by 10%',
  icon: '📈',
  unlocked: true,
  date: '5 days ago'
}, {
  id: 'a8',
  title: 'Mistake Mastered',
  desc: 'Correctly answer a previously missed question',
  icon: '✓',
  unlocked: true,
  date: 'Yesterday'
}];
Object.assign(window, {
  PHASE_C_CARDS_KEY,
  PHASE_C_MISTAKES_KEY,
  DEFAULT_CARDS,
  DEFAULT_QUIZ,
  DEFAULT_MISTAKES,
  ALL_ACHIEVEMENTS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/study-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.GaugeRing = __ds_scope.GaugeRing;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.CourseCard = __ds_scope.CourseCard;

__ds_ns.RatingButtons = __ds_scope.RatingButtons;

__ds_ns.SessionCard = __ds_scope.SessionCard;

__ds_ns.StreakBanner = __ds_scope.StreakBanner;

__ds_ns.WeekStrip = __ds_scope.WeekStrip;

})();
