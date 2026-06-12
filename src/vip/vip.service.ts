import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';

type CheckoutRequest = {
  marathonerId?: string;
  paymentMethod?: string;
};

type PaymentCallback = {
  amount?: number | string;
  currency?: string;
  paymentId?: string;
  orderId?: string;
  status?: string;
  event?: string;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
};

const SUCCESS_STATUSES = new Set(['completed', 'complete', 'success', 'succeeded', 'paid']);
const PAYMENT_METHODS = new Set(['payu', 'stripe', 'paypal', 'fiobanka', 'comgate', 'card', 'webpay']);

@Injectable()
export class VipService {
  private readonly logger = new Logger(VipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCheckout(userId: string, payload: CheckoutRequest) {
    const marathonerId = payload.marathonerId?.trim();
    if (!marathonerId) {
      throw new BadRequestException('marathonerId is required');
    }

    const participant = await this.findAndClaimParticipant(marathonerId, userId);
    if (!participant.active) {
      throw new BadRequestException('Participant is not active');
    }
    if (!participant.vipRequired || !participant.isFree) {
      return {
        status: 'already_vip',
        marathonerId: participant.id,
        redirectUrl: this.profileUrl(participant.id),
      };
    }

    const product = participant.marathon.product;
    if (!product) {
      throw new BadRequestException('No VIP product is configured for this marathon');
    }

    const apiKey = process.env.PAYMENT_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('Payment API key is not configured');
    }

    const paymentMethod = this.normalizePaymentMethod(payload.paymentMethod);
    const publicBase = this.publicBaseUrl();
    const callbackUrl = process.env.PAYMENT_CALLBACK_URL || `${publicBase}/api/v1/payments/webhook`;
    const orderId = `marathon:${participant.id}:${Date.now()}`;
    const amount = Number(product.price.toString());
    const currency = product.currency || 'EUR';

    const requestBody = {
      orderId,
      applicationId: process.env.PAYMENT_APPLICATION_ID || 'marathon',
      amount,
      currency,
      paymentMethod,
      callbackUrl,
      successUrl: process.env.PAYMENT_SUCCESS_URL || `${publicBase}/profile/${participant.id}?payment=success`,
      cancelUrl: process.env.PAYMENT_CANCEL_URL || `${publicBase}/profile/${participant.id}?payment=cancelled`,
      description: product.title || participant.marathon.title,
      customer: {
        email: participant.email || '',
        name: participant.name || undefined,
        phone: participant.phone || undefined,
      },
      metadata: {
        marathonerId: participant.id,
        participantId: participant.id,
        marathonId: participant.marathonId,
        productId: product.id,
        userId,
      },
    };

    await this.prisma.marathonPaymentAttempt.create({
      data: {
        amount: product.price,
        currency,
        orderId,
        participantId: participant.id,
        paymentMethod,
        productId: product.id,
        status: 'checkout_requested',
      },
    });

    const endpoint = `${this.paymentServiceUrl()}/payments/create`;
    this.logger.log(`Creating VIP checkout: marathonerId=${participant.id}, orderId=${orderId}, method=${paymentMethod}`);

    let response: Response;
    let responseBody: any = {};
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });
      responseBody = await response.json().catch(() => ({}));
    } catch (error) {
      await this.prisma.marathonPaymentAttempt.update({
        where: { orderId },
        data: {
          checkoutResponse: { error: error instanceof Error ? error.message : String(error) },
          status: 'checkout_failed',
        },
      });
      throw new InternalServerErrorException('Payment service checkout request failed');
    }

    if (!response.ok) {
      this.logger.error(`Payment service rejected checkout: status=${response.status}, orderId=${orderId}`);
      await this.prisma.marathonPaymentAttempt.update({
        where: { orderId },
        data: {
          checkoutResponse: responseBody,
          status: 'checkout_rejected',
        },
      });
      throw new InternalServerErrorException({
        message: 'Payment service rejected checkout creation',
        paymentStatus: response.status,
        paymentResponse: responseBody,
      });
    }

    await this.prisma.marathonPaymentAttempt.update({
      where: { orderId },
      data: {
        checkoutResponse: responseBody,
        providerPaymentId: this.extractProviderPaymentId(responseBody),
        status: 'checkout_created',
      },
    });

    return {
      status: 'checkout_created',
      marathonerId: participant.id,
      orderId,
      payment: responseBody,
      redirectUrl: responseBody?.data?.redirectUrl || responseBody?.redirectUrl || null,
    };
  }

  async redeemGift(userId: string, marathonerId: string | undefined, rawCode: string | undefined) {
    const normalizedMarathonerId = marathonerId?.trim();
    const code = rawCode?.trim();
    if (!normalizedMarathonerId) {
      throw new BadRequestException('marathonerId is required');
    }
    if (!code) {
      throw new BadRequestException('code is required');
    }

    const participant = await this.findAndClaimParticipant(normalizedMarathonerId, userId);
    const gift = await this.prisma.marathonGift.findUnique({
      where: { code },
    });
    if (!gift || gift.marathonId !== participant.marathonId) {
      throw new NotFoundException('Gift code not found for this marathon');
    }
    if (gift.usedAt) {
      throw new BadRequestException('Gift code has already been used');
    }

    await this.prisma.$transaction(async (tx) => {
      const updatedGift = await tx.marathonGift.updateMany({
        where: {
          id: gift.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
          redeemedByUserId: userId,
        },
      });

      if (updatedGift.count !== 1) {
        throw new BadRequestException('Gift code has already been used');
      }

      await tx.marathonParticipant.update({
        where: { id: participant.id },
        data: {
          userId,
          isFree: false,
          paymentReported: true,
        },
      });
    });

    this.logger.log(`Gift redeemed: marathonerId=${participant.id}, giftId=${gift.id}, userId=${userId}`);
    return {
      status: 'vip_unlocked',
      marathonerId: participant.id,
      redirectUrl: this.profileUrl(participant.id),
    };
  }

  async handlePaymentCallback(apiKey: string | string[] | undefined, payload: PaymentCallback) {
    this.validateCallbackApiKey(apiKey);

    const status = String(payload.status || '').toLowerCase();
    const event = String(payload.event || '').toLowerCase();
    const orderId = payload.orderId?.trim();
    if (!orderId) {
      throw new BadRequestException('orderId is required');
    }

    const attempt = await this.prisma.marathonPaymentAttempt.findUnique({
      where: { orderId },
      include: {
        participant: true,
        product: true,
      },
    });
    if (!attempt) {
      throw new NotFoundException('Payment attempt not found');
    }

    const marathonerId = this.extractMarathonerId(payload);
    if (marathonerId && marathonerId !== attempt.participantId) {
      throw new BadRequestException('Payment callback participant does not match checkout order');
    }
    this.validateCallbackProduct(payload, attempt.productId);
    this.validateCallbackAmount(payload, Number(attempt.amount.toString()), attempt.currency);
    const providerPaymentId = this.extractProviderPaymentId(payload);

    if (!SUCCESS_STATUSES.has(status) && !SUCCESS_STATUSES.has(event)) {
      await this.prisma.marathonPaymentAttempt.update({
        where: { orderId },
        data: {
          callbackPayload: payload as any,
          providerPaymentId: providerPaymentId || attempt.providerPaymentId,
          status: status || event || 'callback_ignored',
        },
      });
      this.logger.log(
        `Ignoring non-success payment callback: marathonerId=${attempt.participantId}, orderId=${orderId}, status=${status}, event=${event}`,
      );
      return { status: 'ignored', marathonerId: attempt.participantId, orderId };
    }

    if (attempt.status === 'confirmed') {
      if (
        providerPaymentId &&
        attempt.providerPaymentId &&
        providerPaymentId !== attempt.providerPaymentId
      ) {
        throw new BadRequestException('Payment callback provider payment ID does not match confirmed checkout order');
      }
      return { status: 'vip_unlocked', marathonerId: attempt.participantId, orderId, idempotent: true };
    }

    if (!attempt.participant.active) {
      throw new BadRequestException('Participant is not active');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.marathonPaymentAttempt.update({
        where: { orderId },
        data: {
          callbackPayload: payload as any,
          confirmedAt: new Date(),
          providerPaymentId: providerPaymentId || attempt.providerPaymentId,
          status: 'confirmed',
        },
      });

      await tx.marathonParticipant.update({
        where: { id: attempt.participantId },
        data: {
          isFree: false,
          paymentReported: true,
        },
      });
    });

    this.logger.log(
      `VIP payment confirmed: marathonerId=${attempt.participantId}, paymentId=${providerPaymentId || ''}, orderId=${orderId}`,
    );
    return { status: 'vip_unlocked', marathonerId: attempt.participantId, orderId };
  }

  private async findAndClaimParticipant(marathonerId: string, userId: string) {
    const participant = await this.prisma.marathonParticipant.findFirst({
      where: {
        id: marathonerId,
        OR: [{ userId }, { userId: null }],
      },
      include: {
        marathon: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.userId && participant.userId !== userId) {
      throw new ForbiddenException('Participant belongs to another user');
    }

    if (!participant.userId) {
      return this.prisma.marathonParticipant.update({
        where: { id: participant.id },
        data: { userId },
        include: {
          marathon: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    return participant;
  }

  private normalizePaymentMethod(method?: string): string {
    const value = (method || process.env.PAYMENT_DEFAULT_METHOD || 'stripe').toLowerCase();
    if (!PAYMENT_METHODS.has(value)) {
      throw new BadRequestException('Unsupported payment method');
    }
    return value;
  }

  private validateCallbackApiKey(apiKey: string | string[] | undefined): void {
    const expected = process.env.PAYMENT_WEBHOOK_API_KEY;
    if (!expected) {
      this.logger.error('Payment callback rejected because PAYMENT_WEBHOOK_API_KEY is not configured');
      throw new UnauthorizedException('Payment callback API key is not configured');
    }
    const value = Array.isArray(apiKey) ? apiKey[0] : apiKey;
    if (value !== expected) {
      throw new UnauthorizedException('Invalid payment callback API key');
    }
  }

  private extractMarathonerId(payload: PaymentCallback): string | null {
    const metadataId =
      payload.metadata?.marathonerId ||
      payload.metadata?.participantId ||
      payload.metadata?.marathonParticipantId;
    if (typeof metadataId === 'string' && metadataId.trim()) {
      return metadataId.trim();
    }

    const orderId = payload.orderId || '';
    const match = orderId.match(/^marathon:([^:]+):/);
    return match ? match[1] : null;
  }

  private extractProviderPaymentId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const record = payload as Record<string, any>;
    const value =
      record.paymentId ||
      record.payment_id ||
      record.id ||
      record.data?.paymentId ||
      record.data?.payment_id ||
      record.data?.id;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private validateCallbackProduct(payload: PaymentCallback, expectedProductId: string): void {
    const productId = payload.metadata?.productId;
    if (typeof productId === 'string' && productId.trim() && productId.trim() !== expectedProductId) {
      throw new BadRequestException('Payment callback product does not match checkout order');
    }
  }

  private validateCallbackAmount(payload: PaymentCallback, expectedAmount: number, expectedCurrency: string): void {
    if (payload.amount != null) {
      const amount = Number(payload.amount);
      if (!Number.isFinite(amount) || amount !== expectedAmount) {
        throw new BadRequestException('Payment callback amount does not match checkout order');
      }
    }
    if (payload.currency && payload.currency.toUpperCase() !== expectedCurrency.toUpperCase()) {
      throw new BadRequestException('Payment callback currency does not match checkout order');
    }
  }

  private paymentServiceUrl(): string {
    return (process.env.PAYMENT_SERVICE_URL || 'http://payments-microservice:3468').replace(/\/$/, '');
  }

  private publicBaseUrl(): string {
    const configured = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL;
    if (configured) {
      return configured.replace(/\/$/, '');
    }
    return process.env.DOMAIN ? `https://${process.env.DOMAIN}` : 'https://marathon.alfares.cz';
  }

  private profileUrl(marathonerId: string): string {
    return `${this.publicBaseUrl()}/profile/${marathonerId}`;
  }
}
