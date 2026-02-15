// secureBackend.js - Sécurisation des appels backend Tauri

// Validation des réponses backend
const validateBackendResponse = (response, expectedType, expectedFields = []) => {
  if (response === null || response === undefined) {
    throw new Error('Réponse backend vide');
  }

  // Vérification du type
  if (expectedType && typeof response !== expectedType) {
    throw new Error(`Type de réponse inattendu. Attendu: ${expectedType}, Reçu: ${typeof response}`);
  }

  // Vérification des champs obligatoires pour les objets
  if (expectedType === 'object' && expectedFields.length > 0) {
    for (const field of expectedFields) {
      if (!(field in response)) {
        throw new Error(`Champ obligatoire manquant: ${field}`);
      }
    }
  }

  // Vérification des valeurs numériques
  if (expectedType === 'number' && isNaN(response)) {
    throw new Error('Valeur numérique invalide reçue');
  }

  return response;
};

// Fonction pour effectuer des appels backend sécurisés
const secureInvoke = async (command, args = {}, expectedType = null, expectedFields = []) => {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const response = await invoke(command, args);
    
    // Validation de la réponse
    return validateBackendResponse(response, expectedType, expectedFields);
  } catch (error) {
    throw error;
  }
};

// Fonctions spécifiques pour différents types d'appels
const secureGetPrices = async () => {
  return secureInvoke('get_prices', {}, 'object', [
    // Les prix doivent contenir au moins certains champs clés
    // Nous ne validons pas tous les champs car certains peuvent être optionnels
  ]);
};

const secureFetchBalance = async (asset, address) => {
  return secureInvoke('fetch_balance', { asset, address }, 'number');
};

const secureFetchAddressHistory = async (address, asset, walletName, etherscanKey, limit) => {
  return secureInvoke('fetch_address_history', {
    address,
    asset,
    walletName,
    etherscanKey,
    limit
  }, 'array');
};

export {
  secureInvoke,
  secureGetPrices,
  secureFetchBalance,
  secureFetchAddressHistory,
  validateBackendResponse
};