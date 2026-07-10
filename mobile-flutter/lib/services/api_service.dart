import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/wallet.dart';
import '../models/order.dart';

class ApiService {
  static const String baseUrl = 'http://192.168.1.103:3000';
  String? _token;

  Future<String?> _getToken() async {
    if (_token != null) return _token;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token');
    return _token;
  }

  Future<void> _saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  Map<String, String> _headers(String? token) {
    final headers = {'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Auth & KYC
  Future<User> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers(null),
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await _saveToken(data['accessToken']);
      return User.fromJson(data['user']);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Erreur d\'authentification');
    }
  }

  Future<User> register(Map<String, dynamic> userData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _headers(null),
      body: jsonEncode(userData),
    );

    if (response.statusCode == 201) {
      return User.fromJson(jsonDecode(response.body));
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Erreur lors de l\'inscription');
    }
  }

  Future<User> getProfile() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      return User.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Impossible de récupérer le profil');
    }
  }

  // Wallets
  Future<CashWallet> getCashWallet() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/wallets/cash'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      return CashWallet.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Impossible de charger le portefeuille cash');
    }
  }

  Future<List<SecuritiesWallet>> getSecuritiesWallet() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/wallets/securities'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final List list = jsonDecode(response.body);
      return list.map((item) => SecuritiesWallet.fromJson(item)).toList();
    } else {
      throw Exception('Impossible de charger le portefeuille titres');
    }
  }

  // PawaPay (Mobile Money)
  Future<Map<String, dynamic>> initiateDeposit(double amount) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/pawapay/deposit'),
      headers: _headers(token),
      body: jsonEncode({'amount': amount}),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Erreur lors du dépôt');
    }
  }

  Future<Map<String, dynamic>> initiateWithdrawal(double amount) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/pawapay/withdraw'),
      headers: _headers(token),
      body: jsonEncode({'amount': amount}),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Erreur lors du retrait');
    }
  }

  // Brokerage Orders
  Future<Order> createOrder(Map<String, dynamic> orderDto) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/orders'),
      headers: _headers(token),
      body: jsonEncode(orderDto),
    );

    if (response.statusCode == 201) {
      return Order.fromJson(jsonDecode(response.body));
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Erreur lors du passage d\'ordre');
    }
  }

  Future<List<Order>> getMyOrders() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/orders/my'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      final List list = jsonDecode(response.body);
      return list.map((item) => Order.fromJson(item)).toList();
    } else {
      throw Exception('Impossible de charger l\'historique des ordres');
    }
  }

  // DCA plans API support
  Future<List<dynamic>> getDcaPlans() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/dca/my'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Impossible de charger les plans DCA');
    }
  }

  Future<Map<String, dynamic>> createDcaPlan(String symbol, double amount, String frequency) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/dca/create'),
      headers: _headers(token),
      body: jsonEncode({'symbol': symbol, 'amount': amount, 'frequency': frequency}),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Erreur lors de la création du plan DCA');
    }
  }

  Future<Map<String, dynamic>> toggleDcaPlan(String planId) async {
    final token = await _getToken();
    final response = await http.put(
      Uri.parse('$baseUrl/dca/$planId/toggle'),
      headers: _headers(token),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Impossible de modifier le statut du plan DCA');
    }
  }

  Future<void> deleteDcaPlan(String planId) async {
    final token = await _getToken();
    final response = await http.delete(
      Uri.parse('$baseUrl/dca/$planId'),
      headers: _headers(token),
    );

    if (response.statusCode != 200) {
      throw Exception('Impossible de supprimer le plan DCA');
    }
  }

  // Webhook simulation helper for PawaPay
  Future<Map<String, dynamic>> simulateWebhook(String idInternal, String status, double amount) async {
    final response = await http.post(
      Uri.parse('$baseUrl/pawapay/simulate-webhook'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'idInternal': idInternal,
        'status': status,
        'amount': amount,
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = jsonDecode(response.body);
      
      // Execute the actual webhook request
      final postResponse = await http.post(
        Uri.parse('$baseUrl/pawapay/webhook'),
        headers: {
          'Content-Type': 'application/json',
          'x-pawapay-signature': data['signature']
        },
        body: jsonEncode(data['payload']),
      );

      if (postResponse.statusCode == 201 || postResponse.statusCode == 200) {
        return jsonDecode(postResponse.body);
      } else {
        throw Exception('Échec de la validation du Webhook');
      }
    } else {
      throw Exception('Échec de la simulation du Webhook');
    }
  }
}
