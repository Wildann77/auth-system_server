import { Request, Response } from 'express';
import { ContentService } from './content.service';

export class ContentController {
  constructor(private contentService: ContentService) {}

  getExclusiveContent = async (req: Request, res: Response) => {
    const content = await this.contentService.getExclusiveContent();

    return res.status(200).json({
      status: 'success',
      data: content
    });
  };
}