import "./DeliveryHero.css";

const BAR_COLORS = {
  brand:    "#0D9488",
  complete: "#34C759",
  progress: "#FF9500",
  available:"#D1D5DB",
};

// bars: array of pixel heights (11–32 range works well)
function MiniChart({ bars, color }) {
  const max = Math.max(...bars, 1);
  return (
    <div className="dh-chart">
      {bars.map((h, i) => (
        <span
          key={i}
          className="dh-spark-bar"
          style={{
            height: Math.max(4, Math.round((h / max) * 32)),
            background: color,
            animationDelay: `${700 + i * 40}ms`,
          }}
        />
      ))}
    </div>
  );
}

// sections: [{ label, chipTone, value, delta, bars? }]
export default function DeliveryHero({ sections = [] }) {
  const items = [];
  sections.forEach((s, i) => {
    items.push(
      <div
        key={s.label}
        className="dh-section"
        style={{
          animationDelay: `${340 + i * 80}ms`,
          paddingLeft:  i === 0                    ? 0 : 32,
          paddingRight: i === sections.length - 1  ? 0 : 32,
        }}
      >
        <div className="dh-top">
          <span className={`dh-chip dh-chip--${s.chipTone}`}>{s.label}</span>
          {s.bars && (
            <MiniChart bars={s.bars} color={BAR_COLORS[s.chipTone] ?? "#0D9488"} />
          )}
        </div>
        <p className="dh-value">{s.value}</p>
        {s.delta && <p className="dh-delta">{s.delta}</p>}
      </div>
    );
    if (i < sections.length - 1) {
      items.push(<div key={`div-${i}`} className="dh-divider" />);
    }
  });

  return <div className="dh-card">{items}</div>;
}
