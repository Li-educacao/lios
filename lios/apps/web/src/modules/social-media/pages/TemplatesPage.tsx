import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CarouselTemplate } from '@carousel/shared';
import { api } from '../../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../../../components/ui';

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  educational: 'Educacional',
  social_proof: 'Prova Social',
  tips_list: 'Lista de Dicas',
  cover_cta: 'Capa / CTA',
};

interface TemplateListResponse {
  data: CarouselTemplate[];
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CarouselTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: apiError } = await api.get<TemplateListResponse>('/api/v1/templates');
      setLoading(false);

      if (apiError) {
        setError(apiError.message);
        return;
      }

      setTemplates(data?.data ?? []);
    }

    load();
  }, []);

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-heading text-white">Templates</h2>
          <p className="text-sm font-body text-brand-gray mt-1">
            Escolha um template para criar seu proximo carrossel
          </p>
        </div>

        {/* Built-in template types */}
        <div className="mb-10">
          <h3 className="text-sm font-subtitle text-brand-gray uppercase tracking-wider mb-4">
            Tipos de template
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(TEMPLATE_TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => navigate('/new')}
                className="text-left rounded-xl border border-brand-gray/20 bg-white/5 p-5 hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-colors group"
              >
                <p className="text-base font-subtitle text-white group-hover:text-brand-blue transition-colors">
                  {label}
                </p>
                <p className="text-xs font-body text-brand-gray mt-1">
                  {key === 'educational' && 'Passo a passo tecnico e didatico'}
                  {key === 'social_proof' && 'Resultados e depoimentos de alunos'}
                  {key === 'tips_list' && 'Dicas numeradas e praticas'}
                  {key === 'cover_cta' && 'Slide chamativo com chamada de acao'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* DB templates */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-body">
            {error}
          </div>
        )}

        {!loading && templates.length > 0 && (
          <div>
            <h3 className="text-sm font-subtitle text-brand-gray uppercase tracking-wider mb-4">
              Templates personalizados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} variant="elevated">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.is_default && (
                        <Badge variant="info">Padrao</Badge>
                      )}
                    </div>
                    {template.description && (
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={() => navigate('/new')}
                      className="text-xs font-subtitle text-brand-blue hover:text-brand-blue/80 transition-colors"
                    >
                      Usar este template
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
