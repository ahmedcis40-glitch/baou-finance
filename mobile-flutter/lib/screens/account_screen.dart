import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../main.dart';
import '../models/user.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;

    if (user == null) {
      return const Center(
        child: Text('Aucun utilisateur connecté', style: TextStyle(color: Colors.grey)),
      );
    }

    // Helper to format values
    String getAversionLabel(String val) {
      if (val == 'PRUDENT') return 'Prudent (Dividendes / Défensif)';
      if (val == 'DYNAMIQUE') return 'Audacieux (Croissance / PME)';
      return 'Modéré (Actions majeures)';
    }

    String getHorizonLabel(String val) {
      if (val == 'COURT_TERME') return 'Court terme (Moins de 2 ans)';
      if (val == 'LONG_TERME') return 'Long terme (Plus de 5 ans)';
      return 'Moyen terme (2 à 5 ans)';
    }

    String getObjectiveLabel(String val) {
      if (val == 'REVENUS') return 'Recherche de dividendes réguliers';
      if (val == 'SPECULATION') return 'Opérations spéculatives court terme';
      return 'Épargne & Valorisation de capital';
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // User Card Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: const Color(0xFFFF8200).withOpacity(0.1),
                    child: Text(
                      '${user.firstName.isNotEmpty ? user.firstName[0] : '?'}${user.lastName.isNotEmpty ? user.lastName[0] : '?'}'.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFFF8200),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${user.firstName} ${user.lastName}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.email,
                          style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // SGI Partner Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.shield_outlined, color: Color(0xFF009E49), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'SGI Partenaire Agréée',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user.sgiPartenaire ?? 'SGI partenaire non renseignée',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Votre compte-titres est hébergé et vos fonds sont garantis légalement par notre SGI partenaire régulée par l\'AMF-UMOA.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Statut KYC LBC/FT :',
                        style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: user.kycStatus == KYCStatus.APPROUVE
                              ? const Color(0xFFC8E6C9)
                              : const Color(0xFFFFECB3),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          user.kycStatus == KYCStatus.APPROUVE ? 'COMPTE ACTIVÉ' : 'VÉRIFICATION EN COURS',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: user.kycStatus == KYCStatus.APPROUVE
                                ? const Color(0xFF2E7D32)
                                : const Color(0xFFF57F17),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Convention PDF'),
                          content: Text(
                            'Téléchargement de la "Convention d\'Apporteur d\'Affaires & Compte Titres" signée électroniquement entre BAOU, ${user.sgiPartenaire ?? 'SGI partenaire'} et ${user.firstName} ${user.lastName}.\n\nRéférence : CONV-SGI-${user.id.length >= 8 ? user.id.substring(0, 8).toUpperCase() : user.id.toUpperCase()}',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('OK'),
                            )
                          ],
                        ),
                      );
                    },
                    icon: const Icon(Icons.file_download_outlined, size: 18),
                    label: const Text('Convention Compte-Titres (PDF)'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF009E49),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 44),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Questionnaire investor profile Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.assignment_outlined, color: Color(0xFFFF8200), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Profil d\'Investisseur AMF-UMOA',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildProfileRow('Aversion au Risque :', getAversionLabel(user.investorProfile ?? 'MODERE')),
                  const SizedBox(height: 12),
                  _buildProfileRow('Horizon de Placement :', getHorizonLabel(user.investorHorizon ?? 'MOYEN_TERME')),
                  const SizedBox(height: 12),
                  _buildProfileRow('Objectif Financier :', getObjectiveLabel(user.investorObjective ?? 'EPARGNE')),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      '💬 Consentement de notification :\nLes alertes d\'exécution et de mouvements de fonds seront acheminées vers votre numéro de téléphone via WhatsApp et SMS (${user.phone.isNotEmpty ? user.phone : 'non renseigné'}).',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Logout Button
          ElevatedButton(
            onPressed: () async {
              await context.read<ApiService>().logout();
              if (context.mounted) {
                context.read<AppState>().setUser(null);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF1F5F9),
              foregroundColor: Colors.red,
              padding: const EdgeInsets.symmetric(vertical: 14),
              elevation: 0,
            ),
            child: const Text('Déconnexion', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
      ],
    );
  }
}
