// server/modules/engagements/mapper.ts - Data transformation for engagement view-models

import { 
  EngagementPDFModel, 
  EngagementDisplayModel, 
  ContactInfo, 
  ResponsibleInfo,
  FormattedClient,
  FormattedEngagement,
  FormattedSignatory,
  FormattedScope,
  FormattedPricing,
  FormattedLegalTerms
} from '../../../shared/engagement';

// Translation mappings
const ROLE_TRANSLATIONS: Record<string, string> = {
  'client_representative': 'Klientrepresentant',
  'responsible_accountant': 'Oppdragsansvarlig regnskapsfører', 
  'managing_director': 'Daglig leder',
  'accountant': 'Regnskapsfører',
  'assistant': 'Regnskapsassistent'
};

const SCOPE_TRANSLATIONS: Record<string, string> = {
  'bookkeeping': 'Løpende bokføring',
  'year_end': 'Årsoppgjør',
  'payroll': 'Lønn',
  'invoicing': 'Fakturering',
  'mva': 'Merverdiavgift',
  'period_reports': 'Perioderapporter',
  'project': 'Prosjektoppgave',
  'other': 'Annet'
};

const PERIOD_TRANSLATIONS: Record<string, string> = {
  'monthly': 'Månedlig',
  'quarterly': 'Kvartalsvis', 
  'yearly': 'Årlig'
};

const FREQUENCY_TRANSLATIONS: Record<string, string> = {
  'løpende': 'Løpende',
  'månedlig': 'Månedlig',
  'kvartalsvis': 'Kvartalsvis',
  'årlig': 'Årlig',
  'ved_behov': 'Ved behov'
};

// Utility functions
function formatOrgNumber(orgNumber: string | null | undefined): string | null {
  if (!orgNumber) return null;
  
  // Remove any existing spaces/formatting
  const cleaned = orgNumber.replace(/\s+/g, '');
  
  // Format as "NNN NNN NNN" 
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
  }
  
  return orgNumber; // Return as-is if not 9 digits
}

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nb-NO', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  } catch {
    return null;
  }
}

function formatAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  return address.trim() || null;
}

function safeString(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value).trim() || null;
}

function translateRole(role: string): string {
  return ROLE_TRANSLATIONS[role] || role;
}

function translateScope(scopeKey: string): string {
  return SCOPE_TRANSLATIONS[scopeKey] || scopeKey;
}

function translatePeriod(period: string): string {
  return PERIOD_TRANSLATIONS[period] || period;
}

function translateFrequency(frequency: string): string {
  return FREQUENCY_TRANSLATIONS[frequency] || frequency;
}

// Main mapper function
export function buildEngagementViewModel(
  engagement: any, 
  client: any, 
  practice?: any
): EngagementDisplayModel {
  
  // Find contact person - priority: client_representative signatory → client contact → null
  let contact: ContactInfo | null = null;
  
  if (engagement.signatories && Array.isArray(engagement.signatories)) {
    const clientRep = engagement.signatories.find((s: any) => s.role === 'client_representative');
    if (clientRep) {
      contact = {
        name: safeString(clientRep.name) || 'Ukjent',
        email: safeString(clientRep.email) || '',
        phone: safeString(clientRep.phone),
        title: safeString(clientRep.title)
      };
    }
  }
  
  // Fallback to client contact info
  if (!contact && client) {
    if (client.contactName || client.contactEmail) {
      contact = {
        name: safeString(client.contactName) || 'Ukjent',
        email: safeString(client.contactEmail) || '',
        phone: safeString(client.contactPhone),
        title: null
      };
    }
  }
  
  // Build responsibles list from accountant signatories
  const responsibles: ResponsibleInfo[] = [];
  if (engagement.signatories && Array.isArray(engagement.signatories)) {
    engagement.signatories
      .filter((s: any) => s.role !== 'client_representative')
      .forEach((s: any) => {
        responsibles.push({
          name: safeString(s.name) || 'Ukjent',
          role: translateRole(s.role),
          email: safeString(s.email) || ''
        });
      });
  }
  
  // Build formatted client
  const formattedClient: FormattedClient = {
    name: safeString(client?.name) || 'Ukjent klient',
    legalName: safeString(client?.legalName),
    orgNumber: formatOrgNumber(client?.orgNumber),
    address: formatAddress(client?.address),
    postalAddress: formatAddress(client?.postalAddress),
    contact
  };
  
  // Build formatted engagement
  const formattedEngagement: FormattedEngagement = {
    id: engagement.id || '',
    status: engagement.status === 'draft' ? 'Utkast' : 
             engagement.status === 'active' ? 'Aktiv' : 
             engagement.status === 'terminated' ? 'Avsluttet' : 
             engagement.status || 'Ukjent',
    validFrom: formatDate(engagement.validFrom) || 'Ikke angitt',
    validTo: formatDate(engagement.validTo),
    system: {
      name: safeString(engagement.systemName) || 'Ikke angitt',
      licenseHolder: engagement.licenseHolder === 'client' ? 'Klient' : 'Regnskapskontor',
      adminAccess: Boolean(engagement.adminAccess)
    },
    responsibles
  };
  
  // Build formatted signatories
  const formattedSignatories: FormattedSignatory[] = [];
  if (engagement.signatories && Array.isArray(engagement.signatories)) {
    engagement.signatories.forEach((s: any) => {
      formattedSignatories.push({
        name: safeString(s.name) || 'Ukjent',
        role: translateRole(s.role),
        email: safeString(s.email) || '',
        phone: safeString(s.phone),
        title: safeString(s.title)
      });
    });
  }
  
  // Build formatted scopes
  const formattedScopes: FormattedScope[] = [];
  if (engagement.scopes && Array.isArray(engagement.scopes)) {
    engagement.scopes.forEach((scope: any) => {
      formattedScopes.push({
        name: translateScope(scope.scopeKey || scope.name),
        frequency: translateFrequency(scope.frequency) || 'Ikke angitt',
        comments: safeString(scope.comments)
      });
    });
  }
  
  // Build formatted pricing
  const formattedPricing: FormattedPricing[] = [];
  if (engagement.pricing && Array.isArray(engagement.pricing)) {
    engagement.pricing.forEach((price: any) => {
      formattedPricing.push({
        area: translateScope(price.area),
        model: price.model || 'hourly',
        hourlyRateExVat: price.hourlyRateExVat || null,
        minTimeUnitMinutes: price.minTimeUnitMinutes || null,
        fixedAmountExVat: price.fixedAmountExVat || null,
        fixedPeriod: price.fixedPeriod ? translatePeriod(price.fixedPeriod) : null,
        volumeUnitLabel: safeString(price.volumeUnitLabel),
        volumeUnitPriceExVat: price.volumeUnitPriceExVat || null,
        rushMarkupPercent: price.rushMarkupPercent || null,
        systemCostsNote: safeString(price.systemCostsNote)
      });
    });
  }
  
  // Build formatted legal terms
  const formattedLegalTerms: FormattedLegalTerms = {
    includeDpa: Boolean(engagement.includeDpa !== false),
    includeItBilag: Boolean(engagement.includeItBilag !== false),
    includeStandardTerms: Boolean(engagement.includeStandardTerms !== false),
    paymentTermsDays: client?.paymentTermsDays || 14,
    noticeMonths: client?.noticeMonths || 3
  };
  
  // Build complete PDF model
  const pdfModel: EngagementPDFModel = {
    client: formattedClient,
    engagement: formattedEngagement,
    signatories: formattedSignatories,
    scopes: formattedScopes,
    pricing: formattedPricing,
    legalTerms: formattedLegalTerms,
    generatedAt: new Date().toISOString()
  };
  
  // Build display model
  return {
    header: {
      clientName: formattedClient.name,
      orgNumber: formattedClient.orgNumber,
      systemName: formattedEngagement.system.name
    },
    summary: {
      contact,
      responsibles,
      status: formattedEngagement.status,
      validFrom: formattedEngagement.validFrom
    },
    pdfModel
  };
}