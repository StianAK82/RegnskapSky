// Brønnøysund Register Centre API Service
export interface CompanySearchResult {
  organisationNumber: string;
  name: string;
  organisationalForm: string;
  organisationalFormCode: string;
  registrationDate: string;
  isDeleted: boolean;
}

export interface CompanyData {
  organisationNumber: string;
  name: string;
  organisationalForm: {
    code: string;
    description: string;
  };
  registrationDate: string;
  businessAddress?: {
    address: string;
    postalCode: string;
    postalArea: string;
    municipality?: string;
  };
  postalAddress?: {
    address: string;
    postalCode: string;
    postalArea: string;
  };
  businessCode?: {
    code: string;
    description: string;
  };
  isDeleted: boolean;
}

export interface CompanyRole {
  person: {
    name: string;
    personalIdNumber?: string;
  };
  roleType: {
    code: string;
    description: string;
  };
  registrationDate: string;
}

export interface TransformedCompanyData {
  orgNumber: string;
  name: string;
  organizationalForm: string;
  registrationDate: string;
  businessAddress?: string;
  postalAddress?: string;
  postalCode?: string;
  municipality?: string;
  businessCode?: string;
  businessDescription?: string;
  roles?: Array<{
    name: string;
    role: string;
    registrationDate: string;
  }>;
  isActive: boolean;
}

class BronnoyundService {
  private readonly baseUrl = 'https://data.brreg.no/enhetsregisteret/api';

  validateOrgNumber(orgNumber: string): boolean {
    // Norwegian organization numbers are 9 digits
    const cleaned = orgNumber.replace(/\s/g, '');
    if (!/^\d{9}$/.test(cleaned)) return false;
    
    // MOD11 checksum validation
    const weights = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
      sum += parseInt(cleaned[i]) * weights[i];
    }
    
    const remainder = sum % 11;
    const checkDigit = remainder === 0 ? 0 : 11 - remainder;
    
    return checkDigit === parseInt(cleaned[8]);
  }

  async searchCompanies(query: string): Promise<CompanySearchResult[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(`${this.baseUrl}/enheter?navn=${encodedQuery}&size=20`);
      
      if (!response.ok) {
        throw new Error(`Brønnøysund API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data._embedded?.enheter || [];
    } catch (error) {
      console.error('Error searching companies:', error);
      return [];
    }
  }

  async getCompanyData(orgNumber: string): Promise<CompanyData | null> {
    try {
      const cleanedOrgNumber = orgNumber.replace(/\s/g, '');
      const response = await fetch(`${this.baseUrl}/enheter/${cleanedOrgNumber}`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Brønnøysund API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching company data:', error);
      return null;
    }
  }

  async getCompanyRoles(orgNumber: string): Promise<CompanyRole[] | null> {
    try {
      const cleanedOrgNumber = orgNumber.replace(/\s/g, '');
      const response = await fetch(`${this.baseUrl}/enheter/${cleanedOrgNumber}/roller`);
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Brønnøysund roles API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data._embedded?.roller || [];
    } catch (error) {
      console.error('Error fetching company roles:', error);
      return null;
    }
  }

  transformCompanyData(companyData: CompanyData, roles?: CompanyRole[]): TransformedCompanyData {
    const businessAddress = companyData.businessAddress;
    const postalAddress = companyData.postalAddress;
    
    return {
      orgNumber: companyData.organisationNumber,
      name: companyData.name,
      organizationalForm: companyData.organisationalForm.description,
      registrationDate: companyData.registrationDate,
      businessAddress: businessAddress ? 
        `${businessAddress.address}, ${businessAddress.postalCode} ${businessAddress.postalArea}` : 
        undefined,
      postalAddress: postalAddress ? 
        `${postalAddress.address}, ${postalAddress.postalCode} ${postalAddress.postalArea}` : 
        undefined,
      postalCode: businessAddress?.postalCode || postalAddress?.postalCode,
      municipality: businessAddress?.municipality,
      businessCode: companyData.businessCode?.code,
      businessDescription: companyData.businessCode?.description,
      roles: roles?.map(role => ({
        name: role.person.name,
        role: role.roleType.description,
        registrationDate: role.registrationDate
      })),
      isActive: !companyData.isDeleted
    };
  }
}

export const bronnoyundService = new BronnoyundService();