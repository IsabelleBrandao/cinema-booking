import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest'; 
import { AppModule } from './../src/app.module';
import { randomUUID } from 'crypto';
import { ReservationResponseDto } from '../src/modules/reservation/dto/reservation-response.dto';

describe('Cinema Booking System (e2e)', () => {
  let app: INestApplication;
  let sessionId: string; 

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Sessions Flow', () => {
    it('POST /sessions - deve criar sessão', async () => {
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .send({
          movie_name: 'Test Movie E2E',
          room_name: 'Room 1',
          start_time: new Date(Date.now() + 86400000).toISOString(), 
          end_time: new Date(Date.now() + 90000000).toISOString(),
          ticket_price: 25.0,
          total_seats: 20,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.movieName).toBe('Test Movie E2E');
      expect(response.body.availableSeats).toBe(20);
      
      sessionId = response.body.id;
    });

    it('GET /sessions/:id - deve buscar sessão criada', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .expect(200);

      expect(response.body.id).toBe(sessionId);
      expect(response.body.movieName).toBe('Test Movie E2E');
    });

    it('GET /sessions/:id/seats - deve listar assentos disponíveis', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}/seats`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(20);
      
      expect(response.body[0]).toHaveProperty('seatNumber');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0].status).toBe('available');
    });
  });

  describe('Reservations Flow', () => {
    it('POST /reservations - deve criar reserva na sessão criada', async () => {
      const userId = randomUUID();
      const idempotencyKey = `e2e-test-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/reservations')
        .send({
          user_id: userId,
          session_id: sessionId,
          seat_numbers: ['A1', 'A2'],
          idempotency_key: idempotencyKey,
        })
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      
      const body = response.body as ReservationResponseDto[];
      const resA1 = body.find(r => r.seatNumber === 'A1');

      expect(resA1).toBeDefined();
      expect(resA1!.status).toBe('pending');
      expect(resA1!.sessionId).toBe(sessionId);
      expect(resA1!.seatNumber).toBe('A1');
      expect(resA1).toHaveProperty('expiresAt');
    });

    it('POST /reservations - deve bloquear reserva duplicada (concorrência/idempotência)', async () => {
      const userId = randomUUID();
      
      await request(app.getHttpServer())
        .post('/reservations')
        .send({
          user_id: userId,
          session_id: sessionId,
          seat_numbers: ['A1'],
          idempotency_key: `e2e-test-conflict-${Date.now()}`,
        })
        .expect(409); 
    });
  });
});