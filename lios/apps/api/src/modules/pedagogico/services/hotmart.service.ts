import { timingSafeEqual } from 'crypto';
import { config } from '../../../config.js';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { studentService } from './student.service.js';
import { classService } from './class.service.js';

// ─── Hotmart event types we handle ────────────────────────────────────────────
const ENROLLMENT_EVENTS = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'] as const;
const PENDING_EVENTS = ['PURCHASE_DELAYED'] as const;
const ACCESS_EVENTS = ['PURCHASE_ACCESS_AVAILABLE'] as const;
const CANCEL_EVENTS = ['PURCHASE_CANCELED'] as const;
const REFUND_EVENTS = ['PURCHASE_REFUNDED'] as const;
const CHARGEBACK_EVENTS = ['PURCHASE_PROTEST', 'PURCHASE_CHARGEBACK'] as const;

type ProcessingStep = {
  step: string;
  status: 'success' | 'failed' | 'skipped';
  timestamp: string;
  error?: string;
  data?: Record<string, unknown>;
};

// ─── Hotmart webhook payload types ────────────────────────────────────────────
export interface HotmartWebhookPayload {
  event: string;
  data: {
    buyer?: {
      name?: string;
      email?: string;
      phone?: string;
      document?: string; // CPF
    };
    purchase?: {
      transaction?: string;
      order_date?: string;
      approved_date?: string;
      warranty_expire_date?: number;
      price?: { value?: number };
      payment?: { type?: string };
      offer?: { payment_mode?: string; code?: string };
      is_subscription?: boolean;
      recurrency_number?: number;
      status?: string;
    };
    product?: {
      id?: number;
      name?: string;
    };
    subscription?: {
      subscriber_code?: string;
      status?: string;
    };
  };
  hottok?: string;
}

export const hotmartService = {
  /**
   * Validate webhook signature using hottok (timing-safe comparison).
   */
  validateSignature(hottok: string | undefined): boolean {
    const secret = config.hotmartWebhookSecret;
    if (!secret || !hottok) return false;

    try {
      const a = Buffer.from(hottok, 'utf8');
      const b = Buffer.from(secret, 'utf8');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },

  /**
   * Parse and normalize Hotmart webhook payload.
   */
  parsePayload(payload: HotmartWebhookPayload) {
    const { event, data } = payload;
    const buyer = data?.buyer;
    const purchase = data?.purchase;
    const product = data?.product;

    // Calculate access_until from warranty_expire_date
    let accessUntil: string | null = null;
    let daysRemaining: number | null = null;
    if (purchase?.warranty_expire_date) {
      const d = new Date(purchase.warranty_expire_date);
      accessUntil = d.toISOString().split('T')[0];
      daysRemaining = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    return {
      event,
      buyerName: buyer?.name?.trim() || '',
      buyerEmail: buyer?.email?.trim().toLowerCase() || '',
      buyerPhone: buyer?.phone?.trim() || null,
      buyerCpf: buyer?.document?.trim() || null,
      transactionId: purchase?.transaction || null,
      purchaseDate: purchase?.approved_date || purchase?.order_date || null,
      amountPaid: purchase?.price?.value ?? null,
      paymentMethod: purchase?.payment?.type || null,
      productId: product?.id ? String(product.id) : null,
      productName: product?.name || null,
      accessUntil,
      daysRemaining,
      isSubscription: purchase?.is_subscription ?? false,
      paymentMode: purchase?.offer?.payment_mode || null,
      recurrencyNumber: purchase?.recurrency_number ?? null,
    };
  },

  /**
   * Process a webhook asynchronously. Logs each step.
   */
  async processWebhook(webhookLogId: string, payload: HotmartWebhookPayload): Promise<void> {
    const steps: ProcessingStep[] = [];
    const parsed = this.parsePayload(payload);
    const event = parsed.event;

    const addStep = (step: string, status: ProcessingStep['status'], data?: Record<string, unknown>, error?: string) => {
      steps.push({ step, status, timestamp: new Date().toISOString(), ...(data && { data }), ...(error && { error }) });
    };

    try {
      // Update log to processing
      await supabaseAdmin.from('ped_webhook_logs').update({ status: 'processing' }).eq('id', webhookLogId);

      // ─── ENROLLMENT EVENTS (new purchase) ───────────────────────────────
      if ([...ENROLLMENT_EVENTS, ...PENDING_EVENTS].some(e => e === event)) {
        const enrollmentStatus = PENDING_EVENTS.some(e => e === event) ? 'pending' : 'active';

        // Step 1: Idempotency check
        if (parsed.transactionId) {
          const { data: existing } = await supabaseAdmin
            .from('ped_enrollments')
            .select('id')
            .eq('hotmart_transaction', parsed.transactionId)
            .maybeSingle();

          if (existing) {
            addStep('idempotency_check', 'skipped', { reason: 'duplicate_transaction', transactionId: parsed.transactionId });
            await this.finalizeLog(webhookLogId, 'skipped', steps);
            return;
          }
        }
        addStep('idempotency_check', 'success');

        // Step 2: Upsert student
        let studentId: string;
        try {
          const student = await studentService.upsertFromHotmart({
            fullName: parsed.buyerName,
            email: parsed.buyerEmail,
            phone: parsed.buyerPhone,
            cpf: parsed.buyerCpf,
            hotmartBuyerEmail: parsed.buyerEmail,
            metadata: payload.data,
            accessUntil: parsed.accessUntil,
            daysRemaining: parsed.daysRemaining,
            isSubscription: parsed.isSubscription,
            paymentMode: parsed.paymentMode,
            recurrencyNumber: parsed.recurrencyNumber,
          });
          studentId = student.id;
          addStep('upsert_student', 'success', { studentId });
        } catch (err) {
          addStep('upsert_student', 'failed', undefined, (err as Error).message);
          await this.finalizeLog(webhookLogId, 'failed', steps, (err as Error).message, undefined, undefined);
          return;
        }

        // Step 3: Resolve class
        let classId: string | null = null;
        try {
          if (parsed.productId) {
            const cls = await classService.resolveByProductId(parsed.productId);
            classId = cls?.id || null;
          }
          addStep('resolve_class', classId ? 'success' : 'skipped', {
            classId,
            productId: parsed.productId,
            ...(classId ? {} : { reason: 'no_class_mapped' }),
          });
        } catch (err) {
          addStep('resolve_class', 'failed', undefined, (err as Error).message);
          // Non-blocking — continue without class
        }

        // Step 4: Create enrollment (only if class found)
        let enrollmentId: string | null = null;
        if (classId) {
          try {
            const { data: enrollment, error } = await supabaseAdmin
              .from('ped_enrollments')
              .insert({
                student_id: studentId,
                class_id: classId,
                hotmart_transaction: parsed.transactionId,
                hotmart_product_id: parsed.productId,
                purchase_date: parsed.purchaseDate,
                amount_paid: parsed.amountPaid,
                payment_method: parsed.paymentMethod,
                status: enrollmentStatus,
                metadata: payload.data,
              })
              .select('id')
              .single();

            if (error) throw error;
            enrollmentId = enrollment.id;
            addStep('create_enrollment', 'success', { enrollmentId, status: enrollmentStatus });
          } catch (err) {
            addStep('create_enrollment', 'failed', undefined, (err as Error).message);
          }
        } else {
          addStep('create_enrollment', 'skipped', { reason: 'no_class_resolved' });
        }

        await this.finalizeLog(webhookLogId, 'completed', steps, undefined, studentId, enrollmentId);
        return;
      }

      // ─── ACCESS EVENT ───────────────────────────────────────────────────
      if (ACCESS_EVENTS.some(e => e === event)) {
        if (parsed.transactionId) {
          const { data: enrollment, error } = await supabaseAdmin
            .from('ped_enrollments')
            .update({ status: 'accessed', accessed_at: new Date().toISOString() })
            .eq('hotmart_transaction', parsed.transactionId)
            .select('id, student_id')
            .maybeSingle();

          if (error) {
            addStep('update_access', 'failed', undefined, error.message);
          } else if (enrollment) {
            addStep('update_access', 'success', { enrollmentId: enrollment.id });
            await this.finalizeLog(webhookLogId, 'completed', steps, undefined, enrollment.student_id, enrollment.id);
            return;
          } else {
            addStep('update_access', 'skipped', { reason: 'enrollment_not_found', transactionId: parsed.transactionId });
          }
        }
        await this.finalizeLog(webhookLogId, 'completed', steps);
        return;
      }

      // ─── CANCEL / REFUND / CHARGEBACK EVENTS ───────────────────────────
      const statusMap: Record<string, string> = {};
      CANCEL_EVENTS.forEach(e => statusMap[e] = 'cancelled');
      REFUND_EVENTS.forEach(e => statusMap[e] = 'refunded');
      CHARGEBACK_EVENTS.forEach(e => statusMap[e] = 'chargeback');

      const newStatus = statusMap[event];
      if (newStatus && parsed.transactionId) {
        const { data: enrollment, error } = await supabaseAdmin
          .from('ped_enrollments')
          .update({ status: newStatus })
          .eq('hotmart_transaction', parsed.transactionId)
          .select('id, student_id')
          .maybeSingle();

        if (error) {
          addStep('update_status', 'failed', undefined, error.message);
        } else if (enrollment) {
          addStep('update_status', 'success', { enrollmentId: enrollment.id, newStatus });

          // Update student status if all enrollments are cancelled/refunded
          if (['cancelled', 'refunded', 'chargeback'].includes(newStatus)) {
            try {
              const { data: activeEnrollments } = await supabaseAdmin
                .from('ped_enrollments')
                .select('id')
                .eq('student_id', enrollment.student_id)
                .in('status', ['active', 'accessed', 'pending'])
                .limit(1);

              if (!activeEnrollments || activeEnrollments.length === 0) {
                await supabaseAdmin
                  .from('ped_students')
                  .update({ status: newStatus })
                  .eq('id', enrollment.student_id);
                addStep('update_student_status', 'success', { newStatus });
              }
            } catch (err) {
              addStep('update_student_status', 'failed', undefined, (err as Error).message);
            }
          }

          await this.finalizeLog(webhookLogId, 'completed', steps, undefined, enrollment.student_id, enrollment.id);
          return;
        } else {
          addStep('update_status', 'skipped', { reason: 'enrollment_not_found', transactionId: parsed.transactionId });
        }

        await this.finalizeLog(webhookLogId, 'completed', steps);
        return;
      }

      // ─── UNHANDLED EVENT ────────────────────────────────────────────────
      addStep('unhandled_event', 'skipped', { event });
      await this.finalizeLog(webhookLogId, 'completed', steps);

    } catch (err) {
      addStep('fatal_error', 'failed', undefined, (err as Error).message);
      await this.finalizeLog(webhookLogId, 'failed', steps, (err as Error).message);
    }
  },

  /**
   * Update webhook log with final status and steps.
   */
  async finalizeLog(
    webhookLogId: string,
    status: string,
    steps: ProcessingStep[],
    errorMessage?: string,
    studentId?: string,
    enrollmentId?: string | null,
  ): Promise<void> {
    await supabaseAdmin
      .from('ped_webhook_logs')
      .update({
        status,
        processing_steps: steps,
        processed_at: new Date().toISOString(),
        ...(errorMessage && { error_message: errorMessage }),
        ...(studentId && { student_id: studentId }),
        ...(enrollmentId && { enrollment_id: enrollmentId }),
      })
      .eq('id', webhookLogId);
  },
};
