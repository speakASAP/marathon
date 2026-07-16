import { AdminParticipantPaymentsService } from './admin-participant-payments.service';

describe('AdminParticipantPaymentsService', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.PAYMENT_API_KEY;
  const originalAppId = process.env.PAYMENT_APPLICATION_ID;
  let service: AdminParticipantPaymentsService;

  beforeEach(() => {
    process.env.PAYMENT_API_KEY = 'payments-key';
    process.env.PAYMENT_APPLICATION_ID = 'marathon';
    service = new AdminParticipantPaymentsService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.PAYMENT_API_KEY;
    else process.env.PAYMENT_API_KEY = originalApiKey;
    if (originalAppId === undefined) delete process.env.PAYMENT_APPLICATION_ID;
    else process.env.PAYMENT_APPLICATION_ID = originalAppId;
  });

  it('fetches payments with transactions grouped by orderId', async () => {
    const payload = {
      success: true,
      data: {
        payments: [
          {
            paymentId: 'pay-1',
            orderId: 'marathon:p1:111',
            applicationId: 'marathon',
            amount: 29,
            currency: 'EUR',
            paymentMethod: 'stripe',
            status: 'completed',
            createdAt: '2026-07-14T14:54:00.000Z',
            completedAt: '2026-07-14T14:55:35.000Z',
            refundedAt: null,
            transactions: [
              {
                id: 'tx-1',
                transactionType: 'payment',
                amount: 29,
                status: 'success',
                createdAt: '2026-07-14T14:55:35.000Z',
              },
            ],
          },
        ],
      },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    }) as never;

    const result = await service.getPaymentsByOrderIds(['marathon:p1:111']);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/payments/transactions/by-order-ids');
    expect(calledUrl).toContain('applicationId=marathon');
    expect(result).not.toBeNull();
    expect(result!.get('marathon:p1:111')).toHaveLength(1);
    expect(result!.get('marathon:p1:111')![0].transactions[0].transactionType).toBe('payment');
  });

  it('returns null when the payments service call fails (fail-soft)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as never;
    await expect(service.getPaymentsByOrderIds(['o1'])).resolves.toBeNull();
  });

  it('returns null when the payments service responds non-200 (fail-soft)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as never;
    await expect(service.getPaymentsByOrderIds(['o1'])).resolves.toBeNull();
  });

  it('returns an empty map without calling the service for no orderIds', async () => {
    global.fetch = jest.fn() as never;
    const result = await service.getPaymentsByOrderIds([]);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
