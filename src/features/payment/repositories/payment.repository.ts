import { prisma } from '@/config/db';
import { OrderStatus, Prisma } from '@prisma/client';
import { ORDER_TYPE, ORDER_STATUS } from '@/shared/constants';

export class PaymentRepository {
  async createOrder(
    data: {
      userId: string;
      amount: number;
      orderType?: typeof ORDER_TYPE[keyof typeof ORDER_TYPE];
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
        orderType: ORDER_TYPE.PREMIUM_UPGRADE,
        status: ORDER_STATUS.SUCCESS
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
