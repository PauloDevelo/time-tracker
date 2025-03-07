import { NextFunction, RequestHandler, Response } from 'express';
import { AuthenticatedRequest } from 'src/middleware/authenticated-request.model';

// Type assertion helper function for controllers using AuthenticatedRequest
export const handleAuth = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return fn as unknown as RequestHandler;
};
