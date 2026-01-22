import { ApiProperty } from '@nestjs/swagger';

export class ReservationResponseDto {
  @ApiProperty({ example: 'a7111a01-5338-43b7-b20b-f1a3acb6da81' })
  id: string;

  @ApiProperty({ example: 'uuid-do-usuario-123' })
  userId: string;

  @ApiProperty({ example: 'uuid-da-sessao-456' })
  sessionId: string;

  @ApiProperty({ example: 'pending' })
  status: string;

  @ApiProperty({ example: 'A1' })
  seatNumber: string;

  @ApiProperty({ example: '2026-02-20T19:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: '2026-02-20T18:55:00.000Z' })
  createdAt: Date;
}
