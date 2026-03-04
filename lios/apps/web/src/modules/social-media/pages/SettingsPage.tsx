import { useState, useEffect } from 'react';
import type { WritingPersona } from '@carousel/shared';
import { Button, Card, CardHeader, CardTitle, CardContent, CardFooter, Badge, Input, Textarea, Modal } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { usePersonas, type PersonaFormData } from '../hooks/usePersonas';

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().replace(/,$/, '');
      if (newTag && !values.includes(newTag)) {
        onChange([...values, newTag]);
      }
      setInputValue('');
    }
    if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-subtitle text-brand-gray">{label}</label>
      <div
        className={cn(
          'min-h-[42px] w-full rounded-lg border border-brand-gray/30 bg-white/5 px-3 py-2',
          'focus-within:ring-2 focus-within:ring-brand-blue focus-within:border-transparent transition-colors',
          'flex flex-wrap gap-1.5 items-center'
        )}
      >
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-brand-blue/20 text-brand-blue text-xs font-subtitle px-2 py-0.5"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-white transition-colors leading-none"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? (placeholder ?? 'Digite e pressione Enter') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-white placeholder:text-brand-gray/50 font-body text-sm focus:outline-none"
        />
      </div>
      <p className="text-xs font-body text-brand-gray/50">Pressione Enter ou virgula para adicionar</p>
    </div>
  );
}

// ─── Persona Form ─────────────────────────────────────────────────────────────

const EMPTY_FORM: PersonaFormData = {
  name: '',
  tone: [],
  example_phrases: [],
  words_to_use: [],
  words_to_avoid: [],
  is_default: false,
};

function PersonaForm({
  initial,
  onSave,
  onCancel,
  loading,
  error,
}: {
  initial?: PersonaFormData;
  onSave: (data: PersonaFormData) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<PersonaFormData>(initial ?? EMPTY_FORM);

  function set<K extends keyof PersonaFormData>(key: K, value: PersonaFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhrasesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const lines = e.target.value.split('\n').map((l) => l.trim()).filter(Boolean);
    set('example_phrases', lines);
  }

  return (
    <div className="space-y-4">
      <Input
        label="Nome da persona"
        placeholder="Ex: Tom Climatronico"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        disabled={loading}
      />

      <TagInput
        label="Tom de voz"
        values={form.tone}
        onChange={(v) => set('tone', v)}
        placeholder="direto, motivacional..."
      />

      <Textarea
        label="Frases tipicas (uma por linha)"
        placeholder={"Ex: E minha pergunta e: Porque voce tambem nao conseguiria?\nPara mais conteudos, basta me seguir"}
        value={form.example_phrases.join('\n')}
        onChange={handlePhrasesChange}
        rows={4}
        disabled={loading}
      />

      <TagInput
        label="Palavras para usar"
        values={form.words_to_use}
        onChange={(v) => set('words_to_use', v)}
        placeholder="climatronico, renda extra..."
      />

      <TagInput
        label="Palavras para evitar"
        values={form.words_to_avoid}
        onChange={(v) => set('words_to_avoid', v)}
        placeholder="gratis, promocao..."
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={form.is_default}
          onClick={() => set('is_default', !form.is_default)}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            form.is_default ? 'bg-brand-blue' : 'bg-brand-gray/30'
          )}
          disabled={loading}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
              form.is_default ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
        <span className="text-sm font-subtitle text-brand-gray">
          Definir como persona padrao
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-400 font-body bg-red-500/10 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => onSave(form)}
          disabled={loading || form.name.trim().length === 0}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

// ─── Persona Card ─────────────────────────────────────────────────────────────

function PersonaCard({
  persona,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  persona: WritingPersona;
  onEdit: (p: WritingPersona) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  return (
    <Card variant="elevated" className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {persona.is_default && (
              <span className="text-yellow-400 text-base leading-none" title="Persona padrao">
                &#9733;
              </span>
            )}
            <CardTitle className="text-base">{persona.name}</CardTitle>
          </div>
          {!persona.is_default && (
            <button
              onClick={() => onSetDefault(persona.id)}
              className="text-xs font-body text-brand-gray hover:text-yellow-400 transition-colors"
              title="Definir como padrao"
            >
              &#9733;
            </button>
          )}
        </div>

        {persona.tone && persona.tone.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {persona.tone.map((t) => (
              <Badge key={t} variant="info">{t}</Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2 text-xs font-body text-brand-gray">
        {persona.words_to_use && persona.words_to_use.length > 0 && (
          <p>
            <span className="text-green-400 font-subtitle">Usar: </span>
            {persona.words_to_use.join(', ')}
          </p>
        )}
        {persona.words_to_avoid && persona.words_to_avoid.length > 0 && (
          <p>
            <span className="text-red-400 font-subtitle">Evitar: </span>
            {persona.words_to_avoid.join(', ')}
          </p>
        )}
        {persona.example_phrases && persona.example_phrases.length > 0 && (
          <p className="italic text-brand-gray/70">
            "{persona.example_phrases[0]}"
            {persona.example_phrases.length > 1 && ` +${persona.example_phrases.length - 1}`}
          </p>
        )}
      </CardContent>

      <CardFooter className="mt-auto">
        <Button size="sm" variant="secondary" onClick={() => onEdit(persona)}>
          Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(persona.id)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          Excluir
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { loading, error, clearError, getPersonas, createPersona, updatePersona, deletePersona } = usePersonas();

  const [personas, setPersonas] = useState<WritingPersona[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<WritingPersona | null>(null);

  async function load() {
    const result = await getPersonas();
    if (result) setPersonas(result);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    clearError();
    setEditingPersona(null);
    setModalOpen(true);
  }

  function openEdit(persona: WritingPersona) {
    clearError();
    setEditingPersona(persona);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingPersona(null);
  }

  async function handleSave(formData: PersonaFormData) {
    let result: WritingPersona | null = null;

    if (editingPersona) {
      result = await updatePersona(editingPersona.id, formData);
    } else {
      result = await createPersona(formData);
    }

    if (result) {
      closeModal();
      await load();
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta persona? Esta acao nao pode ser desfeita.')) return;
    const ok = await deletePersona(id);
    if (ok) {
      setPersonas((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function handleSetDefault(id: string) {
    await updatePersona(id, { is_default: true });
    await load();
  }

  const initialFormData: PersonaFormData | undefined = editingPersona
    ? {
        name: editingPersona.name,
        tone: editingPersona.tone ?? [],
        example_phrases: editingPersona.example_phrases ?? [],
        words_to_use: editingPersona.words_to_use ?? [],
        words_to_avoid: editingPersona.words_to_avoid ?? [],
        is_default: editingPersona.is_default,
      }
    : undefined;

  return (
    <div className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading text-white">Personas de Escrita</h2>
            <p className="text-sm font-body text-brand-gray mt-1">
              Configure o tom de voz para a geracao de textos
            </p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            + Nova Persona
          </Button>
        </div>

        {/* Loading skeleton */}
        {loading && personas.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && personas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-brand-gray font-body mb-2">
              Nenhuma persona configurada ainda
            </p>
            <p className="text-sm font-body text-brand-gray/60 mb-6">
              Crie uma persona para personalizar o tom de voz da IA
            </p>
            <Button variant="primary" onClick={openCreate}>
              Criar Primeira Persona
            </Button>
          </div>
        )}

        {/* Personas grid */}
        {personas.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onEdit={openEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingPersona ? 'Editar Persona' : 'Nova Persona'}
        className="max-w-xl overflow-y-auto max-h-[90vh]"
      >
        <PersonaForm
          key={editingPersona?.id ?? 'new'}
          initial={initialFormData}
          onSave={handleSave}
          onCancel={closeModal}
          loading={loading}
          error={error}
        />
      </Modal>
    </div>
  );
}
