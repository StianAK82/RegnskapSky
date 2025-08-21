import { Module } from '@nestjs/common';
import { AmlService } from './aml.service';
import { AmlController } from './aml.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AmlController],
  providers: [AmlService],
  exports: [AmlService],
})
export class AmlModule {}