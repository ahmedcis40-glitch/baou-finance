import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  Lock, 
  Unlock, 
  Coins, 
  Clock, 
  RefreshCw, 
  Plus, 
  ChevronRight,
  User,
  LogOut,
  HelpCircle,
  FileText,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  ArrowUpRight,
  Upload,
  CheckCircle2,
  AlertCircle,
  TrendingDown
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function App() {
  // Navigation View: 'landing' (default) | 'register' | 'dashboard'
  const [view, setView] = useState(localStorage.getItem('webToken') ? 'dashboard' : 'landing');
  
  // Authentication & Profile
  const [token, setToken] = useState(localStorage.getItem('webToken') || null);
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Onboarding / Registration Form State
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
  
  // KYC Files (Selected file names simulation)
  const [idFile, setIdFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [addressFile, setAddressFile] = useState(null);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regSgi, setRegSgi] = useState('Société Générale Capital Securities');
  const [sgiList, setSgiList] = useState([]);
  
  // Dashboard Navigation & Filtering
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState('1J');
  
  // Data States
  const [wallet, setWallet] = useState({
    cashBalance: 0,
    investedBalance: 0,
    totalValue: 0,
    gainsLosses: 0,
    performancePercent: 0,
    holdings: []
  });
  
  const [stocks, setStocks] = useState([]);
  const [dcaPlans, setDcaPlans] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('market'); 

  // Form States
  const [tradeType, setTradeType] = useState('ACHAT');
  const [tradeQty, setTradeQty] = useState('10');
  const [tradeMode, setTradeMode] = useState('SHARES');
  const [depositAmount, setDepositAmount] = useState('150000');
  const [depositOperator, setDepositOperator] = useState('Wave');
  const [depositPhone, setDepositPhone] = useState('0707070707');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [txType, setTxType] = useState('DEPOT'); // 'DEPOT' | 'RETRAIT'
  const [pendingTxId, setPendingTxId] = useState(null);
  const [showPawaPayModal, setShowPawaPayModal] = useState(false);

  // DCA creation
  const [showDcaForm, setShowDcaForm] = useState(false);
  const [dcaAmount, setDcaAmount] = useState('25000');
  const [dcaFrequency, setDcaFrequency] = useState('MONTHLY');
  const [dcaStock, setDcaStock] = useState('SNTS');

  // Chart state
  const [hoveredValue, setHoveredValue] = useState(null);
  const [hoveredTime, setHoveredTime] = useState(null);

  // WhatsApp notification simulation state
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [showWhatsAppPanel, setShowWhatsAppPanel] = useState(false);

  useEffect(() => {
    fetchInitialStocks();
    // Try to restore user profile if token is present on load
    if (token) {
      fetchProfile();
      fetchData();
    }
  }, []);

  // Détecter le retour de paiement PawaPay et rafraîchir les données
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const depositId = params.get('id');
    if (payment === 'success' && depositId) {
      alert(`Dépôt reçu ! Votre transaction de rechargement (ID: ${depositId}) a été transmise. Votre solde de portefeuille sera mis à jour dès confirmation.`);
      // Nettoyer les paramètres de l'URL pour ne pas réafficher l'alerte au rafraîchissement
      window.history.replaceState({}, document.title, window.location.pathname);
      if (token) {
        fetchProfile();
        fetchData();
      }
    }
  }, [token]);

  // WhatsApp Alert Generator
  useEffect(() => {
    if (!user) {
      setWhatsappMessages([]);
      return;
    }

    const messages = [];

    // 1. Onboarding & KYC alerts
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
    transactions.forEach((t) => {
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

    // Sort messages by time or order
    setWhatsappMessages(messages);
  }, [user, transactions, myOrders, dcaPlans]);

  useEffect(() => {
    if (token && token !== 'undefined' && token !== 'null') {
      localStorage.setItem('webToken', token);
      fetchProfile();
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    } else {
      localStorage.removeItem('webToken');
      setUser(null);
    }
  }, [token]);

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (res.ok) setUser(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInitialStocks = async () => {
    try {
      const resStocks = await fetch(`${API_BASE}/market/stocks`);
      if (resStocks.ok) {
        setStocks(await resStocks.json());
      }
    } catch (e) {
      console.warn("Impossible de charger les cours initiaux.");
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
      console.warn("Impossible de charger la liste des SGI.");
    }
  };

  const fetchData = async () => {
    let marketStocks = stocks;
    try {
      const resStocks = await fetch(`${API_BASE}/market/stocks`);
      if (resStocks.ok) {
        marketStocks = await resStocks.json();
        setStocks(marketStocks);
      }
    } catch (e) {
      console.warn("Échec de chargement des cours de bourse :", e);
    }

    if (!token || token === 'undefined' || token === 'null') {
      return;
    }

    try {
      const resWallet = await fetch(`${API_BASE}/wallets/cash`, { headers: getHeaders() });
      if (resWallet.status === 401) {
        setToken(null);
        return;
      }
      
      let cashData = null;
      if (resWallet.ok) {
        cashData = await resWallet.json();
      }

      const resSec = await fetch(`${API_BASE}/wallets/securities`, { headers: getHeaders() });
      let securitiesData = [];
      if (resSec.ok) {
        securitiesData = await resSec.json();
      }

      const resOrd = await fetch(`${API_BASE}/orders/my`, { headers: getHeaders() });
      if (resOrd.ok) setMyOrders(await resOrd.json());

      const resTx = await fetch(`${API_BASE}/pawapay/my`, { headers: getHeaders() });
      if (resTx.ok) setTransactions(await resTx.json());

      const resDca = await fetch(`${API_BASE}/dca/my`, { headers: getHeaders() });
      if (resDca.ok) setDcaPlans(await resDca.json());

      if (cashData && marketStocks.length > 0) {
        const stocksMap = {};
        marketStocks.forEach(s => { stocksMap[s.code] = s.price; });

        const invested = securitiesData.reduce((sum, s) => {
          const price = stocksMap[s.codeValeur] || s.averageBuyPrice;
          return sum + (s.quantity * price);
        }, 0);

        const costBasis = securitiesData.reduce((sum, s) => sum + (s.quantity * s.averageBuyPrice), 0);
        const gainsLosses = invested - costBasis;
        const perf = costBasis > 0 ? (gainsLosses / costBasis) * 100 : 0;

        setWallet({
          cashBalance: cashData.balanceTotal,
          availableBalance: cashData.balanceAvailable,
          frozenBalance: cashData.balanceFrozen,
          investedBalance: invested,
          totalValue: cashData.balanceTotal + invested,
          gainsLosses,
          performancePercent: parseFloat(perf.toFixed(2)),
          holdings: securitiesData.map(s => {
            const currentPrice = stocksMap[s.codeValeur] || s.averageBuyPrice;
            const currentVal = s.quantity * currentPrice;
            const profit = currentVal - (s.quantity * s.averageBuyPrice);
            const profitPercent = (s.quantity * s.averageBuyPrice) > 0 ? (profit / (s.quantity * s.averageBuyPrice)) * 100 : 0;
            return {
              symbol: s.codeValeur,
              name: s.codeValeur === 'SNTS' ? 'Sonatel Sénégal' : s.codeValeur === 'CIEC' ? 'CIE Côte d\'Ivoire' : s.codeValeur,
              quantity: s.quantity,
              pru: s.averageBuyPrice,
              currentPrice,
              currentValue: currentVal,
              profit,
              profitPercent: parseFloat(profitPercent.toFixed(2))
            };
          })
        });
      }
    } catch (e) {
      console.error("Fetch data error:", e);
    }
  };

  // Submit Order
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStock) return;
    
    if (user?.kycStatus !== 'APPROUVE') {
      alert("Votre compte titres doit être validé (KYC) par la SGI pour négocier.");
      return;
    }

    const qty = Number(tradeQty);
    if (qty <= 0) return;

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          type: tradeType,
          codeValeur: selectedStock.code,
          quantityRequested: qty,
          priceRequested: selectedStock.price
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur de soumission");
      }

      const order = await res.json();
      
      alert(`Ordre d'${tradeType === 'ACHAT' ? 'Achat' : 'Vente'} transmis. Simulation de l'exécution par la SGI...`);
      await fetch(`${API_BASE}/orders/admin/status/${order.id}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'EXECUTE', priceReal: selectedStock.price })
      });

      setTradeQty('10');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // PawaPay deposit or withdrawal
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (amount <= 0) return;

    if (txType === 'RETRAIT' && wallet.cashBalance < amount) {
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
      if (res.ok) {
        const result = await res.json();
        setPendingTxId(result.transactionId);
        setShowDepositModal(false);
        if (result.paymentUrl) {
          window.location.href = result.paymentUrl;
        } else {
          setShowPawaPayModal(true);
        }
      } else {
        const err = await res.json();
        alert(err.message || "Erreur lors de la transaction.");
      }
    } catch (err) {
      alert("Erreur transaction : " + err.message);
    }
  };

  const triggerSandboxWebhook = async (status) => {
    setShowPawaPayModal(false);
    if (!pendingTxId) return;

    try {
      const resSim = await fetch(`${API_BASE}/pawapay/simulate-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idInternal: pendingTxId, status, amount: Number(depositAmount) })
      });
      const simResult = await resSim.json();

      await fetch(`${API_BASE}/pawapay/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pawapay-signature': simResult.signature
        },
        body: JSON.stringify(simResult.payload)
      });

      alert(status === 'SUCCESS' 
        ? (txType === 'DEPOT' ? 'Compte rechargé avec succès !' : 'Retrait effectué avec succès !')
        : 'Transaction annulée.');
      fetchData();
    } catch (e) {
      alert("Erreur de validation : " + e.message);
    }
  };

  // DCA plan
  const handleDcaSubmit = async (e) => {
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
      if (res.ok) {
        setShowDcaForm(false);
        fetchData();
      }
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
      fetchData();
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
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Identifiants invalides.');
      }
      const data = await res.json();
      setToken(data.accessToken);
      setShowLoginModal(false);
      setView('dashboard');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  // Handle Registration / KYC Submit
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess(false);

    if (!idFile || !photoFile || !addressFile) {
      setRegError("Veuillez sélectionner tous les documents justificatifs requis (Pièce d'identité, Photo, CIE/SODECI).");
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
          password: regPassword,
          phone: regPhone,
          whatsappPhone: regWhatsappPhone,
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
        throw new Error(err.message || "Erreur de création de compte.");
      }

      setRegSuccess(true);
      setTimeout(() => {
        // Switch to login view or auto fill credentials
        setLoginEmail(regEmail);
        setLoginPassword(regPassword);
        setView('landing');
        setShowLoginModal(true);
      }, 3500);

    } catch (err) {
      setRegError(err.message);
    }
  };

  // Top 20 plus fortes hausses du jour (variation % décroissante)
  const top20Gainers = [...stocks]
    .filter(s => s.change >= 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 20);

  // 5 baisses les moins fortes (variation négative la plus proche de 0)
  const top5SmallLosers = [...stocks]
    .filter(s => s.change < 0)
    .sort((a, b) => b.change - a.change) // b.change > a.change car tous négatifs
    .slice(0, 5);

  const filteredStocks = stocks.filter(s => 
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSparkline = (change) => {
    const isUp = change >= 0;
    const path = isUp ? "M 0 10 L 15 5 L 30 12 L 45 3" : "M 0 3 L 15 12 L 30 5 L 45 10";
    return (
      <svg width="45" height="15" viewBox="0 0 45 15" className="sparkline">
        <path d={path} fill="none" stroke={isUp ? "#009e49" : "#ff3b30"} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  };

  const getChartPoints = () => {
    if (selectedStock) {
      // Single stock chart trend
      const points = [
        selectedStock.price * (1 - (selectedStock.change / 100)),
        selectedStock.price * (1 - (selectedStock.change / 100) * 0.8),
        selectedStock.price * (1 - (selectedStock.change / 100) * 0.5),
        selectedStock.price * (1 - (selectedStock.change / 100) * 0.6),
        selectedStock.price * (1 - (selectedStock.change / 100) * 0.3),
        selectedStock.price * (1 - (selectedStock.change / 100) * 0.1),
        selectedStock.price
      ];
      const min = Math.min(...points);
      const max = Math.max(...points);
      const range = max - min || 1;
      return points.map((p, idx) => {
        const x = (idx / (points.length - 1)) * 600;
        const y = 200 - ((p - min) / range) * 160 - 20;
        return { x, y, value: p };
      });
    } else {
      // Portfolio chart: always starts at 0 on Day 1, and goes to the total stocks value on Day 7!
      const totalStocksValue = wallet.holdings.reduce((sum, h) => {
        const currentPrice = stocks.find(s => s.code === h.symbol)?.price || h.averageBuyPrice;
        return sum + (h.quantity * currentPrice);
      }, 0);

      const points = [];
      for (let i = 0; i < 7; i++) {
        const ratio = i / 6; // 0 to 1
        const wave = i === 0 || i === 6 ? 0 : (Math.sin(i) * 0.08); // nice waves
        const val = totalStocksValue * Math.max(0, Math.min(1, ratio + wave));
        points.push(val);
      }

      return points.map((p, idx) => {
        const x = (idx / (points.length - 1)) * 600;
        const y = totalStocksValue > 0 
          ? 200 - (p / totalStocksValue) * 160 - 20 
          : 180; // Flat line at 0 (bottom) if no stocks
        return { x, y, value: p };
      });
    }
  };

  const chartPoints = getChartPoints();
  const isPortfolioUp = selectedStock ? (selectedStock.change >= 0) : (wallet.gainsLosses >= 0);
  const chartColor = isPortfolioUp ? '#009e49' : '#ff3b30';

  const chartPath = chartPoints.reduce((path, pt, idx) => {
    return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y} `;
  }, '');

  return (
    <div className="ivory-theme">
      
      {/* ========================================================
          VIEW 1: LANDING/PRESENTATION PAGE (Ivory theme)
          ======================================================== */}
      {view === 'landing' && (
        <div className="landing-page">
          {/* Header */}
          <header className="navbar">
            <div className="navbar-left">
              <div className="feather-logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 22 L22 2 M12 12 Q17 7 22 2 M12 12 Q7 17 2 22 M22 2 Q14 8 12 12 Q8 14 2 22" />
                </svg>
              </div>
              <span className="logo-text">BAOU</span>
            </div>
            
            <nav className="navbar-links">
              <a href="#features">Nos Services</a>
              <a href="#market-ticker">Bourse BRVM</a>
              <a href="#security">Réglementation SGI</a>
              {token ? (
                <button className="btn-login-landing" onClick={() => setView('dashboard')}>
                  Mon Portefeuille
                </button>
              ) : (
                <button className="btn-login-landing" onClick={() => setShowLoginModal(true)}>
                  Se connecter
                </button>
              )}
            </nav>
          </header>

          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <div className="badge-promo">
                <Zap size={14} className="text-orange" />
                <span>Fintech Ivoirienne en partenariat avec les SGI agréées</span>
              </div>
              
              <h1 className="hero-title">
                L'investissement intelligent à la <span>BRVM</span>, enfin accessible.
              </h1>
              
              <p className="hero-desc font-serif">
                Faites fructifier votre épargne en achetant les actions majeures de l'Afrique de l'Ouest. DCA automatisé, et rechargement ultra-sécurisé par <strong>Wave, Orange et MTN Mobile Money</strong>.
              </p>

              <div className="hero-buttons">
                <button className="btn-primary-action" onClick={() => setView('register')}>
                  Commencer à investir <ArrowRight size={18} />
                </button>
                <a href="#market-ticker" className="btn-secondary-action">
                  Consulter le marché
                </a>
              </div>

              {/* Partner Badges */}
              <div className="partner-section">
                <span className="partner-label">Conformité légale & Sécurité :</span>
                <div className="partner-logos">
                  <span className="partner-tag"><ShieldCheck size={14} /> Comptes Titres SGI Agréées</span>
                  <span className="partner-tag"><Coins size={14} /> Régulé par l'AMF-UMOA</span>
                </div>
              </div>
            </div>

            {/* Preview Card */}
            <div className="hero-visual">
              {top20Gainers.length > 0 ? (
                (() => {
                  const topStock = top20Gainers[0];
                  return (
                    <div className="glass-card preview-card" onClick={() => { setSelectedStock(topStock); setView('dashboard'); }} style={{ cursor: 'pointer' }}>
                      <div className="preview-header">
                        <span className="preview-ticker">{topStock.code}</span>
                        <span className="preview-badge-up">+{topStock.change}%</span>
                      </div>
                      <div className="preview-price">{topStock.price.toLocaleString()} FCFA</div>
                      <div className="preview-chart">
                        <svg width="100%" height="90" viewBox="0 0 200 90" className="overflow-visible">
                          <defs>
                            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#009e49" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#009e49" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path 
                            d="M 0 80 Q 40 75 80 50 T 160 25 T 200 15 L 200 90 L 0 90 Z" 
                            fill="url(#heroGrad)"
                          />
                          <path 
                            d="M 0 80 Q 40 75 80 50 T 160 25 T 200 15" 
                            fill="none" 
                            stroke="#009e49" 
                            strokeWidth="3" 
                            strokeLinecap="round"
                          />
                          <circle cx="200" cy="15" r="4" fill="#009e49" />
                        </svg>
                      </div>
                      <div className="preview-footer">
                        <span>Top Hausse BRVM (Sika Finance)</span>
                        <span className="indicator-dot"></span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="glass-card preview-card">
                  <div className="preview-header">
                    <span className="preview-ticker">SNTS</span>
                    <span className="preview-badge-up">+3.68%</span>
                  </div>
                  <div className="preview-price">31 000 FCFA</div>
                  <div className="preview-chart">
                    <svg width="100%" height="90" viewBox="0 0 200 90">
                      <path d="M 0 60 Q 40 50 80 30 T 160 10 T 200 8" fill="none" stroke="#009e49" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <div className="preview-footer">
                    <span>DCA Autopilot Actif</span>
                    <span className="indicator-dot"></span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Core Features Grid */}
          <section id="features" className="features-section">
            <h2 className="section-header-landing text-center">Une plateforme d'épargne moderne et réglementée</h2>
            <div className="features-grid">
              
              <div className="feature-card">
                <div className="icon-wrapper bg-orange-light">
                  <Zap size={24} className="text-orange" />
                </div>
                <h3>Mobile Money Instantané</h3>
                <p>Déposez et retirez vos fonds directement via <strong>Wave, Orange Money et MTN Money</strong>. Pas besoin de carte bancaire ni de virement complexe.</p>
              </div>

              <div className="feature-card">
                <div className="icon-wrapper bg-green-light">
                  <Clock size={24} className="text-green" />
                </div>
                <h3>Épargne Programmée DCA</h3>
                <p>Achetez vos actions à votre rythme en planifiant vos prélèvements récurrents. Une méthode idéale pour lisser les fluctuations boursières.</p>
              </div>

              <div className="feature-card">
                <div className="icon-wrapper bg-orange-light">
                  <ShieldCheck size={24} className="text-orange" />
                </div>
                <h3>Titres inscrits en SGI</h3>
                <p>BAOU s'associe aux SGI (Sociétés de Gestion et d'Intermédiation) ivoiriennes habilitées par l'AMF-UMOA pour garantir la légitimité de vos comptes.</p>
              </div>

              <div className="feature-card">
                <div className="icon-wrapper bg-green-light">
                  <TrendingUp size={24} className="text-green" />
                </div>
                <h3>Données en direct</h3>
                <p>Intégration transparente pour suivre l'évolution quotidienne de la BRVM. Consultez l'historique et les statistiques clés de vos actifs préférés.</p>
              </div>

            </div>
          </section>

          {/* Live Market Price Ticker — Top 20 Hausses + 5 Baisses Faibles */}
          <section id="market-ticker" className="market-ticker-section">
            <div className="section-header-row text-center" style={{ marginBottom: '32px' }}>
              <h2 className="section-header-landing" style={{ margin: 0 }}>Cours BRVM en direct</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>Cotations officielles BRVM · Actualisées à chaque séance.</p>
            </div>

            {/* Section : Toutes les actions de la BRVM */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <TrendingUp size={20} style={{ color: '#007a78' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#007a78' }}>Toutes les actions de la BRVM</h3>
              </div>
              <div className="ticker-cards-grid">
                {stocks.map(s => (
                  <div key={s.code} className="ticker-card glass-card" onClick={() => { setSelectedStock(s); setView('dashboard'); }} style={{ cursor: 'pointer' }}>
                    <div className="ticker-meta">
                      <span className="ticker-symbol">{s.code}</span>
                      <span className={`ticker-change ${s.change >= 0 ? 'up' : 'down'}`}>
                        {s.change >= 0 ? '+' : ''}{s.change}%
                      </span>
                    </div>
                    <div className="ticker-company-name">{s.name}</div>
                    <div className="ticker-price">{s.price.toLocaleString()} F</div>
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {renderSparkline(s.change)}
                      <span className="ticker-action-link">Acheter <ArrowUpRight size={14} /></span>
                    </div>
                  </div>
                ))}
                {stocks.length === 0 && (
                  <p style={{ color: '#94a3b8', padding: '16px' }}>Chargement des cotations en cours...</p>
                )}
              </div>
            </div>
          </section>

          {/* Security & Regulatory Section */}
          <section id="security" className="security-section">
            <h2 className="section-header-landing text-center">Réglementation & Sécurité SGI</h2>
            <p className="text-center text-gray" style={{ maxWidth: '650px', margin: '-30px auto 48px auto', fontSize: '0.95rem' }}>
              BAOU opère en conformité avec l'Instruction n°065/CREPMF/2021 de l'AMF-UMOA pour garantir la protection de vos avoirs et de vos transactions.
            </p>

            <div className="security-grid">
              <div className="security-card">
                <div className="security-card-header">
                  <ShieldCheck size={20} className="text-orange" />
                  <h4>Monopole de Négociation</h4>
                </div>
                <p>Seules les SGI agréées possèdent le droit légal d'exécuter des transactions sur le marché de la BRVM. BAOU agit comme apporteur d'affaires technologique routant vos ordres vers notre SGI partenaire.</p>
              </div>

              <div className="security-card">
                <div className="security-card-header">
                  <Coins size={20} className="text-green" />
                  <h4>Règle de Provision Préalable</h4>
                </div>
                <p>Conformément à l'Article 54, tout ordre d'achat requiert une provision suffisante (montant de l'ordre + frais de courtage estimés) disponible sur votre compte boursier avant sa transmission au marché.</p>
              </div>

              <div className="security-card">
                <div className="security-card-header">
                  <Clock size={20} className="text-orange" />
                  <h4>Types et Durées des Ordres</h4>
                </div>
                <p>Vos ordres bénéficient des durées officielles : Ordre Jour (expire à 16h00 UTC), Ordre Mensuel (fin de mois en cours), et Ordre à Révocation (GTC) d'une durée maximale stricte de 90 jours calendaires.</p>
              </div>

              <div className="security-card">
                <div className="security-card-header">
                  <Lock size={20} className="text-green" />
                  <h4>Séparation & Sécurité des Fonds</h4>
                </div>
                <p>BAOU ne conserve pas vos fonds. Vos dépôts et retraits Mobile Money transitent via un agrégateur agréé par la BCEAO directement vers le compte de règlement de la SGI partenaire. Communications chiffrées en TLS 1.3.</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="landing-footer">
            <div className="footer-content">
              <span className="logo-text">BAOU</span>
              <p className="regulatory-text">
                BAOU est un intermédiaire de technologie financière. Les transactions de titres financiers et la garde de comptes d'investissements sont opérées exclusivement par les Sociétés de Gestion et d'Intermédiation (SGI) agréées par l'AMF-UMOA de l'UEMOA. L'investissement sur les marchés de capitaux présente un risque de perte.
              </p>
              <div className="footer-credits">
                © 2026 BAOU - Abidjan, Côte d'Ivoire. Tous droits réservés.
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================
          VIEW 2: REGISTRATION & KYC VERIFICATION ONBOARDING
          ======================================================== */}
      {view === 'register' && (
        <div className="register-page">
          <header className="navbar">
            <div className="navbar-left" onClick={() => setView('landing')} style={{ cursor: 'pointer' }}>
              <div className="feather-logo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 22 L22 2 M12 12 Q17 7 22 2 M12 12 Q7 17 2 22 M22 2 Q14 8 12 12 Q8 14 2 22" />
                </svg>
              </div>
              <span className="logo-text">BAOU</span>
            </div>
            <button className="btn-login-landing" onClick={() => setView('landing')}>Retour</button>
          </header>

          <div className="register-container">
            <div className="register-card">
              <div className="register-header text-center">
                <h1 className="register-title">Création de Compte Titres</h1>
                <p className="register-subtitle">Veuillez renseigner vos informations et téléverser vos documents réglementaires KYC.</p>
              </div>

              {regSuccess ? (
                <div className="success-box text-center">
                  <CheckCircle2 className="text-green mx-auto mb-4" size={48} />
                  <h3>Compte créé avec succès !</h3>
                  <p className="mt-2 text-gray text-sm">Votre dossier KYC a été transmis à la SGI pour validation. Redirection vers la connexion...</p>
                </div>
              ) : (
                <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                  {regError && (
                    <div className="error-box flex gap-2 items-center">
                      <AlertCircle className="text-danger" size={18} />
                      <span className="text-sm">{regError}</span>
                    </div>
                  )}

                  <div className="grid-2-cols">
                    <div className="form-group">
                      <label>Prénom</label>
                      <input type="text" value={regFirstName} onChange={e => setRegFirstName(e.target.value)} placeholder="Jean" required />
                    </div>
                    <div className="form-group">
                      <label>Nom</label>
                      <input type="text" value={regLastName} onChange={e => setRegLastName(e.target.value)} placeholder="Koffi" required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Adresse Email</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="jean.koffi@gmail.com" required />
                  </div>

                  <div className="form-group">
                    <label>SGI Partenaire (Routage réglementaire de vos ordres)</label>
                    <select value={regSgi} onChange={e => setRegSgi(e.target.value)} required className="w-full form-select" style={{ padding: '10px 14px', borderRadius: '8px', border: '2px solid var(--border-light)', backgroundColor: '#ffffff', color: 'var(--text-dark)' }}>
                      {sgiList.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {sgiList.length === 0 && (
                        <option value="Société Générale Capital Securities">Société Générale Capital Securities</option>
                      )}
                    </select>
                  </div>

                  <div className="grid-3-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Téléphone Réglementaire</label>
                      <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+22507..." required />
                    </div>
                    <div className="form-group">
                      <label>Numéro WhatsApp (Exigé)</label>
                      <input type="tel" value={regWhatsappPhone} onChange={e => setRegWhatsappPhone(e.target.value)} placeholder="+22507..." required />
                    </div>
                    <div className="form-group">
                      <label>Mot de passe</label>
                      <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••••" required />
                    </div>
                  </div>

                  {/* KYC DOCUMENTS UPLOAD SECTION */}
                  <div className="kyc-upload-section">
                    <h4 className="kyc-section-title">Documents Réglementaires Requis (KYC)</h4>
                    <p className="kyc-section-desc">Format PDF ou Image (JPEG/PNG) accepté. Maximum 5 Mo par document.</p>

                    <div className="document-upload-row">
                      <div className="doc-info">
                        <span className="doc-label">1. Pièce d'identité en cours de validité</span>
                        <span className="doc-sublabel">CNI ivoirienne, Passeport, ou Carte Consulaire</span>
                      </div>
                      <div className="file-uploader-box">
                        <Upload size={16} />
                        <select onChange={e => setIdFile(e.target.value)} required className="file-select-mock">
                          <option value="">Sélectionner...</option>
                          <option value="cni_recto_verso.pdf">cni_recto_verso.pdf</option>
                          <option value="passeport_biometrique.pdf">passeport_biometrique.pdf</option>
                        </select>
                      </div>
                    </div>

                    <div className="document-upload-row">
                      <div className="doc-info">
                        <span className="doc-label">2. Photo d'identité récente</span>
                        <span className="doc-sublabel">Photo nette sur fond neutre (format passeport)</span>
                      </div>
                      <div className="file-uploader-box">
                        <Upload size={16} />
                        <select onChange={e => setPhotoFile(e.target.value)} required className="file-select-mock">
                          <option value="">Sélectionner...</option>
                          <option value="photo_koffi.jpg">photo_koffi.jpg</option>
                          <option value="photo_profil.png">photo_profil.png</option>
                        </select>
                      </div>
                    </div>

                    <div className="document-upload-row">
                      <div className="doc-info">
                        <span className="doc-label">3. Justificatif de domicile de moins de 3 mois</span>
                        <span className="doc-sublabel">Facture d'électricité (CIE) ou d'eau (SODECI) à votre nom</span>
                      </div>
                      <div className="file-uploader-box">
                        <Upload size={16} />
                        <select onChange={e => setAddressFile(e.target.value)} required className="file-select-mock">
                          <option value="">Sélectionner...</option>
                          <option value="facture_cie_avril2026.pdf">facture_cie_avril2026.pdf</option>
                          <option value="facture_sodeci_mars2026.pdf">facture_sodeci_mars2026.pdf</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* PROFIL INVESTISSEUR AMF-UMOA */}
                  <div className="kyc-upload-section" style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                    <h4 className="kyc-section-title">Profil d'Investisseur Réglementaire (LBC/FT)</h4>
                    <p className="kyc-section-desc" style={{ marginBottom: '16px' }}>Ces informations permettent de vérifier l'adéquation de vos transactions avec vos objectifs financiers.</p>

                    <div className="grid-2-cols" style={{ gap: '16px' }}>
                      <div className="form-group">
                        <label>Objectif d'Investissement</label>
                        <select value={regObjective} onChange={e => setRegObjective(e.target.value)} required className="w-full" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                          <option value="EPARGNE">Épargne & Valorisation de capital</option>
                          <option value="REVENUS">Recherche de dividendes réguliers</option>
                          <option value="SPECULATION">Opérations spéculatives court terme</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Aversion au Risque</label>
                        <select value={regProfile} onChange={e => setRegProfile(e.target.value)} required className="w-full" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                          <option value="PRUDENT">Prudent (Fluctuations faibles, ex: CIE, SODECI)</option>
                          <option value="MODERE">Modéré (Actions majeures, ex: SONATEL, SGBCI)</option>
                          <option value="DYNAMIQUE">Audacieux (Croissance, forte volatilité)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label>Horizon de Placement</label>
                      <select value={regHorizon} onChange={e => setRegHorizon(e.target.value)} required className="w-full" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        <option value="COURT_TERME">Court terme (Moins de 2 ans)</option>
                        <option value="MOYEN_TERME">Moyen terme (2 à 5 ans)</option>
                        <option value="LONG_TERME">Long terme (Plus de 5 ans)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group checkbox-row">
                    <input type="checkbox" id="consent" checked={regConsent} onChange={e => setRegConsent(e.target.checked)} required />
                    <label htmlFor="consent">Je certifie l'exactitude des informations fournies et accepte la vérification de mes justificatifs par la SGI.</label>
                  </div>

                  <div className="form-group checkbox-row" style={{ marginTop: '10px' }}>
                    <input type="checkbox" id="consentWhatsApp" checked={regConsentWhatsApp} onChange={e => setRegConsentWhatsApp(e.target.checked)} />
                    <label htmlFor="consentWhatsApp">Je consens à recevoir mes alertes boursières et de mouvements de fonds via **WhatsApp** (à la place du SMS).</label>
                  </div>

                  <button type="submit" className="btn-primary-action w-full" style={{ marginTop: '20px' }}>Soumettre mon dossier KYC & Profil</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 3: THE INTERACTIVE INVESTOR DASHBOARD (Robinhood clone)
          ======================================================== */}
      {view === 'dashboard' && (
        <>
          {/* Header Navbar premium de style Crédit Agricole */}
          <header className="navbar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 40px',
            height: '70px',
            position: 'sticky',
            top: 0,
            zIndex: 1000
          }}>
            {/* Left: CA Logo & Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div className="feather-logo" onClick={() => { setSelectedStock(null); setActiveTab('market'); }} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <svg width="36" height="30" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 25C15 25 25 5 35 5" stroke="#007a78" strokeWidth="5" strokeLinecap="round" />
                  <path d="M10 15C18 15 26 5 32 5" stroke="#009e49" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>

              <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <a 
                  onClick={() => { setSelectedStock(null); setActiveTab('market'); }} 
                  style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: activeTab === 'market' && !selectedStock ? '700' : '600', 
                    color: activeTab === 'market' && !selectedStock ? '#007a78' : '#475569',
                    borderBottom: activeTab === 'market' && !selectedStock ? '2px solid #007a78' : 'none',
                    paddingBottom: '20px',
                    marginTop: '16px',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                >
                  Marché BRVM
                </a>
                <a 
                  onClick={() => { setSelectedStock(null); setActiveTab('portfolio'); }} 
                  style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: activeTab === 'portfolio' && !selectedStock ? '700' : '600', 
                    color: activeTab === 'portfolio' && !selectedStock ? '#007a78' : '#475569',
                    borderBottom: activeTab === 'portfolio' && !selectedStock ? '2px solid #007a78' : 'none',
                    paddingBottom: '20px',
                    marginTop: '16px',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                >
                  Portefeuille
                </a>
                <a 
                  onClick={() => { setActiveTab('dca'); setSelectedStock(null); }} 
                  style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: activeTab === 'dca' ? '700' : '600', 
                    color: activeTab === 'dca' ? '#007a78' : '#475569',
                    borderBottom: activeTab === 'dca' ? '2px solid #007a78' : 'none',
                    paddingBottom: '20px',
                    marginTop: '16px',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                >
                  Plans DCA
                </a>
                <a 
                  onClick={() => { setActiveTab('history'); setSelectedStock(null); }} 
                  style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: activeTab === 'history' ? '700' : '600', 
                    color: activeTab === 'history' ? '#007a78' : '#475569',
                    borderBottom: activeTab === 'history' ? '2px solid #007a78' : 'none',
                    paddingBottom: '20px',
                    marginTop: '16px',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                >
                  Historique
                </a>
                <a 
                  onClick={() => { setActiveTab('profile'); setSelectedStock(null); }} 
                  style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: activeTab === 'profile' ? '700' : '600', 
                    color: activeTab === 'profile' ? '#007a78' : '#475569',
                    borderBottom: activeTab === 'profile' ? '2px solid #007a78' : 'none',
                    paddingBottom: '20px',
                    marginTop: '16px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Mon Compte SGI ▾
                </a>
              </nav>
            </div>

            {/* Middle: Search Input (Rounded and elegant) */}
            <div className="search-container" style={{ position: 'relative', width: '320px', margin: '0 24px' }}>
              <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
              <input 
                type="text" 
                placeholder="Rechercher une action..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 16px 9px 40px',
                  fontSize: '0.85rem',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
              {searchQuery && (
                <div className="search-dropdown no-scrollbar" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  borderRadius: '12px',
                  marginTop: '8px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  zIndex: 2000,
                  border: '1px solid #cbd5e1'
                }}>
                  {filteredStocks.map(s => (
                    <div 
                      key={s.code} 
                      className="search-result-item" 
                      onClick={() => { setSelectedStock(s); setSearchQuery(''); }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <span className="ticker" style={{ fontWeight: 'bold', color: '#007a78' }}>{s.code}</span>
                      <span className="name" style={{ color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{s.name}</span>
                      <span className="price" style={{ fontWeight: 'bold' }}>{s.price.toLocaleString()} F</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Watchlist & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.82rem', 
                  color: '#475569', 
                  fontWeight: '600', 
                  cursor: 'pointer' 
                }}
                onClick={() => {
                  setSelectedStock(null);
                  setActiveTab('market');
                }}
              >
                ⭐ <span style={{ textDecoration: 'underline' }}>Mes valeurs suivies</span>
              </div>

              {user && (
                <button 
                  className="btn-logout" 
                  onClick={() => { setToken(null); setView('landing'); }}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#475569',
                    transition: 'all 0.2s'
                  }}
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </header>

          {/* Main Page Grid */}
          <div className={
            (activeTab === 'portfolio' || (activeTab === 'market' && selectedStock)) 
              ? "grid-container" 
              : "grid-container-full"
          }>
            
            {/* Left Column: Chart & Market Info */}
            <div className="column-left">
              {activeTab === 'portfolio' || selectedStock ? (
                <>
                  {/* Profile/Stock Title */}
                  <div className="title-section">
                    <h1 className="main-title">
                      {selectedStock ? `${selectedStock.code}` : "Mon Portefeuille"}
                    </h1>
                    <h2 className="price-display">
                      {hoveredValue 
                        ? hoveredValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) 
                        : (selectedStock ? selectedStock.price : wallet.totalValue).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                    </h2>
                    <p className={`perf-text ${isPortfolioUp ? 'up' : 'down'}`}>
                      {selectedStock 
                        ? `${selectedStock.change >= 0 ? '+' : ''}${selectedStock.change}% Aujourd'hui`
                        : `${wallet.gainsLosses >= 0 ? '+' : ''}${wallet.gainsLosses.toLocaleString()} FCFA (${wallet.performancePercent}%) Latent`
                      }
                    </p>
                  </div>

                  {/* Main SVG Neon Chart */}
                  <div className="chart-wrapper">
                    <svg width="100%" height="220" viewBox="0 0 600 220" className="rh-chart">
                      <path 
                        d={chartPath} 
                        fill="none" 
                        stroke={chartColor} 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                      {chartPoints.map((pt, idx) => (
                        <circle 
                          key={idx}
                          cx={pt.x} 
                          cy={pt.y} 
                          r="12" 
                          fill="transparent" 
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => {
                            setHoveredValue(pt.value);
                            setHoveredTime(idx === chartPoints.length - 1 ? "Maintenant" : `Point ${idx + 1}`);
                          }}
                          onMouseLeave={() => {
                            setHoveredValue(null);
                            setHoveredTime(null);
                          }}
                        />
                      ))}
                    </svg>
                    {hoveredTime && (
                      <div className="chart-tooltip-indicator">
                        {hoveredTime}
                      </div>
                    )}
                  </div>

                  {/* Chart Timeframes */}
                  <div className="timeframe-buttons">
                    {['1J', '1S', '1M', '3M', '1A', 'TOUT'].map(tf => (
                      <button 
                        key={tf} 
                        className={`tf-btn ${timeframe === tf ? 'active' : ''} ${isPortfolioUp ? 'green-accent' : 'red-accent'}`}
                        onClick={() => setTimeframe(tf)}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  {/* Company Info */}
                  <div className="section-divider"></div>
                  
                  {selectedStock ? (
                    <div style={{ marginTop: '24px' }}>
                      {/* Sub-Header Tabs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>Bienvenue sur la fiche de {selectedStock.code}</h2>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', fontWeight: '600', color: '#007a78', marginTop: '4px' }}>
                          <span style={{ borderBottom: '2px solid #007a78', paddingBottom: '4px', cursor: 'pointer' }}>Fiche Sika Finance</span>
                          <span style={{ color: '#64748b', cursor: 'pointer' }}>Indices & événements</span>
                          <span style={{ color: '#64748b', cursor: 'pointer' }}>Actualités de la société</span>
                        </div>
                      </div>

                      {/* Main Vision Globale Card */}
                      <div style={{
                        background: '#007a78',
                        borderRadius: '16px',
                        padding: '24px',
                        color: '#ffffff',
                        boxShadow: '0 8px 24px rgba(0, 122, 120, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '0.02em' }}>Ma vision globale</span>
                          <a 
                            href={`https://www.sikafinance.com/marches/cotation_${selectedStock.code}.ci`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#ffffff',
                              border: '1px solid rgba(255, 255, 255, 0.4)',
                              borderRadius: '20px',
                              padding: '6px 14px',
                              textDecoration: 'none',
                              background: 'rgba(255, 255, 255, 0.1)',
                              transition: 'all 0.2s'
                            }}
                          >
                            Données Sika Finance ↗
                          </a>
                        </div>

                        {/* Content Box (White card inside the green card) */}
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '12px',
                          color: '#0f172a',
                          padding: '24px',
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 2fr',
                          gap: '24px',
                          alignItems: 'stretch'
                        }}>
                          {/* Left side: identity */}
                          <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: '700',
                                background: '#e6f2f2',
                                color: '#007a78',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                Société Cotée
                              </span>
                              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '10px', color: '#0f172a', lineHeight: '1.2' }}>
                                {selectedStock.name}
                              </h3>
                              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                Symbole: {selectedStock.code}
                              </p>
                            </div>
                            
                            <div style={{ marginTop: '20px' }}>
                              <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#007a78' }}>
                                {selectedStock.price.toLocaleString()} F
                              </span>
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                color: selectedStock.change >= 0 ? '#059669' : '#dc2626'
                              }}>
                                {selectedStock.change >= 0 ? '▲' : '▼'} {selectedStock.change}%
                              </span>
                            </div>
                          </div>

                          {/* Right side: 2x3 statistics grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                            
                            {/* Stat 1: Volume Titres */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                💼
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>Volume (Titres)</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                                  {(selectedStock.volumeShares || 2800).toLocaleString('fr-FR').replace(/\u202f/g, ' ').replace(/\xa0/g, ' ')}
                                </div>
                              </div>
                            </div>

                            {/* Stat 2: Volume FCFA */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                💳
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>Volume (FCFA)</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                                  {(selectedStock.volumeXof || (selectedStock.price * 2800)).toLocaleString('fr-FR').replace(/\u202f/g, ' ').replace(/\xa0/g, ' ')} F
                                </div>
                              </div>
                            </div>

                            {/* Stat 3: Ouverture */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                📈
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>Ouverture</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                                  {(selectedStock.open || selectedStock.price).toLocaleString('fr-FR').replace(/\u202f/g, ' ').replace(/\xa0/g, ' ')} F
                                </div>
                              </div>
                            </div>

                            {/* Stat 4: Variation */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                📊
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>Variation (J-1)</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: selectedStock.change >= 0 ? '#059669' : '#dc2626' }}>
                                  {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change}%
                                </div>
                              </div>
                            </div>

                            {/* Stat 5: Plus Haut */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                ▲
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>Plus Haut</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669' }}>
                                  {(selectedStock.high || selectedStock.price).toLocaleString('fr-FR').replace(/\u202f/g, ' ').replace(/\xa0/g, ' ')} F
                                </div>
                              </div>
                            </div>

                            {/* Stat 6: Plus Bas */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fff2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                ▼
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em' }}>Plus Bas</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#dc2626' }}>
                                  {(selectedStock.low || selectedStock.price).toLocaleString('fr-FR').replace(/\u202f/g, ' ').replace(/\xa0/g, ' ')} F
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="premium-table-wrapper" style={{ marginTop: '24px' }}>
                      <div className="premium-table-header">
                        <span className="premium-table-title">💼 Mes Actifs BRVM</span>
                        <span className="premium-table-count">{wallet.holdings.length} valeur{wallet.holdings.length > 1 ? 's' : ''}</span>
                      </div>
                      {wallet.holdings.length === 0 ? (
                        <p style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Aucun titre en portefeuille. Cliquez sur une action pour faire vos premiers pas.</p>
                      ) : (
                        <table className="modern-financial-table">
                          <thead>
                            <tr>
                              <th>Symbole</th>
                              <th>Qté</th>
                              <th>PMP (PRU)</th>
                              <th>Valeur Actuelle</th>
                              <th>Performance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {wallet.holdings.map(h => (
                              <tr
                                key={h.symbol}
                                className="financial-row"
                                onClick={() => {
                                  const matchedStock = stocks.find(s => s.code === h.symbol);
                                  if (matchedStock) setSelectedStock(matchedStock);
                                }}
                              >
                                <td>
                                  <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.9rem' }}>{h.symbol}</span>
                                </td>
                                <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#334155' }}>{h.quantity} titres</td>
                                <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{h.pru.toLocaleString()} F</td>
                                <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>{h.currentValue.toLocaleString()} F</td>
                                <td>
                                  <span className={`profit-badge ${h.profit >= 0 ? 'up' : 'down'}`}>
                                    {h.profit >= 0 ? '+' : ''}{h.profitPercent}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </>
              ) : null}

              {/* MARKET OVERVIEW - MON ESPACE CLIENT */}
              {activeTab === 'market' && !selectedStock && (() => {
                const gainers = stocks.filter(s => s.change > 0).length;
                const losers  = stocks.filter(s => s.change < 0).length;
                return (
                  <div className="market-overview-portal">

                    {/* Header */}
                    <div style={{ marginBottom: '24px' }}>
                      <h1 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.03em' }}>
                        Marché BRVM
                      </h1>
                      <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                        {stocks.length} valeurs cotées · ▲ {gainers} en hausse · ▼ {losers} en baisse
                      </p>
                    </div>

                    {/* Liste des actions — style ticker de la page d'accueil */}
                    <div className="ticker-cards-grid" style={{ marginTop: '16px' }}>
                      {stocks.map(s => {
                        const isUp = s.change >= 0;
                        return (
                          <div 
                            key={s.code} 
                            className="ticker-card glass-card" 
                            onClick={() => setSelectedStock(s)} 
                            style={{ cursor: 'pointer', background: '#ffffff', border: '1px solid #e2e8f0' }}
                          >
                            <div className="ticker-meta">
                              <span className="ticker-symbol" style={{ fontWeight: '800', color: '#0f172a' }}>{s.code}</span>
                              <span className={`ticker-change ${isUp ? 'up' : 'down'}`} style={{ fontWeight: '700', color: isUp ? '#059669' : '#dc2626' }}>
                                {isUp ? '+' : ''}{s.change}%
                              </span>
                            </div>
                            <div className="ticker-company-name" style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 8px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                            <div className="ticker-price" style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a' }}>{s.price.toLocaleString('fr-FR').replace(/\u202f/g, ' ').replace(/\xa0/g, ' ')} F</div>
                            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {renderSparkline(s.change)}
                              <span className="ticker-action-link" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#007a78' }}>
                                Acheter <ArrowUpRight size={14} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* DCA TAB */}
              {activeTab === 'dca' && !selectedStock && (
                <div className="dca-portal">
                  <div className="dca-header">
                    <div>
                      <h1 className="main-title">Autopilot DCA</h1>
                      <p className="subtitle">Investissez de manière récurrente et automatisée sur la BRVM.</p>
                    </div>
                    <button className="btn-dca-add" onClick={() => setShowDcaForm(true)}>Nouveau plan</button>
                  </div>

                  {showDcaForm && (
                    <form onSubmit={handleDcaSubmit} className="dca-creation-form card">
                      <h3 className="card-title">Configurer le prélèvement récurrent</h3>
                      <div className="form-group">
                        <label>Action BRVM Cible</label>
                        <select value={dcaStock} onChange={e => setDcaStock(e.target.value)}>
                          {stocks.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Montant récurrent (FCFA)</label>
                        <input type="number" value={dcaAmount} onChange={e => setDcaAmount(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Périodicité</label>
                        <select value={dcaFrequency} onChange={e => setDcaFrequency(e.target.value)}>
                          <option value="WEEKLY">Hebdomadaire</option>
                          <option value="MONTHLY">Mensuelle</option>
                          <option value="QUARTERLY">Trimestrielle</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn-cancel" onClick={() => setShowDcaForm(false)}>Annuler</button>
                        <button type="submit" className="btn-submit-dca">Activer le plan</button>
                      </div>
                    </form>
                  )}

                  <div className="premium-table-wrapper" style={{ marginTop: '24px' }}>
                    <div className="premium-table-header">
                      <span className="premium-table-title">🤖 Plans DCA Automatiques</span>
                      <span className="premium-table-count">{dcaPlans.length} plan{dcaPlans.length > 1 ? 's' : ''}</span>
                    </div>
                    {dcaPlans.length === 0 ? (
                      <p style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Aucun plan DCA configuré. Cliquez sur « Nouveau plan » pour démarrer.</p>
                    ) : (
                      <table className="modern-financial-table">
                        <thead>
                          <tr>
                            <th>Action Cible</th>
                            <th>Montant / Période</th>
                            <th>Périodicité</th>
                            <th>Prochain Achat</th>
                            <th>Statut</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dcaPlans.map(plan => (
                            <tr key={plan.id}>
                              <td>
                                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.9rem' }}>{plan.symbol}</span>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#334155' }}>{plan.amount.toLocaleString()} XOF</td>
                              <td style={{ color: '#475569' }}>{plan.frequency === 'WEEKLY' ? 'Hebdomadaire' : plan.frequency === 'MONTHLY' ? 'Mensuel' : plan.frequency === 'QUARTERLY' ? 'Trimestriel' : plan.frequency}</td>
                              <td style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.82rem' }}>{plan.nextRun.toString().substring(0, 10)}</td>
                              <td>
                                <button
                                  className={`btn-table-action ${plan.status === 'ACTIVE' ? 'active' : 'inactive'}`}
                                  onClick={() => toggleDca(plan.id)}
                                >
                                  {plan.status === 'ACTIVE' ? '✓ Actif' : '⏸ Suspendu'}
                                </button>
                              </td>
                              <td>
                                <button className="btn-table-delete" onClick={() => deleteDca(plan.id)}>Supprimer</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && !selectedStock && (
                <div className="history-portal">
                  <div className="market-section-header">
                    <h1>Historique des Transactions</h1>
                    <p>Dépôts et retraits traités via Wave, Orange Money et MTN Mobile Money (PawaPay).</p>
                  </div>

                  <div className="premium-table-wrapper">
                    <div className="premium-table-header">
                      <span className="premium-table-title">💳 Relevé de compte Mobile Money</span>
                      <span className="premium-table-count">{transactions.length} opération{transactions.length > 1 ? 's' : ''}</span>
                    </div>
                    {transactions.length === 0 ? (
                      <p style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Aucune transaction enregistrée. Effectuez votre premier dépôt depuis l'onglet Portefeuille.</p>
                    ) : (
                      <table className="modern-financial-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Référence</th>
                            <th>Montant</th>
                            <th>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(t => (
                            <tr key={t.idInternal}>
                              <td style={{ color: '#475569', fontSize: '0.82rem' }}>{new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>{t.idInternal.slice(0, 20)}…</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0f172a', fontSize: '0.92rem' }}>{t.amount.toLocaleString()} XOF</td>
                              <td>
                                <span className={`status-badge ${t.status === 'SUCCES' ? 'success' : t.status === 'ECHEC' ? 'danger' : 'pending'}`}>
                                  {t.status === 'SUCCES' ? '✔ Validé' : t.status === 'ECHEC' ? '✕ Échoué' : '⏳ En cours'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* PROFILE & SGI TAB */}
              {activeTab === 'profile' && !selectedStock && (
                <div className="profile-portal">
                  <h1 className="main-title">Mon Compte Titres & SGI</h1>
                  <p className="subtitle">Informations de conformité et routage réglementaire de vos investissements.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
                    
                    {/* SGI Partner details */}
                    <div className="card">
                      <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck className="text-green" size={20} /> SGI Partenaire Agréée
                      </h3>
                      <div style={{ marginTop: '16px', spaceY: '12px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                          {user?.sgiPartenaire || "Société Générale Capital Securities"}
                        </div>
                        <p className="text-gray text-xs mt-1">
                          Votre compte-titres est hébergé et vos fonds sont garantis légalement par notre SGI partenaire régulée par l'AMF-UMOA.
                        </p>
                        
                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                          <span className="text-gray text-xs block">Statut KYC de conformité LBC/FT :</span>
                          <span className={`status-badge ${user?.kycStatus === 'APPROUVE' ? 'success' : 'pending'}`} style={{ marginTop: '6px', display: 'inline-block' }}>
                            {user?.kycStatus === 'APPROUVE' ? 'COMPTE ACTIVÉ' : 'VÉRIFICATION EN COURS'}
                          </span>
                        </div>

                        <div style={{ marginTop: '24px' }}>
                          {/* Simulated contract download link */}
                          <a 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              alert(`Téléchargement de la "Convention d'Apporteur d'Affaires & Compte Titres" signée électroniquement entre BAOU, ${user?.sgiPartenaire || "la SGI"} et ${user?.firstName} ${user?.lastName}.\n\nRéférence : CONV-SGI-${user?.id?.substring(0,8).toUpperCase()}`);
                            }}
                            className="btn-primary-action" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '0.85rem', width: 'auto' }}
                          >
                            <FileText size={16} /> Convention de Compte-Titres (PDF)
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Investor profile details */}
                    <div className="card">
                      <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User className="text-orange" size={20} /> Questionnaire Profil Investisseur
                      </h3>
                      
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <span className="text-gray text-xs block">Aversion au Risque :</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>
                            {user?.investorProfile === 'PRUDENT' ? 'Prudent (Dividendes / Défensif)' : user?.investorProfile === 'DYNAMIQUE' ? 'Audacieux (Croissance / PME)' : 'Modéré (Actions majeures)'}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray text-xs block">Horizon de Placement :</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>
                            {user?.investorHorizon === 'COURT_TERME' ? 'Court terme (Moins de 2 ans)' : user?.investorHorizon === 'LONG_TERME' ? 'Long terme (Plus de 5 ans)' : 'Moyen terme (2 à 5 ans)'}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray text-xs block">Objectif Financier Principal :</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>
                            {user?.investorObjective === 'REVENUS' ? 'Recherche de dividendes réguliers' : user?.investorObjective === 'SPECULATION' ? 'Opérations spéculatives court terme' : 'Épargne & Valorisation de capital'}
                          </span>
                        </div>

                        <div style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-light)', border: '1px solid var(--border-light)' }}>
                          <p className="text-xs text-gray" style={{ margin: 0 }}>
                            💬 **Consentement de notification :** Les alertes d'exécution et de mouvements de fonds seront acheminées vers votre numéro de téléphone via **WhatsApp** ({user?.phone}).
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Sticky Trading Panel & Assets List */}
            <aside className="column-right">
              
              {/* WALLET TAB RIGHT COLUMN: WALLET & DEPOT/RETRAIT */}
              {activeTab === 'portfolio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Wallet Balance Card */}
                  <div className="card shadow-md" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', color: '#ffffff', padding: '24px', borderRadius: '16px', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
                      <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portefeuille Cash (Wallet)</span>
                      <ShieldCheck size={18} />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 'bold', marginTop: '12px' }}>
                      {wallet.cashBalance.toLocaleString()} FCFA
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', fontSize: '0.8rem' }}>
                      <div>
                        <span style={{ opacity: 0.7, display: 'block', marginBottom: '4px' }}>Solde Disponible</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#4ade80' }}>{(wallet.availableBalance || 0).toLocaleString()} F</span>
                      </div>
                      <div>
                        <span style={{ opacity: 0.7, display: 'block', marginBottom: '4px' }}>Provision Bloquée</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#f87171' }}>{(wallet.frozenBalance || 0).toLocaleString()} F</span>
                      </div>
                    </div>
                  </div>

                  {/* Deposit & Withdraw Quick Widget */}
                  <div className="card shadow-sm" style={{ padding: '20px', borderRadius: '16px', background: '#ffffff', border: '1px solid var(--border-light)' }}>
                    <h3 className="card-title" style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#0f172a' }}>
                      <Coins size={18} className="text-orange" /> Transactions Financières (PawaPay)
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '16px 0', padding: '4px', background: '#f1f5f9', borderRadius: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => setTxType('DEPOT')} 
                        style={{ padding: '8px', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', borderRadius: '6px', background: txType === 'DEPOT' ? '#ffffff' : 'transparent', color: txType === 'DEPOT' ? '#0f172a' : '#64748b', transition: 'all 0.2s', cursor: 'pointer', boxShadow: txType === 'DEPOT' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                      >
                        Déposer
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTxType('RETRAIT')} 
                        style={{ padding: '8px', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', borderRadius: '6px', background: txType === 'RETRAIT' ? '#ffffff' : 'transparent', color: txType === 'RETRAIT' ? '#0f172a' : '#64748b', transition: 'all 0.2s', cursor: 'pointer', boxShadow: txType === 'RETRAIT' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                      >
                        Retirer
                      </button>
                    </div>

                    <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Opérateur</label>
                        <select value={depositOperator} onChange={e => setDepositOperator(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.85rem', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff' }}>
                          <option value="Wave">Wave Côte d'Ivoire</option>
                          <option value="Orange">Orange Money</option>
                          <option value="MTN">MTN Mobile Money</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Montant (FCFA)</label>
                        <input 
                          type="number" 
                          value={depositAmount} 
                          onChange={e => setDepositAmount(e.target.value)} 
                          required 
                          style={{ padding: '8px 12px', fontSize: '0.85rem', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          placeholder="Ex: 50000"
                        />
                      </div>

                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>Numéro de téléphone</label>
                        <input 
                          type="tel" 
                          value={depositPhone} 
                          onChange={e => setDepositPhone(e.target.value)} 
                          required 
                          style={{ padding: '8px 12px', fontSize: '0.85rem', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          placeholder="Ex: +225..."
                        />
                      </div>

                      <button type="submit" className="btn-primary-action w-full" style={{ padding: '10px', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '6px' }}>
                        {txType === 'DEPOT' ? 'Confirmer le Dépôt' : 'Confirmer le Retrait'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* MARKET TAB RIGHT COLUMN: ROBINHOOD BUY/SELL & WATCHLIST */}
              {activeTab === 'market' && (
                <>
                  {/* Robinhood Buy/Sell Card */}
                  {selectedStock && (
                    <div className="trading-card card">
                      <div className="trading-tabs">
                        <button className={`tab-btn ${tradeType === 'ACHAT' ? 'active' : ''}`} onClick={() => setTradeType('ACHAT')}>Acheter {selectedStock.code}</button>
                        <button className={`tab-btn ${tradeType === 'VENTE' ? 'active' : ''}`} onClick={() => setTradeType('VENTE')}>Vendre {selectedStock.code}</button>
                      </div>

                      <form onSubmit={handleOrderSubmit} className="trading-form">
                        <div className="form-row">
                          <span>Investir en</span>
                          <select value={tradeMode} onChange={e => setTradeMode(e.target.value)}>
                            <option value="SHARES">Titres</option>
                          </select>
                        </div>

                        <div className="form-row">
                          <span>Quantité</span>
                          <input 
                            type="number" 
                            value={tradeQty} 
                            onChange={e => setTradeQty(e.target.value)} 
                            min="1" 
                            required 
                          />
                        </div>

                        <div className="form-row text-secondary">
                          <span>Cours du marché</span>
                          <span className="font-bold">{selectedStock.price.toLocaleString()} F</span>
                        </div>

                        <div className="section-divider"></div>

                        <div className="form-row total-row">
                          <span>Coût estimé</span>
                          <span className="total-val">
                            {Math.round(Number(tradeQty) * selectedStock.price * (tradeType === 'ACHAT' ? 1.015 : 1)).toLocaleString()} FCFA
                          </span>
                        </div>
                        <button type="submit" className={`btn-submit-order ${tradeType === 'ACHAT' ? 'buy' : 'sell'}`}>
                          Transmettre l'ordre
                        </button>
                      </form>

                      <div className="card-footer">
                        {(wallet.availableBalance || 0).toLocaleString()} FCFA disponibles dans votre Wallet
                      </div>
                    </div>
                  )}
                </>
              )}

            </aside>

          </div>

          {/* Deposit / Withdrawal Modal */}
          {showDepositModal && (
            <div className="modal-overlay">
              <form className="modal-content" onSubmit={handleDepositSubmit}>
                <h3 className="modal-title">{txType === 'DEPOT' ? 'Recharger' : 'Retirer des fonds'} via Wave / Orange / MTN</h3>
                <div className="form-group">
                  <label>Opérateur</label>
                  <select value={depositOperator} onChange={e => setDepositOperator(e.target.value)}>
                    <option value="Wave">Wave Côte d'Ivoire</option>
                    <option value="Orange">Orange Money</option>
                    <option value="MTN">MTN Mobile Money</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Montant (FCFA)</label>
                  <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Numéro de téléphone</label>
                  <input type="tel" value={depositPhone} onChange={e => setDepositPhone(e.target.value)} required />
                </div>
                <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
                  <button type="button" className="btn-cancel" onClick={() => setShowDepositModal(false)}>Annuler</button>
                  <button type="submit" className="btn-submit-dca">{txType === 'DEPOT' ? 'Recharger' : 'Retirer'}</button>
                </div>
              </form>
            </div>
          )}

          {/* Webhook simulator */}
          {showPawaPayModal && (
            <div className="modal-overlay">
              <div className="modal-content text-center">
                <h3 className="modal-title">Paiement Mobile Money</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  {txType === 'DEPOT' 
                    ? `Simulez la saisie du code PIN sur votre mobile pour recharger ${Number(depositAmount).toLocaleString()} XOF.`
                    : `Simulez la confirmation de transfert sur votre mobile pour recevoir le retrait de ${Number(depositAmount).toLocaleString()} XOF.`
                  }
                </p>
                <div className="flex gap-2">
                  <button className="btn-cancel" onClick={() => triggerSandboxWebhook('FAILED')} style={{ flex: 1 }}>Annuler</button>
                  <button className="btn-submit-dca" onClick={() => triggerSandboxWebhook('SUCCESS')} style={{ flex: 1, background: '#009e49' }}>Confirmer (Succès)</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================
          SIGN IN MODAL (Accessible from header)
          ======================================================== */}
      {showLoginModal && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleLoginSubmit}>
            <h3 className="modal-title text-center">Connexion BAOU</h3>
            
            {loginError && (
              <div className="error-box flex gap-2 items-center mb-4">
                <AlertCircle className="text-danger" size={18} />
                <span className="text-sm">{loginError}</span>
              </div>
            )}

            <div className="form-group">
              <label>Email Client</label>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="client@sgi.ci" required />
            </div>
            
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={() => setShowLoginModal(false)}>Annuler</button>
              <button type="submit" className="btn-submit-dca" style={{ flex: 1 }}>Se connecter</button>
            </div>

            <div className="text-center mt-4">
              <span className="text-xs text-gray">Pas encore inscrit ? </span>
              <a onClick={() => { setShowLoginModal(false); setView('register'); }} className="text-xs text-orange font-bold cursor-pointer">Créer un compte</a>
            </div>
          </form>
        </div>
      )}

      {/* WhatsApp floating alert simulator panel */}
      {user && user.consentWhatsApp && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, fontFamily: 'system-ui, sans-serif' }}>
          {/* WhatsApp toggle bubble */}
          <button 
            onClick={() => setShowWhatsAppPanel(!showWhatsAppPanel)} 
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#25D366',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {/* WhatsApp Logo Sim */}
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.022-.08-.124-.184-.245-.244-.12-.06-1.135-.56-1.316-.625-.18-.065-.313-.098-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232zM12 2C6.477 2 2 6.477 2 12c0 2.01.596 3.88 1.616 5.46L2 22l4.755-1.54C8.217 21.43 10.04 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.745 0-3.37-.507-4.743-1.385l-.34-.216-2.822.915.932-2.753-.237-.378C3.868 15.176 3.3 13.164 3.3 11c0-4.797 3.903-8.7 8.7-8.7 4.797 0 8.7 3.903 8.7 8.7s-3.903 8.7-8.7 8.7z"/>
            </svg>
            {whatsappMessages.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: '#ff3b30',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '50%',
                padding: '3px 7px',
                border: '2px solid #ffffff'
              }}>
                {whatsappMessages.length}
              </span>
            )}
          </button>

          {/* WhatsApp messages drawer */}
          {showWhatsAppPanel && (
            <div style={{
              position: 'absolute',
              bottom: '75px',
              right: '0',
              width: '320px',
              height: '400px',
              backgroundColor: '#ece5dd', // WhatsApp background color
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #c0c0c0'
            }}>
              {/* WhatsApp header */}
              <div style={{ backgroundColor: '#075E54', color: '#ffffff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#128C7E', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>B</div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>WhatsApp BAOU & SGI</div>
                  <div style={{ fontSize: '0.65rem', color: '#85E3B3' }}>Compte Professionnel Vérifié</div>
                </div>
              </div>

              {/* Message history */}
              <div className="no-scrollbar" style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {whatsappMessages.map((m, idx) => (
                  <div 
                    key={idx} 
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      maxWidth: '85%',
                      boxShadow: '0 1px 1px rgba(0,0,0,0.06)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#128C7E', marginBottom: '2px' }}>{m.sender}</div>
                    <div style={{ fontSize: '0.78rem', color: '#333333', lineHeight: '1.3' }}>{m.text}</div>
                    <div style={{ fontSize: '0.6rem', color: '#888888', textAlign: 'right', marginTop: '4px' }}>{m.time}</div>
                  </div>
                ))}
                {whatsappMessages.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#888888', fontSize: '0.75rem', marginTop: '150px' }}>Aucune notification WhatsApp reçue.</p>
                )}
              </div>

              {/* Footer */}
              <div style={{ backgroundColor: '#f0f0f0', padding: '8px 12px', textAlign: 'center', fontSize: '0.65rem', color: '#666666', borderTop: '1px solid #e0e0e0' }}>
                🔒 Chiffrement de bout en bout
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
