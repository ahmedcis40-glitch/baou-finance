import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/order.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Order> _orders = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _loading = true);
    final api = context.read<ApiService>();
    try {
      final list = await api.getMyOrders();
      setState(() {
        _orders = list;
      });
    } catch (_) {
      // Fail silently
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadHistory,
      child: _loading 
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? const Center(child: Text('Aucun ordre enregistré.', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16.0),
                  itemCount: _orders.length,
                  itemBuilder: (ctx, idx) {
                    final ord = _orders[idx];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: ord.type == OrderType.ACHAT ? const Color(0xFFE8F5E9) : const Color(0xFFFFF3E0),
                                        borderRadius: const BorderRadius.all(Radius.circular(4)),
                                      ),
                                      child: Text(
                                        ord.type.toString().split('.').last,
                                        style: TextStyle(
                                          color: ord.type == OrderType.ACHAT ? const Color(0xFF009E49) : const Color(0xFFFF8200),
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      ord.codeValeur,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', color: Color(0xFF0F172A)),
                                    )
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${ord.quantityRequested} actions à ${ord.priceRequested.toStringAsFixed(0)} F',
                                  style: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                                ),
                                Text(
                                'Le ${ord.createdAt.day}/${ord.createdAt.month} à ${ord.createdAt.hour}:${ord.createdAt.minute.toString().padLeft(2, '0')}',
                                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                                ),
                              ],
                            ),
                            _buildStatusBadge(ord.status),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildStatusBadge(OrderStatus status) {
    Color bg;
    Color fg;
    switch (status) {
      case OrderStatus.EXECUTE:
        bg = const Color(0xFFE8F5E9);
        fg = const Color(0xFF009E49);
        break;
      case OrderStatus.ANNULE:
        bg = const Color(0xFFFFEBEE);
        fg = const Color(0xFFD32F2F);
        break;
      case OrderStatus.EN_TRAITEMENT:
        bg = const Color(0xFFE3F2FD);
        fg = const Color(0xFF1976D2);
        break;
      case OrderStatus.EN_ATTENTE:
        bg = const Color(0xFFFFFDE7);
        fg = const Color(0xFFFBC02D);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: const BorderRadius.all(Radius.circular(12)),
        border: Border.all(color: fg.withOpacity(0.2)),
      ),
      child: Text(
        status.toString().split('.').last,
        style: TextStyle(color: fg, fontSize: 9, fontWeight: FontWeight.bold),
      ),
    );
  }
}
