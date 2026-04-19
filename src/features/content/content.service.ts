import { ContentRepository } from './content.repository';

export class ContentService {
  constructor(private contentRepository: ContentRepository) {}

  async getExclusiveContent() {
    // This is premium-only content
    return {
      message: 'Welcome to premium exclusive content!',
      features: [
        'Advanced analytics',
        'Priority support',
        'Exclusive tutorials'
      ]
    };
  }
}