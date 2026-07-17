import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService.handlePaymentCallback provider status verification', () => {
  const originalFetch = global.fetch;
  const env = process.env;

  const prisma = {
    marathonPaymentAttempt: { findUnique: jest.fn(), update: jest.fn() },
    marathonParticipant: { update: jest.fn() },
    $transaction: jest.fn(),
  };
  const notificationsService = { send: jest.fn() };
  let service: PaymentsService;

  const attempt = () => ({
    orderId: 'marathon:participant-1:123',
    status: 'checkout_created',
    amount: { toString: () => '29' },
    currency: 'EUR',
    participantId: 'participant-1',
    productId: 'product-1',
    providerPaymentId: 'pay-uuid-1',
    participant: {
      id: 'participant-1',
      active: true,
      email: 'smoke@example.invalid',
      name: 'Smoke',
      marathon: { title: 'Test', steps: [] },
      marathonId: 'marathon-1',
    },
    product: { title: 'Марафон' },
  });

  const forgedCompletedCallback = {
    paymentId: 'pay-uuid-1',
    orderId: 'marathon:participant-1:123',
    status: 'completed',
    event: 'completed',
    paymentMethod: 'stripe',
    metadata: { marathonerId: 'participant-1', productId: 'product-1' },
  };

  const paymentsServiceResponse = (status: string) => ({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        data: { paymentId: 'pay-uuid-1', status, amount: 29, currency: 'EUR' },
      }),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...env };
    process.env.PAYMENT_WEBHOOK_API_KEY = 'hook-key';
    process.env.PAYMENT_API_KEY = 'payments-key';
    delete process.env.SPEAKASAP_PORTAL_URL;
    prisma.marathonPaymentAttempt.findUnique.mockResolvedValue(attempt());
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        marathonPaymentAttempt: { update: jest.fn() },
        marathonParticipant: { update: jest.fn() },
      }),
    );
    service = new PaymentsService(prisma as never, notificationsService as never);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env = env;
  });

  it('rejects a completed callback when payments-microservice says the payment is still processing', async () => {
    global.fetch = jest.fn().mockResolvedValue(paymentsServiceResponse('processing')) as never;

    await expect(
      service.handlePaymentCallback('hook-key', forgedCompletedCallback as never),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('confirms the attempt when payments-microservice reports the payment completed', async () => {
    global.fetch = jest.fn().mockResolvedValue(paymentsServiceResponse('completed')) as never;

    const result = await service.handlePaymentCallback('hook-key', forgedCompletedCallback as never);

    expect(result.status).toBe('payment_confirmed');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
