import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class DcaScreen extends StatefulWidget {
  const DcaScreen({super.key});

  @override
  State<DcaScreen> createState() => _DcaScreenState();
}

class _DcaScreenState extends State<DcaScreen> {
  List<dynamic> _plans = [];
  bool _loading = false;
  
  final _amountController = TextEditingController(text: '25000');
  String _selectedSymbol = 'SNTS';
  String _selectedFrequency = 'MONTHLY';

  final List<String> _symbols = ['SNTS', 'CIEC', 'SDSC', 'ONTF', 'SGBC'];
  final List<String> _frequencies = ['WEEKLY', 'MONTHLY', 'QUARTERLY'];

  @override
  void initState() {
    super.initState();
    _loadPlans();
  }

  Future<void> _loadPlans() async {
    setState(() => _loading = true);
    final api = context.read<ApiService>();
    try {
      final plans = await api.getDcaPlans();
      setState(() {
        _plans = plans;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur DCA: $e')),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createPlan() async {
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) return;

    final api = context.read<ApiService>();
    try {
      await api.createDcaPlan(_selectedSymbol, amount, _selectedFrequency);
      _loadPlans();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Plan DCA créé avec succès !')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }

  Future<void> _togglePlan(String id) async {
    final api = context.read<ApiService>();
    try {
      await api.toggleDcaPlan(id);
      _loadPlans();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }

  Future<void> _deletePlan(String id) async {
    final api = context.read<ApiService>();
    try {
      await api.deleteDcaPlan(id);
      _loadPlans();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Plan DCA supprimé.')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }

  void _showCreateDialog() {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            title: const Text('Créer un plan DCA'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: _selectedSymbol,
                  decoration: const InputDecoration(labelText: 'Action cible'),
                  items: _symbols.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (val) => setDialogState(() => _selectedSymbol = val!),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Montant à investir périodiquement (XOF)'),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _selectedFrequency,
                  decoration: const InputDecoration(labelText: 'Fréquence'),
                  items: _frequencies.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
                  onChanged: (val) => setDialogState(() => _selectedFrequency = val!),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Annuler'),
              ),
              ElevatedButton(
                onPressed: _createPlan,
                child: const Text('Activer le plan'),
              ),
            ],
          );
        }
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Plans DCA Autopilot'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: _showCreateDialog,
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadPlans,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _plans.isEmpty
                ? const Center(
                    child: Text(
                      'Aucun plan programmé actuellement.\nAppuyez sur + pour démarrer.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                  )
                : ListView.builder(
                    itemCount: _plans.length,
                    padding: const EdgeInsets.all(12),
                    itemBuilder: (ctx, idx) {
                      final plan = _plans[idx];
                      final bool isActive = plan['status'] == 'ACTIVE';
                      return Card(
                        child: ListTile(
                          title: Text(
                            '${plan['symbol']} - DCA ${plan['frequency']}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            'Investissement : ${plan['amount']} XOF\nProchaine exécution : ${plan['nextRun'].toString().substring(0, 10)}',
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: Icon(
                                  isActive ? Icons.pause_circle_outline : Icons.play_circle_outline,
                                  color: isActive ? Colors.amber : Colors.green,
                                ),
                                onPressed: () => _togglePlan(plan['id']),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                                onPressed: () => _deletePlan(plan['id']),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
