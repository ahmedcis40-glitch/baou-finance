import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Smartphone, 
  TrendingUp, 
  FileText, 
  Coins, 
  Lock, 
  Unlock, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

export default function App() {
  // Simulator State
  const [mobileTab, setMobileTab] = useState('login'); // 'login' | 'register' | 'app'
  const [mobileScreen, setMobileScreen] = useState('wallet'); // 'wallet' | 'trade' | 'dca' | 'history'
  
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('mobileToken') || null);
  const [user, setUser] = useState(null);
  const [mobileEmail, setMobileEmail] = useState('client@sgi.ci');
  const [mobilePassword, setMobilePassword] = useState('password123');
  const [mobileError, setMobileError] = useState('');
  const [txType, setTxType] = useState('DEPOT'); // 'DEPOT' | 'RETRAIT'
  const [loading, setLoading] = useState(false);

  // Registration State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('+2250700000000');
  const [regWhatsappPhone, setRegWhatsappPhone] = useState('+2250700000000');
  const [regPassword, setRegPassword] = useState('');
  const [regConsent, setRegConsent] = useState(true);
  const [regConsentWhatsApp, setRegConsentWhatsApp] = useState(true);
  const [regProfile, setRegProfile] = useState('MODERE');
  const [regHorizon, setRegHorizon] = useState('MOYEN_TERME');
  const [regObjective, setRegObjective] = useState('EPARGNE');
  const [idFile, setIdFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [addressFile, setAddressFile] = useState(null);
  const [regSgi, setRegSgi] = useState('Société Générale Capital Securities');
  const [sgiList, setSgiList] = useState([]);

  // Financial Data State
  const [cashWallet, setCashWallet] = useState(null);
  const [securitiesWallet, setSecuritiesWallet] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [dcaPlans, setDcaPlans] = useState([]);

  // Top 20 plus fortes hausses du jour
  const top20Gainers = [...stocks]
    .filter(s => s.change >= 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 20);

  // 5 baisses les moins fortes
  const top5SmallLosers = [...stocks]
    .filter(s => s.change < 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 5);

  // Valeur totale des actions en portefeuille pour le simulateur mobile
  const totalStocksValue = securitiesWallet.reduce((acc, s) => {
    const price = stocks.find(st => st.code === s.codeValeur)?.price || s.averageBuyPrice;
    return acc + (s.quantity * price);
  }, 0);

  // Génération dynamique de la courbe d'actions (commence à 0 à gauche)
  const getMobileChartPath = () => {
    if (totalStocksValue === 0) {
      return "M 10 70 L 290 70"; // ligne plate à 0 (y = 70)
    }
    const points = [];
    for (let i = 0; i < 7; i++) {
      const ratio = i / 6;
      const wave = i === 0 || i === 6 ? 0 : (Math.sin(i) * 0.08); // ondulations réalistes
      const val = totalStocksValue * Math.max(0, Math.min(1, ratio + wave));
      const x = 10 + (i * 46.6); // réparti sur la largeur (10 à 290)
      const y = 70 - (val / totalStocksValue) * 55; // échelle verticale (70 à 15)
      points.push(`${x} ${y}`);
    }
    return `M ${points.join(" L ")}`;
  };

  // Tracé de la zone colorée sous la courbe
  const getMobileChartAreaPath = () => {
    if (totalStocksValue === 0) {
      return "M 10 70 L 290 70 L 290 75 L 10 75 Z";
    }
    const points = [];
    for (let i = 0; i < 7; i++) {
      const ratio = i / 6;
      const wave = i === 0 || i === 6 ? 0 : (Math.sin(i) * 0.08);
      const val = totalStocksValue * Math.max(0, Math.min(1, ratio + wave));
      const x = 10 + (i * 46.6);
      const y = 70 - (val / totalStocksValue) * 55;
      points.push(`${x} ${y}`);
    }
    return `M 10 75 L ${points.join(" L ")} L 290 75 Z`;
  };

  // Deposit Form & Webhook simulation state
  const [depositAmount, setDepositAmount] = useState('100000');
  const [depositOperator, setDepositOperator] = useState('Wave');
  const [depositPhone, setDepositPhone] = useState('0707070707');
  const [pendingTxId, setPendingTxId] = useState(null);
  const [showPawaPayModal, setShowPawaPayModal] = useState(false);

  // Buy/Sell Order form state
  const [selectedStock, setSelectedStock] = useState(null);
  const [orderType, setOrderType] = useState('ACHAT');
  const [orderQty, setOrderQty] = useState('10');
  const [orderPrice, setOrderPrice] = useState('31000');

  // DCA plan form state
  const [dcaAmount, setDcaAmount] = useState('25000');
  const [dcaFrequency, setDcaFrequency] = useState('MONTHLY');
  const [dcaStock, setDcaStock] = useState('SNTS');
  const [showDcaForm, setShowDcaForm] = useState(false);

  // Helper Headers
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Sync token with storage
  useEffect(() => {
    if (token) {
      localStorage.setItem('mobileToken', token);
      fetchProfile();
      fetchMobileData();
      const interval = setInterval(fetchMobileData, 5000);
      return () => clearInterval(interval);
    } else {
      localStorage.removeItem('mobileToken');
      setUser(null);
    }
  }, [token]);

  // Mobile WhatsApp Simulation state
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [showMobileWhatsApp, setShowMobileWhatsApp] = useState(false);

  // Load stocks on startup
  useEffect(() => {
    fetchStocks();
  }, []);

  // WhatsApp Alert Generator for Mobile
  useEffect(() => {
    if (!user) {
      setWhatsappMessages([]);
      return;
    }

    const messages = [];

    // 1. Onboarding & KYC
    messages.push({
      time: user.createdAt ? new Date(user.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : '10:00',
      sender: 'BAOU / SGI',
      text: `Bonjour ${user.firstName} ${user.lastName}, bienvenue sur BAOU. Votre dossier d'inscription a été transmis à la SGI partenaire ${user.sgiPartenaire || "la SGI"} pour validation réglementaire.`
    });

    if (user.kycStatus === 'APPROUVE') {
      messages.push({
        time: 'Juste après',
        sender: 'BAOU / SGI',
        text: `✅ CONFORMITÉ : Votre compte-titres SGI a été validé avec succès par ${user.sgiPartenaire}. Vous pouvez désormais l'approvisionner par Mobile Money.`
      });
    }

    // 2. Deposit & Withdrawal alerts
    myTransactions.forEach((t) => {
      if (t.status === 'SUCCES') {
        const isDeposit = t.type === 'DEPOT';
        messages.push({
          time: new Date(t.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
          sender: 'PawaPay / SGI',
          text: isDeposit 
            ? `💸 DÉPÔT : Votre rechargement de ${t.amount.toLocaleString()} F XOF via Mobile Money a été approuvé. Votre solde a été crédité.`
            : `💸 RETRAIT : Votre transfert de retrait de ${t.amount.toLocaleString()} F XOF via Mobile Money a été validé. Votre compte mobile a été crédité.`
        });
      }
    });

    // 3. Order alerts
    myOrders.forEach((o) => {
      const timeStr = new Date(o.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
      if (o.status === 'EN_ATTENTE') {
        messages.push({
          time: timeStr,
          sender: 'BAOU / SGI',
          text: `📈 ORDRE REÇU : Votre intention d'ordre d'${o.type.toLowerCase()} de ${o.quantityRequested} actions ${o.codeValeur} au cours de ${o.priceRequested.toLocaleString()} F a été transmise à la SGI partenaire.`
        });
      } else if (o.status === 'EXECUTE') {
        messages.push({
          time: timeStr,
          sender: 'BAOU / SGI',
          text: `✅ ORDRE EXÉCUTÉ : Votre ordre d'${o.type.toLowerCase()} de ${o.quantityRequested} actions ${o.codeValeur} a été exécuté sur le marché par ${user.sgiPartenaire} au cours réel de ${(o.priceReal || o.priceRequested).toLocaleString()} F.`
        });
      } else if (o.status === 'ANNULE') {
        messages.push({
          time: timeStr,
          sender: 'BAOU / SGI',
          text: `❌ ORDRE ANNULÉ : Votre ordre d'${o.type.toLowerCase()} de ${o.quantityRequested} actions ${o.codeValeur} a été annulé.`
        });
      }
    });

    // 4. DCA plans alerts
    dcaPlans.forEach((p) => {
      const timeStr = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : '11:00';
      messages.push({
        time: timeStr,
        sender: 'BAOU / Autopilot',
        text: `🤖 PLAN DCA ACTIF : Votre plan d'investissement récurrent de ${p.amount.toLocaleString()} XOF sur ${p.symbol} (${p.frequency}) a été configuré avec succès.`
      });
    });

    setWhatsappMessages(messages);
  }, [user, myTransactions, myOrders, dcaPlans]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStocks = async () => {
    try {
      const res = await fetch(`${API_BASE}/market/stocks`);
      if (res.ok) {
        setStocks(await res.json());
      }
    } catch (e) {
      console.error("Stocks fetch error:", e);
    }

    try {
      const resSgis = await fetch(`${API_BASE}/market/sgis`);
      if (resSgis.ok) {
        const data = await resSgis.json();
        setSgiList(data);
        if (data.length > 0) {
          setRegSgi(data[0]);
        }
      }
    } catch (e) {
      console.error("SGIs fetch error:", e);
    }
  };

  const fetchMobileData = async () => {
    if (!token) return;
    try {
      // Cash
      const resCash = await fetch(`${API_BASE}/wallets/cash`, { headers: getHeaders() });
      if (resCash.ok) {
        const cw = await resCash.json();
        setCashWallet(cw);
      }
      
      // Securities
      const resSec = await fetch(`${API_BASE}/wallets/securities`, { headers: getHeaders() });
      if (resSec.ok) setSecuritiesWallet(await resSec.json());

      // Orders
      const resOrd = await fetch(`${API_BASE}/orders/my`, { headers: getHeaders() });
      if (resOrd.ok) setMyOrders(await resOrd.json());

      // PawaPay transactions history
      const resTx = await fetch(`${API_BASE}/pawapay/my`, { headers: getHeaders() });
      if (resTx.ok) setMyTransactions(await resTx.json());

      // DCA Plans
      const resDca = await fetch(`${API_BASE}/dca/my`, { headers: getHeaders() });
      if (resDca.ok) setDcaPlans(await resDca.json());

      // Reload stocks
      fetchStocks();
    } catch (e) {
      console.error("Data refresh error:", e);
    }
  };

  // Login handler
  const handleMobileLogin = async (e) => {
    e.preventDefault();
    setMobileError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mobileEmail, password: mobilePassword })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Identifiants incorrects');
      }
      const data = await res.json();
      setToken(data.accessToken);
      setMobileTab('app');
    } catch (err) {
      setMobileError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Registration handler
  const handleMobileRegister = async (e) => {
    e.preventDefault();
    setMobileError('');
    setLoading(true);

    if (!idFile || !photoFile || !addressFile) {
      setMobileError("Veuillez sélectionner tous les justificatifs KYC requis.");
      setLoading(false);
      return;
    }

    try {
      const kycDocs = {
        identityCardUrl: `/docs/${idFile}`,
        photoUrl: `/docs/${photoFile}`,
        proofOfAddressUrl: `/docs/${addressFile}`
      };

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: regFirstName,
          lastName: regLastName,
          email: regEmail,
          phone: regPhone,
          whatsappPhone: regWhatsappPhone,
          password: regPassword,
          consentSMS: regConsent,
          consentWhatsApp: regConsentWhatsApp,
          kycDocuments: kycDocs,
          sgiPartenaire: regSgi,
          investorProfile: regProfile,
          investorHorizon: regHorizon,
          investorObjective: regObjective
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur d'inscription");
      }
      alert('Compte créé avec succès ! Connectez-vous maintenant.');
      setMobileEmail(regEmail);
      setMobilePassword(regPassword);
      setMobileTab('login');
    } catch (err) {
      setMobileError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleMobileLogout = () => {
    setToken(null);
    setMobileTab('login');
  };

  // Deposit or withdrawal handler
  const handleMobileDeposit = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (amount <= 0) return;

    if (txType === 'RETRAIT' && cashWallet && cashWallet.balanceAvailable < amount) {
      alert("Solde disponible insuffisant pour effectuer ce retrait.");
      return;
    }
    
    try {
      const endpoint = txType === 'DEPOT' ? 'deposit' : 'withdraw';
      const res = await fetch(`${API_BASE}/pawapay/${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erreur d\'initiation');
      }
      const result = await res.json();
      setPendingTxId(result.transactionId);
      setShowPawaPayModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Webhook Simulation Sandbox
  const handleSimulatePayment = async (status) => {
    setShowPawaPayModal(false);
    if (!pendingTxId) return;

    try {
      // 1. Get signed signature payload from simulate-webhook endpoint
      const resSim = await fetch(`${API_BASE}/pawapay/simulate-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInternal: pendingTxId,
          status: status,
          amount: Number(depositAmount)
        })
      });
      if (!resSim.ok) throw new Error("Échec de la simulation");
      const simResult = await resSim.json();

      // 2. POST to our own webhook endpoint to simulate PawaPay calling us
      const resWebhook = await fetch(`${API_BASE}/pawapay/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pawapay-signature': simResult.signature
        },
        body: JSON.stringify(simResult.payload)
      });

      if (resWebhook.ok) {
        alert(status === 'SUCCESS' 
          ? (txType === 'DEPOT' ? 'Dépôt validé ! Compte crédité.' : 'Retrait validé ! Compte mobile crédité.') 
          : 'Transaction annulée ou rejetée.');
        fetchMobileData();
      } else {
        throw new Error("Erreur de webhook");
      }
    } catch (e) {
      alert("Erreur de simulation de paiement: " + e.message);
    }
  };

  // Place Order handler
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          type: orderType,
          codeValeur: selectedStock.code,
          quantityRequested: Number(orderQty),
          priceRequested: Number(orderPrice)
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur de soumission");
      }
      const order = await res.json();

      // Simulate automatic execution of this order via admin endpoint for testing/quick demonstration
      await fetch(`${API_BASE}/orders/admin/status/${order.id}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'EXECUTE',
          priceReal: Number(orderPrice)
        })
      });

      setSelectedStock(null);
      alert(`Ordre d'${orderType === 'ACHAT' ? 'Achat' : 'Vente'} soumis à la SGI et exécuté avec succès.`);
      fetchMobileData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Create DCA Plan handler
  const handleCreateDca = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/dca/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          symbol: dcaStock,
          amount: Number(dcaAmount),
          frequency: dcaFrequency
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setShowDcaForm(false);
      fetchMobileData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleDca = async (id) => {
    try {
      await fetch(`${API_BASE}/dca/${id}/toggle`, {
        method: 'PUT',
        headers: getHeaders()
      });
      fetchMobileData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDca = async (id) => {
    try {
      await fetch(`${API_BASE}/dca/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      fetchMobileData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#07080c] py-8 px-4 font-sans">
      {/* Smartphone Mockup */}
      <div className="w-[385px] h-[795px] bg-[#0c0d14] rounded-[52px] border-[10px] border-[#222431] shadow-2xl relative flex flex-col overflow-hidden shadow-indigo-500/5">
        
        {/* Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-44 h-6 bg-[#222431] rounded-b-2xl z-50 flex items-center justify-center">
          <span className="w-12 h-1.5 bg-[#121319] rounded-full"></span>
        </div>

        {/* Screen Area */}
        <div className="flex-1 bg-[#090a10] pt-8 px-4 pb-4 flex flex-col min-h-0 text-gray-200">
          
          {/* 1. LOGIN TAB */}
          {mobileTab === 'login' && (
            <div className="flex-1 flex flex-col justify-center py-6">
              <div className="text-center mb-8">
                <div className="h-14 w-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-md">
                  <Smartphone size={28} />
                </div>
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">BAOU</h2>
                <p className="text-xs text-gray-400 mt-1.5">Investissement intelligent & DCA à la BRVM</p>
              </div>

              <form onSubmit={handleMobileLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Client</label>
                  <input 
                    type="email" 
                    value={mobileEmail} 
                    onChange={(e) => setMobileEmail(e.target.value)}
                    className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono" 
                    placeholder="client@sgi.ci"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mot de passe</label>
                  <input 
                    type="password" 
                    value={mobilePassword} 
                    onChange={(e) => setMobilePassword(e.target.value)}
                    className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 font-mono" 
                    placeholder="••••••••"
                    required
                  />
                </div>

                {mobileError && <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg leading-relaxed">{mobileError}</div>}

                <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-2">
                  {loading ? <RefreshCw className="animate-spin" size={14} /> : 'Se connecter'}
                </button>
              </form>

              <div className="mt-8 text-center space-y-4">
                <p className="text-xs text-gray-500">Pas encore de compte ?</p>
                <button onClick={() => setMobileTab('register')} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Créer un compte & Ouvrir KYC
                </button>

                <div className="border-t border-gray-850 pt-5 space-y-2">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block">Raccourcis de Test</span>
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => { setMobileEmail('client@sgi.ci'); setMobilePassword('password123'); setMobileTab('login'); }}
                      className="text-[10px] bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300 border border-gray-700/20"
                    >
                      Client Approuvé
                    </button>
                    <button 
                      onClick={() => { setMobileEmail('pending_client@sgi.ci'); setMobilePassword('password123'); setMobileTab('login'); }}
                      className="text-[10px] bg-gray-800/80 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300 border border-gray-700/20"
                    >
                      Client En Attente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. REGISTRATION TAB */}
          {mobileTab === 'register' && (
            <div className="flex-1 flex flex-col justify-center py-4 overflow-y-auto no-scrollbar">
              <h3 className="text-sm font-bold text-gray-200 mb-4 text-center">Formulaire KYC SGI</h3>
              <form onSubmit={handleMobileRegister} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Prénom</label>
                    <input type="text" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-gray-200" required />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Nom</label>
                    <input type="text" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-gray-200" required />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Email</label>
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-gray-200 font-mono" placeholder="ex: jean.koffi@email.ci" required />
                </div>

                <div>
                  <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">SGI Partenaire</label>
                  <select value={regSgi} onChange={(e) => setRegSgi(e.target.value)} required className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-gray-200">
                    {sgiList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {sgiList.length === 0 && (
                      <option value="Société Générale Capital Securities">Société Générale Capital Securities</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Téléphone</label>
                    <input type="text" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-gray-200 font-mono" placeholder="+225 07..." required />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">N° WhatsApp</label>
                    <input type="text" value={regWhatsappPhone} onChange={(e) => setRegWhatsappPhone(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-gray-200 font-mono" placeholder="+225 07..." required />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Mot de passe</label>
                  <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="w-full bg-[#11121b] border border-gray-800 rounded-lg px-2.5 py-2 text-xs text-gray-200" required />
                </div>

                {/* KYC Documents Section */}
                <div className="bg-[#11121b] p-3 rounded-lg border border-gray-850 space-y-2">
                  <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Justificatifs KYC requis</span>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[9px] text-gray-400">1. Pièce d'identité (CNI/Passeport)</label>
                    <select onChange={e => setIdFile(e.target.value)} required className="w-full bg-[#090a10] border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-200">
                      <option value="">Sélectionner...</option>
                      <option value="cni_recto_verso.pdf">cni_recto_verso.pdf</option>
                      <option value="passeport_biometrique.pdf">passeport_biometrique.pdf</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] text-gray-400">2. Photo d'identité récente</label>
                    <select onChange={e => setPhotoFile(e.target.value)} required className="w-full bg-[#090a10] border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-200">
                      <option value="">Sélectionner...</option>
                      <option value="photo_koffi.jpg">photo_koffi.jpg</option>
                      <option value="photo_profil.png">photo_profil.png</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] text-gray-400">3. Justificatif CIE / SODECI</label>
                    <select onChange={e => setAddressFile(e.target.value)} required className="w-full bg-[#090a10] border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-200">
                      <option value="">Sélectionner...</option>
                      <option value="facture_cie_avril2026.pdf">facture_cie_avril2026.pdf</option>
                      <option value="facture_sodeci_mars2026.pdf">facture_sodeci_mars2026.pdf</option>
                    </select>
                  </div>
                </div>

                {/* Profil Investisseur Questionnaire */}
                <div className="bg-[#11121b] p-3 rounded-lg border border-gray-850 space-y-2.5">
                  <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Profil d'Investisseur (AMF-UMOA)</span>
                  
                  <div className="space-y-1.5 text-[10px]">
                    <label className="block text-[9px] text-gray-400">Objectif Financier</label>
                    <select value={regObjective} onChange={e => setRegObjective(e.target.value)} required className="w-full bg-[#090a10] border border-gray-800 rounded px-2 py-1 text-gray-200">
                      <option value="EPARGNE">Épargne & Valorisation</option>
                      <option value="REVENUS">Recherche de dividendes</option>
                      <option value="SPECULATION">Opérations spéculatives</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <label className="block text-[9px] text-gray-400">Profil de Risque</label>
                    <select value={regProfile} onChange={e => setRegProfile(e.target.value)} required className="w-full bg-[#090a10] border border-gray-800 rounded px-2 py-1 text-gray-200">
                      <option value="PRUDENT">Prudent (ex: CIE, SODECI)</option>
                      <option value="MODERE">Modéré (ex: SONATEL, SGBCI)</option>
                      <option value="DYNAMIQUE">Audacieux (Croissance / PME)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <label className="block text-[9px] text-gray-400">Horizon de Placement</label>
                    <select value={regHorizon} onChange={e => setRegHorizon(e.target.value)} required className="w-full bg-[#090a10] border border-gray-800 rounded px-2 py-1 text-gray-200">
                      <option value="COURT_TERME">Court terme (&lt; 2 ans)</option>
                      <option value="MOYEN_TERME">Moyen terme (2 à 5 ans)</option>
                      <option value="LONG_TERME">Long terme (&gt; 5 ans)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 text-[9px] text-gray-400 leading-normal">
                  <input type="checkbox" checked={regConsent} onChange={e => setRegConsent(e.target.checked)} required className="mt-0.5" />
                  <span>Je certifie l'exactitude de mes pièces justificatives KYC.</span>
                </div>

                <div className="flex items-start gap-1.5 text-[9px] text-gray-400 leading-normal">
                  <input type="checkbox" checked={regConsentWhatsApp} onChange={e => setRegConsentWhatsApp(e.target.checked)} className="mt-0.5" />
                  <span>J'accepte de recevoir les alertes de bourse et transactions via WhatsApp.</span>
                </div>

                {mobileError && <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg leading-normal">{mobileError}</div>}

                <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors">
                  {loading ? 'Soumission du KYC...' : 'Créer & Soumettre le KYC'}
                </button>

                <button type="button" onClick={() => setMobileTab('login')} className="w-full text-center text-xs text-gray-500 hover:text-gray-400 mt-2 font-semibold">
                  Retour à la connexion
                </button>
              </form>
            </div>
          )}

          {/* 3. LOGGED IN MOBILE APP */}
          {mobileTab === 'app' && user && (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* App Header */}
              <div className="flex justify-between items-center pb-3 border-b border-gray-850 mb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-[10px]">{user.firstName.charAt(0)}</span>
                    <span className="text-xs font-bold text-gray-200">{user.firstName} {user.lastName}</span>
                  </div>
                  {user.kycStatus === 'APPROUVE' ? (
                    <span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full mt-1 inline-block font-semibold">KYC Approuvé</span>
                  ) : (
                    <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full mt-1 inline-block font-semibold">KYC En Attente SGI</span>
                  )}
                </div>
                <div className="flex gap-1.5 items-center">
                  {user.consentWhatsApp && (
                    <button 
                      onClick={() => setShowMobileWhatsApp(true)} 
                      className="relative text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 p-1.5 rounded-lg font-semibold flex items-center justify-center gap-1"
                    >
                      <span>💬 WhatsApp</span>
                      {whatsappMessages.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-gray-900">
                          {whatsappMessages.length}
                        </span>
                      )}
                    </button>
                  )}
                  <button onClick={handleMobileLogout} className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-1.5 rounded-lg font-semibold">Déconnexion</button>
                </div>
              </div>

              {/* VIEW 1: WALLET VIEW */}
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
                          <span className="text-gray-400 text-[9px] block">Gelé (en bourse)</span>
                          <span className="font-semibold">{cashWallet ? cashWallet.balanceFrozen.toLocaleString() : '0'} F</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Unlock size={12} className="text-green-400" />
                        <div>
                          <span className="text-gray-400 text-[9px] block">Disponible</span>
                          <span className="font-semibold text-green-400">{cashWallet ? cashWallet.balanceAvailable.toLocaleString() : '0'} F</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Chart Card */}
                  <div className="bg-[#11121b] border border-gray-800 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">📈 Performance Titres & Cash</span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xl font-bold font-mono text-gray-200">
                        {((cashWallet?.balanceTotal || 0) + (securitiesWallet.reduce((acc, s) => acc + (s.quantity * (stocks.find(st => st.code === s.codeValeur)?.price || s.averageBuyPrice)), 0))).toLocaleString()} F
                      </span>
                      <span className="text-[9px] bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded text-green-400 font-bold font-mono">+4.2% (7j)</span>
                    </div>
                    
                    {/* SVG Chart */}
                    <div className="h-20 pt-2 relative">
                      <svg width="100%" height="100%" viewBox="0 0 300 80" className="overflow-visible">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#009e49" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#009e49" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Area under curve */}
                        <path 
                          d={getMobileChartAreaPath()} 
                          fill="url(#chartGrad)"
                        />
                        {/* Neon line */}
                        <path 
                          d={getMobileChartPath()} 
                          fill="none" 
                          stroke="#009e49" 
                          strokeWidth="2.5" 
                          strokeLinecap="round"
                        />
                        {totalStocksValue > 0 && <circle cx="290" cy="10" r="3" fill="#009e49" />}
                      </svg>
                    </div>
                  </div>

                  {/* Wave / Orange / MTN Deposit/Withdrawal form */}
                  <div className="bg-[#11121b] border border-gray-800 p-4 rounded-2xl space-y-3">
                    <div className="flex bg-gray-950 p-0.5 rounded-lg border border-gray-850">
                      <button 
                        type="button" 
                        onClick={() => setTxType('DEPOT')}
                        className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${txType === 'DEPOT' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                      >
                        Dépôt
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTxType('RETRAIT')}
                        className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${txType === 'RETRAIT' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                      >
                        Retrait
                      </button>
                    </div>

                    <form onSubmit={handleMobileDeposit} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] font-semibold text-gray-400 uppercase mb-1">Opérateur</label>
                          <select value={depositOperator} onChange={e => setDepositOperator(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200">
                            <option value="Wave">Wave CI</option>
                            <option value="Orange">Orange Money</option>
                            <option value="MTN">MTN Money</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-semibold text-gray-400 uppercase mb-1">Montant (FCFA)</label>
                          <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-gray-200 font-mono" required />
                        </div>
                      </div>
                      <button type="submit" className="w-full text-xs font-semibold py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5">
                        <Coins size={14} /> {txType === 'DEPOT' ? 'Confirmer le rechargement' : 'Confirmer le retrait'}
                      </button>
                    </form>
                  </div>

                  {/* Securities list */}
                  <div className="bg-[#11121b] border border-gray-800 p-4 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-gray-300 block">Mes Actions BRVM</span>
                    {securitiesWallet.length === 0 ? (
                      <p className="text-xs text-gray-500 py-3 text-center">Aucune action en portefeuille.</p>
                    ) : (
                      <div className="space-y-2">
                        {securitiesWallet.map(sec => (
                          <div key={sec.codeValeur} className="bg-gray-950 p-2.5 rounded-lg flex justify-between items-center border border-gray-900">
                            <div>
                              <span className="font-bold text-sm text-gray-200 font-mono">{sec.codeValeur}</span>
                              <p className="text-[9px] text-gray-400 font-mono mt-0.5">PMP : {sec.averageBuyPrice.toLocaleString()} XOF</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-sm text-indigo-400 font-mono">{sec.quantity}</span>
                              <p className="text-[9px] text-gray-500">Actions</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SGI Partner & Investor Profile Card */}
                  <div className="bg-[#11121b] border border-gray-800 p-4 rounded-2xl space-y-3">
                    <span className="text-xs font-bold text-gray-300 block">Détails de mon Compte SGI</span>
                    
                    <div className="text-[10px] space-y-2 text-gray-400">
                      <div>
                        <span className="text-gray-500 block">SGI Partenaire :</span>
                        <span className="font-semibold text-gray-200">{user.sgiPartenaire || "Société Générale Capital Securities"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500 block">Objectif :</span>
                          <span className="font-semibold text-gray-200">{user.investorObjective === 'REVENUS' ? 'Dividendes' : user.investorObjective === 'SPECULATION' ? 'Spéculation' : 'Épargne'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Risque :</span>
                          <span className="font-semibold text-gray-200">{user.investorProfile || "MODERE"}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => alert(`Téléchargement du contrat de compte-titres entre BAOU, ${user.sgiPartenaire} et ${user.firstName} ${user.lastName}.\n\nRéférence : CONV-SGI-${user.id?.substring(0,8).toUpperCase()}`)}
                      className="w-full text-[10px] font-semibold py-2 bg-gray-800 hover:bg-gray-750 text-indigo-400 border border-gray-700 rounded-lg flex items-center justify-center gap-1.5"
                    >
                      <FileText size={12} /> Télécharger la Convention (PDF)
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 2: TRADE VIEW */}
              {mobileScreen === 'trade' && (
                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5">
                  <h3 className="text-xs font-bold text-gray-300 mb-2">Marché BRVM (Sika Finance Live)</h3>
                  
                  {/* Stocks lists */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">📊 Actions BRVM</span>
                      {stocks.map(s => (
                        <div key={s.code} className="bg-[#11121b] border border-gray-800 p-2.5 rounded-xl flex justify-between items-center cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={() => { setSelectedStock(s); setOrderPrice(s.price.toString()); }}>
                          <div>
                            <span className="font-bold text-gray-200 font-mono text-xs">{s.code}</span>
                            <p className="text-[9px] text-gray-500 truncate w-36">{s.name}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-200 font-mono text-xs">{s.price.toLocaleString()} XOF</span>
                            <p className={`text-[9px] font-bold ${s.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {s.change >= 0 ? '+' : ''}{s.change}%
                            </p>
                          </div>
                        </div>
                      ))}
                      {stocks.length === 0 && <p className="text-gray-500 text-[10px] text-center">Chargement des cours...</p>}
                    </div>
                  </div>

                  {/* Order form modal simulation inside screen */}
                  {selectedStock && (
                    <div className="bg-[#11121b] border border-indigo-500/30 p-4 rounded-2xl mt-4 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-850">
                        <span className="text-xs font-bold text-indigo-300">Négocier {selectedStock.code}</span>
                        <button onClick={() => setSelectedStock(null)} className="text-[10px] text-gray-500">Fermer</button>
                      </div>
                      
                      <form onSubmit={handlePlaceOrder} className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] font-semibold text-gray-400 uppercase mb-1">Opération</label>
                            <select value={orderType} onChange={e => setOrderType(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-1.5">
                              <option value="ACHAT">Achat</option>
                              <option value="VENTE">Vente</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] font-semibold text-gray-400 uppercase mb-1">Quantité</label>
                            <input type="number" value={orderQty} onChange={e => setOrderQty(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-1.5 font-mono" required />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-[8px] font-semibold text-gray-400 uppercase mb-1">Cours Proposé (XOF)</label>
                          <input type="number" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded p-1.5 font-mono" required />
                        </div>

                        <div className="bg-gray-950 p-2 rounded text-[10px] font-mono text-gray-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Solde disponible :</span>
                            <span className="text-green-400 font-bold">{(cashWallet?.balanceAvailable || 0).toLocaleString()} F</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Montant brut :</span>
                            <span className="text-gray-300">{(Number(orderQty) * Number(orderPrice)).toLocaleString()} F</span>
                          </div>
                          {orderType === 'ACHAT' && (
                            <div className="flex justify-between">
                              <span>Commission SGI (1,5%) :</span>
                              <span className="text-gray-300">{Math.round(Number(orderQty) * Number(orderPrice) * 0.015).toLocaleString()} F</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-gray-800 pt-1 text-gray-200">
                            <span>Estimation totale :</span>
                            <span className="font-bold text-indigo-400">{Math.round(Number(orderQty) * Number(orderPrice) * (orderType === 'ACHAT' ? 1.015 : 1)).toLocaleString()} F</span>
                          </div>
                        </div>

                        {/* KYC Warning */}
                        {user.kycStatus !== 'APPROUVE' && (
                          <div className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg leading-normal">
                            ⚠️ Votre KYC n'est pas encore approuvé par la SGI. Veuillez valider le compte dans le Portail Admin.
                          </div>
                        )}

                        {/* Balance Warning */}
                        {orderType === 'ACHAT' && user.kycStatus === 'APPROUVE' && Math.round(Number(orderQty) * Number(orderPrice) * 1.015) > (cashWallet?.balanceAvailable || 0) && (
                          <div className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg leading-normal">
                            ⚠️ Solde insuffisant. Rechargez votre portefeuille ou réduisez la quantité d'actions.
                          </div>
                        )}

                        <button 
                          type="submit" 
                          disabled={
                            user.kycStatus !== 'APPROUVE' || 
                            (orderType === 'ACHAT' && Math.round(Number(orderQty) * Number(orderPrice) * 1.015) > (cashWallet?.balanceAvailable || 0))
                          }
                          className="w-full text-xs font-semibold py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Soumettre l'ordre à la SGI
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 3: DCA AUTOPILOT */}
              {mobileScreen === 'dca' && (
                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-300">Mes investissements DCA</span>
                    <button onClick={() => setShowDcaForm(true)} className="text-[10px] bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded font-semibold text-white">Ajouter</button>
                  </div>

                  {showDcaForm && (
                    <form onSubmit={handleCreateDca} className="bg-[#11121b] border border-indigo-500/30 p-3 rounded-2xl space-y-3 text-xs">
                      <div>
                        <label className="block text-[8px] font-semibold text-gray-400 uppercase mb-1">Symbole Action</label>
                        <select value={dcaStock} onChange={e => setDcaStock(e.target.value)} className="w-full bg-gray-950 border border-gray-850 p-2 rounded">
                          {stocks.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-semibold text-gray-400 uppercase mb-1">Montant Récurrent (XOF)</label>
                        <input type="number" value={dcaAmount} onChange={e => setDcaAmount(e.target.value)} className="w-full bg-gray-950 border border-gray-850 p-2 rounded font-mono" required />
                      </div>

                      <div>
                        <label className="block text-[8px] font-semibold text-gray-400 uppercase mb-1">Fréquence</label>
                        <select value={dcaFrequency} onChange={e => setDcaFrequency(e.target.value)} className="w-full bg-gray-950 border border-gray-850 p-2 rounded">
                          <option value="WEEKLY">Hebdomadaire</option>
                          <option value="MONTHLY">Mensuelle</option>
                          <option value="QUARTERLY">Trimestrielle</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowDcaForm(false)} className="flex-1 text-[10px] py-1 bg-gray-800 rounded">Annuler</button>
                        <button type="submit" className="flex-1 text-[10px] py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-semibold">Créer</button>
                      </div>
                    </form>
                  )}

                  {/* Active plans list */}
                  <div className="space-y-2">
                    {dcaPlans.length === 0 ? (
                      <p className="text-xs text-gray-500 py-3 text-center">Aucun plan DCA actif.</p>
                    ) : (
                      dcaPlans.map(plan => (
                        <div key={plan.id} className="bg-[#11121b] border border-gray-800 p-3 rounded-xl flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-gray-200 font-mono">{plan.symbol}</span>
                            <p className="text-[10px] text-gray-500 font-mono">{plan.amount.toLocaleString()} XOF / {plan.frequency}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => toggleDca(plan.id)} className={`text-[8px] font-bold px-2 py-1 rounded border ${plan.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                              {plan.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                            </button>
                            <button onClick={() => deleteDca(plan.id)} className="text-[8px] font-bold px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded">X</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 4: HISTORY VIEW */}
              {mobileScreen === 'history' && (
                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-0.5 text-xs">
                  
                  {/* Orders */}
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

                  {/* PawaPay deposits list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-sans">Dépôts Wave / Orange / MTN</span>
                    {myTransactions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 bg-[#11121b] rounded-xl border border-gray-900">Aucune transaction.</p>
                    ) : (
                      myTransactions.map(tx => (
                        <div key={tx.idInternal} className="bg-[#11121b] border border-gray-800 p-2.5 rounded-xl flex justify-between items-center font-mono">
                          <div>
                            <span className="font-bold text-gray-200">{tx.amount.toLocaleString()} XOF</span>
                            <p className="text-[8px] text-gray-500 mt-1">Ref: {tx.idInternal.slice(0,8)}...</p>
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

              {/* Navigation Bottom bar */}
              <div className="border-t border-gray-850 pt-3 grid grid-cols-4 gap-1 text-center text-[9px] bg-[#0c0d14] mt-auto">
                <button onClick={() => setMobileScreen('wallet')} className={`flex flex-col items-center gap-0.5 py-1 font-semibold ${mobileScreen === 'wallet' ? 'text-indigo-400' : 'text-gray-500'}`}>
                  <Wallet size={15} />
                  <span>Portefeuille</span>
                </button>
                <button onClick={() => setMobileScreen('trade')} className={`flex flex-col items-center gap-0.5 py-1 font-semibold ${mobileScreen === 'trade' ? 'text-indigo-400' : 'text-gray-500'}`}>
                  <TrendingUp size={15} />
                  <span>Bourse</span>
                </button>
                <button onClick={() => setMobileScreen('dca')} className={`flex flex-col items-center gap-0.5 py-1 font-semibold ${mobileScreen === 'dca' ? 'text-indigo-400' : 'text-gray-500'}`}>
                  <Clock size={15} />
                  <span>DCA</span>
                </button>
                <button onClick={() => setMobileScreen('history')} className={`flex flex-col items-center gap-0.5 py-1 font-semibold ${mobileScreen === 'history' ? 'text-indigo-400' : 'text-gray-500'}`}>
                  <FileText size={15} />
                  <span>Historique</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Home Button Pill */}
        <div className="h-8 bg-[#0c0d14] flex justify-center items-center pb-2 z-50">
          <span className="w-20 h-1.5 bg-gray-700 rounded-full"></span>
        </div>

      </div>

      {/* Wave / Orange / MTN Webhook Simulator Modal (PawaPay Sandbox) */}
      {showPawaPayModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#0f111a] border border-green-500/30 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
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
              PawaPay a initié la transaction de recharge de fonds avec le réseau local en Côte d'Ivoire.
            </p>

            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-900 font-mono text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Montant :</span>
                <span className="text-gray-200 font-bold">{Number(depositAmount).toLocaleString()} XOF</span>
              </div>
              <div className="flex justify-between">
                <span>ID Interne :</span>
                <span className="text-gray-200 truncate ml-4">{pendingTxId}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleSimulatePayment('FAILED')}
                className="flex-1 text-xs font-semibold py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors"
              >
                Échec
              </button>
              <button 
                onClick={() => handleSimulatePayment('SUCCESS')}
                className="flex-1 text-xs font-semibold py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                Confirmer le PIN (Succès)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Mobile WhatsApp App Slide-over */}
      {showMobileWhatsApp && (
        <div className="fixed inset-x-0 bottom-0 top-0 bg-black/70 z-50 flex items-end">
          <div className="bg-[#ece5dd] w-full max-w-sm mx-auto h-[90%] rounded-t-3xl overflow-hidden flex flex-col border border-gray-800 shadow-2xl">
            {/* WhatsApp Header */}
            <div className="bg-[#075e54] text-white p-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#128c7e] flex items-center justify-center font-bold text-xs">B</div>
                <div>
                  <h4 className="text-xs font-bold leading-none">WhatsApp BAOU & SGI</h4>
                  <span className="text-[8px] text-green-300">Compte vérifié</span>
                </div>
              </div>
              <button onClick={() => setShowMobileWhatsApp(false)} className="text-[10px] bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 text-red-400 border border-red-500/20 rounded-lg font-bold">Fermer</button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 no-scrollbar">
              {whatsappMessages.map((m, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-lg max-w-[85%] self-start shadow-sm border border-gray-250">
                  <span className="text-[8px] font-bold text-[#128c7e] block">{m.sender}</span>
                  <p className="text-[10px] text-gray-800 leading-snug mt-0.5">{m.text}</p>
                  <span className="text-[7px] text-gray-500 block text-right mt-1">{m.time}</span>
                </div>
              ))}
              {whatsappMessages.length === 0 && (
                <div className="text-center text-gray-500 text-xs mt-32">Aucun message WhatsApp reçu.</div>
              )}
            </div>

            {/* WhatsApp Footer */}
            <div className="bg-[#f0f0f0] py-2 text-center text-[8px] text-gray-500 border-t border-gray-200 font-mono">
              🔒 Messages chiffrés de bout en bout
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
