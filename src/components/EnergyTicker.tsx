/**
 * Live tape under a chrome bar. Same duplicate-track mechanic as the
 * exam marquee, faster, and each chip can jump a section.
 */

export type EnergyTick = {
  id: string;
  label: string;
};

type EnergyTickerProps = {
  items: EnergyTick[];
  label: string;
  onPick?: (id: string) => void;
};

function Row({ items, hidden, onPick }: { items: EnergyTick[]; hidden?: boolean; onPick?: (id: string) => void }) {
  return (
    <ul className="energy-ticker-row" aria-hidden={hidden ? true : undefined}>
      {items.map((item) => (
        <li key={`${hidden ? "b" : "a"}-${item.id}`}>
          <button type="button" onClick={() => onPick?.(item.id)}>{item.label}</button>
        </li>
      ))}
    </ul>
  );
}

export function EnergyTicker({ items, label, onPick }: EnergyTickerProps) {
  if (items.length === 0) return null;
  return (
    <div className="energy-ticker" aria-label={label}>
      <div className="energy-ticker-track">
        <Row items={items} {...(onPick ? { onPick } : {})} />
        <Row items={items} hidden {...(onPick ? { onPick } : {})} />
      </div>
    </div>
  );
}
