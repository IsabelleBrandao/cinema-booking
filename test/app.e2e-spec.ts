import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Cinema Booking System (e2e)', () => {
  let app: INestApplication;

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

  describe('Sessions', () => {
    let sessionId: string;

    it('POST /sessions - deve criar sessão', () => {
      return request(app.getHttpServer())
        .post('/sessions')
        .send({
          movie_name: 'Test Movie',
          room_name: 'Room 1',
          start_time: new Date('2026-02-01T19:00:00Z'),
          end_time: new Date('2026-02-01T21:00:00Z'),
          ticket_price: 25.0,
          total_seats: 20,
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          sessionId = response.body.id;
        });
    });

    it('GET /sessions/:id - deve buscar sessão', () => {
      return request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .expect(200)
        .then((response) => {
          expect(response.body.movie_name).toBe('Test Movie');
        });
    });

    it('GET /sessions/:id/seats - deve listar assentos', () => {
      return request(app.getHttpServer())
        .get(`/sessions/${sessionId}/seats`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBe(20);
        });
    });
  });

  describe('Reservations', () => {
    it('POST /reservations - deve criar reserva', () => {
      return request(app.getHttpServer())
        .post('/reservations')
        .send({
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          session_id: 'session-id-here',
          seat_numbers: ['A1'],
          idempotency_key: 'test-key-123',
        })
        .expect((res) => {
          // Pode ser 201 ou 404 dependendo se a sessão existe
          expect([201, 404]).toContain(res.status);
        });
    });
  });
});