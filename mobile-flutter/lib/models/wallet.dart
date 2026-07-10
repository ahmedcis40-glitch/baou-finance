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
    final total = (json['balanceTotal'] as num?)?.toDouble() ?? 0.0;
    final frozen = (json['balanceFrozen'] as num?)?.toDouble() ?? 0.0;
    final available = (json['balanceAvailable'] as num?)?.toDouble() ?? (total - frozen);
    return CashWallet(
      id: (json['id'] as String?) ?? '',
      userId: (json['userId'] as String?) ?? '',
      balanceTotal: total,
      balanceFrozen: frozen,
      balanceAvailable: available,
      currency: (json['currency'] as String?) ?? 'XOF',
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
      id: (json['id'] as String?) ?? '',
      userId: (json['userId'] as String?) ?? '',
      codeValeur: (json['codeValeur'] as String?) ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      averageBuyPrice: (json['averageBuyPrice'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
