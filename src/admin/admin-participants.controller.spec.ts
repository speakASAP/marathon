import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminParticipantsController } from './admin-participants.controller';
import { AdminParticipantPaymentsService } from './admin-participant-payments.service';
import { PrismaService } from '../shared/prisma.service';

describe('AdminParticipantsController', () => {
  let controller: AdminParticipantsController;
  const prisma = {
    marathonParticipant: { findMany: jest.fn() },
  };
  const participantPayments = {
    getPaymentsByOrderIds: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    process.env.PAYMENT_WEBHOOK_API_KEY = 'test-key';
    participantPayments.getPaymentsByOrderIds.mockResolvedValue(new Map());
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminParticipantsController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: AdminParticipantPaymentsService, useValue: participantPayments },
      ],
    }).compile();
    controller = moduleRef.get(AdminParticipantsController);
  });

  const ekaterina = {
    id: '22855c43-92a0-40e1-8c06-cbf22553e8ba',
    marathonId: '67f11c27-0a3a-466c-9f1c-a1edfddbf1a3',
    email: 'ekaterina.putra@gmail.com',
    name: 'Екатерина',
    paid: true,
    active: true,
    createdAt: new Date('2026-07-07T15:59:33.547Z'),
    finishedAt: null,
    marathon: { title: 'Польский язык' },
    paymentAttempts: [
      {
        orderId: 'o1',
        amount: '29',
        currency: 'EUR',
        status: 'confirmed',
        confirmedAt: new Date('2026-07-14T14:55:35.356Z'),
        createdAt: new Date('2026-07-14T14:54:00.000Z'),
      },
      {
        orderId: 'o0',
        amount: '29',
        currency: 'EUR',
        status: 'checkout_failed',
        confirmedAt: null,
        createdAt: new Date('2026-07-13T10:00:00.000Z'),
      },
    ],
  };

  it('returns participants with confirmed payment for an email', async () => {
    prisma.marathonParticipant.findMany.mockResolvedValue([ekaterina]);
    const res = await controller.search('ekaterina.putra@gmail.com');
    expect(res.results).toHaveLength(1);
    expect(res.results[0].paid).toBe(true);
    expect(res.results[0].marathonTitle).toBe('Польский язык');
    expect(res.results[0].payment?.currency).toBe('EUR');
    expect(res.results[0].payment?.amount).toBe('29');
    expect(prisma.marathonParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: { equals: 'ekaterina.putra@gmail.com', mode: 'insensitive' } },
      }),
    );
  });

  it('enriches participants with payments and transactions from payments-microservice', async () => {
    prisma.marathonParticipant.findMany.mockResolvedValue([ekaterina]);
    participantPayments.getPaymentsByOrderIds.mockResolvedValue(
      new Map([
        [
          'o1',
          [
            {
              paymentId: 'pay-1',
              orderId: 'o1',
              amount: '29.00',
              currency: 'EUR',
              paymentMethod: 'card',
              status: 'completed',
              createdAt: '2026-07-14T14:54:20.192Z',
              completedAt: '2026-07-14T14:55:33.001Z',
              refundedAt: null,
              transactions: [
                {
                  id: 'tx-1',
                  transactionType: 'payment',
                  amount: '29.00',
                  status: 'success',
                  createdAt: '2026-07-14T14:54:20.989Z',
                },
              ],
            },
          ],
        ],
      ]),
    );

    const res = await controller.search('ekaterina.putra@gmail.com');

    expect(participantPayments.getPaymentsByOrderIds).toHaveBeenCalledWith(['o1', 'o0']);
    expect(res.results[0].payments).toHaveLength(1);
    expect(res.results[0].payments![0].paymentMethod).toBe('card');
    expect(res.results[0].payments![0].transactions[0].transactionType).toBe('payment');
  });

  it('returns payments null when payments-microservice is unavailable (fail-soft)', async () => {
    prisma.marathonParticipant.findMany.mockResolvedValue([ekaterina]);
    participantPayments.getPaymentsByOrderIds.mockResolvedValue(null);

    const res = await controller.search('ekaterina.putra@gmail.com');

    expect(res.results[0].payments).toBeNull();
    expect(res.results[0].payment?.amount).toBe('29');
  });

  it('returns payment null when there is no confirmed attempt', async () => {
    prisma.marathonParticipant.findMany.mockResolvedValue([
      {
        id: 'p1',
        marathonId: 'm1',
        email: 'a@b.cz',
        name: null,
        paid: false,
        active: true,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        finishedAt: null,
        marathon: { title: 'X' },
        paymentAttempts: [],
      },
    ]);
    const res = await controller.search('a@b.cz');
    expect(res.results[0].payment).toBeNull();
    expect(res.results[0].payments).toEqual([]);
  });

  it('rejects missing email', async () => {
    await expect(controller.search('')).rejects.toThrow(BadRequestException);
  });

  it('rejects an invalid email', async () => {
    await expect(controller.search('not-an-email')).rejects.toThrow(BadRequestException);
  });
});
