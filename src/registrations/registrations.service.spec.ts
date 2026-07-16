import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../shared/prisma.service';
import { NotificationsService } from '../shared/notifications.service';
import type { AuthUser } from '../shared/auth-client';

function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['userId', 'marathonId'] },
  } as never);
}

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  const prisma = {
    marathon: { findFirst: jest.fn() },
    marathonParticipant: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  const notifications = { send: jest.fn() };

  const marathon = {
    id: 'm1',
    languageCode: 'en',
    title: 'English marathon',
    product: { id: 'prod1' },
    steps: [
      { assignmentContent: 'Do the thing', isTrialStep: false, sequence: 1, title: 'Step 1' },
    ],
  };

  const authUser: AuthUser = {
    id: 'u1',
    email: 'user@example.com',
  } as AuthUser;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(RegistrationsService);
    prisma.marathon.findFirst.mockResolvedValue(marathon);
    notifications.send.mockResolvedValue(undefined);
  });

  it('creates a participant for an authenticated user with no existing registration', async () => {
    prisma.marathonParticipant.findFirst.mockResolvedValue(null);
    prisma.marathonParticipant.create.mockResolvedValue({ id: 'new-id' });

    const result = await service.register({ languageCode: 'en' }, authUser);

    expect(result.marathonerId).toBe('new-id');
    expect(result.userBound).toBe(true);
    expect(prisma.marathonParticipant.create).toHaveBeenCalledTimes(1);
  });

  it('reuses the existing participant found by the pre-create check', async () => {
    prisma.marathonParticipant.findFirst.mockResolvedValue({ id: 'existing-id' });

    const result = await service.register({ languageCode: 'en' }, authUser);

    expect(result.marathonerId).toBe('existing-id');
    expect(result.userBound).toBe(true);
    expect(prisma.marathonParticipant.create).not.toHaveBeenCalled();
  });

  it('returns the existing participant when a concurrent duplicate creation hits the unique index', async () => {
    prisma.marathonParticipant.create.mockRejectedValue(p2002());
    prisma.marathonParticipant.findFirst
      .mockResolvedValueOnce(null) // pre-create check: nothing yet (race window)
      .mockResolvedValueOnce({ id: 'existing-id', marathonId: 'm1', active: true, paid: false }); // post-P2002 re-fetch

    const result = await service.register({ languageCode: 'en' }, authUser);

    expect(result.marathonerId).toBe('existing-id');
    expect(result.userBound).toBe(true);
  });

  it('rethrows non-P2002 create errors unchanged', async () => {
    prisma.marathonParticipant.findFirst.mockResolvedValue(null);
    prisma.marathonParticipant.create.mockRejectedValue(new Error('db down'));

    await expect(service.register({ languageCode: 'en' }, authUser)).rejects.toThrow('db down');
  });
});
