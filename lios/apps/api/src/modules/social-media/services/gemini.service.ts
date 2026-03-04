import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';
import { config } from '../../../config.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeneratedSlide {
  position: number;
  headline: string;
  body_text: string;
  cta_text: string;
}

export interface GeneratedCarousel {
  title: string;
  slides: GeneratedSlide[];
  suggested_hashtags: string[];
  suggested_caption: string;
}

export interface WritingPersona {
  name: string;
  tone?: string[];
  example_phrases?: string[];
  words_to_use?: string[];
  words_to_avoid?: string[];
}

interface GenerateCarouselParams {
  theme: string;
  templateType: string;
  slideCount: number;
  persona?: WritingPersona | string | null;
  learningExamples?: string; // pre-formatted few-shot block
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Model routing — best model per function
// Text: gemini-2.5-pro (copywriting) | gemini-2.5-flash (validation)
// Images: imagen-4.0-generate-001 (backgrounds) — see imagen.service.ts
const MODELS = {
  textGeneration: 'gemini-2.5-pro',
  validation: 'gemini-2.5-flash',
} as const;

const SYSTEM_PROMPT = `Você é o Lawhander Silva (@lawhander), criador da marca Climatrônico.
Técnico com 12.000+ equipamentos reparados, 9+ anos de experiência, 2.744 vídeos publicados,
R$1 milhão+ faturado com reparo de placas eletrônicas de ar-condicionado.

IDENTIDADE: "O Amigo de Bancada" — técnico veterano que ensina lado a lado, nunca de cima para baixo.
Primeiro a sistematizar reparo de placas de ar-condicionado em português no Brasil.

TOM DE VOZ — Registro híbrido nordestino-técnico:
- Fale COM o técnico, não PARA ele. Tom de amigo de bancada.
- Marcadores obrigatórios: "meu patrão", "bora nós", "tamo junto", "show de bola", "cara"
- Code-switching: alterne coloquial ("Bora nós!", "Pega essa visão") com termos técnicos (ESR, DC-Link, inverter, IPM, MOSFET)
- Dados numéricos SEMPRE: %, R$, tempo, ohms, volts ("60-70% dos casos", "R$80-350", "5-12 minutos")
- Emojis funcionais com moderação: ⚠️ segurança, 📋 dados, 💡 dica, 🔥 motivação (1-2 por slide)

FRASES DE PODER (usar nos headlines e CTAs):
- "Eletrônica é uma só e toda placa tem reparo!"
- "Faz parte do processo"
- "Quanto mais difícil, mais vale"
- "Não é fácil, mas é simples"
- "Não é o componente, é o CONHECIMENTO"
- "Te ensino a faturar de 2 a 5 mil reais"
- "Você é o cara que resolve ou o cara que foge?"
- "A confusão é o primeiro passo para o entendimento"

MODOS DE COMUNICAÇÃO (adapte conforme o tema do carrossel):
1. Técnico de Bancada (50%) — Preciso, numérico, passo-a-passo com cascata diagnóstica
2. Educador Motivacional (35%) — Empático, celebratório, aspiracional com dados financeiros
3. Evangelista do Método (15%) — Anti-gambiarra, assertivo, "siga o projeto original"

ESTRUTURA CASCATA (do simples ao complexo):
1. Problema direto → sem rodeios
2. Credencial flash → âncora com experiência
3. Método passo-a-passo → ação + resultado esperado
4. Âncora numérica → custos, tempos, taxas
5. CTA fraterno → convite comunitário

NUNCA USE: "portanto", "neste sentido", "conforme mencionado", "paradigma", "sinergia", "prezado", "caro leitor", "basicamente"
SEMPRE USE: pt-BR coloquial, frases curtas e diretas, hooks contra-intuitivos

Público: técnicos de refrigeração, pessoas querendo renda extra com eletrônica, alunos do método Climatrônico.
Hashtags recorrentes: #lawhander #climatronico #climatização #refrigeração #placaseletronicas #rendaextra #inverter #eletronica #manutencao

Regras de formato para carrossel Instagram:
- Headlines curtos e impactantes (máx 60 caracteres)
- Texto do corpo educativo e envolvente (máx 200 caracteres por slide)
- CTA direto e motivacional
- Primeiro slide: headline chamativo que gere curiosidade (hook contra-intuitivo ou pergunta retórica)
- Último slide: CTA forte com "Tamo junto" ou "Bora nós"
- Slides intermediários: conteúdo prático com dados numéricos`;

const GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.85,
  topP: 0.9,
  topK: 40,
  responseMimeType: 'application/json',
};

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  educational: 'Educacional (passo a passo técnico)',
  social_proof: 'Prova Social (resultados e depoimentos)',
  tips_list: 'Lista de Dicas (dicas numeradas)',
  cover_cta: 'Capa/CTA (chamada chamativa)',
};

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}

// ─── Persona context builder ──────────────────────────────────────────────────

function buildPersonaContext(persona: WritingPersona | string | null | undefined): string {
  if (!persona) return '';

  // Legacy: persona passed as string (name + tone concatenated)
  if (typeof persona === 'string') {
    return `\n\nPersona ativa: ${persona}`;
  }

  const lines: string[] = [];

  if (persona.name) lines.push(`Persona: ${persona.name}`);
  if (persona.tone && persona.tone.length > 0) {
    lines.push(`Tom de voz: ${persona.tone.join(', ')}`);
  }
  if (persona.example_phrases && persona.example_phrases.length > 0) {
    lines.push(`Frases típicas: ${persona.example_phrases.join(' | ')}`);
  }
  if (persona.words_to_use && persona.words_to_use.length > 0) {
    lines.push(`Palavras para usar: ${persona.words_to_use.join(', ')}`);
  }
  if (persona.words_to_avoid && persona.words_to_avoid.length > 0) {
    lines.push(`Palavras para evitar: ${persona.words_to_avoid.join(', ')}`);
  }

  if (lines.length === 0) return '';
  return `\n\n${lines.join('\n')}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }

  async generateCarouselText(params: GenerateCarouselParams): Promise<GeneratedCarousel> {
    const { theme, templateType, slideCount, persona, learningExamples } = params;

    const templateLabel = TEMPLATE_TYPE_LABELS[templateType] ?? templateType;
    const personaContext = buildPersonaContext(persona);

    // Build enhanced system prompt with learning examples if provided
    let systemInstruction = SYSTEM_PROMPT;
    if (personaContext) {
      systemInstruction += personaContext;
    }
    if (learningExamples) {
      systemInstruction += `\n\n${learningExamples}`;
    }

    const prompt = `Crie um carrossel completo com as seguintes especificações:

Tema: "${theme}"
Tipo de template: ${templateLabel}
Número de slides: ${slideCount}

Gere exatamente ${slideCount} slides seguindo as regras do sistema.
O primeiro slide (position: 1) deve ter headline chamativo e gerar curiosidade.
O último slide (position: ${slideCount}) deve ter CTA forte.

Retorne um JSON com a seguinte estrutura exata:
{
  "title": "título do carrossel (máx 80 chars)",
  "slides": [
    {
      "position": 1,
      "headline": "headline do slide (máx 60 chars)",
      "body_text": "texto do corpo (máx 200 chars)",
      "cta_text": "texto do CTA (máx 30 chars, vazio nos slides intermediários)"
    }
  ],
  "suggested_hashtags": ["#hashtag1", "#hashtag2", ...],
  "suggested_caption": "legenda completa para o post (inclui introdução + hashtags)"
}

Importante:
- suggested_hashtags deve ter entre 10 e 20 hashtags relevantes
- suggested_caption deve ter até 300 caracteres (excluindo hashtags)
- Todos os textos em português do Brasil`;

    const result = await withRetry(async () => {
      const model = this.genAI.getGenerativeModel({
        model: MODELS.textGeneration,
        systemInstruction,
        generationConfig: GENERATION_CONFIG,
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text();

      const usage = response.response.usageMetadata;
      if (usage) {
        console.log(
          `[Gemini] Tokens — input: ${usage.promptTokenCount ?? 0}, output: ${usage.candidatesTokenCount ?? 0}, total: ${usage.totalTokenCount ?? 0}`
        );
      }

      return text;
    });

    let parsed: GeneratedCarousel;
    try {
      parsed = JSON.parse(result) as GeneratedCarousel;
    } catch {
      throw new Error(`Gemini returned invalid JSON: ${result.slice(0, 200)}`);
    }

    this.validateOutput(parsed, slideCount);
    return parsed;
  }

  private validateOutput(data: GeneratedCarousel, expectedSlideCount: number): void {
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Generated carousel missing title');
    }
    if (!Array.isArray(data.slides) || data.slides.length !== expectedSlideCount) {
      throw new Error(
        `Expected ${expectedSlideCount} slides, got ${data.slides?.length ?? 0}`
      );
    }
    for (const slide of data.slides) {
      if (typeof slide.position !== 'number') throw new Error(`Slide missing position`);
      if (typeof slide.headline !== 'string') throw new Error(`Slide ${slide.position} missing headline`);
      if (typeof slide.body_text !== 'string') throw new Error(`Slide ${slide.position} missing body_text`);
      if (slide.cta_text === undefined) slide.cta_text = '';
    }
    if (!Array.isArray(data.suggested_hashtags)) data.suggested_hashtags = [];
    if (typeof data.suggested_caption !== 'string') data.suggested_caption = '';
  }
}

// Singleton — reuse across requests
let instance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!instance) {
    instance = new GeminiService();
  }
  return instance;
}
