import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Calendar,
  Star,
  Link2,
  Brain,
} from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { useInsights } from '../hooks/useInsights';
import { useSummaries } from '../hooks/useSummaries';
import { api } from '../../../lib/api';
import { InsightCard } from '../components/InsightCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { RelationshipMap } from '../components/RelationshipMap';
import { TimelineView } from '../components/TimelineView';
import { cn } from '../../../lib/utils';
import type {
  TgGroup,
  TgNotableMember,
  InsightCategory,
  RelationshipMap as RelationshipMapType,
} from '../types';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/* ─── Tab definitions ──────────────────────────────────────────────────────── */

type Tab = 'resumo' | 'insights' | 'relacionamentos' | 'links' | 'membros' | 'timeline';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'resumo',          label: 'Resumo Executivo',    icon: <Brain size={14} /> },
  { id: 'insights',        label: 'Insights',            icon: <Brain size={14} /> },
  { id: 'relacionamentos', label: 'Relacionamentos',     icon: <Users size={14} /> },
  { id: 'links',           label: 'Links',               icon: <Link2 size={14} /> },
  { id: 'membros',         label: 'Membros Notáveis',    icon: <Star size={14} /> },
  { id: 'timeline',        label: 'Timeline',            icon: <Calendar size={14} /> },
];

/* ─── NotableMemberCard ────────────────────────────────────────────────────── */

function NotableMemberCard({ member }: { member: TgNotableMember }) {
  const initials = (member.telegram_name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="rounded-xl border border-lios-border bg-lios-surface p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-lios-green/15 flex items-center justify-center shrink-0">
        <span className="text-sm font-subtitle text-lios-green">{initials}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-subtitle text-white truncate">
          {member.telegram_name ?? 'Desconhecido'}
        </p>
        {member.opportunity_type && (
          <p className="text-xs font-body text-lios-green/80 mt-0.5">{member.opportunity_type}</p>
        )}
        {member.notes && (
          <p className="text-xs font-body text-lios-gray-400 mt-0.5 line-clamp-2">{member.notes}</p>
        )}
        {(member.expertise_areas ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(member.expertise_areas ?? []).slice(0, 3).map((area, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded text-[10px] font-body bg-white/5 text-lios-gray-300 border border-lios-border"
              >
                {area}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-heading text-lios-green">{formatNumber(member.substantive_count)}</p>
        <p className="text-[10px] font-body text-lios-gray-400">msgs relevantes</p>
      </div>
    </div>
  );
}

/* ─── LinksSection ─────────────────────────────────────────────────────────── */

function LinksSection({ links }: { links: Record<string, string[]> }) {
  const entries = Object.entries(links).filter(([, urls]) => urls.length > 0);

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-sm font-body text-lios-gray-400">
        Nenhum link compartilhado encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entries.map(([key, items]) => (
        <div key={key}>
          <h4 className="text-sm font-subtitle text-white mb-3 capitalize">{key}</h4>
          <ul className="space-y-1.5">
            {items.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-body text-lios-green hover:text-lios-green/80 transition-colors group"
                >
                  <Link2 size={12} className="shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ─── GroupDetailPage ──────────────────────────────────────────────────────── */

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<TgGroup | null>(null);
  const [notableMembers, setNotableMembers] = useState<TgNotableMember[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('resumo');
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | null>(null);

  const { fetchGroup, loading: groupLoading } = useGroups();
  const { insights, loading: insightsLoading, fetchInsights } = useInsights();
  const { summaries, loading: summariesLoading, fetchSummaries } = useSummaries();

  const loadAll = useCallback(async () => {
    if (!groupId) return;

    const [groupData] = await Promise.all([
      fetchGroup(groupId),
      fetchInsights({ group_id: groupId, limit: 200 }),
      fetchSummaries(groupId),
    ]);

    if (groupData) setGroup(groupData);

    // Fetch notable members
    const { data } = await api.get<{ data: TgNotableMember[] }>(
      `/api/v1/telegram/groups/${groupId}/members`
    );
    if (data) setNotableMembers(data.data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Latest summary for executive summary tab
  const latestSummary = summaries.length > 0
    ? summaries.reduce((a, b) =>
        new Date(a.period_end) > new Date(b.period_end) ? a : b
      )
    : null;

  // Filtered insights
  const filteredInsights = categoryFilter
    ? insights.filter((i) => i.category === categoryFilter)
    : insights;

  // Category counts
  const categoryCounts: Partial<Record<InsightCategory, number>> = {};
  for (const insight of insights) {
    categoryCounts[insight.category] = (categoryCounts[insight.category] ?? 0) + 1;
  }

  if (groupLoading && !group) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-8 w-48 rounded-lg bg-lios-surface animate-pulse" />
          <div className="h-24 rounded-xl bg-lios-surface animate-pulse" />
        </div>
      </div>
    );
  }

  if (!group && !groupLoading) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm font-body text-lios-gray-400">Grupo não encontrado.</p>
        <button
          onClick={() => navigate('/app/alunos/inteligencia')}
          className="mt-4 text-sm font-subtitle text-lios-green hover:text-lios-green/80"
        >
          Voltar para inteligência
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Back link */}
        <button
          onClick={() => navigate('/app/alunos/inteligencia')}
          className="flex items-center gap-1.5 text-sm font-body text-lios-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Inteligência Telegram
        </button>

        {/* Group header */}
        {group && (
          <div className="rounded-xl border border-lios-border bg-lios-surface p-6 mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-heading text-white">{group.name}</h2>
                {group.description && (
                  <p className="text-sm font-body text-lios-gray-400 mt-1 max-w-xl">
                    {group.description}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-subtitle border',
                  group.is_active
                    ? 'bg-lios-green/15 text-lios-green border-lios-green/30'
                    : 'bg-white/5 text-lios-gray-400 border-lios-border'
                )}
              >
                {group.is_active ? 'Ativo' : 'Inativo'}
              </div>
            </div>

            {/* Meta stats */}
            <div className="mt-4 flex flex-wrap gap-6 text-sm font-body text-lios-gray-400">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-lios-green" />
                {formatNumber(group.member_count)} membros
              </span>
              {group.last_collected_at && (
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  Coletado em {formatDate(group.last_collected_at)}
                </span>
              )}
              {group.last_analyzed_at && (
                <span className="flex items-center gap-1.5">
                  <Brain size={14} />
                  Analisado em {formatDate(group.last_analyzed_at)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-lios-border mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-subtitle whitespace-nowrap border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'text-lios-green border-lios-green'
                  : 'text-lios-gray-400 border-transparent hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Resumo Executivo */}
        {activeTab === 'resumo' && (
          <div>
            {summariesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-6 rounded-lg bg-lios-surface animate-pulse" />
                ))}
              </div>
            ) : !latestSummary ? (
              <div className="py-10 text-center text-sm font-body text-lios-gray-400">
                Nenhum resumo disponível para este grupo.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-lios-border bg-lios-surface p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-body text-lios-gray-400">
                      Período: {formatDate(latestSummary.period_start)} — {formatDate(latestSummary.period_end)}
                    </span>
                  </div>
                  <p className="text-sm font-body text-lios-gray-300 leading-relaxed">
                    {latestSummary.executive_summary}
                  </p>
                </div>

                {latestSummary.total_messages !== null && (
                  <div className="flex flex-wrap gap-4 text-sm font-body text-lios-gray-400">
                    <span>
                      <span className="font-subtitle text-white">{latestSummary.total_messages}</span> mensagens totais
                    </span>
                    {latestSummary.substantive_messages !== null && (
                      <span>
                        <span className="font-subtitle text-white">{latestSummary.substantive_messages}</span> substanciais
                      </span>
                    )}
                    {latestSummary.unique_participants !== null && (
                      <span>
                        <span className="font-subtitle text-white">{latestSummary.unique_participants}</span> participantes
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Insights */}
        {activeTab === 'insights' && (
          <div>
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
                  <div key={i} className="rounded-xl border border-lios-border bg-lios-surface h-20 animate-pulse" />
                ))}
              </div>
            ) : filteredInsights.length === 0 ? (
              <div className="py-10 text-center text-sm font-body text-lios-gray-400">
                Nenhum insight encontrado.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInsights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Relacionamentos */}
        {activeTab === 'relacionamentos' && (
          <div>
            {summariesLoading ? (
              <div className="h-48 rounded-xl bg-lios-surface animate-pulse" />
            ) : !latestSummary?.relationship_map ? (
              <div className="py-10 text-center text-sm font-body text-lios-gray-400">
                Nenhum mapa de relacionamentos disponível.
              </div>
            ) : (
              <RelationshipMap data={latestSummary.relationship_map as RelationshipMapType} />
            )}
          </div>
        )}

        {/* Tab: Links */}
        {activeTab === 'links' && (
          <div>
            {summariesLoading ? (
              <div className="h-32 rounded-xl bg-lios-surface animate-pulse" />
            ) : !latestSummary?.links_shared ? (
              <div className="py-10 text-center text-sm font-body text-lios-gray-400">
                Nenhum link compartilhado disponível.
              </div>
            ) : (
              <LinksSection links={latestSummary.links_shared as Record<string, string[]>} />
            )}
          </div>
        )}

        {/* Tab: Membros Notáveis */}
        {activeTab === 'membros' && (
          <div>
            {notableMembers.length === 0 ? (
              <div className="py-10 text-center text-sm font-body text-lios-gray-400">
                Nenhum membro notável identificado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {notableMembers.map((member) => (
                  <NotableMemberCard key={member.id} member={member} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Timeline */}
        {activeTab === 'timeline' && (
          <TimelineView summaries={summaries} loading={summariesLoading} />
        )}
      </div>
    </div>
  );
}
