import { tk } from "@/lib/format";

/** Small dependency-free SVG area chart. */
export function AreaChart({ data, height = 160 }: { data: { label: string; total: number }[]; height?: number }) {
  const W = 600, H = height, pad = 28;
  const max = Math.max(1, ...data.map((d) => d.total));
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d.total)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sales chart">
      {[0, 0.5, 1].map((t) => <g key={t}><line x1={pad} x2={W - pad} y1={y(max * t)} y2={y(max * t)} stroke="#f0e0d6" /><text x={2} y={y(max * t) + 4} fontSize="10" fill="#7d665e">{Math.round((max * t) / 1000)}k</text></g>)}
      <path d={`${line} L${x(data.length - 1)} ${H - pad} L${x(0)} ${H - pad} Z`} fill="#b3161f" opacity={0.08} />
      <path d={line} fill="none" stroke="#b3161f" strokeWidth={2.5} />
      {data.map((d, i) => <g key={i}><circle cx={x(i)} cy={y(d.total)} r={3.5} fill="#b3161f"><title>{tk(d.total)}</title></circle><text x={x(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="#7d665e">{d.label}</text></g>)}
    </svg>
  );
}

export function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="grid gap-2">
      {data.map((d) => (
        <li key={d.label} className="text-sm">
          <div className="flex justify-between"><span>{d.label}</span><b>{tk(d.value)}</b></div>
          <div className="mt-1 h-2 rounded-full bg-blush"><div className="h-2 rounded-full bg-brand" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
