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
    // Safe parsing of type enum
    OrderType parsedType = OrderType.ACHAT;
    try {
      parsedType = OrderType.values.firstWhere(
        (e) => e.toString().split('.').last == (json['type'] as String? ?? 'ACHAT'),
      );
    } catch (_) {}

    // Safe parsing of status enum
    OrderStatus parsedStatus = OrderStatus.EN_ATTENTE;
    try {
      parsedStatus = OrderStatus.values.firstWhere(
        (e) => e.toString().split('.').last == (json['status'] as String? ?? 'EN_ATTENTE'),
      );
    } catch (_) {}

    // Safe date parsing
    DateTime parsedDate;
    try {
      parsedDate = DateTime.parse(json['createdAt'] as String? ?? DateTime.now().toIso8601String());
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return Order(
      id: (json['id'] as String?) ?? '',
      userId: (json['userId'] as String?) ?? '',
      type: parsedType,
      codeValeur: (json['codeValeur'] as String?) ?? '',
      quantityRequested: (json['quantityRequested'] as num?)?.toInt() ?? 0,
      priceRequested: (json['priceRequested'] as num?)?.toDouble() ?? 0.0,
      priceReal: (json['priceReal'] as num?)?.toDouble(),
      status: parsedStatus,
      createdAt: parsedDate,
    );
  }
}
