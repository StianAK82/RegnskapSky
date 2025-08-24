import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import { registerRoutes } from '../../server/routes';

describe('Admin API Endpoints (NOT YET IMPLEMENTED)', () => {
  let app: express.Application;
  let server: any;
  let adminToken: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);

    // Login as admin to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'stian@zaldo.no',
        password: 'password123'
      });
    
    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('GET /api/admin/companies', () => {
    it.skip('should return companies list for system owner', async () => {
      const response = await request(app)
        .get('/api/admin/companies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const company = response.body[0];
        expect(company).toHaveProperty('id');
        expect(company).toHaveProperty('name');
        expect(company).toHaveProperty('orgnr');
        expect(company).toHaveProperty('contact_email');
        expect(company).toHaveProperty('license_count');
        expect(company).toHaveProperty('is_active');
        expect(company).toHaveProperty('created_at');
      }
    });

    it.skip('should deny access to non-system-owner', async () => {
      // This test assumes we have a non-admin user token
      const response = await request(app)
        .get('/api/admin/companies')
        .set('Authorization', `Bearer ${adminToken}`); // Would need employee token

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/companies/:id/license', () => {
    it.skip('should update license count for company', async () => {
      const response = await request(app)
        .patch('/api/admin/companies/test-company-id/license')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          license_count: 5
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('license_count', 5);
    });

    it.skip('should validate license count is positive', async () => {
      const response = await request(app)
        .patch('/api/admin/companies/test-company-id/license')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          license_count: -1
        });

      expect(response.status).toBe(400);
    });
  });
});