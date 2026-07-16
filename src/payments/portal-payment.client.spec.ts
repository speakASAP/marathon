import { PortalPaymentClient } from './portal-payment.client';

describe('PortalPaymentClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.SPEAKASAP_PORTAL_URL;
    delete process.env.SPEAKASAP_PORTAL_LEDGER_API_KEY;
    delete process.env.MARATHON_ADMIN_API_KEY;
    delete process.env.PAYMENT_WEBHOOK_API_KEY;
  });

  it('skips register when portal URL is not configured', async () => {
    const client = new PortalPaymentClient();
    await expect(
      client.registerPending({
        email: 'a@b.c',
        amount: 29,
        paymentMethod: 'stripe',
        title: 'Марафон',
        externalPaymentId: 'pay-1',
        marathonOrderId: 'ord-1',
      }),
    ).resolves.toBe('skipped');
  });

  it('registers pending payment on speakasap portal', async () => {
    process.env.SPEAKASAP_PORTAL_URL = 'https://speakasap.com';
    process.env.MARATHON_ADMIN_API_KEY = 'admin-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ status: 'registered', orderId: 1 }),
    }) as any;

    const client = new PortalPaymentClient();
    const result = await client.registerPending({
      email: 'ekaterina.putra@gmail.com',
      amount: 29,
      paymentMethod: 'stripe',
      title: 'Марафон по польскому языку',
      externalPaymentId: 'fb0a6014-da50-4056-8574-330a66f2921b',
      marathonOrderId: 'marathon:22855c43:1',
    });

    expect(result).toBe('registered');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://speakasap.com/api/marathon/payment/register',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-Key': 'admin-key' }),
      }),
    );
  });

  it('confirms via standard payments webhook', async () => {
    process.env.SPEAKASAP_PORTAL_URL = 'https://speakasap.com';
    process.env.MARATHON_ADMIN_API_KEY = 'admin-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'success' }),
    }) as any;

    const client = new PortalPaymentClient();
    const result = await client.confirmViaWebhook({
      externalPaymentId: 'fb0a6014-da50-4056-8574-330a66f2921b',
      marathonOrderId: 'marathon:22855c43:1',
      paymentMethod: 'stripe',
      amount: 29,
    });

    expect(result).toBe('confirmed');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://speakasap.com/api/payments/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-Key': 'admin-key' }),
      }),
    );
  });
});
