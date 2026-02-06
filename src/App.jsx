import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
  },
  light: {
    bg: 'bg-gray-100', textMain: 'text-gray-900', textMuted: 'text-gray-500', textFaint: 'text-gray-400',
    cardBg: 'bg-white', cardBorder: 'border-gray-200', cardBg2: 'bg-gray-50', cardBorder2: 'border-gray-200',
    inputBg: 'bg-gray-100', inputBorder: 'border-gray-300',
    headerBg: 'bg-gray-100/95', headerBorder: 'border-gray-300',
    rowBg: 'bg-white', rowBorder: 'border-gray-200', rowHover: 'hover:bg-gray-50',
    dropBg: 'bg-white', dropBorder: 'border-gray-200',
    barBg: 'bg-gray-300', divider: 'border-gray-200',
  },
  sepia: {
    bg: 'bg-[#f4efe6]', textMain: 'text-[#433422]', textMuted: 'text-[#8a7560]', textFaint: 'text-[#b0a090]',
    cardBg: 'bg-[#ebe5d8]', cardBorder: 'border-[#d4c8b0]', cardBg2: 'bg-[#e3dccf]', cardBorder2: 'border-[#cfc3ab]',
    inputBg: 'bg-[#e8e0d0]', inputBorder: 'border-[#cfc3ab]',
    headerBg: 'bg-[#f4efe6]/95', headerBorder: 'border-[#d4c8b0]',
    rowBg: 'bg-[#ebe5d8]', rowBorder: 'border-[#d4c8b0]', rowHover: 'hover:bg-[#e3dccf]',
    dropBg: 'bg-[#ebe5d8]', dropBorder: 'border-[#d4c8b0]',
    barBg: 'bg-[#d4c8b0]', divider: 'border-[#d4c8b0]',
  },
};

const App = () => {
  const [wallets, setWallets] = useState([]);
  const [prices, setPrices] = useState({});
  const [altcoinsList, setAltcoinsList] = useState([]);
  const [editMode, setEditMode] = useState(null);
  const [editData, setEditData] = useState({ address: '', balance: '', name: '' });
  const [altcoinSearch, setAltcoinSearch] = useState('');
  const [showAltcoinDropdown, setShowAltcoinDropdown] = useState(false);
  const [loading, setLoading] = useState({});
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [etherscanApiKey, setEtherscanApiKey] = useState('');
  const [theme, setTheme] = useState('dark');
  const [expandedAssets, setExpandedAssets] = useState({});
  const [showForex, setShowForex] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [apiStatus, setApiStatus] = useState({ binance: null, forex: null });
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
  const [toast, setToast] = useState(null); // { message, type }
  const editRef = useRef(null);
  const editWalletRef = useRef(null);

  // ── Theme accessor ──
  const T = themes[theme] || themes.dark;

  const categories = {
    bitcoin: { name: 'Bitcoin', color: 'text-amber-500', barColor: '#f59e0b' },
    hedging: { name: 'Hedging', color: 'text-red-700', barColor: '#b91c1c' },
    altcoins: { name: 'Altcoins', color: 'text-violet-500', barColor: '#8b5cf6' },
  };

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
  };

  const manualOnlyAssets = ['xmr', 'qtum', 'pivx', 'ada', 'sol', 'avax', 'doge', 'xrp', 'near'];
  const toggleExpand = (asset) => setExpandedAssets(prev => ({ ...prev, [asset]: !prev[asset] }));
  const maskAddress = (addr) => !addr ? '' : addr.length <= 10 ? addr : addr.substring(0, 6) + '••••••••';
  const formatNum = (n, dec = 2) => (n === null || n === undefined || isNaN(n)) ? '–' : n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const maskBalance = (value, decimals = 2) => hideBalances ? '*****' : formatNum(value, decimals);

  const showToast = (message, duration = 2000) => {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  };

  // Long press copy
  const handleAddressMouseDown = (address) => {
    if (!address) return;
    const timer = setTimeout(async () => {
      try { await navigator.clipboard.writeText(address); setCopiedAddress(address); showToast('Adresse copiée ✓'); setTimeout(() => setCopiedAddress(null), 2000); } catch (e) { console.error(e); }
    }, 600);
    setLongPressTimer(timer);
  };
  const handleAddressMouseUp = () => { if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); } };

  // ── Data loading ──
  const loadWallets = useCallback(async () => { try { setWallets(await invoke('get_wallets')); } catch (e) { console.error(e); } }, []);
  const loadPrices = useCallback(async () => {
    try {
      const d = await invoke('get_prices');
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
      console.error(e);
      setApiStatus(prev => ({ binance: prev.binance === true ? true : false, forex: prev.forex === true ? true : false }));
    }
  }, []);
  const loadAltcoinsList = useCallback(async () => { try { setAltcoinsList(await invoke('get_altcoins_list')); } catch (e) { console.error(e); } }, []);
  const loadSettings = useCallback(async () => {
    try { const d = await invoke('get_settings'); setEtherscanApiKey(d.etherscan_api_key || ''); setTheme(d.theme || 'dark'); } catch (e) { console.error(e); }
  }, []);
  const loadProfiles = useCallback(async () => { try { setProfiles(await invoke('list_profiles')); } catch (e) { console.error(e); } }, []);
  const saveSettings = async () => {
    try { await invoke('save_settings', { settings: { etherscan_api_key: etherscanApiKey, theme } }); setShowSettings(false); } catch (e) { console.error(e); }
  };

  // ── Profiles ──
  const autoSaveProfile = useCallback(async () => {
    try { await invoke('save_profile', { name: '__autosave__' }); showToast('Sauvegardé ✓'); } catch (e) { console.error('autosave:', e); }
  }, []);
  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) return;
    try { await invoke('save_profile', { name: newProfileName.trim() }); setNewProfileName(''); await loadProfiles(); } catch (e) { console.error(e); }
  };
  const handleLoadProfile = async (name) => {
    setShowProfileOverlay(false); setShowSettings(false);
    if (!await showConfirm(`Charger le profil "${name}" ?`)) return;
    try { await invoke('load_profile', { name }); await loadWallets(); } catch (e) { console.error(e); }
  };
  const handleDeleteProfile = async (name) => {
    setShowProfileOverlay(false); setShowSettings(false);
    if (!await showConfirm(`Supprimer le profil "${name}" ?`)) return;
    try { await invoke('delete_profile', { name }); await loadProfiles(); } catch (e) { console.error(e); }
  };
  const handleReset = async () => {
    setShowSettings(false);
    if (!await showConfirm('Réinitialiser tous les wallets ?')) return;
    try { await invoke('reset_wallets'); await loadWallets(); } catch (e) { console.error(e); }
  };

  // ── Wallet ops ──
  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await loadPrices();
      const cw = await invoke('get_wallets');
      for (const w of cw) {
        if (w.address && !manualOnlyAssets.includes(w.asset)) {
          try { const b = await invoke('fetch_balance', { asset: w.asset, address: w.address }); if (b != null) await invoke('update_wallet', { id: w.id, name: w.name, address: w.address, balance: b }); } catch (e) { console.error(e); }
        }
      }
      await loadWallets();
    } catch (e) { console.error(e); }
    setRefreshing(false);
  };

  const saveWalletEdit = async (walletId) => {
    const w = wallets.find(x => x.id === walletId);
    if (!w) return;
    const addrChanged = (editData.address || '') !== (w.address || '');
    const newName = editData.name || w.name;
    await invoke('update_wallet', { id: walletId, name: newName, address: editData.address || '', balance: editData.balance !== '' ? parseFloat(editData.balance) : w.balance });
    await loadWallets();
    setEditMode(null); editWalletRef.current = null;
    autoSaveProfile();
    if (addrChanged && editData.address && !manualOnlyAssets.includes(w.asset)) {
      setLoading(prev => ({ ...prev, [walletId]: true }));
      try { await loadPrices(); const b = await invoke('fetch_balance', { asset: w.asset, address: editData.address }); if (b != null) { await invoke('update_wallet', { id: walletId, name: newName, address: editData.address, balance: b }); await loadWallets(); autoSaveProfile(); } } catch (e) { console.error(e); }
      setLoading(prev => ({ ...prev, [walletId]: false }));
    }
  };

  const addNewWallet = async (category, asset, name) => {
    try { await invoke('add_wallet', { category, asset, name }); await loadWallets(); autoSaveProfile(); } catch (e) { console.error(e); }
  };
  const deleteWallet = async (id) => { try { await invoke('delete_wallet', { id }); await loadWallets(); setEditMode(null); editWalletRef.current = null; autoSaveProfile(); } catch (e) { console.error(e); } };
  const addAltcoinWallet = (sym) => { const a = altcoinsList.find(x => x.symbol === sym); if (a) { addNewWallet('altcoins', sym, `${a.name} Wallet`); setAltcoinSearch(''); setShowAltcoinDropdown(false); } };

  // ── Init ──
  useEffect(() => {
    (async () => {
      await loadSettings();
      await loadAltcoinsList();
      await loadProfiles();
      // Charger l'autosave si existe
      try {
        const profs = await invoke('list_profiles');
        if (profs.includes('__autosave__')) {
          await invoke('load_profile', { name: '__autosave__' });
        }
      } catch (e) { console.error('autosave load:', e); }
      await loadWallets();
      await loadPrices();
    })();
    const iv = setInterval(loadPrices, 5000);
    const autoSaveIv = setInterval(() => { autoSaveProfile(); }, 120000);
    return () => { clearInterval(iv); clearInterval(autoSaveIv); };
  }, []);

  useEffect(() => {
    const h = (e) => { if (editMode && editRef.current && !editRef.current.contains(e.target)) { const w = editWalletRef.current; if (w) saveWalletEdit(w); } };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [editMode, editData, wallets]);

  // ── Calcs ──
  const getWalletsByCategory = (c) => wallets.filter(w => w.category === c);
  const getAssetTotalBalance = (a) => wallets.filter(w => w.asset === a).reduce((s, w) => s + (w.balance || 0), 0);
  const getCategoryValueEur = (c) => getWalletsByCategory(c).reduce((s, w) => s + (w.balance || 0) * (prices[w.asset]?.eur || 0), 0);
  const getTotalEur = () => Object.keys(categories).reduce((s, c) => s + getCategoryValueEur(c), 0);
  const getTotalUsd = () => { const e = getTotalEur(); return prices.btc?.eur > 0 && prices.btc?.usd > 0 ? e * (prices.btc.usd / prices.btc.eur) : 0; };
  const getTotalBtc = () => prices.btc?.eur > 0 ? getTotalEur() / prices.btc.eur : 0;
  const getTotalGoldOz = () => prices.gold_usd_per_oz > 0 ? getTotalUsd() / prices.gold_usd_per_oz : 0;
  const getTotal = (key) => getTotalUsd() * (prices[key] || 0);
  const getCategoryPercentage = (c) => { const t = getTotalEur(); return t > 0 ? (getCategoryValueEur(c) / t) * 100 : 0; };
  const getUniqueAssetsInCategory = (c) => [...new Set(getWalletsByCategory(c).map(w => w.asset))];
  const filteredAltcoins = altcoinsList.filter(a => a.name.toLowerCase().includes(altcoinSearch.toLowerCase()) || a.symbol.toLowerCase().includes(altcoinSearch.toLowerCase()));

  const startEdit = (wallet) => {
    setEditMode(`edit-${wallet.id}`);
    setEditData({ address: wallet.address || '', balance: wallet.balance?.toString() || '', name: wallet.name || '' });
    editWalletRef.current = wallet.id;
  };
  const handleEditKeyDown = (e, wid) => { if (e.key === 'Enter') { e.preventDefault(); saveWalletEdit(wid); } if (e.key === 'Escape') { setEditMode(null); editWalletRef.current = null; } };

  // ── Components ──
  const MiniPriceCard = ({ asset }) => {
    const p = prices[asset] || {}, cfg = allAssets[asset];
    return (
      <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg p-3`}>
        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.symbol}</span>
        <div className="text-sm font-semibold tabular-nums">{p.usd > 0 ? `${formatNum(p.usd)} ₮` : '–'}</div>
        <div className={`text-xs ${T.textMuted} tabular-nums`}>{p.eur > 0 ? `${formatNum(p.eur)} €` : '–'}</div>
        {p.btc > 0 && <div className={`text-xs ${T.textFaint} tabular-nums`}>{formatNum(p.btc, 8)} ₿</div>}
      </div>
    );
  };

  // Trash icon SVG
  const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className={`${T.cardBg} border ${T.cardBorder2} rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl`}>
          <p className={`text-sm mb-6 ${T.text}`}>{confirmModal.message}</p>
          <div className="flex gap-3 justify-end">
            <button onClick={confirmModal.onCancel}
              className={`px-4 py-2 rounded-lg text-sm ${T.inputBg} border ${T.inputBorder} ${T.textMuted} hover:opacity-80 transition-opacity`}>
              Annuler
            </button>
            <button onClick={confirmModal.onConfirm}
              className="px-4 py-2 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-500 transition-colors">
              Confirmer
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
            {walletCount > 0 && <div className={`${T.textMuted} transition-transform ${isExpanded ? 'rotate-180' : ''}`}><ChevronIcon size={20} /></div>}
          </div>
        </div>
      </div>
    );
  };

  const WalletRow = ({ wallet }) => {
    const isEditing = editMode === `edit-${wallet.id}`, isLoading = loading[wallet.id];
    const [editingBalance, setEditingBalance] = useState(false);
    const cfg = allAssets[wallet.asset] || { symbol: wallet.asset.toUpperCase(), color: 'text-zinc-400', bg: 'bg-zinc-400/20' };
    const valEur = (wallet.balance || 0) * (prices[wallet.asset]?.eur || 0);
    const isCopied = copiedAddress === wallet.address;

    const handleUnlockBalance = async () => {
      if (await showConfirm('Modifier le montant manuellement ?')) setEditingBalance(true);
    };

    if (isEditing) return (
      <div ref={editRef} className={`${T.cardBg} border ${T.cardBorder2} rounded-lg p-3 space-y-2`}>
        <input type="text" value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
          onKeyDown={e => handleEditKeyDown(e, wallet.id)} placeholder="Nom du wallet..."
          className={`w-full px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm font-medium focus:outline-none focus:border-amber-500/50`} autoFocus />
        <input type="text" value={editData.address} onChange={e => setEditData(p => ({ ...p, address: e.target.value }))}
          onKeyDown={e => handleEditKeyDown(e, wallet.id)} placeholder="Adresse..."
          className={`w-full px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm font-mono focus:outline-none focus:border-amber-500/50`} />
        {editingBalance ? (
          <input type="number" value={editData.balance} onChange={e => setEditData(p => ({ ...p, balance: e.target.value }))}
            onKeyDown={e => handleEditKeyDown(e, wallet.id)} placeholder="Balance" step="0.00000001"
            className={`w-full px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm focus:outline-none focus:border-amber-500/50`} autoFocus />
        ) : (
          <div onClick={handleUnlockBalance}
            className={`relative w-full px-3 py-2 rounded text-sm border ${T.inputBorder} cursor-pointer overflow-hidden`}
            style={{ background: `repeating-linear-gradient(-45deg, transparent, transparent 4px, ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : theme === 'sepia' ? 'rgba(139,115,85,0.06)' : 'rgba(0,0,0,0.04)'} 4px, ${theme === 'dark' ? 'rgba(255,255,255,0.03)' : theme === 'sepia' ? 'rgba(139,115,85,0.06)' : 'rgba(0,0,0,0.04)'} 8px)` }}>
            <div className="flex items-center justify-between">
              <span className={`${T.textFaint} opacity-60`}>{editData.balance || '–'} {cfg.symbol}</span>
              <span className={`text-xs ${T.textMuted} font-medium`}>modifier</span>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => saveWalletEdit(wallet.id)} className={`px-3 py-1 ${cfg.bg} ${cfg.color} rounded text-xs`}>Sauvegarder</button>
          <button onClick={() => { setEditMode(null); editWalletRef.current = null; setEditingBalance(false); }} className={`px-3 py-1 ${T.inputBg} ${T.textMuted} rounded text-xs`}>Annuler</button>
          <button onClick={async () => { if (await showConfirm(`Supprimer "${wallet.name}" ?`)) deleteWallet(wallet.id); }} className="px-3 py-1 bg-red-500/20 text-red-500 rounded text-xs ml-auto">Supprimer</button>
        </div>
      </div>
    );

    return (
      <div className={`${T.rowBg} border ${T.rowBorder} rounded-lg p-3 flex items-center justify-between group`}>
        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => startEdit(wallet)}>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.color}`}>{cfg.symbol}</span>
          <div>
            <div className="text-sm font-medium flex items-center gap-2">
              {wallet.name}
              {isLoading && <span className="text-amber-500 text-xs animate-pulse">⟳</span>}
            </div>
            <div className={`font-mono text-xs ${T.textFaint}`}
              onMouseDown={(e) => { e.stopPropagation(); handleAddressMouseDown(wallet.address); }}
              onMouseUp={handleAddressMouseUp} onMouseLeave={handleAddressMouseUp}>
              {wallet.address ? (isCopied ? '✓ Copié !' : maskAddress(wallet.address)) : <span className={T.textFaint}>Aucune adresse</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right cursor-pointer" onClick={() => startEdit(wallet)}>
            <div className="font-medium tabular-nums">{wallet.balance != null ? maskBalance(wallet.balance, 8) : '–'}<span className={`${T.textMuted} text-sm ml-1`}>{cfg.symbol}</span></div>
            <div className={`text-xs ${T.textFaint} tabular-nums`}>{maskBalance(valEur)} €</div>
          </div>
          <button onClick={async (e) => { e.stopPropagation(); if (await showConfirm(`Supprimer "${wallet.name}" ?`)) deleteWallet(wallet.id); }}
            className={`${T.textFaint} hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1`}>
            <TrashIcon />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${T.bg} ${T.textMain}`}>
      <ConfirmModal />      <header className={`border-b ${T.headerBorder} sticky top-0 ${T.headerBg} backdrop-blur z-10`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={refreshAll} disabled={refreshing}
                className="w-10 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-zinc-900 font-bold text-xl transition-colors disabled:opacity-50">
                <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              </button>
              <div>
                <h1 className="font-semibold text-lg">JANUS Monitor</h1>
                <p className={`text-xs ${T.textMuted}`}>Réserve sécurisée · <span className={T.textFaint}>v0.9</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-1" title={`Binance: ${apiStatus.binance ? 'OK' : '–'} | Forex: ${apiStatus.forex ? 'OK' : '–'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${apiStatus.binance ? 'bg-green-500' : apiStatus.binance === false ? 'bg-red-500' : 'bg-zinc-600'}`} />
                <div className={`w-1.5 h-1.5 rounded-full ${apiStatus.forex ? 'bg-green-500' : apiStatus.forex === false ? 'bg-red-500' : 'bg-zinc-600'}`} />
              </div>
              <div className="relative">
                <button onClick={() => { setShowProfileOverlay(!showProfileOverlay); setShowSettings(false); loadProfiles(); }}
                  className={`p-2 rounded-lg ${T.inputBg} ${T.textMuted} text-sm`}>☰</button>
              </div>
              <button onClick={() => { setShowSettings(!showSettings); setShowProfileOverlay(false); }} className={`p-2 rounded-lg ${T.inputBg} ${T.textMuted}`}>⚙</button>
              <button onClick={() => setHideBalances(!hideBalances)}
                className={`p-2 rounded-lg transition-colors ${hideBalances ? 'bg-amber-500/20 text-amber-500' : `${T.inputBg} ${T.textMuted}`}`}>
                {hideBalances ? <EyeOffIcon /> : <EyeIcon />}
              </button>
              <div className={`text-right text-xs ${T.textFaint}`}>
                <div>Binance</div>
                {lastPriceUpdate && <div>{lastPriceUpdate.toLocaleTimeString('fr-FR')}</div>}
              </div>
            </div>
          </div>

          {/* Totaux */}
          <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '1.6fr 1fr 1fr auto' }}>
            <div className={`${T.cardBg} border border-amber-500/30 rounded-lg p-3`}>
              <div className="text-xs text-amber-500/70">Total BTC</div>
              <div className="text-2xl font-bold tabular-nums text-amber-500">{maskBalance(getTotalBtc(), 8)}</div>
            </div>
            <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg p-3`}>
              <div className={`text-xs ${T.textMuted}`}>USD</div>
              <div className="text-xl font-semibold tabular-nums">{maskBalance(getTotalUsd())} $</div>
            </div>
            <div className={`${T.cardBg} border ${T.cardBorder} rounded-lg p-3`}>
              <div className={`text-xs ${T.textMuted}`}>EUR</div>
              <div className="text-xl font-semibold tabular-nums">{maskBalance(getTotalEur())} €</div>
            </div>
            <button onClick={() => setShowForex(!showForex)} className={`flex items-center justify-center px-1.5 ${T.textFaint}`}>
              <ChevronIcon size={12} className={`transition-transform duration-200 ${showForex ? 'rotate-180' : ''}`} />
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
          <div className="mb-3">
            <div className={`flex h-1.5 rounded-full overflow-hidden ${T.barBg} mb-2`}>
              {Object.entries(categories).map(([cat, cfg]) => {
                const pct = getCategoryPercentage(cat);
                return pct > 0 ? <div key={cat} style={{ width: `${pct}%`, backgroundColor: cfg.barColor }} className="transition-all" /> : null;
              })}
            </div>
            <div className="flex gap-x-4 text-xs">
              {Object.entries(categories).map(([cat, cfg]) => (
                <div key={cat}>
                  <span className={`font-semibold tabular-nums ${cfg.color}`}>{getCategoryPercentage(cat).toFixed(1)}%</span>
                  <span className={`${T.textMuted} ml-1`}>{cfg.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini prix */}
          <div className="grid grid-cols-5 gap-3">
            {['btc', 'eth', 'xmr', 'bch', 'ltc'].map(a => <MiniPriceCard key={a} asset={a} />)}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* BITCOIN */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-500 mb-3">Bitcoin</h2>
          <PriceCard asset="btc" walletCount={getWalletsByCategory('bitcoin').length} category="bitcoin" />
          {expandedAssets['btc'] !== false && <div className="space-y-2">{getWalletsByCategory('bitcoin').map(w => <WalletRow key={w.id} wallet={w} />)}</div>}
        </section>

        {/* HEDGING */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700 mb-3">Hedging</h2>
          {['xmr', 'bch', 'ltc'].map(asset => {
            const ws = getWalletsByCategory('hedging').filter(w => w.asset === asset);
            if (ws.length === 0) return (
              <div key={asset} className={`${T.cardBg2} border ${T.cardBorder2} rounded-lg p-3 mb-2 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-sm font-bold ${allAssets[asset].bg} ${allAssets[asset].color}`}>{allAssets[asset].symbol}</span>
                  <div>
                    <span className={T.textMuted}>Aucun wallet</span>
                    <div><button onClick={() => addNewWallet('hedging', asset, `${allAssets[asset].name} Wallet`)} className={`text-xs ${T.textFaint}`}>+ Ajouter adresse</button></div>
                  </div>
                </div>
              </div>
            );
            return (
              <div key={asset}>
                <PriceCard asset={asset} walletCount={ws.length} category="hedging" />
                {expandedAssets[asset] !== false && <div className="space-y-2 mb-4">{ws.map(w => <WalletRow key={w.id} wallet={w} />)}</div>}
              </div>
            );
          })}
        </section>

        {/* ALTCOINS */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-500 mb-3">Altcoins</h2>
          <div className="relative mb-4">
            <input type="text" value={altcoinSearch} onChange={e => { setAltcoinSearch(e.target.value); setShowAltcoinDropdown(true); }}
              onFocus={() => setShowAltcoinDropdown(true)} placeholder="🔍 Rechercher et ajouter un altcoin..."
              className={`w-full px-4 py-3 ${T.cardBg} border ${T.cardBorder2} rounded-lg text-sm focus:outline-none focus:border-violet-500`} />
            {showAltcoinDropdown && (
              <div className={`absolute z-20 mt-1 w-full ${T.dropBg} border ${T.dropBorder} rounded-lg max-h-64 overflow-auto shadow-xl`}>
                {filteredAltcoins.map(alt => {
                  const has = wallets.some(w => w.asset === alt.symbol && w.category === 'altcoins');
                  return (
                    <div key={alt.symbol} onClick={() => addAltcoinWallet(alt.symbol)}
                      className={`px-4 py-3 ${T.rowHover} cursor-pointer flex justify-between items-center border-b ${T.dropBorder} last:border-0 ${has ? 'opacity-50' : ''}`}>
                      <div><span className="font-medium">{alt.name}</span><span className={`${T.textMuted} ml-2`}>({alt.symbol.toUpperCase()})</span></div>
                      <div className="flex items-center gap-2">
                        {alt.can_fetch && <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded">auto</span>}
                        {has && <span className={`text-xs ${T.textMuted}`}>déjà ajouté</span>}
                      </div>
                    </div>
                  );
                })}
                {filteredAltcoins.length === 0 && <div className={`px-4 py-3 ${T.textMuted}`}>Aucun altcoin trouvé</div>}
              </div>
            )}
          </div>
          {getUniqueAssetsInCategory('altcoins').map(asset => {
            const ws = getWalletsByCategory('altcoins').filter(w => w.asset === asset);
            return (
              <div key={asset}>
                <PriceCard asset={asset} walletCount={ws.length} category="altcoins" />
                {expandedAssets[asset] !== false && <div className="space-y-2 mb-4">{ws.map(w => <WalletRow key={w.id} wallet={w} />)}</div>}
              </div>
            );
          })}
          {getWalletsByCategory('altcoins').length === 0 && <div className={`text-center py-8 ${T.textMuted} text-sm`}>Utilisez la barre de recherche pour ajouter des altcoins</div>}
        </section>

        <footer className={`pt-4 border-t ${T.headerBorder} text-center text-xs ${T.textFaint}`}>
          JANUS — Extraction 60% • Recapitalisation 40%
        </footer>
      </main>

      {showAltcoinDropdown && <div className="fixed inset-0 z-10" onClick={() => setShowAltcoinDropdown(false)} />}

      {/* Settings drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 ${T.cardBg} border-l ${T.cardBorder2} shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 h-full flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Paramètres</h2>
            <button onClick={() => setShowSettings(false)} className={`p-1.5 rounded-lg ${T.inputBg} ${T.textMuted} hover:opacity-80`}>✕</button>
          </div>
          <div className="space-y-5 flex-1 overflow-auto">
            <div>
              <label className={`block text-sm ${T.textMuted} mb-2`}>Thème</label>
              <div className="flex gap-2">
                {[
                  { key: 'dark', label: '🌙 Sombre' },
                  { key: 'light', label: '☀️ Clair' },
                  { key: 'sepia', label: '📜 Sépia' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => setTheme(opt.key)}
                    className={`flex-1 px-3 py-2 rounded text-sm border ${theme === opt.key
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : `${T.inputBorder} ${T.inputBg} ${T.textMuted}`}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`block text-sm ${T.textMuted} mb-1`}>Clé API Etherscan</label>
              <input type="text" value={etherscanApiKey} onChange={e => setEtherscanApiKey(e.target.value)}
                placeholder="Votre clé API..." className={`w-full px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm font-mono focus:outline-none`} />
              <p className={`text-xs ${T.textFaint} mt-1`}>Requis pour ETH/ERC-20. <a href="https://etherscan.io/apis" target="_blank" rel="noopener" className="text-amber-500 hover:underline">etherscan.io/apis</a></p>
            </div>
          </div>
          <button onClick={saveSettings} className="w-full px-4 py-2.5 bg-amber-500 text-zinc-900 rounded-lg text-sm font-medium hover:bg-amber-400 mt-4">Sauvegarder</button>
        </div>
      </div>
      {showSettings && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowSettings(false)} />}

      {/* Profils drawer */}
      <div className={`fixed top-0 right-0 h-full w-80 ${T.cardBg} border-l ${T.cardBorder2} shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${showProfileOverlay ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 h-full flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Profils</h2>
            <button onClick={() => setShowProfileOverlay(false)} className={`p-1.5 rounded-lg ${T.inputBg} ${T.textMuted} hover:opacity-80`}>✕</button>
          </div>
          <div className="space-y-4 flex-1 overflow-auto">
            {/* Save */}
            <div>
              <label className={`block text-sm ${T.textMuted} mb-1`}>Sauvegarder</label>
              <div className="flex gap-1">
                <input type="text" value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                  placeholder="Nom du profil..." className={`flex-1 px-3 py-2 ${T.inputBg} border ${T.inputBorder} rounded text-sm focus:outline-none`} />
                <button onClick={handleSaveProfile} className="px-3 py-2 bg-amber-500/20 text-amber-500 rounded text-sm hover:bg-amber-500/30">💾</button>
              </div>
              <p className={`text-xs ${T.textFaint} mt-1`}>Auto-save toutes les 2 min</p>
            </div>
            {/* Load */}
            <div>
              <label className={`block text-sm ${T.textMuted} mb-1`}>Charger</label>
              {profiles.filter(p => p !== '__autosave__').length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-auto">
                  {profiles.filter(p => p !== '__autosave__').map(p => (
                    <div key={p} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${T.rowBg} border ${T.rowBorder} group`}>
                      <button onClick={() => handleLoadProfile(p)} className="text-sm flex-1 text-left">{p}</button>
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
          <button onClick={handleReset} className="w-full px-4 py-2.5 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 border border-red-500/20 mt-4">Reset (template)</button>
        </div>
      </div>
      {showProfileOverlay && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowProfileOverlay(false)} />}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
          <div className={`${T.cardBg} border ${T.cardBorder2} rounded-lg px-4 py-2 shadow-xl text-sm ${T.textMuted}`}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
