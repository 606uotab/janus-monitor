// privateCoinIntegration.js - Intégration des cryptomonnaies privées (XMR, PIVX)
// Ce module gère l'intégration avancée pour les cryptomonnaies anonymes

import { invoke } from '@tauri-apps/api/core';

// Configuration pour Monero
const MONERO_CONFIG = {
  defaultNodes: [
    'http://node.monerooutreach.org:18089',
    'http://xmr-node.cakewallet.com:18089',
    'http://node.supportxmr.com:18089'
  ],
  minConfirmations: 10,
  scanBatchSize: 1000
};

// Configuration pour PIVX
const PIVX_CONFIG = {
  defaultRpcPort: 51473,
  zerocoinMinConfirmations: 6,
  regularMinConfirmations: 2,
  defaultRpcNodes: [
    'http://localhost:51473',
    'http://pivx-node.example.com:51473'
  ]
};

// Validation des clés PIVX
const validatePivxKeys = (address, rpcUser, rpcPassword, rpcNode) => {
  // Validation basique de l'adresse PIVX
  if (!address || address.length < 25 || address.length > 35) {
    throw new Error('Adresse PIVX invalide');
  }

  // Validation des credentials RPC (optionnels pour le mode public)
  if (rpcUser && rpcPassword) {
    if (rpcUser.length === 0 || rpcPassword.length === 0) {
      throw new Error('Credentials RPC PIVX invalides');
    }
  }

  // Validation du nœud RPC
  if (!rpcNode || rpcNode.length === 0) {
    throw new Error('URL du nœud PIVX invalide');
  }

  return true;
};

// Préparation des données PIVX pour le backend
const preparePivxWalletData = (address, rpcUser, rpcPassword, rpcNode = null) => {
  return {
    address,
    rpcUser: rpcUser || null,
    rpcPassword: rpcPassword || null,
    rpcNode: rpcNode || PIVX_CONFIG.defaultRpcNodes[0],
    zerocoinMinConfirmations: PIVX_CONFIG.zerocoinMinConfirmations,
    regularMinConfirmations: PIVX_CONFIG.regularMinConfirmations
  };
};

// Fonction pour obtenir la balance PIVX via le backend
const getPivxBalance = async (walletData) => {
  try {
    // Validation des données
    validatePivxKeys(walletData.address, walletData.rpcUser, walletData.rpcPassword, walletData.rpcNode);

    // Appel au backend Rust
    const result = await invoke('get_pivx_balance', walletData);
    
    return {
      success: true,
      zerocoinBalance: result.zerocoinBalance,
      regularBalance: result.regularBalance,
      totalBalance: result.totalBalance,
      transactions: result.transactions || []
    };
  } catch (error) {
    console.error('Erreur PIVX:', error);
    throw new Error(`Échec de la récupération de la balance PIVX: ${error.message}`);
  }
};

// Fonction pour obtenir l'historique des transactions PIVX
const getPivxTransactionHistory = async (walletData, limit = 20) => {
  try {
    validatePivxKeys(walletData.address, walletData.rpcUser, walletData.rpcPassword, walletData.rpcNode);

    const result = await invoke('get_pivx_transactions', {
      ...walletData,
      limit
    });

    return {
      success: true,
      transactions: result.transactions || [],
      totalTransactions: result.totalTransactions || 0
    };
  } catch (error) {
    console.error('Erreur historique PIVX:', error);
    throw new Error(`Échec de la récupération de l'historique PIVX: ${error.message}`);
  }
};

// Fonction pour tester la connexion à un nœud PIVX
const testPivxNode = async (rpcNode, rpcUser = null, rpcPassword = null) => {
  try {
    const result = await invoke('test_pivx_node', {
      rpcNode,
      rpcUser,
      rpcPassword
    });
    return {
      success: true,
      blockHeight: result.blockHeight,
      version: result.version,
      responseTime: result.responseTime
    };
  } catch (error) {
    console.error('Erreur test nœud PIVX:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Fonction pour masquer les credentials RPC
const maskRpcCredentials = (user, password) => {
  if (!user && !password) return 'Aucun credential';
  
  const maskedUser = user ? maskSensitiveKey(user, 2) : 'user';
  const maskedPass = password ? maskSensitiveKey(password, 2) : 'pass';
  
  return `${maskedUser}:${maskedPass}`;
};

// Validation des clés Monero
const validateMoneroKeys = (address, viewKey, spendKey = null) => {
  // Validation basique de l'adresse Monero (commence par 4)
  if (!address || !address.startsWith('4') || address.length !== 95) {
    throw new Error('Adresse Monero invalide');
  }

  // Validation de la view key (64 caractères hexadécimaux)
  if (!viewKey || !/^[0-9a-fA-F]{64}$/.test(viewKey)) {
    throw new Error('View key Monero invalide');
  }

  // Validation optionnelle de la spend key
  if (spendKey && !/^[0-9a-fA-F]{64}$/.test(spendKey)) {
    throw new Error('Spend key Monero invalide');
  }

  return true;
};

// Préparation des données Monero pour le backend
const prepareMoneroWalletData = (address, viewKey, spendKey = null, node = null) => {
  return {
    address,
    viewKey,
    spendKey: spendKey || null,
    node: node || MONERO_CONFIG.defaultNodes[0],
    minConfirmations: MONERO_CONFIG.minConfirmations,
    scanBatchSize: MONERO_CONFIG.scanBatchSize
  };
};

// Fonction pour obtenir la balance Monero via le backend
const getMoneroBalance = async (walletData) => {
  try {
    // Validation des données
    validateMoneroKeys(walletData.address, walletData.viewKey, walletData.spendKey);

    // Appel au backend Rust pour éviter d'exposer les clés dans le frontend
    const result = await invoke('get_monero_balance', walletData);
    
    return {
      success: true,
      balance: result.balance,
      unlockedBalance: result.unlockedBalance,
      lastScannedHeight: result.lastScannedHeight,
      networkHeight: result.networkHeight,
      transactions: result.transactions || []
    };
  } catch (error) {
    console.error('Erreur Monero:', error);
    throw new Error(`Échec de la récupération de la balance Monero: ${error.message}`);
  }
};

// Fonction pour obtenir l'historique des transactions Monero
const getMoneroTransactionHistory = async (walletData, limit = 20) => {
  try {
    validateMoneroKeys(walletData.address, walletData.viewKey, walletData.spendKey);

    const result = await invoke('get_monero_transactions', {
      ...walletData,
      limit
    });

    return {
      success: true,
      transactions: result.transactions || [],
      totalTransactions: result.totalTransactions || 0
    };
  } catch (error) {
    console.error('Erreur historique Monero:', error);
    throw new Error(`Échec de la récupération de l'historique Monero: ${error.message}`);
  }
};

// Fonction pour tester la connexion à un nœud Monero
const testMoneroNode = async (nodeUrl) => {
  try {
    const result = await invoke('test_monero_node', { nodeUrl });
    return {
      success: true,
      height: result.height,
      version: result.version,
      responseTime: result.responseTime
    };
  } catch (error) {
    console.error('Erreur test nœud Monero:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Fonction pour masquer partiellement les clés sensibles (pour l'interface utilisateur)
const maskSensitiveKey = (key, visibleChars = 4) => {
  if (!key || key.length <= visibleChars * 2) return '••••••••';
  
  const start = key.substring(0, visibleChars);
  const end = key.substring(key.length - visibleChars);
  const middle = '•'.repeat(Math.max(8, key.length - visibleChars * 2));
  
  return `${start}${middle}${end}`;
};

export {
  validateMoneroKeys,
  validatePivxKeys,
  prepareMoneroWalletData,
  preparePivxWalletData,
  getMoneroBalance,
  getPivxBalance,
  getMoneroTransactionHistory,
  getPivxTransactionHistory,
  testMoneroNode,
  testPivxNode,
  maskSensitiveKey,
  maskRpcCredentials,
  MONERO_CONFIG,
  PIVX_CONFIG
};