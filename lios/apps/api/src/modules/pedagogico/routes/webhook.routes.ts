import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../../lib/supabase.js';
import { hotmartService, type HotmartWebhookPayload } from '../services/hotmart.service.js';

const router = Router();

/**
 * POST /api/v1/webhooks/hotmart
 * Public endpoint — no JWT auth. Validated by hottok signature.
 * Returns 200 immediately, processes asynchronously.
 */
router.post('/hotmart', async (req: Request, res: Response): Promise<void> => {
  const hottok = req.headers['x-hotmart-hottok'] as string | undefined;
  const payload = req.body as HotmartWebhookPayload;

  // 1. Validate signature
  if (!hotmartService.validateSignature(hottok)) {
    console.warn('[webhook/hotmart] Invalid hottok signature');
    res.status(401).json({ error: { message: 'Invalid signature', code: 'INVALID_SIGNATURE' } });
    return;
  }

  // 2. Log webhook immediately
  const { data: log, error: logError } = await supabaseAdmin
    .from('ped_webhook_logs')
    .insert({
      source: 'hotmart',
      event_type: payload.event || 'unknown',
      payload,
      status: 'received',
    })
    .select('id')
    .single();

  if (logError) {
    console.error('[webhook/hotmart] Failed to log webhook:', logError.message);
    // Still return 200 to Hotmart so it doesn't retry
    res.status(200).json({ received: true });
    return;
  }

  // 3. Respond 200 immediately (NFR1: < 5 seconds)
  res.status(200).json({ received: true, logId: log.id });

  // 4. Process asynchronously
  setImmediate(() => {
    hotmartService.processWebhook(log.id, payload).catch((err) => {
      console.error('[webhook/hotmart] Async processing error:', (err as Error).message);
    });
  });
});

export default router;
