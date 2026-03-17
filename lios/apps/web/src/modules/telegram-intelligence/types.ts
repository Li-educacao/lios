/* ─── Telegram Intelligence — Shared Types ───────────────────────────────── */

export interface TgGroup {
  id: string;
  telegram_id: number;
  name: string;
  description: string | null;
  member_count: number | null;
  group_type: string | null;
  is_active: boolean;
  last_collected_at: string | null;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TgInsight {
  id: string;
  summary_id: string;
  group_id: string;
  category: InsightCategory;
  title: string | null;
  content: string;
  attributed_to: string | null;
  source_msg_ids: number[] | null;
  relevance_score: number | null;
  tags: string[] | null;
  created_at: string;
}

export interface TgSummary {
  id: string;
  group_id: string;
  period_start: string;
  period_end: string;
  total_messages: number | null;
  substantive_messages: number | null;
  unique_participants: number | null;
  executive_summary: string | null;
  full_analysis: Record<string, unknown> | null;
  relationship_map: RelationshipMap | null;
  links_shared: Record<string, string[]> | null;
  polls_data: Record<string, unknown> | null;
  model_used: string;
  status: string;
  created_at: string;
}

export interface TgNotableMember {
  id: string;
  group_id: string;
  telegram_name: string;
  telegram_id: number | null;
  message_count: number;
  substantive_count: number;
  topics: string[] | null;
  expertise_areas: string[] | null;
  opportunity_type: string | null;
  notes: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelationshipMap {
  pairs: Array<{
    from: string;
    to: string;
    count: number;
  }>;
  hubs: Array<{
    name: string;
    role: string;
  }>;
}

export interface TgStats {
  total_groups: number;
  total_messages: number;
  total_insights: number;
  last_analysis: string | null;
}

export interface TgMetricsSLA {
  promised: string;
  support_weekday_median_min: number;
  support_weekend_median_min: number;
  group_weekday_median_min: number;
  group_weekend_median_min: number;
  support_commercial_median_min: number;
  group_commercial_median_min: number;
}

export interface TgMetricsEngagement {
  total_participants: number;
  high: number;
  medium: number;
  low: number;
  zero: number;
}

export interface TgMetricsDefect {
  name: string;
  count: number;
}

export interface TgMetricsBrandDefect {
  brand: string;
  count: number;
}

export interface TgMetricsResponseTime {
  support_first_pct: number;
  group_first_pct: number;
  total_responses: number;
}

export interface TgMetrics {
  sla: TgMetricsSLA;
  engagement: TgMetricsEngagement;
  top_defects: TgMetricsDefect[];
  top_brand_defects: TgMetricsBrandDefect[];
  response_time: TgMetricsResponseTime;
}

// ─── Insight categories (match DB CHECK constraint) ──────────────────────────

export type InsightCategory =
  | 'insight'
  | 'idea'
  | 'actionable_plan'
  | 'framework'
  | 'tactic'
  | 'experiment'
  | 'result'
  | 'mistake_learning'
  | 'pattern'
  | 'opportunity'
  | 'tool'
  | 'quote'
  | 'question'
  | 'contradiction'
  | 'content_idea'
  | 'notable_member';

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  insight: 'Insights',
  idea: 'Ideias',
  actionable_plan: 'Planos',
  framework: 'Frameworks',
  tactic: 'Táticas',
  experiment: 'Experimentos',
  result: 'Resultados',
  mistake_learning: 'Erros & Lições',
  pattern: 'Padrões',
  opportunity: 'Oportunidades',
  tool: 'Ferramentas',
  quote: 'Quotes',
  question: 'Perguntas',
  contradiction: 'Contradições',
  content_idea: 'Ideias de Conteúdo',
  notable_member: 'Membros Notáveis',
};

export const CATEGORY_COLORS: Record<InsightCategory, { bg: string; text: string; border: string }> = {
  insight:          { bg: 'bg-violet-500/15',  text: 'text-violet-400',  border: 'border-violet-500/30' },
  idea:             { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    border: 'border-cyan-500/30' },
  actionable_plan:  { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  framework:        { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30' },
  tactic:           { bg: 'bg-lios-green/15',  text: 'text-lios-green',  border: 'border-lios-green/30' },
  experiment:       { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/30' },
  result:           { bg: 'bg-pink-500/15',    text: 'text-pink-400',    border: 'border-pink-500/30' },
  mistake_learning: { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30' },
  pattern:          { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  opportunity:      { bg: 'bg-teal-500/15',    text: 'text-teal-400',    border: 'border-teal-500/30' },
  tool:             { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  border: 'border-indigo-500/30' },
  quote:            { bg: 'bg-amber-500/15',   text: 'text-amber-400',   border: 'border-amber-500/30' },
  question:         { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
  contradiction:    { bg: 'bg-lime-500/15',    text: 'text-lime-400',    border: 'border-lime-500/30' },
  content_idea:     { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30' },
  notable_member:   { bg: 'bg-white/10',       text: 'text-lios-gray-300', border: 'border-white/15' },
};
