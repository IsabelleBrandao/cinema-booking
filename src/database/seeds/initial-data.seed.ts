import { DataSource } from 'typeorm';
import { Session } from '../../modules/session/entities/session.entity';
import { Seat, SeatStatus } from '../../modules/session/entities/seat.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'cinema_user',
  password: process.env.DATABASE_PASSWORD || 'cinema_password',
  database: process.env.DATABASE_NAME || 'cinema_db',
  entities: [Session, Seat],
  synchronize: false,
});

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...');

  await AppDataSource.initialize();

  const sessionRepository = AppDataSource.getRepository(Session);
  const seatRepository = AppDataSource.getRepository(Seat);

  // Limpar dados existentes
  await seatRepository.delete({});
  await sessionRepository.delete({});

  // Criar sessões de exemplo
  const sessions = [
    {
      movie_name: 'Vingadores: Ultimato',
      room_name: 'Sala 1',
      start_time: new Date('2026-01-25T19:00:00Z'),
      end_time: new Date('2026-01-25T21:30:00Z'),
      ticket_price: 25.0,
      total_seats: 16,
    },
    {
      movie_name: 'Matrix Resurrections',
      room_name: 'Sala 2',
      start_time: new Date('2026-01-25T20:00:00Z'),
      end_time: new Date('2026-01-25T22:15:00Z'),
      ticket_price: 30.0,
      total_seats: 20,
    },
    {
      movie_name: 'Interestelar',
      room_name: 'Sala 3',
      start_time: new Date('2026-01-26T18:00:00Z'),
      end_time: new Date('2026-01-26T21:00:00Z'),
      ticket_price: 28.0,
      total_seats: 24,
    },
  ];

  for (const sessionData of sessions) {
    const session = sessionRepository.create({
      ...sessionData,
      available_seats: sessionData.total_seats,
      is_active: true,
    });

    const savedSession = await sessionRepository.save(session);
    console.log(`✅ Sessão criada: ${savedSession.movie_name}`);

    // Criar assentos para a sessão
    const seats: Seat[] = [];
    const rows = Math.ceil(sessionData.total_seats / 4);

    let seatNumber = 0;
    for (let row = 0; row < rows; row++) {
      const rowLetter = String.fromCharCode(65 + row); // A, B, C...
      const seatsInRow = Math.min(4, sessionData.total_seats - seatNumber);

      for (let col = 1; col <= seatsInRow; col++) {
        const seat = seatRepository.create({
          session_id: savedSession.id,
          seat_number: `${rowLetter}${col}`,
          status: SeatStatus.AVAILABLE,
        });
        seats.push(seat);
        seatNumber++;
      }
    }

    await seatRepository.save(seats);
    console.log(`   ✓ ${seats.length} assentos criados`);
  }

  console.log('🎉 Seed concluído com sucesso!');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error('❌ Erro ao executar seed:', error);
  process.exit(1);
});