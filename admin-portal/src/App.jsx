import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { 
  ShieldCheck, 
  Smartphone, 
  UserCheck, 
  TrendingUp, 
  FileText, 
  RefreshCw, 
  AlertTriangle, 
  Wallet, 
  Lock, 
  Unlock, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Coins, 
  Database,
  ArrowRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COMMISSION_RATE = 0.015;

export default function App() {
  // SGI Admin Auth State
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || null);
  const [adminUser, setAdminUser] = useState(null);
  const [adminEmail, setAdminEmail] = useState('admin@sgi.ci');
  const [adminPassword, setAdminPassword] = useState('password123');
  const [adminTab, setAdminTab] = useState('trading'); // 'kyc' | 'trading' | 'jeko' | 'audit'
  
  // PawaPay Debugging State
  const [pawaPaySubTab, setPawaPaySubTab] = useState('history'); // 'history' | 'debug'
  const [pawaPayDebugInfo, setPawaPayDebugInfo] = useState(null);
  const [pawaPayLogs, setPawaPayLogs] = useState([]);
  const [pawaPayTestResult, setPawaPayTestResult] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  // SGI Data State
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminError, setAdminError] = useState('');
  
  // Mobile client simulator state
  const [mobileToken, setMobileToken] = useState(localStorage.getItem('mobileToken') || null);
  const [mobileUser, setMobileUser] = useState(null);
  const [mobileEmail, setMobileEmail] = useState('client@sgi.ci');
  const [mobilePassword, setMobilePassword] = useState('password123');
  const [mobileScreen, setMobileScreen] = useState('wallet'); // 'wallet' | 'trade' | 'history'
  const [mobileTab, setMobileTab] = useState('login'); // 'login' | 'register' | 'app'
  
  // Mobile registration state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConsent, setRegConsent] = useState(true);

  // Mobile client data state
  const [cashWallet, setCashWallet] = useState(null);
  const [securitiesWallet, setSecuritiesWallet] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [mobileError, setMobileError] = useState('');

  // Jeko Deposit Form State
  const [depositAmount, setDepositAmount] = useState('100000');
  const [pendingJekoTxId, setPendingJekoTxId] = useState(null);
  const [showJekoModal, setShowJekoModal] = useState(false);

  // Order Form State
  const [orderType, setOrderType] = useState('ACHAT'); // 'ACHAT' | 'VENTE'
  const [orderStock, setOrderStock] = useState('SNTS');
  const [orderQty, setOrderQty] = useState('10');
  const [orderPrice, setOrderPrice] = useState('16500');

  // Real-time market state
  const [stocks, setStocks] = useState([]);
  const [selectedTraderOrder, setSelectedTraderOrder] = useState(null);
  const [traderRealPrice, setTraderRealPrice] = useState('');

  // Fetch SGI Admin Data
  const fetchAdminData = async () => {
    if (!adminToken) return;
    try {
      api.setToken(adminToken);
      const clientsList = await api.getClients();
      setClients(clientsList);
      
      const ordersList = await api.getAllOrders();
      setOrders(ordersList);

      const txsList = await api.getAllTransactions();
      setTransactions(txsList);

      const logsList = await api.getAuditLogs();
      setAuditLogs(logsList);

      // Charger les informations de débogage PawaPay
      try {
        const debugInfo = await api.getPawaPayDebugInfo();
        setPawaPayDebugInfo(debugInfo);
      } catch (err) {
        console.error("Erreur de récupération des infos de débogage PawaPay:", err);
      }

      // Charger les logs d'audit spécifiques à PawaPay
      try {
        const debugLogs = await api.getPawaPayDebugLogs();
        setPawaPayLogs(debugLogs);
      } catch (err) {
        console.error("Erreur de récupération des logs PawaPay:", err);
      }
    } catch (e) {
      console.error("Admin data fetch error:", e);
      setAdminError(e.message);
    }
  };

  const handleTestPawaPayConnection = async () => {
    setTestingConnection(true);
    setPawaPayTestResult(null);
    try {
      api.setToken(adminToken);
      const res = await api.testPawaPayConnection();
      setPawaPayTestResult(res);
      // Rafraîchir les logs après un test de connexion car un log d'audit a pu être écrit
      const debugLogs = await api.getPawaPayDebugLogs();
      setPawaPayLogs(debugLogs);
    } catch (e) {
      setPawaPayTestResult({ success: false, error: e.message });
    } finally {
      setTestingConnection(false);
    }
  };

  // Fetch Mobile Client Data
  const fetchMobileData = async () => {
    if (!mobileToken) return;
    try {
      api.setToken(mobileToken);
      const profile = await api.getMe();
      setMobileUser(profile);

      if (profile.kycStatus === 'APPROUVE') {
        const cash = await api.getMyCash();
        setCashWallet(cash);

        const sec = await api.getMySecurities();
        setSecuritiesWallet(sec);
      }

      const ord = await api.getMyOrders();
      setMyOrders(ord);

      const txs = await api.getMyTransactions();
      setMyTransactions(txs);
    } catch (e) {
      console.error("Mobile data fetch error:", e);
      setMobileError(e.message);
    }
  };

  // Fetch stock quotes
  const fetchStocks = async () => {
    // Only fetch if authenticated in either panel to prevent unauthorized logs
    if (adminToken || mobileToken) {
      try {
        const activeToken = adminToken || mobileToken;
        api.setToken(activeToken);
        const data = await api.getStocks();
        setStocks(data);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Initialize and poll
  useEffect(() => {
    if (adminToken) {
      api.setToken(adminToken);
      api.getMe().then(setAdminUser).catch(() => handleAdminLogout());
      fetchAdminData();
    }
    if (mobileToken) {
      api.setToken(mobileToken);
      api.getMe().then((p) => {
        setMobileUser(p);
        setMobileTab('app');
      }).catch(() => handleMobileLogout());
      fetchMobileData();
    }
  }, [adminToken, mobileToken]);

  // Periodic polling for sync
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAdminData();
      fetchMobileData();
      fetchStocks();
    }, 3000);
    return () => clearInterval(interval);
  }, [adminToken, mobileToken]);

  // Authentications
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    try {
      const data = await api.login(adminEmail, adminPassword);
      setAdminToken(data.accessToken);
      setAdminUser(data.user);
      localStorage.setItem('adminToken', data.accessToken);
      
      // Auto-set initial tab based on role
      if (data.user.role === 'ADMIN_KYC') {
        setAdminTab('kyc');
      } else if (data.user.role === 'TRADER') {
        setAdminTab('trading');
      }
    } catch (err) {
      setAdminError(err.message);
    }
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem('adminToken');
  };

  const handleMobileLogin = async (e) => {
    e.preventDefault();
    setMobileError('');
    try {
      const data = await api.login(mobileEmail, mobilePassword);
      setMobileToken(data.accessToken);
      setMobileUser(data.user);
      setMobileTab('app');
      localStorage.setItem('mobileToken', data.accessToken);
    } catch (err) {
      setMobileError(err.message);
    }
  };

  const handleMobileRegister = async (e) => {
    e.preventDefault();
    setMobileError('');
    try {
      await api.register({
        email: regEmail,
        password: regPassword,
        firstName: regFirstName,
        lastName: regLastName,
        phone: regPhone,
        consentSMS: regConsent,
        kycDocuments: {
          identityCardUrl: 'http://localhost:3000/docs/cni.pdf',
          ribUrl: 'http://localhost:3000/docs/rib.pdf',
          proofOfAddressUrl: 'http://localhost:3000/docs/domicile.pdf',
        }
      });
      alert('Inscription réussie ! Votre compte est en cours de validation par la SGI.');
      setMobileEmail(regEmail);
      setMobilePassword(regPassword);
      setMobileTab('login');
      // Reset form
      setRegFirstName('');
      setRegLastName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
    } catch (err) {
      setMobileError(err.message);
    }
  };

  const handleMobileLogout = () => {
    setMobileToken(null);
    setMobileUser(null);
    setMobileTab('login');
    setCashWallet(null);
    setSecuritiesWallet([]);
    localStorage.removeItem('mobileToken');
  };

  // Actions KYC Admin
  const handleValidateKyc = async (userId, status) => {
    try {
      api.setToken(adminToken);
      await api.validateKyc(userId, status);
      fetchAdminData();
      if (mobileUser && mobileUser.id === userId) {
        fetchMobileData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Jeko Deposit Initiation
  const handleJekoDepositInitiate = async (e) => {
    e.preventDefault();
    setMobileError('');
    try {
      api.setToken(mobileToken);
      const res = await api.initiateDeposit(depositAmount);
      setPendingJekoTxId(res.transactionId);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        setShowJekoModal(true);
      }
    } catch (err) {
      setMobileError(err.message);
    }
  };

  // PawaPay/Jeko Webhook Simulation
  const handleSimulatePayment = async (status, txId = null, amount = null) => {
    const finalTxId = txId || pendingJekoTxId;
    const finalAmount = amount || depositAmount;
    if (!finalTxId) return;

    try {
      // We simulate payment notification coming to the webhook
      await api.simulateWebhook(finalTxId, status === 'SUCCESS' ? 'COMPLETED' : 'FAILED', finalAmount);
      setShowJekoModal(false);
      if (!txId) {
        setPendingJekoTxId(null);
      }
      fetchMobileData();
      fetchAdminData();
      alert(status === 'SUCCESS' ? 'Dépôt réussi via Mobile Money.' : 'Dépôt échoué ou annulé.');
    } catch (err) {
      alert(err.message);
    }
  };

  // Place BRVM Order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setMobileError('');
    try {
      api.setToken(mobileToken);
      await api.createOrder({
        type: orderType,
        codeValeur: orderStock,
        quantityRequested: Number(orderQty),
        priceRequested: Number(orderPrice),
      });
      fetchMobileData();
      fetchAdminData();
      alert('Ordre soumis à la SGI avec succès.');
    } catch (err) {
      setMobileError(err.message);
    }
  };

  // Trader Order Action
  const handleTraderOrderAction = async (orderId, status, priceReal = null) => {
    try {
      api.setToken(adminToken);
      await api.updateOrderStatus(orderId, status, priceReal);
      setSelectedTraderOrder(null);
      setTraderRealPrice('');
      fetchAdminData();
      fetchMobileData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col font-sans">
      {/* Top Banner */}
      <header className="border-b border-gray-800 bg-[#0d0e15] px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2">
            <Coins className="text-indigo-400" /> Plateforme Digitale SGI BRVM
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-green-400 font-mono">Backend NestJS: connecté</span>
          </div>
          <button 
            onClick={() => { fetchAdminData(); fetchMobileData(); fetchStocks(); }}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            title="Rafraîchir les données"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Main Container: Centered Single Column (Wider for Trader) */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        
        {/* Left Side: SGI Admin Portal */}
        <section className="glass rounded-2xl p-6 flex flex-col border border-gray-800/80">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-indigo-400" size={24} />
              <h2 className="text-lg font-bold text-gray-200">Portail SGI (Web Administrateur)</h2>
            </div>
            {adminUser && (
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-3 py-1 rounded-full border border-indigo-500/30 uppercase">
                {adminUser.role === 'ADMIN_KYC' ? 'Agent KYC' : 'Trader BRVM'}
              </span>
            )}
          </div>

          {/* SGI Auth Block */}
          {!adminToken ? (
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-12">
              <div className="text-center mb-8">
                <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                  <Database size={24} />
                </div>
                <h3 className="text-lg font-semibold">Connexion Administrative</h3>
                <p className="text-sm text-gray-400 mt-1">Accès réservé aux agents de la SGI pour la conformité et l'exécution.</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Email professionnel</label>
                  <input 
                    type="email"
                    value={adminEmail} 
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                    placeholder="admin@sgi.ci"
                    required
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">Compte démo par défaut : admin@sgi.ci (password123)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Mot de passe</label>
                  <input 
                    type="password" 
                    value={adminPassword} 
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" 
                    placeholder="••••••••"
                    required
                  />
                </div>

                {adminError && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{adminError}</div>}

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors text-sm">
                  Se connecter au portail SGI
                </button>
              </form>
            </div>
          ) : (
            // SGI Logged In Interface
            <div className="flex-1 flex flex-col">
              {/* Profile Card & Log out */}
              <div className="bg-[#11121b] p-4 rounded-xl border border-gray-800 flex justify-between items-center mb-6">
                <div>
                  <p className="text-xs text-gray-400">Agent connecté :</p>
                  <p className="text-sm font-semibold text-gray-200">{adminUser?.firstName} {adminUser?.lastName}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{adminUser?.email}</p>
                </div>
                <button onClick={handleAdminLogout} className="text-xs text-red-400 hover:text-red-300 font-medium bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                  Déconnexion
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-2 border-b border-gray-800 pb-2 mb-6 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setAdminTab('kyc')} 
                  className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${adminTab === 'kyc' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
                >
                  Validation KYC ({clients.filter(c => c.kycStatus === 'EN_ATTENTE_VALIDATION').length})
                </button>
                <button 
                  onClick={() => setAdminTab('trading')} 
                  className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${adminTab === 'trading' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
                >
                  Ordres BRVM ({orders.filter(o => o.status === 'EN_ATTENTE' || o.status === 'EN_TRAITEMENT').length})
                </button>
                <button 
                  onClick={() => setAdminTab('jeko')} 
                  className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${adminTab === 'jeko' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
                >
                  Flux PawaPay Money
                </button>
                <button 
                  onClick={() => setAdminTab('audit')} 
                  className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${adminTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
                >
                  Logs d'Audit
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 flex flex-col min-h-0">
                
                {/* KYC TAB */}
                {adminTab === 'kyc' && (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    <h3 className="text-sm font-semibold text-gray-300">Dossiers d'inscription KYC clients</h3>
                    {clients.length === 0 ? (
                      <p className="text-xs text-gray-500 py-8 text-center bg-[#11121b]/40 rounded-xl border border-gray-900">Aucun dossier client trouvé.</p>
                    ) : (
                      clients.map((c) => (
                        <div key={c.id} className="bg-[#11121b] border border-gray-800 p-4 rounded-xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-bold text-gray-200">{c.firstName} {c.lastName}</p>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{c.email} | {c.phone}</p>
                              <p className="text-xs text-gray-500 mt-1">Inscrit le {new Date(c.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              c.kycStatus === 'APPROUVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                              c.kycStatus === 'REJETE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                              'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            }`}>
                              {c.kycStatus === 'APPROUVE' ? 'KYC Approuvé' : c.kycStatus === 'REJETE' ? 'KYC Rejeté' : 'Attente validation'}
                            </span>
                          </div>

                          {/* Affichage du Profil d'Investisseur pour validation de conformité */}
                          <div className="bg-[#181926] p-3 rounded-lg text-xs space-y-2 border border-gray-850">
                            <p className="text-gray-300 font-bold">🎯 Profil Investisseur Déclaré (AMF-UMOA) :</p>
                            <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400">
                              <div>
                                <span className="text-gray-500 block">Aversion Risque :</span>
                                <span className="font-semibold text-indigo-400">{c.investorProfile || "MODERE"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Horizon :</span>
                                <span className="font-semibold text-indigo-400">{c.investorHorizon || "MOYEN_TERME"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Objectif :</span>
                                <span className="font-semibold text-indigo-400">{c.investorObjective || "EPARGNE"}</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-green-400 italic">💬 Canal de notifications validé : WhatsApp</p>
                          </div>

                          {c.kycDocuments && (
                            <div className="bg-gray-950 p-3 rounded-lg text-xs space-y-2">
                              <p className="text-gray-400 font-semibold mb-1">🔍 Pièces justificatives KYC téléversées :</p>
                              
                              <div className="flex flex-col gap-2">
                                <button 
                                  onClick={() => alert(`Visualisation réglementaire de la CNI de ${c.firstName} ${c.lastName} :\nNom : ${c.lastName.toUpperCase()}\nPrénom : ${c.firstName}\nNé le : 14/10/1988 à Abidjan\nN° CNI : C0108920194 (Valide jusqu'en 2032)\n\nConformité : Dossier Valide.`)}
                                  className="text-left w-full text-[11px] text-indigo-300 hover:text-indigo-200 bg-gray-900 px-3 py-1.5 rounded border border-gray-850 hover:border-indigo-500/30 flex justify-between items-center transition-colors"
                                >
                                  <span>📄 CNI Recto-Verso (Simulé)</span>
                                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Ouvrir</span>
                                </button>
                                
                                <button 
                                  onClick={() => alert(`Photo d'identité de ${c.firstName} ${c.lastName} :\nFormat passeport (2x2)\nNetteté conforme\nFond neutre`)}
                                  className="text-left w-full text-[11px] text-indigo-300 hover:text-indigo-200 bg-gray-900 px-3 py-1.5 rounded border border-gray-850 hover:border-indigo-500/30 flex justify-between items-center transition-colors"
                                >
                                  <span>👤 Photo d'identité (Simulé)</span>
                                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Ouvrir</span>
                                </button>

                                <button 
                                  onClick={() => alert(`Justificatif de domicile de ${c.firstName} ${c.lastName} :\nFacture CIE (Électricité) Avril 2026\nAdresse : Cocody Cité des Arts, Abidjan\nFacture établie au nom de ${c.lastName.toUpperCase()} ${c.firstName}`)}
                                  className="text-left w-full text-[11px] text-indigo-300 hover:text-indigo-200 bg-gray-900 px-3 py-1.5 rounded border border-gray-850 hover:border-indigo-500/30 flex justify-between items-center transition-colors"
                                >
                                  <span>🏠 CIE Justificatif Domicile (Simulé)</span>
                                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Ouvrir</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {c.kycStatus === 'EN_ATTENTE_VALIDATION' && (
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800/50">
                              <button 
                                onClick={() => handleValidateKyc(c.id, 'REJETE')}
                                className="text-xs font-semibold px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Rejeter le dossier
                              </button>
                              <button 
                                onClick={() => handleValidateKyc(c.id, 'APPROUVE')}
                                disabled={adminUser?.role !== 'ADMIN_KYC'}
                                className="text-xs font-semibold px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Approuver le compte
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TRADING ROOM TAB */}
                {adminTab === 'trading' && (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-gray-300">Ordres de bourse transmis</h3>
                      <p className="text-[10px] text-gray-400 italic">Rôle requis : TRADER pour exécution</p>
                    </div>

                    {orders.length === 0 ? (
                      <p className="text-xs text-gray-500 py-8 text-center bg-[#11121b]/40 rounded-xl border border-gray-900">Aucun ordre de bourse soumis.</p>
                    ) : (
                      orders.map((o) => (
                        <div key={o.id} className={`bg-[#11121b] border p-4 rounded-xl space-y-3 ${
                          selectedTraderOrder === o.id ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-gray-800'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  o.type === 'ACHAT' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                }`}>
                                  {o.type}
                                </span>
                                <span className="font-bold text-gray-200 text-sm font-mono">{o.codeValeur}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Client : {o.user?.firstName} {o.user?.lastName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Téléphone : {o.user?.phone}</p>
                              <p className="text-xs text-gray-500 mt-1">Transmis le {new Date(o.createdAt).toLocaleString()}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              o.status === 'EXECUTE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                              o.status === 'ANNULE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                              o.status === 'EN_TRAITEMENT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 font-pulse' :
                              'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            }`}>
                              {o.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 bg-gray-950 p-2.5 rounded-lg text-xs font-mono">
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase">Quantité demandée</p>
                              <p className="text-gray-300 font-bold text-sm mt-0.5">{o.quantityRequested.toLocaleString()} titres</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase">Cours max demandé</p>
                              <p className="text-gray-300 font-bold text-sm mt-0.5">{o.priceRequested.toLocaleString()} XOF</p>
                            </div>
                            {o.status === 'EXECUTE' && (
                              <div className="col-span-2 border-t border-gray-800 pt-2 mt-2">
                                <p className="text-green-500 text-[10px] uppercase font-semibold">Exécuté au cours réel de</p>
                                <p className="text-green-400 font-bold text-sm mt-0.5">{o.priceReal?.toLocaleString()} XOF</p>
                              </div>
                            )}
                          </div>

                          {/* Escrow note */}
                          {o.status === 'EN_ATTENTE' && o.type === 'ACHAT' && (
                            <div className="text-[10px] bg-yellow-500/5 text-yellow-400 border border-yellow-500/10 rounded px-2 py-1 flex items-center gap-1.5">
                              <Lock size={12} />
                              <span>Escrow SGI : {Math.round(o.quantityRequested * o.priceRequested * 1.015).toLocaleString()} XOF gelés sur le solde cash</span>
                            </div>
                          )}

                          {/* Order actions for TRADER */}
                          {adminUser?.role === 'TRADER' && o.status === 'EN_ATTENTE' && (
                            <div className="flex gap-2 pt-2 border-t border-gray-800/50">
                              <button 
                                onClick={() => handleTraderOrderAction(o.id, 'ANNULE')}
                                className="flex-1 text-xs font-semibold py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors"
                              >
                                Annuler l'ordre
                              </button>
                              <button 
                                onClick={() => handleTraderOrderAction(o.id, 'EXECUTE')}
                                className="flex-[2] text-xs font-semibold py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle size={14} /> Exécuter & Débiter le client
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* JEKO FLUX TAB */}
                {adminTab === 'jeko' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Sub-tabs Navigation */}
                    <div className="flex gap-4 border-b border-gray-800 pb-2 mb-4">
                      <button
                        onClick={() => setPawaPaySubTab('history')}
                        className={`text-xs font-bold pb-1.5 transition-colors border-b-2 ${
                          pawaPaySubTab === 'history' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        📋 Historique des transactions
                      </button>
                      <button
                        onClick={() => setPawaPaySubTab('debug')}
                        className={`text-xs font-bold pb-1.5 transition-colors border-b-2 ${
                          pawaPaySubTab === 'debug' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        🛠️ Console de débogage & Webhooks
                      </button>
                    </div>

                    {/* HISTORY SUB-TAB */}
                    {pawaPaySubTab === 'history' && (
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        <h3 className="text-sm font-semibold text-gray-300">Journal des webhooks et paiements PawaPay</h3>
                        {transactions.length === 0 ? (
                          <p className="text-xs text-gray-500 py-8 text-center bg-[#11121b]/40 rounded-xl border border-gray-900">Aucune transaction Mobile Money enregistrée.</p>
                        ) : (
                          transactions.map((tx) => (
                            <div key={tx.idInternal} className="bg-[#11121b] border border-gray-800 p-4 rounded-xl space-y-3 font-mono text-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase">ID Transaction Interne</p>
                                  <p className="text-gray-300 font-semibold">{tx.idInternal}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  tx.status === 'SUCCES' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                  tx.status === 'ECHEC' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                }`}>
                                  {tx.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-gray-800/80 pt-2.5">
                                <div>
                                  <span className="text-gray-500">ID PawaPay :</span>
                                  <p className="text-gray-300 truncate">{tx.idPawaPay || 'N/A (En attente)'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Montant :</span>
                                  <p className="text-gray-300 font-bold">{tx.amount.toLocaleString()} XOF</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Flux :</span>
                                  <p className="text-indigo-400 font-bold">{tx.type}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Client ID :</span>
                                  <p className="text-gray-300 truncate">{tx.user?.firstName} {tx.user?.lastName}</p>
                                </div>
                              </div>

                              {tx.webhookSignature && (
                                <div className="bg-gray-950 p-2 rounded border border-gray-850">
                                  <span className="text-[9px] text-green-500 font-bold block mb-0.5">Webhook Validé Cryptographiquement</span>
                                  <p className="text-[9px] text-gray-500 break-all leading-tight">{tx.webhookSignature}</p>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* DEBUG SUB-TAB */}
                    {pawaPaySubTab === 'debug' && (
                      <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
                        
                        {/* 1. ÉTAT DE LA CONFIGURATION */}
                        <div className="bg-[#11121b] border border-gray-800 p-4 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">État de la Configuration Backend</h4>
                          
                          {pawaPayDebugInfo ? (
                            <div className="space-y-2 text-xs font-mono">
                              <div className="flex justify-between border-b border-gray-900 pb-1.5">
                                <span className="text-gray-500">Environnement :</span>
                                <span className="text-gray-300 font-bold uppercase">{pawaPayDebugInfo.environment}</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-900 pb-1.5">
                                <span className="text-gray-500">PawaPay API URL :</span>
                                <span className="text-gray-300 truncate max-w-[280px]">{pawaPayDebugInfo.apiUrl}</span>
                              </div>
                              <div className="flex justify-between border-b border-gray-900 pb-1.5">
                                <span className="text-gray-500">Clé API (Token) :</span>
                                <span className={`font-semibold ${pawaPayDebugInfo.apiKeyConfigured ? 'text-green-400' : 'text-red-400'}`}>
                                  {pawaPayDebugInfo.apiKeyConfigured ? `Active (${pawaPayDebugInfo.apiKeyMasked})` : '⚠️ Non configurée'}
                                </span>
                              </div>
                              <div className="flex justify-between pb-1">
                                <span className="text-gray-500">Secret Webhook :</span>
                                <span className={`font-semibold ${pawaPayDebugInfo.webhookSecretConfigured ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {pawaPayDebugInfo.webhookSecretConfigured ? 'Configuré' : 'Par défaut (Local / Dev)'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">Chargement des données de configuration...</p>
                          )}
                        </div>

                        {/* 2. TEST DE CONNEXION */}
                        <div className="bg-[#11121b] border border-gray-800 p-4 rounded-xl space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Test de Connexion API</h4>
                            <button
                              onClick={handleTestPawaPayConnection}
                              disabled={testingConnection}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white font-semibold text-[11px] rounded-lg transition-colors"
                            >
                              {testingConnection ? 'Connexion en cours...' : 'Tester la connexion'}
                            </button>
                          </div>

                          {pawaPayTestResult && (
                            <div className={`p-3 rounded-lg border text-xs ${
                              pawaPayTestResult.success 
                                ? 'bg-green-500/5 border-green-500/20 text-green-400' 
                                : 'bg-red-500/5 border-red-500/20 text-red-400'
                            }`}>
                              <p className="font-bold flex items-center gap-1.5 mb-2">
                                <span className={`w-2 h-2 rounded-full ${pawaPayTestResult.success ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                {pawaPayTestResult.message || "Échec du test de connexion"}
                              </p>
                              
                              {pawaPayTestResult.error && (
                                <p className="font-mono text-[10px] bg-black/40 p-2 rounded border border-red-500/10 text-red-300 whitespace-pre-wrap">
                                  {pawaPayTestResult.error}
                                </p>
                              )}

                              {pawaPayTestResult.success && pawaPayTestResult.data && (
                                <div className="space-y-1.5 mt-2">
                                  <p className="text-[10px] text-gray-400 uppercase font-bold">Configurations PawaPay Actives :</p>
                                  <pre className="p-2 bg-black/40 rounded border border-green-500/10 text-[10px] text-gray-300 font-mono max-h-[160px] overflow-y-auto no-scrollbar">
                                    {JSON.stringify(pawaPayTestResult.data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 3. SIMULATEUR DE WEBHOOKS DIRECT */}
                        <div className="bg-[#11121b] border border-gray-800 p-4 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Simulateur Manuel de Webhooks (Dev)</h4>
                          <p className="text-[11px] text-gray-500">Déclenchez directement un webhook de retour de paiement (Succès ou Échec) pour les transactions de dépôt en attente.</p>
                          
                          {transactions.filter(t => t.status === 'EN_COURS' && t.type === 'DEPOT').length === 0 ? (
                            <p className="text-xs text-gray-500 py-3 text-center bg-gray-950/40 rounded border border-gray-900">Aucun dépôt en attente de validation.</p>
                          ) : (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                              {transactions.filter(t => t.status === 'EN_COURS' && t.type === 'DEPOT').map((tx) => (
                                <div key={tx.idInternal} className="bg-gray-950/60 p-2.5 rounded border border-gray-900 flex justify-between items-center gap-2">
                                  <div className="font-mono text-[10px]">
                                    <p className="text-gray-300 font-semibold">{tx.amount.toLocaleString()} XOF</p>
                                    <p className="text-gray-500 truncate max-w-[150px]">{tx.idInternal}</p>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => handleSimulatePayment('FAILED', tx.idInternal, tx.amount)}
                                      className="px-2 py-1 bg-red-950 text-red-400 hover:bg-red-900 border border-red-900/30 rounded text-[9px] font-bold transition-colors"
                                    >
                                      Échec
                                    </button>
                                    <button
                                      onClick={() => handleSimulatePayment('SUCCESS', tx.idInternal, tx.amount)}
                                      className="px-2 py-1 bg-green-950 text-green-400 hover:bg-green-900 border border-green-900/30 rounded text-[9px] font-bold transition-colors"
                                    >
                                      Succès
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 4. LOGS DE DÉBOGAGE PAWAPAY (Logs d'Audit de Paiement) */}
                        <div className="bg-[#11121b] border border-gray-800 p-4 rounded-xl space-y-3">
                          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Historique des Logs de Débogage PawaPay</h4>
                          
                          {pawaPayLogs.length === 0 ? (
                            <p className="text-xs text-gray-500 py-4 text-center bg-gray-950/40 rounded border border-gray-900">Aucun log de paiement disponible.</p>
                          ) : (
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 no-scrollbar font-mono text-[10px]">
                              {pawaPayLogs.map((log) => (
                                <div key={log.id} className="bg-gray-950 p-2.5 rounded border border-gray-900 space-y-1">
                                  <div className="flex justify-between text-[9px] text-gray-500">
                                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                                    <span>IP: {log.ipAddress}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                                      log.action.includes('SUCCESS') ? 'bg-green-500/10 text-green-400' :
                                      log.action.includes('FAILED') ? 'bg-red-500/10 text-red-400' :
                                      'bg-indigo-500/10 text-indigo-400'
                                    }`}>
                                      {log.action}
                                    </span>
                                    <span className="text-gray-400">{log.user?.email || 'Système'}</span>
                                  </div>
                                  <pre className="p-1.5 bg-black/40 rounded border border-gray-850 text-[9px] text-gray-500 overflow-x-auto max-h-[80px] no-scrollbar">
                                    {JSON.stringify(JSON.parse(log.details), null, 2)}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* AUDIT TAB */}
                {adminTab === 'audit' && (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                    <h3 className="text-sm font-semibold text-gray-300 font-sans mb-3">Registres d'Audit de Conformité (Inaltérables)</h3>
                    {auditLogs.length === 0 ? (
                      <p className="text-xs text-gray-500 py-8 text-center bg-[#11121b]/40 rounded-xl border border-gray-900 font-sans">Aucun log d'audit généré.</p>
                    ) : (
                      <div className="overflow-x-auto border border-gray-800 rounded-xl bg-gray-950 p-4">
                        <table className="w-full text-left text-xs border-collapse font-mono" style={{ minWidth: '100%' }}>
                          <thead>
                            <tr className="border-b border-gray-900 text-gray-500 text-[10px] uppercase tracking-wider">
                              <th className="py-2.5 px-3 pb-3">Date / Heure</th>
                              <th className="py-2.5 px-3 pb-3">Action</th>
                              <th className="py-2.5 px-3 pb-3">Auteur</th>
                              <th className="py-2.5 px-3 pb-3">Adresse IP</th>
                              <th className="py-2.5 px-3 pb-3">Détails (JSON)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-900">
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-gray-900/20 transition-colors">
                                <td className="py-3 px-3 text-gray-500 whitespace-nowrap text-[11px]">{new Date(log.createdAt).toLocaleString()}</td>
                                <td className="py-3 px-3">
                                  <span className="text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] inline-block">{log.action}</span>
                                </td>
                                <td className="py-3 px-3 text-gray-300 text-[11px]">{log.user?.email} <span className="text-gray-500">({log.user?.role})</span></td>
                                <td className="py-3 px-3 text-gray-400 text-[11px]">{log.ipAddress}</td>
                                <td className="py-3 px-3">
                                  <pre className="p-2 bg-[#11121b]/60 rounded text-[10px] text-gray-400 overflow-x-auto max-w-[320px] max-h-[120px] leading-relaxed no-scrollbar border border-gray-900">
                                    {JSON.stringify(JSON.parse(log.details), null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Smartphone Mockup / Client app (Hidden in Trader Portal) */}
        <section className="hidden">
          {/* Smartphone Shell */}
          <div className="w-[380px] h-[780px] bg-[#0c0d14] rounded-[48px] border-[10px] border-[#222431] shadow-2xl relative flex flex-col overflow-hidden shadow-purple-500/5">
            {/* Speaker & Camera notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-[#222431] rounded-b-2xl z-50 flex items-center justify-center">
              <span className="w-12 h-1 bg-[#15161f] rounded-full"></span>
            </div>

            {/* Mobile Screen Area */}
            <div className="flex-1 bg-[#090a10] pt-8 px-4 pb-4 flex flex-col min-h-0 text-gray-200">
              
              {/* MOBILE LOGIN SCREEN */}
              {mobileTab === 'login' && (
                <div className="flex-1 flex flex-col justify-center py-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-indigo-400 flex items-center justify-center gap-1.5">
                      <Smartphone size={20} /> SGI Bourse Client
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Gérez votre épargne et vos ordres BRVM</p>
                  </div>

                  <form onSubmit={handleMobileLogin} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Email Client</label>
                      <input 
                        type="email" 
                        value={mobileEmail} 
                        onChange={(e) => setMobileEmail(e.target.value)}
                        className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono" 
                        placeholder="client@email.ci"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Mot de passe</label>
                      <input 
                        type="password" 
                        value={mobilePassword} 
                        onChange={(e) => setMobilePassword(e.target.value)}
                        className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono" 
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    {mobileError && <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">{mobileError}</div>}

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 rounded-lg transition-colors text-xs">
                      Se connecter
                    </button>
                  </form>

                  <div className="mt-6 text-center space-y-3">
                    <p className="text-xs text-gray-500">Pas encore de compte ?</p>
                    <button 
                      onClick={() => setMobileTab('register')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Créer un compte & Ouvrir KYC
                    </button>

                    <div className="border-t border-gray-800 pt-4 space-y-2">
                      <p className="text-[10px] text-gray-500 uppercase font-semibold">Raccourcis de Test</p>
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => { setMobileEmail('client@sgi.ci'); setMobilePassword('password123'); }}
                          className="text-[9px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300"
                        >
                          Client Approuvé
                        </button>
                        <button 
                          onClick={() => { setMobileEmail('pending_client@sgi.ci'); setMobilePassword('password123'); }}
                          className="text-[9px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300"
                        >
                          Client KYC En Attente
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MOBILE REGISTER SCREEN */}
              {mobileTab === 'register' && (
                <div className="flex-1 flex flex-col justify-center py-4 overflow-y-auto no-scrollbar">
                  <h3 className="text-sm font-bold text-gray-200 mb-3 text-center">Formulaire KYC SGI</h3>
                  <form onSubmit={handleMobileRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Prénom</label>
                        <input type="text" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200" required />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Nom</label>
                        <input type="text" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200" required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Email</label>
                      <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 font-mono" required />
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Téléphone</label>
                      <input type="text" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 font-mono" placeholder="+225070707..." required />
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Mot de passe</label>
                      <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200" required />
                    </div>

                    <div className="bg-gray-950 p-2 rounded text-[10px] space-y-1">
                      <p className="text-indigo-400 font-semibold">Justificatifs obligatoires à charger :</p>
                      <p className="text-gray-400">✓ Carte Nationale d'Identité (CNI / Passeport)</p>
                      <p className="text-gray-400">✓ Relevé d'Identité Bancaire (RIB)</p>
                      <p className="text-gray-400">✓ Justificatif de domicile (Facture CIE/MTN)</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={regConsent} onChange={(e) => setRegConsent(e.target.checked)} id="regConsent" className="rounded" />
                      <label htmlFor="regConsent" className="text-[10px] text-gray-400">J'accepte de recevoir des notifications d'exécution par SMS</label>
                    </div>

                    {mobileError && <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded">{mobileError}</div>}

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 rounded text-xs">
                      Soumettre mon dossier KYC
                    </button>
                  </form>
                  <button 
                    onClick={() => setMobileTab('login')}
                    className="w-full text-center text-xs text-gray-400 mt-4 hover:underline"
                  >
                    Retour à la connexion
                  </button>
                </div>
              )}

              {/* MOBILE APP LOGGED IN IN-APP SCREEN */}
              {mobileTab === 'app' && mobileUser && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* In-app header */}
                  <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/20">
                        {mobileUser.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-200">{mobileUser.firstName} {mobileUser.lastName}</p>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border block w-max ${
                          mobileUser.kycStatus === 'APPROUVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          mobileUser.kycStatus === 'REJETE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
                        }`}>
                          {mobileUser.kycStatus === 'APPROUVE' ? 'KYC Approuvé' : mobileUser.kycStatus === 'REJETE' ? 'KYC Rejeté' : 'Dossier en attente SGI'}
                        </span>
                      </div>
                    </div>

                    <button onClick={handleMobileLogout} className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-red-400 rounded-lg">
                      <XCircle size={16} />
                    </button>
                  </div>

                  {/* Main App Content View depending on KYC approval */}
                  {mobileUser.kycStatus !== 'APPROUVE' ? (
                    <div className="flex-1 flex flex-col justify-center text-center p-4 space-y-4">
                      <div className="h-14 w-14 bg-yellow-500/10 text-yellow-400 rounded-full flex items-center justify-center mx-auto border border-yellow-500/30">
                        <Clock size={28} className="animate-spin-slow" />
                      </div>
                      <h4 className="text-sm font-bold">Votre dossier KYC est en cours d'examen</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Conformément à la réglementation de la BRVM et du CREPMF, nos agents procèdent à la vérification de vos pièces justificatives sous 24h.
                      </p>
                      <div className="p-3 bg-[#11121b] border border-gray-800 rounded-xl text-left space-y-2">
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Documents soumis :</p>
                        <p className="text-xs text-green-400 font-mono flex items-center gap-1.5">✓ Pièce d'identité nationale</p>
                        <p className="text-xs text-green-400 font-mono flex items-center gap-1.5">✓ RIB bancaire certifié</p>
                        <p className="text-xs text-green-400 font-mono flex items-center gap-1.5">✓ Facture de domicile</p>
                      </div>
                      <p className="text-[10px] text-indigo-400 italic">Astuce : Utilisez le portail SGI à gauche pour approuver ce compte !</p>
                    </div>
                  ) : (
                    // FULL ACTIVE APP INTERFACE
                    <div className="flex-1 flex flex-col min-h-0">
                      
                      {/* VIEW 1: WALLET */}
                      {mobileScreen === 'wallet' && (
                        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5">
                          {/* Cash Card */}
                          <div className="bg-gradient-to-br from-indigo-900/60 to-purple-900/40 border border-indigo-500/30 p-4 rounded-2xl relative overflow-hidden">
                            <Wallet className="absolute right-4 bottom-4 text-white/5" size={72} />
                            <div className="flex justify-between items-start">
                              <span className="text-xs text-indigo-300 font-semibold">Portefeuille Cash</span>
                              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 font-mono px-2 py-0.5 rounded border border-indigo-400/20">XOF</span>
                            </div>
                            <h4 className="text-2xl font-bold font-mono mt-3">
                              {cashWallet ? cashWallet.balanceTotal.toLocaleString() : '0'}
                            </h4>
                            <p className="text-[10px] text-indigo-200/70">Solde Cash Total</p>

                            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-indigo-500/20 text-xs font-mono">
                              <div className="flex items-center gap-1">
                                <Lock size={12} className="text-yellow-400" />
                                <div>
                                  <span className="text-gray-400 text-[9px] block">Gélé (en bourse)</span>
                                  <span className="font-semibold">{cashWallet ? cashWallet.balanceFrozen.toLocaleString() : '0'} XOF</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Unlock size={12} className="text-green-400" />
                                <div>
                                  <span className="text-gray-400 text-[9px] block">Disponible</span>
                                  <span className="font-semibold text-green-400">{cashWallet ? cashWallet.balanceAvailable.toLocaleString() : '0'} XOF</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Securities Card */}
                          <div className="bg-[#11121b] border border-gray-800 p-4 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-300">Portefeuille Titres (BRVM)</span>
                              <span className="text-[10px] text-gray-500">{securitiesWallet.length} lignes</span>
                            </div>

                            {securitiesWallet.length === 0 ? (
                              <p className="text-xs text-gray-500 py-4 text-center">Aucune action détenue.</p>
                            ) : (
                              <div className="space-y-2">
                                {securitiesWallet.map((sec) => (
                                  <div key={sec.codeValeur} className="bg-gray-950 p-2.5 rounded-lg flex justify-between items-center border border-gray-900">
                                    <div>
                                      <span className="font-bold text-sm text-gray-200 font-mono">{sec.codeValeur}</span>
                                      <p className="text-[9px] text-gray-400 font-mono mt-0.5">PMP : {sec.averageBuyPrice.toLocaleString()} XOF</p>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-bold text-sm text-indigo-400 font-mono">{sec.quantity}</span>
                                      <p className="text-[9px] text-gray-500">Actions détenues</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* BRVM Live Mock Stock Indexes */}
                          <div className="bg-gray-950 border border-gray-900 p-3 rounded-2xl space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cours BRVM (Sika Finance Mock)</span>
                            <div className="grid grid-cols-2 gap-2">
                              {stocks.slice(0, 4).map((stock) => (
                                <div key={stock.code} className="bg-[#0e0f17] p-2 rounded-lg border border-gray-900 flex justify-between items-center text-[11px]">
                                  <div>
                                    <span className="font-bold font-mono text-gray-300">{stock.code}</span>
                                    <p className="text-[10px] font-mono text-indigo-400 mt-0.5">{stock.price.toLocaleString()} F</p>
                                  </div>
                                  <span className={`font-mono text-[10px] font-bold ${
                                    stock.change > 0 ? 'text-green-400' : stock.change < 0 ? 'text-red-400' : 'text-gray-500'
                                  }`}>
                                    {stock.change > 0 ? '+' : ''}{stock.change}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW 2: OPERATIONS */}
                      {mobileScreen === 'trade' && (
                        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5 text-xs">
                          {/* Operation Type Switcher */}
                          <div className="bg-[#11121b] border border-gray-800 p-3 rounded-2xl space-y-4">
                            <h4 className="font-semibold text-gray-300">Intégration Mobile Money Jèko</h4>
                            <form onSubmit={handleJekoDepositInitiate} className="space-y-3">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Recharger mon compte (XOF)</label>
                                <input 
                                  type="number"
                                  value={depositAmount}
                                  onChange={(e) => setDepositAmount(e.target.value)}
                                  className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-indigo-500"
                                  placeholder="Montant du dépôt"
                                  required
                                />
                              </div>
                              <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-1.5 rounded transition-colors text-xs flex justify-center items-center gap-1.5">
                                <Coins size={14} /> Recharger via Jèko (Wave/Orange)
                              </button>
                            </form>
                          </div>

                          {/* Stock Order Form */}
                          <div className="bg-[#11121b] border border-gray-800 p-3 rounded-2xl space-y-4">
                            <h4 className="font-semibold text-gray-300">Soumettre un Ordre de Bourse BRVM</h4>
                            
                            <form onSubmit={handlePlaceOrder} className="space-y-3">
                              {/* Order Type Switch */}
                              <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1 rounded-lg">
                                <button 
                                  type="button"
                                  onClick={() => setOrderType('ACHAT')}
                                  className={`py-1 text-center font-semibold rounded ${orderType === 'ACHAT' ? 'bg-green-600 text-white' : 'text-gray-400'}`}
                                >
                                  Achat
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setOrderType('VENTE')}
                                  className={`py-1 text-center font-semibold rounded ${orderType === 'VENTE' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}
                                >
                                  Vente
                                </button>
                              </div>

                              {/* Stock Ticker Select */}
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Code Valeur (Titre BRVM)</label>
                                <select 
                                  value={orderStock}
                                  onChange={(e) => {
                                    setOrderStock(e.target.value);
                                    // Autofill ticker price
                                    const st = stocks.find(s => s.code === e.target.value);
                                    if (st) setOrderPrice(st.price.toString());
                                  }}
                                  className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200"
                                >
                                  {stocks.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name} ({s.price.toLocaleString()} F)</option>)}
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] text-gray-500 mb-0.5">Quantité</label>
                                  <input 
                                    type="number"
                                    value={orderQty}
                                    onChange={(e) => setOrderQty(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1 text-xs font-mono text-gray-200"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-gray-500 mb-0.5">Limite Cours (XOF)</label>
                                  <input 
                                    type="number"
                                    value={orderPrice}
                                    onChange={(e) => setOrderPrice(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1 text-xs font-mono text-gray-200"
                                    required
                                  />
                                </div>
                              </div>

                              {/* Live Calculation block */}
                              <div className="bg-gray-950 p-2 rounded text-[11px] font-mono space-y-1 text-gray-400">
                                <div className="flex justify-between">
                                  <span>Montant Titres :</span>
                                  <span>{Math.round(Number(orderQty) * Number(orderPrice)).toLocaleString()} XOF</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Commission SGI (1.5%) :</span>
                                  <span>{Math.round(Number(orderQty) * Number(orderPrice) * COMMISSION_RATE).toLocaleString()} XOF</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-800 pt-1 text-gray-200 font-bold">
                                  <span>Total Estimé {orderType === 'ACHAT' ? 'Gelé' : 'Vendu'} :</span>
                                  <span className={orderType === 'ACHAT' ? 'text-yellow-400' : 'text-green-400'}>
                                    {Math.round(Number(orderQty) * Number(orderPrice) * (orderType === 'ACHAT' ? 1.015 : 1)).toLocaleString()} XOF
                                  </span>
                                </div>
                              </div>

                              <button type="submit" className={`w-full font-semibold py-1.5 rounded transition-colors text-xs ${
                                orderType === 'ACHAT' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'
                              }`}>
                                {orderType === 'ACHAT' ? 'Placer l\'ordre d\'achat (Geler les fonds)' : 'Placer l\'ordre de vente (Escrow titres)'}
                              </button>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* VIEW 3: HISTORY */}
                      {mobileScreen === 'history' && (
                        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5 text-xs">
                          {/* Orders list */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Mes Ordres de Bourse</span>
                            {myOrders.length === 0 ? (
                              <p className="text-gray-500 text-center py-4 bg-[#11121b] rounded-xl border border-gray-900">Aucun ordre.</p>
                            ) : (
                              myOrders.map(o => (
                                <div key={o.id} className="bg-[#11121b] border border-gray-800 p-2.5 rounded-xl flex justify-between items-center">
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <span className={`text-[8px] font-bold px-1.5 rounded ${o.type === 'ACHAT' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>{o.type}</span>
                                      <span className="font-bold text-gray-200 font-mono">{o.codeValeur}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 mt-1 font-mono">{o.quantityRequested} actions à {o.priceRequested.toLocaleString()} F</p>
                                  </div>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                                    o.status === 'EXECUTE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                    o.status === 'ANNULE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                  }`}>
                                    {o.status}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Mobile Money Deposits list */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dépôts Mobile Money (Wave / Orange / MTN)</span>
                            {myTransactions.length === 0 ? (
                              <p className="text-gray-500 text-center py-4 bg-[#11121b] rounded-xl border border-gray-900">Aucune transaction.</p>
                            ) : (
                              myTransactions.map(tx => (
                                <div key={tx.idInternal} className="bg-[#11121b] border border-gray-800 p-2.5 rounded-xl flex justify-between items-center font-mono">
                                  <div>
                                    <span className="font-bold text-gray-200">{tx.amount.toLocaleString()} XOF</span>
                                    <p className="text-[8px] text-gray-500 mt-1">Int. Ref: {tx.idInternal.slice(0,8)}...</p>
                                  </div>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                                    tx.status === 'SUCCES' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                                    tx.status === 'ECHEC' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                  }`}>
                                    {tx.status}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* Phone Bottom Tab bar navigation */}
                      <div className="border-t border-gray-800 pt-3 grid grid-cols-3 gap-2 text-center text-[10px] bg-[#0c0d14]">
                        <button 
                          onClick={() => setMobileScreen('wallet')}
                          className={`flex flex-col items-center gap-1 py-1 font-semibold ${mobileScreen === 'wallet' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          <Wallet size={16} />
                          <span>Portefeuille</span>
                        </button>
                        <button 
                          onClick={() => setMobileScreen('trade')}
                          className={`flex flex-col items-center gap-1 py-1 font-semibold ${mobileScreen === 'trade' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          <TrendingUp size={16} />
                          <span>Bourse / Dépôt</span>
                        </button>
                        <button 
                          onClick={() => setMobileScreen('history')}
                          className={`flex flex-col items-center gap-1 py-1 font-semibold ${mobileScreen === 'history' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          <FileText size={16} />
                          <span>Historique</span>
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Simulated Phone Home button */}
            <div className="h-10 bg-[#0c0d14] flex justify-center items-center pb-2 z-50">
              <span className="w-24 h-1 bg-gray-700 rounded-full"></span>
            </div>
          </div>
        </section>

      </main>

      {/* Jeko payment gateway simulator modal */}
      {showJekoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#0f111a] border border-green-500/30 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl shadow-green-500/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center border border-green-500/20">
                <Coins size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-200">Wave / Orange / MTN</h3>
                <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 border border-green-500/20 rounded font-mono">Simulateur Webhook Sandbox</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-mono">
              Jèko a intercepté l'ordre de dépôt et a généré un push Mobile Money (Wave / Orange / MTN) pour le client.
            </p>

            <div className="bg-gray-950 p-3 rounded-lg border border-gray-950 font-mono text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Montant :</span>
                <span className="text-gray-200 font-bold">{Number(depositAmount).toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between">
                <span>ID Interne :</span>
                <span className="text-gray-200 truncate">{pendingJekoTxId}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleSimulatePayment('FAILED')}
                className="flex-1 text-xs font-semibold py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors"
              >
                Simuler Échec / Annulation
              </button>
              <button 
                onClick={() => handleSimulatePayment('SUCCESS')}
                className="flex-1 text-xs font-semibold py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                Simuler Réussite (Webhook)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
