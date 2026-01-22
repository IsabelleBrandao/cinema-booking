import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'ID da reserva',
    example: '770e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  reservation_id: string;

  @ApiProperty({
    description: 'ID do pagamento (opcional)',
    example: 'payment-12345',
    required: false,
  })
  @IsString()
  @IsOptional()
  payment_id?: string;
}
