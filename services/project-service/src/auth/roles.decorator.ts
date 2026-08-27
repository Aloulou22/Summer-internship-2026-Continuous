import { SetMetadata } from '@nestjs/common';

// Mirrors Auth Service's UserRole values ('admin' | 'manager' | 'member').
// Not imported directly — Database/Module per Service means this service
// never depends on Auth's code, only on the string that rides in the JWT.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
