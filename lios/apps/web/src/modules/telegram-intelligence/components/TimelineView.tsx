import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../../lib/utils';
import type { TgSummary } from '../types';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const e = new Date(end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${s} — ${e}`;
}

interface TimelineItemProps {
  summary: TgSummary;
  isLast: boolean;
}

function TimelineItem({ summary, isLast }: TimelineItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-lios-green shrink-0 mt-1" />
        {!isLast && <div className="w-px flex-1 bg-lios-border mt-1" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={12} className="text-lios-gray-400" />
          <span className="text-xs font-body text-lios-gray-400">
            {formatDateRange(summary.period_start, summary.period_end)}
          </span>
        </div>

        <div className="rounded-xl border border-lios-border bg-lios-surface p-4">
          <p className={cn('text-sm font-body text-lios-gray-300 leading-relaxed', !expanded && 'line-clamp-3')}>
            {summary.executive_summary ?? 'Sem resumo disponível.'}
          </p>

          {(summary.executive_summary?.length ?? 0) > 200 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs font-subtitle text-lios-green hover:text-lios-green/80 transition-colors"
            >
              {expanded ? (
                <><ChevronUp size={12} /> Recolher</>
              ) : (
                <><ChevronDown size={12} /> Ver mais</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TimelineViewProps {
  summaries: TgSummary[];
  loading?: boolean;
}

export function TimelineView({ summaries, loading }: TimelineViewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-3 h-3 rounded-full bg-lios-surface-2 animate-pulse mt-1 shrink-0" />
            <div className="flex-1 rounded-xl bg-lios-surface border border-lios-border h-24 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="py-10 text-center text-sm font-body text-lios-gray-400">
        Nenhum resumo disponível para este grupo.
      </div>
    );
  }

  // Sort descending by period_end
  const sorted = [...summaries].sort(
    (a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
  );

  return (
    <div className="space-y-0">
      {sorted.map((summary, i) => (
        <TimelineItem key={summary.id} summary={summary} isLast={i === sorted.length - 1} />
      ))}
    </div>
  );
}
