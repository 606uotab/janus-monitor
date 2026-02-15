import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { QRCodeSVG } from 'qrcode.react';
import {
  secureGetPrices,
  secureFetchBalance,
  validateBackendResponse
} from './secureBackend.js';
import {
  validateAddress,
  preparePivxWalletData,
  getBalance,
  getPrivacyBalance,
  getPrivacyTransactions,
  testPrivacyNode,
  maskSensitiveData,
  getPrivacyCoinConfig,
  getMoneroDefaultNodes,
  COIN_FAMILIES,
  getFamilyFunctions
} from './integrations';
import PendingTransactionsPanel from './PendingTransactionsPanel';
import TokenSearch from './TokenSearch';
import { NoctaliMoon, NoctaliImages, NoctaliStarfield, LunarPunkMoon, LunarPunkDunes, LunarPunkDust, SolarpunkBackground, SolarpunkPollen } from './themes';

// ── SVG Icons ──
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const ChevronIcon = ({ size = 12, className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const CopyIcon = ({ size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const QRCodeIcon = ({ size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/>
    <rect x="2" y="14" width="8" height="8" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3h-3"/><path d="M14 20h3"/><path d="M20 20h0"/>
  </svg>
);
const SaveIcon = ({ size = 16, check = false }) => check ? (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
) : (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);

// ── Theme definitions ──
const themes = {
  dark: {
    bg: 'bg-zinc-950', textMain: 'text-zinc-100', textMuted: 'text-zinc-500', textFaint: 'text-zinc-600',
    cardBg: 'bg-zinc-900', cardBorder: 'border-zinc-800', cardBg2: 'bg-zinc-800/50', cardBorder2: 'border-zinc-700',
    inputBg: 'bg-zinc-800', inputBorder: 'border-zinc-700',
    headerBg: 'bg-zinc-950/95', headerBorder: 'border-zinc-800',
    rowBg: 'bg-zinc-900/50', rowBorder: 'border-zinc-800', rowHover: 'hover:bg-zinc-900',
    dropBg: 'bg-zinc-800', dropBorder: 'border-zinc-700',
    barBg: 'bg-zinc-800', divider: 'border-zinc-800',
    accent: 'text-amber-500', accentBg: 'bg-amber-500', accentBorder: 'border-amber-500',
    accentMuted: 'text-amber-500/70', accentHover: 'hover:bg-amber-400',
  },
  light: {
    bg: 'bg-gray-100', textMain: 'text-gray-900', textMuted: 'text-gray-500', textFaint: 'text-gray-400',
    cardBg: 'bg-white', cardBorder: 'border-gray-200', cardBg2: 'bg-gray-50', cardBorder2: 'border-gray-200',
    inputBg: 'bg-gray-100', inputBorder: 'border-gray-300',
    headerBg: 'bg-gray-100/95', headerBorder: 'border-gray-300',
    rowBg: 'bg-white', rowBorder: 'border-gray-200', rowHover: 'hover:bg-gray-50',
    dropBg: 'bg-white', dropBorder: 'border-gray-200',
    barBg: 'bg-gray-300', divider: 'border-gray-200',
    accent: 'text-amber-500', accentBg: 'bg-amber-500', accentBorder: 'border-amber-500',
    accentMuted: 'text-amber-500/70', accentHover: 'hover:bg-amber-400',
  },
  sepia: {
    bg: 'bg-[#f4efe6]', textMain: 'text-[#433422]', textMuted: 'text-[#8a7560]', textFaint: 'text-[#b0a090]',
    cardBg: 'bg-[#ebe5d8]', cardBorder: 'border-[#d4c8b0]', cardBg2: 'bg-[#e3dccf]', cardBorder2: 'border-[#cfc3ab]',
    inputBg: 'bg-[#e8e0d0]', inputBorder: 'border-[#cfc3ab]',
    headerBg: 'bg-[#f4efe6]/95', headerBorder: 'border-[#d4c8b0]',
    rowBg: 'bg-[#ebe5d8]', rowBorder: 'border-[#d4c8b0]', rowHover: 'hover:bg-[#e3dccf]',
    dropBg: 'bg-[#ebe5d8]', dropBorder: 'border-[#d4c8b0]',
    barBg: 'bg-[#d4c8b0]', divider: 'border-[#d4c8b0]',
    accent: 'text-amber-500', accentBg: 'bg-amber-500', accentBorder: 'border-amber-500',
    accentMuted: 'text-amber-500/70', accentHover: 'hover:bg-amber-400',
  },
  noctali: {
    // Umbreon: corps noir #020303, anneaux dorés #F4D995, yeux cramoisis #E07451
    bg: 'bg-[#060810]', textMain: 'text-[#d0d2d8]', textMuted: 'text-[#5a6070]', textFaint: 'text-[#3a4050]',
    cardBg: 'bg-[#0c0f18]', cardBorder: 'border-[#1a1f2d]', cardBg2: 'bg-[#101420]', cardBorder2: 'border-[#252a38]',
    inputBg: 'bg-[#0e1220]', inputBorder: 'border-[#252a38]',
    headerBg: 'bg-[#060810]/95', headerBorder: 'border-[#1a1f2d]',
    rowBg: 'bg-[#0a0e18]', rowBorder: 'border-[#1a1f2d]', rowHover: 'hover:bg-[#101420]',
    dropBg: 'bg-[#0e1220]', dropBorder: 'border-[#252a38]',
    barBg: 'bg-[#1a1f2d]', divider: 'border-[#1a1f2d]',
    accent: 'text-[#F4D995]', accentBg: 'bg-[#F4D995]', accentBorder: 'border-[#F4D995]',
    accentMuted: 'text-[#F4D995]/70', accentHover: 'hover:bg-[#f6e0a8]',
  },
  lunarpunk: {
    // Lunar Punk: deep space + sapphire blue + purple accents
    bg: 'bg-[#08071a]', textMain: 'text-[#c8cde8]', textMuted: 'text-[#5a62a0]', textFaint: 'text-[#3a3f70]',
    cardBg: 'bg-[#0d0c24]', cardBorder: 'border-[#1a1840]', cardBg2: 'bg-[#12103a]', cardBorder2: 'border-[#252260]',
    inputBg: 'bg-[#100e2a]', inputBorder: 'border-[#252260]',
    headerBg: 'bg-[#08071a]/95', headerBorder: 'border-[#1a1840]',
    rowBg: 'bg-[#0b0a20]', rowBorder: 'border-[#1a1840]', rowHover: 'hover:bg-[#12103a]',
    dropBg: 'bg-[#100e2a]', dropBorder: 'border-[#252260]',
    barBg: 'bg-[#1a1840]', divider: 'border-[#1a1840]',
    accent: 'text-[#6d8ff8]', accentBg: 'bg-[#6d8ff8]', accentBorder: 'border-[#6d8ff8]',
    accentMuted: 'text-[#6d8ff8]/70', accentHover: 'hover:bg-[#8aa4fa]',
  },
  solarpunk: {
    // Solarpunk: transparent cards over JPEG background, nature meets tech
    bg: 'bg-transparent', textMain: 'text-[#1a3520]', textMuted: 'text-[#4a6a3e]', textFaint: 'text-[#7a9a6a]',
    cardBg: 'bg-[#eaf3e0]/80', cardBorder: 'border-[#a8c898]/60', cardBg2: 'bg-[#ddebd0]/75', cardBorder2: 'border-[#98b888]/50',
    inputBg: 'bg-[#f0f7e8]/85', inputBorder: 'border-[#a8c898]/60',
    headerBg: 'bg-[#eaf3e0]/88', headerBorder: 'border-[#a8c898]/50',
    rowBg: 'bg-[#e8f1de]/70', rowBorder: 'border-[#a8c898]/40', rowHover: 'hover:bg-[#ddebd0]/80',
    dropBg: 'bg-[#eaf3e0]/90', dropBorder: 'border-[#a8c898]/60',
    barBg: 'bg-[#b4ccaa]/60', divider: 'border-[#a8c898]/40',
    accent: 'text-[#2a7a1a]', accentBg: 'bg-[#2a7a1a]', accentBorder: 'border-[#2a7a1a]',
    accentMuted: 'text-[#2a7a1a]/70', accentHover: 'hover:bg-[#3a8a28]',
  },
};



const App = () => {
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catNameDraft, setCatNameDraft] = useState('');
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingBarHidden, setPendingBarHidden] = useState(false);
  const [prices, setPrices] = useState({});
  const [altcoinsList, setAltcoinsList] = useState([]);
  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState({ address: '', balance: '', name: '' });
  const [loading, setLoading] = useState({});
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [menuView, setMenuView] = useState('main'); // 'main' | 'profiles' | 'settings' | 'security'
  const [showWhitepaper, setShowWhitepaper] = useState(false);
  
  // États pour la gestion des wallets Monero
  const [moneroWalletData, setMoneroWalletData] = useState({});
  const [showMoneroSetup, setShowMoneroSetup] = useState(false);
  const [currentMoneroWallet, setCurrentMoneroWallet] = useState(null);
  const [moneroTestResult, setMoneroTestResult] = useState(null);
  const [moneroNodeStatus, setMoneroNodeStatus] = useState({});

  // ── PIN / Lock / Multi-factor Auth ──
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [profileSecurity, setProfileSecurity] = useState({ has_pin: false, has_password: false, has_totp: false, inactivity_minutes: 0 });
  const inactivityTimerRef = useRef(null);
  const inactivityWarningRef = useRef(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [pinAttemptInfo, setPinAttemptInfo] = useState(null); // { failed, max, retry_secs }
  // Unified PIN modal: { mode: 'setup'|'change'|'confirm', onConfirm: fn, title: str }
  const [pinModal, setPinModal] = useState(null);
  const [pinModalPin, setPinModalPin] = useState('');
  const [pinModalConfirm, setPinModalConfirm] = useState('');
  const [pinModalError, setPinModalError] = useState('');
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);
  // Multi-factor auth state
  const [authStep, setAuthStep] = useState(null); // 'password' | 'pin' | 'totp'
  const [authInputs, setAuthInputs] = useState({ password: '', pin: '', totp_code: '' });
  // TOTP setup
  const [totpSetupData, setTotpSetupData] = useState(null); // { uri, secret }
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpSetupError, setTotpSetupError] = useState('');
  const [etherscanApiKey, setEtherscanApiKey] = useState('');
  const [encryptedApiKey, setEncryptedApiKey] = useState(null);
  const [apiKeySalt, setApiKeySalt] = useState(null);
  const [theme, setTheme] = useState('dark');
  const savedThemeRef = useRef('dark'); // Store profile theme separately for lock security
  const [expandedAssets, setExpandedAssets] = useState({});
  const [showForex, setShowForex] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [apiStatus, setApiStatus] = useState({ binance: null, forex: null });
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
  const [toast, setToast] = useState(null); // { message, type }
  const [qrOverlay, setQrOverlay] = useState(null); // { address, name }
  const [activeProfile, setActiveProfile] = useState('Auto');
  const [savePulse, setSavePulse] = useState(false);
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  const [showPriceTerminal, setShowPriceTerminal] = useState(false);
  const apiPressTimer = useRef(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [editingBalanceFor, setEditingBalanceFor] = useState(null);
  const editRef = useRef(null);
  const editWalletRef = useRef(null);

  // ── Theme accessor ──
  const T = themes[theme] || themes.dark;


  const allAssets = {
    btc: { name: 'Bitcoin', symbol: 'BTC', color: 'text-amber-500', bg: 'bg-amber-500/20' },
    xmr: { name: 'Monero', symbol: 'XMR', color: 'text-[#8B4513]', bg: 'bg-[#8B4513]/15' },
    bch: { name: 'Bitcoin Cash', symbol: 'BCH', color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
    ltc: { name: 'Litecoin', symbol: 'LTC', color: 'text-blue-500', bg: 'bg-blue-500/20' },
    eth: { name: 'Ethereum', symbol: 'ETH', color: 'text-indigo-500', bg: 'bg-indigo-500/20' },
    etc: { name: 'Ethereum Classic', symbol: 'ETC', color: 'text-green-500', bg: 'bg-green-500/20' },
    link: { name: 'Chainlink', symbol: 'LINK', color: 'text-blue-400', bg: 'bg-blue-400/20' },
    dot: { name: 'Polkadot', symbol: 'DOT', color: 'text-pink-500', bg: 'bg-pink-500/20' },
    qtum: { name: 'Qtum', symbol: 'QTUM', color: 'text-cyan-500', bg: 'bg-cyan-500/20' },
    pivx: { name: 'PIVX', symbol: 'PIVX', color: 'text-purple-500', bg: 'bg-purple-500/20' },
    ada: { name: 'Cardano', symbol: 'ADA', color: 'text-blue-600', bg: 'bg-blue-600/20' },
    sol: { name: 'Solana', symbol: 'SOL', color: 'text-purple-400', bg: 'bg-purple-400/20' },
    avax: { name: 'Avalanche', symbol: 'AVAX', color: 'text-red-500', bg: 'bg-red-500/20' },
    doge: { name: 'Dogecoin', symbol: 'DOGE', color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
    xrp: { name: 'XRP', symbol: 'XRP', color: 'text-gray-400', bg: 'bg-gray-400/20' },
    uni: { name: 'Uniswap', symbol: 'UNI', color: 'text-pink-400', bg: 'bg-pink-400/20' },
    aave: { name: 'Aave', symbol: 'AAVE', color: 'text-cyan-400', bg: 'bg-cyan-400/20' },
    near: { name: 'NEAR', symbol: 'NEAR', color: 'text-cyan-300', bg: 'bg-cyan-300/20' },
    dash: { name: 'Dash', symbol: 'DASH', color: 'text-blue-300', bg: 'bg-blue-300/20' },
    xaut: { name: 'Tether Gold', symbol: 'XAUT', color: 'text-yellow-600', bg: 'bg-yellow-600/20' },
    paxg: { name: 'PAX Gold', symbol: 'PAXG', color: 'text-yellow-500', bg: 'bg-yellow-500/20' },
    rai: { name: 'Rai Reflex Index', symbol: 'RAI', color: 'text-teal-400', bg: 'bg-teal-400/20' },
    crv: { name: 'Curve DAO', symbol: 'CRV', color: 'text-rose-400', bg: 'bg-rose-400/20' },
  };

  const manualOnlyAssets = ['xmr', 'pivx'];
  const toggleExpand = (asset) => setExpandedAssets(prev => ({ ...prev, [asset]: !prev[asset] }));
  const maskAddress = (addr) => !addr ? '' : addr.length <= 10 ? addr : addr.substring(0, 6) + '••••••••';
  const formatNum = (n, dec = 2) => (n === null || n === undefined || isNaN(n)) ? '–' : n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const maskBalance = (value, decimals = 2) => hideBalances ? '*****' : formatNum(value, decimals);
  
  // Helper to check if a wallet has encrypted data
  const isWalletEncrypted = (wallet) => {
    return wallet.encrypted && wallet.encryption_salt && 
           (wallet.encrypted_name || wallet.encrypted_balance);
  };
  
  // Helper to get display name for potentially encrypted wallet
  const getWalletDisplayName = (wallet) => {
    if (isWalletEncrypted(wallet)) {
      return wallet.name === '[ENCRYPTED]' ? '🔒 Wallet Chiffré' : wallet.name;
    }
    return wallet.name;
  };
  
  // Helper to get display balance for potentially encrypted wallet
  const getWalletDisplayBalance = (wallet) => {
    if (isWalletEncrypted(wallet) && wallet.balance === null) {
      return '🔒 Chiffré';
    }
    return wallet.balance;
  };

  // Helper to check if wallet is Monero and has extended keys
  const isMoneroWalletWithKeys = (wallet) => {
    return wallet.asset === 'xmr' && wallet.viewKey && wallet.viewKey !== '[NOT_SET]';
  };

  // Helper to get Monero wallet display info
  const getMoneroWalletInfo = (wallet) => {
    if (!isMoneroWalletWithKeys(wallet)) return null;
    
    return {
      hasKeys: true,
      address: wallet.address,
      viewKey: wallet.viewKey,
      spendKey: wallet.spendKey || null,
      node: wallet.moneroNode || getMoneroDefaultNodes()[0],
      maskedViewKey: maskSensitiveData('XMR', wallet.viewKey),
      maskedSpendKey: wallet.spendKey ? maskSensitiveData('XMR', wallet.spendKey) : null
    };
  };

  // Open Monero setup for a specific wallet
  const openMoneroSetup = (wallet) => {
    setCurrentMoneroWallet(wallet);
    setShowMoneroSetup(true);
    
    // Test the default node
    testPrivacyNode('XMR', getMoneroDefaultNodes()[0]).then(result => {
      setMoneroNodeStatus(prev => ({ ...prev, [getMoneroDefaultNodes()[0]]: result }));
    });
  };

  // Close Monero setup
  const closeMoneroSetup = () => {
    setShowMoneroSetup(false);
    setCurrentMoneroWallet(null);
    setMoneroTestResult(null);
  };

  // Save Monero wallet configuration
  const saveMoneroConfiguration = async (wallet, viewKey, spendKey, node) => {
    try {
      // Validate keys
      validatePivxKeys(wallet.address, null, null, node);

      // Prepare wallet data
      const walletData = preparePivxWalletData(wallet.address, { node });
      
      // Store in state
      setMoneroWalletData(prev => ({ ...prev, [wallet.id]: walletData }));
      
      // Update wallet in database
      await invoke('update_wallet', {
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        balance: wallet.balance,
        monero_view_key: viewKey,
        monero_spend_key: spendKey || null,
        monero_node: node
      });
      
      // Test the configuration
      const testResult = await testMoneroNode(node);
      setMoneroNodeStatus(prev => ({ ...prev, [node]: testResult }));
      
      showToast('✅ Configuration Monero enregistrée avec succès !');
      
      // Reload wallets to get updated data
      await loadWallets();
      
      return true;
    } catch (error) {
      showToast('Erreur de configuration');
      return false;
    }
  };

  // Fetch Monero balance for a wallet
  const fetchMoneroBalance = async (wallet) => {
    try {
      if (!isMoneroWalletWithKeys(wallet)) {
        showToast('Clés Monero requises');
        return null;
      }

      const moneroInfo = getMoneroWalletInfo(wallet);
      const walletData = prepareMoneroWalletData(
        wallet.address,
        moneroInfo.viewKey,
        moneroInfo.spendKey,
        moneroInfo.node
      );

      setLoading(prev => ({ ...prev, [wallet.id]: true }));

      const result = await getPrivacyBalance('XMR', walletData.address, {
        viewKey: walletData.viewKey,
        node: walletData.node
      });

      if (result.success) {
        // Update wallet balance
        await invoke('update_wallet', {
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          balance: result.balance
        });

        await loadWallets();
        showToast(hideBalances ? 'Balance Monero mise à jour' : `Balance Monero: ${result.balance.toFixed(6)} XMR`);
        return result;
      }

      return null;
    } catch (_) {
      showToast('Erreur Monero');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, [wallet.id]: false }));
    }
  };

  // Test Monero configuration
  const testMoneroConfiguration = async (address, viewKey, spendKey, node) => {
    try {
      setMoneroTestResult({ testing: true, error: null });
      
      const walletData = prepareMoneroWalletData(address, viewKey, spendKey || null, node);
      
      // Test node first
      const nodeTest = await testMoneroNode(node);
      if (!nodeTest.success) {
        throw new Error('Nœud Monero inaccessible');
      }
      
      // Test balance fetch (this will scan the blockchain)
      const balanceResult = await getPrivacyBalance('XMR', walletData.address, {
        viewKey: walletData.viewKey,
        node: walletData.node
      });
      
      setMoneroTestResult({
        testing: false,
        success: true,
        balance: balanceResult.balance,
        unlockedBalance: balanceResult.unlockedBalance,
        nodeInfo: nodeTest
      });
      
      showToast('✅ Configuration Monero validée avec succès !');
      return true;
    } catch (error) {
      setMoneroTestResult({
        testing: false,
        success: false,
        error: error.message
      });
      showToast('Test de configuration échoué');
      return false;
    }
  };

  const showToast = (message, duration = 2000) => {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  };

  // ── PIN utilities ──
  // PIN is hashed server-side with Argon2id via Tauri IPC

  // PIN strength calculator
  const getPinStrength = (pin) => {
    if (!pin) return { level: 0, label: '', color: '' };
    const len = pin.length;
    if (len < 4) return { level: 0, label: 'Trop court', color: 'bg-red-500' };
    let score = 0;
    if (len >= 4) score++;
    if (len >= 6) score++;
    if (len >= 8) score++;
    if (/[a-z]/.test(pin) && /[A-Z]/.test(pin)) score++;
    if (/\d/.test(pin)) score++;
    if (/[^a-zA-Z0-9]/.test(pin)) score++;
    if (/^(.)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) score = Math.max(score - 2, 1);
    if (score <= 1) return { level: 1, label: 'Faible', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: 'Moyen', color: 'bg-amber-500' };
    if (score <= 3) return { level: 3, label: 'Bon', color: 'bg-yellow-400' };
    return { level: 4, label: 'Fort', color: 'bg-green-500' };
  };

  // Unified PIN modal helpers
  const openPinModal = (mode, onConfirm, title) => {
    setPinModalPin('');
    setPinModalConfirm('');
    setPinModalError('');
    setPinModal({ mode, onConfirm, title });
  };

  const closePinModal = () => {
    setPinModal(null);
    setPinModalPin('');
    setPinModalConfirm('');
    setPinModalError('');
  };

  const handlePinModalSubmit = async () => {
    const mode = pinModal?.mode;
    if (mode === 'setup' || mode === 'change') {
      if (!pinModalPin || !pinModalConfirm) { setPinModalError('Veuillez remplir tous les champs'); return; }
      if (pinModalPin.length < 4) { setPinModalError('Le PIN doit contenir au moins 4 caractères'); return; }
      if (pinModalPin !== pinModalConfirm) { setPinModalError('Les PIN ne correspondent pas'); return; }
    } else if (mode === 'confirm') {
      if (!pinModalPin || pinModalPin.length < 4) { setPinModalError('Entrez votre PIN'); return; }
    }
    try {
      setPinModalError('');
      await pinModal.onConfirm(pinModalPin);
      closePinModal();
    } catch (error) {
      setPinModalError(String(error));
    }
  };

  // Setup PIN flow
  const handlePinSetup = () => {
    openPinModal('setup', async (pin) => {
      await invoke('set_profile_pin', { profileName: activeProfile, rawPin: pin, inactivityMinutes: 5 });
      setProfileSecurity({ has_pin: true, inactivity_minutes: 5 });
      await loadProfileSecurity(activeProfile, false);
      showToast('PIN enregistré. Activation du chiffrement...');
      await generateNewSalt();
      await initEncryptionSystem();
      showToast('PIN + chiffrement activés.');
    }, 'Configuration du Code de Sécurité');
  };

  // Change PIN flow
  const handlePinChange = () => {
    openPinModal('change', async (pin) => {
      await invoke('set_profile_pin', { profileName: activeProfile, rawPin: pin, inactivityMinutes: profileSecurity.inactivity_minutes || 5 });
      showToast('PIN modifié.');
    }, 'Changer le Code de Sécurité');
  };

  // Confirm PIN flow (for encryption actions)
  const requestPinConfirmation = (title = 'Confirmation PIN') => {
    return new Promise((resolve, reject) => {
      openPinModal('confirm', async (pin) => { resolve(pin); }, title);
      // If user closes modal without confirming, reject
      const checkClosed = setInterval(() => {
        if (!document.querySelector('[data-pin-modal]')) {
          clearInterval(checkClosed);
          reject(new Error('Opération annulée'));
        }
      }, 500);
    });
  };

  // ── Encryption utilities ──
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [encryptionSalt, setEncryptionSalt] = useState('');
  const [testEncryptionResult, setTestEncryptionResult] = useState(null);

  const initEncryptionSystem = async () => {
    try {
      await invoke('init_encryption_system');
      showToast('Système de chiffrement initialisé');
    } catch (error) {
      showToast('Erreur d\'initialisation du chiffrement');
    }
  };

  const generateNewSalt = async () => {
    try {
      const salt = await invoke('generate_new_salt');
      setEncryptionSalt(salt);
      showToast('Nouveau sel généré');
      return salt;
    } catch (error) {
      showToast('Erreur de génération de sel');
      return null;
    }
  };

  const testEncryption = async () => {
    try {
      // Test encryption entirely on the backend using session key
      // No keys or plaintext cross IPC
      const hasKey = await invoke('has_session_key');
      if (!hasKey) {
        showToast('Déverrouillez d\'abord la session pour tester le chiffrement');
        return false;
      }

      const success = await invoke('test_encryption_backend');

      setTestEncryptionResult({ success, timestamp: new Date().toISOString() });

      if (success) {
        showToast('Chiffrement fonctionnel.');
      } else {
        showToast('Échec du chiffrement');
      }

      return success;
    } catch (error) {
      showToast('Erreur lors du test de chiffrement');
      setTestEncryptionResult({ success: false, error: 'Test failed' });
      return false;
    }
  };

  const activateEncryptionForAllWallets = async () => {
    try {
      const hasKey = await invoke('has_session_key');
      if (!hasKey) {
        showToast('Déverrouillez la session pour activer le chiffrement');
        return;
      }

      showToast('Activation du chiffrement...');

      let successCount = 0;
      for (const wallet of wallets) {
        try {
          // encrypt_wallet_data uses session key on backend
          const encrypted = await invoke('encrypt_wallet_data', { data: wallet.address || '' });
          setWallets(prev => prev.map(w =>
            w.id === wallet.id ? { ...w, encrypted: true, address: encrypted } : w
          ));
          successCount++;
        } catch (_) {
          // Encryption failed for one wallet — continue with others
        }
      }

      if (successCount > 0) {
        showToast(`${successCount} wallet(s) chiffré(s)`);
        try { await invoke('save_profile', { name: activeProfile, theme }); } catch (_) {}
      }
    } catch (_) {
      showToast('Erreur lors du chiffrement');
    }
  };
  
  // Encrypt the current API key using session key on backend
  const encryptCurrentApiKey = async () => {
    if (!etherscanApiKey) { showToast('Aucune clé API à chiffrer'); return; }
    if (!profileSecurity.has_pin) { showToast('Configurez d\'abord un PIN'); return; }
    try {
      const hasKey = await invoke('has_session_key');
      if (!hasKey) { showToast('Déverrouillez la session'); return; }
      showToast('Chiffrement de la clé API...');
      const encrypted = await invoke('encrypt_api_key_with_pin', { api_key: etherscanApiKey });
      setEncryptedApiKey(encrypted);
      setEtherscanApiKey('');
      await saveSettings();
      showToast('Clé API chiffrée.');
    } catch (_) {
      showToast('Erreur de chiffrement');
    }
  };

  // Decrypt the API key for temporary use (uses unified PIN modal)
  const decryptApiKeyTemporarily = async () => {
    if (!isApiKeyEncrypted()) { showToast('La clé API n\'est pas chiffrée'); return; }
    try {
      const pin = await requestPinConfirmation('Déchiffrer la clé API');
      const decryptedKey = await invoke('decrypt_api_key_with_pin', { encrypted_key: encryptedApiKey, salt: apiKeySalt, pin });
      // Copy directly to clipboard without displaying the key
      try {
        await navigator.clipboard.writeText(decryptedKey);
        showToast('Clé API copiée dans le presse-papier');
        setTimeout(() => { navigator.clipboard.writeText('').catch(() => {}); }, 10000);
      } catch (_) {
        showToast('Impossible de copier la clé');
      }
    } catch (error) {
      if (String(error) !== 'Error: Opération annulée') showToast('Échec du déchiffrement');
    }
  };

  // Build ordered list of auth steps from security config
  const getAuthSteps = (sec) => {
    const steps = [];
    if (sec.has_password) steps.push('password');
    if (sec.has_pin) steps.push('pin');
    if (sec.has_totp) steps.push('totp');
    return steps;
  };

  const loadProfileSecurity = async (profileName, shouldLock = true) => {
    try {
      const sec = await invoke('get_profile_security', { profileName });
      setProfileSecurity(sec);
      setPinInput('');
      setPinError('');
      setPinAttemptInfo(null);
      setAuthInputs({ password: '', pin: '', totp_code: '' });
      const hasAnyAuth = sec.has_pin || sec.has_password || sec.has_totp;
      if (shouldLock && hasAnyAuth) {
        setIsLocked(true);
        const steps = getAuthSteps(sec);
        setAuthStep(steps.length > 0 ? steps[0] : null);
        setTheme('dark');
      } else {
        setTheme(savedThemeRef.current);
      }
    } catch(_) { setProfileSecurity({ has_pin: false, has_password: false, has_totp: false, inactivity_minutes: 0 }); setTheme(savedThemeRef.current); }
  };

  const refreshPinStatus = async () => {
    try {
      const status = await invoke('get_pin_status', { profileName: activeProfile });
      setPinAttemptInfo({ failed: status.failed_attempts, max: status.max_attempts, retry_secs: status.retry_after_secs, is_locked: status.is_locked });
    } catch(_) {}
  };

  // Multi-factor auth: advance through steps or verify all
  const handleAuthStep = async () => {
    const steps = getAuthSteps(profileSecurity);
    const currentIdx = steps.indexOf(authStep);
    const isLast = currentIdx === steps.length - 1;

    // Validate current step
    if (authStep === 'password' && !authInputs.password) { setPinError('Entrez votre mot de passe'); return; }
    if (authStep === 'pin' && !authInputs.pin) { setPinError('Entrez votre PIN'); return; }
    if (authStep === 'totp' && authInputs.totp_code.length !== 6) { setPinError('Entrez le code à 6 chiffres'); return; }

    if (!isLast) {
      // Move to next step
      setPinError('');
      setAuthStep(steps[currentIdx + 1]);
      return;
    }

    // Last step — verify all factors
    try {
      const ok = await invoke('verify_profile_auth', {
        profileName: activeProfile,
        authAttempt: {
          password: authInputs.password || null,
          pin: authInputs.pin || null,
          totp_code: authInputs.totp_code || null,
        }
      });
      if (ok) {
        setIsLocked(false);
        setAuthInputs({ password: '', pin: '', totp_code: '' });
        setPinInput('');
        setPinError('');
        setPinAttemptInfo(null);
        setTheme(savedThemeRef.current);
        resetInactivityTimer();
        loadCategories(); loadWallets(); loadSettings(); loadPrices();
      } else {
        setAuthInputs({ password: '', pin: '', totp_code: '' });
        setAuthStep(steps[0]);
        await refreshPinStatus();
        setPinError('Authentification échouée');
      }
    } catch(err) {
      const errMsg = String(err);
      setAuthInputs({ password: '', pin: '', totp_code: '' });
      setAuthStep(steps[0]);
      await refreshPinStatus();
      if (errMsg.includes('verrouillé') || errMsg.includes('tentatives')) {
        setPinError(errMsg);
      } else {
        setPinError('Authentification échouée');
      }
    }
  };

  // Legacy single-PIN unlock (kept for backward compat with old profiles)
  const handleUnlock = async () => {
    if (!pinInput || pinInput.length === 0) { setPinError('Entrez votre PIN'); return; }
    try {
      const ok = await invoke('verify_profile_pin', { profileName: activeProfile, rawPin: pinInput });
      if (ok) {
        setIsLocked(false);
        setPinInput('');
        setPinError('');
        setPinAttemptInfo(null);
        setTheme(savedThemeRef.current);
        resetInactivityTimer();
        loadCategories(); loadWallets(); loadSettings(); loadPrices();
      } else {
        setPinInput('');
        await refreshPinStatus();
        setPinError('Code incorrect');
      }
    } catch(err) {
      const errMsg = String(err);
      setPinInput('');
      await refreshPinStatus();
      if (errMsg.includes('verrouillé') || errMsg.includes('tentatives')) { setPinError(errMsg); }
      else { setPinError('Erreur vérification'); }
    }
  };

  // Clear all sensitive state from memory (called on lock)
  const clearSensitiveState = () => {
    setWallets([]);
    setEtherscanApiKey('');
    setMoneroWalletData({});
    setEncryptionSalt('');
    setTestEncryptionResult(null);
    setQrOverlay(null);
    setConfirmModal(null);
    setPinInput('');
    // Lock session key on backend
    invoke('lock_session').catch(() => {});
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (inactivityWarningRef.current) clearTimeout(inactivityWarningRef.current);
    setShowInactivityWarning(false);
    const hasAnyAuth = profileSecurity.has_pin || profileSecurity.has_password || profileSecurity.has_totp;
    if (hasAnyAuth && profileSecurity.inactivity_minutes > 0 && !isLocked) {
      const totalMs = profileSecurity.inactivity_minutes * 60 * 1000;
      const warningMs = Math.max(totalMs - 30000, totalMs * 0.8); // 30s before or 80% whichever is later
      inactivityWarningRef.current = setTimeout(() => {
        setShowInactivityWarning(true);
      }, warningMs);
      inactivityTimerRef.current = setTimeout(() => {
        setIsLocked(true);
        setTheme('dark');
        clearSensitiveState();
        setShowInactivityWarning(false);
        setAuthInputs({ password: '', pin: '', totp_code: '' });
        const steps = getAuthSteps(profileSecurity);
        setAuthStep(steps[0] || null);
      }, totalMs);
    }
  };

  // ── Inactivity detection ──
  useEffect(() => {
    const hasAnyAuth = profileSecurity.has_pin || profileSecurity.has_password || profileSecurity.has_totp;
    if (!hasAnyAuth || profileSecurity.inactivity_minutes === 0 || isLocked) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer();
    return () => {
      events.forEach(e => document.removeEventListener(e, handler));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (inactivityWarningRef.current) clearTimeout(inactivityWarningRef.current);
      setShowInactivityWarning(false);
    };
  }, [profileSecurity, isLocked]);

  // Long press copy
  const handleAddressMouseDown = (address) => {
    if (!address) return;
    const timer = setTimeout(async () => {
      try { await navigator.clipboard.writeText(address); setCopiedAddress(address); showToast('Adresse copiée ✓'); setTimeout(() => setCopiedAddress(null), 2000); setTimeout(() => { navigator.clipboard.writeText('').catch(() => {}); }, 10000); } catch (e) { /* clipboard error */ }
    }, 600);
    setLongPressTimer(timer);
  };
  const handleAddressMouseUp = () => { if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); } };

  // ── Data loading ──
  const loadWallets = async () => {
    try {
      const w = await invoke('get_wallets');
      // Les wallets ont maintenant category_id au lieu de category
      setWallets(w);
    } catch (e) {
      showToast('❌ Erreur chargement wallets', 3000);
    }
  };
  const loadPrices = useCallback(async () => {
    try {
      // Utilisation de la fonction sécurisée pour récupérer les prix
      const d = await secureGetPrices();

      setPrices(prev => {
        // Merge : garder les anciens prix si les nouveaux sont à 0 (API down)
        const merged = { ...prev };
        for (const key of Object.keys(d)) {
          if (typeof d[key] === 'object' && d[key] !== null) {
            if (d[key].usd > 0 || d[key].eur > 0) merged[key] = d[key];
          } else if (d[key] !== 0 && d[key] !== undefined) {
            merged[key] = d[key];
          }
        }
        return merged;
      });
      setLastPriceUpdate(new Date());
      setApiStatus({ binance: d.btc?.usd > 0, forex: d.forex_jpy_per_usd > 0 });
    } catch (e) {
      setApiStatus(prev => ({ binance: prev.binance === true ? true : false, forex: prev.forex === true ? true : false }));
      showToast('❌ Erreur de chargement des prix. Vérifiez votre connexion.', 3000);
    }
  }, []);
  const loadAltcoinsList = useCallback(async () => { try { setAltcoinsList(await invoke('get_altcoins_list')); } catch (e) { /* altcoins list load error */ } }, []);
  const loadSettings = useCallback(async () => {
    try {
      const d = await invoke('get_settings');
      setEtherscanApiKey(d.etherscan_api_key || '');
      setEncryptedApiKey(d.encrypted_api_key || null);
      setApiKeySalt(d.api_key_salt || null);
      savedThemeRef.current = d.theme || 'dark';
      // Theme is NEVER applied here — only by security check, unlock handler, or user click
    } catch (e) { /* settings load error */ }
  }, []);
  const loadProfiles = useCallback(async () => { try { setProfiles(await invoke('list_profiles')); } catch (e) { /* profiles load error */ } }, []);
  const saveSettings = async () => {
    try {
      await invoke('save_settings', {
        settings: {
          etherscan_api_key: etherscanApiKey,
          encrypted_api_key: encryptedApiKey,
          api_key_salt: apiKeySalt,
          theme
        }
      });
      setMenuView('main');
      showToast('Paramètres sauvegardés ✓');
    } catch (e) { /* settings save error */ }
  };

  // ── Profiles ──
  const autoSaveProfile = useCallback(async () => {
    if (isAnonymous) return;
    const saveName = activeProfile === 'Auto' ? '__autosave__' : activeProfile;
    try { await invoke('save_profile', { name: saveName, theme }); setSavePulse(true); setTimeout(() => setSavePulse(false), 1500); } catch (e) { /* autosave error */ }
  }, [isAnonymous, activeProfile, theme]);
  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) return;
    const pName = newProfileName.trim();
    try {
      await invoke('save_profile', { name: pName, theme });
      setNewProfileName('');
      await loadProfiles();
      setActiveProfile(pName);
      setIsAnonymous(false);
      try { await invoke('set_setting', { key: 'last_profile', value: pName }); } catch(e) {}
      showToast(`Profil "${pName}" sauvegardé ✓`);
    } catch (e) { showToast('Erreur sauvegarde profil ✗'); }
  };
  const handleLoadProfile = async (name) => {
    setShowMenuDrawer(false);
    // Pas de confirmation nécessaire - charger directement le profil
    // Le profil actuel est sauvegardé automatiquement avant le chargement
    try {
      // Always auto-save current state before loading another profile
      if (!isAnonymous) {
        const saveName = activeProfile === 'Auto' ? '__autosave__' : activeProfile;
        try { await invoke('save_profile', { name: saveName, theme }); } catch(e) { /* pre-save error */ }
      }
      const result = await invoke('load_profile', { name });
      setActiveProfile(name);
      setIsAnonymous(false);
      if (result?.theme) savedThemeRef.current = result.theme;
      try { await invoke('set_setting', { key: 'last_profile', value: name }); } catch(e) {}
      // Check security BEFORE loading sensitive data
      const sec = await invoke('get_profile_security', { profileName: name }).catch(() => ({ has_pin: false, has_password: false, has_totp: false, inactivity_minutes: 0 }));
      setProfileSecurity(sec);
      const hasAuth = sec.has_pin || sec.has_password || sec.has_totp;
      if (hasAuth) {
        setIsLocked(true);
        setTheme('dark');
        setWallets([]);
        setAuthInputs({ password: '', pin: '', totp_code: '' });
        const steps = getAuthSteps(sec);
        setAuthStep(steps[0] || null);
        showToast(`Profil "${name}" — déverrouillage requis`);
      } else {
        setTheme(savedThemeRef.current);
        await loadCategories();
        await loadWallets();
        showToast(`Profil "${name}" chargé ✓`);
      }
    } catch (e) { showToast('Erreur chargement profil ✗'); }
  };
  const handleDeleteProfile = async (name) => {
    setShowMenuDrawer(false);
    if (!await showConfirm(`Supprimer définitivement le profil "${name}" ?`)) return;
    try { await invoke('delete_profile', { name }); await loadProfiles(); showToast(`Profil "${name}" supprimé`); if (activeProfile === name) setActiveProfile('Auto'); } catch (e) { showToast('Erreur suppression ✗'); }
  };
  const handleReset = async () => {
    setShowMenuDrawer(false);
    if (!await showConfirm('Créer un nouveau profil vierge ?\nLe profil actuel sera sauvegardé.')) return;
    try {
      if (!isAnonymous && activeProfile !== 'Auto') {
        await invoke('save_profile', { name: activeProfile, theme });
      }
      const profs = await invoke('list_profiles');
      let newName = 'nouveau_profil';
      let idx = 1;
      while (profs.filter(p => p !== '__autosave__').includes(newName)) { idx++; newName = `nouveau_profil_${idx}`; }
      await invoke('reset_wallets');
      await loadCategories();
      await loadWallets();
      await invoke('save_profile', { name: newName, theme });
      await loadProfiles();
      setActiveProfile(newName);
      setIsAnonymous(false);
      try { await invoke('set_setting', { key: 'last_profile', value: newName }); } catch(e) {}
      showToast(`Nouveau profil "${newName}" créé ✓`);
    } catch (e) { /* profile creation error */ }
  };
  const startAnonymous = async () => {
    setShowMenuDrawer(false);
    if (!await showConfirm('Créer un profil anonyme temporaire ?\nIl disparaîtra à la fermeture.')) return;
    try {
      if (!isAnonymous && activeProfile !== 'Auto') {
        await invoke('save_profile', { name: activeProfile, theme });
      }
      await invoke('reset_wallets');
      await loadCategories();
      await loadWallets();
      setActiveProfile('Anonyme');
      setIsAnonymous(true);
      setTheme('dark'); // Anonymous always starts in dark mode
      showToast('Profil anonyme — non sauvegardé');
    } catch (e) { /* anonymous profile error */ }
  };

  // ── Wallet ops ──
  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await loadPrices();
      const cw = await invoke('get_wallets');
      for (const w of cw) {
        if (w.address && !manualOnlyAssets.includes(w.asset)) {
          try {
            // Utilisation de la fonction sécurisée pour récupérer la balance
            const b = await secureFetchBalance(w.asset, w.address);
            
            if (b != null) {
              await invoke('update_wallet', { 
                id: w.id, 
                name: w.name, 
                address: w.address, 
                balance: b 
              });
            }
          } catch (e) {
            showToast(`⚠️ Erreur de balance pour ${w.asset.toUpperCase()}`, 2000);
          }
        }
      }
      await loadWallets();
    } catch (e) {
      showToast('❌ Erreur lors du rafraîchissement des données', 3000);
    }
    setRefreshing(false);
  };

  const saveWalletEdit = async (walletId) => {
    const w = wallets.find(x => x.id === walletId);
    if (!w) { return; }
    const trimmedAddr = (editData.address || '').trim();
    const addrChanged = trimmedAddr !== (w.address || '').trim();
    const newName = editData.name || w.name;
    await invoke('update_wallet', { id: walletId, name: newName, address: trimmedAddr, balance: editData.balance !== '' ? parseFloat(editData.balance) : w.balance });
    await loadWallets();
    setEditMode(null); editWalletRef.current = null;
    autoSaveProfile();
    // Warn if ETH/ERC-20 address saved without API key
    const ethAssets = ['eth', 'link', 'uni', 'aave'];
    if (addrChanged && trimmedAddr && ethAssets.includes(w.asset) && !etherscanApiKey) {
      showToast('⚠️ Clé API Etherscan manquante — configurez-la dans ⚙ Paramètres pour ETH/ERC-20', 4000);
    }
    if (addrChanged && trimmedAddr && !manualOnlyAssets.includes(w.asset)) {
      setLoading(prev => ({ ...prev, [walletId]: true }));
      try { await loadPrices(); const b = await invoke('fetch_balance', { asset: w.asset, address: trimmedAddr }); if (b != null) { await invoke('update_wallet', { id: walletId, name: newName, address: trimmedAddr, balance: b }); await loadWallets(); autoSaveProfile(); } } catch (e) { /* balance fetch error */ }
      setLoading(prev => ({ ...prev, [walletId]: false }));
    }
  };


  const addNewWallet = async (categoryId, asset, name) => {
    try {
      await invoke('add_wallet', { categoryId, asset, name });
      await loadWallets();
      autoSaveProfile();

      const category = categories.find(c => c.id === categoryId);
      const altcoin = altcoinsList.find(a => a.symbol === asset);
      showToast(`✅ ${altcoin?.name || asset} ajouté à ${category?.name || 'la catégorie'}`, 2000);
    } catch (e) {
      showToast('❌ Erreur lors de l\'ajout', 3000);
    }
  };
  const deleteWallet = async (id) => { try { await invoke('delete_wallet', { id }); await loadWallets(); setEditMode(null); editWalletRef.current = null; autoSaveProfile(); } catch (e) { /* wallet delete error */ } };
  const handleAddToken = async (categoryId, tokenSymbol, tokenName) => {
    await addNewWallet(categoryId, tokenSymbol, `${tokenName} Wallet`);
  };
  // ── Init ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // ── SECURITY: Always start on a CLEAN default_template ──
      // 1. Reset wallets to empty defaults (no addresses)
      await invoke('reset_wallets').catch(() => {});
      // 2. Save clean default_template with dark theme
      await invoke('save_profile', { name: 'default_template', theme: 'dark' }).catch(() => {});
      // 3. Load the clean default_template
      await invoke('load_profile', { name: 'default_template' }).catch(() => {});

      if (cancelled) return;
      setActiveProfile('default_template');

      // Load non-sensitive metadata
      await loadAltcoinsList();
      await loadProfiles();

      // Load clean default_template wallets (empty addresses) + categories
      await loadCategories();
      await loadWallets();
      await loadPrices();
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Intervals for price refresh & autosave ──
  useEffect(() => {
    const priceIv = setInterval(loadPrices, 5000);
    const saveIv = setInterval(() => { autoSaveProfile(); }, 120000);
    return () => { clearInterval(priceIv); clearInterval(saveIv); };
  }, [loadPrices, autoSaveProfile]);

  // ── Click-outside to save wallet edit ──
  useEffect(() => {
    const handler = (e) => {
      if (!editMode || !editRef.current) return;
      if (editRef.current.contains(e.target)) return;
      if (e.target.closest('[data-modal]')) return;
      const wid = editWalletRef.current;
      if (wid) saveWalletEdit(wid);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editMode, editData, wallets]);

  // ── Ctrl+Shift+P → Price Terminal ──
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') { e.preventDefault(); setShowPriceTerminal(v => !v); }
      if (e.key === 'Escape' && showPriceTerminal) setShowPriceTerminal(false);
      if (e.key === 'Escape' && showWhitepaper) setShowWhitepaper(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showPriceTerminal, showWhitepaper]);

  // ── Monitoring: register wallets with backend ──
  useEffect(() => {
    if (!monitoringEnabled || wallets.length === 0) return;
    wallets.forEach(w => {
      if (w.address && w.address.trim() !== '') {
        invoke('start_monitoring_wallet', { walletId: w.id, address: w.address, asset: w.asset, walletName: w.name || w.asset.toUpperCase() })
          .catch(() => { /* monitoring start error */ });
      }
    });
  }, [wallets, monitoringEnabled]);

  // ── Monitoring: listen for pending TX events from backend ──
  const pendingTxsRef = useRef([]);
  const walletIdsRef = useRef(new Set());
  useEffect(() => { walletIdsRef.current = new Set(wallets.map(w => w.id)); }, [wallets]);
  useEffect(() => {
    if (!monitoringEnabled) return;
    let unlisten = null;

    const playSound = (type) => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'new') {
          osc.frequency.value = 880; gain.gain.value = 0.15;
          osc.start(); osc.stop(ctx.currentTime + 0.15);
          setTimeout(() => {
            const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
            o2.connect(g2); g2.connect(ctx.destination);
            o2.frequency.value = 1320; g2.gain.value = 0.12;
            o2.start(); o2.stop(ctx.currentTime + 0.12);
          }, 150);
        } else { // confirmed
          osc.frequency.value = 523; gain.gain.value = 0.12;
          osc.start(); osc.stop(ctx.currentTime + 0.1);
          setTimeout(() => {
            const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
            o2.connect(g2); g2.connect(ctx.destination);
            o2.frequency.value = 784; g2.gain.value = 0.1;
            o2.start(); o2.stop(ctx.currentTime + 0.1);
            setTimeout(() => {
              const o3 = ctx.createOscillator(); const g3 = ctx.createGain();
              o3.connect(g3); g3.connect(ctx.destination);
              o3.frequency.value = 1047; g3.gain.value = 0.08;
              o3.start(); o3.stop(ctx.currentTime + 0.15);
            }, 100);
          }, 100);
        }
      } catch(_) {}
    };

    (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('pending-tx-update', (event) => {
        const allTxs = event.payload;
        const wids = walletIdsRef.current;
        const txs = allTxs.filter(tx => wids.has(tx.wallet_id));
        const prev = pendingTxsRef.current;
        const activeTxs = txs.filter(tx => !tx.completed);
        setPendingCount(activeTxs.length);

        // Detect new TX (hash not in previous list)
        const prevHashes = new Set(prev.map(t => t.tx_hash));
        const newTxs = txs.filter(t => !prevHashes.has(t.tx_hash));
        if (newTxs.length > 0) {
          playSound('new');
          setPendingBarHidden(false);
          newTxs.forEach(tx => {
            showToast(hideBalances ? `Nouvelle TX ${tx.asset.toUpperCase()}` : `Nouvelle TX: +${tx.amount.toFixed(6)} ${tx.asset.toUpperCase()}`, 5000);
          });
        }

        // Detect newly confirmed TX
        const justConfirmed = txs.filter(t => t.completed && prev.find(p => p.tx_hash === t.tx_hash && !p.completed));
        if (justConfirmed.length > 0) {
          playSound('confirmed');
          justConfirmed.forEach(tx => {
            showToast(hideBalances ? `TX confirmée ${tx.asset.toUpperCase()}` : `TX confirmée: +${tx.amount.toFixed(6)} ${tx.asset.toUpperCase()}`, 5000);
          });
        }

        pendingTxsRef.current = txs;
      });

      // Initial load
      try {
        const allTxs = await invoke('get_pending_transactions');
        const txs = allTxs.filter(t => walletIdsRef.current.has(t.wallet_id));
        pendingTxsRef.current = txs;
        setPendingCount(txs.filter(t => !t.completed).length);
      } catch(_) {}
    })();

    // Polling backup every 30s
    const pollInterval = setInterval(async () => {
      try {
        const allTxs = await invoke('get_pending_transactions');
        const txs = allTxs.filter(t => walletIdsRef.current.has(t.wallet_id));
        setPendingCount(txs.filter(t => !t.completed).length);
        pendingTxsRef.current = txs;
      } catch(_) {}
    }, 30000);

    return () => {
      if (unlisten) unlisten();
      clearInterval(pollInterval);
    };
  }, [monitoringEnabled]);

  // ── Calcs ──
  const getWalletsByCategory = (catId) => wallets.filter(w => w.category_id === catId);
  const getAssetTotalBalance = (a) => wallets.filter(w => w.asset === a).reduce((s, w) => s + (w.balance || 0), 0);
  const getCategoryValueEur = (catId) => getWalletsByCategory(catId).reduce((s, w) => s + (w.balance || 0) * (prices[w.asset]?.eur || 0), 0);
  const getTotalEur = () => categories.reduce((s, c) => s + getCategoryValueEur(c.id), 0);
  const getTotalUsd = () => prices.eurusd > 0 ? getTotalEur() * prices.eurusd : 0;
  const getTotalBtc = () => prices.btc?.eur > 0 ? getTotalEur() / prices.btc.eur : 0;
  const getTotalGoldOz = () => prices.gold_usd_per_oz > 0 ? getTotalUsd() / prices.gold_usd_per_oz : 0;
  const getTotal = (key) => getTotalUsd() * (prices[key] || 0);
  const getCategoryPercentage = (catId) => { const t = getTotalEur(); return t > 0 ? (getCategoryValueEur(catId) / t) * 100 : 0; };

  const startEdit = (wallet) => {
    setEditMode(`edit-${wallet.id}`);
    setEditData({ address: wallet.address || '', balance: wallet.balance?.toString() || '', name: wallet.name || '' });
    editWalletRef.current = wallet.id;
    setEditingBalanceFor(null);
  };
  const handleEditKeyDown = (e, wid) => { if (e.key === 'Enter') { e.preventDefault(); saveWalletEdit(wid); } if (e.key === 'Escape') { setEditMode(null); editWalletRef.current = null; } };

  // ── Components ──
  const MiniPriceCard = ({ asset }) => {
    const p = prices[asset] || {}, cfg = allAssets[asset];
    return (
      <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg px-2 pt-1.5 pb-1`}>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.symbol}</span>
          <span className="text-xs font-semibold tabular-nums">{p.usd > 0 ? `${formatNum(p.usd)} ₮` : '–'}</span>
        </div>
        <div className={`text-[10px] ${T.textMuted} tabular-nums`}>{p.eur > 0 ? `${formatNum(p.eur)} €` : '–'}</div>
        {p.btc > 0 && <div className={`text-[10px] ${T.textFaint} tabular-nums`}>{formatNum(p.btc, 8)} ₿</div>}
      </div>
    );
  };

  // Trash icon SVG
  const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  );

  // Custom themed confirm dialog (returns Promise)
  const showConfirm = (message) => new Promise((resolve) => {
    setConfirmModal({ message, onConfirm: () => { setConfirmModal(null); resolve(true); }, onCancel: () => { setConfirmModal(null); resolve(false); } });
  });

  const ConfirmModal = () => {
    if (!confirmModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" data-modal style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className={`${T.cardBg} border ${T.cardBorder2} rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl`}>
          <p className={`text-sm mb-6 ${T.textMain} whitespace-pre-line`}>{confirmModal.message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={confirmModal.onCancel}
              className={`px-4 py-2 rounded-lg text-sm ${T.inputBg} border ${T.inputBorder} ${T.textMuted} hover:opacity-80 transition-opacity`}>
              Annuler
            </button>
            <button onClick={confirmModal.onConfirm}
              className="px-4 py-2 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-500 transition-colors">
              {confirmModal.confirmLabel || 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PriceCard = ({ asset, walletCount = 0, category }) => {
    const p = prices[asset] || {}, cfg = allAssets[asset];
    const totalBal = getAssetTotalBalance(asset), totalVal = totalBal * (p.eur || 0);
    const isExpanded = expandedAssets[asset] !== false;
    return (
      <div className={`${T.cardBg2} border ${T.cardBorder2} rounded-lg p-3 mb-2`}>
        <div className="flex items-start justify-between cursor-pointer" onClick={() => walletCount > 0 && toggleExpand(asset)}>
          <div className="flex items-start gap-3">
            <span className={`px-2 py-1 rounded text-sm font-bold ${cfg.bg} ${cfg.color} mt-0.5`}>{cfg.symbol}</span>
            <div>
              <div className={`text-sm ${T.textMuted}`}>
                {p.usd > 0 && <span className="mr-3">{formatNum(p.usd)} ₮</span>}
                {p.eur > 0 && <span className="mr-3">{formatNum(p.eur)} €</span>}
                {p.btc > 0 && asset !== 'btc' && <span>{formatNum(p.btc, 8)} ₿</span>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); addNewWallet(category, asset, `${cfg.name} Wallet`); }}
                className={`text-xs ${T.textFaint} hover:opacity-70 transition-opacity mt-0.5`}>
                + Ajouter adresse
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className={`font-semibold ${cfg.color}`}>{maskBalance(totalBal, 8)} {cfg.symbol}</div>
              <div className={`text-xs ${T.textMuted}`}>{maskBalance(totalVal)} €</div>
            </div>
            {walletCount > 0 && <div className={`${T.textMuted} transition-transform p-2 -m-2 rounded border border-transparent hover:border-current/20 hover:bg-amber-500/10 hover:text-amber-500 ${isExpanded ? 'rotate-180' : ''}`}><ChevronIcon size={20} /></div>}
          </div>
        </div>
      </div>
    );
  };

  // ── Inline edit form (rendered directly in App's tree = stable focus) ──
  const renderEditForm = (wallet) => {
    const cfg = allAssets[wallet.asset] || { symbol: wallet.asset.toUpperCase(), color: 'text-zinc-400', bg: 'bg-zinc-400/20' };
    const handleUnlockBalance = async () => {
      if (await showConfirm('Modifier le montant manuellement ?')) setEditingBalanceFor(wallet.id);
    };
    // stopPropagation on mousedown prevents click-outside handler from interfering with focus
    const stopMD = e => e.stopPropagation();
    return (
      <div key={wallet.id} ref={editRef} className={`${T.cardBg} border ${T.cardBorder2} rounded-lg p-3 space-y-2`}
        onMouseDown={stopMD}>
        <input key={`name-${wallet.id}`} id={`edit-name-${wallet.id}`} type="text" value={editData.name}
          onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
          onKeyDown={e => handleEditKeyDown(e, wallet.id)}
          placeholder="Nom du wallet..."
          className={`w-full px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm font-medium focus:outline-none focus:border-amber-500/50`} />
        <input key={`addr-${wallet.id}`} id={`edit-addr-${wallet.id}`} type="text" value={editData.address}
          onChange={e => setEditData(p => ({ ...p, address: e.target.value }))}
          onKeyDown={e => handleEditKeyDown(e, wallet.id)}
          placeholder="Adresse..."
          className={`w-full px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm font-mono focus:outline-none focus:border-amber-500/50`} />
        {editingBalanceFor === wallet.id ? (
          <input key={`bal-${wallet.id}`} id={`edit-bal-${wallet.id}`} type="number" value={editData.balance}
            onChange={e => setEditData(p => ({ ...p, balance: e.target.value }))}
            onKeyDown={e => handleEditKeyDown(e, wallet.id)}
            placeholder="Balance" step="0.00000001" autoFocus
            className={`w-full px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm focus:outline-none focus:border-amber-500/50`} />
        ) : (
          <div onClick={handleUnlockBalance}
            className={`relative w-full px-3 py-2 rounded text-sm border ${T.inputBorder} cursor-pointer overflow-hidden`}
            style={{ background: `repeating-linear-gradient(-45deg, transparent, transparent 4px, ${theme === 'dark' || theme === 'noctali' || theme === 'lunarpunk' ? 'rgba(255,255,255,0.03)' : theme === 'sepia' ? 'rgba(139,115,85,0.06)' : theme === 'solarpunk' ? 'rgba(42,96,48,0.06)' : 'rgba(0,0,0,0.04)'} 4px, ${theme === 'dark' || theme === 'noctali' || theme === 'lunarpunk' ? 'rgba(255,255,255,0.03)' : theme === 'sepia' ? 'rgba(139,115,85,0.06)' : theme === 'solarpunk' ? 'rgba(42,96,48,0.06)' : 'rgba(0,0,0,0.04)'} 8px)` }}>
            <div className="flex items-center justify-between">
              <span className={`${T.textFaint} opacity-60`}>{editData.balance || '–'} {cfg.symbol}</span>
              <span className={`text-xs ${T.textMuted} font-medium`}>modifier</span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => saveWalletEdit(wallet.id)} className={`px-3 py-1 ${cfg.bg} ${cfg.color} rounded text-xs`}>Sauvegarder</button>
          <button onClick={() => { setEditMode(null); editWalletRef.current = null; setEditingBalanceFor(null); }} className={`px-3 py-1 ${T.inputBg} ${T.textMuted} rounded text-xs`}>Annuler</button>
          <button onClick={async () => { if (await showConfirm(`Supprimer "${wallet.name}" ?`)) deleteWallet(wallet.id); }} className="px-3 py-1 bg-red-500/20 text-red-500 rounded text-xs ml-auto">Supprimer</button>
        </div>
      </div>
    );
  };

  // fonction loadCategories
  const loadCategories = async () => {
    try {
      const cats = await invoke('get_categories');
      setCategories(cats);
    } catch (e) {
      showToast('❌ Erreur chargement catégories', 3000);
    }
  };

  // ── Category inline edit ──
  const startEditCatName = (cat) => { setEditingCatId(cat.id); setCatNameDraft(cat.name); };
  const saveCatName = async (catId) => {
    const trimmed = catNameDraft.trim();
    const cat = categories.find(c => c.id === catId);
    if (trimmed && cat && trimmed !== cat.name) {
      try {
        await invoke('update_category', { id: catId, name: trimmed, color: cat.color, barColor: cat.bar_color });
        await loadCategories();
        autoSaveProfile();
      } catch (e) { showToast('❌ Erreur renommage', 2000); }
    }
    setEditingCatId(null);
  };

  const addCategory = async () => {
    const palette = [
      { color: 'text-emerald-500', bar: '#10b981' },
      { color: 'text-cyan-500', bar: '#06b6d4' },
      { color: 'text-pink-500', bar: '#ec4899' },
      { color: 'text-orange-500', bar: '#f97316' },
      { color: 'text-indigo-500', bar: '#6366f1' },
      { color: 'text-teal-500', bar: '#14b8a6' },
      { color: 'text-rose-500', bar: '#f43f5e' },
      { color: 'text-sky-500', bar: '#0ea5e9' },
    ];
    const pick = palette[categories.length % palette.length];
    try {
      await invoke('add_category', { name: 'Nouvelle catégorie', color: pick.color, barColor: pick.bar });
      const cats = await invoke('get_categories');
      setCategories(cats);
      const newest = cats[cats.length - 1];
      if (newest) { setEditingCatId(newest.id); setCatNameDraft(newest.name); }
      autoSaveProfile();
    } catch (e) { showToast('❌ Erreur création', 2000); }
  };

  const deleteCategory = async (catId) => {
    if (categories.length <= 1) { showToast('⚠️ Impossible de supprimer la dernière catégorie', 2000); return; }
    const cat = categories.find(c => c.id === catId);
    const count = wallets.filter(w => w.category_id === catId).length;
    const msg = count > 0 ? `Supprimer "${cat?.name}" et ses ${count} wallet(s) ?` : `Supprimer la catégorie "${cat?.name}" ?`;
    if (!await showConfirm(msg)) return;
    try {
      await invoke('delete_category', { id: catId });
      await loadCategories();
      await loadWallets();
      autoSaveProfile();
    } catch (e) { showToast('❌ Erreur suppression', 2000); }
  };

  // ── Category reorder by arrows ──
  const moveCat = async (catId, direction) => {
    // direction: -1 = up one, +1 = down one, -Infinity = top, +Infinity = bottom
    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order);
    const ids = sorted.map(c => c.id);
    const idx = ids.indexOf(catId);
    if (idx === -1) return;

    let newIdx;
    if (direction === -Infinity) newIdx = 0;
    else if (direction === Infinity) newIdx = ids.length - 1;
    else newIdx = idx + direction;

    if (newIdx < 0 || newIdx >= ids.length || newIdx === idx) return;

    ids.splice(idx, 1);
    ids.splice(newIdx, 0, catId);

    // Optimistic UI
    const reordered = ids.map((id, i) => ({ ...categories.find(c => c.id === id), display_order: i }));
    setCategories(reordered);
    try { await invoke('reorder_categories', { categoryIds: ids }); } catch (e) { await loadCategories(); }
  };

  // Double-click timers
  const clickTimers = useRef({});
  const handleArrowClick = (catId, direction) => {
    const key = `${catId}-${direction}`;
    if (clickTimers.current[key]) {
      // Double click → move to top/bottom
      clearTimeout(clickTimers.current[key]);
      clickTimers.current[key] = null;
      moveCat(catId, direction < 0 ? -Infinity : Infinity);
    } else {
      // Single click — wait to see if double
      clickTimers.current[key] = setTimeout(() => {
        clickTimers.current[key] = null;
        moveCat(catId, direction);
      }, 250);
    }
  };

  // ── WalletRow: display only (no edit form = no focus issues) ──
  const WalletRow = ({ wallet }) => {
    const isLoading = loading[wallet.id];
    const cfg = allAssets[wallet.asset] || { symbol: wallet.asset.toUpperCase(), color: 'text-zinc-400', bg: 'bg-zinc-400/20' };
    
    // Handle encrypted wallets
    const displayName = getWalletDisplayName(wallet);
    const displayBalance = getWalletDisplayBalance(wallet);
    const valEur = (displayBalance || 0) * (prices[wallet.asset]?.eur || 0);
    const isCopied = copiedAddress === wallet.address;

    const handleQuickCopy = async (e) => {
      e.stopPropagation();
      if (!wallet.address) return;
      try { await navigator.clipboard.writeText(wallet.address); setCopiedAddress(wallet.address); setTimeout(() => setCopiedAddress(null), 1500); setTimeout(() => { navigator.clipboard.writeText('').catch(() => {}); }, 10000); } catch (err) { /* clipboard error */ }
    };

    return (
      <div className={`${T.rowBg} border ${T.rowBorder} rounded-lg px-3 py-2 flex items-center justify-between group`}>
        <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => startEdit(wallet)}>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.color} flex-shrink-0`}>{cfg.symbol}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium flex items-center gap-2">
              {displayName}
              {isWalletEncrypted(wallet) && <span className="text-amber-500 text-xs" title="Wallet chiffré">🔒</span>}
              {isLoading && <span className="text-amber-500 text-xs animate-pulse">⟳</span>}
            </div>
            <div className={`font-mono text-xs ${T.textFaint} truncate`}>
              {wallet.address && wallet.address !== '[ENCRYPTED]' ? maskAddress(wallet.address) : <span className={T.textFaint}>Aucune adresse</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="text-right cursor-pointer" onClick={() => startEdit(wallet)}>
            <div className="font-medium tabular-nums">{displayBalance != null ? maskBalance(displayBalance, 8) : (isWalletEncrypted(wallet) ? '🔒 Chiffré' : '–')}<span className={`${T.textMuted} text-sm ml-1`}>{cfg.symbol}</span></div>
            <div className={`text-xs ${T.textFaint} tabular-nums`}>{displayBalance != null ? maskBalance(valEur) : '–'} €</div>
          </div>
          <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-all">
            {wallet.address && (
              <>
                <button onClick={handleQuickCopy} title="Copier l'adresse"
                  className={`p-1 rounded transition-all duration-300 ${isCopied ? 'text-green-400 scale-110' : `${T.textFaint} hover:text-amber-500`}`}>
                  {isCopied ? <SaveIcon size={12} check /> : <CopyIcon size={12} />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setQrOverlay({ address: wallet.address, name: wallet.name }); }} title="QR Code"
                  className={`p-1 rounded ${T.textFaint} hover:text-amber-500 transition-colors`}>
                  <QRCodeIcon size={12} />
                </button>
              </>
            )}
            <button onClick={async (e) => { e.stopPropagation(); if (await showConfirm(`Supprimer "${wallet.name}" ?`)) deleteWallet(wallet.id); }}
              className={`${T.textFaint} hover:text-red-400 transition-all p-1`}>
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Helper: render edit form (inline) or display row
  const renderWalletItem = (w) => {
    if (editMode === `edit-${w.id}`) {
      return renderEditForm(w);
    }
    
    // Use Monero-specific row for Monero wallets
    if (w.asset === 'xmr') {
      return <MoneroWalletRow key={w.id} wallet={w} />;
    }
    
    // Use regular row for other assets
    return <WalletRow key={w.id} wallet={w} />;
  };
  
  // Helper to decrypt a wallet for display (uses session key on backend)
  const decryptWalletForDisplay = async (wallet) => {
    if (!isWalletEncrypted(wallet)) {
      return wallet;
    }

    try {
      const hasKey = await invoke('has_session_key');
      if (!hasKey) {
        return wallet; // Session locked, show encrypted data
      }
      const decryptedAddr = wallet.address && wallet.address !== '[ENCRYPTED]'
        ? await invoke('decrypt_wallet_data', { encryptedData: wallet.address })
        : wallet.address;
      return { ...wallet, address: decryptedAddr };
    } catch (_) {
      return wallet; // Decryption failed, show encrypted data
    }
  };

  // Monero-specific wallet row with extended key setup button
  const MoneroWalletRow = ({ wallet }) => {
    const isLoading = loading[wallet.id];
    const cfg = allAssets[wallet.asset] || { symbol: wallet.asset.toUpperCase(), color: 'text-zinc-400', bg: 'bg-zinc-400/20' };
    const moneroInfo = getMoneroWalletInfo(wallet);
    
    const displayName = getWalletDisplayName(wallet);
    const displayBalance = getWalletDisplayBalance(wallet);
    const valEur = (displayBalance || 0) * (prices[wallet.asset]?.eur || 0);
    const isCopied = copiedAddress === wallet.address;

    const handleQuickCopy = async (e) => {
      e.stopPropagation();
      if (!wallet.address) return;
      try { await navigator.clipboard.writeText(wallet.address); setCopiedAddress(wallet.address); setTimeout(() => setCopiedAddress(null), 1500); setTimeout(() => { navigator.clipboard.writeText('').catch(() => {}); }, 10000); } catch (err) { /* clipboard error */ }
    };

    return (
      <div className={`${T.rowBg} border ${T.rowBorder} rounded-lg px-3 py-2 flex items-center justify-between group`}>
        <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => startEdit(wallet)}>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.color} flex-shrink-0`}>{cfg.symbol}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium flex items-center gap-2">
              {displayName}
              {isWalletEncrypted(wallet) && <span className="text-amber-500 text-xs" title="Wallet chiffré">🔒</span>}
              {isLoading && <span className="text-amber-500 text-xs animate-pulse">⟳</span>}
              {moneroInfo && <span className="text-purple-400 text-xs" title="Clés Monero configurées">🔑</span>}
            </div>
            <div className={`font-mono text-xs ${T.textFaint} truncate`}>
              {wallet.address && wallet.address !== '[ENCRYPTED]' ? maskAddress(wallet.address) : <span className={T.textFaint}>Aucune adresse</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="text-right cursor-pointer" onClick={() => startEdit(wallet)}>
            <div className="font-medium tabular-nums">{displayBalance != null ? maskBalance(displayBalance, 8) : (isWalletEncrypted(wallet) ? '🔒 Chiffré' : '–')}<span className={`${T.textMuted} text-sm ml-1`}>{cfg.symbol}</span></div>
            <div className={`text-xs ${T.textFaint} tabular-nums`}>{displayBalance != null ? maskBalance(valEur) : '–'} €</div>
          </div>
          <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-all">
            {wallet.address && (
              <>
                <button onClick={handleQuickCopy} title="Copier l'adresse"
                  className={`p-1 rounded transition-all duration-300 ${isCopied ? 'text-green-400 scale-110' : `${T.textFaint} hover:text-amber-500`}`}>
                  {isCopied ? <SaveIcon size={12} check /> : <CopyIcon size={12} />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setQrOverlay({ address: wallet.address, name: wallet.name }); }} title="QR Code"
                  className={`p-1 rounded ${T.textFaint} hover:text-amber-500 transition-colors`}>
                  <QRCodeIcon size={12} />
                </button>
              </>
            )}
            {!moneroInfo && (
              <button onClick={(e) => { e.stopPropagation(); openMoneroSetup(wallet); }} title="Configurer les clés Monero"
                className={`p-1 rounded text-purple-400 hover:text-purple-300 transition-colors`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </button>
            )}
            {moneroInfo && (
              <button onClick={(e) => { e.stopPropagation(); fetchMoneroBalance(wallet); }} title="Mettre à jour la balance Monero"
                className={`p-1 rounded ${loading[wallet.id] ? 'text-amber-500 animate-pulse' : `${T.textFaint} hover:text-amber-500`} transition-colors`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="20 20 14 20 14 14"/><path d="M14 14 20 20"/><path d="M3 4 9 4 9 10"/><path d="M6 20 2 20 2 14"/><path d="M2 14 6 20"/>
                </svg>
              </button>
            )}
            <button onClick={async (e) => { e.stopPropagation(); if (await showConfirm(`Supprimer "${wallet.name}" ?`)) deleteWallet(wallet.id); }}
              className={`${T.textFaint} hover:text-red-400 transition-all p-1`}>
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Helper to get the actual API key (decrypted if necessary)
  const getActualApiKey = async () => {
    // If we have a plaintext key, use it
    if (etherscanApiKey) {
      return etherscanApiKey;
    }

    // If we have encrypted key, decrypt via session key on backend
    if (encryptedApiKey && apiKeySalt) {
      try {
        const hasKey = await invoke('has_session_key');
        if (!hasKey) return '';
        const decryptedKey = await invoke('decrypt_api_key_with_pin', {
          encrypted_key: encryptedApiKey,
          salt: apiKeySalt
        });
        return decryptedKey;
      } catch (_) {
        return '';
      }
    }

    // No API key available
    return '';
  };
  
  // Helper to check if API key is encrypted
  const isApiKeyEncrypted = () => {
    return !!encryptedApiKey && !!apiKeySalt;
  };

  return (
    <div className={`min-h-screen ${T.bg} ${T.textMain}`}>
      {/* Noctali starfield + moon + images */}
      {theme === 'noctali' && <><NoctaliStarfield /><NoctaliMoon /><NoctaliImages /></>}
      {theme === 'lunarpunk' && <><LunarPunkDust /><LunarPunkDunes /><LunarPunkMoon /></>}
      {theme === 'solarpunk' && <><SolarpunkBackground /><SolarpunkPollen /></>}
      <ConfirmModal />

      {/* ── Bloomberg-style Price Terminal (Ctrl+Shift+P / long-press API) ── */}
      {showPriceTerminal && (() => {
        const f = (n, d = 2) => n > 0 ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
        const f8 = (n) => f(n, 8);
        const p = prices;

        // Classify assets by source
        const binanceDirect = [ // Assets with direct EUR pair on Binance
          { sym: 'BTC', d: p.btc, pairs: 'BTCUSDT BTCEUR', src: 'Binance' },
          { sym: 'ETH', d: p.eth, pairs: 'ETHUSDT ETHEUR ETHBTC', src: 'Binance' },
          { sym: 'BCH', d: p.bch, pairs: 'BCHUSDT BCHEUR BCHBTC', src: 'Binance' },
          { sym: 'LTC', d: p.ltc, pairs: 'LTCUSDT LTCEUR LTCBTC', src: 'Binance' },
          { sym: 'ETC', d: p.etc, pairs: 'ETCUSDT ETCEUR ETCBTC', src: 'Binance' },
          { sym: 'LINK', d: p.link, pairs: 'LINKUSDT LINKEUR LINKBTC', src: 'Binance' },
          { sym: 'DOT', d: p.dot, pairs: 'DOTUSDT DOTEUR DOTBTC', src: 'Binance' },
          { sym: 'ADA', d: p.ada, pairs: 'ADAUSDT ADAEUR ADABTC', src: 'Binance' },
          { sym: 'SOL', d: p.sol, pairs: 'SOLUSDT SOLEUR SOLBTC', src: 'Binance' },
          { sym: 'AVAX', d: p.avax, pairs: 'AVAXUSDT AVAXEUR AVAXBTC', src: 'Binance' },
          { sym: 'DOGE', d: p.doge, pairs: 'DOGEUSDT DOGEEUR DOGEBTC', src: 'Binance' },
          { sym: 'XRP', d: p.xrp, pairs: 'XRPUSDT XRPEUR XRPBTC', src: 'Binance' },
          { sym: 'UNI', d: p.uni, pairs: 'UNIUSDT UNIEUR UNIBTC', src: 'Binance' },
          { sym: 'AAVE', d: p.aave, pairs: 'AAVEUSDT AAVEEUR AAVEBTC', src: 'Binance' },
          { sym: 'NEAR', d: p.near, pairs: 'NEARUSDT NEAREUR NEARBTC', src: 'Binance' },
          { sym: 'QTUM', d: p.qtum, pairs: 'QTUMUSDT QTUMEUR QTUMBTC', src: 'Binance' },
        ];
        const derived = [ // Assets with EUR derived from USD or BTC
          { sym: 'DASH', d: p.dash, pairs: 'DASHUSDT DASHBTC', src: 'Binance', deriv: 'EUR = USD × (BTC.eur / BTC.usd)' },
          { sym: 'PIVX', d: p.pivx, pairs: 'PIVXBTC PIVXETH', src: 'Binance', deriv: 'USD = BTC × BTC.usd · EUR = BTC × BTC.eur' },
          { sym: 'CRV', d: p.crv, pairs: 'CRVUSDT CRVBTC', src: 'Binance', deriv: 'EUR = USD × (BTC.eur / BTC.usd)' },
          { sym: 'XMR', d: p.xmr, pairs: 'tXMRUSD tXMRBTC', src: 'Bitfinex', deriv: 'EUR = USD × (BTC.eur / BTC.usd)' },
          { sym: 'XAUT', d: p.xaut, pairs: 'tXAUTUSD tXAUTBTC', src: 'Bitfinex', deriv: 'EUR = USD × (BTC.eur / BTC.usd)' },
          { sym: 'RAI', d: p.rai, pairs: 'rai→usd,btc', src: 'CoinGecko', deriv: 'EUR = USD × (BTC.eur / BTC.usd)' },
          { sym: 'PAXG', d: p.paxg, pairs: 'PAXGUSDT', src: 'Binance', deriv: 'EUR = USD × (BTC.eur / BTC.usd)' },
        ];
        const eurPerUsd = p.btc?.eur > 0 && p.btc?.usd > 0 ? (p.btc.eur / p.btc.usd) : 0;

        const Row = ({ cells, header }) => (
          <tr className={header ? 'text-amber-500/80' : 'text-zinc-300 hover:bg-zinc-800/50'}>
            {cells.map((c, i) => header
              ? <th key={i} className="text-left px-2 py-0.5 font-medium border-b border-zinc-700/50">{c}</th>
              : <td key={i} className="px-2 py-0.5 whitespace-nowrap">{c}</td>
            )}
          </tr>
        );

        return (
          <div className="fixed inset-0 z-[999] bg-black/[0.91] overflow-auto" onClick={(e) => { if (e.target === e.currentTarget) setShowPriceTerminal(false); }}>
            <div className="max-w-6xl mx-auto p-6 font-mono text-xs text-zinc-300">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 border-b border-amber-500/30 pb-3">
                <div>
                  <span className="text-amber-500 text-lg font-bold">JANUS</span>
                  <span className="text-zinc-500 text-lg ml-2">PRICE TERMINAL</span>
                  <span className="text-zinc-600 ml-4 text-[10px]">{lastPriceUpdate ? lastPriceUpdate.toLocaleTimeString() : '—'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-600">[Ctrl+Shift+P] · [Escape]</span>
                  <button onClick={() => setShowPriceTerminal(false)} className="text-zinc-500 hover:text-amber-500 text-lg">✕</button>
                </div>
              </div>

              {/* ── SECTION 1: Direct Feeds ── */}
              <div className="mb-6">
                <div className="text-amber-500/60 text-[10px] uppercase tracking-widest mb-2">▸ Direct Price Feeds</div>
                <table className="w-full">
                  <tbody>
                    <Row header cells={['ASSET', 'SOURCE', 'PAIRS', 'USD', 'EUR', 'BTC', 'ETH']} />
                    {binanceDirect.map(a => (
                      <Row key={a.sym} cells={[
                        <span className="text-amber-400 font-bold">{a.sym}</span>, 
                        <span className="text-green-500/70">{a.src}</span>,
                        <span className="text-zinc-600">{a.pairs}</span>,
                        f(a.d?.usd), f(a.d?.eur), f8(a.d?.btc), f8(a.d?.eth)
                      ]} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── SECTION 2: Derived Feeds ── */}
              <div className="mb-6">
                <div className="text-amber-500/60 text-[10px] uppercase tracking-widest mb-2">▸ Derived Feeds (EUR calculated)</div>
                <div className="text-zinc-600 text-[10px] mb-2 ml-2">
                  eur_per_usd = BTC.eur / BTC.usd = {f(p.btc?.eur)} / {f(p.btc?.usd)} = <span className="text-zinc-400">{f(eurPerUsd, 6)}</span>
                </div>
                <table className="w-full">
                  <tbody>
                    <Row header cells={['ASSET', 'SOURCE', 'PAIRS', 'USD', 'EUR ⚡', 'BTC', 'DERIVATION']} />
                    {derived.map(a => (
                      <Row key={a.sym} cells={[
                        <span className="text-amber-400 font-bold">{a.sym}</span>,
                        <span className={a.src === 'Binance' ? 'text-green-500/70' : a.src === 'Bitfinex' ? 'text-blue-400/70' : 'text-purple-400/70'}>{a.src}</span>,
                        <span className="text-zinc-600">{a.pairs}</span>,
                        f(a.d?.usd), 
                        <span className="text-yellow-500/80">{f(a.d?.eur)}</span>,
                        f8(a.d?.btc),
                        <span className="text-zinc-500 text-[10px]">{a.deriv}</span>
                      ]} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── SECTION 3: Forex & Indices ── */}
              <div className="mb-6">
                <div className="text-amber-500/60 text-[10px] uppercase tracking-widest mb-2">▸ Forex, Commodities & Indices</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <table className="w-full">
                      <tbody>
                        <Row header cells={['PAIR', 'RATE', 'SOURCE']} />
                        <Row cells={[<span className="text-blue-400 font-bold">EUR/USD</span>, <span className="text-white font-bold">{f(p.eurusd, 4)}</span>, <span className="text-zinc-600">BTC.usd / BTC.eur</span>]} />
                        {[
                          ['USD/JPY', p.forex_jpy_per_usd, 0], ['USD/CNY', p.forex_cny_per_usd, 4], ['USD/CAD', p.forex_cad_per_usd, 4],
                          ['USD/CHF', p.forex_chf_per_usd, 4], ['USD/GBP', p.forex_gbp_per_usd, 4], ['USD/SEK', p.forex_sek_per_usd, 4],
                          ['USD/NOK', p.forex_nok_per_usd, 4], ['USD/HKD', p.forex_hkd_per_usd, 4], ['USD/KRW', p.forex_krw_per_usd, 0],
                          ['USD/AUD', p.forex_aud_per_usd, 4], ['USD/NZD', p.forex_nzd_per_usd, 4], ['USD/SGD', p.forex_sgd_per_usd, 4],
                          ['USD/BRL', p.forex_brl_per_usd, 4], ['USD/ZAR', p.forex_zar_per_usd, 4], ['USD/RUB', p.forex_rub_per_usd, 2],
                        ].map(([pair, rate, dec]) => (
                          <Row key={pair} cells={[pair, f(rate, dec), <span className="text-zinc-600">{pair === 'USD/RUB' ? 'er-api.com' : 'Frankfurter'}</span>]} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table className="w-full">
                      <tbody>
                        <Row header cells={['INDEX', 'VALUE', 'SOURCE']} />
                        <Row cells={[<span className="text-yellow-600 font-bold">GOLD/oz</span>, <span className="text-yellow-500">{f(p.gold_usd_per_oz)} $</span>, <span className="text-zinc-600">PAXGUSDT Binance</span>]} />
                        <Row cells={['BRENT', `${f(p.brent_usd)} $`, <span className="text-zinc-600">Yahoo Finance</span>]} />
                        <Row cells={[
                          <span className={`font-bold ${p.vix >= 20 ? 'text-red-400' : 'text-green-400'}`}>VIX</span>,
                          <span className={p.vix >= 20 ? 'text-red-400' : 'text-green-400'}>{f(p.vix)}</span>,
                          <span className="text-zinc-600">Yahoo Finance</span>
                        ]} />
                        <Row cells={[<span className="font-bold text-green-300">DXY</span>, f(p.dxy), <span className="text-zinc-600">ICE formula (synth)</span>]} />
                      </tbody>
                    </table>
                    <div className="mt-3 p-2 bg-zinc-900/80 rounded border border-zinc-800 text-[10px] text-zinc-600">
                      <div className="text-zinc-500 mb-1">DXY = 50.143 × EUR/USD^(-0.576) × USD/JPY^(0.136)</div>
                      <div className="text-zinc-500">× GBP/USD^(-0.119) × USD/CAD^(0.091) × USD/SEK^(0.042) × USD/CHF^(0.036)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 4: Portfolio Totals Decomposition ── */}
              <div className="mb-6">
                <div className="text-amber-500/60 text-[10px] uppercase tracking-widest mb-2">▸ Portfolio Calculation Chain</div>
                <div className="p-3 bg-zinc-900/80 rounded border border-zinc-800 space-y-2">
                  {[...categories].sort((a, b) => a.display_order - b.display_order).map(cat => {
                    const val = getCategoryValueEur(cat.id);
                    const pct = getCategoryPercentage(cat.id);
                    const ws = getWalletsByCategory(cat.id);
                    const assetBreakdown = [...new Set(ws.map(w => w.asset))].map(a => {
                      const bal = ws.filter(w => w.asset === a).reduce((s, w) => s + (w.balance || 0), 0);
                      const eur = prices[a]?.eur || 0;
                      return { a, bal, eur, val: bal * eur };
                    }).filter(x => x.bal > 0);
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center gap-2">
                          <span className={`${cat.color} font-bold`}>{cat.name}</span>
                          <span className="text-zinc-600">= Σ(balance × price.eur) =</span>
                          <span className="text-white font-bold">{f(val)} €</span>
                          <span className="text-zinc-600">({f(pct, 1)}%)</span>
                        </div>
                        {assetBreakdown.length > 0 && (
                          <div className="ml-4 text-zinc-500">
                            {assetBreakdown.map(x => (
                              <span key={x.a} className="mr-3">{x.a.toUpperCase()}: {f(x.bal, 6)} × {f(x.eur)} = <span className="text-zinc-400">{f(x.val)} €</span></span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="border-t border-zinc-700/50 pt-2 mt-2 space-y-1">
                    <div><span className="text-zinc-500">TOTAL EUR</span> <span className="text-white font-bold ml-2">{f(getTotalEur())} €</span> <span className="text-zinc-600 ml-2">= Σ categories</span></div>
                    <div><span className="text-zinc-500">TOTAL USD</span> <span className="text-white font-bold ml-2">{f(getTotalUsd())} $</span> <span className="text-zinc-600 ml-2">= totalEur × eurusd ({f(p.eurusd, 4)})</span></div>
                    <div><span className="text-zinc-500">TOTAL BTC</span> <span className="text-amber-500 font-bold ml-2">{f(getTotalBtc(), 8)} ₿</span> <span className="text-zinc-600 ml-2">= totalEur / btc.eur ({f(p.btc?.eur)})</span></div>
                    <div><span className="text-zinc-500">TOTAL GOLD</span> <span className="text-yellow-500 font-bold ml-2">{f(getTotalGoldOz(), 4)} oz</span> <span className="text-zinc-600 ml-2">= totalUsd / gold_oz ({f(p.gold_usd_per_oz)})</span></div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-zinc-700 text-[10px] text-center border-t border-zinc-800 pt-3">
                Binance REST API · Bitfinex v2 · CoinGecko free · Frankfurter (ECB) · er-api.com · Yahoo Finance
              </div>
            </div>
          </div>
        );
      })()}
      {/* QR Code Overlay */}
      {qrOverlay && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center" onClick={() => setQrOverlay(null)}>
          <div className={`${T.cardBg} border ${T.cardBorder} rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center`} onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-1 text-lg">{qrOverlay.name}</h3>
            <div className="flex justify-center my-6">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={qrOverlay.address} size={200} level="M" />
              </div>
            </div>
            <p className={`font-mono text-xs ${T.textMuted} break-all mb-5 px-2 leading-relaxed`}>{maskAddress(qrOverlay.address)}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={async () => {
                try { await navigator.clipboard.writeText(qrOverlay.address); showToast('Adresse copiée ✓'); setTimeout(() => { navigator.clipboard.writeText('').catch(() => {}); }, 10000); } catch(e) { /* clipboard error */ }
              }} className="px-5 py-2.5 bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors">
                Copier l'adresse
              </button>
              <button onClick={() => setQrOverlay(null)} className={`px-5 py-2.5 ${T.inputBg} ${T.textMuted} rounded-lg text-sm hover:opacity-80 transition-opacity`}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      <header className={`border-b ${T.headerBorder} sticky top-0 ${T.headerBg} backdrop-blur z-10`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={refreshAll} disabled={refreshing}
                className="w-10 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-zinc-900 font-bold text-xl transition-colors disabled:opacity-50">
                <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              </button>
              <div>
                <h1 className="font-bold text-xl select-none cursor-default" onClick={(e) => { if (e.detail === 3) setShowWhitepaper(true); }}>JANUS Monitor</h1>
                <p className={`text-xs ${T.textMuted}`}>Réserve sécurisée · <span className={T.textFaint}>v2.3</span> · <span className={T.accentMuted}>{activeProfile}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative"
                onMouseEnter={() => setShowStatusTooltip(true)} onMouseLeave={() => { setShowStatusTooltip(false); if (apiPressTimer.current) { clearTimeout(apiPressTimer.current); apiPressTimer.current = null; } }}
                onPointerDown={() => { apiPressTimer.current = setTimeout(() => { apiPressTimer.current = null; setShowPriceTerminal(true); }, 2000); }}
                onPointerUp={() => { if (apiPressTimer.current) { clearTimeout(apiPressTimer.current); apiPressTimer.current = null; } }}>
                <div className="flex items-center gap-1 mr-1 cursor-help">
                  <div className={`w-1.5 h-1.5 rounded-full ${apiStatus.binance ? 'bg-green-500' : apiStatus.binance === false ? 'bg-red-500' : 'bg-zinc-600'}`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${apiStatus.forex ? 'bg-green-500' : apiStatus.forex === false ? 'bg-red-500' : 'bg-zinc-600'}`} />
                </div>
                {showStatusTooltip && (
                  <div className={`absolute top-8 right-0 ${T.cardBg} border ${T.cardBorder2} rounded-lg px-3 py-2 shadow-xl z-30 whitespace-nowrap text-xs`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${apiStatus.binance ? 'bg-green-500' : apiStatus.binance === false ? 'bg-red-500' : 'bg-zinc-600'}`} />
                      <span>Prix Binance : {apiStatus.binance ? <span className="text-green-400">OK</span> : apiStatus.binance === false ? <span className="text-red-400">Erreur</span> : <span className={T.textFaint}>—</span>}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${apiStatus.forex ? 'bg-green-500' : apiStatus.forex === false ? 'bg-red-500' : 'bg-zinc-600'}`} />
                      <span>Forex / indices : {apiStatus.forex ? <span className="text-green-400">OK</span> : apiStatus.forex === false ? <span className="text-red-400">Erreur</span> : <span className={T.textFaint}>—</span>}</span>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => { autoSaveProfile(); }} title="Sauvegarder"
                className={`p-2 rounded-lg ${T.inputBg} transition-all duration-300 ${savePulse ? 'text-green-400 scale-110' : `${T.textMuted} hover:text-amber-500`}`}>
                <SaveIcon size={18} check={savePulse} />
              </button>
              <div className="relative">
                <button onClick={() => { setShowMenuDrawer(!showMenuDrawer); setMenuView('main'); loadProfiles(); }}
                  className={`p-2 rounded-lg ${T.inputBg} ${T.textMuted} hover:text-amber-500 transition-colors`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                {pendingCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingCount}</span>}
              </div>
              <button
              onClick={() => setHideBalances(!hideBalances)}
              className={`p-2 rounded-lg transition-colors ${hideBalances ? 'bg-amber-500/20 text-amber-500' : `${T.inputBg} ${T.textMuted}`}`}
              >
              {hideBalances ? <EyeOffIcon /> : <EyeIcon />}
              </button>

              <div className={`text-right text-xs ${T.textFaint}`}>
              <div>Binance</div>
              {lastPriceUpdate && <div>{lastPriceUpdate.toLocaleTimeString('fr-FR')}</div>}
              </div>
              </div>
              </div>

          {/* Totaux */}
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1.6fr 1fr 1fr auto' }}>
            <div className={`${T.cardBg} border rounded-lg px-3 py-2`}
              style={{
                borderColor: theme === 'lunarpunk' ? 'rgba(109,143,248,0.3)' : theme === 'noctali' ? 'rgba(244,217,149,0.3)' : 'rgba(245,158,11,0.3)',
                boxShadow: theme === 'lunarpunk' ? '0 0 15px rgba(109,143,248,0.06)' : theme === 'noctali' ? '0 0 15px rgba(244,217,149,0.06)' : 'none',
              }}>
              <div className={`text-xs ${T.accentMuted}`}>Total BTC</div>
              <div className={`text-2xl font-bold tabular-nums ${T.accent}`}>{maskBalance(getTotalBtc(), 8)}</div>
            </div>
            <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg px-3 py-2`}>
              <div className={`text-xs ${T.textMuted}`}>USD</div>
              <div className="text-xl font-semibold tabular-nums">{maskBalance(getTotalUsd())} $</div>
            </div>
            <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg px-3 py-2`}>
              <div className={`text-xs ${T.textMuted}`}>EUR</div>
              <div className="text-xl font-semibold tabular-nums">{maskBalance(getTotalEur())} €</div>
            </div>
            <button onClick={() => setShowForex(!showForex)} className={`flex items-end justify-center px-3 pb-2 ${T.textFaint} self-end rounded border border-transparent hover:border-current/20 hover:bg-amber-500/10 hover:text-amber-500 transition-colors`}>
              <ChevronIcon size={16} className={`transition-transform duration-200 ${showForex ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Devises */}
          {showForex && (
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg p-3`}>
                <div className="text-xs text-red-400/70 font-medium mb-2">Asie-Pacifique</div>
                <div className="space-y-1 text-sm tabular-nums">
                  <div className="flex justify-between"><span className={T.textMuted}>JPY</span><span>{maskBalance(getTotal('forex_jpy_per_usd'), 0)} ¥</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>CNY</span><span>{maskBalance(getTotal('forex_cny_per_usd'), 0)} ¥</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>KRW</span><span>{maskBalance(getTotal('forex_krw_per_usd'), 0)} ₩</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>HKD</span><span>{maskBalance(getTotal('forex_hkd_per_usd'))} $</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>SGD</span><span>{maskBalance(getTotal('forex_sgd_per_usd'))} $</span></div>
                </div>
              </div>
              <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg p-3`}>
                <div className="text-xs text-blue-400/70 font-medium mb-2">Europe</div>
                <div className="space-y-1 text-sm tabular-nums">
                  <div className="flex justify-between font-medium"><span className="text-blue-400/80">EUR/USD</span><span>{prices.eurusd > 0 ? formatNum(prices.eurusd, 4) : '–'}</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>GBP</span><span>{maskBalance(getTotal('forex_gbp_per_usd'))} £</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>CHF</span><span>{maskBalance(getTotal('forex_chf_per_usd'))} Fr</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>SEK</span><span>{maskBalance(getTotal('forex_sek_per_usd'))} kr</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>NOK</span><span>{maskBalance(getTotal('forex_nok_per_usd'))} kr</span></div>
                </div>
              </div>
              <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg p-3`}>
                <div className="text-xs text-emerald-400/70 font-medium mb-2">Amériques & Océanie</div>
                <div className="space-y-1 text-sm tabular-nums">
                  <div className="flex justify-between"><span className={T.textMuted}>CAD</span><span>{maskBalance(getTotal('forex_cad_per_usd'))} $</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>AUD</span><span>{maskBalance(getTotal('forex_aud_per_usd'))} $</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>NZD</span><span>{maskBalance(getTotal('forex_nzd_per_usd'))} $</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>BRL</span><span>{maskBalance(getTotal('forex_brl_per_usd'))} R$</span></div>
                </div>
              </div>
              <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg p-3`}>
                <div className="text-xs text-yellow-500/70 font-medium mb-2">Indices & Matières</div>
                <div className="space-y-1 text-sm tabular-nums">
                  <div className="flex justify-between"><span className={T.textMuted}>RUB</span><span>{maskBalance(getTotal('forex_rub_per_usd'), 0)} ₽</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>ZAR</span><span>{maskBalance(getTotal('forex_zar_per_usd'))} R</span></div>
                  <div className={`flex justify-between border-t ${T.divider} pt-1 mt-1`}><span className="text-yellow-600">Or oz</span><span className="text-yellow-600 font-medium">{maskBalance(getTotalGoldOz(), 4)}</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>Brent</span><span>{prices.brent_usd > 0 ? `${formatNum(prices.brent_usd)} $` : '–'}</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>DXY</span><span>{prices.dxy > 0 ? formatNum(prices.dxy, 2) : '–'}</span></div>
                  <div className="flex justify-between"><span className={T.textMuted}>VIX</span><span className={`font-medium ${prices.vix >= 20 ? 'text-red-400' : 'text-green-400'}`}>{prices.vix > 0 ? formatNum(prices.vix, 2) : '–'}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Jauge répartition */}
          <div className="mb-2">
            <div className={`flex h-1.5 rounded-full overflow-hidden ${T.barBg} mb-2`}>
              {categories.map(cat => {
                const pct = getCategoryPercentage(cat.id);
                return pct > 0 ? <div key={cat.id} style={{ width: `${pct}%`, backgroundColor: cat.bar_color }} className="transition-all" /> : null;
              })}
            </div>
            <div className="flex gap-x-4 text-xs flex-wrap">
              {categories.map(cat => (
                <div key={cat.id}>
                  <span className={`font-semibold tabular-nums ${cat.color}`}>{getCategoryPercentage(cat.id).toFixed(1)}%</span>
                  <span className={`${T.textMuted} ml-1`}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini prix */}
          <div className="grid grid-cols-5 gap-2">
            {['btc', 'eth', 'xmr', 'bch', 'ltc'].map(a => <MiniPriceCard key={a} asset={a} />)}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 relative" style={{ zIndex: 2 }}>

        {/* Categories — sorted by display_order */}
        {[...categories]
          .sort((a, b) => a.display_order - b.display_order)
          .map((category, catIdx, sortedCats) => {
            const catWallets = wallets.filter(w => w.category_id === category.id);
            const uniqueAssets = [...new Set(catWallets.map(w => w.asset))];
            const pct = getCategoryPercentage(category.id);
            const isEditingCat = editingCatId === category.id;
            const isFirst = catIdx === 0;
            const isLast = catIdx === sortedCats.length - 1;

            return (
              <section key={category.id} className={`transition-all rounded-xl border ${T.cardBorder} ${T.cardBg} p-4`}>
                {/* Category header — arrows + inline editable name + percentage + TokenSearch inline */}
                <div className="group flex items-center gap-2 mb-3">
                  {/* Reorder arrows */}
                  {categories.length > 1 && (
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => !isFirst && handleArrowClick(category.id, -1)}
                        className={`p-1 rounded transition-colors border border-transparent hover:border-current/20 ${isFirst ? 'text-zinc-700 cursor-default' : `${T.textFaint} hover:text-amber-500 hover:bg-amber-500/10`}`}
                        title={isFirst ? '' : '1 clic: monter — 2 clics: tout en haut'}
                        disabled={isFirst}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="18 15 12 9 6 15"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => !isLast && handleArrowClick(category.id, 1)}
                        className={`p-1 rounded transition-colors border border-transparent hover:border-current/20 ${isLast ? 'text-zinc-700 cursor-default' : `${T.textFaint} hover:text-amber-500 hover:bg-amber-500/10`}`}
                        title={isLast ? '' : '1 clic: descendre — 2 clics: tout en bas'}
                        disabled={isLast}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Category name — click to edit inline */}
                  {isEditingCat ? (
                    <input
                      autoFocus
                      type="text"
                      value={catNameDraft}
                      onChange={e => setCatNameDraft(e.target.value)}
                      onBlur={() => saveCatName(category.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveCatName(category.id);
                        if (e.key === 'Escape') setEditingCatId(null);
                      }}
                      className={`text-sm font-semibold uppercase tracking-wide ${category.color} bg-transparent border-b border-current focus:outline-none px-0 py-0 w-40`}
                    />
                  ) : (
                    <h2
                      onClick={() => startEditCatName(category)}
                      className={`text-sm font-semibold uppercase tracking-wide ${category.color} cursor-text hover:opacity-80 transition-opacity select-none`}
                      title="Cliquer pour renommer"
                    >
                      {category.name}
                    </h2>
                  )}

                  {/* Percentage next to name */}
                  <span className={`text-xs font-medium tabular-nums ${T.textMuted}`}>
                    {pct.toFixed(1)}%
                  </span>

                  <div className="flex-1" />

                  {/* Token search — inline on same line */}
                  <TokenSearch category={category} altcoins={altcoinsList} onAddToken={handleAddToken} />

                  {/* Delete button — only if more than 1 category */}
                  {categories.length > 1 && (
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${T.textFaint} hover:text-red-500 p-1`}
                      title="Supprimer cette catégorie"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>

                {/* Assets & wallets */}
                {uniqueAssets.length > 0 ? uniqueAssets.map(asset => {
                  const ws = catWallets.filter(w => w.asset === asset);
                  if (ws.length === 0) return null;
                  return (
                    <div key={asset}>
                      <PriceCard asset={asset} walletCount={ws.length} category={category.id} />
                      {expandedAssets[asset] !== false && <div className="space-y-1.5 mb-3">{ws.map(renderWalletItem)}</div>}
                    </div>
                  );
                }) : (
                  <div className={`text-center py-6 ${T.textMuted} text-sm border-2 border-dashed ${T.cardBorder2} rounded-lg`}>
                    Aucun wallet. Utilisez la barre de recherche pour en ajouter.
                  </div>
                )}
              </section>
            );
          })}

        {/* ── Bouton Ajouter une catégorie ── */}
        <button
          onClick={addCategory}
          className={`w-full py-3.5 px-4 border-2 border-dashed ${T.cardBorder2} rounded-xl ${T.textMuted} hover:border-amber-500/50 hover:text-amber-500 transition-all text-sm font-medium flex items-center justify-center gap-2`}
        >
          <span className="text-lg leading-none">+</span>
          Ajouter une catégorie
        </button>

        <footer className={`pt-4 border-t ${T.headerBorder} text-center text-xs ${T.textFaint}`}>
          {theme === 'noctali' ? (
            <span>JANUS — <span style={{ color: '#F4D995' }}>Les anneaux brillent au clair de lune</span> · Extraction 60% · Recapitalisation 40%</span>
          ) : theme === 'lunarpunk' ? (
            <span>JANUS — <span style={{ color: '#6d8ff8' }}>Beyond the dunes, the signal persists</span> · Extraction 60% · Recapitalisation 40%</span>
          ) : theme === 'solarpunk' ? (
            <span>JANUS — <span style={{ color: '#2a7a1a' }}>La lumière nourrit ce que l'ombre protège</span> · Extraction 60% · Recapitalisation 40%</span>
          ) : (
            'JANUS — Extraction 60% • Recapitalisation 40%'
          )}
        </footer>
      </main>


      {/* ── Unified Menu Drawer ── */}
      <div className={`fixed top-0 right-0 h-full w-80 ${T.cardBg} border-l ${T.cardBorder2} shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${showMenuDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 h-full flex flex-col">
          {/* Header with back arrow or close */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {menuView !== 'main' && (
                <button onClick={() => setMenuView('main')} className={`p-1 rounded-lg ${T.textMuted} hover:text-amber-500 transition-colors`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
              )}
              <h2 className="text-lg font-semibold">
                {menuView === 'main' ? 'Menu' : menuView === 'profiles' ? 'Profils' : menuView === 'settings' ? 'Paramètres' : 'Sécurité'}
              </h2>
            </div>
            <button onClick={() => setShowMenuDrawer(false)} className={`p-1.5 rounded-lg ${T.inputBg} ${T.textMuted} hover:opacity-80`}>✕</button>
          </div>

          {/* ── MAIN VIEW ── */}
          {menuView === 'main' && (
            <div className="space-y-2 flex-1">
              <button onClick={() => { setMenuView('profiles'); loadProfiles(); }}
                className={`w-full px-4 py-3 ${T.inputBg} rounded-lg text-sm border ${T.inputBorder} transition-colors hover:border-amber-500/30 flex items-center gap-3`}>
                <span className="text-base">👤</span>
                <div className="text-left flex-1">
                  <div className="font-medium">Profils</div>
                  <div className={`text-xs ${T.textFaint}`}>Actif : <span className="text-amber-500">{activeProfile}</span></div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={T.textFaint}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <button onClick={() => setMenuView('settings')}
                className={`w-full px-4 py-3 ${T.inputBg} rounded-lg text-sm border ${T.inputBorder} transition-colors hover:border-amber-500/30 flex items-center gap-3`}>
                <span className="text-base">⚙</span>
                <div className="text-left flex-1"><div className="font-medium">Paramètres</div></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={T.textFaint}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <button onClick={() => { setShowMenuDrawer(false); setShowPendingPanel(true); }}
                className={`w-full px-4 py-3 ${T.inputBg} rounded-lg text-sm border ${T.inputBorder} transition-colors hover:border-amber-500/30 flex items-center gap-3`}>
                <span className="text-base">🔔</span>
                <div className="text-left flex-1"><div className="font-medium">Transactions en attente</div></div>
                {pendingCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pendingCount}</span>}
              </button>
              <button onClick={() => setMenuView('security')}
                className={`w-full px-4 py-3 ${T.inputBg} rounded-lg text-sm border ${T.inputBorder} transition-colors hover:border-amber-500/30 flex items-center gap-3`}>
                <span className="text-base">🔒</span>
                <div className="text-left flex-1">
                  <div className="font-medium">Sécurité</div>
                  <div className={`text-xs ${T.textFaint}`}>
                    {(() => {
                      const parts = [];
                      if (profileSecurity.has_password) parts.push('MDP');
                      if (profileSecurity.has_pin) parts.push('PIN');
                      if (profileSecurity.has_totp) parts.push('2FA');
                      return parts.length > 0 ? parts.join(' + ') + ' actif' : 'Non protégé';
                    })()}
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={T.textFaint}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              {(profileSecurity.has_pin || profileSecurity.has_password) && (
                <button onClick={() => { setShowMenuDrawer(false); setIsLocked(true); setTheme('dark'); clearSensitiveState(); setAuthInputs({ password: '', pin: '', totp_code: '' }); const s = getAuthSteps(profileSecurity); setAuthStep(s[0] || null); }}
                  className={`w-full px-4 py-3 ${T.inputBg} rounded-lg text-sm border border-amber-500/20 transition-colors hover:border-amber-500/40 flex items-center gap-3`}>
                  <span className="text-base">🔐</span>
                  <div className="text-left flex-1"><div className="font-medium text-amber-500">Verrouiller maintenant</div></div>
                </button>
              )}
              <div className={`border-t ${T.cardBorder2} my-2`} />
              <button onClick={() => { setShowMenuDrawer(false); startAnonymous(); }}
                className={`w-full px-4 py-3 ${T.inputBg} rounded-lg text-sm border ${T.inputBorder} transition-colors hover:border-amber-500/30 flex items-center gap-3`}>
                <span className="text-base">👻</span>
                <div className="text-left flex-1"><div className="font-medium">Profil anonyme temporaire</div></div>
              </button>
              <button onClick={() => { setShowMenuDrawer(false); handleReset(); }}
                className="w-full px-4 py-3 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 border border-red-500/20 flex items-center gap-3">
                <span className="text-base">🗑</span>
                <div className="text-left flex-1"><div className="font-medium">Reset / Nouveau profil vierge</div></div>
              </button>
            </div>
          )}

          {/* ── PROFILES VIEW ── */}
          {menuView === 'profiles' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Active profile indicator */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${T.cardBg2} border ${T.cardBorder2} mb-4`}>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                <span className={`text-xs ${T.textMuted}`}>Profil actif :</span>
                <span className="text-sm font-medium text-amber-500">{activeProfile}</span>
              </div>
              {/* Save */}
              <div className="mb-4">
                <label className={`block text-sm ${T.textMuted} mb-1`}>Nouveau profil</label>
                <div className="flex gap-1">
                  <input type="text" value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                    placeholder="Nom du profil..." className={`flex-1 px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm focus:outline-none focus:border-amber-500/50`} />
                  <button onClick={handleSaveProfile} className="px-3 py-2 bg-amber-500 text-zinc-900 rounded text-sm font-medium hover:bg-amber-400 transition-colors flex items-center gap-1"><SaveIcon size={14} /> Sauver</button>
                </div>
                <p className={`text-xs ${T.textFaint} mt-1`}>Auto-save toutes les 2 min</p>
              </div>
              {/* Load */}
              <div className="flex-1 overflow-auto">
                <label className={`block text-sm ${T.textMuted} mb-1`}>Charger un profil</label>
                {profiles.filter(p => p !== '__autosave__').length > 0 ? (
                  <div className="space-y-1">
                    {profiles.filter(p => p !== '__autosave__').map(p => (
                      <div key={p} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border group transition-colors ${p === activeProfile ? `${T.cardBg} border-amber-500/40` : `${T.rowBg} ${T.rowBorder} hover:border-amber-500/20`}`}>
                        <button onClick={() => handleLoadProfile(p)} className="text-sm flex-1 text-left flex items-center gap-2">
                          {p === activeProfile && <span className="text-amber-500 text-xs">●</span>}
                          <span className={p === activeProfile ? 'text-amber-500 font-medium' : ''}>{p}</span>
                        </button>
                        <button onClick={() => handleDeleteProfile(p)} className={`${T.textFaint} hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1`}>
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${T.textFaint} py-2`}>Aucun profil sauvegardé</p>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS VIEW ── */}
          {menuView === 'settings' && (
            <div className="flex-1 flex flex-col overflow-auto">
              <div className="space-y-5 flex-1">
                <div>
                  <label className={`block text-sm ${T.textMuted} mb-2`}>Thème</label>
                  <div className="flex gap-2 mb-3">
                    {[
                      { key: 'dark', label: '🌙 Sombre' },
                      { key: 'light', label: '☀️ Clair' },
                      { key: 'sepia', label: '📜 Sépia' },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => setTheme(opt.key)}
                        className={`flex-1 px-3 py-2 rounded text-sm border ${theme === opt.key
                          ? `${T.accentBorder} ${T.accent} bg-opacity-10`
                          : `${T.inputBorder} ${T.inputBg} ${T.textMuted}`}`}
                        style={theme === opt.key ? { backgroundColor: 'rgba(245,158,11,0.1)' } : {}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {/* Special Edition dropdown */}
                  <details className={`group rounded-lg border ${T.inputBorder} ${T.inputBg} overflow-hidden`}>
                    <summary className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm ${T.textMuted} select-none hover:opacity-80`}>
                      <span>✨ Spécial Édition {(theme === 'noctali' || theme === 'lunarpunk' || theme === 'solarpunk') && <span className={T.accent}>●</span>}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`${T.textFaint} transition-transform group-open:rotate-90`}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </summary>
                    <div className="px-2 pb-2 pt-1 space-y-1">
                      {[
                        { key: 'noctali', label: '🌑 Noctali', desc: 'v1.0 — Umbreon starfield', accent: '#F4D995' },
                        { key: 'lunarpunk', label: '🔮 Lunar Punk', desc: 'v2.2 — Désert dystopique', accent: '#6d8ff8' },
                        { key: 'solarpunk', label: '🌿 Solarpunk', desc: 'v2.3 — Nature meets technology', accent: '#7BC74D' },
                      ].map(opt => (
                        <button key={opt.key} onClick={() => setTheme(opt.key)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm border transition-all ${theme === opt.key
                            ? ''
                            : `${T.inputBorder} hover:opacity-80`}`}
                          style={theme === opt.key ? { backgroundColor: `${opt.accent}15`, borderColor: `${opt.accent}66` } : {}}>
                          <div className="text-left flex-1">
                            <div className={`font-medium ${theme === opt.key ? '' : T.textMuted}`}
                              style={theme === opt.key ? { color: opt.accent } : {}}>{opt.label}</div>
                            <div className={`text-[10px] ${T.textFaint}`}>{opt.desc}</div>
                          </div>
                          {theme === opt.key && <span style={{ color: opt.accent }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
                <div>
                  <label className={`block text-sm ${T.textMuted} mb-1`}>Clé API Etherscan</label>
                  <div className="flex gap-2">
                    <input type="text" value={etherscanApiKey} onChange={e => setEtherscanApiKey(e.target.value)}
                      placeholder="Votre clé API..." 
                      className={`flex-1 px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm font-mono focus:outline-none ${etherscanApiKey ? '' : 'italic'}`} 
                      disabled={isApiKeyEncrypted()} />
                    {isApiKeyEncrypted() ? (
                      <button onClick={decryptApiKeyTemporarily} 
                        className={`px-3 py-2 ${T.accentBg} ${T.accent} rounded text-sm font-medium hover:opacity-90`} title="Déchiffrer temporairement">
                        🔓
                      </button>
                    ) : (
                      <button onClick={encryptCurrentApiKey} 
                        className={`px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-500`} title="Chiffrer la clé API">
                        🔒
                      </button>
                    )}
                  </div>
                  <p className={`text-xs ${T.textFaint} mt-1`}>
                    {isApiKeyEncrypted() ? (
                      <span className="text-green-400">✅ Clé API chiffrée et sécurisée </span>
                    ) : (
                      <span>Requis pour ETH/ERC-20. </span>
                    )}
                    <button onClick={() => invoke('open_url', { url: 'https://etherscan.io/apis' })} className="text-amber-500 hover:underline">etherscan.io/apis</button>
                  </p>
                </div>
                <div className="border-t pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={monitoringEnabled}
                      onChange={async (e) => {
                        const enabled = e.target.checked;
                        setMonitoringEnabled(enabled);
                        try {
                          await invoke('set_monitoring_enabled', { enabled });
                          showToast(enabled ? '✅ Monitoring activé' : '⚠️ Monitoring désactivé', 2000);
                        } catch (err) {
                        }
                      }}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-2 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-sm font-medium">Monitoring des transactions</div>
                      <div className={`text-xs ${T.textFaint}`}>
                        Surveiller automatiquement les nouvelles transactions
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <button onClick={saveSettings} className="w-full px-4 py-2.5 bg-amber-500 text-zinc-900 rounded-lg text-sm font-medium hover:bg-amber-400 mt-4">Sauvegarder</button>
            </div>
          )}

          {/* ── SECURITY VIEW ── */}
          {menuView === 'security' && (
            <div className="flex-1 flex flex-col overflow-auto">
              <div className="space-y-5 flex-1">
                {/* Current status — factor indicators */}
                <div className={`px-3 py-3 rounded-lg border ${(profileSecurity.has_pin || profileSecurity.has_password || profileSecurity.has_totp) ? 'border-green-500/30 bg-green-500/5' : `${T.inputBorder} ${T.inputBg}`}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{(profileSecurity.has_pin || profileSecurity.has_password) ? '🔒' : '🔓'}</span>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${(profileSecurity.has_pin || profileSecurity.has_password) ? 'text-green-500' : T.textMuted}`}>
                        {(profileSecurity.has_pin || profileSecurity.has_password) ? 'Profil protégé' : 'Profil non protégé'}
                      </div>
                      <div className={`text-xs ${T.textFaint}`}>{activeProfile}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`w-2 h-2 rounded-full ${profileSecurity.has_password ? 'bg-green-500' : 'bg-zinc-600'}`} />
                      <span className={T.textMuted}>Mot de passe</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`w-2 h-2 rounded-full ${profileSecurity.has_pin ? 'bg-green-500' : 'bg-zinc-600'}`} />
                      <span className={T.textMuted}>PIN</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className={`w-2 h-2 rounded-full ${profileSecurity.has_totp ? 'bg-green-500' : 'bg-zinc-600'}`} />
                      <span className={T.textMuted}>2FA</span>
                    </div>
                  </div>
                </div>

                {/* ── Password factor ── */}
                <div className={`p-3 rounded-lg border ${T.inputBorder} ${T.inputBg}`}>
                  <div className={`text-xs font-medium ${T.textMuted} mb-2`}>Mot de passe</div>
                  {profileSecurity.has_password ? (
                    <div className="flex gap-2">
                      <button onClick={() => { setPinModal({ mode: 'setup', onConfirm: async (pwd) => {
                        await invoke('set_profile_password', { profileName: activeProfile, rawPassword: pwd });
                        const sec = await invoke('get_profile_security', { profileName: activeProfile });
                        setProfileSecurity(sec);
                        showToast('Mot de passe modifié');
                      }, title: 'Changer le mot de passe', minLength: 8, placeholder: 'Nouveau mot de passe (min 8 car.)' }); }}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs border ${T.inputBorder} ${T.textMuted} hover:border-amber-500/30`}>
                        Changer
                      </button>
                      <button onClick={async () => {
                        if (!await showConfirm('Supprimer le mot de passe ?')) return;
                        setPinModal({ mode: 'confirm', onConfirm: async (pwd) => {
                          await invoke('remove_profile_password', { profileName: activeProfile, currentPassword: pwd });
                          const sec = await invoke('get_profile_security', { profileName: activeProfile });
                          setProfileSecurity(sec);
                          showToast('Mot de passe supprimé');
                        }, title: 'Confirmer avec mot de passe actuel' });
                      }} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs border border-red-500/20 hover:bg-red-500/20">
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setPinModal({ mode: 'setup', onConfirm: async (pwd) => {
                      await invoke('set_profile_password', { profileName: activeProfile, rawPassword: pwd });
                      const sec = await invoke('get_profile_security', { profileName: activeProfile });
                      setProfileSecurity(sec);
                      showToast('Mot de passe configuré');
                    }, title: 'Configurer un mot de passe', minLength: 8, placeholder: 'Mot de passe (min 8 caractères)' }); }}
                      className="w-full px-3 py-2 bg-amber-500 text-zinc-900 rounded-lg text-xs font-medium hover:bg-amber-400">
                      Configurer un mot de passe
                    </button>
                  )}
                </div>

                {/* ── PIN factor ── */}
                <div className={`p-3 rounded-lg border ${T.inputBorder} ${T.inputBg}`}>
                  <div className={`text-xs font-medium ${T.textMuted} mb-2`}>Code PIN</div>
                  {profileSecurity.has_pin ? (
                    <div className="flex gap-2">
                      <button onClick={handlePinChange}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs border ${T.inputBorder} ${T.textMuted} hover:border-amber-500/30`}>
                        Changer
                      </button>
                      <button onClick={async () => {
                        if (!await showConfirm('Supprimer le PIN ?')) return;
                        try {
                          const pin = await requestPinConfirmation('Confirmer avec PIN actuel');
                          await invoke('remove_profile_pin', { profileName: activeProfile, currentPin: pin });
                          const sec = await invoke('get_profile_security', { profileName: activeProfile });
                          setProfileSecurity(sec);
                          showToast('PIN supprimé');
                        } catch (e) { if (String(e) !== 'Error: Opération annulée') showToast('Échec'); }
                      }} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs border border-red-500/20 hover:bg-red-500/20">
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <button onClick={handlePinSetup}
                      className="w-full px-3 py-2 bg-amber-500 text-zinc-900 rounded-lg text-xs font-medium hover:bg-amber-400">
                      Configurer un PIN
                    </button>
                  )}
                </div>

                {/* ── 2FA TOTP ── */}
                <div className={`p-3 rounded-lg border ${T.inputBorder} ${T.inputBg}`}>
                  <div className={`text-xs font-medium ${T.textMuted} mb-2`}>Authentification 2FA (TOTP)</div>
                  {profileSecurity.has_totp ? (
                    <button onClick={async () => {
                      if (!await showConfirm('Désactiver l\'authentification 2FA ?')) return;
                      setPinModal({ mode: 'confirm', onConfirm: async (credential) => {
                        await invoke('disable_totp', { profileName: activeProfile, authCredential: credential });
                        const sec = await invoke('get_profile_security', { profileName: activeProfile });
                        setProfileSecurity(sec);
                        showToast('2FA désactivé');
                      }, title: 'Confirmer avec PIN ou mot de passe' });
                    }} className="w-full px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs border border-red-500/20 hover:bg-red-500/20">
                      Désactiver 2FA
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (!profileSecurity.has_pin && !profileSecurity.has_password) {
                          showToast('Configurez d\'abord un PIN ou mot de passe');
                          return;
                        }
                        try {
                          const data = await invoke('setup_totp', { profileName: activeProfile });
                          setTotpSetupData(data);
                          setTotpVerifyCode('');
                          setTotpSetupError('');
                        } catch (e) { showToast('Erreur configuration 2FA'); }
                      }}
                      disabled={!profileSecurity.has_pin && !profileSecurity.has_password}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium ${(profileSecurity.has_pin || profileSecurity.has_password)
                        ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`}>
                      Activer 2FA (TOTP)
                    </button>
                  )}
                  {!profileSecurity.has_pin && !profileSecurity.has_password && (
                    <p className={`text-[10px] ${T.textFaint} mt-1`}>Requiert un PIN ou mot de passe</p>
                  )}
                </div>

                {/* ── Inactivity timer ── */}
                {(profileSecurity.has_pin || profileSecurity.has_password) && (
                  <div>
                    <label className={`block text-sm ${T.textMuted} mb-2`}>Verrouillage automatique</label>
                    <select value={profileSecurity.inactivity_minutes}
                      onChange={async (e) => {
                        const mins = parseInt(e.target.value);
                        try {
                          await invoke('set_profile_pin', { profileName: activeProfile, rawPin: '__KEEP__', inactivityMinutes: mins });
                          setProfileSecurity(prev => ({ ...prev, inactivity_minutes: mins }));
                          showToast(mins > 0 ? `Verrouillage après ${mins} min` : 'Verrouillage auto désactivé');
                        } catch(_) {}
                      }}
                      className={`w-full px-3 py-2.5 ${T.inputBg} border ${T.inputBorder} rounded-lg text-sm`}>
                      <option value={0}>Désactivé</option>
                      <option value={1}>1 minute</option>
                      <option value={2}>2 minutes</option>
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                    </select>
                  </div>
                )}

                {/* ── Lock now ── */}
                {(profileSecurity.has_pin || profileSecurity.has_password) && (
                  <button onClick={() => {
                    setShowMenuDrawer(false);
                    setIsLocked(true);
                    setTheme('dark');
                    clearSensitiveState();
                    setAuthInputs({ password: '', pin: '', totp_code: '' });
                    const steps = getAuthSteps(profileSecurity);
                    setAuthStep(steps[0] || null);
                  }}
                    className="w-full px-4 py-2.5 bg-amber-500 text-zinc-900 rounded-lg text-sm font-medium hover:bg-amber-400 flex items-center justify-center gap-2">
                    Verrouiller maintenant
                  </button>
                )}

                {/* Advanced section (collapsible) */}
                {(profileSecurity.has_pin || profileSecurity.has_password) && (
                  <div className="border-t border-zinc-800 pt-4 mt-2">
                    <button onClick={() => setShowAdvancedSecurity(!showAdvancedSecurity)}
                      className={`flex items-center justify-between w-full text-sm ${T.textMuted} hover:text-amber-500 transition-colors`}>
                      <span>Paramètres avancés</span>
                      <span className="text-xs">{showAdvancedSecurity ? '▲' : '▼'}</span>
                    </button>
                    {showAdvancedSecurity && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className={`block text-xs ${T.textMuted} mb-1`}>Sel de chiffrement</label>
                          <div className="flex gap-2">
                            <input type="password" value={encryptionSalt} readOnly placeholder="Aucun sel généré"
                              className={`flex-1 px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm font-mono focus:outline-none opacity-70`} />
                            {!encryptionSalt && (
                              <button onClick={generateNewSalt} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors text-xs">Générer</button>
                            )}
                          </div>
                        </div>
                        <button onClick={() => testEncryption()}
                          className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${encryptionSalt ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                          disabled={!encryptionSalt}>
                          Tester le chiffrement
                        </button>
                        {testEncryptionResult && (
                          <div className={`p-3 rounded-lg text-xs ${testEncryptionResult.success ? 'border border-green-500/30 bg-green-500/5 text-green-400' : 'border border-red-500/30 bg-red-500/5 text-red-400'}`}>
                            <div className="font-medium">{testEncryptionResult.success ? 'Chiffrement fonctionnel' : 'Échec du test'}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {showMenuDrawer && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowMenuDrawer(false)} />}

      {/* ── TOTP Setup Modal ── */}
      {totpSetupData && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4" onClick={() => setTotpSetupData(null)}>
          <div className={`bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-auto shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Configuration 2FA</h3>
              <button onClick={() => setTotpSetupData(null)} className="text-zinc-500 hover:text-amber-500 text-xl">X</button>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center mb-4 p-4 bg-white rounded-lg">
              <QRCodeSVG value={totpSetupData.uri} size={200} level="M" />
            </div>
            <div className="mb-4 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">Cle manuelle (si le scan echoue)</p>
              <p className="font-mono text-sm text-amber-500 break-all select-all cursor-text">{totpSetupData.secret}</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-400 mb-2">Code de verification (6 chiffres)</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength="6"
                value={totpVerifyCode}
                onChange={e => { setTotpVerifyCode(e.target.value.replace(/\D/g, '')); setTotpSetupError(''); }}
                onKeyDown={e => { if (e.key === 'Enter' && totpVerifyCode.length === 6) {
                  invoke('enable_totp', { profileName: activeProfile, verificationCode: totpVerifyCode })
                    .then(async () => {
                      setTotpSetupData(null);
                      const sec = await invoke('get_profile_security', { profileName: activeProfile });
                      setProfileSecurity(sec);
                      showToast('2FA active avec succes');
                    })
                    .catch(() => setTotpSetupError('Code invalide. Verifiez l\'heure de votre appareil.'));
                }}}
                placeholder="000000" autoFocus
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-2xl tracking-[0.5em] font-mono text-zinc-100 focus:outline-none focus:border-amber-500/50 placeholder:text-zinc-600"
              />
              {totpSetupError && <p className="text-red-400 text-xs mt-2">{totpSetupError}</p>}
            </div>
            <button
              onClick={async () => {
                try {
                  await invoke('enable_totp', { profileName: activeProfile, verificationCode: totpVerifyCode });
                  setTotpSetupData(null);
                  const sec = await invoke('get_profile_security', { profileName: activeProfile });
                  setProfileSecurity(sec);
                  showToast('2FA active avec succes');
                } catch (e) { setTotpSetupError('Code invalide. Verifiez l\'heure de votre appareil.'); }
              }}
              disabled={totpVerifyCode.length !== 6}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${totpVerifyCode.length === 6 ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}`}>
              Activer 2FA
            </button>
            <p className="text-xs text-zinc-600 mt-3 text-center">Le code change toutes les 30 secondes</p>
          </div>
        </div>
      )}

      {/* ── Bitcoin Whitepaper Overlay ── */}
      {showWhitepaper && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) setShowWhitepaper(false); }}>
          <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="text-amber-500 font-bold text-lg">₿</span>
              <span className="text-zinc-300 font-medium">Bitcoin: A Peer-to-Peer Electronic Cash System</span>
              <span className="text-zinc-600 text-xs">Satoshi Nakamoto · 2008</span>
            </div>
            <button onClick={() => setShowWhitepaper(false)} className="text-zinc-500 hover:text-amber-500 text-xl transition-colors">✕</button>
          </div>
          <iframe src="https://bitcoin.org/bitcoin.pdf" className="flex-1 w-full bg-zinc-900" title="Bitcoin Whitepaper" sandbox="allow-scripts allow-same-origin" />
        </div>
      )}

      {/* Persistent pending TX bar */}
      {pendingCount > 0 && !pendingBarHidden && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[55] animate-fade-in">
          <div className={`${T.cardBg} border ${T.cardBorder2} rounded-lg px-3 py-2 shadow-xl flex items-center gap-3`}>
            <button onClick={() => setPendingBarHidden(true)} className={`${T.textFaint} hover:text-red-400 text-xs`}>✕</button>
            <button onClick={() => setShowPendingPanel(true)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-amber-500 animate-pulse text-sm">●</span>
              <span className={`text-sm ${T.textMuted}`}>{pendingCount} TX en attente</span>
              <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 animate-pulse rounded-full" style={{ width: '60%' }} />
              </div>
              <span className={`text-xs ${T.textFaint}`}>Voir →</span>
            </button>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
          <div className={`${T.cardBg} border ${T.cardBorder2} rounded-lg px-4 py-2 shadow-xl text-sm ${T.textMuted} flex items-center gap-2`}>
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className={`${T.textFaint} hover:text-amber-500 ml-1 -mr-1`}>✕</button>
          </div>
        </div>
      )}
      {/* Pending Transactions Panel */}
      <PendingTransactionsPanel
      show={showPendingPanel}
      onClose={() => setShowPendingPanel(false)}
      onBackToMenu={() => { setShowPendingPanel(false); setShowMenuDrawer(true); setMenuView('main'); }}
      wallets={wallets}
      theme={theme}
      />

      {/* ── Lock Screen ── */}
      {isLocked && (() => {
        const steps = getAuthSteps(profileSecurity);
        const currentIdx = steps.indexOf(authStep);
        const isLast = currentIdx === steps.length - 1;
        const stepLabel = { password: 'Mot de passe', pin: 'Code PIN', totp: 'Code 2FA' };
        return (
        <div className="fixed inset-0 z-[9999] bg-zinc-900 flex flex-col items-center justify-center select-none">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-xl font-bold text-zinc-200 mb-1">JANUS Monitor</h1>
            <p className="text-sm text-zinc-500">
              {authStep ? stepLabel[authStep] || 'Authentification' : 'Profil verrouillé'}
            </p>
            {steps.length > 1 && (
              <div className="flex gap-2 justify-center mt-3">
                {steps.map((s, i) => (
                  <div key={s} className={`flex items-center gap-1`}>
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i < currentIdx ? 'bg-green-500' : i === currentIdx ? 'bg-amber-500' : 'bg-zinc-700'
                    }`} />
                    <span className={`text-[10px] ${i === currentIdx ? 'text-zinc-400' : 'text-zinc-600'}`}>{stepLabel[s]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-72 space-y-3">
            {authStep === 'password' && (
              <input type="password" value={authInputs.password}
                onChange={e => { setAuthInputs(p => ({ ...p, password: e.target.value })); setPinError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleAuthStep(); }}
                placeholder="Mot de passe..." autoFocus
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-lg text-zinc-100 focus:outline-none focus:border-amber-500/50 placeholder:text-zinc-600 placeholder:text-sm"
              />
            )}
            {authStep === 'pin' && (
              <input type="password" value={authInputs.pin}
                onChange={e => { setAuthInputs(p => ({ ...p, pin: e.target.value })); setPinError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleAuthStep(); }}
                placeholder="PIN..." autoFocus
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-lg tracking-widest text-zinc-100 focus:outline-none focus:border-amber-500/50 placeholder:text-zinc-600 placeholder:tracking-normal placeholder:text-sm"
              />
            )}
            {authStep === 'totp' && (
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength="6"
                value={authInputs.totp_code}
                onChange={e => { setAuthInputs(p => ({ ...p, totp_code: e.target.value.replace(/\D/g, '') })); setPinError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleAuthStep(); }}
                placeholder="000000" autoFocus
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-2xl tracking-[0.5em] font-mono text-zinc-100 focus:outline-none focus:border-amber-500/50 placeholder:text-zinc-600 placeholder:tracking-[0.5em]"
              />
            )}
            {pinError && <p className="text-red-400 text-xs text-center">{pinError}</p>}
            {pinAttemptInfo && pinAttemptInfo.failed > 0 && (
              <div className={`text-xs text-center px-3 py-2 rounded-lg ${pinAttemptInfo.failed >= 7 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {pinAttemptInfo.retry_secs > 0
                  ? `Réessayez dans ${pinAttemptInfo.retry_secs}s`
                  : `Tentative ${pinAttemptInfo.failed}/${pinAttemptInfo.max}`}
              </div>
            )}
            <button onClick={handleAuthStep}
              disabled={pinAttemptInfo?.retry_secs > 0}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${pinAttemptInfo?.retry_secs > 0 ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-amber-500 text-zinc-900 hover:bg-amber-400'}`}>
              {isLast ? 'Déverrouiller' : 'Continuer →'}
            </button>
          </div>
          <p className="text-zinc-700 text-xs mt-8">Appuyez sur Entrée pour valider</p>
        </div>
        );
      })()}

      {/* ── Inactivity Warning Banner ── */}
      {showInactivityWarning && !isLocked && (
        <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500/90 text-zinc-900 text-center py-2 text-sm font-medium animate-pulse">
          Verrouillage automatique imminent — bougez la souris pour annuler
        </div>
      )}

      {/* 🔒 Monero Setup Overlay - Extended Key Configuration */}
      {showMoneroSetup && currentMoneroWallet && (
        <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) closeMoneroSetup(); }}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">🔑 Configuration Monero</h3>
              <button onClick={closeMoneroSetup} className="text-zinc-500 hover:text-amber-500 text-xl transition-colors">✕</button>
            </div>
            
            <p className={`text-sm ${T.textMuted} mb-6`}>
              Configurez les clés étendues pour accéder à votre wallet Monero. Ces informations sont sensibles et ne quittent jamais votre appareil.
            </p>
            
            <div className="space-y-4">
              {/* Wallet Info */}
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="text-xs text-zinc-400 mb-1">Wallet Monero</div>
                <div className="font-medium text-zinc-100">{currentMoneroWallet.name}</div>
                <div className={`text-xs font-mono ${T.textFaint} mt-1`}>
                  {maskAddress(currentMoneroWallet.address)}
                </div>
              </div>
              
              {/* View Key */}
              <div>
                <label className={`block text-xs font-medium ${T.textMuted} mb-1`}>View Key (requis)</label>
                <input
                  type="password"
                  placeholder="64 caractères hexadécimaux..."
                  className={`w-full px-3 py-2.5 ${T.inputBg} border ${T.inputBorder} rounded-lg text-sm focus:outline-none focus:border-amber-500/50`}
                  id="monero-view-key-input"
                  onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('monero-test-btn')?.click(); }}
                />
                <p className={`text-xs ${T.textFaint} mt-1`}>
                  La view key permet de scanner la blockchain pour vos transactions
                </p>
              </div>
              
              {/* Spend Key (optional) */}
              <div>
                <label className={`block text-xs font-medium ${T.textMuted} mb-1`}>Spend Key (optionnel)</label>
                <input
                  type="password"
                  placeholder="64 caractères hexadécimaux (optionnel)..."
                  className={`w-full px-3 py-2.5 ${T.inputBg} border ${T.inputBorder} rounded-lg text-sm focus:outline-none focus:border-amber-500/50`}
                  id="monero-spend-key-input"
                  onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('monero-test-btn')?.click(); }}
                />
                <p className={`text-xs ${T.textFaint} mt-1`}>
                  La spend key est nécessaire pour dépenser vos fonds (ne la partagez jamais)
                </p>
              </div>
              
              {/* Node Selection */}
              <div>
                <label className={`block text-xs font-medium ${T.textMuted} mb-1`}>Nœud Monero</label>
                <select
                  className={`w-full px-3 py-2.5 ${T.inputBg} border ${T.inputBorder} rounded-lg text-sm`}
                  id="monero-node-select"
                  defaultValue={getMoneroDefaultNodes()[0]}
                >
                  {getMoneroDefaultNodes().map((node, index) => (
                    <option key={index} value={node}>{node.replace('http://', '')}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2 mt-2">
                  {moneroNodeStatus[getMoneroDefaultNodes()[0]]?.success ? (
                    <span className="text-green-500 text-xs">✓ Nœud accessible</span>
                  ) : moneroNodeStatus[getMoneroDefaultNodes()[0]]?.error ? (
                    <span className="text-red-500 text-xs">✗ {moneroNodeStatus[getMoneroDefaultNodes()[0]].error}</span>
                  ) : (
                    <span className={`text-xs ${T.textFaint}`}>Test en cours...</span>
                  )}
                </div>
              </div>
              
              {/* Test Result */}
              {moneroTestResult && (
                <div className={`p-3 rounded-lg text-xs ${moneroTestResult.testing ? 'border border-amber-500/30 bg-amber-500/5' : moneroTestResult.success ? 'border border-green-500/30 bg-green-500/5' : 'border border-red-500/30 bg-red-500/5'}`}>
                  {moneroTestResult.testing ? (
                    <div className="text-amber-500 animate-pulse">
                      🔄 Test de la configuration en cours...
                    </div>
                  ) : moneroTestResult.success ? (
                    <div>
                      <div className="text-green-500 font-medium">✅ Configuration valide !</div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span className={T.textFaint}>Balance:</span>
                          <span className="font-mono">{moneroTestResult.balance} XMR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={T.textFaint}>Disponible:</span>
                          <span className="font-mono">{moneroTestResult.unlockedBalance} XMR</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={T.textFaint}>Nœud:</span>
                          <span className="font-mono text-green-400">✓ Hauteur {moneroTestResult.nodeInfo.height}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-500">
                      ❌ Échec: {moneroTestResult.error}
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  id="monero-test-btn"
                  onClick={async () => {
                    const viewKey = document.getElementById('monero-view-key-input').value;
                    const spendKey = document.getElementById('monero-spend-key-input').value || null;
                    const node = document.getElementById('monero-node-select').value;
                    
                    await testMoneroConfiguration(currentMoneroWallet.address, viewKey, spendKey, node);
                  }}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-zinc-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors"
                >
                  🔍 Tester la Configuration
                </button>
                
                <button
                  onClick={async () => {
                    const viewKey = document.getElementById('monero-view-key-input').value;
                    const spendKey = document.getElementById('monero-spend-key-input').value || null;
                    const node = document.getElementById('monero-node-select').value;
                    
                    const success = await saveMoneroConfiguration(
                      currentMoneroWallet, 
                      viewKey, 
                      spendKey, 
                      node
                    );
                    
                    if (success) {
                      closeMoneroSetup();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
                >
                  ✅ Enregistrer
                </button>
              </div>
              
              {/* Security Warning */}
              <div className={`p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 text-xs ${T.textFaint}`}>
                <div className="font-medium mb-2 flex items-center gap-2">
                  <span>🔒</span> <span>Important : Sécurité</span>
                </div>
                <ul className="space-y-1 pl-4">
                  <li>• Ces clés ne sont <strong>jamais</strong> envoyées à des serveurs distants</li>
                  <li>• Elles sont stockées localement et chiffrées avec votre PIN</li>
                  <li>• Ne partagez <strong>jamais</strong> votre spend key</li>
                  <li>• La view key permet uniquement de <strong>voir</strong> les transactions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Unified PIN Modal (setup, change, confirm) */}
      {pinModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4" data-pin-modal onClick={(e) => { if (e.target === e.currentTarget) closePinModal(); }}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">{pinModal.title}</h3>
              <button onClick={closePinModal} className="text-zinc-500 hover:text-amber-500 text-xl transition-colors">✕</button>
            </div>

            {pinModal.mode === 'confirm' ? (
              <div className="space-y-4">
                <p className={`text-sm ${T.textMuted}`}>Entrez votre PIN pour confirmer l'opération.</p>
                <input type="password" value={pinModalPin} onChange={e => setPinModalPin(e.target.value)}
                  maxLength={20} placeholder="Votre PIN..." autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handlePinModalSubmit(); }}
                  className={`w-full px-3 py-2.5 ${T.inputBg} border ${T.inputBorder} rounded-lg text-sm focus:outline-none focus:border-amber-500/50`} />
              </div>
            ) : (
              <div className="space-y-4">
                <p className={`text-sm ${T.textMuted}`}>
                  {pinModal.mode === 'setup'
                    ? 'Le PIN protège votre profil et active le chiffrement AES-256 automatiquement.'
                    : 'Entrez votre nouveau code de sécurité.'}
                </p>
                <div>
                  <label className={`block text-xs font-medium ${T.textMuted} mb-1`}>
                    {pinModal.mode === 'setup' ? 'Nouveau PIN' : 'Nouveau PIN'}
                  </label>
                  <input type="password" value={pinModalPin} onChange={e => setPinModalPin(e.target.value)}
                    maxLength={20} placeholder="Minimum 4 caractères..." autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && pinModalConfirm) handlePinModalSubmit(); }}
                    className={`w-full px-3 py-2.5 ${T.inputBg} border ${T.inputBorder} rounded-lg text-sm focus:outline-none focus:border-amber-500/50`} />
                  {/* Strength indicator */}
                  {pinModalPin.length > 0 && (() => {
                    const strength = getPinStrength(pinModalPin);
                    return (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength.level ? strength.color : 'bg-zinc-700'}`} />
                          ))}
                        </div>
                        <div className={`text-xs ${strength.level <= 1 ? 'text-red-400' : strength.level <= 2 ? 'text-amber-400' : 'text-green-400'}`}>
                          {strength.label}
                          {pinModalPin.length < 6 && strength.level > 0 && ' — 6+ caractères recommandés'}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className={`block text-xs font-medium ${T.textMuted} mb-1`}>Confirmer</label>
                  <input type="password" value={pinModalConfirm} onChange={e => setPinModalConfirm(e.target.value)}
                    maxLength={20} placeholder="Répétez le code..."
                    onKeyDown={e => { if (e.key === 'Enter') handlePinModalSubmit(); }}
                    className={`w-full px-3 py-2.5 ${T.inputBg} border ${T.inputBorder} rounded-lg text-sm focus:outline-none focus:border-amber-500/50`} />
                  {pinModalConfirm.length > 0 && pinModalPin !== pinModalConfirm && (
                    <div className="text-xs text-red-400 mt-1">Les codes ne correspondent pas</div>
                  )}
                </div>
              </div>
            )}

            {pinModalError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">{pinModalError}</div>
            )}

            <button onClick={handlePinModalSubmit}
              className="w-full mt-4 px-4 py-2.5 bg-amber-500 text-zinc-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors">
              {pinModal.mode === 'setup' ? 'Activer PIN + Chiffrement' : pinModal.mode === 'change' ? 'Changer le PIN' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
