import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LicensingService } from '../licensing/licensing.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private licensingService: LicensingService,
  ) {}

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    licenseId: string;
  }) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Check employee limit for non-vendor users
    if (data.role !== UserRole.Vendor) {
      const canAddEmployee = await this.licensingService.checkEmployeeLimit(data.licenseId);
      if (!canAddEmployee) {
        throw new BadRequestException('Employee limit reached for this license');
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        name: data.name,
        role: data.role,
        licenseId: data.licenseId,
      },
    });

    const { passwordHash, mfaSecret, ...result } = user;
    return result;
  }

  async getUsers(licenseId: string) {
    return this.prisma.user.findMany({
      where: { licenseId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUser(id: string, licenseId?: string) {
    const where: any = { id };
    if (licenseId) {
      where.licenseId = licenseId;
    }

    return this.prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        license: {
          select: {
            id: true,
            companyName: true,
            orgNumber: true,
          },
        },
      },
    });
  }

  async updateUser(id: string, data: {
    name?: string;
    role?: UserRole;
    isActive?: boolean;
  }, licenseId?: string) {
    const where: any = { id };
    if (licenseId) {
      where.licenseId = licenseId;
    }

    return this.prisma.user.update({
      where,
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deactivateUser(id: string, licenseId?: string) {
    const where: any = { id };
    if (licenseId) {
      where.licenseId = licenseId;
    }

    return this.prisma.user.update({
      where,
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }
}