import { useState, useEffect, useCallback } from 'react';
import { Brain } from 'lucide-react';
import { api } from '../../../lib/api';
import { useGroups } from '../hooks/useGroups';
import { useInsights } from '../hooks/useInsights';
import { StatsBar } from '../components/StatsBar';
import { GroupCard } from '../components/GroupCard';
import { InsightCard } from '../components/InsightCard';
import { CategoryFilter } from '../components/CategoryFilter';
import type { TgStats, InsightCategory, TgGroup, TgInsight } from '../types';
import { CATEGORY_LABELS } from '../types';

// ─── Category breakdown ────────────────────────────────────────────────────────

function computeCounts(insights: TgInsight[]): Partial<Record<InsightCategory, number>> {
  const counts: Partial<Record<InsightCategory, number>> = {};
  for (const insight of insights) {
    counts[insight.category] = (counts[insight.category] ?? 0) + 1;
  }
  return counts;
}

// ─── Top categories per group ──────────────────────────────────────────────────

function topCategoriesForGroup(
  insights: TgInsight[],
  groupId: string
): InsightCategory[] {
  const grouped = insights.filter((i) => i.group_id === groupId);
  const counts = computeCounts(grouped);
  return (Object.entries(counts) as [InsightCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);
}

// ─── CategoryBreakdown ─────────────────────────────────────────────────────────

function CategoryBreakdown({
  counts,
  total,
}: {
  counts: Partial<Record<InsightCategory, number>>;
  total: number;
}) {
  if (total === 0) return null;

  const sorted = (Object.entries(counts) as [InsightCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {sorted.map(([cat, count]) => (
        <div
          key={cat}
          className="rounded-lg border border-lios-border bg-lios-surface p-3"
        >
          <p className="text-lg font-heading text-lios-green">{count}</p>
          <p className="text-xs font-body text-lios-gray-400 mt-0.5">
            {CATEGORY_LABELS[cat]}
          </p>
          <div className="mt-2 h-1 rounded-full bg-lios-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-lios-green/60"
              style={{ width: `${Math.round((count / total) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function GroupCardSkeleton() {
  return (
    <div className="rounded-xl border border-lios-border bg-lios-surface p-4 h-32 animate-pulse" />
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function IntelligenceDashboard() {
  const [stats, setStats] = useState<TgStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | null>(null);

  const { groups, loading: groupsLoading, fetchGroups } = useGroups();
  const { insights, loading: insightsLoading, fetchInsights } = useInsights();

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const { data } = await api.get<TgStats>('/api/v1/telegram/stats');
    setStatsLoading(false);
    if (data) setStats(data);
  }, []);

  useEffect(() => {
    loadStats();
    fetchGroups();
    fetchInsights({ limit: 50 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload insights when category filter changes
  useEffect(() => {
    fetchInsights({ category: categoryFilter ?? undefined, limit: 50 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const categoryCounts = computeCounts(insights);
  const totalInsights = Object.values(categoryCounts).reduce((a, b) => a + (b ?? 0), 0);

  const filteredInsights = categoryFilter
    ? insights.filter((i) => i.category === categoryFilter)
    : insights;

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-lios-green/15 flex items-center justify-center">
            <Brain size={20} className="text-lios-green" />
          </div>
          <div>
            <h2 className="text-2xl font-heading text-white">Inteligência Telegram</h2>
            <p className="text-sm font-body text-lios-gray-400 mt-0.5">
              Análise de grupos e extração de insights pedagógicos
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <StatsBar stats={stats} loading={statsLoading} />

        {/* Groups section */}
        <section className="mb-10">
          <h3 className="text-base font-subtitle text-white mb-4">
            Grupos monitorados
            {!groupsLoading && (
              <span className="ml-2 text-sm font-body text-lios-gray-400">
                ({groups.length})
              </span>
            )}
          </h3>

          {groupsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <GroupCardSkeleton key={i} />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-lios-border bg-lios-surface p-10 text-center">
              <p className="text-sm font-body text-lios-gray-400">
                Nenhum grupo monitorado ainda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group: TgGroup) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  topCategories={topCategoriesForGroup(insights, group.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Category breakdown */}
        {totalInsights > 0 && (
          <section className="mb-10">
            <h3 className="text-base font-subtitle text-white mb-4">
              Distribuição por categoria
            </h3>
            <CategoryBreakdown counts={categoryCounts} total={totalInsights} />
          </section>
        )}

        {/* Recent insights feed */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-subtitle text-white">
              Insights recentes
              {!insightsLoading && (
                <span className="ml-2 text-sm font-body text-lios-gray-400">
                  ({filteredInsights.length})
                </span>
              )}
            </h3>
          </div>

          {/* Category filter */}
          <div className="mb-4 overflow-x-auto pb-1">
            <CategoryFilter
              selected={categoryFilter}
              onChange={setCategoryFilter}
              counts={categoryCounts}
            />
          </div>

          {insightsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-lios-border bg-lios-surface h-20 animate-pulse"
                />
              ))}
            </div>
          ) : filteredInsights.length === 0 ? (
            <div className="py-10 text-center text-sm font-body text-lios-gray-400">
              Nenhum insight encontrado para esta categoria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} showGroup />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
