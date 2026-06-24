import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../shared/prisma.service';
import { AuthUser } from '../shared/auth-client';

export type UpdateAllMarathonPricesInput = {
  price?: unknown;
  currency?: unknown;
  expectedActiveCount?: unknown;
};

export type AdminPricingItem = {
  id: string;
  languageCode: string;
  slug: string;
  title: string;
  productId: string;
  productTitle: string;
  price: string;
  currency: string;
  totalHours: number;
};

export type AdminPricingResponse = {
  activeCount: number;
  productCount: number;
  items: AdminPricingItem[];
};

export type AdminSessionResponse = {
  admin: true;
  userId: string;
  email?: string;
};

type MarathonWithProduct = {
  id: string;
  languageCode: string;
  slug: string;
  title: string;
  product: {
    id: string;
    title: string;
    price: { toString(): string };
    currency: string;
    totalHours: number;
  } | null;
};

@Injectable()
export class AdminPricingService {
  private readonly logger = new Logger(AdminPricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  getAdminSession(user: AuthUser): AdminSessionResponse {
    this.assertAdmin(user);
    const email = user.email?.trim().toLowerCase() || undefined;
    return {
      admin: true,
      userId: user.id,
      ...(email ? { email } : {}),
    };
  }

  async listActiveMarathonPrices(user: AuthUser): Promise<AdminPricingResponse> {
    this.assertAdmin(user);
    return this.readActiveMarathonPrices();
  }

  async updateAllActiveMarathonPrices(
    user: AuthUser,
    input: UpdateAllMarathonPricesInput,
  ): Promise<AdminPricingResponse> {
    this.assertAdmin(user);
    const price = this.parsePrice(input.price);
    const currency = this.parseCurrency(input.currency);
    const expectedActiveCount = this.parseExpectedActiveCount(input.expectedActiveCount);
    const before = await this.readActiveMarathonPrices();

    if (expectedActiveCount != null && before.activeCount !== expectedActiveCount) {
      throw new ConflictException('Active marathon count changed; reload admin pricing before saving');
    }
    if (before.activeCount !== 13) {
      throw new ConflictException(`Expected 13 active marathons, found ${before.activeCount}`);
    }
    if (before.productCount !== before.activeCount) {
      throw new ConflictException('Every active marathon must have a MarathonProduct before mass price update');
    }

    const updatedCount = await this.prisma.$transaction(async (tx) => {
      const result = await tx.marathonProduct.updateMany({
        where: {
          marathon: { active: true },
        },
        data: {
          price,
          currency,
        },
      });
      return result.count;
    });

    this.logger.log(
      `Admin marathon prices updated: userId=${user.id}, count=${updatedCount}, currency=${currency}`,
    );

    if (updatedCount !== before.productCount) {
      throw new ConflictException('Updated product count did not match active product count');
    }

    return this.readActiveMarathonPrices();
  }

  private async readActiveMarathonPrices(): Promise<AdminPricingResponse> {
    const marathons = (await this.prisma.marathon.findMany({
      where: { active: true },
      include: { product: true },
      orderBy: [{ languageCode: 'asc' }, { slug: 'asc' }],
    })) as MarathonWithProduct[];

    const items = marathons.flatMap((marathon) => {
      if (!marathon.product) return [];
      return [{
        id: marathon.id,
        languageCode: marathon.languageCode,
        slug: marathon.slug,
        title: marathon.title,
        productId: marathon.product.id,
        productTitle: marathon.product.title,
        price: marathon.product.price.toString(),
        currency: marathon.product.currency,
        totalHours: marathon.product.totalHours,
      }];
    });

    return {
      activeCount: marathons.length,
      productCount: items.length,
      items,
    };
  }

  private assertAdmin(user: AuthUser): void {
    const userIds = this.csvSet(process.env.MARATHON_ADMIN_USER_IDS);
    const emails = this.csvSet(process.env.MARATHON_ADMIN_EMAILS);
    const email = user.email?.trim().toLowerCase() || '';
    const userId = user.id.trim().toLowerCase();
    if (!userIds.has(userId) && (!email || !emails.has(email))) {
      throw new ForbiddenException('Marathon admin access required');
    }
  }

  private csvSet(value: string | undefined): Set<string> {
    return new Set((value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
  }

  private parsePrice(value: unknown): string {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new BadRequestException('price is required');
    }
    const price = String(value).trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
      throw new BadRequestException('price must be a positive decimal with up to 2 decimals');
    }
    return price;
  }

  private parseCurrency(value: unknown): string {
    const currency = (typeof value === 'string' && value.trim() ? value : 'EUR').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException('currency must be a 3-letter ISO code');
    }
    return currency;
  }

  private parseExpectedActiveCount(value: unknown): number | null {
    if (value == null || value === '') return null;
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new BadRequestException('expectedActiveCount must be a positive integer');
    }
    return value;
  }
}
