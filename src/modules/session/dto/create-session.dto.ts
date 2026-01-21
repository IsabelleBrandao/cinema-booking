import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsDate,
  IsNumber,
  Min,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Nome do filme em cartaz',
    example: 'O Auto da Compadecida 2',
  })
  @IsString()
  @MinLength(1)
  movie_name: string;

  @ApiProperty({
    description: 'Sala onde será exibido',
    example: 'Sala 3 (VIP)',
  })
  @IsString()
  @MinLength(1)
  room_name: string;

  @ApiProperty({
    description: 'Data e hora de início (ISO 8601)',
    example: '2026-02-20T19:00:00Z',
    type: String,
  })
  @IsDate()
  @Type(() => Date)
  start_time: Date;

  @ApiProperty({
    description: 'Data e hora de término',
    example: '2026-02-20T21:00:00Z',
    type: String,
  })
  @IsDate()
  @Type(() => Date)
  end_time: Date;

  @ApiProperty({
    description: 'Preço do ingresso em Reais (R$)',
    example: 45.50,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  ticket_price: number;

  @ApiProperty({
    description: 'Quantidade total de assentos (serão gerados automaticamente)',
    example: 50,
    minimum: 16,
  })
  @IsInt()
  @Min(16)
  total_seats: number;
}