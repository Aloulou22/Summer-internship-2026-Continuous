import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Usage: myRoute(@CurrentUser() user) -> pulls request.user injected by the guard.
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);
