/**
 * AML/KYC Service Module
 * Handles compliance checks and document verification
 */

import type { AmlProvider, AmlCheck, InsertAmlCheck, Client } from "@shared/schema";

export interface AmlProviderAdapter {
  name: string;
  testConnection(config: any): Promise<boolean>;
  performIdentityCheck(clientData: IdentityCheckData, config: any): Promise<AmlCheckResult>;
  performSanctionCheck(clientData: SanctionCheckData, config: any): Promise<AmlCheckResult>;
  performPepCheck(clientData: PepCheckData, config: any): Promise<AmlCheckResult>;
  performAdverseMediaCheck(clientData: AdverseMediaCheckData, config: any): Promise<AmlCheckResult>;
}

interface IdentityCheckData {
  name: string;
  dateOfBirth?: string;
  nationalId?: string;
  address?: string;
  documents?: Array<{
    type: string;
    number: string;
    issuedBy: string;
    expiryDate?: string;
  }>;
}

interface SanctionCheckData {
  name: string;
  dateOfBirth?: string;
  nationalId?: string;
  aliases?: string[];
}

interface PepCheckData {
  name: string;
  dateOfBirth?: string;
  countryOfResidence?: string;
  position?: string;
}

interface AdverseMediaCheckData {
  name: string;
  companyName?: string;
  searchDepth?: 'basic' | 'enhanced';
}

interface AmlCheckResult {
  status: 'completed' | 'failed' | 'manual_review';
  result: 'pass' | 'fail' | 'requires_review';
  confidence: number; // 0-100
  findings: any;
  cost?: number;
  externalReferenceId?: string;
  rawResponse: any;
}

/**
 * Mock AML Provider for demonstration
 */
class MockAmlProvider implements AmlProviderAdapter {
  name = "Mock AML Provider";

  async testConnection(config: any): Promise<boolean> {
    return true; // Always passes for mock
  }

  async performIdentityCheck(clientData: IdentityCheckData, config: any): Promise<AmlCheckResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const hasDocuments = clientData.documents && clientData.documents.length > 0;
    const confidence = hasDocuments ? 85 : 65;
    
    return {
      status: 'completed',
      result: confidence > 70 ? 'pass' : 'requires_review',
      confidence,
      findings: {
        identityVerified: hasDocuments,
        documentsProvided: clientData.documents?.length || 0,
        addressVerified: !!clientData.address,
        riskLevel: confidence > 80 ? 'low' : 'medium'
      },
      cost: 25.00,
      externalReferenceId: `MOCK-ID-${Date.now()}`,
      rawResponse: { mockData: true, clientData }
    };
  }

  async performSanctionCheck(clientData: SanctionCheckData, config: any): Promise<AmlCheckResult> {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock sanctions check - randomly flag for demonstration
    const isFlagged = Math.random() < 0.05; // 5% chance of being flagged
    
    return {
      status: 'completed',
      result: isFlagged ? 'fail' : 'pass',
      confidence: isFlagged ? 95 : 98,
      findings: {
        sanctionListMatches: isFlagged ? ['EU Sanctions List'] : [],
        watchListMatches: [],
        riskScore: isFlagged ? 85 : 5
      },
      cost: 15.00,
      externalReferenceId: `MOCK-SAN-${Date.now()}`,
      rawResponse: { mockData: true, clientData, flagged: isFlagged }
    };
  }

  async performPepCheck(clientData: PepCheckData, config: any): Promise<AmlCheckResult> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const isPep = Math.random() < 0.02; // 2% chance of being PEP
    
    return {
      status: 'completed',
      result: isPep ? 'requires_review' : 'pass',
      confidence: isPep ? 90 : 95,
      findings: {
        pepStatus: isPep ? 'current' : 'none',
        politicalExposure: isPep ? ['Government Official'] : [],
        familyConnections: [],
        riskLevel: isPep ? 'high' : 'low'
      },
      cost: 20.00,
      externalReferenceId: `MOCK-PEP-${Date.now()}`,
      rawResponse: { mockData: true, clientData, isPep }
    };
  }

  async performAdverseMediaCheck(clientData: AdverseMediaCheckData, config: any): Promise<AmlCheckResult> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const hasAdverseMedia = Math.random() < 0.10; // 10% chance of adverse media
    
    return {
      status: 'completed',
      result: hasAdverseMedia ? 'requires_review' : 'pass',
      confidence: 88,
      findings: {
        articlesFound: hasAdverseMedia ? 3 : 0,
        sources: hasAdverseMedia ? ['Financial Times', 'Local News'] : [],
        topics: hasAdverseMedia ? ['Financial Irregularities'] : [],
        severity: hasAdverseMedia ? 'medium' : 'none'
      },
      cost: 30.00,
      externalReferenceId: `MOCK-MEDIA-${Date.now()}`,
      rawResponse: { mockData: true, clientData, hasAdverseMedia }
    };
  }
}

/**
 * ComplianceAI Provider (placeholder for real integration)
 */
class ComplianceAIProvider implements AmlProviderAdapter {
  name = "ComplianceAI";

  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.apiEndpoint}/health`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async performIdentityCheck(clientData: IdentityCheckData, config: any): Promise<AmlCheckResult> {
    throw new Error("ComplianceAI integration not yet implemented");
  }

  async performSanctionCheck(clientData: SanctionCheckData, config: any): Promise<AmlCheckResult> {
    throw new Error("ComplianceAI integration not yet implemented");
  }

  async performPepCheck(clientData: PepCheckData, config: any): Promise<AmlCheckResult> {
    throw new Error("ComplianceAI integration not yet implemented");
  }

  async performAdverseMediaCheck(clientData: AdverseMediaCheckData, config: any): Promise<AmlCheckResult> {
    throw new Error("ComplianceAI integration not yet implemented");
  }
}

/**
 * AML/KYC Service
 */
export class AmlKycService {
  private providers = new Map<string, AmlProviderAdapter>();

  constructor() {
    this.registerProvider(new MockAmlProvider());
    this.registerProvider(new ComplianceAIProvider());
  }

  registerProvider(provider: AmlProviderAdapter): void {
    this.providers.set(provider.name.toLowerCase().replace(/\s/g, '_'), provider);
  }

  getProvider(providerName: string): AmlProviderAdapter | undefined {
    return this.providers.get(providerName.toLowerCase().replace(/\s/g, '_'));
  }

  /**
   * Run comprehensive AML check for a client
   */
  async runComprehensiveCheck(
    client: Client, 
    provider: AmlProvider,
    checkTypes: string[] = ['identity', 'sanction', 'pep', 'adverse_media']
  ): Promise<Array<{ type: string; result: AmlCheckResult }>> {
    const providerAdapter = this.getProvider(provider.providerName);
    if (!providerAdapter) {
      throw new Error(`Provider ${provider.providerName} not found`);
    }

    const clientData = this.prepareClientData(client);
    const results: Array<{ type: string; result: AmlCheckResult }> = [];

    for (const checkType of checkTypes) {
      try {
        let result: AmlCheckResult;

        switch (checkType) {
          case 'identity':
            result = await providerAdapter.performIdentityCheck(clientData, provider.configuration);
            break;
          case 'sanction':
            result = await providerAdapter.performSanctionCheck(clientData, provider.configuration);
            break;
          case 'pep':
            result = await providerAdapter.performPepCheck(clientData, provider.configuration);
            break;
          case 'adverse_media':
            result = await providerAdapter.performAdverseMediaCheck(clientData, provider.configuration);
            break;
          default:
            continue;
        }

        results.push({ type: checkType, result });
      } catch (error) {
        console.error(`AML check ${checkType} failed:`, error);
        results.push({
          type: checkType,
          result: {
            status: 'failed',
            result: 'requires_review',
            confidence: 0,
            findings: { error: error instanceof Error ? error.message : 'Unknown error' },
            rawResponse: { error: true }
          }
        });
      }
    }

    return results;
  }

  /**
   * Generate AML risk score based on check results
   */
  calculateRiskScore(checkResults: Array<{ type: string; result: AmlCheckResult }>): {
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    let totalScore = 0;
    let weightedSum = 0;
    const recommendations: string[] = [];

    const weights = {
      identity: 0.3,
      sanction: 0.4,
      pep: 0.2,
      adverse_media: 0.1
    };

    for (const { type, result } of checkResults) {
      const weight = weights[type as keyof typeof weights] || 0.1;
      let score = 0;

      if (result.result === 'pass') {
        score = Math.min(result.confidence, 95);
      } else if (result.result === 'requires_review') {
        score = 50;
        recommendations.push(`Manual review required for ${type} check`);
      } else if (result.result === 'fail') {
        score = 10;
        recommendations.push(`Failed ${type} check - high risk client`);
      }

      totalScore += score * weight;
      weightedSum += weight;
    }

    const overallScore = weightedSum > 0 ? totalScore / weightedSum : 0;
    
    let riskLevel: 'low' | 'medium' | 'high';
    if (overallScore >= 80) {
      riskLevel = 'low';
    } else if (overallScore >= 60) {
      riskLevel = 'medium';
      recommendations.push('Enhanced monitoring recommended');
    } else {
      riskLevel = 'high';
      recommendations.push('High risk client - additional due diligence required');
    }

    return { overallScore: Math.round(overallScore), riskLevel, recommendations };
  }

  /**
   * Prepare client data for AML checks
   */
  private prepareClientData(client: Client): any {
    return {
      name: client.name,
      orgNumber: client.orgNumber,
      address: client.address,
      email: client.email,
      phone: client.phone,
      contactPerson: client.contactPerson
    };
  }

  /**
   * Get supported check types for a provider
   */
  getSupportedChecks(providerName: string): string[] {
    const baseChecks = ['identity', 'sanction', 'pep', 'adverse_media'];
    
    // Different providers might support different check types
    switch (providerName.toLowerCase()) {
      case 'mock_aml_provider':
        return baseChecks;
      case 'complianceai':
        return baseChecks;
      default:
        return baseChecks;
    }
  }

  /**
   * Estimate cost for AML checks
   */
  estimateCost(providerName: string, checkTypes: string[]): number {
    // Mock pricing - in reality this would come from provider configuration
    const prices: Record<string, number> = {
      identity: 25.00,
      sanction: 15.00,
      pep: 20.00,
      adverse_media: 30.00
    };

    return checkTypes.reduce((total, type) => total + (prices[type] || 10), 0);
  }
}

export const amlKycService = new AmlKycService();

export type {
  AmlProviderAdapter,
  IdentityCheckData,
  SanctionCheckData,
  PepCheckData,
  AdverseMediaCheckData,
  AmlCheckResult
};