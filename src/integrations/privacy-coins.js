// privacy-coins.js - Famille Privacy (XMR, PIVX, ZEC)
// Cryptomonnaies axées sur la confidentialité et l'anonymat

/**
 * Configuration des cryptomonnaies Privacy
 * @typedef {Object} PrivacyCoin
 * @property {string} name - Nom complet
 * @property {string} symbol - Symbole (XMR, PIVX, etc.)
 * @property {number} decimals - Nombre de décimales
 * @property {string} type - Type de confidentialité (ringct, zerocoin, zk-snarks)
 * @property {string} [defaultNode] - Noeud par défaut
 */

export const PRIVACY_COINS = {
  XMR: {
    name: 'Monero',
    symbol: 'XMR',
    decimals: 12,
    type: 'ringct',
    defaultNode: 'http://node.monerooutreach.org:18089',
    explorer: 'https://xmr.llcoins.net',
    minConfirmations: 10,
    scanBatchSize: 1000,
    defaultNodes: [
      'http://node.monerooutreach.org:18089',
      'http://xmr-node.cakewallet.com:18089',
      'http://node.supportxmr.com:18089'
    ]
  },
  PIVX: {
    name: 'PIVX',
    symbol: 'PIVX',
    decimals: 8,
    type: 'zerocoin',
    defaultNode: 'http://pivx.api.btc.com',
    explorer: 'https://chainz.cryptoid.info/pivx/',
    rpcPort: 51473,
    zerocoinMinConfirmations: 6,
    regularMinConfirmations: 2,
    defaultRpcNodes: [
      'http://localhost:51473',
      'http://pivx-node.example.com:51473'
    ]
  },
  ZEC: {
    name: 'Zcash',
    symbol: 'ZEC',
    decimals: 8,
    type: 'zk-snarks',
    defaultNode: 'https://zec.api.btc.com',
    explorer: 'https://explorer.zcha.in'
  }
};

/**
 * Récupère la configuration spécifique d'une cryptomonnaie Privacy
 * @param {string} symbol - Symbole de la cryptomonnaie (XMR, PIVX, ZEC)
 * @returns {Object|null} - Configuration complète ou null
 */
export const getPrivacyCoinConfig = (symbol) => {
  return PRIVACY_COINS[symbol] || null;
};

/**
 * Valide une adresse Privacy selon la cryptomonnaie
 * @param {string} symbol - Symbole de la cryptomonnaie (XMR, PIVX, ZEC)
 * @param {string} address - Adresse à valider
 * @returns {boolean} - True si l'adresse est valide
 */
export const validatePrivacyAddress = (symbol, address) => {
  if (!address || !symbol) return false;
  
  const validators = {
    XMR: (addr) => {
      // Adresse standard Monero (95 chars) ou sous-adresse (106 chars)
      return addr.length === 95 || addr.length === 106;
    },
    PIVX: (addr) => {
      // Adresse PIVX commence par D, longueur 34 (comme dans l'original)
      return addr.startsWith('D') && addr.length === 34;
    },
    ZEC: (addr) => {
      // Adresse transparente (t) ou protégée (zs)
      return addr.startsWith('t') && addr.length === 35 ||
             addr.startsWith('zs') && addr.length === 95;
    }
  };
  
  return validators[symbol]?.(address) || false;
};

/**
 * Valide les paramètres PIVX (comme dans l'original privateCoinIntegration.js)
 * @param {string} address - Adresse PIVX
 * @param {string} [rpcUser] - Utilisateur RPC optionnel
 * @param {string} [rpcPassword] - Mot de passe RPC optionnel
 * @param {string} [rpcNode] - Noeud RPC optionnel
 * @returns {boolean} - True si valide
 * @throws {Error} - Si validation échoue
 */
export const validatePivxKeys = (address, rpcUser, rpcPassword, rpcNode) => {
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
  if (rpcNode && rpcNode.length === 0) {
    throw new Error('URL du nœud PIVX invalide');
  }

  return true;
};

/**
 * Récupère le solde pour une cryptomonnaie Privacy
 * @param {string} symbol - Symbole de la cryptomonnaie (XMR, PIVX, ZEC)
 * @param {string} address - Adresse du portefeuille
 * @param {Object} [options] - Options supplémentaires
 * @param {string} [options.node] - Noeud personnalisé
 * @param {string} [options.viewKey] - Clé de vue (pour XMR)
 * @param {string} [options.rpcUser] - Utilisateur RPC (pour PIVX)
 * @param {string} [options.rpcPassword] - Mot de passe RPC (pour PIVX)
 * @returns {Promise<Object>} - Objet avec les soldes (regular, private, total)
 */
export const getPrivacyBalance = async (symbol, address, options = {}) => {
  if (!validatePrivacyAddress(symbol, address)) {
    throw new Error(`Invalid ${symbol} address: ${address}`);
  }
  
  const coinInfo = PRIVACY_COINS[symbol];
  if (!coinInfo) {
    throw new Error(`Unsupported privacy coin: ${symbol}`);
  }
  
  // Appel spécifique selon la cryptomonnaie
  switch (symbol) {
    case 'XMR':
      return invoke('get_monero_balance', {
        address,
        viewKey: options.viewKey,
        node: options.node || coinInfo.defaultNode
      });
    
    case 'PIVX':
      return invoke('get_pivx_balance', {
        address,
        rpcNode: options.node || coinInfo.defaultNode,
        rpcUser: options.rpcUser,
        rpcPassword: options.rpcPassword
      });
    
    case 'ZEC':
      return invoke('get_zcash_balance', {
        address,
        node: options.node || coinInfo.defaultNode
      });
    
    default:
      throw new Error(`Unsupported privacy coin: ${symbol}`);
  }
};

/**
 * Récupère l'historique des transactions pour une cryptomonnaie Privacy
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @param {string} address - Adresse du portefeuille
 * @param {Object} [options] - Options supplémentaires
 * @param {number} [options.limit=10] - Nombre de transactions
 * @param {string} [options.viewKey] - Clé de vue (pour XMR)
 * @returns {Promise<Array>} - Liste des transactions
 */
export const getPrivacyTransactions = async (symbol, address, options = {}) => {
  if (!validatePrivacyAddress(symbol, address)) {
    throw new Error(`Invalid ${symbol} address: ${address}`);
  }
  
  const limit = options.limit || 10;
  
  switch (symbol) {
    case 'XMR':
      return invoke('get_monero_transactions', {
        address,
        viewKey: options.viewKey,
        limit
      });
    
    case 'PIVX':
      return invoke('get_pivx_transactions', {
        address,
        rpcNode: options.node || PRIVACY_COINS.PIVX.defaultNode,
        rpcUser: options.rpcUser,
        rpcPassword: options.rpcPassword,
        limit
      });
    
    case 'ZEC':
      return invoke('get_zcash_transactions', {
        address,
        node: options.node || PRIVACY_COINS.ZEC.defaultNode,
        limit
      });
    
    default:
      throw new Error(`Unsupported privacy coin: ${symbol}`);
  }
};

/**
 * Teste la connexion à un noeud pour une cryptomonnaie Privacy
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @param {string} node - URL du noeud
 * @param {Object} [credentials] - Identifiants si nécessaire
 * @returns {Promise<Object>} - Informations sur le noeud
 */
export const testPrivacyNode = async (symbol, node, credentials = {}) => {
  switch (symbol) {
    case 'XMR':
      return invoke('test_monero_node', { nodeUrl: node });
    
    case 'PIVX':
      return invoke('test_pivx_node', {
        rpcNode: node,
        rpcUser: credentials.rpcUser,
        rpcPassword: credentials.rpcPassword
      });
    
    case 'ZEC':
      return invoke('test_zcash_node', { nodeUrl: node });
    
    default:
      throw new Error(`Unsupported privacy coin: ${symbol}`);
  }
};

/**
 * Vérifie si une cryptomonnaie est supportée dans la famille Privacy
 * @param {string} symbol - Symbole à vérifier
 * @returns {boolean} - True si supportée
 */
export const isSupportedPrivacyCoin = (symbol) => {
  return !!PRIVACY_COINS[symbol];
};

/**
 * Retourne le type de confidentialité utilisé
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @returns {string|null} - Type de confidentialité ou null
 */
export const getPrivacyType = (symbol) => {
  return PRIVACY_COINS[symbol]?.type || null;
};

/**
 * Prépare les données PIVX pour le backend (comme dans l'original)
 * @param {string} address - Adresse PIVX
 * @param {Object} options - Options
 * @param {string} [options.rpcUser] - Utilisateur RPC
 * @param {string} [options.rpcPassword] - Mot de passe RPC
 * @param {string} [options.rpcNode] - Noeud RPC
 * @returns {Object} - Données préparées pour le backend
 */
export const preparePivxWalletData = (address, options = {}) => {
  return {
    address,
    rpcUser: options.rpcUser,
    rpcPassword: options.rpcPassword,
    rpcNode: options.rpcNode || getPrivacyCoinConfig('PIVX')?.defaultNode
  };
};

/**
 * Masque les informations sensibles pour l'affichage
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @param {string} sensitiveData - Donnée à masquer
 * @returns {string} - Donnée masquée
 */
export const maskSensitiveData = (symbol, sensitiveData) => {
  if (!sensitiveData || sensitiveData.length < 8) return '[MASKED]';
  
  switch (symbol) {
    case 'XMR':
      // Masquer la clé de vue Monero
      return `****-${sensitiveData.slice(-4)}`;
    case 'PIVX':
      // Masquer les credentials RPC
      return `****-${sensitiveData.slice(-4)}`;
    default:
      return `[${symbol}] ${'*'.repeat(sensitiveData.length - 4)}${sensitiveData.slice(-4)}`;
  }
};

/**
 * Récupère les noeuds par défaut pour Monero
 * @returns {Array<string>} - Liste des noeuds Monero
 */
export const getMoneroDefaultNodes = () => {
  return getPrivacyCoinConfig('XMR')?.defaultNodes || [];
};

/**
 * Récupère les noeuds RPC par défaut pour PIVX
 * @returns {Array<string>} - Liste des noeuds PIVX
 */
export const getPivxDefaultNodes = () => {
  return getPrivacyCoinConfig('PIVX')?.defaultRpcNodes || [];
};