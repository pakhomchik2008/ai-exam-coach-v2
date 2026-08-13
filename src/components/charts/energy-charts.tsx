/**
 * Progress data-viz. SVG only — no chart vendor. Draw-in is CSS;
 * reduced-motion skips the dash animation.
 */
export function Sparkline({
  values,
  width = 120,
  height = 28,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const pts = polyline(values, width, height);
  return (
    <svg className="energy-chart" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <polyline className="energy-draw" points={pts} fill="none" stroke="#1B4D4A" strokeWidth="1.8" />
    </svg>
  );
}

export function RadarChart({
  axes,
  onPick,
}: {
  axes: Array<{ label: string; value: number }>;
  onPick?: (label: string) => void;
}) {
  const n = Math.max(3, axes.length);
  const cx = 110;
  const cy = 110;
  const r = 78;
  const poly = axes.map((a, i) => {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const mag = r * Math.max(0, Math.min(1, a.value / 100));
    return [cx + Math.cos(ang) * mag, cy + Math.sin(ang) * mag];
  });
  const ring = (t: number) =>
    Array.from({ length: n }, (_, i) => {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return `${cx + Math.cos(ang) * r * t},${cy + Math.sin(ang) * r * t}`;
    }).join(" ");

  return (
    <svg className="energy-chart energy-radar" viewBox="0 0 220 220" role="img">
      {[0.33, 0.66, 1].map((t) => (
        <polygon key={t} points={ring(t)} fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
      ))}
      <polygon
        className="energy-draw-fill"
        points={poly.map((p) => p.join(",")).join(" ")}
        fill="rgba(212,179,106,0.28)"
        stroke="#D4B36A"
        strokeWidth="1.6"
      />
      {axes.map((a, i) => {
        const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const x = cx + Math.cos(ang) * 98;
        const y = cy + Math.sin(ang) * 98;
        return (
          <text
            key={a.label}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="9"
            fill="var(--text-muted)"
            onClick={() => onPick?.(a.label)}
            style={{ cursor: onPick ? "pointer" : "default" }}
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

export function Heatmap({
  cells,
}: {
  cells: Array<{ key: string; count: number; label: string }>;
}) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  return (
    <div className="energy-heat" role="img" aria-label="consistency">
      {cells.map((c, i) => (
        <i
          key={c.key}
          title={`${c.label}: ${c.count}`}
          className="energy-heat-cell"
          style={{
            opacity: c.count === 0 ? 0.12 : 0.25 + (c.count / max) * 0.75,
            animationDelay: `${Math.min(i, 80) * 8}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function Waterfall({
  steps,
}: {
  steps: Array<{ label: string; delta: number }>;
}) {
  const rows = steps.reduce<Array<{ label: string; delta: number; from: number; to: number }>>((out, s) => {
    const from = out.length ? out[out.length - 1]!.to : 0;
    out.push({ ...s, from, to: from + s.delta });
    return out;
  }, []);
  const min = Math.min(0, ...rows.map((r) => r.from), ...rows.map((r) => r.to));
  const max = Math.max(1, ...rows.map((r) => r.from), ...rows.map((r) => r.to));
  const span = max - min || 1;
  return (
    <div className="energy-waterfall">
      {rows.map((r) => {
        const lo = Math.min(r.from, r.to);
        const hi = Math.max(r.from, r.to);
        const top = ((max - hi) / span) * 100;
        const h = ((hi - lo) / span) * 100;
        return (
          <div key={r.label} className="energy-waterfall-col">
            <div
              className={`energy-waterfall-bar${r.delta >= 0 ? " is-up" : " is-down"}`}
              style={{ top: `${top}%`, height: `${Math.max(4, h)}%` }}
            />
            <span>{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Candlestick({
  days,
}: {
  days: Array<{ label: string; open: number; high: number; low: number; close: number }>;
}) {
  const lo = Math.min(...days.map((d) => d.low), 0);
  const hi = Math.max(...days.map((d) => d.high), 1);
  const span = hi - lo || 1;
  return (
    <div className="energy-candle">
      {days.map((d) => {
        const up = d.close >= d.open;
        const wickTop = ((hi - d.high) / span) * 100;
        const wickH = ((d.high - d.low) / span) * 100;
        const bodyTop = ((hi - Math.max(d.open, d.close)) / span) * 100;
        const bodyH = (Math.abs(d.close - d.open) / span) * 100;
        return (
          <div key={d.label} className="energy-candle-col" title={`${d.label} ${d.close}`}>
            <i className="energy-candle-wick" style={{ top: `${wickTop}%`, height: `${wickH}%` }} />
            <i
              className={`energy-candle-body${up ? " is-up" : " is-down"}`}
              style={{ top: `${bodyTop}%`, height: `${Math.max(3, bodyH)}%` }}
            />
            <span>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function StackedArea({
  series,
}: {
  series: Array<{ label: string; color: string; values: number[] }>;
}) {
  const w = 320;
  const h = 120;
  const cols = Math.max(1, ...series.map((s) => s.values.length));
  const totals = Array.from({ length: cols }, (_, i) =>
    series.reduce((sum, s) => sum + (s.values[i] || 0), 0),
  );
  const max = Math.max(1, ...totals);
  const acc = Array.from({ length: cols }, () => 0);
  const layers = series.map((s) => {
    const top = s.values.map((v, i) => {
      const next = (acc[i] ?? 0) + v;
      acc[i] = next;
      return next;
    });
    return { ...s, top };
  }).reverse();

  return (
    <svg className="energy-chart" viewBox={`0 0 ${w} ${h}`} role="img">
      {layers.map((s) => {
        const line = s.top.map((v, i) => {
          const x = (i / Math.max(1, cols - 1)) * w;
          const y = h - ((v ?? 0) / max) * (h - 8);
          return `${x},${y}`;
        });
        const d = `M0,${h} L${line.join(" L")} L${w},${h} Z`;
        return <path key={s.label} className="energy-draw-fill" d={d} fill={s.color} opacity="0.55" />;
      })}
    </svg>
  );
}

export function Sankey({
  links,
}: {
  links: Array<{ from: string; to: string; weight: number }>;
}) {
  const left = unique(links.map((l) => l.from));
  const right = unique(links.map((l) => l.to));
  const maxW = Math.max(1, ...links.map((l) => l.weight));
  return (
    <svg className="energy-chart energy-sankey" viewBox="0 0 320 180" role="img">
      {links.map((l, i) => {
        const y1 = 16 + left.indexOf(l.from) * 28;
        const y2 = 16 + right.indexOf(l.to) * 28;
        const w = 1.2 + (l.weight / maxW) * 6;
        return (
          <path
            key={`${l.from}-${l.to}-${i}`}
            className="energy-draw"
            d={`M24 ${y1} C 120 ${y1}, 200 ${y2}, 296 ${y2}`}
            fill="none"
            stroke="#D4B36A"
            strokeWidth={w}
            opacity="0.7"
          />
        );
      })}
      {left.map((name, i) => (
        <text key={`l-${name}`} x="4" y={20 + i * 28} fontSize="9" fill="var(--text-muted)">{name}</text>
      ))}
      {right.map((name, i) => (
        <text key={`r-${name}`} x="316" y={20 + i * 28} fontSize="9" fill="var(--text-muted)" textAnchor="end">{name}</text>
      ))}
    </svg>
  );
}

export function buildHeatCells(days: number, counts: Record<string, number>): Array<{ key: string; count: number; label: string }> {
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, count: counts[key] || 0, label: key });
  }
  return out;
}

function polyline(values: number[], width: number, height: number): string {
  if (values.length === 0) return `0,${height} ${width},${height}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
}

function unique(list: string[]): string[] {
  return [...new Set(list)];
}
