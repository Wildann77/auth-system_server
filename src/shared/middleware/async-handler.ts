/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncController = (
  req: Request<any, any, any, any>,
  res: Response,
  next: NextFunction
) => Promise<void | any> | any;

export const asyncHandler = (fn: AsyncController): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};