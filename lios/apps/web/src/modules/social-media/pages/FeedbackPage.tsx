import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '../../../components/ui';
import { cn } from '../../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackStats {
  total_corrections: number;
  by_field: { headline: number; body_text: number; cta_text: number };
  by_template: Record<string, number>;
  recent_corrections: Array<{
    field: string;
    original: string;
    corrected: string;
    template_type: string;
    theme: string;
    created_at: string;
  }>;
  learning_active: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEARNING_THRESHOLD = 20;

const FIELD_LABELS: Record<string, string> = {
  headline: 'Headline',
  body_text: 'Texto do corpo',
  cta_text: 'CTA',
};

const TEMPLATE_LABELS: Record<string, string> = {
  educational: 'Educacional',
  social_proof: 'Prova Social',
  tips_list: 'Lista de Dicas',
  cover_cta: 'Capa/CTA',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-subtitle text-brand-gray">{label}</span>
        <span className="text-sm font-heading text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-brand-blue transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CorrectionItem({
  correction,
}: {
  correction: FeedbackStats['recent_corrections'][number];
}) {
  const date = new Date(correction.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className="py-3 border-b border-brand-gray/10 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="info">{FIELD_LABELS[correction.field] ?? correction.field}</Badge>
          {correction.template_type && (
            <Badge variant="default">{TEMPLATE_LABELS[correction.template_type] ?? correction.template_type}</Badge>
          )}
        </div>
        <span className="text-xs font-body text-brand-gray">{date}</span>
      </div>
      {correction.theme && (
        <p className="text-xs font-body text-brand-gray/60 mb-2">Tema: {correction.theme}</p>
      )}
      <div className="grid grid-cols-1 gap-1">
        <div className="flex items-start gap-2">
          <span className="text-xs font-subtitle text-red-400 min-w-[60px]">Original:</span>
          <span className="text-xs font-body text-brand-gray line-through">
            {correction.original || '(vazio)'}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-xs font-subtitle text-green-400 min-w-[60px]">Corrigido:</span>
          <span className="text-xs font-body text-white">
            {correction.corrected || '(vazio)'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: apiError } = await api.get<FeedbackStats>('/api/v1/feedback/stats');
      setLoading(false);

      if (apiError) {
        setError(apiError.message);
        return;
      }

      setStats(data);
    }

    load();
  }, []);

  const totalField = stats
    ? stats.by_field.headline + stats.by_field.body_text + stats.by_field.cta_text
    : 0;

  const templateEntries = stats
    ? Object.entries(stats.by_template).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-heading text-white">Aprendizado da IA</h2>
          <p className="text-sm font-body text-brand-gray mt-1">
            Estatisticas de correcoes para melhorar a geracao de textos
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-body">
            {error}
          </div>
        )}

        {/* Content */}
        {stats && !loading && (
          <div className="space-y-6">
            {/* Overview row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total corrections */}
              <Card className="text-center">
                <CardContent>
                  <p className="text-4xl font-heading text-brand-blue mt-2">
                    {stats.total_corrections}
                  </p>
                  <p className="text-sm font-body text-brand-gray mt-1">Correcoes totais</p>
                </CardContent>
              </Card>

              {/* Learning status */}
              <Card className={cn('text-center', stats.learning_active ? 'border-green-500/30' : 'border-brand-gray/20')}>
                <CardContent>
                  <div className={cn(
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-subtitle mt-2',
                    stats.learning_active
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-brand-gray/20 text-brand-gray'
                  )}>
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      stats.learning_active ? 'bg-green-400' : 'bg-brand-gray'
                    )} />
                    {stats.learning_active ? 'Ativo' : 'Inativo'}
                  </div>
                  <p className="text-sm font-body text-brand-gray mt-2">Aprendizado</p>
                  {!stats.learning_active && (
                    <p className="text-xs font-body text-brand-gray/60 mt-1">
                      {LEARNING_THRESHOLD - stats.total_corrections} correcoes restantes
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Progress to threshold */}
              <Card>
                <CardContent>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-body text-brand-gray">Progresso</span>
                      <span className="text-xs font-heading text-white">
                        {Math.min(stats.total_corrections, LEARNING_THRESHOLD)}/{LEARNING_THRESHOLD}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10">
                      <div
                        className={cn(
                          'h-3 rounded-full transition-all duration-700',
                          stats.learning_active ? 'bg-green-400' : 'bg-brand-blue'
                        )}
                        style={{
                          width: `${Math.min(100, Math.round((stats.total_corrections / LEARNING_THRESHOLD) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs font-body text-brand-gray/60 mt-2">
                      para ativar o aprendizado
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* By field */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Correcoes por campo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatBar label="Headline" value={stats.by_field.headline} max={totalField} />
                <StatBar label="Texto do corpo" value={stats.by_field.body_text} max={totalField} />
                <StatBar label="CTA" value={stats.by_field.cta_text} max={totalField} />
              </CardContent>
            </Card>

            {/* By template */}
            {templateEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Correcoes por template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {templateEntries.map(([template, count]) => (
                    <StatBar
                      key={template}
                      label={TEMPLATE_LABELS[template] ?? template}
                      value={count}
                      max={stats.total_corrections}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent corrections */}
            {stats.recent_corrections.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Correcoes recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.recent_corrections.map((correction, idx) => (
                    <CorrectionItem key={idx} correction={correction} />
                  ))}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <p className="text-brand-gray font-body">
                  Nenhuma correcao registrada ainda.
                </p>
                <p className="text-sm font-body text-brand-gray/60 mt-2">
                  Edite textos gerados pela IA para comecar o aprendizado.
                </p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => navigate('/app/social-media/new')}
                >
                  Criar Carrossel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
