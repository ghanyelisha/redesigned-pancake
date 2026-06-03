import { NextRequest, NextResponse } from 'next/server';
import { PaymentOperation } from '@hachther/mesomb';

// Allow up to 90 s so the customer has time to approve the USSD push
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const { bookingId, phone, service, amount, reference } = await req.json();

    // ── Validate required fields ──────────────────────────────────────────────
    if (!phone || !service || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required payment fields.' },
        { status: 400 }
      );
    }

    // ── MeSomb credentials (server-side only) ─────────────────────────────────
    const applicationKey =
      process.env.MESOMB_APPLICATION_KEY ?? 'n239nr2i302n3knls9df03niwner90nwe0r9we';
    const accessKey  = process.env.MESOMB_ACCESS_KEY  ?? '';
    const secretKey  = process.env.MESOMB_SECRET_KEY  ?? '';

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Payment gateway is not fully configured. Please contact support.',
        },
        { status: 503 }
      );
    }

    // ── Call MeSomb ───────────────────────────────────────────────────────────
    const client = new PaymentOperation({ applicationKey, accessKey, secretKey });

    const response = await (client as any).makeCollect({
      payer:     phone,
      amount:    Number(amount),
      service:   service,        // 'MTN' or 'ORANGE'
      country:   'CM',
      currency:  'XAF',
      reference: reference ?? bookingId,
      trxID:     bookingId,
      fees:      true,           // fees included in the amount
    });

    const operationOk   = response.isOperationSuccess?.() ?? false;
    const transactionOk = response.isTransactionSuccess?.() ?? false;
    const trx           = (response as any).transaction ?? null;
    const message       = (response as any).message ?? null;

    // ── Success ───────────────────────────────────────────────────────────────
    if (operationOk && transactionOk) {
      return NextResponse.json({
        success:       true,
        transactionPk: trx?.pk      ?? null,
        finTrxId:      trx?.fin_trx_id ?? null,
        status:        trx?.status  ?? 'SUCCESS',
        fees:          trx?.fees    ?? 0,
      });
    }

    // ── Transaction failed (e.g. customer declined, insufficient funds) ───────
    return NextResponse.json(
      {
        success: false,
        message: message ?? 'Payment was not completed. Please try again.',
        status:  trx?.status ?? 'FAILED',
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[MeSomb collect error]', err);

    // MeSomb throws specific error types — surface a clean message
    const userMessage: string =
      err?.message?.includes('timeout') || err?.code === 'ECONNABORTED'
        ? 'The payment request timed out. Please check your phone and try again.'
        : err?.message?.includes('Insufficient')
        ? 'Insufficient balance on your mobile money account.'
        : err?.message ?? 'Payment service error. Please try again.';

    return NextResponse.json(
      { success: false, message: userMessage },
      { status: 500 }
    );
  }
}
