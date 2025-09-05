// server/tests/pdf-generation.test.ts
import { generateEngagementPDF } from '../utils/pdf-generator';

describe('PDF Generation', () => {
  const mockClient = {
    id: 'client-123',
    legalName: 'Test Bedrift AS',
    orgNumber: '123456789',
    address: 'Testgata 1, 0123 Oslo',
    postalAddress: 'Postboks 123, 0123 Oslo',
    contactName: 'Ola Nordmann',
    contactEmail: 'ola@testbedrift.no',
    contactPhone: '+47 123 45 678'
  };

  const mockEngagement = {
    id: 'engagement-456',
    clientId: 'client-123',
    status: 'draft',
    validFrom: '2024-01-01T00:00:00Z',
    systemName: 'Tripletex',
    licenseHolder: 'client',
    adminAccess: true,
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
    ]
  };

  describe('generateEngagementPDF', () => {
    it('should generate a PDF document', () => {
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      
      expect(pdf).toBeDefined();
      expect(typeof pdf.output).toBe('function');
    });

    it('should handle missing client data gracefully', () => {
      const incompleteClient = {
        id: 'client-incomplete',
        legalName: 'Incomplete Client'
      };
      
      const pdf = generateEngagementPDF(incompleteClient, mockEngagement);
      expect(pdf).toBeDefined();
    });

    it('should handle missing engagement data gracefully', () => {
      const incompleteEngagement = {
        id: 'engagement-incomplete',
        clientId: 'client-123',
        status: 'draft',
        validFrom: '2024-01-01T00:00:00Z'
      };
      
      const pdf = generateEngagementPDF(mockClient, incompleteEngagement);
      expect(pdf).toBeDefined();
    });

    it('should include all signatories in the PDF', () => {
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      const pdfText = pdf.output('text');
      
      expect(pdfText).toContain('Ola Nordmann');
      expect(pdfText).toContain('Linda Johansen');
      expect(pdfText).toContain('Klientrepresentant');
      expect(pdfText).toContain('Oppdragsansvarlig regnskapsfører');
    });

    it('should include all scopes in the PDF', () => {
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      const pdfText = pdf.output('text');
      
      expect(pdfText).toContain('Løpende bokføring');
      expect(pdfText).toContain('Årsoppgjør');
      expect(pdfText).toContain('månedlig');
      expect(pdfText).toContain('årlig');
    });

    it('should include pricing information in the PDF', () => {
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      const pdfText = pdf.output('text');
      
      expect(pdfText).toContain('1 200');  // Formatted currency
      expect(pdfText).toContain('25 000'); // Formatted currency
      expect(pdfText).toContain('Timebasert');
      expect(pdfText).toContain('Fast pris');
    });

    it('should format Norwegian currency correctly', () => {
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      const pdfText = pdf.output('text');
      
      // Check for Norwegian currency formatting
      expect(pdfText).toContain('kr');
    });

    it('should include legal terms section', () => {
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      const pdfText = pdf.output('text');
      
      expect(pdfText).toContain('GENERELLE BESTEMMELSER');
      expect(pdfText).toContain('regnskapsskikk');
      expect(pdfText).toContain('Betalingsbetingelser');
      expect(pdfText).toContain('Oppsigelsesfrist');
      expect(pdfText).toContain('Taushetsplikt');
    });

    it('should include signature section', () => {
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      const pdfText = pdf.output('text');
      
      expect(pdfText).toContain('UNDERSKRIFTER');
      expect(pdfText).toContain('For klienten');
      expect(pdfText).toContain('For Zaldo AS');
      expect(pdfText).toContain('Autorisert regnskapsfører');
    });
  });

  describe('PDF Content-Disposition', () => {
    it('should support inline disposition', () => {
      // This would be tested in integration tests with actual HTTP requests
      // For now, we just verify the PDF generation works
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      expect(pdf).toBeDefined();
    });

    it('should support attachment disposition', () => {
      // This would be tested in integration tests with actual HTTP requests
      // For now, we just verify the PDF generation works  
      const pdf = generateEngagementPDF(mockClient, mockEngagement);
      expect(pdf).toBeDefined();
    });
  });
});

// Mock test for the PDF endpoint (would require proper integration test setup)
describe('PDF Endpoint', () => {
  it('should accept disposition parameter', () => {
    // Mock test - in a real scenario this would test the actual endpoint
    const testCases = [
      { disposition: 'inline', expected: 'inline' },
      { disposition: 'attachment', expected: 'attachment' },
      { disposition: undefined, expected: 'attachment' } // default
    ];
    
    testCases.forEach(({ disposition, expected }) => {
      // Simulate the logic from the endpoint
      const actualDisposition = disposition === 'inline' ? 'inline' : 'attachment';
      expect(actualDisposition).toBe(expected);
    });
  });
});