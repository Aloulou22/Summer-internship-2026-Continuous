import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// KEY MICROSERVICES CONCEPT:
// The User service validates the JWT locally using the SAME secret the Auth
// service signed it with. It does NOT call the Auth service on every request.
// The token itself carries the user id + role, and the signature proves it's
// authentic. This is what makes JWT ideal for microservices: stateless,
// verifiable anywhere, no chatty inter-service calls just to check "who is this".
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
