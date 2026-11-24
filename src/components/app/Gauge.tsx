export function Gauge({ value, goal, label, display }: { value: number; goal: number; label: string; display: string }) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const r = 52;
  const len = Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-full max-w-40" role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
        <path d="M8 64 A52 52 0 0 1 112 64" fill="none" stroke="var(--color-muted)" strokeWidth="10" strokeLinecap="round" />
        <path d="M8 64 A52 52 0 0 1 112 64" fill="none" stroke="var(--color-primary)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${len * pct} ${len}`} />
        <text x="60" y="58" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-foreground)">{Math.round(pct * 100)}%</text>
      </svg>
      <div className="kpi-label mt-1">{label}</div>
      <div className="text-xs text-muted-foreground">{display}</div>
    </div>
  );
}
