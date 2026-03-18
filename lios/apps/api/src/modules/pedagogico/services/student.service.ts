import { supabaseAdmin } from '../../../lib/supabase.js';

interface UpsertStudentData {
  fullName: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  hotmartBuyerEmail: string;
  metadata: Record<string, unknown>;
  // Enrichment from Hotmart
  accessUntil?: string | null;
  daysRemaining?: number | null;
  isSubscription?: boolean;
  paymentMode?: string | null;
  recurrencyNumber?: number | null;
}

export const studentService = {
  /**
   * Upsert a student from Hotmart data.
   * If student with same email exists, update fields that are currently empty.
   * New students get climatronico_level = "Start" by default.
   * Returns the student record.
   */
  async upsertFromHotmart(data: UpsertStudentData): Promise<{ id: string }> {
    // Build enriched metadata
    const enrichedMeta: Record<string, unknown> = { ...data.metadata };
    enrichedMeta.climatronico_level = enrichedMeta.climatronico_level || 'Start';
    if (data.accessUntil) enrichedMeta.access_until = data.accessUntil;
    if (data.daysRemaining !== null && data.daysRemaining !== undefined) enrichedMeta.days_remaining = data.daysRemaining;
    if (data.isSubscription) enrichedMeta.is_subscription = true;
    if (data.paymentMode) enrichedMeta.payment_mode = data.paymentMode;
    if (data.recurrencyNumber) enrichedMeta.recurrency_number = data.recurrencyNumber;

    // Check if student already exists
    const { data: existing } = await supabaseAdmin
      .from('ped_students')
      .select('id, phone, cpf, hotmart_buyer_email, metadata')
      .eq('email', data.email)
      .maybeSingle();

    if (existing) {
      // Update only empty fields (don't overwrite existing data)
      const updates: Record<string, unknown> = {};
      if (!existing.phone && data.phone) updates.phone = data.phone;
      if (!existing.cpf && data.cpf) updates.cpf = data.cpf;
      if (!existing.hotmart_buyer_email && data.hotmartBuyerEmail) updates.hotmart_buyer_email = data.hotmartBuyerEmail;

      // Merge metadata: update access_until/days_remaining (always take latest), keep other existing values
      const existingMeta = (existing.metadata as Record<string, unknown>) || {};
      const mergedMeta = { ...existingMeta };
      if (data.accessUntil) {
        // Take the furthest access date
        const existingAccess = existingMeta.access_until as string;
        if (!existingAccess || data.accessUntil > existingAccess) {
          mergedMeta.access_until = data.accessUntil;
          mergedMeta.days_remaining = data.daysRemaining;
        }
      }
      if (!mergedMeta.climatronico_level) mergedMeta.climatronico_level = 'Start';
      if (data.isSubscription) mergedMeta.is_subscription = true;
      if (data.paymentMode) mergedMeta.payment_mode = data.paymentMode;
      if (data.recurrencyNumber) mergedMeta.recurrency_number = data.recurrencyNumber;
      updates.metadata = mergedMeta;

      await supabaseAdmin
        .from('ped_students')
        .update(updates)
        .eq('id', existing.id);

      // Reactivate if was cancelled/refunded
      await supabaseAdmin
        .from('ped_students')
        .update({ status: 'active' })
        .eq('id', existing.id)
        .in('status', ['cancelled', 'refunded', 'inactive']);

      return { id: existing.id };
    }

    // Create new student with enriched metadata
    const { data: student, error } = await supabaseAdmin
      .from('ped_students')
      .insert({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        hotmart_buyer_email: data.hotmartBuyerEmail,
        metadata: enrichedMeta,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create student: ${error.message}`);
    return { id: student.id };
  },
};
