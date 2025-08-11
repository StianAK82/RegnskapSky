/**
 * Norwegian Accounting Systems Integration Adapters
 * Modular architecture supporting multiple accounting platforms
 */

type AccountingSystemType = "fiken" | "tripletex" | "unimicro" | "poweroffice" | "conta";

export interface AccountingSystemAdapter {
  type: AccountingSystemType;
  name: string;
  testConnection(config: any): Promise<boolean>;
  getCompanies(config: any): Promise<Company[]>;
  getCustomers(config: any, companyId?: string): Promise<Customer[]>;
  getAccounts(config: any, companyId?: string): Promise<Account[]>;
  getTransactions(config: any, companyId?: string, dateFrom?: Date, dateTo?: Date): Promise<Transaction[]>;
  createCustomer(config: any, customer: CreateCustomer, companyId?: string): Promise<Customer>;
  createTransaction(config: any, transaction: CreateTransaction, companyId?: string): Promise<Transaction>;
  syncData(config: any, syncSettings: SyncSettings): Promise<SyncResult>;
}

interface Company {
  id: string;
  name: string;
  orgNumber?: string;
  isActive: boolean;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  orgNumber?: string;
  address?: string;
  customerNumber?: string;
}

interface Account {
  id: string;
  number: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  balance?: number;
  currency?: string;
}

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  accountNumber: string;
  customerRef?: string;
  invoiceRef?: string;
}

interface CreateCustomer {
  name: string;
  email?: string;
  phone?: string;
  orgNumber?: string;
  address?: string;
}

interface CreateTransaction {
  date: Date;
  description: string;
  lines: Array<{
    accountNumber: string;
    amount: number;
    debit: boolean;
  }>;
  customerRef?: string;
  invoiceRef?: string;
}

interface SyncSettings {
  syncCustomers: boolean;
  syncAccounts: boolean;
  syncTransactions: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

interface SyncResult {
  success: boolean;
  customersSync?: { created: number; updated: number; errors: number };
  accountsSync?: { created: number; updated: number; errors: number };
  transactionsSync?: { created: number; updated: number; errors: number };
  errors: string[];
}

/**
 * Fiken Accounting System Adapter
 */
class FikenAdapter implements AccountingSystemAdapter {
  type: AccountingSystemType = "fiken";
  name = "Fiken";

  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`https://api.fiken.no/api/v2/companies`, {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getCompanies(config: any): Promise<Company[]> {
    const response = await fetch(`https://api.fiken.no/api/v2/companies`, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Fiken API error: ${response.status}`);

    const data = await response.json();
    return data.map((company: any) => ({
      id: company.slug,
      name: company.name,
      orgNumber: company.organizationNumber,
      isActive: true
    }));
  }

  async getCustomers(config: any, companyId?: string): Promise<Customer[]> {
    const url = `https://api.fiken.no/api/v2/companies/${companyId}/contacts`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Fiken API error: ${response.status}`);

    const data = await response.json();
    return data.map((contact: any) => ({
      id: contact.contactId.toString(),
      name: contact.name,
      email: contact.email,
      phone: contact.phoneNumber,
      orgNumber: contact.organizationNumber,
      customerNumber: contact.customerNumber
    }));
  }

  async getAccounts(config: any, companyId?: string): Promise<Account[]> {
    const url = `https://api.fiken.no/api/v2/companies/${companyId}/accounts`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Fiken API error: ${response.status}`);

    const data = await response.json();
    return data.map((account: any) => ({
      id: account.code,
      number: account.code,
      name: account.name,
      type: this.mapAccountType(account.accountType),
      balance: account.balance?.amount,
      currency: account.balance?.currency
    }));
  }

  async getTransactions(config: any, companyId?: string, dateFrom?: Date, dateTo?: Date): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('fromDate', dateFrom.toISOString().split('T')[0]);
    if (dateTo) params.append('toDate', dateTo.toISOString().split('T')[0]);

    const url = `https://api.fiken.no/api/v2/companies/${companyId}/journal-entries?${params}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Fiken API error: ${response.status}`);

    const data = await response.json();
    return data.flatMap((entry: any) => 
      entry.journalEntryLines.map((line: any) => ({
        id: `${entry.journalEntryId}-${line.lineId}`,
        date: new Date(entry.date),
        description: entry.description || line.description,
        amount: line.debitAmount || -line.creditAmount,
        currency: 'NOK',
        accountNumber: line.account.code
      }))
    );
  }

  async createCustomer(config: any, customer: CreateCustomer, companyId?: string): Promise<Customer> {
    const url = `https://api.fiken.no/api/v2/companies/${companyId}/contacts`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phoneNumber: customer.phone,
        organizationNumber: customer.orgNumber
      })
    });

    if (!response.ok) throw new Error(`Fiken API error: ${response.status}`);

    const data = await response.json();
    return {
      id: data.contactId.toString(),
      name: data.name,
      email: data.email,
      phone: data.phoneNumber,
      orgNumber: data.organizationNumber
    };
  }

  async createTransaction(config: any, transaction: CreateTransaction, companyId?: string): Promise<Transaction> {
    // Fiken implementation for creating transactions
    throw new Error("Transaction creation not yet implemented for Fiken");
  }

  async syncData(config: any, syncSettings: SyncSettings): Promise<SyncResult> {
    const result: SyncResult = { success: true, errors: [] };
    
    try {
      // Implementation for syncing data from Fiken
      if (syncSettings.syncCustomers) {
        // Sync customers logic
      }
      
      if (syncSettings.syncAccounts) {
        // Sync accounts logic
      }
      
      if (syncSettings.syncTransactions) {
        // Sync transactions logic
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  private mapAccountType(fikenType: string): Account['type'] {
    const mapping: Record<string, Account['type']> = {
      'ASSET': 'asset',
      'LIABILITY': 'liability',
      'EQUITY': 'equity',
      'INCOME': 'income',
      'EXPENSE': 'expense'
    };
    return mapping[fikenType] || 'asset';
  }
}

/**
 * Tripletex Accounting System Adapter
 */
class TripletexAdapter implements AccountingSystemAdapter {
  type: AccountingSystemType = "tripletex";
  name = "Tripletex";

  async testConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`https://tripletex.no/v2/company`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`0:${config.sessionToken}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getCompanies(config: any): Promise<Company[]> {
    // Tripletex implementation
    const response = await fetch(`https://tripletex.no/v2/company`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`0:${config.sessionToken}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Tripletex API error: ${response.status}`);

    const data = await response.json();
    return [{
      id: data.value.id.toString(),
      name: data.value.name,
      orgNumber: data.value.organizationNumber,
      isActive: true
    }];
  }

  async getCustomers(config: any, companyId?: string): Promise<Customer[]> {
    throw new Error("Method not implemented for Tripletex yet");
  }

  async getAccounts(config: any, companyId?: string): Promise<Account[]> {
    throw new Error("Method not implemented for Tripletex yet");
  }

  async getTransactions(config: any, companyId?: string, dateFrom?: Date, dateTo?: Date): Promise<Transaction[]> {
    throw new Error("Method not implemented for Tripletex yet");
  }

  async createCustomer(config: any, customer: CreateCustomer, companyId?: string): Promise<Customer> {
    throw new Error("Method not implemented for Tripletex yet");
  }

  async createTransaction(config: any, transaction: CreateTransaction, companyId?: string): Promise<Transaction> {
    throw new Error("Method not implemented for Tripletex yet");
  }

  async syncData(config: any, syncSettings: SyncSettings): Promise<SyncResult> {
    return { success: false, errors: ['Tripletex sync not yet implemented'] };
  }
}

// Placeholder adapters for other systems
class UnimicroAdapter implements AccountingSystemAdapter {
  type: AccountingSystemType = "unimicro";
  name = "Unimicro";

  async testConnection(config: any): Promise<boolean> { return false; }
  async getCompanies(config: any): Promise<Company[]> { return []; }
  async getCustomers(config: any, companyId?: string): Promise<Customer[]> { return []; }
  async getAccounts(config: any, companyId?: string): Promise<Account[]> { return []; }
  async getTransactions(config: any, companyId?: string, dateFrom?: Date, dateTo?: Date): Promise<Transaction[]> { return []; }
  async createCustomer(config: any, customer: CreateCustomer, companyId?: string): Promise<Customer> { throw new Error("Not implemented"); }
  async createTransaction(config: any, transaction: CreateTransaction, companyId?: string): Promise<Transaction> { throw new Error("Not implemented"); }
  async syncData(config: any, syncSettings: SyncSettings): Promise<SyncResult> { 
    return { success: false, errors: ['Unimicro not yet implemented'] }; 
  }
}

class PowerOfficeAdapter implements AccountingSystemAdapter {
  type: AccountingSystemType = "poweroffice";
  name = "PowerOffice";

  async testConnection(config: any): Promise<boolean> { return false; }
  async getCompanies(config: any): Promise<Company[]> { return []; }
  async getCustomers(config: any, companyId?: string): Promise<Customer[]> { return []; }
  async getAccounts(config: any, companyId?: string): Promise<Account[]> { return []; }
  async getTransactions(config: any, companyId?: string, dateFrom?: Date, dateTo?: Date): Promise<Transaction[]> { return []; }
  async createCustomer(config: any, customer: CreateCustomer, companyId?: string): Promise<Customer> { throw new Error("Not implemented"); }
  async createTransaction(config: any, transaction: CreateTransaction, companyId?: string): Promise<Transaction> { throw new Error("Not implemented"); }
  async syncData(config: any, syncSettings: SyncSettings): Promise<SyncResult> { 
    return { success: false, errors: ['PowerOffice not yet implemented'] }; 
  }
}

class ContaAdapter implements AccountingSystemAdapter {
  type: AccountingSystemType = "conta";
  name = "Conta";

  async testConnection(config: any): Promise<boolean> { return false; }
  async getCompanies(config: any): Promise<Company[]> { return []; }
  async getCustomers(config: any, companyId?: string): Promise<Customer[]> { return []; }
  async getAccounts(config: any, companyId?: string): Promise<Account[]> { return []; }
  async getTransactions(config: any, companyId?: string, dateFrom?: Date, dateTo?: Date): Promise<Transaction[]> { return []; }
  async createCustomer(config: any, customer: CreateCustomer, companyId?: string): Promise<Customer> { throw new Error("Not implemented"); }
  async createTransaction(config: any, transaction: CreateTransaction, companyId?: string): Promise<Transaction> { throw new Error("Not implemented"); }
  async syncData(config: any, syncSettings: SyncSettings): Promise<SyncResult> { 
    return { success: false, errors: ['Conta not yet implemented'] }; 
  }
}

/**
 * Accounting Adapter Registry
 */
export class AccountingAdapterRegistry {
  private adapters = new Map<AccountingSystemType, AccountingSystemAdapter>();

  constructor() {
    this.registerAdapter(new FikenAdapter());
    this.registerAdapter(new TripletexAdapter());
    this.registerAdapter(new UnimicroAdapter());
    this.registerAdapter(new PowerOfficeAdapter());
    this.registerAdapter(new ContaAdapter());
  }

  registerAdapter(adapter: AccountingSystemAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(type: AccountingSystemType): AccountingSystemAdapter | undefined {
    return this.adapters.get(type);
  }

  getAllAdapters(): AccountingSystemAdapter[] {
    return Array.from(this.adapters.values());
  }

  getSupportedSystems(): Array<{ type: AccountingSystemType; name: string; implemented: boolean }> {
    return this.getAllAdapters().map(adapter => ({
      type: adapter.type,
      name: adapter.name,
      implemented: adapter.type === 'fiken' || adapter.type === 'tripletex'
    }));
  }
}

export const accountingAdapterRegistry = new AccountingAdapterRegistry();

export type {
  AccountingSystemAdapter,
  Company,
  Customer,
  Account,
  Transaction,
  CreateCustomer,
  CreateTransaction,
  SyncSettings,
  SyncResult
};