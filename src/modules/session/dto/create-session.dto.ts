import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsNumber,
  Min,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Nome do filme',
    example: 'Vingadores: Ultimato',
  })
  @IsString()
  @MinLength(1)
  movie_name: string;

  @ApiProperty({
    description: 'Nome da sala',
    example: 'Sala 1',
  })
  @IsString()
  @MinLength(1)
  room_name: string;

  @ApiProperty({
    description: 'Data e hora de início da sessão',
    example: '2026-01-25T19:00:00Z',
  })
  @IsDateString()
  start_time: string;

  @ApiProperty({
    description: 'Data e hora de término da sessão',
    example: '2026-01-25T21:30:00Z',
  })
  @IsDateString()
  end_time: string;

  @ApiProperty({
    description: 'Preço do ingresso em reais',
    example: 25.0,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  ticket_price: number;

  @ApiProperty({
    description: 'Número de assentos (mínimo 16)',
    example: 16,
    minimum: 16,
  })
  @IsInt()
  @Min(16)
  total_seats: number;
}