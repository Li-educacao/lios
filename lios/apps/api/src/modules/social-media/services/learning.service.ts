import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedbackStats {
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

export interface RelevantExample {
  field: string;
  original: string;
  corrected: string;
  template_type: string;
  theme: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEARNING_THRESHOLD = 20;

// ─── Service ──────────────────────────────────────────────────────────────────

export class LearningService {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * Get feedback statistics for a user, joined via carousels ownership.
   */
  async getStats(userId: string): Promise<FeedbackStats> {
    // Fetch all feedback for this user via carousel join
    const { data: feedbackRows, error } = await this.db
      .from('carousel_feedback')
      .select(`
        id,
        field,
        original_text,
        corrected_text,
        created_at,
        carousels!inner (
          user_id,
          template_type,
          theme
        )
      `)
      .eq('carousels.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[LearningService.getStats] DB error:', error);
      throw new Error('Falha ao buscar estatísticas de feedback');
    }

    const rows = (feedbackRows ?? []) as unknown as Array<{
      id: string;
      field: string;
      original_text: string;
      corrected_text: string;
      created_at: string;
      carousels: { user_id: string; template_type: string; theme: string };
    }>;

    const total = rows.length;

    const by_field = { headline: 0, body_text: 0, cta_text: 0 };
    const by_template: Record<string, number> = {};

    for (const row of rows) {
      const field = row.field as 'headline' | 'body_text' | 'cta_text';
      if (field in by_field) {
        by_field[field]++;
      }

      const template = row.carousels?.template_type ?? 'unknown';
      by_template[template] = (by_template[template] ?? 0) + 1;
    }

    const recent_corrections = rows.slice(0, 10).map((row) => ({
      field: row.field,
      original: row.original_text,
      corrected: row.corrected_text,
      template_type: row.carousels?.template_type ?? '',
      theme: row.carousels?.theme ?? '',
      created_at: row.created_at,
    }));

    return {
      total_corrections: total,
      by_field,
      by_template,
      recent_corrections,
      learning_active: total >= LEARNING_THRESHOLD,
    };
  }

  /**
   * Check if learning is active for a user (total feedback >= threshold).
   */
  async isLearningActive(userId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('carousel_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('carousels.user_id', userId);

    if (error) {
      // Non-fatal — if we can't check, disable learning to avoid errors
      console.error('[LearningService.isLearningActive] error:', error);
      return false;
    }

    return (count ?? 0) >= LEARNING_THRESHOLD;
  }

  /**
   * Get most relevant correction examples for the prompt enhancement.
   * Priority: same template + theme keywords > same template > any corrections.
   */
  async getRelevantExamples(
    userId: string,
    templateType: string,
    theme: string,
    limit = 5
  ): Promise<RelevantExample[]> {
    // Fetch all feedback with carousel metadata for this user
    const { data: rows, error } = await this.db
      .from('carousel_feedback')
      .select(`
        field,
        original_text,
        corrected_text,
        created_at,
        carousels!inner (
          user_id,
          template_type,
          theme
        )
      `)
      .eq('carousels.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200); // Fetch enough to filter from

    if (error) {
      console.error('[LearningService.getRelevantExamples] DB error:', error);
      return [];
    }

    const allRows = (rows ?? []) as unknown as Array<{
      field: string;
      original_text: string;
      corrected_text: string;
      created_at: string;
      carousels: { user_id: string; template_type: string; theme: string };
    }>;

    // Build theme keywords (split by spaces and filter short words)
    const themeKeywords = theme
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const toExample = (row: typeof allRows[number]): RelevantExample => ({
      field: row.field,
      original: row.original_text,
      corrected: row.corrected_text,
      template_type: row.carousels?.template_type ?? '',
      theme: row.carousels?.theme ?? '',
    });

    // Priority 1: same template_type AND theme keyword match
    const priority1 = allRows.filter((row) => {
      const rowTemplate = row.carousels?.template_type ?? '';
      const rowTheme = (row.carousels?.theme ?? '').toLowerCase();
      const sameTemplate = rowTemplate === templateType;
      const themeMatch = themeKeywords.some((kw) => rowTheme.includes(kw));
      return sameTemplate && themeMatch;
    });

    if (priority1.length >= limit) {
      return priority1.slice(0, limit).map(toExample);
    }

    // Priority 2: same template_type only
    const priority2 = allRows.filter(
      (row) => (row.carousels?.template_type ?? '') === templateType
    );

    const combined = [
      ...priority1,
      ...priority2.filter((r) => !priority1.includes(r)),
    ];

    if (combined.length >= limit) {
      return combined.slice(0, limit).map(toExample);
    }

    // Priority 3: any corrections (fill remaining slots)
    const remaining = allRows.filter((r) => !combined.includes(r));
    return [...combined, ...remaining].slice(0, limit).map(toExample);
  }

  /**
   * Format relevant examples as few-shot prompt text for Gemini.
   */
  buildFewShotExamples(examples: RelevantExample[]): string {
    if (examples.length === 0) return '';

    const lines = examples.map(
      (ex) => `- Em vez de "${ex.original}", prefira "${ex.corrected}" (campo: ${ex.field})`
    );

    return `Exemplos de preferências do usuário:\n${lines.join('\n')}`;
  }
}
