import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../main.dart';
import '../models/user.dart';

class KycScreen extends StatefulWidget {
  const KycScreen({super.key});

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // Poll the profile API every 3 seconds to check if SGI approved the user
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) => _checkKycStatus());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _checkKycStatus() async {
    final api = context.read<ApiService>();
    final state = context.read<AppState>();
    
    try {
      final profile = await api.getProfile();
      if (profile.kycStatus == KYCStatus.APPROUVE) {
        _timer?.cancel();
        state.setUser(profile);
      }
    } catch (_) {
      // Fail silently during polling
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(
                Icons.hourglass_bottom_rounded,
                size: 80,
                color: Colors.amber,
              ),
              const SizedBox(height: 32),
              const Text(
                'Dossier KYC en Cours d\'Examen',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Conformément à la réglementation de la BRVM, nos agents vérifient vos justificatifs (Identité, RIB et Facture de domicile) sous 24 heures.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, height: 1.4),
              ),
              const SizedBox(height: 32),
              
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Statut des documents :',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      _buildDocItem('Carte Nationale d\'Identité (CNI)', true),
                      const SizedBox(height: 8),
                      _buildDocItem('Relevé d\'Identité Bancaire (RIB)', true),
                      const SizedBox(height: 8),
                      _buildDocItem('Justificatif de domicile (Facture CIE)', true),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 48),

              ElevatedButton(
                onPressed: () async {
                  _timer?.cancel();
                  await context.read<ApiService>().logout();
                  context.read<AppState>().setUser(null);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E2030),
                  foregroundColor: Colors.redAccent,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Déconnexion'),
              ),
              const SizedBox(height: 16),
              const Text(
                'Attente de synchronisation en temps réel...',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.indigoAccent, fontSize: 11, fontStyle: FontStyle.italic),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDocItem(String label, bool uploaded) {
    return Row(
      children: [
        Icon(
          uploaded ? Icons.check_circle_outline : Icons.radio_button_unchecked,
          color: uploaded ? Colors.greenAccent : Colors.grey,
          size: 16,
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: uploaded ? Colors.white70 : Colors.grey,
          ),
        ),
      ],
    );
  }
}
