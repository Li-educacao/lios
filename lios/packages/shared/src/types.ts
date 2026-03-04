export type CarouselStatus = 'draft' | 'text_validated' | 'images_generated' | 'exported';
export type TemplateType = 'educational' | 'social_proof' | 'tips_list' | 'cover_cta';
export type SlideFormat = '1080x1080' | '1080x1350';

export interface Carousel {
  id: string;
  user_id: string;
  title: string;
  theme: string;
  template_type: TemplateType;
  status: CarouselStatus;
  slide_count: number;
  created_at: string;
  updated_at: string;
}

export interface CarouselSlide {
  id: string;
  carousel_id: string;
  position: number;
  headline: string;
  body_text: string;
  cta_text?: string;
  image_url?: string;
  bg_color?: string;
}

export interface CarouselTemplate {
  id: string;
  name: string;
  description: string;
  layout_config: Record<string, unknown>;
  is_default: boolean;
}

export interface CarouselFeedback {
  id: string;
  carousel_id: string;
  slide_position: number;
  field: 'headline' | 'body_text' | 'cta_text';
  original_text: string;
  corrected_text: string;
  created_at: string;
}

export interface WritingPersona {
  id: string;
  user_id: string;
  name: string;
  tone: string[];
  example_phrases: string[];
  words_to_use: string[];
  words_to_avoid: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
