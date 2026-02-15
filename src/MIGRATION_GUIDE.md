# 📋 Guide de Migration vers la Nouvelle Architecture

## 🚀 Migration du Code Existant

Ce guide explique comment migrer le code existant vers la nouvelle architecture par famille.

## 📁 Fichiers Obsolètes (à remplacer)

### 1. `privateCoinIntegration.js` → **`integrations/privacy-coins.js`**

**Ancien code** :
```javascript
import { validatePivxKeys, preparePivxWalletData } from './privateCoinIntegration';
```

**Nouveau code** :
```javascript
import { validatePivxKeys, preparePivxWalletData, getPrivacyBalance } from './integrations';
```

**Exemple de migration** :

**Avant** :
```javascript
// Validation PIVX
validatePivxKeys(address, rpcUser, rpcPassword, rpcNode);

// Préparation des données
const walletData = preparePivxWalletData(address, { rpcUser, rpcPassword });
```

**Après** :
```javascript
// Même interface, mais importé depuis integrations
validatePivxKeys(address, rpcUser, rpcPassword, rpcNode);

// Préparation des données (améliorée)
const walletData = preparePivxWalletData(address, { rpcUser, rpcPassword });

// Nouveautés disponibles
const balance = await getPrivacyBalance('PIVX', address, walletData);
const config = getPrivacyCoinConfig('PIVX');
```

### 2. `apiClient.js` → **`integrations/` (plusieurs fichiers)**

**Ancien code** :
```javascript
import { validateBtcAddress, getBtcBalance } from './apiClient';
```

**Nouveau code** :
```javascript
import { validateAddress, getBalance } from './integrations';
```

**Exemple de migration** :

**Avant** :
```javascript
// Validation spécifique
validateBtcAddress('1A1zP1...');
validateEthAddress('0x742d...');

// Récupération de solde spécifique
const btcBalance = await getBtcBalance('1A1zP1...');
const ethBalance = await getEthBalance('0x742d...');
```

**Après** :
```javascript
// API unifiée pour toutes les cryptos
validateAddress('BTC', '1A1zP1...');
validateAddress('ETH', '0x742d...');

// Récupération de solde unifiée
const btcBalance = await getBalance('BTC', '1A1zP1...');
const ethBalance = await getBalance('ETH', '0x742d...');
```

### 3. `secureBackend.js` → **Intégré dans Tauri backend**

**Ancien code** :
```javascript
import { secureFetchBalance } from './secureBackend';
```

**Nouveau code** :
```javascript
// Les appels backend sont maintenant gérés directement par les fonctions d'intégration
// qui appellent invoke() directement
import { getBalance } from './integrations';

const balance = await getBalance('BTC', '1A1zP1...');
```

## 🎯 Tableau de Correspondance

| Ancien Fichier/Fonction | Nouveau Fichier/Fonction | Commentaire |
|-------------------------|--------------------------|-------------|
| `privateCoinIntegration.js` | `integrations/privacy-coins.js` | Fonctions Monero/PIVX migrées |
| `validatePivxKeys()` | `validatePivxKeys()` | Même signature |
| `preparePivxWalletData()` | `preparePivxWalletData()` | Améliorée |
| `apiClient.js` | `integrations/` | Remplacé par API unifiée |
| `validateBtcAddress()` | `validateAddress('BTC', ...)` | API unifiée |
| `getBtcBalance()` | `getBalance('BTC', ...)` | API unifiée |
| `secureBackend.js` | Backend Tauri | Intégré dans Rust |

## 📋 Étapes de Migration Recommandées

### 1. Mettre à jour les imports

**Fichier `App.jsx`** :

**Avant** :
```javascript
import {
  validateMoneroKeys,
  prepareMoneroWalletData,
  getMoneroBalance
} from "./privateCoinIntegration";
```

**Après** :
```javascript
import {
  validateAddress,
  preparePivxWalletData,
  getBalance,
  getPrivacyCoinConfig
} from "./integrations";
```

### 2. Remplacer les appels spécifiques

**Avant** :
```javascript
// Validation spécifique pour chaque crypto
if (coin === 'BTC') {
  validateBtcAddress(address);
} else if (coin === 'ETH') {
  validateEthAddress(address);
} else if (coin === 'XMR') {
  validateMoneroKeys(address, viewKey);
}
```

**Après** :
```javascript
// Validation unifiée
validateAddress(coin, address);
// Pour XMR avec viewKey
if (coin === 'XMR') {
  validatePivxKeys(address, null, null, node); // Réutilise la validation existante
}
```

### 3. Mettre à jour la récupération des soldes

**Avant** :
```javascript
let balance;
switch (coin) {
  case 'BTC': balance = await getBtcBalance(address); break;
  case 'ETH': balance = await getEthBalance(address); break;
  case 'XMR': balance = await getMoneroBalance(address, viewKey); break;
  case 'USDT': balance = await getTokenBalance('USDT', address); break;
}
```

**Après** :
```javascript
// API unifiée
const balance = await getBalance(coin, address, {
  viewKey: coin === 'XMR' ? viewKey : undefined,
  network: coin === 'USDT' ? 'ethereum' : undefined
});
```

### 4. Utiliser les nouvelles fonctionnalités

**Configuration centralisée** :
```javascript
// Récupérer la configuration complète
const xmrConfig = getPrivacyCoinConfig('XMR');
const defaultNodes = xmrConfig.defaultNodes;

// Récupérer les noeuds par défaut
const moneroNodes = getMoneroDefaultNodes();
const pivxNodes = getPivxDefaultNodes();
```

**Accès par famille** :
```javascript
import { getFamilyFunctions, COIN_FAMILIES } from './integrations';

const privacy = getFamilyFunctions(COIN_FAMILIES.PRIVACY);
const balance = await privacy.getBalance('XMR', address, { viewKey });
```

## 🔧 Exemple Complet de Migration

### Composant MoneroWallet (Avant)
```javascript
import { validateMoneroKeys, getMoneroBalance } from './privateCoinIntegration';

const MoneroWallet = ({ address, viewKey }) => {
  const [balance, setBalance] = useState(0);
  
  const fetchBalance = async () => {
    try {
      validateMoneroKeys(address, viewKey);
      const result = await getMoneroBalance(address, viewKey);
      setBalance(result);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return <div>Balance: {balance} XMR</div>;
};
```

### Composant MoneroWallet (Après)
```javascript
import { getBalance, validateAddress, getPrivacyCoinConfig } from './integrations';

const MoneroWallet = ({ address, viewKey }) => {
  const [balance, setBalance] = useState(0);
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    // Charger la configuration au montage
    setConfig(getPrivacyCoinConfig('XMR'));
  }, []);
  
  const fetchBalance = async () => {
    try {
      // Validation unifiée
      if (!validateAddress('XMR', address)) {
        throw new Error('Invalid Monero address');
      }
      
      // Récupération de solde unifiée
      const result = await getBalance('XMR', address, { viewKey });
      setBalance(result);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return (
    <div>
      <div>Balance: {balance} XMR</div>
      <div>Network: {config?.type} ({config?.explorer})</div>
    </div>
  );
};
```

## 🎉 Avantages de la Migration

1. **Code plus propre** : Moins d'imports, API unifiée
2. **Meilleure organisation** : Logique groupée par famille
3. **Plus maintenable** : Modifications localisées
4. **Plus extensible** : Ajout facile de nouvelles cryptos
5. **Meilleure documentation** : JSDoc complet

## ⚠️ Points d'Attention

1. **Backend Tauri** : Assurez-vous que toutes les commandes Tauri sont enregistrées
2. **Tests** : Testez chaque cryptomonnaie après migration
3. **Fallback** : Gardez les anciens fichiers en backup pendant la transition
4. **Documentation** : Mettez à jour la documentation des composants

## 📚 Ressources

- **Documentation complète** : [INTEGRATIONS_ARCHITECTURE.md](INTEGRATIONS_ARCHITECTURE.md)
- **API Reference** : Voir les commentaires JSDoc dans chaque fichier
- **Exemples** : Voir les fichiers dans `src/integrations/`

---

**Statut** : Prêt pour la migration progressive 🚀
**Date** : 15 février 2024
**Prochaine étape** : Migrer les composants React un par un