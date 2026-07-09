import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'models/user.dart';
import 'screens/login_screen.dart';
import 'screens/kyc_screen.dart';
import 'screens/wallet_screen.dart';
import 'screens/trading_screen.dart';
import 'screens/history_screen.dart';
import 'screens/dca_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        Provider<ApiService>(create: (_) => ApiService()),
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
      title: 'SGI BRVM Bourse',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: Colors.indigo,
        scaffoldBackgroundColor: const Color(0xFF090A10),
        colorScheme: ColorScheme.dark(
          primary: Colors.indigo,
          secondary: Colors.indigoAccent,
          surface: const Color(0xFF11121B),
          background: const Color(0xFF090A10),
        ),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            borderSide: BorderSide(color: Colors.white12),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            borderSide: BorderSide(color: Colors.indigoAccent),
          ),
          filled: true,
          fillColor: Color(0xFF11121B),
          labelStyle: TextStyle(fontSize: 12),
        ),
        cardTheme: const CardTheme(
          color: Color(0xFF11121B),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFF0C0D14),
          selectedItemColor: Colors.indigoAccent,
          unselectedItemColor: Colors.grey,
          selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          unselectedLabelStyle: TextStyle(fontSize: 11),
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
  ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('SGI Mobile Client', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0C0D14),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, size: 18),
            onPressed: () async {
              await context.read<ApiService>().logout();
              if (mounted) {
                context.read<AppState>().setUser(null);
              }
            },
          ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        type: BottomNavigationBarType.fixed, // Support 4 items
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Portefeuille'),
          BottomNavigationBarItem(icon: Icon(Icons.trending_up_outlined), label: 'Négocier'),
          BottomNavigationBarItem(icon: Icon(Icons.autorenew_outlined), label: 'Autopilot DCA'),
          BottomNavigationBarItem(icon: Icon(Icons.history_outlined), label: 'Historique'),
        ],
      ),
    );
  }
}
