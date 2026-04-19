import { prisma } from '@/config/db';
import { OrderStatus, Prisma } from '@prisma/client';

export class PaymentRepository {
  async createOrder(data: {
    userId: string;
    amount: number;
    orderType?: 'GENERAL' | 'PREMIUM_UPGRADE';
    items?: any;
    snapToken?: string;
    snapUrl?: string;
    paymentIntentId?: string;
  }) {
    return prisma.order.create({
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

  async findOrderById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findOrderByExternalId(externalId: string) {
    return prisma.order.findUnique({
      where: { externalId },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async updateOrderStatus(
    id: string, 
    status: OrderStatus, 
    externalId?: string, 
    paymentType?: string,
    snapToken?: string,
    snapUrl?: string,
    paymentIntentId?: string
  ) {
    return prisma.order.update({
      where: { id },
      data: {
        status,
        externalId,
        paymentType,
        snapToken,
        snapUrl,
        paymentIntentId,
      },
    });
  }
}
