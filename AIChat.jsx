// AI Exam Coach — AI Coach Chat tab v3
// Full port of the menu/quiz/confidence card system from AiCoachChat.dc.html,
// adapted to hooks + this app's course data for personalization.
// Module-scope (not nested in AIChat) so its identity — and its 4s timer —
// stays stable across the parent's re-renders for as long as it stays mounted.
function TypingHint() {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(id);
  }, []);
  if (!slow) return null;
  return React.createElement('span', { style: { fontSize: 12, color: 'var(--text-faint)', marginLeft: 8 } }, "Still thinking…");
}

function AIChat({ t, initialQuery, onConsumeQuery }) {
  const STORAGE_KEY = "aicoach_messages_v3";
  const HISTORY_KEY = "aicoach_history_v3";

  const [messages, setMessages] = React.useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [cardStates, setCardStates] = React.useState({});
  const [repliesUsed, setRepliesUsed] = React.useState({});
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [headerCollapsed, setHeaderCollapsed] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").length > 0; } catch { return false; }
  });
  const bodyRef = React.useRef(null);
  const handled = React.useRef(false);
  const historyRef = React.useRef((() => {
    try { const s = localStorage.getItem(HISTORY_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  })());

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current));
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
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(HISTORY_KEY); } catch {}
    historyRef.current = [];
    setMessages([]); setCardStates({}); setRepliesUsed({}); setHeaderCollapsed(false); handled.current = false;
  };

  const SYSTEM_PROMPT = `You are an AI Exam Coach — a brilliant, warm personal tutor inside a spaced-repetition revision app. One concept at a time. No walls of text. You can teach ANY subject the student raises, not only the courses below.

Student's current course profile (use to personalize when relevant — real exam dates, retention, weak topics):
${JSON.stringify({ courses: window.deriveCourses(window.getExams()), todaySessions: (window.buildScheduleData().sessionsByDay[window.fmtDateKey(new Date())] || []) })}

⚠️ ABSOLUTE RULE: Your ENTIRE response must be valid JSON. Start with { end with }. Nothing before. Nothing after. No markdown. No code fences. If you break this rule the UI breaks completely.

RESPONSE SHAPE (always exactly this):
{"text":"...","quickReplies":null,"card":null}

━━━ EXAMPLE — student says "pure maths" ━━━
{"text":"📐 **Pure Maths** is huge — let's zoom in. Which area do you want to start with?","quickReplies":null,"card":{"type":"menu","label":"Choose a topic","items":[{"emoji":"📐","text":"Algebra & Functions"},{"emoji":"∫","text":"Calculus"},{"emoji":"🔺","text":"Trigonometry"},{"emoji":"📊","text":"Statistics"},{"emoji":"📈","text":"Series & Sequences"}]}}

━━━ EXAMPLE — after topic + level set, teach a concept ━━━
{"text":"A **quadratic** is any expression of the form **ax² + bx + c**. The highest power is 2. Example: x² + 5x + 6 = 0. Ready to test yourself?","quickReplies":null,"card":{"type":"quiz","question":"Which of these is a quadratic expression?","options":["3x + 2","x² - 4x + 3","x³ + 1","5"],"correct":1,"explanation":"A quadratic has exactly one x² term. x² - 4x + 3 fits perfectly — highest power is 2."}}

━━━ TEXT RULES ━━━
Max 55 words. Warm, direct. **bold** key terms. NO bullet lists or numbered lists in text — use cards for choices.
Always end with a question or prompt.

━━━ QUICK REPLIES (or null) ━━━
2–3 chips for simple answers: ["Yes, got it!","Not yet"] | ["GCSE","A-Level","IB","Degree"]
Do NOT use for topic/subject selection — use "menu" card.

━━━ CARD TYPES ━━━
"menu" → topic/level/subject choice. Max 5 items. Always emoji.
  {"type":"menu","label":"Short label","items":[{"emoji":"...","text":"..."},...]}
"quiz" → MCQ after EVERY concept taught.
  {"type":"quiz","question":"?","options":["A","B","C","D"],"correct":0,"explanation":"Why the answer is correct."}
"confidence" → after 2–3 concepts. Check how student feels.
  {"type":"confidence"}

━━━ FLOW ━━━
1. Subject given → "menu" card with 4–5 sub-topics. Text: 1–2 sentences max.
2. Topic chosen → ask level with quickReplies: ["GCSE","A-Level","IB","Degree"]
3. Level set → teach ONE concept (≤50 words) + quiz card. No lists.
4. Quiz result (hidden in parens) → praise or correct briefly, next concept + quiz.
5. Every 3 concepts → confidence card.
6. Every message = one interaction. Keep the loop tight.`;

  const md = (text) => {
    let h = (text || "")
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+?)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<strong style="display:block;margin:8px 0 3px;font-size:0.96em;">$1</strong>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>.*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    h = h.split(/\n{2,}/).map(b => {
      b = b.trim();
      if (!b || /^<(ul|strong)/.test(b)) return b;
      if (/^<li>/.test(b)) return `<ul>${b}</ul>`;
      return `<p>${b.replace(/\n/g, ' ')}</p>`;
    }).join('');
    return h;
  };

  const parse = (raw) => {
    try {
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s < 0 || e < 0) return { text: raw, quickReplies: null, card: null };
      const j = JSON.parse(raw.slice(s, e + 1));
      return { text: j.text || raw, quickReplies: Array.isArray(j.quickReplies) && j.quickReplies.length ? j.quickReplies : null, card: j.card || null };
    } catch { return { text: raw, quickReplies: null, card: null }; }
  };

  const pushAI = ({ text, quickReplies, card }) => {
    const id = Date.now() + Math.random();
    historyRef.current = [...historyRef.current, { role: 'assistant', content: text }];
    setMessages(m => [...m, { id, isUser: false, isAI: true, text, html: md(text), quickReplies, card }]);
  };

  const callAI = async () => {
    setTyping(true);
    try {
      const raw = await window.claude.complete({ system: SYSTEM_PROMPT, messages: historyRef.current });
      setTyping(false);
      pushAI(parse(raw));
    } catch (e) {
      setTyping(false);
      pushAI({ text: "Sorry, connection hiccup — give it a second and try again!", quickReplies: null, card: null });
    }
  };

  const send = (rawText) => {
    const text = (rawText || "").trim();
    if (!text || typing) return;
    const id = Date.now() + Math.random();
    historyRef.current = [...historyRef.current, { role: 'user', content: text }];
    setMessages(m => [...m, { id, isUser: true, isAI: false, text }]);
    setInput("");
    callAI();
  };

  const selectMenu = (msgId, text) => {
    setCardStates(s => ({ ...s, [msgId]: { answered: true, selected: text } }));
    send(text);
  };
  const answerQuiz = (msgId, i, card) => {
    const isCorrect = i === card.correct;
    setCardStates(s => ({ ...s, [msgId]: { answered: true, selected: i, isCorrect } }));
    const hidden = isCorrect
      ? `(Quiz result: correct ✓ — chose "${card.options[card.correct]}")`
      : `(Quiz result: wrong ✗ — chose "${card.options[i]}", correct was "${card.options[card.correct]}")`;
    setTimeout(() => {
      historyRef.current = [...historyRef.current, { role: 'user', content: hidden }];
      callAI();
    }, 700);
  };
  const answerConf = (msgId, value) => {
    setCardStates(s => ({ ...s, [msgId]: { answered: true, value } }));
    const txt = { got_it: 'Got it!', not_sure: "I'm not quite sure about that.", confused: "I'm confused — can you explain it differently?" };
    setTimeout(() => send(txt[value]), 350);
  };
  const sendReply = (msgId, text) => {
    setRepliesUsed(s => ({ ...s, [msgId]: true }));
    send(text);
  };

  // Welcome message — once, on first mount with no history
  React.useEffect(() => {
    if (messages.length > 0) return;
    const courses = window.deriveCourses(window.getExams());
    const timer = setTimeout(() => {
      pushAI({
        text: "Hey! 👋 I'm your **AI Coach** — I know your courses and exam dates, and I can teach you anything else too.\n\nWhat are we tackling today?",
        quickReplies: null,
        card: {
          type: 'menu',
          label: 'Jump back into a course',
          items: courses.length
            ? courses.slice(0, 5).map(c => ({ emoji: '📘', text: c.subject }))
            : [
                { emoji: '📐', text: 'Pure Maths' }, { emoji: '⚗️', text: 'Chemistry' },
                { emoji: '⚡', text: 'Physics' }, { emoji: '🧬', text: 'Biology' }, { emoji: '📜', text: 'History' },
              ],
        },
      });
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const buildMenuCard = (msgId, card, cs) => {
    if (cs?.answered) return null;
    const items = card.items || [];
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 9 } },
      card.label && React.createElement('p', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 2px' } }, card.label),
      ...items.map((item, i) =>
        React.createElement('button', {
          key: i, onClick: () => selectMenu(msgId, item.text),
          style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, padding: '14px 18px', background: 'var(--surface-card)', border: '1.5px solid var(--border-default)', borderRadius: 14, fontSize: 14, fontWeight: 700, color: 'var(--text-strong)', cursor: 'pointer', width: '100%', fontFamily: 'var(--font-sans)' }
        },
          React.createElement('span', { style: { fontSize: 20, lineHeight: 1, flexShrink: 0 } }, item.emoji),
          item.text
        )
      )
    );
  };

  const buildQuizCard = (msgId, card, cs) => {
    const { answered, selected } = cs || {};
    const L = ['A', 'B', 'C', 'D'];
    const opts = card.options.map((opt, i) => {
      const isCor = i === card.correct, isSel = i === selected;
      let bg = 'var(--surface-card)', bc = 'var(--border-default)', col = 'var(--text-body)', lbg = '#f3f4f6', lcol = '#9ca3af';
      if (answered) {
        if (isCor) { bg = '#f0fdf4'; bc = '#22c55e'; col = '#15803d'; lbg = '#22c55e'; lcol = 'white'; }
        else if (isSel) { bg = '#fef2f2'; bc = '#ef4444'; col = '#b91c1c'; lbg = '#ef4444'; lcol = 'white'; }
        else { col = '#d1d5db'; bc = '#f3f4f6'; }
      } else if (isSel) { bg = '#eef2ff'; bc = '#6366f1'; }
      return React.createElement('button', {
        key: i, disabled: !!answered,
        onClick: answered ? null : () => answerQuiz(msgId, i, card),
        style: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: bg, border: `1.5px solid ${bc}`, borderRadius: 12, color: col, fontSize: 13, textAlign: 'left', cursor: answered ? 'default' : 'pointer', width: '100%', fontFamily: 'var(--font-sans)' }
      },
        React.createElement('span', { style: { width: 26, height: 26, borderRadius: 8, background: lbg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: lcol, flexShrink: 0 } }, L[i]),
        React.createElement('span', { style: { lineHeight: 1.45, fontWeight: 500 } }, opt)
      );
    });
    const fb = answered && React.createElement('div', {
      style: { marginTop: 10, padding: '11px 14px', background: cs.isCorrect ? '#f0fdf4' : '#fffbeb', border: `1px solid ${cs.isCorrect ? '#bbf7d0' : '#fde68a'}`, borderRadius: 12, fontSize: 12, color: cs.isCorrect ? '#15803d' : '#92400e', lineHeight: 1.6 }
    }, (cs.isCorrect ? '✅ ' : '💡 ') + card.explanation);

    return React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 } },
        React.createElement('span', { style: { background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 20, letterSpacing: '0.06em' } }, '⚡ QUICK CHECK')
      ),
      React.createElement('p', { style: { fontWeight: 700, fontSize: 14, margin: '0 0 11px', color: 'var(--text-strong)', lineHeight: 1.45 } }, card.question),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, ...opts),
      fb
    );
  };

  const buildConfCard = (msgId, cs) => {
    if (cs?.answered) return null;
    const opts = [
      { l: '✅  Got it!', v: 'got_it', bg: '#f0fdf4', bc: '#bbf7d0', c: '#15803d' },
      { l: '🤔  Almost...', v: 'not_sure', bg: '#fffbeb', bc: '#fde68a', c: '#92400e' },
      { l: '😅  Confused', v: 'confused', bg: '#fef2f2', bc: '#fecaca', c: '#b91c1c' },
    ];
    return React.createElement('div', null,
      React.createElement('p', { style: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 10px' } }, 'How are you feeling?'),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        ...opts.map(o => React.createElement('button', {
          key: o.v, onClick: () => answerConf(msgId, o.v),
          style: { padding: '12px 16px', background: o.bg, border: `1.5px solid ${o.bc}`, borderRadius: 12, color: o.c, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-sans)' }
        }, o.l))
      )
    );
  };

  const buildReplies = (msgId, replies) => replies.map((r, i) =>
    React.createElement('button', {
      key: i, onClick: () => sendReply(msgId, r),
      style: { padding: '8px 16px', background: 'var(--surface-card)', border: '1.5px solid var(--border-default)', borderRadius: 20, fontSize: 13, color: 'var(--text-body)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }
    }, r)
  );

  const CoachIcon = ({ size = 32 }) =>
    React.createElement('div', {
      style: { width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1 0%,#7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
    },
      React.createElement('svg', { width: size * 0.54, height: size * 0.54, viewBox: "0 0 20 20", fill: "none" },
        React.createElement('path', { d: "M10 2C7.24 2 5 4.24 5 7c0 1.9 1.05 3.55 2.6 4.4L7.3 12h5.4l-.3-.6C14.05 10.55 15 8.9 15 7c0-2.76-2.24-5-5-5z", fill: "white", opacity: "0.95" }),
        React.createElement('rect', { x: "7.5", y: "13", width: "5", height: "1.5", rx: "0.75", fill: "white", opacity: "0.75" }),
        React.createElement('rect', { x: "8.5", y: "15", width: "3", height: "1.2", rx: "0.6", fill: "white", opacity: "0.55" })
      )
    );

  let lastAiId = null;
  for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].isAI) { lastAiId = messages[i].id; break; } }

  return (
    React.createElement('div', { style: { display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", minHeight: 480, fontFamily: "var(--font-sans)" } },

      // Header — collapses to 44px slim bar
      React.createElement('div', {
        style: {
          padding: headerCollapsed ? "8px 20px" : "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface-card)",
          borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          minHeight: headerCollapsed ? 44 : 68,
          transition: "min-height 0.2s ease, padding 0.2s ease",
        }
      },
        React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 12 } },
          React.createElement(CoachIcon, { size: headerCollapsed ? 28 : 40 }),
          headerCollapsed
            ? React.createElement('div', { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement('span', { style: { fontWeight: 600, fontSize: 14, color: "var(--text-strong)" } }, "AI Coach"),
                React.createElement('span', { style: { fontSize: 11, color: "#059669" } }, "● Online"))
            : React.createElement('div', null,
                React.createElement('p', { style: { margin: 0, fontWeight: 700, color: "var(--text-strong)", fontSize: 15 } }, "AI Coach"),
                React.createElement('p', { style: { margin: 0, fontSize: 11, color: "#059669" } }, "● Online · knows your exams"))
        ),
        messages.length > 0
          ? React.createElement('button', {
              onClick: clearConversation,
              style: { border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-muted)", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)" }
            }, "Clear chat")
          : null
      ),

      // Messages area
      React.createElement('div', {
        ref: bodyRef,
        style: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, background: "var(--surface-page)" }
      },
        ...messages.map((m) => {
          if (m.isUser) {
            return React.createElement('div', { key: m.id, style: { display: "flex", justifyContent: "flex-end" } },
              React.createElement('div', { style: { maxWidth: "78%", background: "#4f46e5", color: "#fff", padding: "10px 14px", borderRadius: 16, borderTopRightRadius: 4, fontSize: 13, lineHeight: 1.65, fontWeight: 500 } }, m.text)
            );
          }
          const cs = cardStates[m.id];
          let cardEl = null;
          if (m.card) {
            if (m.card.type === 'menu') cardEl = buildMenuCard(m.id, m.card, cs);
            if (m.card.type === 'quiz') cardEl = buildQuizCard(m.id, m.card, cs);
            if (m.card.type === 'confidence') cardEl = buildConfCard(m.id, cs);
          }
          const isLast = m.id === lastAiId;
          const showReplies = isLast && !!m.quickReplies?.length && !repliesUsed[m.id] && !typing;
          return React.createElement('div', { key: m.id, style: { display: "flex", flexDirection: "column", gap: 8 } },
            React.createElement('div', { style: { display: "flex", gap: 12, alignItems: "flex-start" } },
              React.createElement(CoachIcon, { size: 32 }),
              React.createElement('div', { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 } },
                React.createElement('div', {
                  style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, borderTopLeftRadius: 4, padding: "10px 14px", maxWidth: "85%", fontSize: 13, color: "var(--text-body)", lineHeight: 1.65 },
                  dangerouslySetInnerHTML: { __html: m.html }
                }),
                cardEl && React.createElement('div', { style: { maxWidth: 420, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 16 } }, cardEl),
                showReplies && React.createElement('div', { style: { display: "flex", flexWrap: "wrap", gap: 8 } }, ...buildReplies(m.id, m.quickReplies))
              )
            )
          );
        }),

        // Typing indicator
        typing && React.createElement('div', { style: { display: "flex", gap: 12, alignItems: "flex-start" } },
          React.createElement(CoachIcon, { size: 32 }),
          React.createElement('div', {
            style: { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }
          },
            ...[0, 1, 2].map(d =>
              React.createElement('span', {
                key: d,
                style: { width: 7, height: 7, borderRadius: "50%", background: "#6366f1", animation: "aiTyping 1.2s ease-in-out infinite", animationDelay: d * 0.2 + "s" }
              })
            ),
            React.createElement(TypingHint, { key: "hint" })
          )
        )
      ),

      // Input bar
      React.createElement('div', {
        style: { padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)", display: "flex", gap: 8, alignItems: "flex-end" }
      },
        React.createElement('textarea', {
          value: input,
          onChange: e => setInput(e.target.value),
          onKeyDown: e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
          },
          placeholder: "Ask your coach anything… (Enter to send, Shift+Enter for new line)",
          rows: 1,
          style: { flex: 1, border: "1px solid var(--border-default)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--text-body)", background: "var(--surface-page)", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto" }
        }),
        React.createElement('button', {
          onClick: () => send(input),
          disabled: !input.trim() || typing,
          style: { background: input.trim() && !typing ? "#4f46e5" : "#c7d2fe", color: "white", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: input.trim() && !typing ? "pointer" : "default", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }
        }, "Send →")
      )
    )
  );
}

Object.assign(window, { AIChat });
