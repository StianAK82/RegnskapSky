/**
 * Brønnøysund Register Centre API Integration
 * Handles automatic fetching of company data from Norwegian business registry
 */

interface BronnoyundCompanyResponse {
  organisationNumber: string;
  name: string;
  organisationForm: {
    code: string;
    description: string;
  };
  registrationDate: string;
  registeredInRegisterOfBusinessEnterprises: boolean;
  businessAddress?: {
    address: string[];
    postalCode: string;
    postalArea: string;
    country: string;
    municipality: string;
  };
  postalAddress?: {
    address: string[];
    postalCode: string;
    postalArea: string;
    country: string;
  };
  institutionalSectorCode?: {
    code: string;
    description: string;
  };
  naceCode1?: {
    code: string;
    description: string;
  };
  naceCode2?: {
    code: string;
    description: string;
  };
  naceCode3?: {
    code: string;
    description: string;
  };
  isDeleted: boolean;
  deleteDate?: string;
  concursEstate?: boolean;
  underAvvikling?: boolean;
  underTvangsavviklingEllerTvangsopplosning?: boolean;
  maalform?: string;
  links?: any[];
}

interface BronnoyundRoleResponse {
  roleGroups: Array<{
    type: {
      code: string;
      description: string;
    };
    roles: Array<{
      type: {
        code: string;
        description: string;
      };
      person?: {
        firstName: string;
        middleName?: string;
        lastName: string;
        address?: {
          address: string[];
          postalCode: string;
          postalArea: string;
          country: string;
        };
      };
      unitType?: string;
      organisationNumber?: string;
      name?: string;
    }>;
  }>;
}

export class BronnoyundService {
  private readonly baseUrl = "https://data.brreg.no/enhetsregisteret/api";
  private readonly rolesUrl = "https://data.brreg.no/roller/api";

  /**
   * Fetch company data by organization number
   */
  async getCompanyData(orgNumber: string): Promise<BronnoyundCompanyResponse | null> {
    try {
      const cleanOrgNumber = orgNumber.replace(/\s/g, '');
      const response = await fetch(`${this.baseUrl}/enheter/${cleanOrgNumber}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Company not found
        }
        throw new Error(`Brønnøysund API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching company data from Brønnøysund:', error);
      throw error;
    }
  }

  /**
   * Fetch roles and representatives for a company
   */
  async getCompanyRoles(orgNumber: string): Promise<BronnoyundRoleResponse | null> {
    try {
      const cleanOrgNumber = orgNumber.replace(/\s/g, '');
      const response = await fetch(`${this.rolesUrl}/enheter/${cleanOrgNumber}/roller`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No roles found
        }
        throw new Error(`Brønnøysund Roles API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching company roles from Brønnøysund:', error);
      throw error;
    }
  }

  /**
   * Transform Brønnøysund data to our internal format
   */
  transformCompanyData(data: BronnoyundCompanyResponse, rolesData?: BronnoyundRoleResponse) {
    const boardMembers = rolesData?.roleGroups
      .filter(rg => rg.type.code === 'STYR' || rg.type.code === 'LEDE')
      .flatMap(rg => rg.roles.map(role => ({
        role: role.type.description,
        name: role.person ? `${role.person.firstName} ${role.person.lastName}` : role.name,
        address: role.person?.address
      }))) || [];

    return {
      orgNumber: data.organisationNumber,
      name: data.name,
      businessForm: data.organisationForm?.description,
      registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      address: {
        businessAddress: data.businessAddress ? {
          street: data.businessAddress.address.join(' '),
          postalCode: data.businessAddress.postalCode,
          city: data.businessAddress.postalArea,
          country: data.businessAddress.country,
          municipality: data.businessAddress.municipality
        } : null,
        postalAddress: data.postalAddress ? {
          street: data.postalAddress.address.join(' '),
          postalCode: data.postalAddress.postalCode,
          city: data.postalAddress.postalArea,
          country: data.postalAddress.country
        } : null
      },
      businessCodes: [
        data.naceCode1 && { code: data.naceCode1.code, description: data.naceCode1.description },
        data.naceCode2 && { code: data.naceCode2.code, description: data.naceCode2.description },
        data.naceCode3 && { code: data.naceCode3.code, description: data.naceCode3.description }
      ].filter(Boolean),
      boardMembers,
      bankruptcyStatus: data.concursEstate ? 'konkurs' : null,
      liquidationStatus: data.underAvvikling ? 'under_avvikling' : 
                       data.underTvangsavviklingEllerTvangsopplosning ? 'tvangsavvikling' : null,
      isActive: !data.isDeleted,
      rawData: { companyData: data, rolesData }
    };
  }

  /**
   * Search for companies by name
   */
  async searchCompanies(query: string, limit = 10): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/enheter?navn=${encodeURIComponent(query)}&size=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Brønnøysund search error: ${response.status}`);
      }

      const data = await response.json();
      return data._embedded?.enheter || [];
    } catch (error) {
      console.error('Error searching companies in Brønnøysund:', error);
      throw error;
    }
  }

  /**
   * Validate Norwegian organization number
   */
  validateOrgNumber(orgNumber: string): boolean {
    const clean = orgNumber.replace(/\s/g, '');
    
    // Must be 9 digits
    if (!/^\d{9}$/.test(clean)) {
      return false;
    }

    // Validate checksum using modulus 11
    const weights = [3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
      sum += parseInt(clean[i]) * weights[i];
    }
    
    const remainder = sum % 11;
    const checksum = remainder === 0 ? 0 : 11 - remainder;
    
    return checksum === parseInt(clean[8]);
  }
}

export const bronnoyundService = new BronnoyundService();