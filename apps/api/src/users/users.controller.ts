import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CurrentUser, Roles, AuthUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';
import { AdminCreateUserDto, BlockUserDto } from '../common/dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: AdminCreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/block')
  setBlocked(
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.setBlocked(id, dto, actor);
  }

  @Roles(Role.ADMIN)
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.usersService.resetPassword(id, actor);
  }
}
