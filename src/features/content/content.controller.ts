import { Request, Response } from 'express';
import { contentService } from './content.service';

export class ContentController {
  async getExclusiveContent(req: Request, res: Response): Promise<void> {
    const content = await contentService.getExclusiveContent();

    res.status(200).apiSuccess(content, 'Exclusive content retrieved successfully');
  }
}

export const contentController = new ContentController();