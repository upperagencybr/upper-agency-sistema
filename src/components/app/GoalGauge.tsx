/** Semicircle gauge with red/yellow/green zones and a needle, like the original "meta batida" boards. */
export function GoalGauge({ value, goal }: { value: number; goal: number }) {
  const pct = goal > 0 ? value / goal : 0;
  const a = Math.PI * (1 - Math.min(1, pct));
  const arc = (s: number, e: number) => {
    const p = (t: number) => `${60 + 48 * Math.cos(Math.PI * (1 - t))} ${62 - 48 * Math.sin(Math.PI * (1 - t))}`;
    return `M${p(s)} A48 48 0 0 1 ${p(e)}`;
  };
  return (
    <svg viewBox="0 0 120 70" className="w-full max-w-36" role="img" aria-label={`${Math.round(pct * 100)}%`}>
      <path d={arc(0, 0.5)} fill="none" stroke="var(--color-destructive)" strokeWidth="12" />
      <path d={arc(0.5, 0.75)} fill="none" stroke="var(--color-warning)" strokeWidth="12" />
      <path d={arc(0.75, 1)} fill="none" stroke="var(--color-success)" strokeWidth="12" />
      <line x1="60" y1="62" x2={60 + 40 * Math.cos(a)} y2={62 - 40 * Math.sin(a)} stroke="var(--color-foreground)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="60" cy="62" r="4" fill="var(--color-foreground)" />
    </svg>
  );
}
