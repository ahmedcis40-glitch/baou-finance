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
                          mainAxisAlignment: MainAxisAlignment.between,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: ord.type == OrderType.ACHAT ? Colors.green.withOpacity(0.15) : Colors.orange.withOpacity(0.15),
                                        borderRadius: const BorderRadius.all(Radius.circular(4)),
                                      ),
                                      child: Text(
                                        ord.type.toString().split('.').last,
                                        style: TextStyle(
                                          color: ord.type == OrderType.ACHAT ? Colors.greenAccent : Colors.orangeAccent,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      ord.codeValeur,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                    )
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${ord.quantityRequested} actions à ${ord.priceRequested.toStringAsFixed(0)} F',
                                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                                Text(
                                  'Le ${ord.createdAt.day}/${ord.createdAt.month} à ${ord.createdAt.hour}:${ord.createdAt.minute}',
                                  style: const TextStyle(color: Colors.grey, fontSize: 10),
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
        bg = Colors.green.withOpacity(0.15);
        fg = Colors.greenAccent;
        break;
      case OrderStatus.ANNULE:
        bg = Colors.red.withOpacity(0.15);
        fg = Colors.redAccent;
        break;
      case OrderStatus.EN_TRAITEMENT:
        bg = Colors.blue.withOpacity(0.15);
        fg = Colors.blueAccent;
        break;
      case OrderStatus.EN_ATTENTE:
        bg = Colors.yellow.withOpacity(0.15);
        fg = Colors.yellowAccent;
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
