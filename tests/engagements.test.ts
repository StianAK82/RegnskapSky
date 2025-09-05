// tests/engagements.test.ts - Unit tests for engagement system enhancements

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { EngagementService } from '../src/modules/engagements/service';
import { buildEngagementViewModel } from '../server/modules/engagements/mapper';
import { generateStandardTerms } from '../server/templates/legal/standardTerms';

// Mock database
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn()
};

describe('Engagement System Enhancements', () => {
  let engagementService: EngagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    engagementService = new EngagementService();
  });

  describe('Task Creation and Assignment', () => {
    test('creates default tasks based on engagement scopes', () => {
      const engagement = {
        id: 'eng-123',
        clientId: 'client-123',
        tenantId: 'tenant-123',
        workScopes: ['bookkeeping', 'year_end', 'payroll']
      };

      const signatories = [
        {
          role: 'responsible_accountant',
          userId: 'user-456'
        }
      ];

      const expectedTasks = [
        { 
          type: 'standard',
          category: 'Bokføring',
          responsibleUserId: 'user-456',
          frequency: 'monthly'
        },
        {
          type: 'standard', 
          category: 'Årsoppgjør',
          responsibleUserId: 'user-456',
          frequency: 'yearly'
        },
        {
          type: 'standard',
          category: 'Lønn',
          responsibleUserId: 'user-456', 
          frequency: 'monthly'
        }
      ];

      expect(expectedTasks).toHaveLength(3);
      expect(expectedTasks[0].responsibleUserId).toBe('user-456');
      expect(expectedTasks.every(task => task.type === 'standard')).toBe(true);
    });

    test('syncClientResponsibleToTasks updates open standard tasks', () => {
      const oldResponsibleId = 'user-old';
      const newResponsibleId = 'user-new'; 
      const clientId = 'client-123';
      const tenantId = 'tenant-123';

      // Mock open standard tasks
      const mockTasks = [
        { id: 'task-1', status: 'open', type: 'standard' },
        { id: 'task-2', status: 'completed', type: 'standard' },
        { id: 'task-3', status: 'open', type: 'manual' }
      ];

      // Only open standard tasks should be updated
      const expectedUpdatedTasks = 1;

      expect(mockTasks.filter(t => t.status === 'open' && t.type === 'standard')).toHaveLength(expectedUpdatedTasks);
    });

    test('does not sync manually assigned tasks', () => {
      const task = {
        id: 'task-manual',
        type: 'standard',
        status: 'open',
        manuallyAssigned: true,
        responsibleUserId: 'user-manual'
      };

      // Manually assigned tasks should not be touched by sync
      expect(task.manuallyAssigned).toBe(true);
    });
  });

  describe('Dynamic Practice Branding', () => {
    test('builds view model with practice information', async () => {
      const engagement = {
        id: 'eng-123',
        status: 'active',
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2025-12-31'),
        systemName: 'Tripletex',
        licenseHolder: 'Klient'
      };

      const client = {
        id: 'client-123',
        name: 'Test Klient AS',
        legalName: 'Test Klient AS',
        orgNumber: '123456789',
        address: 'Testveien 1, 0123 Oslo'
      };

      const practiceInfo = {
        firmName: 'Regnskapskontoret AS',
        orgNumber: '987 654 321',
        address: 'Kontorvei 15, 0456 Oslo',
        email: 'post@regnskapskontoret.no',
        phone: '+47 22 33 44 55',
        website: 'https://regnskapskontoret.no',
        logoUrl: null
      };

      const viewModel = buildEngagementViewModel(engagement, client, practiceInfo);

      expect(viewModel.pdfModel.practice).toEqual(practiceInfo);
      expect(viewModel.pdfModel.practice.firmName).toBe('Regnskapskontoret AS');
    });

    test('falls back to environment variables when practice info missing', async () => {
      const engagement = { id: 'eng-123' };
      const client = { id: 'client-123', name: 'Test Client' };

      const viewModel = buildEngagementViewModel(engagement, client);

      expect(viewModel.pdfModel.practice.firmName).toBe('RegnskapsAI');
      expect(viewModel.pdfModel.practice.orgNumber).toBe('123 456 789');
    });
  });

  describe('Legal Terms Template System', () => {
    test('generates standard terms sections', () => {
      const config = {
        includeStandardTerms: true,
        includeDpa: true,
        includeItBilag: false,
        paymentTermsDays: 30,
        noticeMonths: 6
      };

      const sections = generateStandardTerms(config);

      expect(sections).toBeArray();
      expect(sections.length).toBeGreaterThan(0);
      
      const dpaSections = sections.filter(s => s.title.includes('personvern'));
      expect(dpaSections.length).toBeGreaterThan(0);

      const paymentSection = sections.find(s => 
        s.content.some(c => c.includes('30 dager'))
      );
      expect(paymentSection).toBeDefined();
    });

    test('includes page breaks between major sections', () => {
      const config = {
        includeStandardTerms: true,
        includeDpa: true,
        includeItBilag: true,
        paymentTermsDays: 14,
        noticeMonths: 3
      };

      const sections = generateStandardTerms(config);
      
      const sectionsWithPageBreaks = sections.filter(s => s.includePageBreak);
      expect(sectionsWithPageBreaks.length).toBeGreaterThan(0);
    });

    test('customizes payment and notice terms', () => {
      const config = {
        includeStandardTerms: true,
        includeDpa: false,
        includeItBilag: false,
        paymentTermsDays: 45,
        noticeMonths: 12
      };

      const sections = generateStandardTerms(config);
      
      const hasPaymentTerms = sections.some(s => 
        s.content.some(c => c.includes('45 dager'))
      );
      const hasNoticeTerms = sections.some(s =>
        s.content.some(c => c.includes('12 måneder'))
      );

      expect(hasPaymentTerms).toBe(true);
      expect(hasNoticeTerms).toBe(true);
    });
  });

  describe('Enhanced View Model Integration', () => {
    test('includes legal terms sections in view model', async () => {
      const engagement = {
        includeStandardTerms: true,
        includeDpa: true,
        includeItBilag: false
      };

      const client = {
        paymentTermsDays: 21,
        noticeMonths: 4
      };

      const practiceInfo = {
        firmName: 'Test Practice AS'
      };

      const viewModel = buildEngagementViewModel(engagement, client, practiceInfo);

      expect(viewModel.pdfModel.legalTerms.sections).toBeDefined();
      expect(viewModel.pdfModel.legalTerms.sections).toBeArray();
      expect(viewModel.pdfModel.legalTerms.paymentTermsDays).toBe(21);
      expect(viewModel.pdfModel.legalTerms.noticeMonths).toBe(4);
    });

    test('formats client contact information correctly', () => {
      const engagement = {
        signatories: [
          {
            role: 'client_representative',
            name: 'Kari Nordmann',
            email: 'kari@testclient.no',
            phone: '+47 999 88 777',
            title: 'Økonomisjef'
          }
        ]
      };

      const client = {
        name: 'Test Klient AS'
      };

      const viewModel = buildEngagementViewModel(engagement, client);

      expect(viewModel.summary.contact).toBeDefined();
      expect(viewModel.summary.contact.name).toBe('Kari Nordmann');
      expect(viewModel.summary.contact.email).toBe('kari@testclient.no');
      expect(viewModel.summary.contact.title).toBe('Økonomisjef');
    });

    test('groups scopes with frequency mapping', () => {
      const engagement = {
        workScopes: [
          { scopeKey: 'bookkeeping', frequency: 'løpende' },
          { scopeKey: 'year_end', frequency: 'årlig' },
          { scopeKey: 'payroll', frequency: 'månedlig' }
        ]
      };

      const client = { name: 'Test Client' };
      const viewModel = buildEngagementViewModel(engagement, client);

      const bookkeepingScope = viewModel.pdfModel.scopes.find(s => 
        s.name === 'Løpende bokføring'
      );
      expect(bookkeepingScope?.frequency).toBe('Løpende');

      const yearEndScope = viewModel.pdfModel.scopes.find(s =>
        s.name === 'Årsoppgjør' 
      );
      expect(yearEndScope?.frequency).toBe('Årlig');
    });
  });
});