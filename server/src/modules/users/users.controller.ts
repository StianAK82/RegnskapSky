import { Controller, Get, Post, Put, Delete, Body, Param, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(UserRole.LicenseAdmin)
  async createUser(@Body() createUserDto: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
  }, @Request() req) {
    return this.usersService.createUser({
      ...createUserDto,
      licenseId: req.licenseId,
    });
  }

  @Get()
  @Roles(UserRole.LicenseAdmin, UserRole.Employee)
  async getUsers(@Request() req) {
    return this.usersService.getUsers(req.licenseId);
  }

  @Get(':id')
  @Roles(UserRole.LicenseAdmin, UserRole.Employee)
  async getUser(@Param('id') id: string, @Request() req) {
    return this.usersService.getUser(id, req.licenseId);
  }

  @Put(':id')
  @Roles(UserRole.LicenseAdmin)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: {
      name?: string;
      role?: UserRole;
    },
    @Request() req
  ) {
    return this.usersService.updateUser(id, updateUserDto, req.licenseId);
  }

  @Delete(':id')
  @Roles(UserRole.LicenseAdmin)
  async deactivateUser(@Param('id') id: string, @Request() req) {
    return this.usersService.deactivateUser(id, req.licenseId);
  }
}