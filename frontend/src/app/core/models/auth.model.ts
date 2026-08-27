import { User } from './user.model';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// POST /auth/register, /auth/login and /auth/refresh all return this shape.
// The refresh token is also set as an httpOnly cookie by the server — the
// frontend never reads or stores `refreshToken` from this body, only the
// cookie is used (see auth.service.ts).
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
