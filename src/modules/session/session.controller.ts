import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionTransformer } from './transformer/session.transformer';
import { SessionResponseDto } from './dto/session-response.dto';
import { SeatResponseDto } from './dto/seat-response.dto';

@ApiTags('Sessões')
@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly sessionTransformer: SessionTransformer,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar uma nova sessão',
    description: 'Cria a sessão e gera automaticamente a matriz de assentos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sessão criada com sucesso.',
    type: SessionResponseDto, 
  })
  @ApiResponse({ status: 400, description: 'Erro de validação (ex: data final < inicial)' })
  async create(@Body() createSessionDto: CreateSessionDto) {
    const session = await this.sessionService.createSession(createSessionDto);
    return this.sessionTransformer.toResponse(session);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as sessões ativas' })
  @ApiResponse({
    status: 200,
    description: 'Lista recuperada com sucesso',
    type: [SessionResponseDto], 
  })
  async findAll() {
    const sessions = await this.sessionService.findAllSessions();
    return this.sessionTransformer.toResponseList(sessions);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes da sessão' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async findOne(@Param('id') id: string) {
    const session = await this.sessionService.findSessionById(id);
    return this.sessionTransformer.toResponse(session);
  }

  @Get(':id/seats')
  @ApiOperation({ 
    summary: 'Buscar assentos disponíveis em tempo real',
    description: 'Retorna apenas os assentos com status AVAILABLE. Usa cache Redis.' 
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de assentos disponíveis',
    type: [SeatResponseDto], 
  })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async getAvailableSeats(@Param('id') id: string) {
    const seats = await this.sessionService.getAvailableSeats(id);
    return this.sessionTransformer.toSeatResponseList(seats);
  }
}