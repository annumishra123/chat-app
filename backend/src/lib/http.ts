import type { Request, RequestHandler, Response } from 'express';

/** Forwards rejected promises to the Express error handler. */
export const handler =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };
