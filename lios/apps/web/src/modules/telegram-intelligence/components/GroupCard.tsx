import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { Card } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import type { TgGroup, InsightCategory } from '../types';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} hora${hours !== 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days !== 1 ? 's' : ''}`;

  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatNumber(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

type AnalysisStatus = 'active' | 'stale' | 'inactive';

function getAnalysisStatus(lastAnalyzedAt: string | null): AnalysisStatus {
  if (!lastAnalyzedAt) return 'inactive';

  const hours = (Date.now() - new Date(lastAnalyzedAt).getTime()) / 3_600_000;
  if (hours < 48) return 'active';
  if (hours < 168) return 'stale'; // 7 days
  return 'inactive';
}

const STATUS_CONFIG: Record<AnalysisStatus, { dot: string; label: string }> = {
  active:   { dot: 'bg-lios-green',    label: 'Analisado recentemente' },
  stale:    { dot: 'bg-lios-amber',    label: 'Análise desatualizada' },
  inactive: { dot: 'bg-lios-red',      label: 'Inativo' },
};

/* ─── CategoryPill ─────────────────────────────────────────────────────────── */

function CategoryPill({ category }: { category: InsightCategory }) {
  const colors = CATEGORY_COLORS[category];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-subtitle border',
        colors.bg,
        colors.text,
        colors.border
      )}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

/* ─── GroupCard ─────────────────────────────────────────────────────────────── */

interface GroupCardProps {
  group: TgGroup;
  topCategories?: InsightCategory[];
}

export function GroupCard({ group, topCategories = [] }: GroupCardProps) {
  const navigate = useNavigate();
  const status = getAnalysisStatus(group.last_analyzed_at);
  const statusConfig = STATUS_CONFIG[status];

  return (
    <Card
      variant="elevated"
      className="p-4 flex flex-col gap-3 cursor-pointer hover:border-lios-green/30 transition-colors group"
      onClick={() => navigate(`/app/alunos/inteligencia/${group.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-subtitle text-white truncate">{group.name}</h3>
          {group.description && (
            <p className="text-xs font-body text-lios-gray-400 mt-0.5 line-clamp-1">
              {group.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            title={statusConfig.label}
            className={cn('w-2 h-2 rounded-full shrink-0', statusConfig.dot)}
          />
          <ChevronRight
            size={16}
            className="text-lios-gray-400 group-hover:text-lios-green transition-colors"
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4 text-xs font-body text-lios-gray-400">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {formatNumber(group.member_count)}
        </span>
        <span className="ml-auto">
          {group.last_analyzed_at ? formatRelativeDate(group.last_analyzed_at) : 'Não analisado'}
        </span>
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topCategories.slice(0, 3).map((cat) => (
            <CategoryPill key={cat} category={cat} />
          ))}
        </div>
      )}
    </Card>
  );
}
