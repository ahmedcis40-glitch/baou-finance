const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(path, options = {}) {
    const url = `${API_URL}${path}`;
    const headers = { ...this.getHeaders(), ...options.headers };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Auth & KYC
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async getClients() {
    return this.request('/auth/clients');
  }

  async validateKyc(userId, status) {
    return this.request(`/auth/kyc/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // Wallets
  async getMyCash() {
    return this.request('/wallets/cash');
  }

  async getMySecurities() {
    return this.request('/wallets/securities');
  }

  async getClientCash(userId) {
    return this.request(`/wallets/admin/cash/${userId}`);
  }

  async getClientSecurities(userId) {
    return this.request(`/wallets/admin/securities/${userId}`);
  }

  // Orders
  async createOrder(orderDto) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderDto),
    });
  }

  async getMyOrders() {
    return this.request('/orders/my');
  }

  async getAllOrders() {
    return this.request('/orders/admin');
  }

  async updateOrderStatus(orderId, status, priceReal = null) {
    return this.request(`/orders/admin/status/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({ status, priceReal: priceReal ? Number(priceReal) : null }),
    });
  }

  // PawaPay (Mobile money)
  async initiateDeposit(amount) {
    return this.request('/pawapay/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount) }),
    });
  }

  async getMyTransactions() {
    return this.request('/pawapay/my');
  }

  async getAllTransactions() {
    return this.request('/pawapay/admin');
  }

  async simulateWebhook(idInternal, status, amount) {
    // Generate signed payload info from backend
    const simResult = await this.request('/pawapay/simulate-webhook', {
      method: 'POST',
      body: JSON.stringify({ idInternal, status, amount: Number(amount) }),
    });

    // Send payload + signature directly to the webhook receiver
    return this.request('/pawapay/webhook', {
      method: 'POST',
      headers: {
        'x-pawapay-signature': simResult.signature,
      },
      body: JSON.stringify(simResult.payload),
    });
  }

  async getPawaPayDebugInfo() {
    return this.request('/pawapay/debug-info');
  }

  async testPawaPayConnection() {
    return this.request('/pawapay/test-connection', {
      method: 'POST',
    });
  }

  async getPawaPayDebugLogs() {
    return this.request('/pawapay/debug-logs');
  }

  // Market stock tickers
  async getStocks() {
    return this.request('/market/stocks');
  }

  // Audit Logs
  async getAuditLogs() {
    return this.request('/audit');
  }
}

export const api = new ApiService();
