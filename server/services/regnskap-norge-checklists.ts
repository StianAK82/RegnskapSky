// Regnskap Norge standard checklists service
export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  category: string;
  autoFillRule?: string;
  completed?: boolean;
  notes?: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  accountingStandard: string;
  applicableBusinessForms: string[];
  items: ChecklistItem[];
  autoFillRules: Record<string, any>;
  version: string;
}

class RegnskapNorgeChecklistService {
  private templates: Map<string, ChecklistTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    // Monthly checklist template
    const monthlyTemplate: ChecklistTemplate = {
      id: 'monthly-regnskap-norge',
      name: 'Månedlig bokføring',
      description: 'Standard månedlig bokføringssjekkliste i henhold til Regnskap Norge',
      category: 'monthly',
      accountingStandard: 'regnskap_norge',
      applicableBusinessForms: ['AS', 'ASA', 'ENK', 'ANS', 'DA'],
      version: '1.0',
      autoFillRules: {},
      items: [
        {
          id: 'import-bank-transactions',
          title: 'Importer banktransaksjoner',
          description: 'Import alle banktransaksjoner for måneden',
          required: true,
          category: 'banking',
          autoFillRule: 'auto_import_bank_data'
        },
        {
          id: 'reconcile-accounts',
          title: 'Kontoavstemming',
          description: 'Avstem alle bankkontoer mot bankkontoutskrift',
          required: true,
          category: 'reconciliation'
        },
        {
          id: 'categorize-transactions',
          title: 'Kategoriser transaksjoner',
          description: 'Sørg for at alle transaksjoner er korrekt kategorisert',
          required: true,
          category: 'categorization',
          autoFillRule: 'ai_categorization'
        },
        {
          id: 'handle-invoices',
          title: 'Behandle fakturaer',
          description: 'Registrer alle inn- og utgående fakturaer',
          required: true,
          category: 'invoicing'
        },
        {
          id: 'payroll-processing',
          title: 'Lønnskjøring',
          description: 'Gjennomfør lønnskjøring for måneden',
          required: false,
          category: 'payroll'
        },
        {
          id: 'vat-preparation',
          title: 'MVA-forberedelse',
          description: 'Forbered grunnlag for MVA-oppgave',
          required: true,
          category: 'vat'
        }
      ]
    };

    // Quarterly checklist template
    const quarterlyTemplate: ChecklistTemplate = {
      id: 'quarterly-regnskap-norge',
      name: 'Kvartalsvis rapportering',
      description: 'Kvartalsvis bokførings- og rapporteringssjekkliste',
      category: 'quarterly',
      accountingStandard: 'regnskap_norge',
      applicableBusinessForms: ['AS', 'ASA'],
      version: '1.0',
      autoFillRules: {},
      items: [
        {
          id: 'monthly-completion',
          title: 'Fullfør alle månedlige oppgaver',
          description: 'Sørg for at alle månedlige sjekklister er fullført',
          required: true,
          category: 'completion'
        },
        {
          id: 'balance-sheet-review',
          title: 'Gjennomgang av balanse',
          description: 'Gjennomgå og kvalitetssikre balansen',
          required: true,
          category: 'review'
        },
        {
          id: 'income-statement-review',
          title: 'Gjennomgang av resultat',
          description: 'Gjennomgå og kvalitetssikre resultatregnskapet',
          required: true,
          category: 'review'
        },
        {
          id: 'interim-reporting',
          title: 'Delårsrapportering',
          description: 'Utarbeid delårsrapport hvis påkrevd',
          required: false,
          category: 'reporting'
        }
      ]
    };

    // Annual checklist template
    const annualTemplate: ChecklistTemplate = {
      id: 'annual-regnskap-norge',
      name: 'Årlig rapportering',
      description: 'Årlig boksluttsjekkliste i henhold til Regnskap Norge',
      category: 'yearly',
      accountingStandard: 'regnskap_norge',
      applicableBusinessForms: ['AS', 'ASA', 'ENK', 'ANS', 'DA'],
      version: '1.0',
      autoFillRules: {},
      items: [
        {
          id: 'year-end-adjustments',
          title: 'Årsskiftejusteringer',
          description: 'Gjennomfør alle nødvendige årsskiftejusteringer',
          required: true,
          category: 'adjustments'
        },
        {
          id: 'depreciation-calculation',
          title: 'Avskrivningsberegninger',
          description: 'Beregn avskrivninger på anleggsmidler',
          required: true,
          category: 'depreciation'
        },
        {
          id: 'inventory-valuation',
          title: 'Lagervurdering',
          description: 'Vurder og verdsett varelager',
          required: false,
          category: 'inventory'
        },
        {
          id: 'annual-accounts',
          title: 'Årsregnskap',
          description: 'Utarbeid årsregnskap i henhold til regnskapsloven',
          required: true,
          category: 'annual_accounts'
        },
        {
          id: 'tax-return',
          title: 'Selvangivelse',
          description: 'Utarbeid og lever selvangivelse',
          required: true,
          category: 'tax'
        },
        {
          id: 'audit-preparation',
          title: 'Revisjonsforberedelse',
          description: 'Forbered dokumentasjon for revisjon (hvis revisjonsplikt)',
          required: false,
          category: 'audit'
        }
      ]
    };

    this.templates.set('monthly', monthlyTemplate);
    this.templates.set('quarterly', quarterlyTemplate);
    this.templates.set('yearly', annualTemplate);
  }

  getChecklistTemplate(category: string): ChecklistTemplate | null {
    return this.templates.get(category) || null;
  }

  getAllTemplates(): ChecklistTemplate[] {
    return Array.from(this.templates.values());
  }

  autoFillChecklist(template: ChecklistTemplate, clientData: any): ChecklistTemplate {
    // Clone template to avoid modifying original
    const filledTemplate = JSON.parse(JSON.stringify(template));
    
    // Apply auto-fill rules based on client data and integrations
    filledTemplate.items.forEach(item => {
      if (item.autoFillRule) {
        switch (item.autoFillRule) {
          case 'auto_import_bank_data':
            // Check if client has banking integration
            if (clientData.hasActiveBankingIntegration) {
              item.completed = true;
              item.notes = 'Automatisk import fra bankintegrasjon';
            }
            break;
          case 'ai_categorization':
            // Check if AI categorization is available
            if (clientData.hasAiCategorization) {
              item.completed = true;
              item.notes = 'AI-kategorisering utført automatisk';
            }
            break;
        }
      }
    });
    
    return filledTemplate;
  }
}

export const regnskapNorgeChecklistService = new RegnskapNorgeChecklistService();