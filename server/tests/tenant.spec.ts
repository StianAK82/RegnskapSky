import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole } from '@prisma/client';

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  let license1, license2;
  let user1Token, user2Token;
  let client1, client2;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    authService = app.get(AuthService);
    
    await app.init();

    // Clean database
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    await prisma.license.deleteMany();

    // Create two test licenses
    license1 = await prisma.license.create({
      data: {
        companyName: 'Test Company 1',
        orgNumber: '111111111',
        employeeLimit: 10,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'Active',
      },
    });

    license2 = await prisma.license.create({
      data: {
        companyName: 'Test Company 2',
        orgNumber: '222222222',
        employeeLimit: 10,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'Active',
      },
    });

    // Create users in different licenses
    const user1 = await authService.register(
      'user1@license1.com',
      'test123',
      'User 1',
      UserRole.LicenseAdmin,
      license1.id
    );

    const user2 = await authService.register(
      'user2@license2.com',
      'test123',
      'User 2',
      UserRole.LicenseAdmin,
      license2.id
    );

    // Get tokens
    const login1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user1@license1.com', password: 'test123' });
    user1Token = login1.body.access_token;

    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user2@license2.com', password: 'test123' });
    user2Token = login2.body.access_token;

    // Create clients in different licenses
    client1 = await prisma.client.create({
      data: {
        licenseId: license1.id,
        name: 'Client 1',
        orgNumber: '111111111',
        email: 'client1@test.com',
      },
    });

    client2 = await prisma.client.create({
      data: {
        licenseId: license2.id,
        name: 'Client 2',
        orgNumber: '222222222',
        email: 'client2@test.com',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Client Access', () => {
    it('should only return clients from user license', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // User 1 should only see client 1
      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].id).toBe(client1.id);
      expect(response1.body[0].name).toBe('Client 1');

      // User 2 should only see client 2
      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].id).toBe(client2.id);
      expect(response2.body[0].name).toBe('Client 2');
    });

    it('should prevent cross-tenant client access (IDOR)', async () => {
      // User 1 tries to access client 2
      await request(app.getHttpServer())
        .get(`/clients/${client2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404); // Should not find client from different license

      // User 2 tries to access client 1
      await request(app.getHttpServer())
        .get(`/clients/${client1.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404); // Should not find client from different license
    });

    it('should prevent cross-tenant client modification', async () => {
      // User 1 tries to update client 2
      await request(app.getHttpServer())
        .put(`/clients/${client2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Hacked Client' })
        .expect(404);

      // User 2 tries to update client 1
      await request(app.getHttpServer())
        .put(`/clients/${client1.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Client' })
        .expect(404);

      // Verify clients weren't modified
      const client1Check = await prisma.client.findUnique({ where: { id: client1.id } });
      const client2Check = await prisma.client.findUnique({ where: { id: client2.id } });
      
      expect(client1Check.name).toBe('Client 1');
      expect(client2Check.name).toBe('Client 2');
    });
  });

  describe('User Access', () => {
    it('should only return users from same license', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // Each should only see one user (themselves)
      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].email).toBe('user1@license1.com');

      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].email).toBe('user2@license2.com');
    });
  });

  describe('Task Access', () => {
    let task1, task2;

    beforeAll(async () => {
      // Create tasks in different licenses
      task1 = await prisma.task.create({
        data: {
          licenseId: license1.id,
          clientId: client1.id,
          title: 'Task 1',
          description: 'Task for license 1',
          type: 'Standard',
          status: 'Open',
          priority: 'Medium',
        },
      });

      task2 = await prisma.task.create({
        data: {
          licenseId: license2.id,
          clientId: client2.id,
          title: 'Task 2',
          description: 'Task for license 2',
          type: 'Standard',
          status: 'Open',
          priority: 'Medium',
        },
      });
    });

    it('should only return tasks from user license', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // Each should only see their own task
      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].id).toBe(task1.id);

      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].id).toBe(task2.id);
    });

    it('should prevent cross-tenant task access', async () => {
      // User 1 tries to access task 2
      await request(app.getHttpServer())
        .get(`/tasks/${task2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);

      // User 2 tries to access task 1
      await request(app.getHttpServer())
        .get(`/tasks/${task1.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });
  });

  describe('Time Entry Access', () => {
    let timeEntry1, timeEntry2;

    beforeAll(async () => {
      // Create time entries in different licenses
      const user1 = await prisma.user.findFirst({ where: { email: 'user1@license1.com' } });
      const user2 = await prisma.user.findFirst({ where: { email: 'user2@license2.com' } });

      timeEntry1 = await prisma.timeEntry.create({
        data: {
          licenseId: license1.id,
          clientId: client1.id,
          userId: user1.id,
          hours: 2.5,
          workDate: new Date(),
          notes: 'Work for license 1',
        },
      });

      timeEntry2 = await prisma.timeEntry.create({
        data: {
          licenseId: license2.id,
          clientId: client2.id,
          userId: user2.id,
          hours: 3.0,
          workDate: new Date(),
          notes: 'Work for license 2',
        },
      });
    });

    it('should only return time entries from user license', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/time')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/time')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // Each should only see their own time entry
      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].id).toBe(timeEntry1.id);

      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].id).toBe(timeEntry2.id);
    });

    it('should prevent cross-tenant time entry modification', async () => {
      // User 1 tries to update time entry 2
      await request(app.getHttpServer())
        .put(`/time/${timeEntry2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ hours: 10 })
        .expect(404);

      // User 2 tries to update time entry 1
      await request(app.getHttpServer())
        .put(`/time/${timeEntry1.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ hours: 10 })
        .expect(404);
    });
  });
});