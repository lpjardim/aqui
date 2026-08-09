import { formatNumber } from "@/lib/format";

export function ProgressRing({
  percent,
  delivered,
  purchased,
}: {
  percent: number;
  delivered: number;
  purchased: number;
}) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative grid size-44 place-items-center">
      <svg viewBox="0 0 180 180" className="size-44 -rotate-90">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="12" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--color-red-strong)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-[34px] font-black leading-none tracking-[-0.04em]">{percent}%</p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted">Entregue</p>
        <p className="mt-1 text-[12px] text-muted">
          {formatNumber(delivered)} / {formatNumber(purchased)}
        </p>
      </div>
    </div>
  );
}
