import { Wrench } from 'lucide-react';
import type { TgMetricsDefect } from '../types';

/* ─── TopDefects ──────────────────────────────────────────────────────────── */

interface TopDefectsProps {
  defects: TgMetricsDefect[];
}

export function TopDefects({ defects }: TopDefectsProps) {
  if (!defects || defects.length === 0) return null;

  const max = defects[0].count;

  return (
    <div className="rounded-xl border border-lios-border bg-lios-surface p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Wrench size={16} className="text-lios-green shrink-0" />
        <h3 className="text-base font-subtitle text-white">Defeitos Mais Recorrentes</h3>
        <span className="text-xs font-body text-lios-gray-400">(6 meses)</span>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {defects.map((defect) => {
          const pct = Math.round((defect.count / max) * 100);
          return (
            <div key={defect.name}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-body text-lios-gray-300 truncate">
                  {defect.name}
                </span>
                <span className="text-xs font-subtitle text-white shrink-0">
                  {defect.count}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-lios-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-lios-green transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
