// Mirrors auth-service's UserRole enum (services/auth-service/src/users/entities/user.entity.ts).
// Registering always yields 'member'. From there, admin/manager is granted
// only through the bootstrap admin (ADMIN_EMAIL/ADMIN_PASSWORD, on
// auth-service startup) and PATCH /auth/users/:id/role after that — never by
// editing the database directly. See AdminUsersComponent.
export type UserRole = 'admin' | 'manager' | 'member';

// Shape returned in the `user` field of register/login/refresh responses.
// NOT the same as GET /auth/me, which only returns {id, email, role} (no fullName) —
// see auth.service.ts for why session state is seeded from login/register instead.
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

// Shape returned by GET /auth/users and PATCH /auth/users/:id/role (admin only).
export interface PlatformUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}
