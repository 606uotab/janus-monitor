# 📂 Intégrations de Cryptomonnaies

Ce dossier contient l'implémentation modulaire des intégrations de cryptomonnaies, organisée par **famille** plutôt que par cryptomonnaie individuelle.

## 🗂️ Structure

```
integrations/
├── utxo-coins.js        # Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, Dash
├── evm-coins.js         # Ethereum, Ethereum Classic, Binance Smart Chain, Polygon
├── privacy-coins.js     # Monero, PIVX, Zcash
├── stablecoins.js       # USDT, USDC, DAI, PAXG, WBTC
├── index.js             # Point d'entrée unifié et fonctions génériques
└── README.md            # Ce fichier
```

## 🎯 Philosophie

**Un fichier par famille** plutôt que par cryptomonnaie pour :
- ✅ Moins de fichiers à gérer
- ✅ Code commun partagé naturellement
- ✅ Meilleure organisation logique
- ✅ Extensibilité simplifiée

## 📋 Familles Supportées

### 1. UTXO Coins (`utxo-coins.js`)
Cryptomonnaies basées sur le modèle **Unspent Transaction Output**
- Bitcoin (BTC)
- Bitcoin Cash (BCH) 🎯
- Litecoin (LTC)
- Dogecoin (DOGE)
- Dash (DASH)

**Caractéristiques** : Adresses similaires, même logique de transaction, frais estimables

### 2. EVM Coins (`evm-coins.js`)
Cryptomonnaies basées sur **Ethereum Virtual Machine**
- Ethereum (ETH)
- Ethereum Classic (ETC)
- Binance Smart Chain (BNB)
- Polygon (MATIC)

**Caractéristiques** : Adresses 0x..., smart contracts, gaz, tokens ERC-20/BEP-20

### 3. Privacy Coins (`privacy-coins.js`)
Cryptomonnaies axées sur **l'anonymat**
- Monero (XMR) - RingCT
- PIVX (PIVX) - Zerocoin
- Zcash (ZEC) - zk-SNARKs

**Caractéristiques** : Adresses uniques, clés de vue, transactions privées

### 4. Stablecoins (`stablecoins.js`)
Cryptomonnaies **adossées à des actifs**
- Tether (USDT)
- USD Coin (USDC)
- Dai (DAI)
- PAX Gold (PAXG) - 1 once d'or
- Wrapped Bitcoin (WBTC)

**Caractéristiques** : Valeur stable, contrats ERC-20, asset-backed

## 🚀 Utilisation

### Import Unifié
```javascript
// Tout importer depuis l'index
import {
  getCoinInfo,
  getBalance,
  validateAddress,
  COIN_FAMILIES,
  getFamilyFunctions
} from './integrations';
```

### Exemples Rapides

#### Valider une adresse
```javascript
import { validateAddress } from './integrations';

// Works for ALL coins!
validateAddress('BTC', '1A1zP1...');  // true/false
validateAddress('ETH', '0x742d...');  // true/false
validateAddress('XMR', '4A5M...');   // true/false
```

#### Récupérer un solde
```javascript
import { getBalance } from './integrations';

// Works for ALL coins!
const btcBalance = await getBalance('BTC', '1A1zP1...');
const ethBalance = await getBalance('ETH', '0x742d...');
const xmrBalance = await getBalance('XMR', '4A5M...', { viewKey: '...' });
```

#### Accéder à une famille spécifique
```javascript
import { getFamilyFunctions, COIN_FAMILIES } from './integrations';

const utxo = getFamilyFunctions(COIN_FAMILIES.UTXO);
utxo.getBalance('BTC', '1A1zP1...');
utxo.validate('1A1zP1...', 'BTC');
```

## 🔧 Ajouter une Nouvelle Cryptomonnaie

### Étapes pour ajouter un coin UTXO (ex: Bitcoin SV)

1. **Éditer `utxo-coins.js`** :
   ```javascript
   // Ajouter dans UTXO_COINS
   BSV: {
     name: 'Bitcoin SV',
     symbol: 'BSV',
     decimals: 8,
     explorer: 'https://blockchair.com/bitcoin-sv',
     rpcPort: 8332
   }
   
   // Ajouter dans les patterns de validation
   BSV: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
   
   // Ajouter dans getDefaultNode
   BSV: 'https://bch-sv.api.btc.com'
   ```

2. **Ajouter dans le backend Tauri** :
   - Créer la commande `get_bsv_balance`
   - L'enregistrer dans `src-tauri/src/lib.rs`

3. **Utilisation immédiate** :
   ```javascript
   // Déjà disponible!
   const bsvBalance = await getBalance('BSV', '1A1zP1...');
   ```

## 📚 Documentation Complète

Voir [INTEGRATIONS_ARCHITECTURE.md](../INTEGRATIONS_ARCHITECTURE.md) pour :
- Architecture détaillée
- Diagrammes
- Exemples avancés
- Bonnes pratiques

## 🎯 Pourquoi cette Architecture ?

1. **Moins de fichiers** : 4 fichiers famille vs 20+ fichiers individuels
2. **Code partagé** : Logique commune dans chaque famille
3. **Meilleure organisation** : Groupement logique des cryptos similaires
4. **Extensible** : Ajout facile de nouvelles cryptos
5. **Maintenable** : Modifications localisées

## 🔒 Sécurité

- ✅ Toutes les clés restent dans le backend Rust
- ✅ Validation stricte des adresses
- ✅ Masquage des données sensibles
- ✅ Gestion sécurisée des erreurs

## 🚀 Prochaines Améliorations

- [ ] Ajouter le support de Cardano (famille propre ?)
- [ ] Ajouter le support de Solana (famille propre ?)
- [ ] Optimiser les appels backend
- [ ] Ajouter le caching des données

---

**Note** : Cette architecture est conçue pour évoluer. Lorsque de nouvelles familles émergent (ex: Proof-of-Stake spécifiques), il sera facile de créer un nouveau fichier famille.