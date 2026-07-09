import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  // Registration controllers
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  
  bool _isRegistering = false;
  bool _consentSMS = true;
  String _errorMessage = '';

  Future<void> _submit() async {
    setState(() {
      _errorMessage = '';
    });

    final api = context.read<ApiService>();
    final state = context.read<AppState>();
    state.setLoading(true);

    try {
      if (_isRegistering) {
        await api.register({
          'email': _emailController.text.trim(),
          'password': _passwordController.text,
          'firstName': _firstNameController.text.trim(),
          'lastName': _lastNameController.text.trim(),
          'phone': _phoneController.text.trim(),
          'consentSMS': _consentSMS,
          'kycDocuments': {
            'identityCardUrl': 'http://localhost:3000/docs/cni.pdf',
            'ribUrl': 'http://localhost:3000/docs/rib.pdf',
            'proofOfAddressUrl': 'http://localhost:3000/docs/domicile.pdf',
          }
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Inscription réussie ! Veuillez valider votre KYC.')),
        );
        
        setState(() {
          _isRegistering = false;
        });
      } else {
        final user = await api.login(
          _emailController.text.trim(),
          _passwordController.text,
        );
        state.setUser(user);
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
      });
    } finally {
      state.setLoading(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              const Icon(Icons.account_balance, size: 64, color: Colors.indigoAccent),
              const SizedBox(height: 16),
              Text(
                _isRegistering ? 'Créer un Compte SGI' : 'Portail Bourse SGI',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 8),
              const Text(
                'Négociation de titres BRVM & Paiements Wave / Orange / MTN',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 32),

              if (_isRegistering) ...[
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _firstNameController,
                        decoration: const InputDecoration(labelText: 'Prénom', filled: true),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _lastNameController,
                        decoration: const InputDecoration(labelText: 'Nom', filled: true),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneController,
                  decoration: const InputDecoration(labelText: 'N° Téléphone (Mobile Money)', filled: true),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
              ],

              TextField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Adresse Email', filled: true),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordController,
                decoration: const InputDecoration(labelText: 'Mot de passe', filled: true),
                obscureText: true,
              ),
              const SizedBox(height: 16),

              if (_isRegistering) ...[
                CheckboxListTile(
                  title: const Text('J\'accepte de recevoir des notifications d\'exécution d\'ordres par SMS', style: TextStyle(fontSize: 11)),
                  value: _consentSMS,
                  onChanged: (val) => setState(() => _consentSMS = val ?? true),
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 8),
              ],

              if (_errorMessage.isNotEmpty) ...[
                Text(_errorMessage, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                const SizedBox(height: 16),
              ],

              if (state.isLoading)
                const Center(child: CircularProgressIndicator())
              else
                ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text(_isRegistering ? 'Soumettre Dossier KYC' : 'Connexion'),
                ),
              const SizedBox(height: 24),
              
              TextButton(
                onPressed: () {
                  setState(() {
                    _isRegistering = !_isRegistering;
                    _errorMessage = '';
                  });
                },
                child: Text(
                  _isRegistering 
                      ? 'Déjà inscrit ? Connectez-vous' 
                      : 'Nouveau client ? Ouvrir un compte SGI',
                  style: const TextStyle(color: Colors.indigoAccent),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
