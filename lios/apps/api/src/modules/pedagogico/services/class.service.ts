import { supabaseAdmin } from '../../../lib/supabase.js';

export const classService = {
  /**
   * Find a class by its Hotmart product ID.
   * Returns null if no class is mapped to this product.
   */
  async resolveByProductId(productHotmartId: string): Promise<{ id: string; abbreviation: string } | null> {
    const { data, error } = await supabaseAdmin
      .from('ped_classes')
      .select('id, abbreviation')
      .eq('product_hotmart_id', productHotmartId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw new Error(`Failed to resolve class: ${error.message}`);
    return data;
  },
};
