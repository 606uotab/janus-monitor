// utxo-coins.js - Famille UTXO (BTC, BCH, LTC, DOGE, DASH)
// Cryptomonnaies basées sur le modèle UTXO (Unspent Transaction Output)

/**
 * Configuration des cryptomonnaies UTXO
 * @typedef {Object} UTXOCoin
 * @property {string} name - Nom complet
 * @property {string} symbol - Symbole (BTC, BCH, etc.)
 * @property {number} decimals - Nombre de décimales
 * @property {string} [explorer] - Explorateur de blocs par défaut
 */

export const UTXO_COINS = {
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    explorer: 'https://blockstream.info',
    rpcPort: 8332
  },
  BCH: {
    name: 'Bitcoin Cash',
    symbol: 'BCH',
    decimals: 8,
    explorer: 'https://blockchair.com/bitcoin-cash',
    rpcPort: 8332
  },
  LTC: {
    name: 'Litecoin',
    symbol: 'LTC',
    decimals: 8,
    explorer: 'https://blockchair.com/litecoin',
    rpcPort: 9332
  },
  DOGE: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    decimals: 8,
    explorer: 'https://blockchair.com/dogecoin',
    rpcPort: 22555
  },
  DASH: {
    name: 'Dash',
    symbol: 'DASH',
    decimals: 8,
    explorer: 'https://blockchair.com/dash',
    rpcPort: 9998
  }
};

/**
 * Valide une adresse UTXO selon la cryptomonnaie
 * @param {string} address - Adresse à valider
 * @param {string} symbol - Symbole de la cryptomonnaie (BTC, BCH, etc.)
 * @returns {boolean} - True si l'adresse est valide
 */
export const validateUTXOAddress = (address, symbol) => {
  if (!address || !symbol) return false;
  
  const patterns = {
    BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[ac-hj-np-z02-9]{11,71}$/,
    BCH: /^(bitcoincash:)?(q|p)[a-z0-9]{41}$/,
    LTC: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
    DOGE: /^D{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$/,
    DASH: /^X[1-9A-HJ-NP-Za-km-z]{33}$/
  };
  
  return patterns[symbol]?.test(address) || false;
};

/**
 * Récupère le solde pour une cryptomonnaie UTXO
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @param {string} address - Adresse du portefeuille
 * @param {string} [node] - Noeud RPC optionnel
 * @returns {Promise<number>} - Solde en unités de base
 */
export const getUTXOBalance = async (symbol, address, node = null) => {
  if (!validateUTXOAddress(address, symbol)) {
    throw new Error(`Invalid ${symbol} address: ${address}`);
  }
  
  const coinInfo = UTXO_COINS[symbol];
  if (!coinInfo) {
    throw new Error(`Unsupported UTXO coin: ${symbol}`);
  }
  
  // Appel au backend Tauri
  return invoke(`get_${symbol.toLowerCase()}_balance`, {
    address,
    node: node || getDefaultNode(symbol)
  });
};

/**
 * Récupère l'historique des transactions pour une cryptomonnaie UTXO
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @param {string} address - Adresse du portefeuille
 * @param {number} [limit=10] - Nombre de transactions à récupérer
 * @returns {Promise<Array>} - Liste des transactions
 */
export const getUTXOTransactions = async (symbol, address, limit = 10) => {
  if (!validateUTXOAddress(address, symbol)) {
    throw new Error(`Invalid ${symbol} address: ${address}`);
  }
  
  return invoke(`get_${symbol.toLowerCase()}_transactions`, {
    address,
    limit
  });
};

/**
 * Retourne un noeud par défaut pour la cryptomonnaie
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @returns {string} - URL du noeud
 */
const getDefaultNode = (symbol) => {
  const nodes = {
    BTC: 'https://blockstream.info/api',
    BCH: 'https://bch-blockchain.api.btc.com',
    LTC: 'https://ltc.blockstream.com/api',
    DOGE: 'https://dogecoin.api.btc.com',
    DASH: 'https://dash.api.btc.com'
  };
  return nodes[symbol] || 'https://blockstream.info/api';
};

/**
 * Estime les frais de transaction pour une cryptomonnaie UTXO
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @returns {Promise<Object>} - Objet avec les frais (fast, medium, slow)
 */
export const estimateUTXOFee = async (symbol) => {
  return invoke(`estimate_${symbol.toLowerCase()}_fee`);
};

/**
 * Vérifie si une cryptomonnaie est supportée dans la famille UTXO
 * @param {string} symbol - Symbole à vérifier
 * @returns {boolean} - True si supportée
 */
export const isSupportedUTXOCoin = (symbol) => {
  return !!UTXO_COINS[symbol];
};