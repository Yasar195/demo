import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll(@Query() pagination: PaginationDto) {
        const users = await this.usersService.findAll();
        return BaseResponseDto.success(users, 'Users retrieved successfully');
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const user = await this.usersService.findById(id);
        if (!user) {
            return BaseResponseDto.error('User not found');
        }
        return BaseResponseDto.success(user, 'User retrieved successfully');
    }

    @Post()
    async create(@Body() dto: CreateUserDto) {
        const user = await this.usersService.createUser(dto);
        return BaseResponseDto.success(user, 'User created successfully');
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        const user = await this.usersService.updateUser(id, dto);
        return BaseResponseDto.success(user, 'User updated successfully');
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.usersService.deleteUser(id);
        return BaseResponseDto.success(null, 'User deleted successfully');
    }

    @Get('role/:role')
    async findByRole(@Param('role') role: string) {
        const users = await this.usersService.findByRole(role);
        return BaseResponseDto.success(users, `Users with role ${role} retrieved successfully`);
    }
}
