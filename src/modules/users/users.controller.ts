import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseEnumPipe, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/iam/auth/guards/jwt-auth.guard';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Query() pagination: PaginationDto) {
        const users = await this.usersService.findAll();
        return BaseResponseDto.success(users.map(this.sanitizeUser), 'Users retrieved successfully');
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Param('id') id: string) {
        const user = await this.usersService.findById(id);
        if (!user) {
            return BaseResponseDto.error('User not found');
        }
        return BaseResponseDto.success(this.sanitizeUser(user), 'User retrieved successfully');
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() dto: CreateUserDto) {
        const user = await this.usersService.createUser(dto);
        return BaseResponseDto.success(this.sanitizeUser(user), 'User created successfully');
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        const user = await this.usersService.updateUser(id, dto);
        return BaseResponseDto.success(this.sanitizeUser(user), 'User updated successfully');
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(@Param('id') id: string) {
        await this.usersService.deleteUser(id);
        return BaseResponseDto.success(null, 'User deleted successfully');
    }

    @Get('role/:role')
    @UseGuards(JwtAuthGuard)
    async findByRole(@Param('role', new ParseEnumPipe(UserRole)) role: UserRole) {
        const users = await this.usersService.findByRole(role);
        return BaseResponseDto.success(users.map(this.sanitizeUser), `Users with role ${role} retrieved successfully`);
    }

    private sanitizeUser(user: User): Omit<User, 'password'> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...safe } = user;
        return safe;
    }
}
