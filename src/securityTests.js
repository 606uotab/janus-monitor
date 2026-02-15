// securityTests.js - Tests pour les fonctions de sécurité

import { 
  validateBackendResponse, 
  secureInvoke 
} from './secureBackend.js';

// Test de validation des réponses backend
const testValidateBackendResponse = () => {
  console.log('Test: validateBackendResponse');
  
  // Test 1: Réponse valide
  try {
    const validResponse = { btc: { usd: 50000, eur: 45000 }, eth: { usd: 3000, eur: 2700 } };
    const result = validateBackendResponse(validResponse, 'object');
    console.log('✓ Test 1 passé: Réponse valide acceptée');
  } catch (e) {
    console.error('✗ Test 1 échoué:', e.message);
  }
  
  // Test 2: Réponse nulle
  try {
    validateBackendResponse(null, 'object');
    console.error('✗ Test 2 échoué: Réponse nulle devrait être rejetée');
  } catch (e) {
    console.log('✓ Test 2 passé: Réponse nulle rejetée -', e.message);
  }
  
  // Test 3: Mauvais type
  try {
    validateBackendResponse('not an object', 'object');
    console.error('✗ Test 3 échoué: Mauvais type devrait être rejeté');
  } catch (e) {
    console.log('✓ Test 3 passé: Mauvais type rejeté -', e.message);
  }
  
  // Test 4: Champ obligatoire manquant
  try {
    validateBackendResponse({ btc: { usd: 50000 } }, 'object', ['eth']);
    console.error('✗ Test 4 échoué: Champ obligatoire manquant devrait être rejeté');
  } catch (e) {
    console.log('✓ Test 4 passé: Champ obligatoire manquant rejeté -', e.message);
  }
  
  // Test 5: Valeur numérique invalide
  try {
    validateBackendResponse(NaN, 'number');
    console.error('✗ Test 5 échoué: Valeur numérique invalide devrait être rejetée');
  } catch (e) {
    console.log('✓ Test 5 passé: Valeur numérique invalide rejetée -', e.message);
  }
};

// Test des appels backend sécurisés
const testSecureInvoke = async () => {
  console.log('\nTest: secureInvoke');
  
  try {
    // Test avec un appel réel
    const prices = await secureInvoke('get_prices', {}, 'object');
    console.log('✓ Test secureInvoke passé: Appel backend réussi');
    console.log('  Données reçues:', Object.keys(prices).length, 'paires de prix');
  } catch (e) {
    console.error('✗ Test secureInvoke échoué:', e.message);
  }
};

// Exécuter tous les tests
export const runSecurityTests = async () => {
  console.log('=== Début des tests de sécurité ===');
  testValidateBackendResponse();
  await testSecureInvoke();
  console.log('=== Fin des tests de sécurité ===');
};

// Exécuter les tests si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests().catch(console.error);
}