import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

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
}
