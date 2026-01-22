import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Seat } from './seat.entity';

@Entity('sessions')
export class Session {
  @ApiProperty({
    description: 'ID único da sessão',
    example: 'a1b2c3d4-e5f6-7890-1234-56789abcdef0',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'O Auto da Compadecida 2' })
  @Column()
  movie_name: string;

  @ApiProperty({ example: 'Sala 3 (VIP)' })
  @Column()
  room_name: string;

  @ApiProperty()
  @Column()
  start_time: Date;

  @ApiProperty()
  @Column()
  end_time: Date;

  @ApiProperty({ example: 45.5 })
  @Column('decimal', { precision: 10, scale: 2 })
  ticket_price: number;

  @ApiProperty({ example: 50 })
  @Column()
  total_seats: number;

  @ApiProperty({ example: 48, description: 'Assentos livres agora' })
  @Column()
  available_seats: number;

  @ApiProperty()
  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => Seat, (seat) => seat.session)
  seats: Seat[];

  @ApiProperty()
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updated_at: Date;
}
