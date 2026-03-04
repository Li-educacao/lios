import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Carousel } from '@carousel/shared';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Modal } from '../../../components/ui';
import { useCarousel } from '../hooks/useCarousel';
import { useToast } from '../../../contexts/ToastContext';
import { cn } from '../../../lib/utils';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  text_validated: 'Validado',
  images_generated: 'Imagens',
  exported: 'Exportado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  draft: 'default',
  text_validated: 'info',
  images_generated: 'warning',
  exported: 'success',
};

const FILTER_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Validado', value: 'text_validated' },
  { label: 'Imagens', value: 'images_generated' },
  { label: 'Exportado', value: 'exported' },
];

const LIMIT = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `ha ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours} hora${hours !== 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `ha ${days} dia${days !== 1 ? 's' : ''}`;

  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

// ─── StatusCounters ────────────────────────────────────────────────────────────

interface Counts {
  total: number;
  draft: number;
  images_generated: number;
  exported: number;
}

function StatusCounters({ counts }: { counts: Counts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <Card className="p-4 text-center">
        <p className="text-2xl font-heading text-white">{counts.total}</p>
        <p className="text-xs font-body text-brand-gray mt-1">Total</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-heading text-brand-gray">{counts.draft}</p>
        <p className="text-xs font-body text-brand-gray mt-1">Rascunhos</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-heading text-yellow-400">{counts.images_generated}</p>
        <p className="text-xs font-body text-brand-gray mt-1">Com imagens</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-heading text-green-400">{counts.exported}</p>
        <p className="text-xs font-body text-brand-gray mt-1">Exportados</p>
      </Card>
    </div>
  );
}

// ─── CarouselCard ──────────────────────────────────────────────────────────────

function CarouselCard({
  carousel,
  onEdit,
  onDuplicate,
  onDelete,
  duplicating,
}: {
  carousel: Carousel;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (carousel: Carousel) => void;
  duplicating: boolean;
}) {
  return (
    <Card variant="elevated" className="flex flex-col">
      {/* Thumbnail placeholder or slide image */}
      <div className="w-full aspect-square rounded-lg bg-white/5 mb-4 overflow-hidden flex items-center justify-center">
        <span className="text-brand-gray/30 text-4xl font-heading">
          {carousel.slide_count}
        </span>
      </div>

      <CardHeader className="mb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{carousel.title}</CardTitle>
          <Badge variant={STATUS_VARIANTS[carousel.status] ?? 'default'}>
            {STATUS_LABELS[carousel.status] ?? carousel.status}
          </Badge>
        </div>
        <CardDescription className="mt-1 line-clamp-2">
          {carousel.theme}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-3 text-xs font-body text-brand-gray">
          <span>{carousel.slide_count} slides</span>
          <span>&middot;</span>
          <span>{formatRelativeDate(carousel.created_at)}</span>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onEdit(carousel.id)}>
          Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDuplicate(carousel.id)}
          disabled={duplicating}
        >
          Duplicar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(carousel)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          Deletar
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-brand-gray/20 bg-white/5 p-6 flex flex-col gap-3">
      <div className="aspect-square rounded-lg bg-white/10 animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
      <div className="h-3 w-1/3 rounded bg-white/10 animate-pulse mt-2" />
      <div className="flex gap-2 mt-2">
        <div className="h-8 w-16 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-8 w-16 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-8 w-16 rounded-lg bg-white/10 animate-pulse" />
      </div>
    </div>
  );
}

// ─── DeleteConfirmModal ────────────────────────────────────────────────────────

function DeleteConfirmModal({
  carousel,
  onConfirm,
  onCancel,
  loading,
}: {
  carousel: Carousel | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Modal
      isOpen={carousel !== null}
      onClose={onCancel}
      title="Confirmar exclusao"
    >
      <div className="space-y-4">
        <p className="text-sm font-body text-brand-gray">
          Tem certeza que deseja deletar o carrossel{' '}
          <strong className="text-white">"{carousel?.title}"</strong>?
          Esta acao nao pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? 'Deletando...' : 'Sim, deletar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCarousels, deleteCarousel, duplicateCarousel, loading } = useCarousel();
  const { addToast } = useToast();

  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts>({ total: 0, draft: 0, images_generated: 0, exported: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deletingCarousel, setDeletingCarousel] = useState<Carousel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const pages = Math.ceil(total / LIMIT);

  // Show success after validation redirect
  useEffect(() => {
    const state = location.state as { validated?: string } | null;
    if (state?.validated) {
      addToast('Textos validados com sucesso!', 'success');
      navigate('/', { replace: true, state: null });
    }
  }, [location.state, navigate, addToast]);

  const load = useCallback(
    async (p: number, filter: string, q: string) => {
      const result = await getCarousels(p, LIMIT, filter || undefined, q || undefined);
      if (result) {
        setCarousels(result.data);
        setTotal(result.pagination.total);
      }
    },
    [getCarousels]
  );

  // Load counts (no filter, no search, larger limit to get accurate counts)
  const loadCounts = useCallback(async () => {
    const result = await getCarousels(1, 1000);
    if (result) {
      const all = result.data;
      setCounts({
        total: result.pagination.total,
        draft: all.filter((c) => c.status === 'draft').length,
        images_generated: all.filter((c) => c.status === 'images_generated').length,
        exported: all.filter((c) => c.status === 'exported').length,
      });
    }
  }, [getCarousels]);

  useEffect(() => {
    load(page, statusFilter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  async function handleDelete() {
    if (!deletingCarousel) return;
    setDeleting(true);
    const ok = await deleteCarousel(deletingCarousel.id);
    setDeleting(false);

    if (ok) {
      setCarousels((prev) => prev.filter((c) => c.id !== deletingCarousel.id));
      setTotal((prev) => prev - 1);
      setCounts((prev) => ({
        ...prev,
        total: prev.total - 1,
        draft: deletingCarousel.status === 'draft' ? prev.draft - 1 : prev.draft,
        images_generated: deletingCarousel.status === 'images_generated' ? prev.images_generated - 1 : prev.images_generated,
        exported: deletingCarousel.status === 'exported' ? prev.exported - 1 : prev.exported,
      }));
      addToast('Carrossel deletado', 'success');
    } else {
      addToast('Falha ao deletar carrossel', 'error');
    }
    setDeletingCarousel(null);
  }

  async function handleDuplicate(id: string) {
    setDuplicatingId(id);
    const result = await duplicateCarousel(id);
    setDuplicatingId(null);

    if (result) {
      addToast('Carrossel duplicado com sucesso', 'success');
      load(1, statusFilter, search);
      loadCounts();
      setPage(1);
    } else {
      addToast('Falha ao duplicar carrossel', 'error');
    }
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading text-white">Meus Carrosseis</h2>
            <p className="text-sm font-body text-brand-gray mt-1">
              {total === 0 ? 'Nenhum carrossel criado ainda' : `${total} carrossel${total !== 1 ? 'is' : ''}`}
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/new')}>
            + Novo Carrossel
          </Button>
        </div>

        {/* Status counters */}
        <StatusCounters counts={counts} />

        {/* Filter bar + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFilterChange(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-subtitle transition-colors',
                  statusFilter === opt.value
                    ? 'bg-brand-blue text-white'
                    : 'bg-white/5 text-brand-gray hover:text-white hover:bg-white/10 border border-brand-gray/20'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto">
            <input
              type="search"
              placeholder="Buscar por titulo ou tema..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn(
                'h-9 w-full sm:w-64 rounded-lg border border-brand-gray/30 bg-white/5 px-3 text-sm text-white placeholder:text-brand-gray/50 font-body',
                'focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors'
              )}
            />
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && carousels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <span className="text-3xl font-heading text-brand-gray/40">&#9741;</span>
            </div>
            <p className="text-white font-subtitle text-lg mb-2">
              {search || statusFilter ? 'Nenhum resultado encontrado' : 'Crie seu primeiro carrossel'}
            </p>
            <p className="text-sm font-body text-brand-gray mb-6">
              {search || statusFilter
                ? 'Tente outros filtros ou termos de busca'
                : 'Comece criando um carrossel para o Instagram'}
            </p>
            {!search && !statusFilter && (
              <Button variant="primary" size="lg" onClick={() => navigate('/new')}>
                Criar Carrossel
              </Button>
            )}
          </div>
        )}

        {/* Carousel grid */}
        {!loading && carousels.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {carousels.map((c) => (
                <CarouselCard
                  key={c.id}
                  carousel={c}
                  onEdit={(id) => navigate(`/carousel/${id}`)}
                  onDuplicate={handleDuplicate}
                  onDelete={setDeletingCarousel}
                  duplicating={duplicatingId === c.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-subtitle transition-colors',
                      p === page
                        ? 'bg-brand-blue text-white'
                        : 'text-brand-gray hover:text-white hover:bg-white/10'
                    )}
                  >
                    {p}
                  </button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page === pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Proxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      <DeleteConfirmModal
        carousel={deletingCarousel}
        onConfirm={handleDelete}
        onCancel={() => setDeletingCarousel(null)}
        loading={deleting}
      />
    </div>
  );
}
