import { Tag } from 'lucide-react';
import type { TgMetricsBrandDefect } from '../types';

/* ─── TopBrandDefects ────────────────────────────────────────────────────── */

interface TopBrandDefectsProps {
  brands: TgMetricsBrandDefect[];
}

export function TopBrandDefects({ brands }: TopBrandDefectsProps) {
  if (!brands || brands.length === 0) return null;

  const max = brands[0].count;

  return (
    <div className="rounded-xl border border-lios-border bg-lios-surface p-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Tag size={16} className="text-red-400 shrink-0" />
        <h3 className="text-base font-subtitle text-white">Marcas com Mais Defeitos</h3>
        <span className="text-xs font-body text-lios-gray-400">(6 meses)</span>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {brands.map((item) => {
          const pct = Math.round((item.count / max) * 100);
          return (
            <div key={item.brand}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-body text-lios-gray-300 truncate">
                  {item.brand}
                </span>
                <span className="text-xs font-subtitle text-white shrink-0">
                  {item.count}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-lios-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-400 transition-all"
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
