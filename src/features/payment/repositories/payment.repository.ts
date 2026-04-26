import { prisma } from '@/config/db';
import { OrderStatus, Prisma } from '@prisma/client';

export class PaymentRepository {
  async createOrder(
    data: {
      userId: string;
      amount: number;
      orderType?: 'GENERAL' | 'PREMIUM_UPGRADE';
      items?: any;
      snapToken?: string;
      snapUrl?: string;
      paymentIntentId?: string;
    },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    return db.order.create({
      data: {
        userId: data.userId,
        amount: new Prisma.Decimal(data.amount),
        orderType: data.orderType,
        items: data.items,
        snapToken: data.snapToken,
        snapUrl: data.snapUrl,
        paymentIntentId: data.paymentIntentId,
        status: OrderStatus.PENDING,
      },
    });
  }

  async findOrderById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.order.findUnique({ where: { id }, include: { user: true } });
  }

  async findOrderByExternalId(externalId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.order.findUnique({ where: { externalId } });
  }

  async findUserById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.findUnique({ where: { id } });
  }

  async findLatestPremiumOrder(userId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.order.findFirst({
      where: {
        userId,
        orderType: 'PREMIUM_UPGRADE',
        status: 'SUCCESS'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    externalId?: string,
    paymentType?: string,
    snapToken?: string,
    snapUrl?: string,
    paymentIntentId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    return db.order.update({
      where: { id },
      data: { status, externalId, paymentType, snapToken, snapUrl, paymentIntentId },
    });
  }
}

export const paymentRepository = new PaymentRepository();
