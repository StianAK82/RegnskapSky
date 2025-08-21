import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { SKIP_TENANT_CHECK_KEY } from '../decorators/skip-tenant-check.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipTenantCheck = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (skipTenantCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    
    if (!user) {
      return true; // Let auth guard handle this
    }

    // Vendor users can access all data
    if (user.role === UserRole.Vendor) {
      return true;
    }

    // For all other users, ensure they have a licenseId
    if (!user.licenseId) {
      throw new ForbiddenException('No license access');
    }

    // Add licenseId to request for use in services
    request.licenseId = user.licenseId;
    
    return true;
  }
}