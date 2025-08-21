const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string, mfaToken?: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, mfaToken }),
    });
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  async setupMFA() {
    return this.request('/auth/mfa/setup');
  }

  async enableMFA(token: string) {
    return this.request('/auth/mfa/enable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async verifyMFA(token: string) {
    return this.request('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // License endpoints (Vendor only)
  async createLicense(data: any) {
    return this.request('/licensing', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLicenses() {
    return this.request('/licensing');
  }

  async getLicense(id: string) {
    return this.request(`/licensing/${id}`);
  }

  async updateLicense(id: string, data: any) {
    return this.request(`/licensing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // User endpoints
  async createUser(data: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUsers() {
    return this.request('/users');
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deactivateUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Client endpoints
  async fetchBronnoysundData(orgNumber: string) {
    return this.request(`/clients/bronnoysund/${orgNumber}`);
  }

  async createClient(data: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClients() {
    return this.request('/clients');
  }

  async getClient(id: string) {
    return this.request(`/clients/${id}`);
  }

  async updateClient(id: string, data: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async addClientResponsible(clientId: string, data: any) {
    return this.request(`/clients/${clientId}/responsibles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Task endpoints
  async createTask(data: any) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTasks(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/tasks${queryString}`);
  }

  async getTask(id: string) {
    return this.request(`/tasks/${id}`);
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addChecklistItem(taskId: string, label: string) {
    return this.request(`/tasks/${taskId}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    });
  }

  async toggleChecklistItem(itemId: string) {
    return this.request(`/tasks/checklist/${itemId}/toggle`, {
      method: 'PUT',
    });
  }

  // Time tracking endpoints
  async createTimeEntry(data: any) {
    return this.request('/time', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTimeEntries(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/time${queryString}`);
  }

  async getTimeReports(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/time/reports${queryString}`);
  }

  async updateTimeEntry(id: string, data: any) {
    return this.request(`/time/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTimeEntry(id: string) {
    return this.request(`/time/${id}`, {
      method: 'DELETE',
    });
  }

  // AML endpoints
  async updateAmlStatus(clientId: string, data: any) {
    return this.request(`/aml/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAmlStatus(clientId: string) {
    return this.request(`/aml/clients/${clientId}`);
  }

  async getAmlStatuses(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/aml${queryString}`);
  }

  async getAmlDashboard() {
    return this.request('/aml/dashboard');
  }

  async redirectToVerified(clientId: string) {
    return this.request(`/aml/clients/${clientId}/verified-redirect`);
  }

  // Dashboard endpoints
  async getVendorDashboard() {
    return this.request('/dashboard/vendor');
  }

  async getLicenseAdminDashboard() {
    return this.request('/dashboard/license-admin');
  }

  async getEmployeeDashboard() {
    return this.request('/dashboard/employee');
  }

  async getAISuggestions() {
    return this.request('/dashboard/ai-suggestions');
  }

  // Notification endpoints
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // Audit endpoints
  async getAuditLogs(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/audit${queryString}`);
  }

  // Feature flags endpoints
  async getAllFlags() {
    return this.request('/flags');
  }

  async getFlag(flagKey: string) {
    return this.request(`/flags/${flagKey}`);
  }

  async setFlag(flagKey: string, value: any) {
    return this.request(`/flags/${flagKey}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  }

  async deleteFlag(flagKey: string) {
    return this.request(`/flags/${flagKey}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Default fetch function for TanStack Query
export const defaultQueryFn = async ({ queryKey }: { queryKey: any[] }) => {
  const [url] = queryKey;
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(typeof window !== 'undefined' && localStorage.getItem('auth_token') && {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      }),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
};