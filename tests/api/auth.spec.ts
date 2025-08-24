import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import { registerRoutes } from '../../server/routes';

describe('Auth API Endpoints', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'stian@zaldo.no',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'stian@zaldo.no');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Ugyldig påloggingsinformasjon');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com'
          // missing password
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Password Reset Flow (NOT YET IMPLEMENTED)', () => {
    it.skip('should request password reset for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/reset/request')
        .send({
          email: 'stian@zaldo.no'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      // Should not reveal if email exists or not
    });

    it.skip('should confirm password reset with valid token', async () => {
      // This test requires implementation of reset flow
      const response = await request(app)
        .post('/api/auth/reset/confirm')
        .send({
          token: 'valid-reset-token',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
    });

    it.skip('should reject expired reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset/confirm')
        .send({
          token: 'expired-token',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});