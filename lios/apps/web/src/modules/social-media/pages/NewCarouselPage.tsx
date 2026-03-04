import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { TemplateType, CarouselSlide, Carousel } from '@carousel/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Modal } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { useCarousel } from '../hooks/useCarousel';
import { useRender } from '../hooks/useRender';
import { useExport } from '../hooks/useExport';
import { SlidePreview } from '../components/SlidePreview';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlideState extends CarouselSlide {
  originalHeadline: string;
  originalBodyText: string;
  originalCtaText: string;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

interface CarouselMeta {
  suggested_hashtags: string[];
  suggested_caption: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { value: 'educational', label: 'Educacional', description: 'Passo a passo técnico e didático' },
  { value: 'social_proof', label: 'Prova Social', description: 'Resultados e depoimentos de alunos' },
  { value: 'tips_list', label: 'Lista de Dicas', description: 'Dicas numeradas e práticas' },
  { value: 'cover_cta', label: 'Capa / CTA', description: 'Slide chamativo com chamada de ação' },
];

const STEPS = [
  { number: 1, label: 'Ideia' },
  { number: 2, label: 'Textos' },
  { number: 3, label: 'Design' },
  { number: 4, label: 'Exportar' },
];

const CHAR_LIMITS = { headline: 60, body_text: 200, cta_text: 30 };
const AUTOSAVE_DELAY_MS = 3000;

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.number} className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-subtitle transition-colors',
              currentStep === step.number
                ? 'bg-brand-blue text-white'
                : currentStep > step.number
                  ? 'bg-brand-blue/30 text-brand-blue'
                  : 'bg-white/10 text-brand-gray'
            )}
          >
            {step.number}
          </div>
          <span
            className={cn(
              'text-sm font-subtitle hidden sm:block',
              currentStep === step.number ? 'text-white' : 'text-brand-gray'
            )}
          >
            {step.label}
          </span>
          {idx < STEPS.length - 1 && (
            <div
              className={cn(
                'w-8 sm:w-16 h-px mx-1',
                currentStep > step.number ? 'bg-brand-blue/50' : 'bg-white/10'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CharCounter({
  value,
  max,
}: {
  value: string;
  max: number;
}) {
  const len = value.length;
  const pct = len / max;

  return (
    <span
      className={cn(
        'text-xs font-body transition-colors',
        pct >= 1 ? 'text-red-400' : pct >= 0.85 ? 'text-yellow-400' : 'text-brand-gray/50'
      )}
    >
      {len}/{max}
    </span>
  );
}

// ─── Step 1: Ideia ────────────────────────────────────────────────────────────

interface Step1Props {
  theme: string;
  onThemeChange: (v: string) => void;
  templateType: TemplateType;
  onTemplateChange: (v: TemplateType) => void;
  slideCount: number;
  onSlideCountChange: (v: number) => void;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
}

function Step1Ideia({
  theme,
  onThemeChange,
  templateType,
  onTemplateChange,
  slideCount,
  onSlideCountChange,
  onGenerate,
  loading,
  error,
}: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading text-white mb-1">Qual é o tema?</h2>
        <p className="text-sm font-body text-brand-gray">
          Descreva o assunto do seu carrossel
        </p>
      </div>

      <Input
        label="Tema do carrossel"
        placeholder="Ex: Como identificar um capacitor queimado"
        value={theme}
        onChange={(e) => onThemeChange(e.target.value)}
        disabled={loading}
      />

      <div>
        <p className="text-sm font-subtitle text-brand-gray mb-3">Tipo de template</p>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onTemplateChange(opt.value)}
              disabled={loading}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                templateType === opt.value
                  ? 'border-brand-blue bg-brand-blue/10'
                  : 'border-brand-gray/20 bg-white/5 hover:border-brand-gray/40'
              )}
            >
              <p className={cn('text-sm font-subtitle', templateType === opt.value ? 'text-brand-blue' : 'text-white')}>
                {opt.label}
              </p>
              <p className="text-xs font-body text-brand-gray mt-1">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-subtitle text-brand-gray">Número de slides</p>
          <span className="text-sm font-heading text-brand-blue">{slideCount}</span>
        </div>
        <input
          type="range"
          min={3}
          max={10}
          value={slideCount}
          onChange={(e) => onSlideCountChange(Number(e.target.value))}
          disabled={loading}
          className="w-full accent-brand-blue cursor-pointer disabled:opacity-50"
        />
        <div className="flex justify-between text-xs font-body text-brand-gray/50 mt-1">
          <span>3</span>
          <span>10</span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 font-body bg-red-500/10 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onGenerate}
        disabled={loading || theme.trim().length === 0}
      >
        {loading ? 'Gerando textos...' : 'Gerar Textos com IA'}
      </Button>
    </div>
  );
}

// ─── Slide Card (Step 2) ──────────────────────────────────────────────────────

interface SlideCardProps {
  slide: SlideState;
  onFieldChange: (
    position: number,
    field: 'headline' | 'body_text' | 'cta_text',
    value: string
  ) => void;
  onRestore: (position: number, field: 'headline' | 'body_text' | 'cta_text') => void;
  onRegenerate: (position: number) => void;
  regenerating: boolean;
}

function SlideCard({ slide, onFieldChange, onRestore, onRegenerate, regenerating }: SlideCardProps) {
  const isEdited = slide.isDirty;

  function fieldIsEdited(field: 'headline' | 'body_text' | 'cta_text') {
    const origMap = {
      headline: slide.originalHeadline,
      body_text: slide.originalBodyText,
      cta_text: slide.originalCtaText,
    };
    return slide[field] !== origMap[field];
  }

  return (
    <Card
      className={cn(
        'transition-colors',
        isEdited && 'border-brand-blue/40'
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-sm font-heading text-white">
              {slide.position}
            </span>
            <div>
              <CardTitle className="text-base">Slide {slide.position}</CardTitle>
              {slide.saveStatus === 'saving' && (
                <span className="text-xs font-body text-brand-gray">Salvando...</span>
              )}
              {slide.saveStatus === 'saved' && (
                <span className="text-xs font-body text-green-400">Salvo</span>
              )}
              {slide.saveStatus === 'error' && (
                <span className="text-xs font-body text-red-400">Erro ao salvar</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRegenerate(slide.position)}
            disabled={regenerating}
          >
            {regenerating ? 'Gerando...' : 'Regenerar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-subtitle text-brand-gray">Headline</label>
            <div className="flex items-center gap-2">
              {fieldIsEdited('headline') && (
                <button
                  onClick={() => onRestore(slide.position, 'headline')}
                  className="text-xs font-body text-brand-blue hover:text-brand-blue/80 transition-colors"
                >
                  Restaurar original
                </button>
              )}
              <CharCounter value={slide.headline} max={CHAR_LIMITS.headline} />
            </div>
          </div>
          <input
            value={slide.headline}
            onChange={(e) => onFieldChange(slide.position, 'headline', e.target.value)}
            maxLength={CHAR_LIMITS.headline + 20}
            className={cn(
              'h-10 w-full rounded-lg border bg-white/5 px-3 text-white placeholder:text-brand-gray/50 font-body',
              'focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors',
              fieldIsEdited('headline')
                ? 'border-brand-blue/50'
                : 'border-brand-gray/30',
              slide.headline.length > CHAR_LIMITS.headline
                ? 'border-red-500/50'
                : ''
            )}
            placeholder="Headline chamativo..."
          />
          {!slide.headline.trim() && (
            <p className="text-xs text-red-400 mt-1">Headline obrigatório</p>
          )}
        </div>

        {/* Body text */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-subtitle text-brand-gray">Texto do corpo</label>
            <div className="flex items-center gap-2">
              {fieldIsEdited('body_text') && (
                <button
                  onClick={() => onRestore(slide.position, 'body_text')}
                  className="text-xs font-body text-brand-blue hover:text-brand-blue/80 transition-colors"
                >
                  Restaurar original
                </button>
              )}
              <CharCounter value={slide.body_text} max={CHAR_LIMITS.body_text} />
            </div>
          </div>
          <textarea
            value={slide.body_text}
            onChange={(e) => onFieldChange(slide.position, 'body_text', e.target.value)}
            rows={3}
            maxLength={CHAR_LIMITS.body_text + 50}
            className={cn(
              'w-full rounded-lg border bg-white/5 px-3 py-2 text-white placeholder:text-brand-gray/50 font-body resize-none',
              'focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors',
              fieldIsEdited('body_text')
                ? 'border-brand-blue/50'
                : 'border-brand-gray/30',
              slide.body_text.length > CHAR_LIMITS.body_text
                ? 'border-red-500/50'
                : ''
            )}
            placeholder="Texto educativo e envolvente..."
          />
        </div>

        {/* CTA text */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-subtitle text-brand-gray">CTA</label>
            <div className="flex items-center gap-2">
              {fieldIsEdited('cta_text') && (
                <button
                  onClick={() => onRestore(slide.position, 'cta_text')}
                  className="text-xs font-body text-brand-blue hover:text-brand-blue/80 transition-colors"
                >
                  Restaurar original
                </button>
              )}
              <CharCounter value={slide.cta_text ?? ''} max={CHAR_LIMITS.cta_text} />
            </div>
          </div>
          <input
            value={slide.cta_text ?? ''}
            onChange={(e) => onFieldChange(slide.position, 'cta_text', e.target.value)}
            maxLength={CHAR_LIMITS.cta_text + 10}
            className={cn(
              'h-10 w-full rounded-lg border bg-white/5 px-3 text-white placeholder:text-brand-gray/50 font-body',
              'focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors',
              fieldIsEdited('cta_text')
                ? 'border-brand-blue/50'
                : 'border-brand-gray/30',
              (slide.cta_text ?? '').length > CHAR_LIMITS.cta_text
                ? 'border-red-500/50'
                : ''
            )}
            placeholder="Ex: Salva esse post!"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 3: Design ──────────────────────────────────────────────────────────

interface Step3Props {
  slides: SlideState[];
  onRenderAll: () => void;
  onRenderSlide: (position: number) => void;
  onUpload: (position: number, file: File) => void;
  renderingAll: boolean;
  renderingSlides: Set<number>;
  onNext: () => void;
  onBack: () => void;
}

function Step3Design({
  slides,
  onRenderAll,
  onRenderSlide,
  onUpload,
  renderingAll,
  renderingSlides,
  onNext,
  onBack,
}: Step3Props) {
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const previewSlide = slides.find((s) => s.position === previewPosition);

  const hasAnyImage = slides.some((s) => s.image_url);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading text-white mb-1">Design dos Slides</h2>
          <p className="text-sm font-body text-brand-gray">
            Renderize as imagens do seu carrossel
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onRenderAll}
          disabled={renderingAll}
        >
          {renderingAll ? 'Renderizando...' : 'Renderizar Tudo'}
        </Button>
      </div>

      {/* Slides grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {slides.map((slide) => (
          <SlidePreview
            key={slide.position}
            position={slide.position}
            imageUrl={slide.image_url}
            isRendering={renderingAll || renderingSlides.has(slide.position)}
            onRender={onRenderSlide}
            onUpload={onUpload}
            onPreview={(pos) => setPreviewPosition(pos)}
          />
        ))}
      </div>

      {!hasAnyImage && (
        <p className="text-sm font-body text-brand-gray/60 text-center py-2">
          Clique em "Renderizar Tudo" para gerar as imagens
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onBack} disabled={renderingAll}>
          Voltar
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={onNext}
          disabled={renderingAll}
        >
          Continuar
        </Button>
      </div>

      {/* Preview modal */}
      <Modal
        isOpen={previewPosition !== null}
        onClose={() => setPreviewPosition(null)}
        title={previewSlide ? `Slide ${previewSlide.position}` : 'Preview'}
        className="max-w-2xl"
      >
        {previewSlide?.image_url && (
          <img
            src={previewSlide.image_url}
            alt={`Slide ${previewSlide.position}`}
            className="w-full rounded-lg"
          />
        )}
        {!previewSlide?.image_url && (
          <div className="flex items-center justify-center h-48 text-brand-gray font-body text-sm">
            Sem imagem gerada
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewCarouselPage() {
  const navigate = useNavigate();
  const { id: carouselIdParam } = useParams<{ id?: string }>();

  const { generateText, getCarousel, updateSlide, validateCarousel, error, clearError } = useCarousel();
  const { renderCarousel, renderSlide, uploadImage, rendering: renderingAll, renderingSlides } = useRender();
  const { downloadZip, downloadSlide, markExported, loading: exporting, error: exportError } = useExport();
  const { user } = useAuth();

  // Wizard state
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);

  // Step 1 form
  const [theme, setTheme] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('educational');
  const [slideCount, setSlideCount] = useState(5);

  // Step 2 data
  const [carousel, setCarousel] = useState<Carousel | null>(null);
  const [slides, setSlides] = useState<SlideState[]>([]);
  const [meta, setMeta] = useState<CarouselMeta | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);

  // Autosave timers: keyed by slide position
  const autosaveTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Load existing carousel if editing by ID
  useEffect(() => {
    if (!carouselIdParam) return;

    async function load() {
      setGenerating(true);
      const result = await getCarousel(carouselIdParam!);
      setGenerating(false);

      if (result) {
        setCarousel(result.carousel);
        setTheme(result.carousel.theme ?? '');
        setTemplateType(result.carousel.template_type);
        setSlides(
          result.slides.map((s) => ({
            ...s,
            originalHeadline: s.headline,
            originalBodyText: s.body_text,
            originalCtaText: s.cta_text ?? '',
            isDirty: false,
            saveStatus: 'idle',
          }))
        );
        setStep(2);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carouselIdParam]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = autosaveTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!theme.trim()) return;
    clearError();
    setGenerating(true);

    const result = await generateText(theme.trim(), templateType, slideCount);
    setGenerating(false);

    if (result) {
      setCarousel(result.carousel);
      setMeta(result.generated_meta);
      setSlides(
        result.slides.map((s) => ({
          ...s,
          originalHeadline: s.headline,
          originalBodyText: s.body_text,
          originalCtaText: s.cta_text ?? '',
          isDirty: false,
          saveStatus: 'idle',
        }))
      );
      setStep(2);
    }
  }

  const scheduleAutosave = useCallback(
    (position: number, field: 'headline' | 'body_text' | 'cta_text', value: string) => {
      if (!carousel) return;

      // Clear existing timer for this slide
      const existing = autosaveTimers.current.get(position);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        // Mark as saving
        setSlides((prev) =>
          prev.map((s) => (s.position === position ? { ...s, saveStatus: 'saving' } : s))
        );

        const result = await updateSlide(carousel.id, position, { [field]: value });

        setSlides((prev) =>
          prev.map((s) =>
            s.position === position
              ? { ...s, saveStatus: result ? 'saved' : 'error' }
              : s
          )
        );

        // Reset to idle after 2s
        setTimeout(() => {
          setSlides((prev) =>
            prev.map((s) => (s.position === position ? { ...s, saveStatus: 'idle' } : s))
          );
        }, 2000);
      }, AUTOSAVE_DELAY_MS);

      autosaveTimers.current.set(position, timer);
    },
    [carousel, updateSlide]
  );

  function handleFieldChange(
    position: number,
    field: 'headline' | 'body_text' | 'cta_text',
    value: string
  ) {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.position !== position) return s;
        const updated = { ...s, [field]: value, isDirty: true };
        return updated;
      })
    );
    scheduleAutosave(position, field, value);
  }

  function handleRestore(position: number, field: 'headline' | 'body_text' | 'cta_text') {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.position !== position) return s;
        const origMap = {
          headline: s.originalHeadline,
          body_text: s.originalBodyText,
          cta_text: s.originalCtaText,
        };
        const restored = origMap[field];
        const updated = { ...s, [field]: restored };
        // If all fields are back to original, clear dirty flag
        const isStillDirty =
          updated.headline !== updated.originalHeadline ||
          updated.body_text !== updated.originalBodyText ||
          updated.cta_text !== updated.originalCtaText;
        return { ...updated, isDirty: isStillDirty };
      })
    );
  }

  async function handleRegenerate(position: number) {
    if (!carousel) return;
    setRegeneratingSlide(position);

    // Regenerate the entire carousel and replace just this slide
    const result = await generateText(theme, templateType, slideCount);
    setRegeneratingSlide(null);

    if (result) {
      const newSlide = result.slides.find((s) => s.position === position);
      if (newSlide && carousel) {
        // Save the new text to the API
        await updateSlide(carousel.id, position, {
          headline: newSlide.headline,
          body_text: newSlide.body_text,
          cta_text: newSlide.cta_text ?? '',
        });

        setSlides((prev) =>
          prev.map((s) =>
            s.position === position
              ? {
                  ...s,
                  headline: newSlide.headline,
                  body_text: newSlide.body_text,
                  cta_text: newSlide.cta_text ?? '',
                  originalHeadline: newSlide.headline,
                  originalBodyText: newSlide.body_text,
                  originalCtaText: newSlide.cta_text ?? '',
                  isDirty: false,
                  saveStatus: 'idle',
                }
              : s
          )
        );
      }
    }
  }

  async function handleRegenerateAll() {
    if (!carousel) return;
    setGenerating(true);
    clearError();

    const result = await generateText(theme, templateType, slideCount);
    setGenerating(false);

    if (result) {
      // Save all slides
      for (const newSlide of result.slides) {
        await updateSlide(carousel.id, newSlide.position, {
          headline: newSlide.headline,
          body_text: newSlide.body_text,
          cta_text: newSlide.cta_text ?? '',
        });
      }

      setMeta(result.generated_meta);
      setSlides(
        result.slides.map((s) => ({
          ...s,
          originalHeadline: s.headline,
          originalBodyText: s.body_text,
          originalCtaText: s.cta_text ?? '',
          isDirty: false,
          saveStatus: 'idle',
        }))
      );
    }
  }

  async function handleValidate() {
    if (!carousel) return;
    setValidateError(null);

    // Check headlines client-side first
    const emptyHeadlines = slides.filter((s) => !s.headline.trim());
    if (emptyHeadlines.length > 0) {
      const positions = emptyHeadlines.map((s) => s.position).join(', ');
      setValidateError(`Slides sem headline: posições ${positions}. Preencha todos antes de validar.`);
      return;
    }

    setValidating(true);
    const result = await validateCarousel(carousel.id);
    setValidating(false);

    if (result) {
      setCarousel(result.carousel);
      setStep(3);
    } else {
      setValidateError(error ?? 'Falha ao validar');
    }
  }

  // ─── Render Handlers ────────────────────────────────────────────────────────

  async function handleRenderAll() {
    if (!carousel) return;
    const result = await renderCarousel(carousel.id);
    if (result) {
      setSlides((prev) =>
        prev.map((s) => {
          const rendered = result.find((r) => r.position === s.position);
          return rendered ? { ...s, image_url: rendered.url } : s;
        })
      );
    }
  }

  async function handleRenderSlide(position: number) {
    if (!carousel) return;
    const result = await renderSlide(carousel.id, position);
    if (result) {
      setSlides((prev) =>
        prev.map((s) => (s.position === position ? { ...s, image_url: result.url } : s))
      );
    }
  }

  async function handleUploadImage(position: number, file: File) {
    if (!carousel || !user) return;
    const url = await uploadImage(carousel.id, position, file, user.id);
    if (url) {
      setSlides((prev) =>
        prev.map((s) => (s.position === position ? { ...s, image_url: url } : s))
      );
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-brand-black px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-brand-gray hover:text-white text-sm font-body transition-colors mb-4 flex items-center gap-1"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-heading text-white">
            {carouselIdParam ? 'Editar Carrossel' : 'Novo Carrossel'}
          </h1>
        </div>

        <StepIndicator currentStep={step} />

        {/* Step 1 */}
        {step === 1 && (
          <Step1Ideia
            theme={theme}
            onThemeChange={setTheme}
            templateType={templateType}
            onTemplateChange={setTemplateType}
            slideCount={slideCount}
            onSlideCountChange={setSlideCount}
            onGenerate={handleGenerate}
            loading={generating}
            error={error}
          />
        )}

        {/* Step 2 */}
        {step === 2 && carousel && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-heading text-white mb-1">Editar Textos</h2>
                <p className="text-sm font-body text-brand-gray">
                  Revise e ajuste os textos gerados pela IA
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerateAll}
                disabled={generating}
              >
                {generating ? 'Gerando...' : 'Regenerar Tudo'}
              </Button>
            </div>

            {/* Meta info */}
            {meta && (
              <Card className="border-brand-blue-dark/40 bg-brand-blue-dark/10">
                <CardHeader>
                  <CardTitle className="text-sm text-brand-blue">Legenda sugerida</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-body text-brand-gray mb-2">{meta.suggested_caption}</p>
                  <div className="flex flex-wrap gap-1">
                    {meta.suggested_hashtags.map((tag) => (
                      <span key={tag} className="text-xs font-body text-brand-blue/70">
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Slides */}
            <div className="space-y-4">
              {slides.map((slide) => (
                <SlideCard
                  key={slide.position}
                  slide={slide}
                  onFieldChange={handleFieldChange}
                  onRestore={handleRestore}
                  onRegenerate={handleRegenerate}
                  regenerating={regeneratingSlide === slide.position}
                />
              ))}
            </div>

            {/* Validation error */}
            {validateError && (
              <p className="text-sm text-red-400 font-body bg-red-500/10 rounded-lg px-4 py-3">
                {validateError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={validating || generating}
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleValidate}
                disabled={validating || generating}
              >
                {validating ? 'Validando...' : 'Validar Textos'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Design */}
        {step === 3 && carousel && (
          <Step3Design
            slides={slides}
            onRenderAll={handleRenderAll}
            onRenderSlide={handleRenderSlide}
            onUpload={handleUploadImage}
            renderingAll={renderingAll}
            renderingSlides={renderingSlides}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {/* Step 4 — Export */}
        {step === 4 && carousel && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-heading text-white mb-1">Exportar Carrossel</h2>
              <p className="text-sm font-body text-brand-gray">
                Baixe os slides para publicar no Instagram
              </p>
            </div>

            {/* Slides preview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slides.filter(s => s.image_url).map((slide) => (
                <div key={slide.position} className="relative group">
                  <img
                    src={slide.image_url!}
                    alt={`Slide ${slide.position}`}
                    className="w-full rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => downloadSlide(slide.image_url!, slide.position)}
                      className="text-white text-sm font-subtitle bg-brand-blue/80 hover:bg-brand-blue px-4 py-2 rounded-lg transition-colors"
                    >
                      Baixar Slide {slide.position}
                    </button>
                  </div>
                  <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-xs font-heading text-white">
                    {slide.position}
                  </span>
                </div>
              ))}
            </div>

            {slides.filter(s => s.image_url).length === 0 && (
              <div className="text-center py-8">
                <p className="text-brand-gray font-body mb-2">Nenhuma imagem renderizada</p>
                <p className="text-sm text-brand-gray/60 font-body">Volte ao passo Design para renderizar os slides</p>
              </div>
            )}

            {/* Caption & hashtags */}
            {meta && (
              <Card className="border-brand-gray/20">
                <CardHeader>
                  <CardTitle className="text-sm">Legenda para copiar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className="text-sm font-body text-brand-gray bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => {
                      const fullCaption = `${meta.suggested_caption}\n\n${meta.suggested_hashtags.join(' ')}`;
                      navigator.clipboard.writeText(fullCaption);
                    }}
                    title="Clique para copiar"
                  >
                    <p className="mb-2">{meta.suggested_caption}</p>
                    <p className="text-brand-blue/70 text-xs">{meta.suggested_hashtags.join(' ')}</p>
                    <p className="text-xs text-brand-gray/40 mt-2 text-right">Clique para copiar</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export error */}
            {exportError && (
              <p className="text-sm text-red-400 font-body bg-red-500/10 rounded-lg px-4 py-3">
                {exportError}
              </p>
            )}

            {/* Export actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={async () => {
                  await downloadZip(carousel.id, carousel.title ?? carousel.theme ?? 'carrossel');
                }}
                disabled={exporting || slides.filter(s => s.image_url).length === 0}
              >
                {exporting ? 'Preparando ZIP...' : 'Baixar ZIP (todos os slides)'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={async () => {
                  await markExported(carousel.id);
                  navigate('/');
                }}
                disabled={exporting}
              >
                Marcar como Exportado
              </Button>
            </div>

            {/* Back */}
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep(3)}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
