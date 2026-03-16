import { useState } from 'react';
import { ChevronDown, ChevronUp, User, Calendar } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import type { TgInsight } from '../types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface InsightCardProps {
  insight: TgInsight;
  showGroup?: boolean;
}

export function InsightCard({ insight }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[insight.category] ?? CATEGORY_COLORS.insight;
  const label = CATEGORY_LABELS[insight.category] ?? insight.category;

  return (
    <div
      className={cn(
        'rounded-xl border bg-lios-surface p-4 transition-colors',
        expanded ? 'border-lios-green/30' : 'border-lios-border hover:border-lios-border/80'
      )}
    >
      {/* Category badge + title row */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-subtitle border shrink-0 mt-0.5',
            colors.bg,
            colors.text,
            colors.border
          )}
        >
          {label}
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left"
        >
          <p className="text-sm font-subtitle text-white leading-snug">{insight.title}</p>
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-lios-gray-400 hover:text-white transition-colors"
          aria-label={expanded ? 'Recolher' : 'Expandir'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Snippet (always visible) */}
      {!expanded && (
        <p className="mt-2 text-xs font-body text-lios-gray-400 line-clamp-2">
          {insight.content}
        </p>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-body text-lios-gray-300 leading-relaxed">
            {insight.content}
          </p>
          {insight.relevance_score !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-body text-lios-gray-400">Relevância:</span>
              <div className="flex-1 h-1.5 rounded-full bg-lios-surface-2 overflow-hidden max-w-24">
                <div
                  className="h-full rounded-full bg-lios-green"
                  style={{ width: `${Math.round((insight.relevance_score ?? 0) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-body text-lios-gray-400">
                {Math.round((insight.relevance_score ?? 0) * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] font-body text-lios-gray-400">
        {insight.attributed_to && (
          <span className="flex items-center gap-1">
            <User size={11} />
            {insight.attributed_to}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <Calendar size={11} />
          {formatDate(insight.created_at)}
        </span>
      </div>
    </div>
  );
}
