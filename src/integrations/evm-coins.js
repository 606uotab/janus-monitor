// evm-coins.js - Famille EVM (ETH, ETC, BNB, MATIC)
// Cryptomonnaies basées sur l'Ethereum Virtual Machine

/**
 * Configuration des cryptomonnaies EVM
 * @typedef {Object} EVMCoin
 * @property {string} name - Nom complet
 * @property {string} symbol - Symbole (ETH, ETC, etc.)
 * @property {number} decimals - Nombre de décimales
 * @property {string} network - Réseau (ethereum, etc)
 * @property {number} chainId - Identifiant de chaîne
 */

export const EVM_COINS = {
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    network: 'ethereum',
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/',
    explorer: 'https://etherscan.io'
  },
  ETC: {
    name: 'Ethereum Classic',
    symbol: 'ETC',
    decimals: 18,
    network: 'ethereum-classic',
    chainId: 61,
    rpcUrl: 'https://etc.api.btc.com',
    explorer: 'https://blockscout.com/etc/mainnet'
  },
  BNB: {
    name: 'Binance Coin',
    symbol: 'BNB',
    decimals: 18,
    network: 'bsc',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    explorer: 'https://bscscan.com'
  },
  MATIC: {
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    network: 'polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com/',
    explorer: 'https://polygonscan.com'
  }
};

/**
 * Valide une adresse EVM (même format pour toutes)
 * @param {string} address - Adresse à valider
 * @returns {boolean} - True si l'adresse est valide
 */
export const validateEVMAddress = (address) => {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Récupère le solde natif (ETH, BNB, etc.)
 * @param {string} symbol - Symbole de la cryptomonnaie (ETH, BNB, etc.)
 * @param {string} address - Adresse du portefeuille
 * @param {string} [rpcUrl] - URL RPC optionnelle
 * @returns {Promise<number>} - Solde en unités de base
 */
export const getNativeEVMBalance = async (symbol, address, rpcUrl = null) => {
  if (!validateEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
  
  const coinInfo = EVM_COINS[symbol];
  if (!coinInfo) {
    throw new Error(`Unsupported EVM coin: ${symbol}`);
  }
  
  return invoke('get_evm_balance', {
    symbol,
    address,
    rpcUrl: rpcUrl || coinInfo.rpcUrl,
    chainId: coinInfo.chainId
  });
};

/**
 * Récupère le solde d'un token ERC-20/BEP-20
 * @param {string} tokenSymbol - Symbole du token (USDT, USDC, etc.)
 * @param {string} contractAddress - Adresse du contrat
 * @param {string} walletAddress - Adresse du portefeuille
 * @param {string} network - Réseau (ethereum, bsc, etc.)
 * @returns {Promise<number>} - Solde du token
 */
export const getTokenBalance = async (tokenSymbol, contractAddress, walletAddress, network) => {
  if (!validateEVMAddress(contractAddress) || !validateEVMAddress(walletAddress)) {
    throw new Error('Invalid EVM addresses');
  }
  
  const networkInfo = Object.values(EVM_COINS).find(c => c.network === network);
  if (!networkInfo) {
    throw new Error(`Unsupported network: ${network}`);
  }
  
  return invoke('get_token_balance', {
    tokenSymbol,
    contractAddress,
    walletAddress,
    chainId: networkInfo.chainId,
    rpcUrl: networkInfo.rpcUrl
  });
};

/**
 * Estime le coût du gaz pour une transaction
 * @param {string} network - Réseau (ethereum, bsc, etc.)
 * @returns {Promise<Object>} - Estimation du gaz (slow, average, fast)
 */
export const estimateEVMGas = async (network) => {
  const networkInfo = Object.values(EVM_COINS).find(c => c.network === network);
  if (!networkInfo) {
    throw new Error(`Unsupported network: ${network}`);
  }
  
  return invoke('estimate_evm_gas', {
    chainId: networkInfo.chainId,
    rpcUrl: networkInfo.rpcUrl
  });
};

/**
 * Récupère l'historique des transactions EVM
 * @param {string} address - Adresse du portefeuille
 * @param {string} network - Réseau (ethereum, bsc, etc.)
 * @param {number} [limit=10] - Nombre de transactions
 * @returns {Promise<Array>} - Liste des transactions
 */
export const getEVMTransactions = async (address, network, limit = 10) => {
  if (!validateEVMAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }
  
  const networkInfo = Object.values(EVM_COINS).find(c => c.network === network);
  if (!networkInfo) {
    throw new Error(`Unsupported network: ${network}`);
  }
  
  return invoke('get_evm_transactions', {
    address,
    chainId: networkInfo.chainId,
    limit,
    explorer: networkInfo.explorer
  });
};

/**
 * Vérifie si une cryptomonnaie est supportée dans la famille EVM
 * @param {string} symbol - Symbole à vérifier
 * @returns {boolean} - True si supportée
 */
export const isSupportedEVMCoin = (symbol) => {
  return !!EVM_COINS[symbol];
};

/**
 * Vérifie si un réseau est supporté
 * @param {string} network - Nom du réseau
 * @returns {boolean} - True si supporté
 */
export const isSupportedEVMNetwork = (network) => {
  return Object.values(EVM_COINS).some(c => c.network === network);
};

/**
 * Retourne les informations d'un réseau EVM
 * @param {string} network - Nom du réseau
 * @returns {Object|null} - Informations du réseau ou null
 */
export const getEVMNetworkInfo = (network) => {
  return Object.values(EVM_COINS).find(c => c.network === network) || null;
};