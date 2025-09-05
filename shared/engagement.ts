// shared/engagement.ts - Typed view-models for engagement display and PDF generation

export interface ContactInfo {
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
}

export interface ResponsibleInfo {
  name: string;
  role: string;
  email: string;
}

export interface FormattedClient {
  name: string;
  legalName: string | null;
  orgNumber: string | null; // Already formatted as "NNN NNN NNN"
  address: string | null;
  postalAddress: string | null;
  contact: ContactInfo | null;
}

export interface FormattedEngagement {
  id: string;
  status: string;
  validFrom: string; // Formatted as dd.MM.yyyy
  validTo: string | null; // Formatted as dd.MM.yyyy
  system: {
    name: string;
    licenseHolder: string; // "Klient" or "Regnskapskontor"
    adminAccess: boolean;
  };
  responsibles: ResponsibleInfo[];
}

export interface FormattedSignatory {
  name: string;
  role: string; // Translated to Norwegian
  email: string;
  phone: string | null;
  title: string | null;
}

export interface FormattedScope {
  name: string; // Translated scope name
  frequency: string;
  comments: string | null;
}

export interface FormattedPricing {
  area: string; // Translated area name
  model: 'hourly' | 'fixed' | 'volume';
  // For hourly
  hourlyRateExVat: number | null;
  minTimeUnitMinutes: number | null;
  // For fixed
  fixedAmountExVat: number | null;
  fixedPeriod: string | null; // Translated period
  // For volume
  volumeUnitLabel: string | null;
  volumeUnitPriceExVat: number | null;
  // Common
  rushMarkupPercent: number | null;
  systemCostsNote: string | null;
}

export interface FormattedLegalTerms {
  includeDpa: boolean;
  includeItBilag: boolean;
  includeStandardTerms: boolean;
  paymentTermsDays: number;
  noticeMonths: number;
}

export interface EngagementPDFModel {
  client: FormattedClient;
  engagement: FormattedEngagement;
  signatories: FormattedSignatory[];
  scopes: FormattedScope[];
  pricing: FormattedPricing[];
  legalTerms: FormattedLegalTerms;
  generatedAt: string; // ISO string
}

// Display model for UI (lighter version)
export interface EngagementDisplayModel {
  header: {
    clientName: string;
    orgNumber: string | null;
    systemName: string;
  };
  summary: {
    contact: ContactInfo | null;
    responsibles: ResponsibleInfo[];
    status: string;
    validFrom: string;
  };
  // Include full model for PDF generation
  pdfModel: EngagementPDFModel;
}