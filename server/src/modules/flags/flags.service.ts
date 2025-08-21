import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FlagsService {
  constructor(private prisma: PrismaService) {}

  async setFlag(licenseId: string, flagKey: string, flagValue: any) {
    return this.prisma.featureFlag.upsert({
      where: {
        licenseId_flagKey: {
          licenseId,
          flagKey,
        },
      },
      update: {
        flagValueJson: flagValue,
        updatedAt: new Date(),
      },
      create: {
        licenseId,
        flagKey,
        flagValueJson: flagValue,
      },
    });
  }

  async getFlag(licenseId: string, flagKey: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: {
        licenseId_flagKey: {
          licenseId,
          flagKey,
        },
      },
    });

    return flag?.flagValueJson;
  }

  async getAllFlags(licenseId: string) {
    const flags = await this.prisma.featureFlag.findMany({
      where: { licenseId },
    });

    return flags.reduce((acc, flag) => {
      acc[flag.flagKey] = flag.flagValueJson;
      return acc;
    }, {});
  }

  async deleteFlag(licenseId: string, flagKey: string) {
    return this.prisma.featureFlag.delete({
      where: {
        licenseId_flagKey: {
          licenseId,
          flagKey,
        },
      },
    });
  }

  // Common feature flags
  async isFeatureEnabled(licenseId: string, featureName: string): Promise<boolean> {
    const value = await this.getFlag(licenseId, featureName);
    return value === true;
  }

  async enableFeature(licenseId: string, featureName: string) {
    return this.setFlag(licenseId, featureName, true);
  }

  async disableFeature(licenseId: string, featureName: string) {
    return this.setFlag(licenseId, featureName, false);
  }
}