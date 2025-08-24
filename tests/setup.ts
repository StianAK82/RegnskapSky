// Test setup for API tests
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Global test timeout
jest.setTimeout(30000);

// Mock external services
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{}])
}));

jest.mock('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test' })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test' }),
      update: jest.fn().mockResolvedValue({ id: 'sub_test' })
    }
  }))
}));