import { prisma } from '@/config/db';
import { ContentInput, ContentUpdateInput } from '@/features/content/types/content.types';

export class ContentRepository {
  async create(data: ContentInput) {
    return prisma.content.create({
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        contentType: data.contentType || 'text',
        isPremium: data.isPremium ?? true,
        tags: data.tags,
      },
    });
  }

  async findAll() {
    return prisma.content.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    return prisma.content.findUnique({ where: { id } });
  }

  async findPremiumContent() {
    return prisma.content.findMany({
      where: { isPremium: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: ContentUpdateInput) {
    return prisma.content.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.content.delete({ where: { id } });
  }
}

export const contentRepository = new ContentRepository();
