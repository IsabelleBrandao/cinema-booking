import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, ArrayMinSize, IsString } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'ID do usuário que está comprando',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'ID da sessão desejada',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  session_id: string;

  @ApiProperty({
    description: 'Lista de assentos (Ex: A1, B5)',
    example: ['A1', 'A2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  seat_numbers: string[];

  @ApiProperty({
    description: 'Chave única para garantir que não haja cobrança dupla',
    example: 'compra-checkout-12345',
  })
  @IsString()
  idempotency_key: string;
}
