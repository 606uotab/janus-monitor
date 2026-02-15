# Gestion des Dépendances et Sécurité

Ce document décrit le système de gestion des dépendances et de sécurité mis en place pour Janus Monitor.

## Table des Matières

1. [Vérification des Vulnérabilités](#vérification-des-vulnérabilités)
2. [Mise à Jour des Dépendances](#mise-à-jour-des-dépendances)
3. [Surveillance Continue](#surveillance-continue)
4. [Rapports de Sécurité](#rapports-de-sécurité)
5. [Commandes Disponibles](#commandes-disponibles)
6. [Intégration CI/CD](#intégration-cicd)

## Vérification des Vulnérabilités

### Commande Manuel

```bash
# Vérifier les vulnérabilités des dépendances
npm run security:audit

# Ou directement
node scripts/dependency-management.js check
```

### Ce que fait cette commande:

1. Exécute `npm audit --json` pour obtenir un rapport détaillé
2. Sauvegarde le rapport complet dans `dependency-report.json`
3. Ajoute une entrée dans le journal d'audit `security-audit.log`
4. Affiche un résumé des vulnérabilités trouvées:
   - Critiques
   - Élevées
   - Modérées
   - Faibles

### Exemple de Sortie

```
🔍 Vérification des vulnérabilités des dépendances...
✅ Audit terminé. Résumé:
- Vulnérabilités critiques: 0
- Vulnérabilités élevées: 0
- Vulnérabilités modérées: 2
- Vulnérabilités faibles: 0

📄 Rapport complet sauvegardé dans: dependency-report.json
📄 Journal d'audit mis à jour: security-audit.log
```

## Mise à Jour des Dépendances

### Mise à Jour Sécurisée (Recommandé)

```bash
# Mettre à jour les dépendances avec seulement les mises à jour mineures et patches
npm run security:update

# Ou directement
node scripts/dependency-management.js update
```

Cette commande:
- Met à jour uniquement les versions mineures et patches (pas de changements cassants)
- Vérifie à nouveau les vulnérabilités après la mise à jour
- Sauvegarde les rapports mis à jour

### Mise à Jour Complète

⚠️ **Attention**: Cette commande peut introduire des changements cassants

```bash
# Mettre à jour toutes les dépendances y compris les versions majeures
node scripts/dependency-management.js update --full
```

## Surveillance Continue

### Configuration

```bash
# Configurer la surveillance continue (CI/CD et scripts npm)
node scripts/dependency-management.js setup
```

Cette commande:
1. Crée un workflow GitHub Actions pour des scans de sécurité réguliers
2. Ajoute des scripts utiles au `package.json`:
   - `security:audit` - Vérifier les vulnérabilités
   - `security:update` - Mettre à jour les dépendances
   - `security:report` - Générer un rapport complet
   - `security:full` - Exécuter toutes les vérifications

### Workflow CI/CD Créé

Le workflow `.github/workflows/security-scan.yml` est configuré pour:
- S'exécuter tous les dimanches à minuit
- S'exécuter à chaque push sur les branches `main` et `develop`
- Exécuter un audit de sécurité complet
- Vérifier les dépendances obsolètes
- Générer et sauvegarder un rapport de sécurité

## Rapports de Sécurité

### Générer un Rapport Complet

```bash
# Générer un rapport de sécurité complet
npm run security:report

# Ou directement
node scripts/dependency-management.js generate
```

### Contenu du Rapport

Le rapport `security-report.json` contient:
- Horodatage de génération
- Liste complète des dépendances (production et développement)
- Statistiques des vulnérabilités
- Liste des dépendances obsolètes
- Recommandations de sécurité

### Exemple de Rapport

```json
{
  "timestamp": "2024-06-20T12:00:00.000Z",
  "dependencies": {
    "production": {
      "@tauri-apps/api": "^2.0.0",
      "axios": "^1.6.7",
      "qrcode.react": "^4.2.0",
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    },
    "development": {
      "@tauri-apps/cli": "^2.0.0",
      "@vitejs/plugin-react": "^4.2.1",
      "autoprefixer": "^10.4.18",
      "js-yaml": "^4.1.0",
      "postcss": "^8.4.35",
      "tailwindcss": "^3.4.1",
      "vite": "^5.1.4"
    }
  },
  "vulnerabilities": {
    "critical": 0,
    "high": 0,
    "moderate": 2,
    "low": 0,
    "info": 0
  },
  "recommendations": [
    "Exécuter `npm audit fix` pour corriger les vulnérabilités automatiquement"
  ]
}
```

## Commandes Disponibles

| Commande | Description |
|----------|-------------|
| `check` | Vérifier les vulnérabilités des dépendances |
| `update` | Mettre à jour les dépendances (mode sécurisé) |
| `update --full` | Mettre à jour toutes les dépendances (y compris majeures) |
| `outdated` | Lister les dépendances obsolètes |
| `generate` | Générer un rapport de sécurité complet |
| `setup` | Configurer la surveillance continue |
| `full` | Exécuter toutes les vérifications et mises à jour |

### Utilisation via npm

Après avoir exécuté `setup`, vous pouvez utiliser ces commandes via npm:

```bash
npm run security:audit    # Vérifier les vulnérabilités
npm run security:update   # Mettre à jour les dépendances
npm run security:report   # Générer un rapport
npm run security:full     # Tout exécuter
```

## Intégration CI/CD

### Workflow GitHub Actions

Le workflow `.github/workflows/security-scan.yml` est automatiquement créé par la commande `setup`. Il:

1. **S'exécute régulièrement**: Tous les dimanches à minuit
2. **S'exécute sur les pushes**: Sur les branches `main` et `develop`
3. **Effectue les tâches suivantes**:
   - Installe les dépendances
   - Exécute un audit de sécurité
   - Vérifie les dépendances obsolètes
   - Génère un rapport de sécurité
   - Sauvegarde le rapport comme artefact

### Exemple de Workflow

```yaml
name: Dependency Security Scan
on:
  schedule:
    - cron: '0 0 * * 0'  # Tous les dimanches à minuit
  push:
    branches: ['main', 'develop']

jobs:
  security_scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node_version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run security audit
        run: npm audit
      
      - name: Check for outdated dependencies
        run: npm outdated
      
      - name: Generate security report
        run: node scripts/dependency-management.js generate
      
      - name: Upload security report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-report.json
```

## Bonnes Pratiques

### 1. Exécuter Régulièrement les Vérifications

```bash
# Vérifier les vulnérabilités hebdomadairement
npm run security:audit

# Mettre à jour les dépendances mensuellement
npm run security:update

# Générer un rapport avant chaque release
npm run security:report
```

### 2. Surveiller les Dépendances Critiques

Certaines dépendances sont plus critiques que d'autres:
- `@tauri-apps/api` - Communication avec le backend Tauri
- `axios` - Requêtes HTTP
- `react` et `react-dom` - Core de l'application

### 3. Gérer les Vulnérabilités

Quand une vulnérabilité est détectée:
1. **Évaluer l'impact**: Toutes les vulnérabilités ne sont pas critiques
2. **Vérifier les correctifs**: `npm audit fix` peut souvent corriger automatiquement
3. **Tester les correctifs**: Dans un environnement de staging avant la production
4. **Documenter**: Les décisions de sécurité dans le journal d'audit

### 4. Mises à Jour Majeures

Pour les mises à jour majeures:
1. Lire les notes de release
2. Tester dans un environnement isolé
3. Vérifier la compatibilité avec le code existant
4. Prévoir du temps pour les ajustements nécessaires

## Fichiers Générés

| Fichier | Description |
|---------|-------------|
| `dependency-report.json` | Rapport détaillé de l'audit de sécurité |
| `security-audit.log` | Journal historique des audits de sécurité |
| `security-report.json` | Rapport de sécurité complet généré |
| `.github/workflows/security-scan.yml` | Configuration CI/CD pour la surveillance continue |

## Exemple d'Utilisation Complète

```bash
# 1. Vérifier l'état actuel
npm run security:audit

# 2. Mettre à jour les dépendances en toute sécurité
npm run security:update

# 3. Vérifier à nouveau après la mise à jour
npm run security:audit

# 4. Générer un rapport complet
npm run security:report

# 5. Configurer la surveillance continue (une seule fois)
node scripts/dependency-management.js setup
```

## Résolution des Problèmes

### Erreur: "npm audit fix --force"

Si vous voyez ce message, cela signifie qu'il y a des vulnérabilités qui nécessitent des mises à jour majeures. Nous recommandons:

1. **Ne pas utiliser `--force`** sans comprendre les implications
2. **Évaluer chaque vulnérabilité** individuellement
3. **Planifier les mises à jour** pendant une période de maintenance
4. **Tester complètement** avant de déployer en production

### Dépendances Obsolètes

Si des dépendances sont obsolètes:

```bash
# Voir les dépendances obsolètes
npm run security:outdated

# Mettre à jour les dépendances spécifiques
npm update nom-de-la-dependance

# Ou mettre à jour toutes les dépendances en mode sécurisé
npm run security:update
```

## Conclusion

Ce système de gestion des dépendances et de sécurité permet de:

✅ **Détecter rapidement** les vulnérabilités de sécurité
✅ **Mettre à jour en toute sécurité** les dépendances
✅ **Surveiller continuellement** l'état de sécurité
✅ **Documenter automatiquement** les audits de sécurité
✅ **Intégrer facilement** dans votre processus CI/CD

En suivant ces pratiques, vous maintiendrez votre application Janus Monitor sécurisée et à jour avec un effort minimal.