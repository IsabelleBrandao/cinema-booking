import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session } from './entities/session.entity';
import { SessionTransformer } from './transformer/session.transformer';

@ApiTags('Sessões')
@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly sessionTransformer: SessionTransformer,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Criar uma nova sessão',
    description: 'Cria a sessão e gera automaticamente a matriz de assentos (A1, A2...) no banco.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sessão criada com sucesso.',
    type: Session, 
  })
  @ApiResponse({ status: 400, description: 'Erro de validação (ex: data final < inicial)' })
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionService.createSession(createSessionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as sessões ativas' })
  @ApiResponse({
    status: 200,
    description: 'Lista recuperada com sucesso',
    type: [Session],
  })
  findAll() {
    return this.sessionService.findAllSessions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes da sessão' })
  @ApiResponse({ status: 200, type: Session })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  findOne(@Param('id') id: string) {
    return this.sessionService.findSessionById(id);
  }

  // ===================================
  // ⚠️ ENDPOINT FALTANTE #1 - OBRIGATÓRIO
  // ===================================
  @Get(':id/seats')
  @ApiOperation({ 
    summary: 'Buscar assentos disponíveis em tempo real',
    description: 'Retorna apenas os assentos com status AVAILABLE. Usa cache Redis.' 
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de assentos disponíveis',
    schema: {
      example: [
        { id: 'uuid', seatNumber: 'A1', status: 'available' },
        { id: 'uuid', seatNumber: 'A2', status: 'available' }
      ]
    }
  })
  @ApiResponse({ status: 404, description: 'Sessão não encontrada' })
  async getAvailableSeats(@Param('id') id: string) {
    const seats = await this.sessionService.getAvailableSeats(id);
    return this.sessionTransformer.toSeatResponseList(seats);
  }
}