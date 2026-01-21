import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session } from './entities/session.entity';
import { SessionTransformer } from './transformer/session.transformer'; // Se estiver usando transformer

@ApiTags('Sessões')
@Controller('sessions')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    // private readonly sessionTransformer: SessionTransformer, // Descomente se usar transformer
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
}