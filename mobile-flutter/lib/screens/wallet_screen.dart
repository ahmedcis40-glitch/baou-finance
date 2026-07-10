import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/wallet.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  CashWallet? _cashWallet;
  List<SecuritiesWallet> _securities = [];
  bool _loading = false;
  bool _submitting = false;
  final _amountController = TextEditingController(text: '100000');

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final api = context.read<ApiService>();
    try {
      final cash = await api.getCashWallet();
      final sec = await api.getSecuritiesWallet();
      setState(() {
        _cashWallet = cash;
        _securities = sec;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur de chargement: $e')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  bool _isWithdraw = false;

  Future<void> _initiatePawaPayDeposit() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    final api = context.read<ApiService>();
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      setState(() => _submitting = false);
      return;
    }

    try {
      final result = await api.initiateDeposit(amount);
      // Safe null handling: transactionId peut être null si la réponse est incomplète
      final idInternal = (result['transactionId'] as String?) ?? '';
      final paymentUrl = result['paymentUrl'] as String?;
      final mode = (result['mode'] as String?) ?? 'sandbox_simulation';

      if (!mounted) return;

      // Si PawaPay renvoie une URL de checkout → on l'affiche directement
      if (paymentUrl != null && paymentUrl.isNotEmpty && mode == 'pawapay_live') {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Dépôt PawaPay'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Montant: ${amount.toStringAsFixed(0)} XOF'),
                const SizedBox(height: 12),
                const Text('Votre page de paiement PawaPay est prête. Ouvrez-la sur votre téléphone.', style: TextStyle(fontSize: 12)),
                const SizedBox(height: 8),
                SelectableText(paymentUrl, style: const TextStyle(fontSize: 10, color: Colors.blue)),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Fermer'),
              ),
            ],
          ),
        );
        return;
      }

      // Mode sandbox : simulation locale du webhook
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Validation PawaPay (Mode Test)'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Montant à déposer: ${amount.toStringAsFixed(0)} XOF'),
              const SizedBox(height: 12),
              const Text(
                'Mode sandbox — cliquez "Confirmer" pour simuler la validation du paiement.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.pop(ctx);
                if (idInternal.isEmpty) return;
                try {
                  await api.simulateWebhook(idInternal, 'COMPLETED', amount);
                  _loadData();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('✅ Dépôt validé avec succès !'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  }
                } catch (err) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Erreur: $err')),
                    );
                  }
                }
              },
              child: const Text('Confirmer (Succès)', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur dépôt: $e')),
        );
      }
    } finally {
      setState(() => _submitting = false);
    }
  }

  Future<void> _initiatePawaPayWithdrawal() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    final api = context.read<ApiService>();
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      setState(() => _submitting = false);
      return;
    }

    try {
      final result = await api.initiateWithdrawal(amount);
      // Safe null handling
      final idInternal = (result['transactionId'] as String?) ?? '';
      final mode = (result['mode'] as String?) ?? 'sandbox_simulation';

      if (!mounted) return;

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Retrait PawaPay (Wave/Orange/MTN)'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Montant à retirer: ${amount.toStringAsFixed(0)} XOF'),
              const SizedBox(height: 12),
              Text(
                mode == 'pawapay_live'
                    ? 'Retrait initié ! Vous recevrez les fonds sur votre Mobile Money sous peu.'
                    : 'Mode test — cliquez "Confirmer" pour simuler la réception des fonds.',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Fermer'),
            ),
            if (mode != 'pawapay_live' && idInternal.isNotEmpty)
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx);
                  try {
                    await api.simulateWebhook(idInternal, 'COMPLETED', amount);
                    _loadData();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('✅ Retrait validé avec succès !'),
                          backgroundColor: Colors.orange,
                        ),
                      );
                    }
                  } catch (err) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Erreur: $err')),
                      );
                    }
                  }
                },
                child: const Text('Confirmer (Succès)', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
              ),
          ],
        ),
      );

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur retrait: $e')),
        );
      }
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Cash card
            Card(
              elevation: 4,
              child: Container(
                decoration: const BoxDecoration(
                  borderRadius: BorderRadius.all(Radius.circular(16)),
                  gradient: LinearGradient(
                    colors: [Color(0xFFFF8200), Color(0xFFE07300)],
                  ),
                ),
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Portefeuille Cash SGI', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 12),
                    Text(
                      '${_cashWallet?.balanceTotal.toStringAsFixed(0) ?? "0"} XOF',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const Text('Solde Cash Total', style: TextStyle(color: Colors.white70, fontSize: 11)),
                    const SizedBox(height: 16),
                    const Divider(color: Colors.white30),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildBalanceDetails(
                          Icons.lock_outline, 
                          'Gelé (en bourse)', 
                          '${_cashWallet?.balanceFrozen.toStringAsFixed(0) ?? "0"} F',
                          const Color(0xFFFFE0B2)
                        ),
                        _buildBalanceDetails(
                          Icons.lock_open, 
                          'Disponible', 
                          '${_cashWallet?.balanceAvailable.toStringAsFixed(0) ?? "0"} F',
                          const Color(0xFFC8E6C9)
                        ),
                      ],
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // PawaPay MM Deposit & Withdrawal tabbed control
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Transactions Cash',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                        ),
                        Row(
                          children: [
                            ChoiceChip(
                              label: const Text('Dépôt', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              selected: !_isWithdraw,
                              selectedColor: const Color(0xFF009E49),
                              labelStyle: TextStyle(color: !_isWithdraw ? Colors.white : const Color(0xFF0F172A)),
                              backgroundColor: Colors.white,
                              onSelected: (val) {
                                if (val) setState(() => _isWithdraw = false);
                              },
                            ),
                            const SizedBox(width: 8),
                            ChoiceChip(
                              label: const Text('Retrait', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              selected: _isWithdraw,
                              selectedColor: const Color(0xFFFF8200),
                              labelStyle: TextStyle(color: _isWithdraw ? Colors.white : const Color(0xFF0F172A)),
                              backgroundColor: Colors.white,
                              onSelected: (val) {
                                if (val) setState(() => _isWithdraw = true);
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _amountController,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: Color(0xFF0F172A)),
                            decoration: InputDecoration(
                              labelText: _isWithdraw ? 'Montant à retirer (XOF)' : 'Montant à déposer (XOF)',
                              border: const OutlineInputBorder(),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          onPressed: _submitting ? null : (_isWithdraw ? _initiatePawaPayWithdrawal : _initiatePawaPayDeposit),
                          icon: _submitting
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : Icon(_isWithdraw ? Icons.call_received_rounded : Icons.send_rounded, size: 16),
                          label: Text(_isWithdraw ? 'Retirer' : 'Déposer'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isWithdraw ? const Color(0xFFFF8200) : const Color(0xFF009E49),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          ),
                        )
                      ],
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Securities card
            const Text(
              'Mes Actions BRVM',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_securities.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: Text('Aucune action en portefeuille.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _securities.length,
                itemBuilder: (ctx, idx) {
                  final sec = _securities[idx];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(sec.codeValeur, style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                      subtitle: Text('PMP: ${sec.averageBuyPrice.toStringAsFixed(0)} XOF'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('${sec.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFFFF8200))),
                          const Text('Actions', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                    ),
                  );
                },
              )
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceDetails(IconData icon, String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
          ],
        ),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: color)),
      ],
    );
  }
}
