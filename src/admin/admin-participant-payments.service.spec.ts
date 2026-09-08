import { AdminParticipantPaymentsService } from './admin-participant-payments.service';

describe('AdminParticipantPaymentsService', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.MARATHON_TO_PAYMENTS_TOKEN;
  const originalAppId = process.env.PAYMENT_APPLICATION_ID;
  let service: AdminParticipantPaymentsService;

  beforeEach(() => {
    process.env.MARATHON_TO_PAYMENTS_TOKEN = 'payments-rs256-token';
    process.env.PAYMENT_APPLICATION_ID = 'marathon';
    service = new AdminParticipantPaymentsService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.MARATHON_TO_PAYMENTS_TOKEN;
    else process.env.MARATHON_TO_PAYMENTS_TOKEN = originalToken;
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
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer payments-rs256-token' }),
      }),
    );
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('/payments/transactions/by-order-ids');
    expect(calledUrl).toContain('applicationId=marathon');
    expect(result).not.toBeNull();
    expect(result!.get('marathon:p1:111')).toHaveLength(1);
    expect(result!.get('marathon:p1:111')![0].transactions[0].transactionType).toBe('payment');
  });

  it('returns null and logs error when MARATHON_TO_PAYMENTS_TOKEN is missing', async () => {
    delete process.env.MARATHON_TO_PAYMENTS_TOKEN;
    global.fetch = jest.fn() as never;
    const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

    await expect(service.getPaymentsByOrderIds(['o1'])).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('MARATHON_TO_PAYMENTS_TOKEN'),
    );
    errorSpy.mockRestore();
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
