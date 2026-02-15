// stablecoins.js - Stablecoins et Assets Backed
// Cryptomonnaies adossées à des actifs réels

/**
 * Configuration des stablecoins et assets backed
 * @typedef {Object} StableCoin
 * @property {string} name - Nom complet
 * @property {string} symbol - Symbole (USDT, USDC, etc.)
 * @property {number} decimals - Nombre de décimales
 * @property {string} type - Type (stablecoin, commodity-backed, etc.)
 * @property {string} peg - Actif de référence (USD, Gold, etc.)
 * @property {string} network - Réseau principal
 * @property {string} [contract] - Adresse du contrat (pour les tokens)
 */

export const STABLE_COINS = {
  // Stablecoins USD
  USDT: {
    name: 'Tether',
    symbol: 'USDT',
    decimals: 6,
    type: 'stablecoin',
    peg: 'USD',
    network: 'ethereum',
    contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    explorer: 'https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7'
  },
  USDC: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    type: 'stablecoin',
    peg: 'USD',
    network: 'ethereum',
    contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    explorer: 'https://etherscan.io/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
  },
  DAI: {
    name: 'Dai',
    symbol: 'DAI',
    decimals: 18,
    type: 'stablecoin',
    peg: 'USD',
    network: 'ethereum',
    contract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    explorer: 'https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f'
  },
  BUSD: {
    name: 'Binance USD',
    symbol: 'BUSD',
    decimals: 18,
    type: 'stablecoin',
    peg: 'USD',
    network: 'bsc',
    contract: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    explorer: 'https://bscscan.com/token/0xe9e7cea3dedca5984780bafc599bd69add087d56'
  },
  
  // Commodity-backed
  PAXG: {
    name: 'PAX Gold',
    symbol: 'PAXG',
    decimals: 18,
    type: 'commodity-backed',
    peg: '1 troy ounce of gold',
    network: 'ethereum',
    contract: '0x45804880De22913dFEe76807C0457034558D7919',
    explorer: 'https://etherscan.io/token/0x45804880de22913dfee76807c0457034558d7919'
  },
  WBTC: {
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    type: 'asset-backed',
    peg: 'BTC',
    network: 'ethereum',
    contract: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    explorer: 'https://etherscan.io/token/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
  }
};

/**
 * Valide une adresse pour un stablecoin
 * @param {string} symbol - Symbole du stablecoin
 * @param {string} address - Adresse à valider
 * @returns {boolean} - True si l'adresse est valide
 */
export const validateStablecoinAddress = (symbol, address) => {
  if (!address || !symbol) return false;
  
  const coinInfo = STABLE_COINS[symbol];
  if (!coinInfo) return false;
  
  // Tous les stablecoins utilisent des adresses EVM ou UTXO selon le réseau
  if (coinInfo.network === 'ethereum' || coinInfo.network === 'bsc' || coinInfo.network === 'polygon') {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  // Ajouter d'autres validations si nécessaire pour d'autres réseaux
  return false;
};

/**
 * Récupère le solde d'un stablecoin ou asset backed
 * @param {string} symbol - Symbole du stablecoin
 * @param {string} address - Adresse du portefeuille
 * @param {string} [network] - Réseau optionnel (par défaut: réseau principal)
 * @returns {Promise<number>} - Solde du token
 */
export const getStablecoinBalance = async (symbol, address, network = null) => {
  if (!validateStablecoinAddress(symbol, address)) {
    throw new Error(`Invalid address for ${symbol}: ${address}`);
  }
  
  const coinInfo = STABLE_COINS[symbol];
  if (!coinInfo) {
    throw new Error(`Unsupported stablecoin: ${symbol}`);
  }
  
  // Utiliser le réseau spécifié ou le réseau par défaut
  const targetNetwork = network || coinInfo.network;
  
  return invoke('get_token_balance', {
    tokenSymbol: symbol,
    contractAddress: coinInfo.contract,
    walletAddress: address,
    network: targetNetwork
  });
};

/**
 * Récupère les métadonnées d'un stablecoin
 * @param {string} symbol - Symbole du stablecoin
 * @returns {Promise<Object>} - Métadonnées du token
 */
export const getStablecoinMetadata = async (symbol) => {
  const coinInfo = STABLE_COINS[symbol];
  if (!coinInfo) {
    throw new Error(`Unsupported stablecoin: ${symbol}`);
  }
  
  return {
    ...coinInfo,
    currentPrice: await getStablecoinPrice(symbol)
  };
};

/**
 * Récupère le prix actuel d'un stablecoin
 * @param {string} symbol - Symbole du stablecoin
 * @returns {Promise<number>} - Prix en USD (généralement 1 pour les stablecoins USD)
 */
export const getStablecoinPrice = async (symbol) => {
  const coinInfo = STABLE_COINS[symbol];
  if (!coinInfo) {
    throw new Error(`Unsupported stablecoin: ${symbol}`);
  }
  
  // Pour les stablecoins USD, le prix est généralement 1
  if (coinInfo.peg === 'USD') return 1.0;
  
  // Pour les assets backed, récupérer le prix du marché
  return invoke('get_token_price', { symbol });
};

/**
 * Vérifie si un stablecoin est supporté
 * @param {string} symbol - Symbole à vérifier
 * @returns {boolean} - True si supporté
 */
export const isSupportedStablecoin = (symbol) => {
  return !!STABLE_COINS[symbol];
};

/**
 * Retourne le type de stablecoin
 * @param {string} symbol - Symbole du stablecoin
 * @returns {string|null} - Type ou null
 */
export const getStablecoinType = (symbol) => {
  return STABLE_COINS[symbol]?.type || null;
};

/**
 * Formate le solde pour affichage
 * @param {string} symbol - Symbole du stablecoin
 * @param {number} balance - Solde en unités de base
 * @returns {string} - Solde formaté
 */
export const formatStablecoinBalance = (symbol, balance) => {
  const coinInfo = STABLE_COINS[symbol];
  if (!coinInfo) return '0';
  
  const divisor = Math.pow(10, coinInfo.decimals);
  const displayBalance = balance / divisor;
  
  // Formatage selon le type
  if (symbol === 'PAXG') {
    return `${displayBalance.toFixed(6)} PAXG (≈${(displayBalance * getGoldPrice()).toFixed(2)} USD)`;
  }
  
  return `${displayBalance.toFixed(2)} ${symbol}`;
};

// Helper pour le prix de l'or (simplifié)
const getGoldPrice = () => {
  // En production, cela viendrait d'une API
  return 1950.00; // USD par once
};