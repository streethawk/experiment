import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../types/user-role.enum';

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.FAMILY_MEMBER]:      0,
  [UserRole.GP_EXTERNAL]:        0,
  [UserRole.CARER]:              1,
  [UserRole.SENIOR_CARER]:       2,
  [UserRole.NURSE]:              2,
  [UserRole.FINANCE_ADMIN]:      2,
  [UserRole.HOME_MANAGER]:       3,
  [UserRole.REGISTERED_MANAGER]: 3,
  [UserRole.GROUP_ADMIN]:        4,
  [UserRole.PLATFORM_ADMIN]:     5,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const userLevel = ROLE_HIERARCHY[user.role as UserRole] ?? -1;
    const minRequired = Math.min(...requiredRoles.map(r => ROLE_HIERARCHY[r]));

    if (userLevel < minRequired) {
      throw new ForbiddenException(
        `Role '${user.role}' does not have permission to access this resource`
      );
    }

    return true;
  }
}
