// integrations/index.js - Export centralisé de toutes les familles
// Point d'entrée unique pour importer les intégrations de cryptomonnaies

// Import des constantes de chaque famille pour les utiliser dans ALL_COINS
import { UTXO_COINS } from './utxo-coins';
import { EVM_COINS } from './evm-coins';
import { PRIVACY_COINS } from './privacy-coins';
import { STABLE_COINS } from './stablecoins';

// Réexportation de toutes les familles
export * from './utxo-coins';
export * from './evm-coins';
export * from './privacy-coins';
export * from './stablecoins';

// Export des constantes globales pour une utilisation facile
/**
 * Toutes les cryptomonnaies supportées, organisées par famille
 */
export const COIN_FAMILIES = {
  UTXO: 'UTXO',
  EVM: 'EVM', 
  PRIVACY: 'PRIVACY',
  STABLE: 'STABLE'
};

/**
 * Liste complète de toutes les cryptomonnaies supportées
 */
export const ALL_COINS = {
  ...UTXO_COINS,
  ...EVM_COINS,
  ...PRIVACY_COINS,
  ...STABLE_COINS
};

/**
 * Récupère les informations d'une cryptomonnaie par son symbole
 * @param {string} symbol - Symbole de la cryptomonnaie (BTC, ETH, XMR, etc.)
 * @returns {Object|null} - Objet avec les informations ou null si non trouvé
 */
export const getCoinInfo = (symbol) => {
  if (!symbol) return null;
  
  const upperSymbol = symbol.toUpperCase();
  
  // Recherche dans toutes les familles
  if (UTXO_COINS[upperSymbol]) {
    return { ...UTXO_COINS[upperSymbol], family: COIN_FAMILIES.UTXO };
  }
  
  if (EVM_COINS[upperSymbol]) {
    return { ...EVM_COINS[upperSymbol], family: COIN_FAMILIES.EVM };
  }
  
  if (PRIVACY_COINS[upperSymbol]) {
    return { ...PRIVACY_COINS[upperSymbol], family: COIN_FAMILIES.PRIVACY };
  }
  
  if (STABLE_COINS[upperSymbol]) {
    return { ...STABLE_COINS[upperSymbol], family: COIN_FAMILIES.STABLE };
  }
  
  return null;
};

/**
 * Détermine la famille d'une cryptomonnaie
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @returns {string|null} - Famille ou null si non trouvée
 */
export const getCoinFamily = (symbol) => {
  const coinInfo = getCoinInfo(symbol);
  return coinInfo?.family || null;
};

/**
 * Vérifie si une cryptomonnaie est supportée
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @returns {boolean} - True si supportée
 */
export const isSupportedCoin = (symbol) => {
  return !!getCoinInfo(symbol);
};

/**
 * Récupère le solde pour n'importe quelle cryptomonnaie
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @param {string} address - Adresse du portefeuille
 * @param {Object} [options] - Options supplémentaires
 * @returns {Promise<any>} - Solde (format dépend de la famille)
 */
export const getBalance = async (symbol, address, options = {}) => {
  const family = getCoinFamily(symbol);
  
  if (!family) {
    throw new Error(`Unsupported coin: ${symbol}`);
  }
  
  switch (family) {
    case COIN_FAMILIES.UTXO:
      return getUTXOBalance(symbol, address, options.node);
    
    case COIN_FAMILIES.EVM:
      return getNativeEVMBalance(symbol, address, options.rpcUrl);
    
    case COIN_FAMILIES.PRIVACY:
      return getPrivacyBalance(symbol, address, options);
    
    case COIN_FAMILIES.STABLE:
      return getStablecoinBalance(symbol, address, options.network);
    
    default:
      throw new Error(`Unknown family: ${family}`);
  }
};

/**
 * Valide une adresse pour n'importe quelle cryptomonnaie
 * @param {string} symbol - Symbole de la cryptomonnaie
 * @param {string} address - Adresse à valider
 * @returns {boolean} - True si l'adresse est valide
 */
export const validateAddress = (symbol, address) => {
  const family = getCoinFamily(symbol);
  
  if (!family) {
    return false;
  }
  
  switch (family) {
    case COIN_FAMILIES.UTXO:
      return validateUTXOAddress(address, symbol);
    
    case COIN_FAMILIES.EVM:
      return validateEVMAddress(address);
    
    case COIN_FAMILIES.PRIVACY:
      return validatePrivacyAddress(symbol, address);
    
    case COIN_FAMILIES.STABLE:
      return validateStablecoinAddress(symbol, address);
    
    default:
      return false;
  }
};

// Helper pour obtenir les fonctions spécifiques à une famille
/**
 * Retourne les fonctions spécifiques à une famille
 * @param {string} family - Famille (UTXO, EVM, PRIVACY, STABLE)
 * @returns {Object} - Objet avec les fonctions de la famille
 */
export const getFamilyFunctions = (family) => {
  const families = {
    [COIN_FAMILIES.UTXO]: {
      validate: validateUTXOAddress,
      getBalance: getUTXOBalance,
      getTransactions: getUTXOTransactions,
      estimateFee: estimateUTXOFee
    },
    [COIN_FAMILIES.EVM]: {
      validate: validateEVMAddress,
      getBalance: getNativeEVMBalance,
      getTransactions: getEVMTransactions,
      estimateGas: estimateEVMGas,
      getTokenBalance: getTokenBalance
    },
    [COIN_FAMILIES.PRIVACY]: {
      validate: validatePrivacyAddress,
      getBalance: getPrivacyBalance,
      getTransactions: getPrivacyTransactions,
      testNode: testPrivacyNode,
      maskData: maskSensitiveData
    },
    [COIN_FAMILIES.STABLE]: {
      validate: validateStablecoinAddress,
      getBalance: getStablecoinBalance,
      getMetadata: getStablecoinMetadata,
      getPrice: getStablecoinPrice,
      formatBalance: formatStablecoinBalance
    }
  };
  
  return families[family] || {};
};

// Export des constantes pour référence rapide
export { COIN_FAMILIES as FAMILIES };