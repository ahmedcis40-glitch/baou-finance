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
  final _whatsappPhoneController = TextEditingController();
  
  bool _isRegistering = false;
  bool _consentSMS = true;
  bool _consentWhatsApp = true;
  
  // Onboarding dropdown selections (matching website values)
  String _selectedSgi = 'Société Générale Capital Securities West Africa';
  String _selectedObjective = 'EPARGNE';
  String _selectedProfile = 'MODERE';
  String _selectedHorizon = 'MOYEN_TERME';
  
  // Mock KYC files selections (matching website values)
  String _selectedIdFile = 'cni_recto_verso.pdf';
  String _selectedPhotoFile = 'photo_koffi.jpg';
  String _selectedAddressFile = 'facture_cie_avril2026.pdf';

  final List<String> _sgis = [
    'Société Générale Capital Securities West Africa',
    'BICI Bourse',
    'BOA Capital Securities',
    'Coris Bourse',
    'Ecobank Investment Corporation',
    'NSIA Finance',
    'ATLANTIQUE FINANCE',
    'ATTIJARI SECURITIES WEST AFRICA',
  ];

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
        // Validation check
        if (_firstNameController.text.isEmpty ||
            _lastNameController.text.isEmpty ||
            _emailController.text.isEmpty ||
            _passwordController.text.isEmpty ||
            _phoneController.text.isEmpty ||
            _whatsappPhoneController.text.isEmpty) {
          throw Exception('Veuillez remplir tous les champs obligatoires.');
        }

        await api.register({
          'email': _emailController.text.trim(),
          'password': _passwordController.text,
          'firstName': _firstNameController.text.trim(),
          'lastName': _lastNameController.text.trim(),
          'phone': _phoneController.text.trim(),
          'whatsappPhone': _whatsappPhoneController.text.trim(),
          'consentSMS': _consentSMS,
          'consentWhatsApp': _consentWhatsApp,
          'sgiPartenaire': _selectedSgi,
          'investorProfile': _selectedProfile,
          'investorHorizon': _selectedHorizon,
          'investorObjective': _selectedObjective,
          'kycDocuments': {
            'identityCardUrl': '/docs/$_selectedIdFile',
            'photoUrl': '/docs/$_selectedPhotoFile',
            'proofOfAddressUrl': '/docs/$_selectedAddressFile',
          }
        });
        
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Color(0xFF009E49),
            content: Text('Inscription réussie ! Dossier de compte-titres créé.'),
          ),
        );
        
        setState(() {
          _isRegistering = false;
        });
      } else {
        if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
          throw Exception('Veuillez saisir votre email et mot de passe.');
        }
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

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 20.0, bottom: 8.0),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            color: const Color(0xFFFF8200),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  void _showServerSettings() {
    final api = context.read<ApiService>();
    final controller = TextEditingController(text: api.baseUrl);
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Configuration du Serveur'),
          content: TextField(
            controller: controller,
            decoration: const InputDecoration(
              labelText: 'URL API Backend',
              hintText: 'https://finance-baou-xyz.loca.lt',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () async {
                final url = controller.text.trim();
                if (url.isNotEmpty) {
                  await api.updateBaseUrl(url);
                  if (mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Serveur configuré : $url')),
                    );
                  }
                }
              },
              child: const Text('Enregistrer'),
            ),
          ],
        );
      },
    );
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
              const SizedBox(height: 10),
              // Flag bar accent
              Row(
                children: [
                  Expanded(child: Container(height: 4, color: const Color(0xFFFF8200))),
                  Expanded(child: Container(height: 4, color: Colors.white)),
                  Expanded(child: Container(height: 4, color: const Color(0xFF009E49))),
                ],
              ),
              const SizedBox(height: 20),
              // BAOU Logo
              Center(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF8200).withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: Image.asset(
                      'assets/images/baou_logo.jpg',
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'BAOU',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFFFF8200),
                  letterSpacing: 4,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _isRegistering ? 'Ouverture de Compte Titres' : 'Négociation de titres BRVM',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF475569),
                ),
              ),
              const SizedBox(height: 24),

              if (_isRegistering) ...[
                _buildSectionHeader('Informations Personnelles'),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _firstNameController,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: const InputDecoration(labelText: 'Prénom *'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _lastNameController,
                        style: const TextStyle(color: Color(0xFF0F172A)),
                        decoration: const InputDecoration(labelText: 'Nom *'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                _buildSectionHeader('SGI Partenaire & Routage'),
                DropdownButtonFormField<String>(
                  value: _selectedSgi,
                  dropdownColor: Colors.white,
                  style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13),
                  decoration: const InputDecoration(labelText: 'SGI Partenaire *'),
                  items: _sgis.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (val) { if (val != null) setState(() => _selectedSgi = val); },
                ),
                const SizedBox(height: 12),

                _buildSectionHeader('Coordonnées & Notifications'),
                TextField(
                  controller: _phoneController,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(
                    labelText: 'Téléphone Réglementaire *',
                    hintText: '+225...',
                  ),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _whatsappPhoneController,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(
                    labelText: 'Numéro WhatsApp (Exigé) *',
                    hintText: '+225...',
                  ),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 10),

                // Consent toggles styled elegantly
                CheckboxListTile(
                  title: const Text('Notifications par SMS', style: TextStyle(fontSize: 12, color: Color(0xFF475569))),
                  value: _consentSMS,
                  activeColor: const Color(0xFFFF8200),
                  onChanged: (val) => setState(() => _consentSMS = val ?? true),
                  contentPadding: EdgeInsets.zero,
                ),
                CheckboxListTile(
                  title: const Text('Notifications par WhatsApp', style: TextStyle(fontSize: 12, color: Color(0xFF475569))),
                  value: _consentWhatsApp,
                  activeColor: const Color(0xFFFF8200),
                  onChanged: (val) => setState(() => _consentWhatsApp = val ?? true),
                  contentPadding: EdgeInsets.zero,
                ),

                _buildSectionHeader('Profil Investisseur AMF-UMOA'),
                DropdownButtonFormField<String>(
                  value: _selectedObjective,
                  dropdownColor: Colors.white,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Objectif d\'Investissement *'),
                  items: const [
                    DropdownMenuItem(value: 'EPARGNE', child: Text('Épargne & Valorisation')),
                    DropdownMenuItem(value: 'REVENUS', child: Text('Recherche de dividendes')),
                    DropdownMenuItem(value: 'SPECULATION', child: Text('Opérations spéculatives (Court terme)')),
                  ],
                  onChanged: (val) { if (val != null) setState(() => _selectedObjective = val); },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _selectedProfile,
                  dropdownColor: Colors.white,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Aversion au Risque *'),
                  items: const [
                    DropdownMenuItem(value: 'PRUDENT', child: Text('Prudent (ex: CIE, SODECI)')),
                    DropdownMenuItem(value: 'MODERE', child: Text('Modéré (ex: SONATEL, SGBCI)')),
                    DropdownMenuItem(value: 'DYNAMIQUE', child: Text('Audacieux (Actions de croissance)')),
                  ],
                  onChanged: (val) { if (val != null) setState(() => _selectedProfile = val); },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _selectedHorizon,
                  dropdownColor: Colors.white,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Horizon de Placement *'),
                  items: const [
                    DropdownMenuItem(value: 'COURT_TERME', child: Text('Court terme (< 2 ans)')),
                    DropdownMenuItem(value: 'MOYEN_TERME', child: Text('Moyen terme (2 à 5 ans)')),
                    DropdownMenuItem(value: 'LONG_TERME', child: Text('Long terme (> 5 ans)')),
                  ],
                  onChanged: (val) { if (val != null) setState(() => _selectedHorizon = val); },
                ),

                _buildSectionHeader('Pièces Justificatives KYC'),
                DropdownButtonFormField<String>(
                  value: _selectedIdFile,
                  dropdownColor: Colors.white,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Pièce d\'identité (Recto/Verso) *'),
                  items: const [
                    DropdownMenuItem(value: 'cni_recto_verso.pdf', child: Text('cni_recto_verso.pdf')),
                    DropdownMenuItem(value: 'passeport_biometrique.pdf', child: Text('passeport_biometrique.pdf')),
                  ],
                  onChanged: (val) { if (val != null) setState(() => _selectedIdFile = val); },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _selectedPhotoFile,
                  dropdownColor: Colors.white,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Photo d\'identité récente *'),
                  items: const [
                    DropdownMenuItem(value: 'photo_koffi.jpg', child: Text('photo_koffi.jpg')),
                    DropdownMenuItem(value: 'photo_profil.png', child: Text('photo_profil.png')),
                  ],
                  onChanged: (val) { if (val != null) setState(() => _selectedPhotoFile = val); },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _selectedAddressFile,
                  dropdownColor: Colors.white,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Justificatif de domicile *'),
                  items: const [
                    DropdownMenuItem(value: 'facture_cie_avril2026.pdf', child: Text('facture_cie_avril2026.pdf')),
                    DropdownMenuItem(value: 'facture_sodeci_mars2026.pdf', child: Text('facture_sodeci_mars2026.pdf')),
                  ],
                  onChanged: (val) { if (val != null) setState(() => _selectedAddressFile = val); },
                ),
                const SizedBox(height: 12),
              ],

              _buildSectionHeader('Authentification'),
              TextField(
                controller: _emailController,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(
                  labelText: 'Adresse Email *',
                  hintText: 'exemple@sgi.ci',
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordController,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(
                  labelText: 'Mot de passe *',
                  hintText: '••••••••',
                ),
                obscureText: true,
              ),
              const SizedBox(height: 20),

              if (_errorMessage.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Text(
                    _errorMessage, 
                    style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              if (state.isLoading)
                const Center(child: CircularProgressIndicator(color: Color(0xFFFF8200)))
              else
                ElevatedButton(
                  onPressed: _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF8200),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    elevation: 1,
                  ),
                  child: Text(
                    _isRegistering ? 'Soumettre le Dossier d\'Ouverture' : 'Se Connecter',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
              const SizedBox(height: 16),
              
              TextButton(
                onPressed: () {
                  setState(() {
                    _isRegistering = !_isRegistering;
                    _errorMessage = '';
                  });
                },
                child: Text(
                  _isRegistering 
                      ? 'Vous avez déjà un compte ? Se connecter' 
                      : 'Créer un Compte-Titres Réglementaire (KYC)',
                  style: const TextStyle(color: Color(0xFF009E49), fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton.icon(
                  onPressed: _showServerSettings,
                  icon: const Icon(Icons.settings, size: 16, color: Colors.grey),
                  label: const Text(
                    'Configuration Serveur',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
