// server/tests/engagement-mapper.test.ts
import { buildEngagementViewModel } from '../modules/engagements/mapper';

describe('Engagement Mapper', () => {
  const mockClient = {
    id: 'client-123',
    legalName: 'Test Bedrift AS',
    name: 'Test Bedrift AS',
    orgNumber: '123456789',
    address: 'Testgata 1, 0123 Oslo',
    postalAddress: 'Postboks 123, 0123 Oslo',
    contactName: 'Ola Nordmann',
    contactEmail: 'ola@testbedrift.no',
    contactPhone: '+47 123 45 678',
    paymentTermsDays: 30,
    noticeMonths: 6,
    tenantId: 'tenant-1'
  };

  const mockEngagement = {
    id: 'engagement-456',
    clientId: 'client-123',
    status: 'draft',
    validFrom: '2024-01-01T00:00:00Z',
    validTo: '2024-12-31T23:59:59Z',
    systemName: 'Tripletex',
    licenseHolder: 'client',
    adminAccess: true,
    includeDpa: true,
    includeItBilag: false,
    includeStandardTerms: true,
    signatories: [
      {
        id: 'sig-1',
        name: 'Ola Nordmann',
        role: 'client_representative',
        email: 'ola@testbedrift.no',
        phone: '+47 123 45 678',
        title: 'Daglig leder'
      },
      {
        id: 'sig-2', 
        name: 'Linda Johansen',
        role: 'responsible_accountant',
        email: 'linda@zaldo.no',
        title: 'Autorisert regnskapsfører'
      }
    ],
    scopes: [
      {
        id: 'scope-1',
        scopeKey: 'bookkeeping',
        frequency: 'månedlig',
        comments: 'Løpende bokføring av alle transaksjoner'
      },
      {
        id: 'scope-2',
        scopeKey: 'year_end',
        frequency: 'årlig',
        comments: 'Årsoppgjør inkludert skattemelding'
      }
    ],
    pricing: [
      {
        id: 'price-1',
        area: 'bookkeeping',
        model: 'hourly',
        hourlyRateExVat: 1200,
        minTimeUnitMinutes: 15,
        rushMarkupPercent: 50
      },
      {
        id: 'price-2',
        area: 'year_end', 
        model: 'fixed',
        fixedAmountExVat: 25000,
        fixedPeriod: 'yearly'
      }
    ],
    tenantId: 'tenant-1'
  };

  describe('buildEngagementViewModel', () => {
    it('should build complete view-model with full data', () => {
      const viewModel = buildEngagementViewModel(mockEngagement, mockClient);
      
      expect(viewModel).toBeDefined();
      expect(viewModel.header.clientName).toBe('Test Bedrift AS');
      expect(viewModel.header.orgNumber).toBe('123 456 789'); // Formatted
      expect(viewModel.header.systemName).toBe('Tripletex');
      
      expect(viewModel.summary.status).toBe('Utkast');
      expect(viewModel.summary.validFrom).toBe('01.01.2024'); // Norwegian format
      expect(viewModel.summary.contact).toBeDefined();
      expect(viewModel.summary.contact?.name).toBe('Ola Nordmann');
      expect(viewModel.summary.responsibles).toHaveLength(1); // Only non-client signatories
      expect(viewModel.summary.responsibles[0].name).toBe('Linda Johansen');
    });

    it('should format organization number correctly', () => {
      const testCases = [
        { input: '123456789', expected: '123 456 789' },
        { input: '987654321', expected: '987 654 321' },
        { input: '12345678', expected: '12345678' }, // Not 9 digits, unchanged
        { input: '123 456 789', expected: '123 456 789' }, // Already formatted
        { input: null, expected: null },
        { input: '', expected: null }
      ];

      testCases.forEach(({ input, expected }) => {
        const client = { ...mockClient, orgNumber: input };
        const viewModel = buildEngagementViewModel(mockEngagement, client);
        expect(viewModel.header.orgNumber).toBe(expected);
      });
    });

    it('should format dates correctly to Norwegian format', () => {
      const engagement = {
        ...mockEngagement,
        validFrom: '2024-03-15T10:30:00Z',
        validTo: '2025-12-01T23:59:59Z'
      };
      
      const viewModel = buildEngagementViewModel(engagement, mockClient);
      
      expect(viewModel.summary.validFrom).toBe('15.03.2024');
      expect(viewModel.pdfModel.engagement.validTo).toBe('01.12.2025');
    });

    it('should handle missing contact data with fallback priority', () => {
      // Test 1: No signatories, use client contact
      const engagementNoSig = { ...mockEngagement, signatories: [] };
      const viewModel1 = buildEngagementViewModel(engagementNoSig, mockClient);
      
      expect(viewModel1.summary.contact?.name).toBe('Ola Nordmann');
      expect(viewModel1.summary.contact?.email).toBe('ola@testbedrift.no');

      // Test 2: No client_representative signatory, use client contact
      const engagementOtherSig = {
        ...mockEngagement,
        signatories: [{ ...mockEngagement.signatories[1] }] // Only responsible_accountant
      };
      const viewModel2 = buildEngagementViewModel(engagementOtherSig, mockClient);
      
      expect(viewModel2.summary.contact?.name).toBe('Ola Nordmann');

      // Test 3: No signatories AND no client contact
      const clientNoContact = { 
        ...mockClient, 
        contactName: null, 
        contactEmail: null 
      };
      const viewModel3 = buildEngagementViewModel(engagementNoSig, clientNoContact);
      
      expect(viewModel3.summary.contact).toBeNull();
    });

    it('should translate roles correctly', () => {
      const viewModel = buildEngagementViewModel(mockEngagement, mockClient);
      
      const clientRep = viewModel.pdfModel.signatories.find(s => s.role === 'Klientrepresentant');
      expect(clientRep).toBeDefined();
      
      const responsible = viewModel.pdfModel.signatories.find(s => s.role === 'Oppdragsansvarlig regnskapsfører');
      expect(responsible).toBeDefined();
    });

    it('should translate scopes and frequencies correctly', () => {
      const viewModel = buildEngagementViewModel(mockEngagement, mockClient);
      
      const bookkeepingScope = viewModel.pdfModel.scopes.find(s => s.name === 'Løpende bokføring');
      expect(bookkeepingScope).toBeDefined();
      expect(bookkeepingScope?.frequency).toBe('Månedlig');
      
      const yearEndScope = viewModel.pdfModel.scopes.find(s => s.name === 'Årsoppgjør');
      expect(yearEndScope).toBeDefined();
      expect(yearEndScope?.frequency).toBe('Årlig');
    });

    it('should handle pricing models correctly', () => {
      const viewModel = buildEngagementViewModel(mockEngagement, mockClient);
      
      const hourlyPricing = viewModel.pdfModel.pricing.find(p => p.model === 'hourly');
      expect(hourlyPricing).toBeDefined();
      expect(hourlyPricing?.hourlyRateExVat).toBe(1200);
      expect(hourlyPricing?.minTimeUnitMinutes).toBe(15);
      
      const fixedPricing = viewModel.pdfModel.pricing.find(p => p.model === 'fixed');
      expect(fixedPricing).toBeDefined();
      expect(fixedPricing?.fixedAmountExVat).toBe(25000);
      expect(fixedPricing?.fixedPeriod).toBe('Årlig');
    });

    it('should set legal terms correctly', () => {
      const viewModel = buildEngagementViewModel(mockEngagement, mockClient);
      
      expect(viewModel.pdfModel.legalTerms.includeDpa).toBe(true);
      expect(viewModel.pdfModel.legalTerms.includeItBilag).toBe(false);
      expect(viewModel.pdfModel.legalTerms.includeStandardTerms).toBe(true);
      expect(viewModel.pdfModel.legalTerms.paymentTermsDays).toBe(30);
      expect(viewModel.pdfModel.legalTerms.noticeMonths).toBe(6);
    });

    it('should filter out empty strings and null values', () => {
      const clientWithEmptyFields = {
        ...mockClient,
        address: '',
        postalAddress: null,
        contactPhone: '   ', // Whitespace only
      };
      
      const viewModel = buildEngagementViewModel(mockEngagement, clientWithEmptyFields);
      
      expect(viewModel.pdfModel.client.address).toBeNull();
      expect(viewModel.pdfModel.client.postalAddress).toBeNull();
      expect(viewModel.pdfModel.client.contact?.phone).toBeNull();
    });

    it('should handle edge case data gracefully', () => {
      const minimalEngagement = {
        id: 'minimal-engagement',
        clientId: 'client-123',
        status: 'active',
        validFrom: '2024-01-01T00:00:00Z',
        systemName: null,
        signatories: [],
        scopes: [],
        pricing: [],
        tenantId: 'tenant-1'
      };
      
      const minimalClient = {
        id: 'client-123',
        name: 'Minimal Client',
        tenantId: 'tenant-1'
      };
      
      const viewModel = buildEngagementViewModel(minimalEngagement, minimalClient);
      
      expect(viewModel).toBeDefined();
      expect(viewModel.header.clientName).toBe('Minimal Client');
      expect(viewModel.header.systemName).toBe('Ikke angitt');
      expect(viewModel.summary.contact).toBeNull();
      expect(viewModel.summary.responsibles).toHaveLength(0);
      expect(viewModel.pdfModel.scopes).toHaveLength(0);
      expect(viewModel.pdfModel.pricing).toHaveLength(0);
    });

    it('should provide stable ordering for sections', () => {
      // Run multiple times to ensure consistent ordering
      const results = Array.from({ length: 5 }, () => 
        buildEngagementViewModel(mockEngagement, mockClient)
      );
      
      results.forEach((viewModel, index) => {
        if (index > 0) {
          expect(viewModel.pdfModel.signatories.map(s => s.name))
            .toEqual(results[0].pdfModel.signatories.map(s => s.name));
          expect(viewModel.pdfModel.scopes.map(s => s.name))
            .toEqual(results[0].pdfModel.scopes.map(s => s.name));
          expect(viewModel.pdfModel.pricing.map(p => p.area))
            .toEqual(results[0].pdfModel.pricing.map(p => p.area));
        }
      });
    });

    it('should include generatedAt timestamp', () => {
      const before = new Date().toISOString();
      const viewModel = buildEngagementViewModel(mockEngagement, mockClient);
      const after = new Date().toISOString();
      
      expect(viewModel.pdfModel.generatedAt).toBeDefined();
      expect(viewModel.pdfModel.generatedAt).toBeGreaterThanOrEqual(before);
      expect(viewModel.pdfModel.generatedAt).toBeLessThanOrEqual(after);
    });
  });
});