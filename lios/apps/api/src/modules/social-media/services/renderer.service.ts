import { createCanvas, loadImage, registerFont, type Canvas, type CanvasRenderingContext2D } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { BRAND_COLORS, FONT_FAMILIES } from '@carousel/shared';
import { getImagenService, type GeneratedImage, type SlideContext } from './imagen.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In Docker, WORKDIR=/app and fonts are at /app/fonts
// __dirname resolves to /app/apps/api/dist/modules/social-media/services -> ../../../../../../fonts = /app/fonts
// Fallback to process.cwd()/fonts if __dirname-based path doesn't exist
import { existsSync } from 'fs';
const FONTS_DIR_RELATIVE = path.resolve(__dirname, '../../../../../../fonts');
const FONTS_DIR_CWD = path.resolve(process.cwd(), 'fonts');
const FONTS_DIR = existsSync(FONTS_DIR_RELATIVE) ? FONTS_DIR_RELATIVE : FONTS_DIR_CWD;

// ─── Font registration (run once at module load) ───────────────────────────────

let fontsRegistered = false;

function ensureFontsRegistered(): void {
  if (fontsRegistered) return;
  registerFont(path.join(FONTS_DIR, 'MADETommy-ExtraBold.otf'), { family: 'MADE Tommy ExtraBold' });
  registerFont(path.join(FONTS_DIR, 'MADETommy-Bold.otf'), { family: 'MADE Tommy Bold' });
  registerFont(path.join(FONTS_DIR, 'MADETommy-Medium.otf'), { family: 'MADE Tommy Medium' });
  registerFont(path.join(FONTS_DIR, 'MADETommy-Regular.otf'), { family: 'MADE Tommy Regular' });
  fontsRegistered = true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlideData {
  id: string;
  carousel_id: string;
  position: number;
  headline: string;
  body_text: string;
  cta_text?: string | null;
  image_url?: string | null;
  bg_color?: string | null;
}

export interface TemplateConfig {
  accent_color?: string;
  bg_color?: string;
  gradient?: boolean;
  format?: 'square' | 'portrait';
}

export interface RenderResult {
  position: number;
  url: string;
}

// ─── Layout type determination ─────────────────────────────────────────────────

type SlideLayout = 'cover' | 'cta' | 'content' | 'tip' | 'testimonial';

function determineLayout(position: number, totalSlides: number, templateType: string): SlideLayout {
  if (position === 1) return 'cover';
  if (position === totalSlides) return 'cta';
  if (templateType === 'tips_list') return 'tip';
  if (templateType === 'social_proof') return 'testimonial';
  return 'content';
}

// ─── Text sanitizer (strip emojis — Node Canvas can't render them) ───────────

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

function stripEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, '').replace(/\s{2,}/g, ' ').trim();
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function setTextShadow(ctx: CanvasRenderingContext2D, blur: number = 12, color: string = 'rgba(0,0,0,0.8)'): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
}

function clearTextShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/** Draw a frosted dark panel behind text for readability */
function drawTextPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = 20,
  opacity: number = 0.6,
): void {
  ctx.save();
  ctx.fillStyle = `rgba(1, 1, 1, ${opacity})`;
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: string = 'left'
): number {
  const lines = wrapText(ctx, text, maxWidth);
  ctx.textAlign = align as CanvasRenderingContext2D['textAlign'];
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }
  return y + lines.length * lineHeight;
}

// ─── Slide renderer ────────────────────────────────────────────────────────────

async function renderSlide(
  slide: SlideData,
  layout: SlideLayout,
  config: TemplateConfig,
  aiBackground?: GeneratedImage | null
): Promise<Buffer> {
  ensureFontsRegistered();

  const format = config.format ?? 'square';
  const WIDTH = 1080;
  const HEIGHT = format === 'portrait' ? 1350 : 1080;
  const PADDING = 80;
  const CONTENT_WIDTH = WIDTH - PADDING * 2;

  const accentColor = config.accent_color ?? BRAND_COLORS.blue;
  const bgColor = config.bg_color ?? BRAND_COLORS.black;

  const canvas: Canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // ── Background: AI-generated or solid color ──
  if (aiBackground) {
    try {
      const img = await loadImage(aiBackground.buffer);
      ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);

      // Moderate overlay — let the photo show through
      ctx.fillStyle = 'rgba(1, 1, 1, 0.35)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Gradient: stronger on left (where text goes), lighter on right (show photo)
      const textGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
      textGrad.addColorStop(0, 'rgba(1, 1, 1, 0.40)');
      textGrad.addColorStop(0.5, 'rgba(1, 1, 1, 0.15)');
      textGrad.addColorStop(1, 'rgba(1, 1, 1, 0.05)');
      ctx.fillStyle = textGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    } catch (err) {
      console.warn(`[renderer] Failed to load AI background, using solid color:`, (err as Error).message);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // ── Optional gradient overlay (only for solid backgrounds) ──
    if (config.gradient) {
      const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      grad.addColorStop(0, `${accentColor}20`);
      grad.addColorStop(1, `${bgColor}ff`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  // ── Brand stripe (left edge accent) ──
  const stripeGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  stripeGrad.addColorStop(0, accentColor);
  stripeGrad.addColorStop(0.5, `${accentColor}80`);
  stripeGrad.addColorStop(1, accentColor);
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(0, 0, 6, HEIGHT);

  // ── Strip emojis from all text fields (Node Canvas can't render them) ──
  const cleanSlide: SlideData = {
    ...slide,
    headline: stripEmojis(slide.headline),
    body_text: stripEmojis(slide.body_text),
    cta_text: slide.cta_text ? stripEmojis(slide.cta_text) : slide.cta_text,
  };

  // ── Layout-specific rendering ──
  switch (layout) {
    case 'cover':
      renderCoverSlide(ctx, cleanSlide, accentColor, PADDING, CONTENT_WIDTH, WIDTH, HEIGHT);
      break;
    case 'cta':
      renderCtaSlide(ctx, cleanSlide, accentColor, PADDING, CONTENT_WIDTH, WIDTH, HEIGHT);
      break;
    case 'tip':
      renderTipSlide(ctx, cleanSlide, accentColor, PADDING, CONTENT_WIDTH, WIDTH, HEIGHT);
      break;
    case 'testimonial':
      renderTestimonialSlide(ctx, cleanSlide, accentColor, PADDING, CONTENT_WIDTH, WIDTH, HEIGHT);
      break;
    default:
      renderContentSlide(ctx, cleanSlide, accentColor, PADDING, CONTENT_WIDTH, WIDTH, HEIGHT);
  }

  // ── Position badge (bottom right) ──
  const badgeX = WIDTH - PADDING;
  const badgeY = HEIGHT - PADDING;
  ctx.fillStyle = `${accentColor}30`;
  drawRoundedRect(ctx, badgeX - 60, badgeY - 32, 60, 32, 8);
  ctx.fill();
  ctx.fillStyle = accentColor;
  ctx.font = `bold 18px "${FONT_FAMILIES.heading}"`;
  ctx.textAlign = 'center';
  ctx.fillText(`${slide.position}`, badgeX - 30, badgeY - 10);

  return canvas.toBuffer('image/png');
}

function renderCoverSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  accentColor: string,
  padding: number,
  contentWidth: number,
  _width: number,
  height: number
): void {
  // ── Brand badge top-left ──
  drawTextPanel(ctx, padding - 16, 40, 260, 48, 12, 0.5);
  setTextShadow(ctx, 6);
  ctx.fillStyle = accentColor;
  ctx.font = `bold 26px "${FONT_FAMILIES.subtitle}"`;
  ctx.textAlign = 'left';
  ctx.fillText('CLIMATRONICO', padding, 72);
  clearTextShadow(ctx);

  // ── Calculate text block dimensions ──
  ctx.font = `bold 88px "${FONT_FAMILIES.heading}"`;
  const lines = wrapText(ctx, slide.headline, contentWidth - 40);
  const lineHeight = 100;
  const totalHeight = lines.length * lineHeight;
  const centerY = height * 0.46;
  const headlineStartY = centerY - totalHeight / 2 + 88;

  // Measure body text
  let bodyLines: string[] = [];
  if (slide.body_text) {
    ctx.font = `400 34px "${FONT_FAMILIES.body}"`;
    bodyLines = wrapText(ctx, slide.body_text, contentWidth - 40);
  }
  const bodyHeight = bodyLines.length * 46;

  // ── Dark panel behind all text ──
  const panelTop = headlineStartY - 100;
  const panelBottom = headlineStartY + totalHeight + (bodyLines.length > 0 ? 40 + bodyHeight : 0) + 20;
  drawTextPanel(ctx, padding - 24, panelTop, contentWidth + 48, panelBottom - panelTop, 24, 0.55);

  // ── Blue accent bar inside panel ──
  ctx.fillStyle = accentColor;
  ctx.fillRect(padding - 24, panelTop, 5, panelBottom - panelTop);

  // ── Headline — white, bold ──
  setTextShadow(ctx, 16, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.font = `bold 88px "${FONT_FAMILIES.heading}"`;
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], padding, headlineStartY + i * lineHeight);
  }

  // ── Body text — lighter for hierarchy ──
  if (bodyLines.length > 0) {
    setTextShadow(ctx, 8);
    ctx.fillStyle = '#CCCCCC';
    ctx.font = `400 34px "${FONT_FAMILIES.body}"`;
    for (let i = 0; i < bodyLines.length; i++) {
      ctx.fillText(bodyLines[i], padding, headlineStartY + totalHeight + 40 + i * 46);
    }
  }

  clearTextShadow(ctx);

  // ── Bottom accent line ──
  ctx.fillStyle = accentColor;
  ctx.fillRect(padding, height * 0.90, 120, 4);
}

function renderCtaSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  accentColor: string,
  padding: number,
  contentWidth: number,
  width: number,
  height: number
): void {
  const centerX = width / 2;

  // ── Calculate text block for centering ──
  ctx.font = `bold 72px "${FONT_FAMILIES.heading}"`;
  const headlineLines = wrapText(ctx, slide.headline, contentWidth - 80);
  const lineH = 84;

  let bodyLines: string[] = [];
  if (slide.body_text) {
    ctx.font = `400 30px "${FONT_FAMILIES.body}"`;
    bodyLines = wrapText(ctx, slide.body_text, contentWidth - 80);
  }
  const bodyHeight = bodyLines.length * 42;
  const headlineHeight = headlineLines.length * lineH;
  const totalTextHeight = headlineHeight + (bodyLines.length > 0 ? 30 + bodyHeight : 0);

  // Position text block in upper-center area
  const startY = height * 0.18 + 80;

  // ── Dark panel behind ALL text (headline + body) ──
  const panelPadX = 50;
  const panelTop = startY - 80;
  const panelBottom = startY + totalTextHeight + 40;
  drawTextPanel(ctx, panelPadX, panelTop, width - panelPadX * 2, panelBottom - panelTop, 24, 0.6);

  // Blue top accent on panel
  ctx.fillStyle = accentColor;
  ctx.fillRect(centerX - 60, panelTop, 120, 4);

  // ── Headline — WHITE, centered ──
  setTextShadow(ctx, 16, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.font = `bold 72px "${FONT_FAMILIES.heading}"`;
  ctx.textAlign = 'center';
  for (let i = 0; i < headlineLines.length; i++) {
    ctx.fillText(headlineLines[i], centerX, startY + i * lineH);
  }

  // ── Body text — light gray ──
  if (bodyLines.length > 0) {
    setTextShadow(ctx, 8);
    ctx.fillStyle = '#CCCCCC';
    ctx.font = `400 30px "${FONT_FAMILIES.body}"`;
    ctx.textAlign = 'center';
    for (let i = 0; i < bodyLines.length; i++) {
      ctx.fillText(bodyLines[i], centerX, startY + headlineHeight + 30 + i * 42);
    }
  }

  clearTextShadow(ctx);

  // CTA button — positioned below panel with breathing room
  if (slide.cta_text) {
    const btnY = Math.max(panelBottom + 60, height * 0.74);
    const btnText = slide.cta_text;
    ctx.font = `bold 36px "${FONT_FAMILIES.subtitle}"`;
    const btnWidth = Math.min(ctx.measureText(btnText).width + 100, contentWidth);
    const btnHeight = 80;
    const btnX = centerX - btnWidth / 2;

    // Button shadow
    ctx.shadowColor = 'rgba(0, 132, 200, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = accentColor;
    drawRoundedRect(ctx, btnX, btnY, btnWidth, btnHeight, 40);
    ctx.fill();

    clearTextShadow(ctx);

    ctx.fillStyle = BRAND_COLORS.white;
    ctx.textAlign = 'center';
    ctx.fillText(btnText, centerX, btnY + btnHeight / 2 + 12);
  }
}

function renderContentSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  accentColor: string,
  padding: number,
  contentWidth: number,
  _width: number,
  height: number
): void {
  // ── Calculate all text dimensions first (dynamic font scaling) ──
  let headlineFontSize = 68;
  let lineH = 80;
  ctx.font = `bold ${headlineFontSize}px "${FONT_FAMILIES.heading}"`;
  let headlineLines = wrapText(ctx, slide.headline, contentWidth - 40);

  // If headline wraps to 3+ lines, scale down for better fit
  if (headlineLines.length > 2) {
    headlineFontSize = 52;
    lineH = 64;
    ctx.font = `bold ${headlineFontSize}px "${FONT_FAMILIES.heading}"`;
    headlineLines = wrapText(ctx, slide.headline, contentWidth - 40);
  }

  const labelY = 100;
  const startY = labelY + 50;
  const headlineBottom = startY + headlineLines.length * lineH;

  let bodyLines: string[] = [];
  if (slide.body_text) {
    ctx.font = `400 36px "${FONT_FAMILIES.body}"`;
    bodyLines = wrapText(ctx, slide.body_text, contentWidth - 40);
  }
  const bodyHeight = bodyLines.length * 50;

  // ── Dark panel behind text ──
  const panelTop = labelY - 30;
  const panelBottom = headlineBottom + 40 + (bodyLines.length > 0 ? bodyHeight + 20 : 0);
  drawTextPanel(ctx, padding - 24, panelTop, contentWidth + 48, panelBottom - panelTop, 20, 0.6);

  // Blue accent bar on left of panel
  ctx.fillStyle = accentColor;
  ctx.fillRect(padding - 24, panelTop, 5, panelBottom - panelTop);

  // ── Slide label ──
  setTextShadow(ctx, 6);
  ctx.fillStyle = accentColor;
  ctx.font = `bold 22px "${FONT_FAMILIES.subtitle}"`;
  ctx.textAlign = 'left';
  ctx.fillText(`SLIDE ${slide.position}`, padding, labelY);

  // ── Headline — BLUE ──
  setTextShadow(ctx, 14, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = accentColor;
  ctx.font = `bold ${headlineFontSize}px "${FONT_FAMILIES.heading}"`;
  for (let i = 0; i < headlineLines.length; i++) {
    ctx.fillText(headlineLines[i], padding, startY + i * lineH);
  }

  // ── Separator ──
  clearTextShadow(ctx);
  const sepY = headlineBottom + 16;
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.fillRect(padding, sepY, 60, 3);

  // ── Body text — white ──
  if (bodyLines.length > 0) {
    setTextShadow(ctx, 8);
    ctx.fillStyle = BRAND_COLORS.white;
    ctx.font = `400 36px "${FONT_FAMILIES.body}"`;
    for (let i = 0; i < bodyLines.length; i++) {
      ctx.fillText(bodyLines[i], padding, sepY + 40 + i * 50);
    }
    clearTextShadow(ctx);
  }

  // CTA if present
  if (slide.cta_text) {
    const ctaY = height - padding - 80;
    ctx.fillStyle = `${accentColor}40`;
    drawRoundedRect(ctx, padding, ctaY, contentWidth, 64, 12);
    ctx.fill();
    setTextShadow(ctx, 6);
    ctx.fillStyle = BRAND_COLORS.white;
    ctx.font = `bold 28px "${FONT_FAMILIES.subtitle}"`;
    ctx.textAlign = 'left';
    ctx.fillText(slide.cta_text, padding + 24, ctaY + 42);
    clearTextShadow(ctx);
  }
}

function renderTipSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  accentColor: string,
  padding: number,
  contentWidth: number,
  width: number,
  height: number
): void {
  // ── Calculate text dimensions ──
  ctx.font = `bold 60px "${FONT_FAMILIES.heading}"`;
  const lines = wrapText(ctx, slide.headline, contentWidth - 40);
  const headlineBottom = 340 + lines.length * 72;

  let bodyLinesArr: string[] = [];
  if (slide.body_text) {
    ctx.font = `400 34px "${FONT_FAMILIES.body}"`;
    bodyLinesArr = wrapText(ctx, slide.body_text, contentWidth - 40);
  }
  const bodyH = bodyLinesArr.length * 48;

  // ── Dark panel behind all text ──
  const panelTop = 90;
  const panelBottom = headlineBottom + 40 + (bodyLinesArr.length > 0 ? bodyH + 30 : 0);
  drawTextPanel(ctx, padding - 24, panelTop, contentWidth + 48, panelBottom - panelTop, 20, 0.6);

  // Blue accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(padding - 24, panelTop, 5, panelBottom - panelTop);

  // "DICA" label
  setTextShadow(ctx, 6);
  ctx.fillStyle = accentColor;
  ctx.font = `bold 24px "${FONT_FAMILIES.subtitle}"`;
  ctx.textAlign = 'left';
  ctx.fillText('DICA', padding, 130);

  // Number badge — big blue
  ctx.fillStyle = accentColor;
  ctx.font = `bold 90px "${FONT_FAMILIES.heading}"`;
  ctx.fillText(`#${slide.position}`, padding, 265);

  // Headline — BLUE
  setTextShadow(ctx, 14, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = accentColor;
  ctx.font = `bold 60px "${FONT_FAMILIES.heading}"`;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], padding, 340 + i * 72);
  }

  clearTextShadow(ctx);

  // Separator — white
  const sepY = headlineBottom + 16;
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.fillRect(padding, sepY, 60, 3);

  // Body text — white
  if (bodyLinesArr.length > 0) {
    setTextShadow(ctx, 8);
    ctx.fillStyle = BRAND_COLORS.white;
    ctx.font = `400 34px "${FONT_FAMILIES.body}"`;
    for (let i = 0; i < bodyLinesArr.length; i++) {
      ctx.fillText(bodyLinesArr[i], padding, sepY + 40 + i * 48);
    }
    clearTextShadow(ctx);
  }
}

function renderTestimonialSlide(
  ctx: CanvasRenderingContext2D,
  slide: SlideData,
  accentColor: string,
  padding: number,
  contentWidth: number,
  width: number,
  height: number
): void {
  const centerX = width / 2;

  // Large quote mark
  ctx.fillStyle = `${accentColor}30`;
  ctx.font = `bold 240px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('"', centerX, height * 0.3);

  // Headline as quote
  setTextShadow(ctx, 16, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = BRAND_COLORS.white;
  ctx.font = `400 46px "${FONT_FAMILIES.body}"`;
  ctx.textAlign = 'center';
  const lines = wrapText(ctx, slide.headline, contentWidth - 40);
  const lineH = 62;
  const startY = height * 0.42;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], centerX, startY + i * lineH);
  }

  clearTextShadow(ctx);

  // Accent line
  const lineY = startY + lines.length * lineH + 32;
  ctx.fillStyle = accentColor;
  ctx.fillRect(centerX - 40, lineY, 80, 4);

  // Body text (attribution / context)
  if (slide.body_text) {
    setTextShadow(ctx, 8);
    ctx.fillStyle = BRAND_COLORS.white;
    ctx.font = `400 32px "${FONT_FAMILIES.body}"`;
    drawWrappedText(ctx, slide.body_text, centerX, lineY + 40, contentWidth, 44, 'center');
    clearTextShadow(ctx);
  }
}

// ─── Upload helper ─────────────────────────────────────────────────────────────

async function uploadSlideImage(
  buffer: Buffer,
  userId: string,
  carouselId: string,
  position: number
): Promise<string | null> {
  const storagePath = `${userId}/${carouselId}/slide-${position}.png`;

  const { error } = await supabaseAdmin.storage
    .from('carousel-assets')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error(`[renderer] Storage upload error for slide ${position}:`, error.message);
    return null;
  }

  // Create a signed URL valid for 1 year
  const { data: signedData, error: signError } = await supabaseAdmin.storage
    .from('carousel-assets')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signError || !signedData?.signedUrl) {
    console.error(`[renderer] Signed URL error for slide ${position}:`, signError?.message);
    return null;
  }

  return signedData.signedUrl;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function renderCarouselById(carouselId: string): Promise<RenderResult[]> {
  // Fetch carousel
  const { data: carousel, error: carouselError } = await supabaseAdmin
    .from('carousels')
    .select('*')
    .eq('id', carouselId)
    .single();

  if (carouselError || !carousel) {
    throw new Error(`Carrossel não encontrado: ${carouselError?.message ?? 'not found'}`);
  }

  // Fetch slides
  const { data: slides, error: slidesError } = await supabaseAdmin
    .from('carousel_slides')
    .select('*')
    .eq('carousel_id', carouselId)
    .order('position');

  if (slidesError || !slides) {
    throw new Error(`Falha ao buscar slides: ${slidesError?.message ?? 'not found'}`);
  }

  // Fetch template if available
  let templateConfig: TemplateConfig = {
    accent_color: BRAND_COLORS.blue,
    bg_color: BRAND_COLORS.black,
    gradient: true,
    format: 'square',
  };

  // Use bg_color from first slide if set, or carousel's template_type defaults
  const templateType: string = (carousel as Record<string, unknown>)['template_type'] as string ?? 'educational';
  const theme: string = (carousel as Record<string, unknown>)['theme'] as string ?? '';
  const totalSlides = slides.length;

  // Build slide contexts so each image reflects its specific card text
  const slideContexts: SlideContext[] = (slides as SlideData[]).map((s) => ({
    headline: s.headline,
    body_text: s.body_text,
    position: s.position,
  }));

  // Generate AI backgrounds for all slides (Imagen 4)
  let aiBackgrounds = new Map<number, GeneratedImage>();
  try {
    const imagenService = getImagenService();
    console.log(`[renderer] Generating AI backgrounds for ${totalSlides} slides with per-slide context...`);
    aiBackgrounds = await imagenService.generateCarouselBackgrounds(theme, templateType, totalSlides, slideContexts);
    console.log(`[renderer] AI backgrounds generated: ${aiBackgrounds.size}/${totalSlides}`);
  } catch (err) {
    console.warn(`[renderer] AI background generation failed, using solid colors:`, (err as Error).message);
  }

  const results: RenderResult[] = [];

  for (const slide of slides as SlideData[]) {
    const layout = determineLayout(slide.position, totalSlides, templateType);
    const aiBg = aiBackgrounds.get(slide.position) ?? null;
    const buffer = await renderSlide(slide, layout, templateConfig, aiBg);

    const userId: string = (carousel as Record<string, unknown>)['user_id'] as string;
    const url = await uploadSlideImage(buffer, userId, carouselId, slide.position);

    if (url) {
      // Update slide with image_url
      await supabaseAdmin
        .from('carousel_slides')
        .update({ image_url: url })
        .eq('id', slide.id);

      results.push({ position: slide.position, url });
    } else {
      // Still include in results but with empty url for partial failure handling
      results.push({ position: slide.position, url: '' });
    }
  }

  // Update carousel status
  await supabaseAdmin
    .from('carousels')
    .update({ status: 'images_generated' })
    .eq('id', carouselId);

  return results;
}

export async function renderSingleSlide(
  carouselId: string,
  position: number
): Promise<RenderResult> {
  // Fetch carousel + slide
  const { data: carousel, error: carouselError } = await supabaseAdmin
    .from('carousels')
    .select('*')
    .eq('id', carouselId)
    .single();

  if (carouselError || !carousel) {
    throw new Error(`Carrossel não encontrado: ${carouselError?.message ?? 'not found'}`);
  }

  const { data: slide, error: slideError } = await supabaseAdmin
    .from('carousel_slides')
    .select('*')
    .eq('carousel_id', carouselId)
    .eq('position', position)
    .single();

  if (slideError || !slide) {
    throw new Error(`Slide não encontrado: ${slideError?.message ?? 'not found'}`);
  }

  // Get total count for layout determination
  const { count } = await supabaseAdmin
    .from('carousel_slides')
    .select('id', { count: 'exact', head: true })
    .eq('carousel_id', carouselId);

  const totalSlides = count ?? 1;
  const templateType: string = (carousel as Record<string, unknown>)['template_type'] as string ?? 'educational';
  const theme: string = (carousel as Record<string, unknown>)['theme'] as string ?? '';
  const layout = determineLayout(position, totalSlides, templateType);

  const templateConfig: TemplateConfig = {
    accent_color: BRAND_COLORS.blue,
    bg_color: BRAND_COLORS.black,
    gradient: true,
    format: 'square',
  };

  // Generate AI background for this slide with its specific text context
  const slideData = slide as SlideData;
  const slideContext: SlideContext = {
    headline: slideData.headline,
    body_text: slideData.body_text,
    position: slideData.position,
  };

  let aiBg: GeneratedImage | null = null;
  try {
    const imagenService = getImagenService();
    let slideRole: 'cover' | 'content' | 'cta' = 'content';
    if (position === 1) slideRole = 'cover';
    else if (position === totalSlides) slideRole = 'cta';
    aiBg = await imagenService.generateSlideBackground(theme, slideRole, templateType, position, totalSlides, slideContext);
  } catch (err) {
    console.warn(`[renderer] AI background failed for slide ${position}, using solid color:`, (err as Error).message);
  }

  const buffer = await renderSlide(slide as SlideData, layout, templateConfig, aiBg);
  const userId: string = (carousel as Record<string, unknown>)['user_id'] as string;
  const url = await uploadSlideImage(buffer, userId, carouselId, position);

  if (url) {
    await supabaseAdmin
      .from('carousel_slides')
      .update({ image_url: url })
      .eq('id', (slide as SlideData).id);
  }

  return { position, url: url ?? '' };
}
