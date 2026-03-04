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

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildBackgroundPrompt(
  theme: string,
  slideRole: SlideRole,
  templateType: string,
  _position: number,
  _totalSlides: number,
): string {
  // Each role gets a different "camera shot" for visual variety
  const shots: Record<SlideRole, string> = {
    cover: [
      'Top-down flat lay photograph of an electronics repair workbench.',
      'A Fluke multimeter with red and black probes, a Hantek oscilloscope showing waveforms on screen,',
      'multiple green PCB circuit boards with visible copper traces and SMD components,',
      'electrolytic capacitors, a soldering station with iron resting on holder,',
      'scattered resistors, transistors, and IC chips on a matte black anti-static mat.',
      'Blue LED strip lighting along the edges casts cool blue glow on the metal tools.',
      'Professional stock photography, Canon EOS R5, 24-70mm f/2.8 lens, ISO 400, studio lighting.',
    ].join(' '),
    content: [
      'Close-up macro photograph of electronic components on a dark workbench surface.',
      'Sharp focus on capacitors, resistors, and IC chips with solder joints visible.',
      'A PCB board with copper traces and through-hole components in the foreground.',
      'Multimeter probes touching a circuit board in soft focus in the background.',
      'Moody dark ambient lighting with blue LED edge accent creating rim light on components.',
      'Professional macro photography, shallow depth of field, beautiful bokeh.',
      'Canon EOS R5, 100mm macro lens f/2.8, studio lighting with blue gel.',
    ].join(' '),
    cta: [
      'Wide angle photograph of a well-organized professional electronics repair workshop.',
      'Workbench with multimeter, oscilloscope, soldering station, PCB holder, and circuit boards.',
      'Tools neatly arranged: screwdrivers, tweezers, flux pen, solder wire, heat gun.',
      'Blue LED ambient lighting creating a premium, inviting atmosphere.',
      'Clean and professional workspace that inspires confidence and expertise.',
      'Professional interior photography, wide angle 16mm lens, dramatic blue accent lighting.',
    ].join(' '),
  };

  // Template-specific subject additions
  const subjects: Record<string, string> = {
    educational: 'Focus on diagnostic tools: multimeter display, oscilloscope waveforms, component tester, magnifying lamp over PCB.',
    social_proof: 'Repaired circuit boards stacked neatly, a working air conditioner inverter board, tools of the trade showing mastery.',
    tips_list: 'Individual tools and components isolated on dark surface: numbered feel, each tool in its place, organized grid layout.',
    cover_cta: 'Hero shot with the most impressive tools front and center: oscilloscope, multimeter, and a complex inverter PCB board.',
  };

  const subject = subjects[templateType] ?? subjects.educational;

  return [
    `MAIN SUBJECT: A realistic photograph specifically about "${theme}".`,
    `The main objects in the scene must directly relate to this topic.`,
    `If the topic mentions a specific component (capacitor, IGBT, IPM, relay, transformer, etc), that component must be prominently visible and in focus.`,
    `If the topic mentions a tool (multimeter, oscilloscope, capacimeter, etc), that tool must be the hero of the image.`,
    `If the topic is about a specific board type (inverter, condensadora, evaporadora), show that type of PCB board prominently.`,
    shots[slideRole],
    subject,
    'CRITICAL: This must be a realistic photograph of real physical objects. NOT an illustration, NOT abstract art.',
    'The image contains NO text, NO letters, NO numbers, NO words, NO watermarks, NO logos anywhere.',
    'Dark moody atmosphere with blue LED accent lighting.',
  ].join(' ');
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
  ): Promise<GeneratedImage> {
    const prompt = buildBackgroundPrompt(theme, slideRole, templateType, position, totalSlides);

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
  ): Promise<Map<number, GeneratedImage>> {
    const results = new Map<number, GeneratedImage>();

    for (let pos = 1; pos <= totalSlides; pos++) {
      let slideRole: SlideRole = 'content';
      if (pos === 1) slideRole = 'cover';
      else if (pos === totalSlides) slideRole = 'cta';

      try {
        const image = await this.generateSlideBackground(
          theme,
          slideRole,
          templateType,
          pos,
          totalSlides,
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
