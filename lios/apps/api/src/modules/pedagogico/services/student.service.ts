import { supabaseAdmin } from '../../../lib/supabase.js';

interface UpsertStudentData {
  fullName: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  hotmartBuyerEmail: string;
  metadata: Record<string, unknown>;
}

export const studentService = {
  /**
   * Upsert a student from Hotmart data.
   * If student with same email exists, update fields that are currently empty.
   * Returns the student record.
   */
  async upsertFromHotmart(data: UpsertStudentData): Promise<{ id: string }> {
    // Check if student already exists
    const { data: existing } = await supabaseAdmin
      .from('ped_students')
      .select('id, phone, cpf, hotmart_buyer_email')
      .eq('email', data.email)
      .maybeSingle();

    if (existing) {
      // Update only empty fields (don't overwrite existing data)
      const updates: Record<string, unknown> = {};
      if (!existing.phone && data.phone) updates.phone = data.phone;
      if (!existing.cpf && data.cpf) updates.cpf = data.cpf;
      if (!existing.hotmart_buyer_email && data.hotmartBuyerEmail) updates.hotmart_buyer_email = data.hotmartBuyerEmail;

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from('ped_students')
          .update(updates)
          .eq('id', existing.id);
      }

      // Reactivate if was cancelled/refunded
      await supabaseAdmin
        .from('ped_students')
        .update({ status: 'active' })
        .eq('id', existing.id)
        .in('status', ['cancelled', 'refunded', 'inactive']);

      return { id: existing.id };
    }

    // Create new student
    const { data: student, error } = await supabaseAdmin
      .from('ped_students')
      .insert({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        cpf: data.cpf,
        hotmart_buyer_email: data.hotmartBuyerEmail,
        metadata: data.metadata,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create student: ${error.message}`);
    return { id: student.id };
  },
};
