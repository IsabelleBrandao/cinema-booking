import { ApiProperty } from '@nestjs/swagger';

export class SeatResponseDto {
  @ApiProperty({ example: 'uuid-do-assento' })
  id: string;

  @ApiProperty({ example: 'A1' })
  seatNumber: string;

  @ApiProperty({ example: 'available' })
  status: string;
}
