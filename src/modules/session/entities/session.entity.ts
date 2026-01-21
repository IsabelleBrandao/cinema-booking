import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Seat } from './seat.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  movie_name: string;

  @Column({ type: 'varchar', length: 100 })
  room_name: string;

  @Column({ type: 'timestamp' })
  start_time: Date;

  @Column({ type: 'timestamp' })
  end_time: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ticket_price: number;

  @Column({ type: 'int', default: 0 })
  total_seats: number;

  @Column({ type: 'int', default: 0 })
  available_seats: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => Seat, (seat) => seat.session, { cascade: true })
  seats: Seat[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}