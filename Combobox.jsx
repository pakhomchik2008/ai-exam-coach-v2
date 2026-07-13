// AI Exam Coach — generic searchable combobox.
//
// Zero curriculum/exam knowledge — a caller supplies options, loading state,
// and a noMatchSlot (CurriculumStep uses this to inject "My course isn't
// listed" without Combobox ever knowing what that means). Reusable anywhere
// a type-to-filter dropdown is needed.

function Combobox({ value, onChange, onSelect, options, loading, placeholder, noMatchSlot, autoFocus }) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);
  const rootRef = React.useRef(null);
  const opts = options || [];

  React.useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  React.useEffect(() => { setHighlight(-1); }, [opts.length, open]);

  const select = (opt) => {
    onSelect(opt);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(opts.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (open && highlight >= 0 && opts[highlight]) {
        e.preventDefault();
        select(opts[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showListbox = open && (opts.length > 0 || loading || !!noMatchSlot);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <input
        type="text" autoFocus={autoFocus} value={value || ""} placeholder={placeholder}
        role="combobox" aria-expanded={showListbox} aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: "var(--radius-lg)",
          border: "1.5px solid var(--border-default)", fontSize: "var(--text-base)", fontFamily: "var(--font-sans)",
          color: "var(--text-strong)", background: "var(--surface-card)" }} />
      {showListbox && (
        <div role="listbox" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
          background: "var(--surface-card)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.12))", maxHeight: 260, overflowY: "auto", padding: 4 }}>
          {opts.map((opt, i) => (
            <div key={opt.value != null ? opt.value : i} role="option" aria-selected={i === highlight}
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              onMouseEnter={() => setHighlight(i)}
              style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", cursor: "pointer",
                background: i === highlight ? "var(--indigo-50)" : "transparent" }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-strong)" }}>{opt.label}</div>
              {opt.sublabel && <div style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginTop: 1 }}>{opt.sublabel}</div>}
            </div>
          ))}
          {opts.length === 0 && loading && (
            <div style={{ padding: "10px 12px", fontSize: "var(--text-sm)", color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 8 }}>
              <span aria-hidden="true" style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%",
                border: "2px solid var(--border-default)", borderTopColor: "var(--indigo-500)", animation: "onb-spin 0.7s linear infinite" }} />
              Still figuring it out…
            </div>
          )}
          {opts.length === 0 && !loading && noMatchSlot}
        </div>
      )}
    </div>
  );
}

window.Combobox = Combobox;
