import { ApiProperty } from '@nestjs/swagger';
import { SeatResponseDto } from './seat-response.dto';

export class SessionResponseDto {
  @ApiProperty({ example: 'uuid-da-sessao' })
  id: string;

  @ApiProperty({ example: 'Vingadores: Ultimato' })
  movieName: string;

  @ApiProperty({ example: 'Sala IMAX 01' })
  roomName: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty({ example: 45.0 })
  ticketPrice: number;

  @ApiProperty({ example: 50 })
  totalSeats: number;

  @ApiProperty({ example: 48 })
  availableSeats: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [SeatResponseDto], required: false })
  seats: SeatResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}