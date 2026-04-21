import { contentRepository } from '@/features/content/repositories/content.repository';
import { NotFoundError } from '@/shared/middleware/error-handler';

export class ContentService {
  async getExclusiveContent() {
    const premiumContent = await contentRepository.findPremiumContent();
    return {
      message: 'Welcome to premium exclusive content!',
      content: premiumContent,
    };
  }

  async createContent(data: any) {
    return contentRepository.create(data);
  }

  async getAllContent() {
    return contentRepository.findAll();
  }

  async getContentById(id: string) {
    const content = await contentRepository.findById(id);
    if (!content) {
      throw new NotFoundError('Content not found');
    }
    return content;
  }

  async updateContent(id: string, data: any) {
    try {
      return await contentRepository.update(id, data);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Content not found for update');
      }
      throw error;
    }
  }

  async deleteContent(id: string) {
    try {
      await contentRepository.delete(id);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Content not found for deletion');
      }
      throw error;
    }
  }
}

export const contentService = new ContentService();
