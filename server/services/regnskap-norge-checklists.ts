/**
 * Regnskap Norge Checklists Service
 * Manages accounting compliance checklists with automatic completion
 */

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  category: string;
  autoFillRule?: string;
  dependsOn?: string[];
  completed?: boolean;
  completedAt?: Date;
  completedBy?: string;
  evidenceRequired?: boolean;
  evidenceProvided?: boolean;
  notes?: string;
}

interface AutoFillRule {
  ruleId: string;
  condition: string;
  dataSource: 'bronnoyund' | 'accounting_system' | 'client_data';
  mapping: Record<string, string>;
  required?: boolean;
}

/**
 * Standard Norwegian accounting checklist templates
 */
export class RegnskapNorgeChecklistService {
  
  /**
   * Get monthly checklist template
   */
  getMonthlyChecklistTemplate(): ChecklistItem[] {
    return [
      {
        id: 'monthly_001',
        title: 'Bilag registrert og bokført',
        description: 'Alle bilag for måneden er registrert og korrekt bokført',
        required: true,
        category: 'bookkeeping',
        autoFillRule: 'check_transactions_completeness'
      },
      {
        id: 'monthly_002',
        title: 'Bankavstemming utført',
        description: 'Bankavstemming er utført og eventuelle differanser er forklart',
        required: true,
        category: 'reconciliation',
        autoFillRule: 'bank_reconciliation_status'
      },
      {
        id: 'monthly_003',
        title: 'Kundefordringer avstemt',
        description: 'Kundefordringer er avstemt mot kundereskontra',
        required: true,
        category: 'reconciliation',
        autoFillRule: 'customer_receivables_reconciliation'
      },
      {
        id: 'monthly_004',
        title: 'Leverandørgjeld avstemt',
        description: 'Leverandørgjeld er avstemt mot leverandørreskontra',
        required: true,
        category: 'reconciliation',
        autoFillRule: 'supplier_payables_reconciliation'
      },
      {
        id: 'monthly_005',
        title: 'MVA-oppgave utarbeidet',
        description: 'MVA-oppgave er utarbeidet og kontrollert',
        required: true,
        category: 'tax',
        autoFillRule: 'vat_calculation_completed'
      },
      {
        id: 'monthly_006',
        title: 'Lønnsjournal bokført',
        description: 'Lønnsjournal er bokført og avstemt',
        required: true,
        category: 'payroll',
        autoFillRule: 'payroll_journal_posted'
      },
      {
        id: 'monthly_007',
        title: 'Arbeidsgiveravgift beregnet',
        description: 'Arbeidsgiveravgift er beregnet og bokført',
        required: true,
        category: 'payroll',
        autoFillRule: 'employer_tax_calculated'
      },
      {
        id: 'monthly_008',
        title: 'Feriepenger avsatt',
        description: 'Feriepengeforpliktelse er beregnet og avsatt',
        required: true,
        category: 'payroll',
        autoFillRule: 'holiday_pay_accrued'
      }
    ];
  }

  /**
   * Get quarterly checklist template
   */
  getQuarterlyChecklistTemplate(): ChecklistItem[] {
    return [
      {
        id: 'quarterly_001',
        title: 'Mellomregning utarbeidet',
        description: 'Mellomregning er utarbeidet og kontrollert',
        required: true,
        category: 'reporting',
        autoFillRule: 'interim_statements_prepared'
      },
      {
        id: 'quarterly_002',
        title: 'Avskrivninger beregnet',
        description: 'Ordinære avskrivninger er beregnet og bokført',
        required: true,
        category: 'depreciation',
        autoFillRule: 'depreciation_calculated'
      },
      {
        id: 'quarterly_003',
        title: 'Varelager telt og vurdert',
        description: 'Varelager er telt og vurdert til laveste verdi',
        required: false,
        category: 'inventory',
        autoFillRule: 'inventory_valued'
      },
      {
        id: 'quarterly_004',
        title: 'Kundefordringer vurdert',
        description: 'Kundefordringer er vurdert og eventuell nedskrivning er bokført',
        required: true,
        category: 'receivables',
        autoFillRule: 'receivables_impairment_assessed'
      },
      {
        id: 'quarterly_005',
        title: 'Påløpte kostnader vurdert',
        description: 'Påløpte kostnader er vurdert og bokført',
        required: true,
        category: 'accruals',
        autoFillRule: 'accrued_expenses_reviewed'
      },
      {
        id: 'quarterly_006',
        title: 'Forhåndsbetalte kostnader vurdert',
        description: 'Forhåndsbetalte kostnader er vurdert og justert',
        required: true,
        category: 'prepayments',
        autoFillRule: 'prepaid_expenses_reviewed'
      }
    ];
  }

  /**
   * Get year-end checklist template
   */
  getYearEndChecklistTemplate(): ChecklistItem[] {
    return [
      {
        id: 'yearend_001',
        title: 'Årsregnskap utarbeidet',
        description: 'Årsregnskap er utarbeidet i henhold til regnskapsloven',
        required: true,
        category: 'annual_accounts',
        evidenceRequired: true
      },
      {
        id: 'yearend_002',
        title: 'Noter til årsregnskapet',
        description: 'Noter til årsregnskapet er utarbeidet',
        required: true,
        category: 'annual_accounts',
        evidenceRequired: true
      },
      {
        id: 'yearend_003',
        title: 'Årsberetning utarbeidet',
        description: 'Årsberetning er utarbeidet (hvis påkrevd)',
        required: false,
        category: 'annual_report',
        autoFillRule: 'annual_report_required'
      },
      {
        id: 'yearend_004',
        title: 'Revisjonsberetning mottatt',
        description: 'Revisjonsberetning er mottatt fra revisor',
        required: false,
        category: 'audit',
        autoFillRule: 'audit_required'
      },
      {
        id: 'yearend_005',
        title: 'Selvangivelse utarbeidet',
        description: 'Selvangivelse er utarbeidet og levert',
        required: true,
        category: 'tax',
        evidenceRequired: true
      },
      {
        id: 'yearend_006',
        title: 'Årsoppgave lønn levert',
        description: 'Årsoppgave for lønn er levert til Skatteetaten',
        required: true,
        category: 'payroll',
        evidenceRequired: true
      },
      {
        id: 'yearend_007',
        title: 'MVA-kompensasjon søkt',
        description: 'MVA-kompensasjon er søkt (hvis aktuelt)',
        required: false,
        category: 'tax',
        autoFillRule: 'vat_compensation_eligible'
      },
      {
        id: 'yearend_008',
        title: 'Årsmelding til Regnskapsregisteret',
        description: 'Årsmelding er levert til Regnskapsregisteret',
        required: true,
        category: 'compliance',
        evidenceRequired: true,
        autoFillRule: 'annual_filing_required'
      }
    ];
  }

  /**
   * Get tax-specific checklist template
   */
  getTaxChecklistTemplate(): ChecklistItem[] {
    return [
      {
        id: 'tax_001',
        title: 'MVA-grunnlag kontrollert',
        description: 'MVA-grunnlag er kontrollert og dokumentert',
        required: true,
        category: 'vat'
      },
      {
        id: 'tax_002',
        title: 'Fradragsberettiget MVA dokumentert',
        description: 'Fradragsberettiget MVA er dokumentert med bilag',
        required: true,
        category: 'vat'
      },
      {
        id: 'tax_003',
        title: 'Forhåndsutfylling kontrollert',
        description: 'Forhåndsutfylling fra Skatteetaten er kontrollert',
        required: true,
        category: 'income_tax'
      },
      {
        id: 'tax_004',
        title: 'Skattemessige justeringer vurdert',
        description: 'Skattemessige justeringer er vurdert og dokumentert',
        required: true,
        category: 'income_tax'
      },
      {
        id: 'tax_005',
        title: 'Konsernbidrag dokumentert',
        description: 'Konsernbidrag er dokumentert (hvis aktuelt)',
        required: false,
        category: 'group_contribution'
      }
    ];
  }

  /**
   * Auto-fill checklist items based on available data
   */
  async autoFillChecklist(
    items: ChecklistItem[],
    clientData: any,
    accountingData: any,
    bronnoyundData: any
  ): Promise<ChecklistItem[]> {
    const filledItems = [...items];

    for (const item of filledItems) {
      if (item.autoFillRule) {
        try {
          const result = await this.applyAutoFillRule(
            item.autoFillRule,
            clientData,
            accountingData,
            bronnoyundData
          );
          
          if (result.canComplete) {
            item.completed = true;
            item.completedAt = new Date();
            item.completedBy = 'system';
            item.notes = result.notes || 'Automatisk utfylt basert på regnskapsdata';
          }
        } catch (error) {
          console.error(`Auto-fill failed for item ${item.id}:`, error);
        }
      }
    }

    return filledItems;
  }

  /**
   * Apply auto-fill rule
   */
  private async applyAutoFillRule(
    ruleId: string,
    clientData: any,
    accountingData: any,
    bronnoyundData: any
  ): Promise<{ canComplete: boolean; notes?: string }> {
    switch (ruleId) {
      case 'check_transactions_completeness':
        return {
          canComplete: accountingData?.transactions?.length > 0,
          notes: `${accountingData?.transactions?.length || 0} transaksjoner funnet`
        };

      case 'bank_reconciliation_status':
        return {
          canComplete: accountingData?.bankReconciliation?.isComplete === true,
          notes: accountingData?.bankReconciliation?.lastReconciled ? 
            `Sist avstemt: ${new Date(accountingData.bankReconciliation.lastReconciled).toLocaleDateString('no-NO')}` : 
            'Bankavstemming ikke utført'
        };

      case 'vat_calculation_completed':
        return {
          canComplete: accountingData?.vat?.isCalculated === true,
          notes: accountingData?.vat?.amount ? 
            `MVA beregnet: ${accountingData.vat.amount} NOK` : 
            'MVA ikke beregnet'
        };

      case 'annual_filing_required':
        const isCompany = bronnoyundData?.businessForm?.includes('AS') || 
                         bronnoyundData?.businessForm?.includes('ASA');
        return {
          canComplete: isCompany,
          notes: isCompany ? 'Årsmelding påkrevd for aksjeselskap' : 'Årsmelding ikke påkrevd'
        };

      case 'audit_required':
        const requiresAudit = this.determineAuditRequirement(bronnoyundData, accountingData);
        return {
          canComplete: !requiresAudit,
          notes: requiresAudit ? 'Revisjon påkrevd' : 'Revisjon ikke påkrevd'
        };

      case 'annual_report_required':
        const requiresReport = bronnoyundData?.businessForm?.includes('AS') || 
                              bronnoyundData?.businessForm?.includes('ASA');
        return {
          canComplete: !requiresReport,
          notes: requiresReport ? 'Årsberetning påkrevd' : 'Årsberetning ikke påkrevd'
        };

      default:
        return { canComplete: false, notes: 'Ukjent regel' };
    }
  }

  /**
   * Determine if audit is required based on company size and type
   */
  private determineAuditRequirement(bronnoyundData: any, accountingData: any): boolean {
    // Simplified audit requirement logic for Norwegian companies
    if (!bronnoyundData?.businessForm?.includes('AS')) {
      return false; // Non-corporations typically don't require audit
    }

    // Check if company meets audit thresholds (simplified)
    const revenue = accountingData?.revenue || 0;
    const totalAssets = accountingData?.totalAssets || 0;
    const employees = accountingData?.employees || 0;

    // Norwegian audit thresholds (simplified - actual rules are more complex)
    const auditThresholds = {
      revenue: 70000000, // 70M NOK
      totalAssets: 35000000, // 35M NOK
      employees: 50
    };

    const exceedsThresholds = [
      revenue > auditThresholds.revenue,
      totalAssets > auditThresholds.totalAssets,
      employees > auditThresholds.employees
    ].filter(Boolean).length >= 2;

    return exceedsThresholds;
  }

  /**
   * Calculate checklist completion percentage
   */
  calculateProgress(items: ChecklistItem[]): {
    percentage: number;
    completed: number;
    total: number;
    required: number;
    requiredCompleted: number;
  } {
    const total = items.length;
    const completed = items.filter(item => item.completed).length;
    const required = items.filter(item => item.required).length;
    const requiredCompleted = items.filter(item => item.required && item.completed).length;

    return {
      percentage: Math.round((completed / total) * 100),
      completed,
      total,
      required,
      requiredCompleted
    };
  }

  /**
   * Get checklist template by category and period
   */
  getChecklistTemplate(category: string, businessForm?: string): ChecklistItem[] {
    switch (category) {
      case 'monthly':
        return this.getMonthlyChecklistTemplate();
      case 'quarterly':
        return this.getQuarterlyChecklistTemplate();
      case 'yearly':
        return this.getYearEndChecklistTemplate();
      case 'tax':
        return this.getTaxChecklistTemplate();
      default:
        return [];
    }
  }

  /**
   * Validate checklist completion
   */
  validateCompletion(items: ChecklistItem[]): {
    isValid: boolean;
    missingRequired: ChecklistItem[];
    missingEvidence: ChecklistItem[];
    warnings: string[];
  } {
    const missingRequired = items.filter(item => item.required && !item.completed);
    const missingEvidence = items.filter(item => 
      item.completed && item.evidenceRequired && !item.evidenceProvided
    );

    const warnings: string[] = [];
    
    if (missingRequired.length > 0) {
      warnings.push(`${missingRequired.length} påkrevde punkter ikke fullført`);
    }
    
    if (missingEvidence.length > 0) {
      warnings.push(`${missingEvidence.length} punkter mangler dokumentasjon`);
    }

    return {
      isValid: missingRequired.length === 0,
      missingRequired,
      missingEvidence,
      warnings
    };
  }
}

export const regnskapNorgeChecklistService = new RegnskapNorgeChecklistService();

export type { ChecklistItem, AutoFillRule };