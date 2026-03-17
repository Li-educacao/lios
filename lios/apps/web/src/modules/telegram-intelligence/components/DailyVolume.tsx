import { BarChart3 } from 'lucide-react';
import type { TgDailyVolume } from '../types';

/* ─── DailyVolume ────────────────────────────────────────────────────────── */

interface DailyVolumeProps {
  days: TgDailyVolume[];
}

export function DailyVolume({ days }: DailyVolumeProps) {
  if (days.length === 0) return null;

  const max = Math.max(...days.map((d) => d.total));
  const totalSupport = days.reduce((s, d) => s + d.support, 0);
  const totalCommunity = days.reduce((s, d) => s + d.community, 0);
  const totalMsgs = totalSupport + totalCommunity;
  const avgPerDay = Math.round(totalMsgs / days.length);
  const avgSupportPerDay = Math.round(totalSupport / days.length);

  return (
    <div className="rounded-xl border border-lios-border bg-lios-surface p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-lios-blue shrink-0" />
          <h3 className="text-base font-subtitle text-white">Volume Diário</h3>
          <span className="text-xs font-body text-lios-gray-400">({days.length} dias)</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-body">
          <span className="text-lios-gray-400">
            Média: <span className="text-white font-subtitle">{avgPerDay}</span> msgs/dia
          </span>
          <span className="text-lios-gray-400">
            Suporte: <span className="text-white font-subtitle">{avgSupportPerDay}</span>/dia
          </span>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="flex items-end gap-1.5" style={{ height: 140 }}>
        {days.map((day) => {
          const totalPct = max > 0 ? (day.total / max) * 100 : 0;
          const supportPct = day.total > 0 ? (day.support / day.total) * 100 : 0;
          const isWeekend = day.weekday === 'Sáb' || day.weekday === 'Dom';

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 group"
              title={`${day.date} (${day.weekday})\nTotal: ${day.total}\nSuporte: ${day.support}\nComunidade: ${day.community}`}
            >
              {/* Count label on hover */}
              <span className="text-[10px] font-subtitle text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {day.total}
              </span>

              {/* Stacked bar */}
              <div
                className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse"
                style={{ height: `${Math.max(totalPct, 2)}%` }}
              >
                {/* Community (top) */}
                <div
                  className="w-full bg-lios-gray-600 transition-all"
                  style={{ height: `${100 - supportPct}%` }}
                />
                {/* Support (bottom) */}
                <div
                  className="w-full bg-lios-blue transition-all"
                  style={{ height: `${supportPct}%` }}
                />
              </div>

              {/* Day label */}
              <span
                className={`text-[10px] font-body ${
                  isWeekend ? 'text-lios-gray-600' : 'text-lios-gray-400'
                }`}
              >
                {day.weekday}
              </span>
              <span className="text-[9px] font-body text-lios-gray-600">
                {day.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-lios-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-lios-blue" />
          <span className="text-xs font-body text-lios-gray-400">
            Suporte ({totalSupport})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-lios-gray-600" />
          <span className="text-xs font-body text-lios-gray-400">
            Comunidade ({totalCommunity})
          </span>
        </div>
      </div>
    </div>
  );
}
