// Script pour exécuter les tests de sécurité
import { runSecurityTests } from './src/securityTests.js';

console.log('Démarrage des tests de sécurité...\n');

runSecurityTests()
  .then(() => {
    console.log('\n✓ Tous les tests de sécurité ont été exécutés avec succès.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Erreur lors de l\'exécution des tests:', error);
    process.exit(1);
  });