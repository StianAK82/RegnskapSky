import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { license: true },
    });

    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, mfaSecret, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, mfaToken?: string) {
    // Check if MFA is enabled and required
    if (user.mfaEnabled && !mfaToken) {
      throw new BadRequestException('MFA token required');
    }

    if (user.mfaEnabled && mfaToken) {
      const isValidMFA = await this.verifyMFA(user.id, mfaToken);
      if (!isValidMFA) {
        throw new UnauthorizedException('Invalid MFA token');
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      licenseId: user.licenseId,
    };

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        licenseId: user.licenseId,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  async setupMFA(userId: string) {
    const secret = speakeasy.generateSecret({
      name: 'Zaldo CRM',
      account: userId,
      length: 32,
    });

    // Store the secret temporarily
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  async enableMFA(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Invalid MFA token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return { success: true };
  }

  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async register(email: string, password: string, name: string, role: UserRole, licenseId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
        role,
        licenseId,
      },
    });

    const { passwordHash, mfaSecret, ...result } = user;
    return result;
  }
}