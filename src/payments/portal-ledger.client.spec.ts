import { PortalLedgerClient } from './portal-ledger.client';

describe('PortalLedgerClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.SPEAKASAP_PORTAL_URL;
    delete process.env.SPEAKASAP_PORTAL_LEDGER_API_KEY;
    delete process.env.MARATHON_ADMIN_API_KEY;
    delete process.env.PAYMENT_WEBHOOK_API_KEY;
  });

  it('skips when portal URL is not configured', async () => {
    const client = new PortalLedgerClient();
    await expect(
      client.recordPayment({
        email: 'a@b.c',
        amount: 29,
        paymentMethod: 'card',
        title: 'Марафон',
        externalPaymentId: 'pay-1',
        marathonOrderId: 'ord-1',
      }),
    ).resolves.toBe('skipped');
  });

  it('posts ledger payload to speakasap portal', async () => {
    process.env.SPEAKASAP_PORTAL_URL = 'https://speakasap.com';
    process.env.MARATHON_ADMIN_API_KEY = 'admin-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ status: 'created', orderId: 1 }),
    }) as any;

    const client = new PortalLedgerClient();
    const result = await client.recordPayment({
      email: 'ekaterina.putra@gmail.com',
      amount: 29,
      paymentMethod: 'card',
      title: 'Марафон по польскому языку',
      externalPaymentId: 'fb0a6014-da50-4056-8574-330a66f2921b',
      marathonOrderId: 'marathon:22855c43:1',
      confirmedAt: '2026-07-14T14:55:35.356Z',
    });

    expect(result).toBe('created');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://speakasap.com/api/marathon/ledger',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-Key': 'admin-key' }),
      }),
    );
  });
});
