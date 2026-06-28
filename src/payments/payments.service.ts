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
import { AuthUser } from '../shared/auth-client';
import { NotificationsService } from '../shared/notifications.service';

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
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

type CallbackAmountCurrency = {
  amount: number;
  currency: string;
  source: 'callback' | 'payment_status';
};

type PaymentStatusResponse = {
  amount: number | string;
  currency: string;
  status?: string;
};

const SUCCESS_STATUSES = new Set(['completed', 'complete', 'success', 'succeeded', 'paid']);
const PAYMENT_METHODS = new Set(['payu', 'stripe', 'paypal', 'fiobanka', 'comgate', 'card', 'webpay']);
const BANK_TRANSFER_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  ru: 'Russian',
  uk: 'Ukrainian',
  cz: 'Czech',
  cs: 'Czech',
  sk: 'Slovak',
  nl: 'Dutch',
  dk: 'Danish',
  da: 'Danish',
  se: 'Swedish',
  sv: 'Swedish',
  no: 'Norwegian',
  tr: 'Turkish',
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createCheckout(user: AuthUser, payload: CheckoutRequest) {
    const userId = user.id;
    const marathonerId = payload.marathonerId?.trim();
    if (!marathonerId) {
      throw new BadRequestException('marathonerId is required');
    }

    const participant = await this.findAndClaimParticipant(marathonerId, userId);
    if (!participant.active) {
      throw new BadRequestException('Participant is not active');
    }
    if (participant.paid) {
      return {
        status: 'already_paid',
        marathonerId: participant.id,
        redirectUrl: this.profileUrl(participant.id),
      };
    }

    const product = participant.marathon.product;
    if (!product) {
      throw new BadRequestException('No payment product is configured for this marathon');
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

    const customer = this.getCheckoutCustomer(participant, user);
    const description = this.getCheckoutDescription(
      paymentMethod,
      product.title || participant.marathon.title,
      participant.marathon.languageCode,
    );
    const requestBody = {
      orderId,
      applicationId: process.env.PAYMENT_APPLICATION_ID || 'marathon',
      amount,
      currency,
      paymentMethod,
      callbackUrl,
      successUrl: process.env.PAYMENT_SUCCESS_URL || `${publicBase}/profile/${participant.id}?payment=success`,
      cancelUrl: process.env.PAYMENT_CANCEL_URL || `${publicBase}/profile/${participant.id}?payment=cancelled`,
      description,
      customer,
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
    this.logger.log(`Creating marathon checkout: marathonerId=${participant.id}, orderId=${orderId}, method=${paymentMethod}`);

    let response: Response;
    let responseBody: any = {};
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Idempotency-Key': orderId,
        },
        body: JSON.stringify(requestBody),
      });
      responseBody = await response.json().catch(() => ({}));
    } catch (error) {
      await this.prisma.marathonPaymentAttempt.update({
        where: { orderId },
        data: {
          checkoutResponse: {
            status: 'request_failed',
            errorType: error instanceof Error ? error.name : 'Error',
          },
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
          checkoutResponse: this.summarizeCheckoutResponse(responseBody, response.status) as any,
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
        checkoutResponse: this.summarizeCheckoutResponse(responseBody, response.status) as any,
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

  async reconcileCheckout(user: AuthUser, payload: CheckoutRequest) {
    const marathonerId = payload.marathonerId?.trim();
    if (!marathonerId) {
      throw new BadRequestException('marathonerId is required');
    }

    const participant = await this.findAndClaimParticipant(marathonerId, user.id);
    if (participant.paid) {
      return {
        status: 'already_paid',
        marathonerId: participant.id,
        redirectUrl: this.profileUrl(participant.id),
      };
    }

    const attempt = await this.prisma.marathonPaymentAttempt.findFirst({
      where: {
        participantId: participant.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        participant: {
          include: {
            marathon: {
              include: {
                steps: {
                  orderBy: { sequence: 'asc' },
                  select: { id: true, sequence: true, title: true },
                },
              },
            },
          },
        },
        product: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Payment attempt not found');
    }
    if (!attempt.providerPaymentId) {
      throw new BadRequestException('Payment provider ID is not available for this checkout');
    }
    if (attempt.status === 'confirmed') {
      return { status: 'payment_confirmed', marathonerId: attempt.participantId, orderId: attempt.orderId, idempotent: true };
    }

    const paymentStatus = await this.fetchPaymentStatus(attempt.providerPaymentId);
    const remoteStatus = String(paymentStatus.status || '').toLowerCase();
    if (remoteStatus && !SUCCESS_STATUSES.has(remoteStatus)) {
      await this.prisma.marathonPaymentAttempt.update({
        where: { orderId: attempt.orderId },
        data: {
          status: remoteStatus,
          callbackPayload: this.compactRecord({
            orderId: attempt.orderId,
            status: remoteStatus,
            paymentId: attempt.providerPaymentId,
            reconciledFrom: 'profile_return',
          }) as any,
        },
      });
      return { status: 'pending', marathonerId: attempt.participantId, orderId: attempt.orderId };
    }

    const amountCurrency: CallbackAmountCurrency = {
      amount: Number(paymentStatus.amount),
      currency: paymentStatus.currency,
      source: 'payment_status',
    };
    this.validateCallbackAmount(
      amountCurrency.amount,
      amountCurrency.currency,
      Number(attempt.amount.toString()),
      attempt.currency,
    );

    const callbackSummary = this.compactRecord({
      orderId: attempt.orderId,
      status: remoteStatus || 'succeeded',
      paymentId: attempt.providerPaymentId,
      amount: amountCurrency.amount,
      currency: amountCurrency.currency,
      amountCurrencySource: amountCurrency.source,
      reconciledFrom: 'profile_return',
    });

    return this.confirmPaymentAttempt(attempt, attempt.providerPaymentId, callbackSummary);
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
    if (!participant.active) {
      throw new BadRequestException('Participant is not active');
    }

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
          paid: true,
          
        },
      });
    });

    this.logger.log(`Gift redeemed: marathonerId=${participant.id}, giftId=${gift.id}, userId=${userId}`);
    return {
      status: 'payment_confirmed',
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
        participant: {
          include: {
            marathon: {
              include: {
                steps: {
                  orderBy: { sequence: 'asc' },
                  select: { id: true, sequence: true, title: true },
                },
              },
            },
          },
        },
        product: true,
      },
    });
    if (!attempt) {
      throw new NotFoundException('Payment attempt not found');
    }

    const providerPaymentId = this.extractProviderPaymentId(payload);
    const callbackSummary = this.summarizeCallbackPayload(payload);

    if (!SUCCESS_STATUSES.has(status) && !SUCCESS_STATUSES.has(event)) {
      await this.prisma.marathonPaymentAttempt.update({
        where: { orderId },
        data: {
          callbackPayload: callbackSummary as any,
          providerPaymentId: attempt.providerPaymentId || providerPaymentId,
          status: status || event || 'callback_ignored',
        },
      });
      this.logger.log(
        `Ignoring non-success payment callback: marathonerId=${attempt.participantId}, orderId=${orderId}, status=${status}, event=${event}`,
      );
      return { status: 'ignored', marathonerId: attempt.participantId, orderId };
    }

    const marathonerId = this.requireCallbackMarathonerId(payload);
    if (marathonerId !== attempt.participantId) {
      throw new BadRequestException('Payment callback participant does not match checkout order');
    }
    this.validateRequiredCallbackProduct(payload, attempt.productId);
    if (!providerPaymentId) {
      throw new BadRequestException('Payment callback provider payment ID is required');
    }
    this.validateCallbackProviderPaymentId(providerPaymentId, attempt.providerPaymentId);
    const callbackAmountCurrency = await this.resolveCallbackAmountCurrency(payload, providerPaymentId);
    this.validateCallbackAmount(
      callbackAmountCurrency.amount,
      callbackAmountCurrency.currency,
      Number(attempt.amount.toString()),
      attempt.currency,
    );
    const confirmedCallbackSummary = this.summarizeCallbackPayload(payload, callbackAmountCurrency);

    return this.confirmPaymentAttempt(attempt, providerPaymentId, confirmedCallbackSummary);
  }

  private async confirmPaymentAttempt(attempt: any, providerPaymentId: string, callbackPayload: Record<string, unknown>) {
    if (attempt.status === 'confirmed') {
      return { status: 'payment_confirmed', marathonerId: attempt.participantId, orderId: attempt.orderId, idempotent: true };
    }

    if (!attempt.participant.active) {
      throw new BadRequestException('Participant is not active');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.marathonPaymentAttempt.update({
        where: { orderId: attempt.orderId },
        data: {
          callbackPayload: callbackPayload as any,
          confirmedAt: new Date(),
          providerPaymentId,
          status: 'confirmed',
        },
      });

      await tx.marathonParticipant.update({
        where: { id: attempt.participantId },
        data: {
          paid: true,
          
        },
      });
    });

    await this.sendPaymentConfirmedNotification(attempt.participant);

    this.logger.log(
      `Marathon payment confirmed: marathonerId=${attempt.participantId}, paymentId=${providerPaymentId || ''}, orderId=${attempt.orderId}`,
    );
    return { status: 'payment_confirmed', marathonerId: attempt.participantId, orderId: attempt.orderId };
  }

  private async sendPaymentConfirmedNotification(participant: any): Promise<void> {
    const email = participant.email?.trim();
    if (!email || email.endsWith('@example.invalid')) {
      this.logger.log(
        `Skipping payment confirmation notification: marathonerId=${participant.id}, hasEmail=${Boolean(email)}, smoke=${Boolean(email?.endsWith('@example.invalid'))}`,
      );
      return;
    }

    const firstStep = participant.marathon?.steps?.[0];
    const profileUrl = this.profileUrl(participant.id);
    const firstStepUrl = firstStep
      ? `${this.publicBaseUrl()}/steps/${encodeURIComponent(firstStep.id)}?marathonerId=${encodeURIComponent(participant.id)}`
      : profileUrl;
    const greeting = participant.name?.trim() ? `${participant.name.trim()}, спасибо за покупку!` : 'Спасибо за покупку!';
    const marathonTitle = participant.marathon?.title || 'марафона';
    const firstStepLine = firstStep
      ? `Первый этап уже открыт: ${firstStep.title}. Откройте его здесь: ${firstStepUrl}`
      : `Марафон уже открыт в вашем профиле: ${profileUrl}`;

    this.logger.log(`marathon.payment.notification_requested marathonerId=${participant.id} channel=email`);
    await this.notificationsService.send({
      channel: 'email',
      type: 'custom',
      recipient: email,
      subject: 'Оплата марафона подтверждена',
      message: `${greeting}\n\nОплата ${marathonTitle} прошла успешно. ${firstStepLine}\n\nЕсли система попросит войти, используйте ваш обычный логин и пароль - после входа мы вернем вас на эту же страницу.`,
      templateData: {
        marathonId: participant.marathonId,
        marathonerId: participant.id,
        marathonTitle,
        firstStepId: firstStep?.id || null,
        firstStepTitle: firstStep?.title || null,
        firstStepUrl,
        profileUrl,
      },
    });
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

  private getCheckoutDescription(paymentMethod: string, fallbackTitle: string, languageCode: string): string {
    if (paymentMethod !== 'fiobanka') {
      return fallbackTitle;
    }

    const languageName = BANK_TRANSFER_LANGUAGE_NAMES[languageCode.toLowerCase()] || 'Language';
    return this.sanitizeBankTransferMessage(`${languageName} Marathon`) || 'Marathon';
  }

  private sanitizeBankTransferMessage(value: string): string {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 .,_/-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  }

  private getCheckoutCustomer(
    participant: { email: string | null; name: string | null; phone: string | null },
    user: AuthUser,
  ): { email: string; name?: string; phone?: string } {
    const email = participant.email?.trim() || user.email?.trim() || '';
    const name = participant.name?.trim() || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name?.trim() || '';
    const phone = participant.phone?.trim() || user.phone?.trim() || '';

    if (!email) {
      throw new BadRequestException('Checkout requires an email address for the authenticated user');
    }

    return {
      email,
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
    };
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

  private requireCallbackMarathonerId(payload: PaymentCallback): string {
    const metadataId =
      payload.metadata?.marathonerId ||
      payload.metadata?.participantId ||
      payload.metadata?.marathonParticipantId;
    if (typeof metadataId === 'string' && metadataId.trim()) {
      return metadataId.trim();
    }
    throw new BadRequestException('Payment callback participant is required');
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

  private validateRequiredCallbackProduct(payload: PaymentCallback, expectedProductId: string): void {
    const productId = payload.metadata?.productId;
    if (typeof productId !== 'string' || !productId.trim()) {
      throw new BadRequestException('Payment callback product is required');
    }
    if (productId.trim() !== expectedProductId) {
      throw new BadRequestException('Payment callback product does not match checkout order');
    }
  }

  private validateCallbackProviderPaymentId(providerPaymentId: string, expectedProviderPaymentId: string | null): void {
    if (expectedProviderPaymentId && providerPaymentId !== expectedProviderPaymentId) {
      throw new BadRequestException('Payment callback provider payment ID does not match checkout order');
    }
  }

  private validateCallbackAmount(
    amount: number,
    currency: string,
    expectedAmount: number,
    expectedCurrency: string,
  ): void {
    if (!Number.isFinite(amount) || amount !== expectedAmount) {
      throw new BadRequestException('Payment callback amount does not match checkout order');
    }
    if (!currency || currency.toUpperCase() !== expectedCurrency.toUpperCase()) {
      throw new BadRequestException('Payment callback currency does not match checkout order');
    }
  }

  private async resolveCallbackAmountCurrency(
    payload: PaymentCallback,
    providerPaymentId: string,
  ): Promise<CallbackAmountCurrency> {
    if (payload.amount != null && payload.currency) {
      return {
        amount: Number(payload.amount),
        currency: payload.currency,
        source: 'callback',
      };
    }

    const paymentStatus = await this.fetchPaymentStatus(providerPaymentId);
    return {
      amount: Number(paymentStatus.amount),
      currency: paymentStatus.currency,
      source: 'payment_status',
    };
  }

  private async fetchPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const apiKey = process.env.PAYMENT_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('Payment API key is required for callback reconciliation');
    }

    const endpoint = `${this.paymentServiceUrl()}/payments/${encodeURIComponent(paymentId)}`;
    let response: Response;
    let body: any = {};
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
        },
      });
      body = await response.json().catch(() => ({}));
    } catch (_error) {
      throw new BadRequestException('Payment callback amount/currency could not be reconciled');
    }

    if (!response.ok) {
      throw new BadRequestException('Payment callback amount/currency could not be reconciled');
    }

    const amount = body?.data?.amount;
    const currency = body?.data?.currency;
    const status = this.stringField(body?.data?.status) || this.stringField(body?.status);
    if (amount == null || typeof currency !== 'string' || !currency.trim()) {
      throw new BadRequestException('Payment status response is missing amount or currency');
    }

    return { amount, currency, status };
  }

  private summarizeCheckoutResponse(responseBody: unknown, httpStatus?: number): Record<string, unknown> {
    const record = this.asRecord(responseBody);
    const data = this.asRecord(record.data);
    return this.compactRecord({
      httpStatus,
      success: typeof record.success === 'boolean' ? record.success : undefined,
      paymentId: this.extractProviderPaymentId(responseBody),
      status: this.stringField(data.status) || this.stringField(record.status),
      hasRedirectUrl: Boolean(this.stringField(data.redirectUrl) || this.stringField(record.redirectUrl)),
      expiresAt: this.stringField(data.expiresAt),
      errorCode: this.stringField(this.asRecord(record.error).code),
    });
  }

  private summarizeCallbackPayload(
    payload: PaymentCallback,
    amountCurrency?: CallbackAmountCurrency,
  ): Record<string, unknown> {
    const metadata = this.asRecord(payload.metadata);
    return this.compactRecord({
      orderId: payload.orderId?.trim(),
      status: this.stringField(payload.status)?.toLowerCase(),
      event: this.stringField(payload.event)?.toLowerCase(),
      paymentMethod: this.stringField(payload.paymentMethod)?.toLowerCase(),
      paymentId: this.extractProviderPaymentId(payload),
      providerTransactionId: this.stringField(metadata.providerTransactionId),
      timestamp: this.stringField(payload.timestamp),
      amount: amountCurrency?.amount,
      currency: amountCurrency?.currency,
      amountCurrencySource: amountCurrency?.source,
      metadata: this.compactRecord({
        marathonerId: this.stringField(metadata.marathonerId),
        participantId: this.stringField(metadata.participantId),
        marathonParticipantId: this.stringField(metadata.marathonParticipantId),
        marathonId: this.stringField(metadata.marathonId),
        productId: this.stringField(metadata.productId),
      }),
    });
  }

  private asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  }

  private stringField(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private compactRecord(record: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(record).filter(([, value]) => {
        if (value == null) {
          return false;
        }
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
          return false;
        }
        return true;
      }),
    );
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
