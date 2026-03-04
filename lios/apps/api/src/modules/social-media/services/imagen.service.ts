import { GoogleGenAI } from '@google/genai';
import { config } from '../../../config.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
}

type SlideRole = 'cover' | 'content' | 'cta';

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_MODEL = 'imagen-4.0-generate-001';

// ─── Types for slide context ─────────────────────────────────────────────────

export interface SlideContext {
  headline: string;
  body_text: string;
  position: number;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildBackgroundPrompt(
  theme: string,
  slideRole: SlideRole,
  templateType: string,
  _position: number,
  _totalSlides: number,
  slideContext?: SlideContext,
): string {
  // Camera angles per role — framing only, NOT subject matter
  const shots: Record<SlideRole, string> = {
    cover: [
      'Top-down flat lay photograph, shot from above.',
      'Professional stock photography, Canon EOS R5, 24-70mm f/2.8 lens, ISO 400, studio lighting.',
      'Blue LED strip lighting along the edges casts cool blue glow on the scene.',
    ].join(' '),
    content: [
      'Close-up macro photograph, shallow depth of field, beautiful bokeh.',
      'Moody dark ambient lighting with blue LED edge accent creating rim light on the subject.',
      'Canon EOS R5, 100mm macro lens f/2.8, studio lighting with blue gel.',
    ].join(' '),
    cta: [
      'Wide angle photograph showing the full scene.',
      'Blue LED ambient lighting creating a premium, inviting atmosphere.',
      'Professional photography, wide angle 16mm lens, dramatic blue accent lighting.',
    ].join(' '),
  };

  // Extract visual subject from slide text — strip written content, keep only the visual concept
  const slideSubject = slideContext
    ? `${slideContext.headline}. ${slideContext.body_text}`.trim()
    : theme;

  return [
    // Lead with the NO TEXT rule — Imagen weighs early instructions more heavily
    'ABSOLUTE RULE: This image must contain ZERO text. No letters, no numbers, no words, no symbols, no labels, no annotations, no watermarks, no logos. The image is purely visual with no written content of any kind.',
    '',
    `SUBJECT: Ultra-realistic photograph visually representing: "${slideSubject}".`,
    `Overall theme: "${theme}".`,
    '',
    'SCENE: Show the specific physical objects, components, tools, or hands-on actions that match the subject.',
    'Examples: diode being probed by multimeter, capacitors in macro, soldering iron on PCB, oscilloscope waveforms on screen, inverter board close-up.',
    'NEVER use a generic workbench. Always show the exact subject mentioned.',
    '',
    shots[slideRole],
    '',
    'STYLE: Ultra-realistic photo of real physical objects. Dark moody atmosphere, blue LED accent lighting, dark surface.',
    'NOT illustration, NOT diagram, NOT abstract, NOT 3D render.',
    'ZERO TEXT IN THE IMAGE.',
  ].join('\n');
}

// ─── Service ──────────────────────────────────────────────────────────────────

class ImagenService {
  private ai: GoogleGenAI;

  constructor() {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  async generateSlideBackground(
    theme: string,
    slideRole: SlideRole,
    templateType: string,
    position: number,
    totalSlides: number,
    slideContext?: SlideContext,
  ): Promise<GeneratedImage> {
    const prompt = buildBackgroundPrompt(theme, slideRole, templateType, position, totalSlides, slideContext);

    console.log(`[Imagen] Generating background for slide ${position}/${totalSlides} (${slideRole})...`);
    console.log(`[Imagen] Prompt length: ${prompt.length} chars`);

    const response = await this.ai.models.generateImages({
      model: IMAGE_MODEL,
      prompt,
      config: {
        numberOfImages: 1,
      },
    });

    const generated = response.generatedImages;
    if (!generated || generated.length === 0) {
      throw new Error(`Imagen returned no images for slide ${position}`);
    }

    const imgBytes = generated[0].image?.imageBytes;
    if (!imgBytes) {
      throw new Error(`Imagen returned empty image data for slide ${position}`);
    }

    const buffer = Buffer.from(imgBytes, 'base64');
    console.log(`[Imagen] Slide ${position} background generated (${(buffer.length / 1024).toFixed(0)} KB)`);

    return { buffer, mimeType: 'image/png' };
  }

  async generateCarouselBackgrounds(
    theme: string,
    templateType: string,
    totalSlides: number,
    slides?: SlideContext[],
  ): Promise<Map<number, GeneratedImage>> {
    const results = new Map<number, GeneratedImage>();

    for (let pos = 1; pos <= totalSlides; pos++) {
      let slideRole: SlideRole = 'content';
      if (pos === 1) slideRole = 'cover';
      else if (pos === totalSlides) slideRole = 'cta';

      const slideContext = slides?.find((s) => s.position === pos);

      try {
        const image = await this.generateSlideBackground(
          theme,
          slideRole,
          templateType,
          pos,
          totalSlides,
          slideContext,
        );
        results.set(pos, image);
      } catch (err) {
        console.error(`[Imagen] Failed to generate slide ${pos}:`, (err as Error).message);
      }

      if (pos < totalSlides) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return results;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let instance: ImagenService | null = null;

export function getImagenService(): ImagenService {
  if (!instance) {
    instance = new ImagenService();
  }
  return instance;
}
