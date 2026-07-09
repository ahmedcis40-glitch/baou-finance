class CashWallet {
  final String id;
  final String userId;
  final double balanceTotal;
  final double balanceFrozen;
  final double balanceAvailable;
  final String currency;

  CashWallet({
    required this.id,
    required this.userId,
    required this.balanceTotal,
    required this.balanceFrozen,
    required this.balanceAvailable,
    required this.currency,
  });

  factory CashWallet.fromJson(Map<String, dynamic> json) {
    final total = (json['balanceTotal'] as num).toDouble();
    final frozen = (json['balanceFrozen'] as num).toDouble();
    return CashWallet(
      id: json['id'],
      userId: json['userId'],
      balanceTotal: total,
      balanceFrozen: frozen,
      balanceAvailable: (json['balanceAvailable'] as num?)?.toDouble() ?? (total - frozen),
      currency: json['currency'] ?? 'XOF',
    );
  }
}

class SecuritiesWallet {
  final String id;
  final String userId;
  final String codeValeur;
  final int quantity;
  final double averageBuyPrice;

  SecuritiesWallet({
    required this.id,
    required this.userId,
    required this.codeValeur,
    required this.quantity,
    required this.averageBuyPrice,
  });

  factory SecuritiesWallet.fromJson(Map<String, dynamic> json) {
    return SecuritiesWallet(
      id: json['id'],
      userId: json['userId'],
      codeValeur: json['codeValeur'],
      quantity: json['quantity'] as int,
      averageBuyPrice: (json['averageBuyPrice'] as num).toDouble(),
    );
  }
}
