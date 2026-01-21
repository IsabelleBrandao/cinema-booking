import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session } from './entities/session.entity';
import { Seat } from './entities/seat.entity';

@ApiTags('Sessões')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nova sessão de cinema' })
  @ApiResponse({
    status: 201,
    description: 'Sessão criada com sucesso',
  })
  async createSession(@Body() dto: CreateSessionDto): Promise<Session> {
    return this.sessionService.createSession(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as sessões ativas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de sessões retornada com sucesso',
  })
  async getAllSessions(): Promise<Session[]> {
    return this.sessionService.findAllSessions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar sessão por ID' })
  @ApiResponse({
    status: 200,
    description: 'Sessão encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Sessão não encontrada',
  })
  async getSession(@Param('id') id: string): Promise<Session> {
    return this.sessionService.findSessionById(id);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Buscar assentos disponíveis de uma sessão' })
  @ApiResponse({
    status: 200,
    description: 'Lista de assentos disponíveis',
  })
  async getAvailableSeats(@Param('id') id: string): Promise<Seat[]> {
    return this.sessionService.getAvailableSeats(id);
  }
}