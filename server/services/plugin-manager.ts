/**
 * Plugin Manager Service
 * Handles plugin registration, configuration, and execution
 */

import type { Plugin, PluginConfiguration, InsertPlugin, InsertPluginConfiguration } from "@shared/schema";

export interface PluginInterface {
  id: string;
  name: string;
  version: string;
  description: string;
  
  // Lifecycle methods
  install?(config: any): Promise<void>;
  uninstall?(): Promise<void>;
  activate?(config: any): Promise<void>;
  deactivate?(): Promise<void>;
  
  // Core functionality
  execute(action: string, data: any, config: any): Promise<any>;
  validateConfig(config: any): boolean;
  getConfigSchema(): any;
  
  // API endpoints this plugin provides
  getApiEndpoints?(): Array<{
    method: string;
    path: string;
    handler: string;
    permissions?: string[];
  }>;
  
  // Dependencies this plugin requires
  getDependencies?(): string[];
}

/**
 * Base Plugin Class
 */
export abstract class BasePlugin implements PluginInterface {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract description: string;

  async install(config: any): Promise<void> {
    // Default implementation - can be overridden
  }

  async uninstall(): Promise<void> {
    // Default implementation - can be overridden
  }

  async activate(config: any): Promise<void> {
    // Default implementation - can be overridden
  }

  async deactivate(): Promise<void> {
    // Default implementation - can be overridden
  }

  abstract execute(action: string, data: any, config: any): Promise<any>;

  validateConfig(config: any): boolean {
    const schema = this.getConfigSchema();
    // Basic validation - in a real implementation, use a JSON schema validator
    return schema && typeof config === 'object';
  }

  abstract getConfigSchema(): any;

  getApiEndpoints(): Array<{ method: string; path: string; handler: string; permissions?: string[] }> {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }
}

/**
 * Example: Email Automation Plugin
 */
export class EmailAutomationPlugin extends BasePlugin {
  id = 'email_automation';
  name = 'Email Automation';
  version = '1.0.0';
  description = 'Automates email sending for various accounting events';

  async execute(action: string, data: any, config: any): Promise<any> {
    switch (action) {
      case 'send_invoice_reminder':
        return this.sendInvoiceReminder(data, config);
      case 'send_task_notification':
        return this.sendTaskNotification(data, config);
      case 'send_monthly_report':
        return this.sendMonthlyReport(data, config);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        smtpHost: { type: 'string' },
        smtpPort: { type: 'number' },
        smtpUser: { type: 'string' },
        smtpPassword: { type: 'string' },
        fromEmail: { type: 'string' },
        templates: {
          type: 'object',
          properties: {
            invoiceReminder: { type: 'string' },
            taskNotification: { type: 'string' },
            monthlyReport: { type: 'string' }
          }
        }
      },
      required: ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail']
    };
  }

  getApiEndpoints() {
    return [
      {
        method: 'POST',
        path: '/api/plugins/email-automation/send',
        handler: 'sendEmail',
        permissions: ['email.send']
      }
    ];
  }

  private async sendInvoiceReminder(data: any, config: any): Promise<any> {
    // Implementation for sending invoice reminders
    return { success: true, messageId: `email-${Date.now()}` };
  }

  private async sendTaskNotification(data: any, config: any): Promise<any> {
    // Implementation for sending task notifications
    return { success: true, messageId: `email-${Date.now()}` };
  }

  private async sendMonthlyReport(data: any, config: any): Promise<any> {
    // Implementation for sending monthly reports
    return { success: true, messageId: `email-${Date.now()}` };
  }
}

/**
 * Example: Report Generator Plugin
 */
export class ReportGeneratorPlugin extends BasePlugin {
  id = 'report_generator';
  name = 'Advanced Report Generator';
  version = '1.0.0';
  description = 'Generates advanced financial reports and analytics';

  async execute(action: string, data: any, config: any): Promise<any> {
    switch (action) {
      case 'generate_profit_loss':
        return this.generateProfitLoss(data, config);
      case 'generate_balance_sheet':
        return this.generateBalanceSheet(data, config);
      case 'generate_cash_flow':
        return this.generateCashFlow(data, config);
      case 'generate_tax_report':
        return this.generateTaxReport(data, config);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  getConfigSchema(): any {
    return {
      type: 'object',
      properties: {
        reportFormats: {
          type: 'array',
          items: { type: 'string', enum: ['pdf', 'excel', 'csv'] }
        },
        includeGraphs: { type: 'boolean' },
        companyLogo: { type: 'string' },
        footerText: { type: 'string' }
      }
    };
  }

  getApiEndpoints() {
    return [
      {
        method: 'POST',
        path: '/api/plugins/report-generator/generate',
        handler: 'generateReport',
        permissions: ['reports.generate']
      },
      {
        method: 'GET',
        path: '/api/plugins/report-generator/templates',
        handler: 'getTemplates',
        permissions: ['reports.view']
      }
    ];
  }

  private async generateProfitLoss(data: any, config: any): Promise<any> {
    // Implementation for generating profit & loss report
    return { reportId: `pl-${Date.now()}`, format: 'pdf', size: '245KB' };
  }

  private async generateBalanceSheet(data: any, config: any): Promise<any> {
    // Implementation for generating balance sheet
    return { reportId: `bs-${Date.now()}`, format: 'pdf', size: '198KB' };
  }

  private async generateCashFlow(data: any, config: any): Promise<any> {
    // Implementation for generating cash flow statement
    return { reportId: `cf-${Date.now()}`, format: 'pdf', size: '156KB' };
  }

  private async generateTaxReport(data: any, config: any): Promise<any> {
    // Implementation for generating tax reports
    return { reportId: `tax-${Date.now()}`, format: 'pdf', size: '312KB' };
  }
}

/**
 * Plugin Manager Service
 */
export class PluginManagerService {
  private registeredPlugins = new Map<string, PluginInterface>();
  private activePlugins = new Map<string, PluginInterface>();

  constructor() {
    // Register built-in plugins
    this.registerPlugin(new EmailAutomationPlugin());
    this.registerPlugin(new ReportGeneratorPlugin());
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: PluginInterface): void {
    if (this.registeredPlugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    // Validate plugin dependencies
    const dependencies = plugin.getDependencies?.() || [];
    for (const dep of dependencies) {
      if (!this.registeredPlugins.has(dep)) {
        throw new Error(`Plugin ${plugin.id} depends on ${dep} which is not registered`);
      }
    }

    this.registeredPlugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.id} (${plugin.name} v${plugin.version}) registered`);
  }

  /**
   * Activate a plugin for a tenant
   */
  async activatePlugin(pluginId: string, tenantId: string, config: any): Promise<void> {
    const plugin = this.registeredPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!plugin.validateConfig(config)) {
      throw new Error(`Invalid configuration for plugin ${pluginId}`);
    }

    const key = `${tenantId}:${pluginId}`;
    if (this.activePlugins.has(key)) {
      throw new Error(`Plugin ${pluginId} is already active for tenant ${tenantId}`);
    }

    // Activate dependencies first
    const dependencies = plugin.getDependencies?.() || [];
    for (const dep of dependencies) {
      const depKey = `${tenantId}:${dep}`;
      if (!this.activePlugins.has(depKey)) {
        throw new Error(`Dependency ${dep} must be activated first`);
      }
    }

    if (plugin.activate) {
      await plugin.activate(config);
    }

    this.activePlugins.set(key, plugin);
    console.log(`Plugin ${pluginId} activated for tenant ${tenantId}`);
  }

  /**
   * Deactivate a plugin for a tenant
   */
  async deactivatePlugin(pluginId: string, tenantId: string): Promise<void> {
    const key = `${tenantId}:${pluginId}`;
    const plugin = this.activePlugins.get(key);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not active for tenant ${tenantId}`);
    }

    // Check if other plugins depend on this one
    for (const [activeKey, activePlugin] of this.activePlugins) {
      if (activeKey.startsWith(`${tenantId}:`) && activeKey !== key) {
        const dependencies = activePlugin.getDependencies?.() || [];
        if (dependencies.includes(pluginId)) {
          throw new Error(`Cannot deactivate ${pluginId} because ${activePlugin.id} depends on it`);
        }
      }
    }

    if (plugin.deactivate) {
      await plugin.deactivate();
    }

    this.activePlugins.delete(key);
    console.log(`Plugin ${pluginId} deactivated for tenant ${tenantId}`);
  }

  /**
   * Execute a plugin action
   */
  async executePlugin(
    pluginId: string, 
    tenantId: string, 
    action: string, 
    data: any, 
    config: any
  ): Promise<any> {
    const key = `${tenantId}:${pluginId}`;
    const plugin = this.activePlugins.get(key);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not active for tenant ${tenantId}`);
    }

    try {
      const result = await plugin.execute(action, data, config);
      return {
        success: true,
        result,
        executedAt: new Date(),
        pluginId,
        action
      };
    } catch (error) {
      console.error(`Plugin execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date(),
        pluginId,
        action
      };
    }
  }

  /**
   * Get available plugins
   */
  getAvailablePlugins(): Array<{
    id: string;
    name: string;
    version: string;
    description: string;
    configSchema: any;
    apiEndpoints: any[];
    dependencies: string[];
  }> {
    return Array.from(this.registeredPlugins.values()).map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      configSchema: plugin.getConfigSchema(),
      apiEndpoints: plugin.getApiEndpoints?.() || [],
      dependencies: plugin.getDependencies?.() || []
    }));
  }

  /**
   * Get active plugins for a tenant
   */
  getActivePlugins(tenantId: string): Array<{
    id: string;
    name: string;
    version: string;
  }> {
    const activePlugins: Array<{ id: string; name: string; version: string }> = [];
    
    for (const [key, plugin] of this.activePlugins) {
      if (key.startsWith(`${tenantId}:`)) {
        activePlugins.push({
          id: plugin.id,
          name: plugin.name,
          version: plugin.version
        });
      }
    }
    
    return activePlugins;
  }

  /**
   * Get plugin API endpoints for a tenant
   */
  getPluginApiEndpoints(tenantId: string): Array<{
    pluginId: string;
    method: string;
    path: string;
    handler: string;
    permissions?: string[];
  }> {
    const endpoints: Array<{
      pluginId: string;
      method: string;
      path: string;
      handler: string;
      permissions?: string[];
    }> = [];

    for (const [key, plugin] of this.activePlugins) {
      if (key.startsWith(`${tenantId}:`)) {
        const pluginEndpoints = plugin.getApiEndpoints?.() || [];
        for (const endpoint of pluginEndpoints) {
          endpoints.push({
            pluginId: plugin.id,
            ...endpoint
          });
        }
      }
    }

    return endpoints;
  }

  /**
   * Validate plugin configuration
   */
  validatePluginConfig(pluginId: string, config: any): { valid: boolean; errors: string[] } {
    const plugin = this.registeredPlugins.get(pluginId);
    if (!plugin) {
      return { valid: false, errors: [`Plugin ${pluginId} not found`] };
    }

    const isValid = plugin.validateConfig(config);
    const errors: string[] = [];
    
    if (!isValid) {
      errors.push('Configuration validation failed');
    }

    return { valid: isValid, errors };
  }
}

export const pluginManagerService = new PluginManagerService();

export type { PluginInterface };
export { BasePlugin };