import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { secureFetchAddressHistory } from './secureBackend.js';

const EXPLORERS = {
  btc: [
    { name: 'Mempool.space', url: (h) => `https://mempool.space/tx/${h}` },
    { name: 'Blockstream', url: (h) => `https://blockstream.info/tx/${h}` },
    { name: 'Blockchain.com', url: (h) => `https://www.blockchain.com/btc/tx/${h}` },
    { name: 'Blockchair', url: (h) => `https://blockchair.com/bitcoin/transaction/${h}` },
  ],
  eth: [
    { name: 'Etherscan', url: (h) => `https://etherscan.io/tx/${h}` },
    { name: 'Ethplorer', url: (h) => `https://ethplorer.io/tx/${h}` },
    { name: 'Blockchair', url: (h) => `https://blockchair.com/ethereum/transaction/${h}` },
  ],
  ltc: [
    { name: 'Litecoin Space', url: (h) => `https://litecoinspace.org/tx/${h}` },
    { name: 'Blockchair', url: (h) => `https://blockchair.com/litecoin/transaction/${h}` },
    { name: 'SoChain', url: (h) => `https://chain.so/tx/LTC/${h}` },
  ],
  bch: [
    { name: 'Blockchair', url: (h) => `https://blockchair.com/bitcoin-cash/transaction/${h}` },
    { name: 'Bitcoin.com', url: (h) => `https://explorer.bitcoin.com/bch/tx/${h}` },
    { name: 'Blockchain.com', url: (h) => `https://www.blockchain.com/bch/tx/${h}` },
  ],
  dot: [
    { name: 'Subscan', url: (h) => `https://polkadot.subscan.io/extrinsic/${h}` },
  ],
  etc: [
    { name: 'Blockscout', url: (h) => `https://blockscout.com/etc/mainnet/tx/${h}` },
  ],
};

const ADDR_EXPLORERS = {
  btc: (a) => `https://mempool.space/address/${a}`,
  eth: (a) => `https://etherscan.io/address/${a}`,
  ltc: (a) => `https://litecoinspace.org/address/${a}`,
  bch: (a) => `https://blockchair.com/bitcoin-cash/address/${a}`,
  dot: (a) => `https://polkadot.subscan.io/account/${a}`,
  etc: (a) => `https://blockscout.com/etc/mainnet/address/${a}`,
};

const openUrl = (url) => {
  invoke('open_url', { url }).catch(() => {});
};

export default function PendingTransactionsPanel({ show, onClose, onBackToMenu, wallets = [], theme = 'dark' }) {
  const [pendingTxs, setPendingTxs] = useState([]);
  const [historyTxs, setHistoryTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState('pending');
  const [csvDateFrom, setCsvDateFrom] = useState('');
  const [csvDateTo, setCsvDateTo] = useState('');
  const [showCsvExport, setShowCsvExport] = useState(false);
  const [csvMsg, setCsvMsg] = useState('');
  const [csvSelectedWallets, setCsvSelectedWallets] = useState(new Set()); // empty = all

  const isDark = theme === 'dark' || theme === 'noctali' || theme === 'lunarpunk';
  const isLP = theme === 'lunarpunk';
  const accentColor = isLP ? '#6d8ff8' : theme === 'noctali' ? '#F4D995' : '#f59e0b';
  const accentHover = isLP ? '#8aa4fa' : theme === 'noctali' ? '#f6e0a8' : '#f59e0b';
  const T = isDark ? {
    bg: isLP ? 'bg-[#08071a]' : 'bg-zinc-900', cardBg: isLP ? 'bg-[#0d0c24]' : 'bg-zinc-800', cardBg2: isLP ? 'bg-[#12103a]' : 'bg-zinc-700',
    border: isLP ? 'border-[#1a1840]' : 'border-zinc-700', text: 'text-zinc-100',
    textMuted: 'text-zinc-400', textFaint: 'text-zinc-500',
    inputBg: isLP ? 'bg-[#100e2a]' : 'bg-zinc-800', inputBorder: isLP ? 'border-[#252260]' : 'border-zinc-600',
  } : {
    bg: 'bg-white', cardBg: 'bg-gray-50', cardBg2: 'bg-gray-100',
    border: 'border-gray-300', text: 'text-gray-900',
    textMuted: 'text-gray-600', textFaint: 'text-gray-400',
    inputBg: 'bg-gray-50', inputBorder: 'border-gray-300',
  };

  const walletIds = new Set(wallets.map(w => w.id));
  const getWalletName = (tx) => tx.wallet_name || wallets.find(x => x.id === tx.wallet_id)?.name || tx.asset?.toUpperCase() || '—';
  const getWalletAddress = (wid) => { const w = wallets.find(x => x.id === wid); return w?.address || ''; };

  useEffect(() => {
    if (!show) return;
    loadPendingTransactions();
    const setup = async () => {
      const unlisten = await listen('pending-tx-update', (event) => {
        setPendingTxs(event.payload.filter(tx => walletIds.has(tx.wallet_id)));
      });
      return unlisten;
    };
    const p = setup();
    return () => { p.then(fn => fn()); };
  }, [show]);

  const loadPendingTransactions = async () => {
    setLoading(true);
    try {
      const txs = await invoke('get_pending_transactions');
      setPendingTxs(txs.filter(tx => walletIds.has(tx.wallet_id)));
    } catch (e) { console.error('Pending TX:', e); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryTxs([]);
    try {
      let ethKey = '';
      try { ethKey = await invoke('get_setting', { key: 'etherscan_api_key' }); } catch(_) {}

      const supportedAssets = ['btc', 'eth', 'ltc', 'bch', 'dot', 'etc'];
      const walletsWithAddr = wallets.filter(w => w.address && w.address.trim() && supportedAssets.includes(w.asset?.toLowerCase()));

      const promises = walletsWithAddr.map(w =>
        secureFetchAddressHistory(
          w.address,
          w.asset.toLowerCase(),
          w.name || w.asset.toUpperCase(),
          ethKey || null,
          10
        ).catch(e => { 
          console.warn(`History ${w.name || w.asset}:`, e); 
          showToast(`⚠️ Erreur historique pour ${w.asset.toUpperCase()}`, 2000);
          return []; 
        })
      );

      const results = await Promise.all(promises);
      
      // Validation des résultats
      const validatedResults = results.map(result => {
        if (!Array.isArray(result)) {
          console.warn('Résultat historique invalide:', result);
          return [];
        }
        return result.filter(tx => 
          tx && tx.tx_hash && tx.asset && typeof tx.timestamp === 'number'
        );
      });
      
      const all = validatedResults.flat();
      all.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryTxs(all);
    } catch (e) {
      console.error('Erreur historique:', e);
      showToast('❌ Erreur de chargement de l\'historique', 3000);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleClear = async (txHash) => {
    try { await invoke('clear_pending_transaction', { txHash }); await loadPendingTransactions(); }
    catch (e) { console.error(e); }
  };

  const getFilteredCsvTxs = () => {
    const fromTs = csvDateFrom ? new Date(csvDateFrom).getTime() / 1000 : 0;
    const toTs = csvDateTo ? new Date(csvDateTo + 'T23:59:59').getTime() / 1000 : 9999999999;
    return historyTxs.filter(tx => {
      if (tx.timestamp < fromTs || tx.timestamp > toTs) return false;
      if (csvSelectedWallets.size > 0 && !csvSelectedWallets.has(tx.address)) return false;
      return true;
    });
  };

  const handleCsvExport = async () => {
    const filtered = getFilteredCsvTxs();
    if (filtered.length === 0) { setCsvMsg('Aucune TX dans cette période'); setTimeout(() => setCsvMsg(''), 2000); return; }

    const header = 'Date,Heure,Asset,Direction,Montant,Wallet,Adresse,De (From),Vers (To),Hash TX,Block,Confirmations\n';
    const rows = filtered.map(tx => {
      const d = new Date(tx.timestamp * 1000);
      return `${d.toLocaleDateString('fr-FR')},${d.toLocaleTimeString('fr-FR')},${tx.asset.toUpperCase()},${tx.direction === 'in' ? 'Reçu' : 'Envoyé'},${tx.amount},"${tx.wallet_name}","${tx.address}","${tx.from_address || ''}","${tx.to_address || ''}","${tx.tx_hash}",${tx.block_height},${tx.confirmations}`;
    }).join('\n');

    const csv = '\uFEFF' + header + rows; // BOM for Excel FR
    const fromLabel = csvDateFrom || 'debut';
    const toLabel = csvDateTo || 'fin';
    const filename = `janus_export_${fromLabel}_${toLabel}.csv`;

    try {
      const home = await invoke('get_home_dir').catch(() => '/home/user');
      const basePath = `${home}/Téléchargements/${filename}`;
      await invoke('save_csv_file', { path: basePath, content: csv });
      setCsvMsg(`✓ ${filtered.length} TX → ~/Téléchargements/${filename}`);
      setTimeout(() => setCsvMsg(''), 4000);
    } catch(e) {
      // Fallback: clipboard
      try {
        await navigator.clipboard.writeText(csv);
        setCsvMsg('✓ Copié dans le presse-papier');
        setTimeout(() => setCsvMsg(''), 3000);
      } catch(_) { setCsvMsg('Erreur export'); setTimeout(() => setCsvMsg(''), 2000); }
    }
  };

  if (!show) return null;

  const fmt = (a) => a >= 1 ? a.toFixed(4) : a >= 0.01 ? a.toFixed(6) : a.toFixed(8);
  const fmtTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts * 1000), diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `Il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `Il y a ${h}h`;
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const activeTxs = pendingTxs.filter(tx => !tx.completed);
  const completedTxs = pendingTxs.filter(tx => tx.completed);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-96 ${T.bg} border-l ${T.border} shadow-2xl z-50`}>
        <div className="p-5 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {onBackToMenu && (
                <button onClick={onBackToMenu} className={`p-1 rounded-lg ${T.textMuted} hover:text-amber-500 transition-colors`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              <h2 className={`text-lg font-semibold ${T.text}`}>Transactions</h2>
            </div>
            <button onClick={onClose} className={`p-1.5 rounded-lg ${T.cardBg} ${T.textMuted} hover:opacity-80`}>✕</button>
          </div>

          {/* Tabs */}
          <div className={`flex gap-1 p-1 ${T.cardBg} rounded-lg mb-4`}>
            <button onClick={() => setTab('pending')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'pending' ? 'text-zinc-900' : T.textMuted}`}
              style={tab === 'pending' ? { backgroundColor: accentColor } : {}}>
              En cours {activeTxs.length > 0 && <span className="ml-1 text-xs">({activeTxs.length})</span>}
            </button>
            <button onClick={() => { setTab('history'); if (historyTxs.length === 0 && !historyLoading) loadHistory(); }}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === 'history' ? 'text-zinc-900' : T.textMuted}`}
              style={tab === 'history' ? { backgroundColor: accentColor } : {}}>
              Historique
            </button>
          </div>

          {/* ── PENDING TAB ── */}
          {tab === 'pending' && (
            <div className="flex-1 overflow-auto space-y-2">
              {loading ? (
                <div className={`text-center py-8 ${T.textMuted} animate-pulse`}>Chargement...</div>
              ) : activeTxs.length === 0 && completedTxs.length === 0 ? (
                <div className={`text-center py-12 ${T.textMuted}`}>
                  <div className="text-3xl mb-2">📭</div>
                  <div className="text-sm">Aucune transaction en attente</div>
                  <div className={`text-xs ${T.textFaint} mt-1`}>Les nouvelles TX apparaîtront ici</div>
                </div>
              ) : (
                <>
                  {activeTxs.map(tx => (
                    <PendingTxCard key={tx.tx_hash} tx={tx} T={T} onClear={handleClear} fmt={fmt} fmtTime={fmtTime}
                      walletName={getWalletName(tx)} walletAddress={getWalletAddress(tx.wallet_id)} accentColor={accentColor} />
                  ))}
                  {completedTxs.length > 0 && (
                    <>
                      <div className={`text-xs ${T.textFaint} uppercase tracking-wider mt-3 mb-1`}>Récemment confirmées</div>
                      {completedTxs.map(tx => (
                        <PendingTxCard key={tx.tx_hash} tx={tx} T={T} onClear={handleClear} fmt={fmt} fmtTime={fmtTime}
                          walletName={getWalletName(tx)} walletAddress={getWalletAddress(tx.wallet_id)} accentColor={accentColor} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {tab === 'history' && (
            <div className="flex-1 overflow-auto flex flex-col min-h-0">
              {historyLoading ? (
                <div className={`text-center py-8 ${T.textMuted} animate-pulse`}>
                  <div className="text-xl mb-2">⛓</div>
                  Interrogation des blockchains...
                </div>
              ) : historyTxs.length === 0 ? (
                <div className={`text-center py-12 ${T.textMuted}`}>
                  <div className="text-3xl mb-2">📋</div>
                  <div className="text-sm">Aucun historique trouvé</div>
                  <button onClick={loadHistory} className="text-xs mt-2 hover:underline" style={{ color: accentColor }}>Réessayer</button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 flex-1 overflow-auto min-h-0">
                    {historyTxs.map((tx, i) => (
                      <HistoryTxCard key={`${tx.tx_hash}-${i}`} tx={tx} T={T} fmt={fmt} fmtTime={fmtTime} accentColor={accentColor} />
                    ))}

                    {/* Older TX link */}
                    <div className={`text-center py-3 space-y-1`}>
                      <div className={`text-xs ${T.textFaint}`}>10 dernières TX par wallet</div>
                      {wallets.filter(w => w.address).map(w => {
                        const fn = ADDR_EXPLORERS[w.asset?.toLowerCase()];
                        if (!fn) return null;
                        return (
                          <button key={w.id} onClick={() => openUrl(fn(w.address))}
                            className={`block w-full text-xs hover:underline`} style={{ color: accentColor }}>
                            {w.name || w.asset.toUpperCase()} — voir tout l'historique →
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CSV Export */}
                  <div className={`mt-2 pt-2 border-t ${T.border}`}>
                    {!showCsvExport ? (
                      <button onClick={() => { setShowCsvExport(true); setCsvSelectedWallets(new Set()); }}
                        className={`w-full px-3 py-2 ${T.cardBg} ${T.textMuted} rounded-lg text-sm hover:text-amber-500 transition-colors flex items-center justify-center gap-2`}>
                        📄 Exporter en CSV
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className={`text-xs font-medium ${T.textMuted}`}>Export CSV</div>
                          <button onClick={() => setShowCsvExport(false)} className={`text-xs ${T.textFaint} hover:text-amber-500`}>✕</button>
                        </div>
                        {/* Date range */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className={`text-[10px] ${T.textFaint}`}>Du</label>
                            <input type="date" value={csvDateFrom} onChange={e => setCsvDateFrom(e.target.value)}
                              className={`w-full px-2 py-1.5 ${T.inputBg} border ${T.inputBorder} rounded text-xs ${T.text}`} />
                          </div>
                          <div className="flex-1">
                            <label className={`text-[10px] ${T.textFaint}`}>Au</label>
                            <input type="date" value={csvDateTo} onChange={e => setCsvDateTo(e.target.value)}
                              className={`w-full px-2 py-1.5 ${T.inputBg} border ${T.inputBorder} rounded text-xs ${T.text}`} />
                          </div>
                        </div>
                        {/* Wallet selection */}
                        <div>
                          <div className={`text-[10px] ${T.textFaint} mb-1`}>Adresses</div>
                          <div className={`max-h-28 overflow-auto space-y-1 ${T.inputBg} rounded p-1.5 border ${T.inputBorder}`}>
                            {/* Select all */}
                            <label className={`flex items-center gap-2 text-xs ${T.textMuted} cursor-pointer py-0.5`}>
                              <input type="checkbox"
                                checked={csvSelectedWallets.size === 0}
                                onChange={() => setCsvSelectedWallets(new Set())}
                                className="w-3 h-3 rounded" />
                              <span className="font-medium">Tout</span>
                            </label>
                            {/* Individual wallets */}
                            {(() => {
                              const uniqueWallets = [];
                              const seen = new Set();
                              historyTxs.forEach(tx => {
                                if (!seen.has(tx.address)) {
                                  seen.add(tx.address);
                                  uniqueWallets.push({ address: tx.address, name: tx.wallet_name, asset: tx.asset });
                                }
                              });
                              return uniqueWallets.map(w => (
                                <label key={w.address} className={`flex items-center gap-2 text-xs ${T.textMuted} cursor-pointer py-0.5`}>
                                  <input type="checkbox"
                                    checked={csvSelectedWallets.size === 0 || csvSelectedWallets.has(w.address)}
                                    onChange={() => {
                                      const next = new Set(csvSelectedWallets);
                                      if (next.size === 0) {
                                        // Switch from "all" to specific: add all except this one
                                        historyTxs.forEach(tx => next.add(tx.address));
                                        next.delete(w.address);
                                      } else if (next.has(w.address)) {
                                        next.delete(w.address);
                                        if (next.size === 0) next.add('__none__'); // keep non-empty
                                      } else {
                                        next.add(w.address);
                                        next.delete('__none__');
                                        // Check if all selected → back to empty (= all)
                                        const allAddrs = new Set(historyTxs.map(t => t.address));
                                        if ([...allAddrs].every(a => next.has(a))) {
                                          setCsvSelectedWallets(new Set());
                                          return;
                                        }
                                      }
                                      setCsvSelectedWallets(next);
                                    }}
                                    className="w-3 h-3 rounded" />
                                  <span className="truncate">{w.name}</span>
                                  <span className={`text-[10px] ${T.textFaint} ml-auto`}>{w.asset.toUpperCase()}</span>
                                </label>
                              ));
                            })()}
                          </div>
                        </div>
                        <button onClick={handleCsvExport}
                          className="w-full px-3 py-2 text-zinc-900 rounded text-sm font-medium"
                          style={{ backgroundColor: accentColor }}>
                          Exporter {getFilteredCsvTxs().length} TX
                        </button>
                        {csvMsg && <div className={`text-xs text-center ${csvMsg.startsWith('✓') ? 'text-green-500' : 'text-red-400'}`}>{csvMsg}</div>}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Footer refresh */}
          <div className={`mt-3 pt-3 border-t ${T.border}`}>
            <button onClick={tab === 'pending' ? loadPendingTransactions : loadHistory}
              className={`w-full px-4 py-2 ${T.cardBg} ${T.textMuted} rounded-lg text-sm hover:opacity-80`}>
              🔄 Actualiser
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Pending TX Card (expandable) ── */
function PendingTxCard({ tx, T, onClear, fmt, fmtTime, walletName, walletAddress, accentColor }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState('');

  const progress = Math.min((tx.confirmations / tx.required_confirmations) * 100, 100);
  const done = tx.completed, mem = tx.confirmations === 0;

  const doCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label); setTimeout(() => setCopied(''), 1500);
    }).catch(() => {});
  };

  return (
    <div className={`${T.cardBg} rounded-lg border ${done ? 'border-green-500/30' : mem ? 'border-yellow-500/30' : T.border} transition-all`}>
      {/* Main — always visible */}
      <div className="p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded" style={{ backgroundColor: accentColor, color: '#0a0a1a' }}>{tx.asset.toUpperCase()}</span>
            <span className={`text-xs font-medium ${T.text} truncate`}>{walletName}</span>
          </div>
          {done ? <span className="px-1.5 py-0.5 bg-green-500/20 text-green-500 text-[10px] rounded-full">✓ Confirmée</span>
           : mem ? <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] rounded-full animate-pulse">⏳ Mempool</span>
           : <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-500 text-[10px] rounded-full">🔄 {tx.confirmations}/{tx.required_confirmations}</span>}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-bold ${done ? 'text-green-500' : T.text}`}>+{fmt(tx.amount)}</span>
            <span className={`text-[10px] font-mono ${T.textFaint}`}>{tx.address ? tx.address.slice(0,8) + '…' + tx.address.slice(-6) : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${T.textFaint}`}>{fmtTime(tx.timestamp)}</span>
            <span className={`${T.textFaint} transition-transform ${expanded ? 'rotate-180' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </div>
        </div>
        <div className={`h-1 ${T.cardBg2} rounded-full overflow-hidden mt-2`}>
          <div className={`h-full transition-all duration-500 ${done ? 'bg-green-500' : mem ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'}`}
            style={{ width: `${Math.max(progress, mem ? 5 : 0)}%` }} />
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className={`px-3 pb-3 space-y-2 border-t ${T.border} pt-2`}>
          <div>
            <div className={`text-[10px] ${T.textFaint} mb-0.5`}>Hash TX</div>
            <button onClick={(e) => { e.stopPropagation(); doCopy(tx.tx_hash, 'hash'); }}
              className={`w-full text-left text-[11px] font-mono ${T.textMuted} hover:text-amber-500 transition-colors break-all leading-relaxed`}>
              {tx.tx_hash}
              <span className="ml-1 text-[9px]">{copied === 'hash' ? '✓ copié' : '📋'}</span>
            </button>
          </div>
          {walletAddress && (
            <div>
              <div className={`text-[10px] ${T.textFaint} mb-0.5`}>Adresse</div>
              <button onClick={(e) => { e.stopPropagation(); doCopy(walletAddress, 'addr'); }}
                className={`w-full text-left text-[11px] font-mono ${T.textMuted} hover:text-amber-500 transition-colors break-all leading-relaxed`}>
                {walletAddress}
                <span className="ml-1 text-[9px]">{copied === 'addr' ? '✓ copié' : '📋'}</span>
              </button>
            </div>
          )}
          <div className="flex justify-between items-center pt-1">
            <ExplorerDropdown asset={tx.asset} txHash={tx.tx_hash} T={T} />
            {done && <button onClick={(e) => { e.stopPropagation(); onClear(tx.tx_hash); }} className={`text-[10px] ${T.textFaint} hover:text-red-400`}>✕ Retirer</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── History TX Card (expandable) ── */
function HistoryTxCard({ tx, T, fmt, fmtTime, accentColor }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState('');
  const isIn = tx.direction === 'in';

  const doCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label); setTimeout(() => setCopied(''), 1500);
    }).catch(() => {});
  };


  return (
    <div className={`${T.cardBg} rounded-lg border ${T.border}`}>
      <div className="p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${T.text}`}>{tx.wallet_name}</span>
          <span className={`text-[10px] ${isIn ? 'text-green-500' : 'text-red-400'}`}>{isIn ? '↓ Reçu' : '↑ Envoyé'}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-bold ${isIn ? 'text-green-500' : 'text-red-400'}`}>{isIn ? '+' : '-'}{fmt(tx.amount)}</span>
            <span className={`text-xs font-semibold ${T.textMuted}`}>{tx.asset.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] ${T.textFaint}`}>{fmtTime(tx.timestamp)}</span>
            <span className={`${T.textFaint} transition-transform ${expanded ? 'rotate-180' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className={`px-3 pb-3 space-y-2 border-t ${T.border} pt-2`}>
          <div>
            <div className={`text-[10px] ${T.textFaint} mb-0.5`}>Hash TX</div>
            <button onClick={(e) => { e.stopPropagation(); doCopy(tx.tx_hash, 'hash'); }}
              className={`w-full text-left text-[11px] font-mono ${T.textMuted} hover:text-amber-500 transition-colors break-all leading-relaxed`}>
              {tx.tx_hash}
              <span className="ml-1 text-[9px]">{copied === 'hash' ? '✓ copié' : '📋'}</span>
            </button>
          </div>
          {/* From address */}
          {tx.from_address && (
            <div>
              <div className={`text-[10px] ${T.textFaint} mb-0.5`}>De (From)</div>
              <button onClick={(e) => { e.stopPropagation(); doCopy(tx.from_address, 'from'); }}
                className={`w-full text-left text-[11px] font-mono ${isIn ? T.textMuted : ''} hover:text-amber-500 transition-colors break-all leading-relaxed`}
                style={!isIn ? { color: accentColor } : {}}>
                {tx.from_address}
                <span className="ml-1 text-[9px]">{copied === 'from' ? '✓ copié' : '📋'}</span>
              </button>
            </div>
          )}
          {/* To address */}
          {tx.to_address && (
            <div>
              <div className={`text-[10px] ${T.textFaint} mb-0.5`}>Vers (To)</div>
              <button onClick={(e) => { e.stopPropagation(); doCopy(tx.to_address, 'to'); }}
                className={`w-full text-left text-[11px] font-mono ${isIn ? '' : T.textMuted} hover:text-amber-500 transition-colors break-all leading-relaxed`}
                style={isIn ? { color: accentColor } : {}}>
                {tx.to_address}
                <span className="ml-1 text-[9px]">{copied === 'to' ? '✓ copié' : '📋'}</span>
              </button>
            </div>
          )}
          {tx.block_height > 0 && (
            <div className={`text-[10px] ${T.textFaint}`}>Block #{tx.block_height.toLocaleString()}</div>
          )}
          <ExplorerDropdown asset={tx.asset} txHash={tx.tx_hash} T={T} />
        </div>
      )}
    </div>
  );
}

/* ── Explorer dropdown ── */
function ExplorerDropdown({ asset, txHash, T }) {
  const [open, setOpen] = useState(false);
  const explorers = EXPLORERS[asset.toLowerCase()] || EXPLORERS.btc;

  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`text-[10px] ${T.textFaint} hover:text-amber-500 transition-colors flex items-center gap-0.5`}>
        Explorer
        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute bottom-5 left-0 z-20 ${T.cardBg} border ${T.border} rounded-lg shadow-xl py-1 min-w-[160px]`}>
            {explorers.map(ex => (
              <button key={ex.name}
                onClick={(e) => { e.stopPropagation(); openUrl(ex.url(txHash)); setOpen(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs ${T.textMuted} hover:text-amber-500 transition-colors`}>
                {ex.name} →
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
