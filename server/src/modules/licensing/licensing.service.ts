import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { LicenseStatus, UserRole } from '@prisma/client';

@Injectable()
export class LicensingService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async createLicense(data: {
    companyName: string;
    orgNumber: string;
    adminEmail: string;
    employeeLimit: number;
    startsAt: Date;
    endsAt: Date;
  }) {
    // Create license
    const license = await this.prisma.license.create({
      data: {
        companyName: data.companyName,
        orgNumber: data.orgNumber,
        employeeLimit: data.employeeLimit,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: LicenseStatus.Active,
      },
    });

    // Create admin user
    const tempPassword = this.generateTempPassword();
    const adminUser = await this.authService.register(
      data.adminEmail,
      tempPassword,
      'License Administrator',
      UserRole.LicenseAdmin,
      license.id,
    );

    // Update license with admin user reference
    await this.prisma.license.update({
      where: { id: license.id },
      data: { adminUserId: adminUser.id },
    });

    // TODO: Send activation email with temp password
    console.log(`License created for ${data.companyName}. Admin user: ${data.adminEmail}, temp password: ${tempPassword}`);

    return { license, adminUser, tempPassword };
  }

  async getLicenses(userId?: string) {
    // Only Vendor users can see all licenses
    return this.prisma.license.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            clients: true,
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLicense(id: string) {
    return this.prisma.license.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            users: true,
            clients: true,
            tasks: true,
          },
        },
      },
    });
  }

  async updateLicense(id: string, data: Partial<{
    companyName: string;
    employeeLimit: number;
    endsAt: Date;
    status: LicenseStatus;
  }>) {
    return this.prisma.license.update({
      where: { id },
      data,
    });
  }

  async checkEmployeeLimit(licenseId: string): Promise<boolean> {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!license) {
      throw new BadRequestException('License not found');
    }

    return license._count.users < license.employeeLimit;
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}