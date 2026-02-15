# 🗂️ Architecture des Intégrations de Cryptomonnaies

## 🎯 Nouvelle Architecture par Famille

L'application utilise maintenant une architecture modulaire organisée par **famille de cryptomonnaies**, ce qui permet une meilleure organisation, réutilisation du code et maintenabilité.

## 📁 Structure des Fichiers

```
src/
├── integrations/
│   ├── utxo-coins.js        # BTC, BCH, LTC, DOGE, DASH
│   ├── evm-coins.js         # ETH, ETC, BNB, MATIC
│   ├── privacy-coins.js     # XMR, PIVX, ZEC
│   ├── stablecoins.js       # USDT, USDC, DAI, PAXG, WBTC
│   └── index.js             # Export centralisé
└── ...
```

## 🔧 Classification des Cryptomonnaies

### 1. Famille UTXO (utxo-coins.js)
**Caractéristiques** : Basées sur le modèle UTXO (Unspent Transaction Output)

| Symbole | Nom          | Décimales | Port RPC | Type       |
|---------|--------------|-----------|----------|------------|
| BTC     | Bitcoin      | 8         | 8332     | UTXO       |
| BCH     | Bitcoin Cash | 8         | 8332     | UTXO       |
| LTC     | Litecoin     | 8         | 9332     | UTXO       |
| DOGE    | Dogecoin     | 8         | 22555    | UTXO       |
| DASH    | Dash         | 8         | 9998     | UTXO       |

**Fonctionnalités** :
- Validation d'adresses spécifique à chaque coin
- Récupération de solde et historique
- Estimation des frais de transaction
- Gestion des noeuds par défaut

### 2. Famille EVM (evm-coins.js)
**Caractéristiques** : Basées sur l'Ethereum Virtual Machine

| Symbole | Nom          | Décimales | Chain ID | Réseau      |
|---------|--------------|-----------|----------|-------------|
| ETH     | Ethereum     | 18        | 1        | ethereum    |
| ETC     | ETH Classic  | 18        | 61       | ethereum-classic |
| BNB     | Binance Coin | 18        | 56       | bsc         |
| MATIC   | Polygon      | 18        | 137      | polygon     |

**Fonctionnalités** :
- Validation d'adresses EVM (format commun)
- Gestion des tokens ERC-20/BEP-20
- Estimation du gaz
- Support multi-réseau

### 3. Famille Privacy (privacy-coins.js)
**Caractéristiques** : Axées sur la confidentialité et l'anonymat

| Symbole | Nom    | Décimales | Type      | Méthode de Privacy   |
|---------|---------|-----------|-----------|----------------------|
| XMR     | Monero  | 12        | Privacy   | RingCT               |
| PIVX    | PIVX    | 8         | Privacy   | Zerocoin             |
| ZEC     | Zcash   | 8         | Privacy   | zk-SNARKs            |

**Fonctionnalités** :
- Validation d'adresses spécifiques
- Gestion des clés privées/view keys
- Support RPC avec authentification
- Masquage des données sensibles

### 4. Famille Stablecoins (stablecoins.js)
**Caractéristiques** : Adossées à des actifs réels

| Symbole | Nom          | Décimales | Type            | Adossé à          |
|---------|--------------|-----------|-----------------|-------------------|
| USDT    | Tether       | 6         | Stablecoin      | USD               |
| USDC    | USD Coin     | 6         | Stablecoin      | USD               |
| DAI     | Dai          | 18        | Stablecoin      | USD               |
| BUSD    | Binance USD  | 18        | Stablecoin      | USD               |
| PAXG    | PAX Gold     | 18        | Commodity-backed| 1 once d'or       |
| WBTC    | Wrapped BTC  | 8         | Asset-backed    | BTC               |

**Fonctionnalités** :
- Gestion des contrats ERC-20
- Récupération des métadonnées
- Formatage des soldes avec conversion
- Support multi-réseau

## 🎯 Utilisation de l'API Unifiée

### Import Centralisé
```javascript
// Import depuis le point d'entrée unique
import {
  getCoinInfo,
  getBalance,
  validateAddress,
  COIN_FAMILIES,
  ALL_COINS
} from './integrations';
```

### Exemples d'Utilisation

#### 1. Récupérer les informations d'une cryptomonnaie
```javascript
const btcInfo = getCoinInfo('BTC');
// {
//   name: 'Bitcoin',
//   symbol: 'BTC',
//   decimals: 8,
//   explorer: 'https://blockstream.info',
//   rpcPort: 8332,
//   family: 'UTXO'
// }
```

#### 2. Valider une adresse
```javascript
const isValidBtc = validateAddress('BTC', '1A1zP1...'); // true/false
const isValidEth = validateAddress('ETH', '0x742d...'); // true/false
```

#### 3. Récupérer un solde (abstraction complète)
```javascript
// UTXO Coin
const btcBalance = await getBalance('BTC', '1A1zP1...', { node: 'custom-node' });

// EVM Coin
const ethBalance = await getBalance('ETH', '0x742d...', { rpcUrl: 'custom-rpc' });

// Privacy Coin
const xmrBalance = await getBalance('XMR', '4A5M...', { viewKey: 'private-view-key' });

// Stablecoin
const usdtBalance = await getBalance('USDT', '0x742d...', { network: 'ethereum' });
```

#### 4. Accéder aux fonctions spécifiques d'une famille
```javascript
import { getFamilyFunctions, COIN_FAMILIES } from './integrations';

const utxoFunctions = getFamilyFunctions(COIN_FAMILIES.UTXO);
// {
//   validate: [Function: validateUTXOAddress],
//   getBalance: [Function: getUTXOBalance],
//   getTransactions: [Function: getUTXOTransactions],
//   estimateFee: [Function: estimateUTXOFee]
// }

const isValid = utxoFunctions.validate('1A1zP1...', 'BTC');
```

## 🔧 Avantages de cette Architecture

### 1. **Modularité**
- Chaque famille dans son propre fichier
- Facile à étendre avec de nouvelles familles
- Code spécifique isolé dans sa famille

### 2. **Réutilisation**
- Logique commune partagée dans chaque famille
- Fonctions génériques dans le fichier index
- Moins de duplication de code

### 3. **Maintenabilité**
- Modifications localisées
- Documentation centralisée
- Tests plus faciles à écrire

### 4. **Extensibilité**
- Ajout simple de nouvelles cryptomonnaies
- Support de nouveaux types de familles
- Intégration facile de nouveaux réseaux

### 5. **Abstraction**
- API unifiée pour toutes les cryptomonnaies
- Pas besoin de connaître les détails d'implémentation
- Changement d'implémentation transparent

## 📋 Exemple d'Ajout d'une Nouvelle Cryptomonnaie

### Ajouter un nouveau coin UTXO (ex: Bitcoin SV)

1. **Ajouter dans `utxo-coins.js`** :
```javascript
// Dans UTXO_COINS
BSV: {
  name: 'Bitcoin SV',
  symbol: 'BSV',
  decimals: 8,
  explorer: 'https://blockchair.com/bitcoin-sv',
  rpcPort: 8332
}

// Dans patterns
BSV: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,

// Dans getDefaultNode
BSV: 'https://bch-sv.api.btc.com'
```

2. **Ajouter dans le backend Tauri** :
- Créer `get_bsv_balance` dans `src-tauri/src/lib.rs`
- Registrer la commande Tauri

3. **Utilisation immédiate** :
```javascript
const bsvBalance = await getBalance('BSV', '1A1zP1...'); // Fonctionne immédiatement!
```

## 🎉 Migration depuis l'Ancienne Architecture

### Ancien Code (à remplacer)
```javascript
// Avant: import depuis des fichiers spécifiques
import { validateMoneroKeys } from './privateCoinIntegration';
import { validateBtcAddress } from './apiClient';
```

### Nouveau Code (recommandé)
```javascript
// Après: import unifié
import { validateAddress, getBalance } from './integrations';

// Utilisation simplifiée
const isValidXMR = validateAddress('XMR', '4A5M...');
const xmrBalance = await getBalance('XMR', '4A5M...', { viewKey: '...' });
```

## 🔒 Considérations de Sécurité

- Toutes les clés sensibles restent dans le backend Rust
- Les fonctions de masquage sont disponibles pour l'UI
- Validation stricte de toutes les adresses
- Gestion sécurisée des erreurs

## 🚀 Prochaines Étapes

1. **Migrer le code existant** vers la nouvelle architecture
2. **Créer des composants React** par famille
3. **Ajouter des tests unitaires** pour chaque famille
4. **Documenter chaque famille** en détail
5. **Optimiser les performances** des appels backend

Cette architecture fournit une base solide et extensible pour supporter un large éventail de cryptomonnaies tout en gardant le code organisé et maintenable!