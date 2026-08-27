import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';

// Profile routes are keyed by :userId (the Auth-issued user id, not the
// profile's own id). A caller may only mutate their own profile unless
// they're a platform admin — closes "any valid token can edit/delete any
// other user's profile".
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const targetUserId = req.params.userId;
    const user = req.user ?? {};

    if (user.id === targetUserId || user.role === 'admin') return true;
    throw new ForbiddenException('You can only modify your own profile');
  }
}
