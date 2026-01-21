import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, ArrayMinSize, IsString } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'ID da sessão',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  session_id: string;

  @ApiProperty({
    description: 'Lista de números dos assentos a serem reservados',
    example: ['A1', 'A2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  seat_numbers: string[];

  @ApiProperty({
    description: 'Chave de idempotência para evitar duplicação',
    example: 'reservation-550e8400-1234',
  })
  @IsString()
  idempotency_key: string;
}