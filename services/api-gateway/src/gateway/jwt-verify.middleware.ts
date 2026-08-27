import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// Verifies the JWT ONCE at the gateway, the single entry point, instead of
// letting an unauthenticated request travel all the way to a downstream
// service before being rejected. Downstream services still verify locally
// too (same secret, same rule everywhere) — this is defense in depth, not a
// replacement for it.
export function jwtVerifyMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      res.status(401).json({ statusCode: 401, message: 'Missing bearer token' });
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      // Forwarded so downstream services could trust it, but they still
      // verify the raw Authorization header themselves — this is just a
      // convenience header, never the sole proof of identity downstream.
      req.headers['x-user-id'] = payload.sub as string;
      next();
    } catch {
      res.status(401).json({ statusCode: 401, message: 'Invalid or expired token' });
    }
  };
}
