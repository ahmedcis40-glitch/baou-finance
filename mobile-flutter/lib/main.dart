import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/api_service.dart';
import 'models/user.dart';
import 'screens/login_screen.dart';
import 'screens/kyc_screen.dart';
import 'screens/wallet_screen.dart';
import 'screens/trading_screen.dart';
import 'screens/history_screen.dart';
import 'screens/dca_screen.dart';
import 'screens/account_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final initialUrl = prefs.getString('api_base_url') ?? ApiService.defaultUrl;

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiService>(create: (_) => ApiService(initialBaseUrl: initialUrl)),
        ChangeNotifierProvider<AppState>(create: (_) => AppState()),
      ],
      child: const SgiApp(),
    ),
  );
}

class AppState extends ChangeNotifier {
  User? _currentUser;
  bool _isLoading = false;

  User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;

  void setUser(User? user) {
    _currentUser = user;
    notifyListeners();
  }

  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
}

class SgiApp extends StatelessWidget {
  const SgiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BAOU',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        primaryColor: const Color(0xFFFF8200),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        colorScheme: const ColorScheme.light(
          primary: Color(0xFFFF8200),
          secondary: Color(0xFF009E49),
          surface: Color(0xFFF8FAFC),
        ),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            borderSide: BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            borderSide: BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            borderSide: BorderSide(color: Color(0xFFFF8200)),
          ),
          filled: true,
          fillColor: Colors.white,
          labelStyle: TextStyle(fontSize: 12, color: Color(0xFF475569)),
          floatingLabelStyle: TextStyle(color: Color(0xFFFF8200)),
        ),
        cardTheme: const CardTheme(
          color: Colors.white,
          elevation: 2,
          shadowColor: Color(0x0A000000),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
            side: BorderSide(color: Color(0xFFE2E8F0), width: 1),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation: 1,
          shadowColor: Color(0xFFE2E8F0),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: Color(0xFFFF8200),
          unselectedItemColor: Color(0xFF94A3B8),
          selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          unselectedLabelStyle: TextStyle(fontSize: 11),
          elevation: 8,
        ),
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final api = context.read<ApiService>();
    final state = context.read<AppState>();
    
    try {
      final profile = await api.getProfile();
      state.setUser(profile);
    } catch (_) {
      if (!mounted) return;
      state.setUser(null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;
    if (user == null) {
      return const LoginScreen();
    }
    
    if (user.kycStatus != KYCStatus.APPROUVE) {
      return const KycScreen();
    }
    
    return const HomeScreen();
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const WalletScreen(),
    const TradingScreen(),
    const DcaScreen(),
    const HistoryScreen(),
    const AccountScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('BAOU', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 2, color: Color(0xFFFF8200))),
        centerTitle: true,
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        type: BottomNavigationBarType.fixed, // Support 5 items
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Portefeuille'),
          BottomNavigationBarItem(icon: Icon(Icons.trending_up_outlined), label: 'Négocier'),
          BottomNavigationBarItem(icon: Icon(Icons.autorenew_outlined), label: 'Autopilot DCA'),
          BottomNavigationBarItem(icon: Icon(Icons.history_outlined), label: 'Historique'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), label: 'Mon Compte'),
        ],
      ),
    );
  }
}
