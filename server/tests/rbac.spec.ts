import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole } from '@prisma/client';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  const testUsers = {
    vendor: { email: 'vendor@test.com', password: 'test123', role: UserRole.Vendor },
    licenseAdmin: { email: 'admin@test.com', password: 'test123', role: UserRole.LicenseAdmin },
    employee: { email: 'employee@test.com', password: 'test123', role: UserRole.Employee },
  };

  const testTokens = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    authService = app.get(AuthService);
    
    await app.init();

    // Clean database
    await prisma.user.deleteMany();
    await prisma.license.deleteMany();

    // Create test license
    const license = await prisma.license.create({
      data: {
        companyName: 'Test Company',
        orgNumber: '123456789',
        employeeLimit: 10,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'Active',
      },
    });

    // Create test users
    for (const [role, userData] of Object.entries(testUsers)) {
      const user = await authService.register(
        userData.email,
        userData.password,
        `Test ${role}`,
        userData.role,
        role === 'vendor' ? '00000000-0000-0000-0000-000000000000' : license.id
      );

      // Get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: userData.email, password: userData.password });
      
      testTokens[role] = loginResponse.body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Vendor Endpoints', () => {
    it('should allow vendor to access licensing endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/licensing')
        .set('Authorization', `Bearer ${testTokens.vendor}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should deny non-vendor access to licensing endpoints', async () => {
      await request(app.getHttpServer())
        .get('/licensing')
        .set('Authorization', `Bearer ${testTokens.licenseAdmin}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/licensing')
        .set('Authorization', `Bearer ${testTokens.employee}`)
        .expect(403);
    });

    it('should allow vendor to access vendor dashboard', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/vendor')
        .set('Authorization', `Bearer ${testTokens.vendor}`)
        .expect(200);
    });

    it('should deny non-vendor access to vendor dashboard', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/vendor')
        .set('Authorization', `Bearer ${testTokens.licenseAdmin}`)
        .expect(403);
    });
  });

  describe('License Admin Endpoints', () => {
    it('should allow license admin to manage users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${testTokens.licenseAdmin}`)
        .expect(200);
    });

    it('should allow license admin to access license admin dashboard', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/license-admin')
        .set('Authorization', `Bearer ${testTokens.licenseAdmin}`)
        .expect(200);
    });

    it('should deny employee from creating users', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${testTokens.employee}`)
        .send({
          email: 'new@test.com',
          password: 'test123',
          name: 'New User',
          role: UserRole.Employee,
        })
        .expect(403);
    });
  });

  describe('Employee Endpoints', () => {
    it('should allow employee to access clients', async () => {
      await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${testTokens.employee}`)
        .expect(200);
    });

    it('should allow employee to access tasks', async () => {
      await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${testTokens.employee}`)
        .expect(200);
    });

    it('should allow employee to access time entries', async () => {
      await request(app.getHttpServer())
        .get('/time')
        .set('Authorization', `Bearer ${testTokens.employee}`)
        .expect(200);
    });

    it('should allow employee to access employee dashboard', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/employee')
        .set('Authorization', `Bearer ${testTokens.employee}`)
        .expect(200);
    });
  });

  describe('Authentication Required', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);

      await request(app.getHttpServer())
        .get('/clients')
        .expect(401);

      await request(app.getHttpServer())
        .get('/tasks')
        .expect(401);
    });

    it('should allow access to public endpoints', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(401); // This is expected for wrong credentials, but endpoint is accessible
    });
  });
});