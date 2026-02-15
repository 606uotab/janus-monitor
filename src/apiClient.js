import axios from 'axios';
import https from 'https';

// Configuration d'axios avec validation SSL stricte
const apiClient = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: true, // Rejette les certificats SSL non valides
  }),
  timeout: 10000, // Timeout de 10 secondes
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Liste des endpoints API autorisés
const ALLOWED_API_ENDPOINTS = {
  binance: 'https://api.binance.com',
  bitfinex: 'https://api.bitfinex.com',
  coingecko: 'https://api.coingecko.com',
  frankfurter: 'https://api.frankfurter.app',
  erapi: 'https://api.exchangerate-api.com',
  yahooFinance: 'https://query1.finance.yahoo.com',
};

// Validation des réponses API
const validateApiResponse = (response, expectedStructure) => {
  if (!response || !response.data) {
    throw new Error('Réponse API invalide : pas de données');
  }

  // Vérifier la structure de la réponse
  if (expectedStructure) {
    for (const key of expectedStructure) {
      if (!(key in response.data)) {
        throw new Error(`Réponse API invalide : champ ${key} manquant`);
      }
    }
  }

  return response.data;
};

// Fonction pour effectuer des appels API sécurisés
const secureApiCall = async (url, method = 'get', data = null, expectedStructure = null) => {
  try {
    // Vérifier que l'URL est dans la liste des endpoints autorisés
    const isAllowed = Object.values(ALLOWED_API_ENDPOINTS).some(endpoint =>
      url.startsWith(endpoint)
    );

    if (!isAllowed) {
      throw new Error('Endpoint API non autorisé');
    }

    const response = await apiClient({ method, url, data });
    return validateApiResponse(response, expectedStructure);
  } catch (error) {
    console.error('Erreur lors de l\'appel API sécurisé:', error.message);
    throw error;
  }
};

export { secureApiCall, ALLOWED_API_ENDPOINTS };