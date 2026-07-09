enum OrderType {
  ACHAT,
  VENTE
}

enum OrderStatus {
  EN_ATTENTE,
  EN_TRAITEMENT,
  EXECUTE,
  ANNULE
}

class Order {
  final String id;
  final String userId;
  final OrderType type;
  final String codeValeur;
  final int quantityRequested;
  final double priceRequested;
  final double? priceReal;
  final OrderStatus status;
  final DateTime createdAt;

  Order({
    required this.id,
    required this.userId,
    required this.type,
    required this.codeValeur,
    required this.quantityRequested,
    required this.priceRequested,
    this.priceReal,
    required this.status,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'],
      userId: json['userId'],
      type: OrderType.values.firstWhere((e) => e.toString().split('.').last == json['type']),
      codeValeur: json['codeValeur'],
      quantityRequested: json['quantityRequested'] as int,
      priceRequested: (json['priceRequested'] as num).toDouble(),
      priceReal: json['priceReal'] != null ? (json['priceReal'] as num).toDouble() : null,
      status: OrderStatus.values.firstWhere((e) => e.toString().split('.').last == json['status']),
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
