#!/usr/bin/env node

/**
 * Script de gestion des dépendances pour Janus Monitor
 * Ce script permet de:
 * 1. Vérifier les vulnérabilités des dépendances
 * 2. Mettre à jour les dépendances de manière sécurisée
 * 3. Générer des rapports de sécurité
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

// Obtenir le chemin du fichier courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemins des fichiers
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const DEPENDENCY_REPORT_PATH = path.join(__dirname, '..', 'dependency-report.json');
const AUDIT_LOG_PATH = path.join(__dirname, '..', 'security-audit.log');

/**
 * Exécuter une commande et retourner le résultat
 */
function runCommand(command, options = {}) {
  try {
    return execSync(command, { 
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe',
      ...options
    });
  } catch (error) {
    return { 
      error: true, 
      stdout: error.stdout || '', 
      stderr: error.stderr || '', 
      status: error.status || 1 
    };
  }
}

/**
 * Vérifier les vulnérabilités des dépendances
 */
function checkVulnerabilities() {
  console.log('🔍 Vérification des vulnérabilités des dépendances...');
  
  const result = runCommand('npm audit --json');
  
  if (result.error) {
    console.error('❌ Erreur lors de la vérification des vulnérabilités:');
    console.error(result.stderr);
    return null;
  }
  
  try {
    const auditData = JSON.parse(result);
    
    // Sauvegarder le rapport complet
    fs.writeFileSync(DEPENDENCY_REPORT_PATH, JSON.stringify(auditData, null, 2));
    
    // Log dans le fichier d'audit
    const logEntry = `
=== Audit de sécurité - ${new Date().toISOString()} ===
`;
    fs.appendFileSync(AUDIT_LOG_PATH, logEntry);
    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(auditData, null, 2));
    
    // Afficher un résumé
    console.log('✅ Audit terminé. Résumé:');
    console.log(`- Vulnérabilités critiques: ${auditData.metadata.vulnerabilities.critical || 0}`);
    console.log(`- Vulnérabilités élevées: ${auditData.metadata.vulnerabilities.high || 0}`);
    console.log(`- Vulnérabilités modérées: ${auditData.metadata.vulnerabilities.moderate || 0}`);
    console.log(`- Vulnérabilités faibles: ${auditData.metadata.vulnerabilities.low || 0}`);
    console.log(`
📄 Rapport complet sauvegardé dans: ${DEPENDENCY_REPORT_PATH}`);
    console.log(`📄 Journal d'audit mis à jour: ${AUDIT_LOG_PATH}`);
    
    return auditData;
  } catch (parseError) {
    console.error('❌ Erreur lors du traitement du rapport d\'audit:', parseError);
    return null;
  }
}

/**
 * Mettre à jour les dépendances de manière sécurisée
 */
function updateDependencies(safeOnly = true) {
  console.log('🔄 Mise à jour des dépendances...');
  
  let command = 'npm update';
  if (safeOnly) {
    console.log('🔒 Mode sécurisé: mises à jour mineures et patches uniquement');
    command = 'npm update --save --save-exact';
  } else {
    console.log('⚠️  Mode complet: inclut les mises à jour majeures (peut introduire des changements cassants)');
  }
  
  const result = runCommand(command);
  
  if (result.error) {
    console.error('❌ Erreur lors de la mise à jour des dépendances:');
    console.error(result.stderr);
    return false;
  }
  
  console.log('✅ Mises à jour terminées:');
  console.log(result);
  
  // Vérifier à nouveau les vulnérabilités après la mise à jour
  console.log('\n🔍 Vérification des vulnérabilités après mise à jour...');
  return checkVulnerabilities();
}

/**
 * Lister les dépendances obsolètes
 */
function listOutdatedDependencies() {
  console.log('📋 Liste des dépendances obsolètes...');
  
  const result = runCommand('npm outdated --json');
  
  if (result.error) {
    console.error('❌ Erreur lors de la vérification des dépendances obsolètes:');
    console.error(result.stderr);
    return null;
  }
  
  try {
    const outdatedData = JSON.parse(result);
    
    if (Object.keys(outdatedData).length === 0) {
      console.log('✅ Toutes les dépendances sont à jour !');
      return {};
    }
    
    console.log('⚠️  Dépendances obsolètes trouvées:');
    for (const [dep, info] of Object.entries(outdatedData)) {
      console.log(`- ${dep}: ${info.current} → ${info.wanted} (dernière: ${info.latest})`);
    }
    
    return outdatedData;
  } catch (parseError) {
    console.error('❌ Erreur lors du traitement des dépendances obsolètes:', parseError);
    return null;
  }
}

/**
 * Générer un rapport de sécurité complet
 */
function generateSecurityReport() {
  console.log('📊 Génération du rapport de sécurité complet...');
  
  const report = {
    timestamp: new Date().toISOString(),
    dependencies: {},
    vulnerabilities: {},
    recommendations: []
  };
  
  // Lire le package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    report.dependencies = {
      production: packageJson.dependencies || {},
      development: packageJson.devDependencies || {}
    };
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du package.json:', error);
    return null;
  }
  
  // Vérifier les vulnérabilités
  const vulnerabilities = checkVulnerabilities();
  if (vulnerabilities) {
    report.vulnerabilities = vulnerabilities.metadata.vulnerabilities;
    
    // Générer des recommandations
    if (vulnerabilities.metadata.vulnerabilities.moderate > 0 ||
        vulnerabilities.metadata.vulnerabilities.high > 0 ||
        vulnerabilities.metadata.vulnerabilities.critical > 0) {
      
      report.recommendations.push(
        'Exécuter `npm audit fix` pour corriger les vulnérabilités automatiquement'
      );
      
      if (vulnerabilities.metadata.vulnerabilities.critical > 0) {
        report.recommendations.push(
          'Corriger immédiatement les vulnérabilités critiques'
        );
      }
    }
  }
  
  // Vérifier les dépendances obsolètes
  const outdated = listOutdatedDependencies();
  if (outdated && Object.keys(outdated).length > 0) {
    report.outdatedDependencies = outdated;
    report.recommendations.push(
      'Mettre à jour les dépendances obsolètes avec `npm update`'
    );
  }
  
  // Sauvegarder le rapport
  const reportPath = path.join(__dirname, '..', 'security-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ Rapport de sécurité généré: ${reportPath}`);
  return report;
}

/**
 * Configurer la surveillance continue
 */
function setupContinuousMonitoring() {
  console.log('🛡️  Configuration de la surveillance continue...');
  
  // Créer un fichier de configuration pour GitHub Actions ou autres CI
  const ciConfig = {
    name: 'Dependency Security Scan',
    on: {
      schedule: [
        { cron: '0 0 * * 0' } // Tous les dimanches à minuit
      ],
      push: {
        branches: ['main', 'develop']
      }
    },
    jobs: {
      security_scan: {
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4'
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              node_version: '20'
            }
          },
          {
            name: 'Install dependencies',
            run: 'npm ci'
          },
          {
            name: 'Run security audit',
            run: 'npm audit'
          },
          {
            name: 'Check for outdated dependencies',
            run: 'npm outdated'
          },
          {
            name: 'Generate security report',
            run: 'node scripts/dependency-management.mjs generate'
          },
          {
            name: 'Upload security report',
            uses: 'actions/upload-artifact@v3',
            with: {
              name: 'security-report',
              path: 'security-report.json'
            }
          }
        ]
      }
    }
  };
  
  const ciConfigPath = path.join(__dirname, '..', '.github', 'workflows', 'security-scan.yml');
  
  try {
    // Créer le répertoire si nécessaire
    const dir = path.dirname(ciConfigPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Écrire la configuration
    fs.writeFileSync(ciConfigPath, yaml.dump(ciConfig));
    console.log(`✅ Configuration CI/CD créée: ${ciConfigPath}`);
    
    // Créer un script package.json pour faciliter l'exécution
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    packageJson.scripts['security:audit'] = 'node scripts/dependency-management.mjs check';
    packageJson.scripts['security:update'] = 'node scripts/dependency-management.mjs update';
    packageJson.scripts['security:report'] = 'node scripts/dependency-management.mjs generate';
    packageJson.scripts['security:full'] = 'npm run security:audit && npm run security:update && npm run security:report';
    
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
    console.log('✅ Scripts npm ajoutés au package.json');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la configuration de la surveillance continue:', error);
    return false;
  }
}

// Exporter les fonctions pour une utilisation programmatique
export {
  checkVulnerabilities,
  updateDependencies,
  listOutdatedDependencies,
  generateSecurityReport,
  setupContinuousMonitoring
};

// Gestion des arguments en ligne de commande
if (process.argv.length > 2) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      checkVulnerabilities();
      break;
    case 'update':
      updateDependencies(process.argv.includes('--full'));
      break;
    case 'outdated':
      listOutdatedDependencies();
      break;
    case 'generate':
      generateSecurityReport();
      break;
    case 'setup':
      setupContinuousMonitoring();
      break;
    case 'full':
      checkVulnerabilities();
      updateDependencies();
      generateSecurityReport();
      break;
    default:
      console.log('Commandes disponibles:');
      console.log('  check       - Vérifier les vulnérabilités');
      console.log('  update      - Mettre à jour les dépendances (mode sécurisé par défaut)');
      console.log('  update --full - Mettre à jour toutes les dépendances (y compris majeures)');
      console.log('  outdated    - Lister les dépendances obsolètes');
      console.log('  generate    - Générer un rapport de sécurité complet');
      console.log('  setup       - Configurer la surveillance continue');
      console.log('  full        - Exécuter toutes les vérifications et mises à jour');
  }
} else {
  console.log('Utilisation: node scripts/dependency-management.mjs <command>');
  console.log('Exécutez sans arguments pour voir les commandes disponibles.');
}