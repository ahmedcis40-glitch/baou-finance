import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class TradingScreen extends StatefulWidget {
  const TradingScreen({super.key});

  @override
  State<TradingScreen> createState() => _TradingScreenState();
}

class _TradingScreenState extends State<TradingScreen> {
  String _orderType = 'ACHAT'; // 'ACHAT' | 'VENTE'
  String _codeValeur = 'SNTS';
  final _qtyController = TextEditingController(text: '10');
  final _priceController = TextEditingController(text: '16500');
  
  double _commissions = 0;
  double _totalEstimated = 0;

  final List<Map<String, dynamic>> _stocks = [
    {'code': 'SNTS', 'name': 'Sonatel CI', 'price': 16500},
    {'code': 'CIEC', 'name': 'CIE CI', 'price': 2100},
    {'code': 'SDSC', 'name': 'Solibra CI', 'price': 85000},
    {'code': 'ONTF', 'name': 'Onatel BF', 'price': 2400},
    {'code': 'SGBC', 'name': 'SGBCI CI', 'price': 15500},
  ];

  @override
  void initState() {
    super.initState();
    _recalculate();
    _qtyController.addListener(_recalculate);
    _priceController.addListener(_recalculate);
  }

  void _recalculate() {
    final qty = int.tryParse(_qtyController.text) ?? 0;
    final price = double.tryParse(_priceController.text) ?? 0;
    final baseCost = qty * price;
    
    // Commission SGI is 1.5%
    final comm = baseCost * 0.015;
    
    setState(() {
      _commissions = comm;
      // If buy, escrow holds tiles + commission. If sell, escrow only holds securities.
      _totalEstimated = _orderType == 'ACHAT' ? (baseCost + comm) : baseCost;
    });
  }

  Future<void> _placeOrder() async {
    final api = context.read<ApiService>();
    final qty = int.tryParse(_qtyController.text) ?? 0;
    final price = double.tryParse(_priceController.text) ?? 0;

    if (qty <= 0 || price <= 0) return;

    try {
      await api.createOrder({
        'type': _orderType,
        'codeValeur': _codeValeur,
        'quantityRequested': qty,
        'priceRequested': price,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ordre transmis avec succès à la SGI !')),
      );
      
      // Reset form
      _qtyController.text = '10';
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Order type picker
          Row(
            children: [
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('ACHAT', style: TextStyle(fontWeight: FontWeight.bold))),
                  selected: _orderType == 'ACHAT',
                  onSelected: (val) {
                    if (val) {
                      setState(() => _orderType = 'ACHAT');
                      _recalculate();
                    }
                  },
                  selectedColor: Colors.green.shade900,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ChoiceChip(
                  label: const Center(child: Text('VENTE', style: TextStyle(fontWeight: FontWeight.bold))),
                  selected: _orderType == 'VENTE',
                  onSelected: (val) {
                    if (val) {
                      setState(() => _orderType = 'VENTE');
                      _recalculate();
                    }
                  },
                  selectedColor: Colors.orange.shade900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Security picker
          DropdownButtonFormField<String>(
            value: _codeValeur,
            decoration: const InputDecoration(labelText: 'Titre BRVM', border: OutlineInputBorder()),
            items: _stocks.map((s) {
              return DropdownMenuItem<String>(
                value: s['code'] as String,
                child: Text('${s['code']} - ${s['name']} (${s['price']} F)'),
              );
            }).toList(),
            onChanged: (val) {
              if (val != null) {
                setState(() {
                  _codeValeur = val;
                  // Auto-fill price
                  final st = _stocks.firstWhere((s) => s['code'] == val);
                  _priceController.text = st['price'].toString();
                });
                _recalculate();
              }
            },
          ),
          const SizedBox(height: 16),

          // Qty and Price
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _qtyController,
                  decoration: const InputDecoration(labelText: 'Quantité', border: OutlineInputBorder()),
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _priceController,
                  decoration: const InputDecoration(labelText: 'Cours Limite (XOF)', border: OutlineInputBorder()),
                  keyboardType: TextInputType.number,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Live calculation container
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildCalcRow('Coût des titres', '${(_totalEstimated - (_orderType == 'ACHAT' ? _commissions : 0)).toStringAsFixed(0)} F'),
                  const SizedBox(height: 8),
                  _buildCalcRow('Commission SGI (1.5%)', '${_commissions.toStringAsFixed(0)} F'),
                  const Divider(color: Colors.white24, height: 24),
                  _buildCalcRow(
                    _orderType == 'ACHAT' ? 'Montant Total Gelé' : 'Crédit Estimé (hors frais)', 
                    '${_totalEstimated.toStringAsFixed(0)} F', 
                    isBold: true,
                    color: _orderType == 'ACHAT' ? Colors.amberAccent : Colors.greenAccent
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),

          ElevatedButton(
            onPressed: _placeOrder,
            style: ElevatedButton.styleFrom(
              backgroundColor: _orderType == 'ACHAT' ? Colors.indigo : Colors.orange.shade800,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: Text(
              _orderType == 'ACHAT' 
                  ? 'Soumettre Achat (Geler les fonds)' 
                  : 'Soumettre Vente (Escrow titres)'
            ),
          )
        ],
      ),
    );
  }

  Widget _buildCalcRow(String label, String val, {bool isBold = false, Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.between,
      children: [
        Text(label, style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        Text(
          val, 
          style: TextStyle(
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            fontFamily: 'monospace',
            color: color ?? (isBold ? Colors.white : Colors.white70),
          )
        ),
      ],
    );
  }
}
