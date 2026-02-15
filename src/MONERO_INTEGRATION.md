# Intégration Monero (XMR) - Janus Monitor

## Aperçu

Cette intégration permet aux utilisateurs de Janus Monitor de configurer leurs wallets Monero avec des clés étendues (view key et spend key) pour:

- **Voir leur balance** en temps réel
- **Scanner la blockchain** pour les transactions entrantes
- **Mettre à jour manuellement** la balance
- **Gérer plusieurs nœuds** Monero

## Architecture de Sécurité

### Principes de sécurité

1. **Aucune clé n'est envoyée à des serveurs distants** - Toutes les opérations sont effectuées localement ou via le backend Rust
2. **Chiffrement local** - Les clés sont stockées chiffrées avec le PIN de l'utilisateur
3. **Isolation des clés** - La view key et spend key ne sont jamais exposées dans le frontend
4. **Validation stricte** - Toutes les clés sont validées avant d'être utilisées

### Flux de données

```
[Interface Utilisateur] → [Backend Rust] → [Nœud Monero]
    ↑                     ↑
[Chiffrement]        [Validation]
```

## Fonctionnalités Implémentées

### 1. Configuration des Clés Étendues

- **View Key** (requise) : Permet de scanner la blockchain pour les transactions
- **Spend Key** (optionnelle) : Nécessaire pour dépenser les fonds (jamais partagée)
- **Sélection de Nœud** : Choix parmi plusieurs nœuds Monero publics

### 2. Récupération de Balance

- Scan de la blockchain à partir de la dernière hauteur connue
- Calcul de la balance totale et disponible
- Mise à jour automatique du wallet

### 3. Interface Utilisateur

- Bouton de configuration spécial pour les wallets Monero
- Indicateur visuel lorsque les clés sont configurées (🔑)
- Bouton de mise à jour manuelle de la balance
- Masquage des clés sensibles dans l'interface

### 4. Tests et Validation

- Validation des adresses Monero (format et longueur)
- Validation des view keys et spend keys (hexadécimal, 64 caractères)
- Tests de connexion aux nœuds
- Tests unitaires complets

## Utilisation

### Configuration d'un Wallet Monero

1. **Créer un wallet Monero** dans Janus Monitor (catégorie → "+" → Monero)
2. **Cliquer sur l'icône 🔑** dans la ligne du wallet
3. **Entrez vos clés étendues** :
   - View Key (requise) : 64 caractères hexadécimaux
   - Spend Key (optionnelle) : 64 caractères hexadécimaux
   - Sélectionnez un nœud Monero
4. **Testez la configuration** avec le bouton "Tester"
5. **Enregistrez** la configuration

### Mise à Jour de la Balance

1. Cliquez sur l'icône 🔄 dans la ligne du wallet Monero
2. Attendez la fin du scan (peut prendre quelques secondes)
3. La balance est automatiquement mise à jour

## Configuration Technique

### Backend Rust (à implémenter)

Le backend doit implémenter les commandes suivantes :

```rust
// Dans src-tauri/src/main.rs ou un module dédié

#[tauri::command]
async fn get_monero_balance(
    address: String,
    view_key: String,
    spend_key: Option<String>,
    node: String,
    min_confirmations: u64,
    scan_batch_size: u64
) -> Result<MoneroBalanceResult, String> {
    // Implémentation utilisant monero-rpc ou une bibliothèque Monero
    // Retourne: balance, unlocked_balance, last_scanned_height, network_height
}

#[tauri::command]
async fn get_monero_transactions(
    address: String,
    view_key: String,
    spend_key: Option<String>,
    node: String,
    limit: u64
) -> Result<MoneroTransactionsResult, String> {
    // Implémentation pour récupérer l'historique des transactions
}

#[tauri::command]
async fn test_monero_node(node: String) -> Result<MoneroNodeInfo, String> {
    // Test de connexion et récupération des infos du nœud
}
```

### Base de Données

Les wallets Monero doivent stocker ces champs supplémentaires :

```sql
-- Ajouter aux tables wallets existantes
ALTER TABLE wallets ADD COLUMN monero_view_key TEXT;
ALTER TABLE wallets ADD COLUMN monero_spend_key TEXT;
ALTER TABLE wallets ADD COLUMN monero_node TEXT DEFAULT 'http://node.monerooutreach.org:18089';
ALTER TABLE wallets ADD COLUMN monero_last_scanned_height INTEGER;
```

## Sécurité Avancée

### Chiffrement des Clés

Les clés Monero doivent être chiffrées avec le même système que les autres données sensibles :

```javascript
// Utiliser le système de chiffrement existant
const encryptedViewKey = await invoke('encrypt_sensitive_data', {
    data: viewKey,
    keyHex: encryptionKey,
    salt: walletEncryptionSalt
});
```

### Bonnes Pratiques

1. **Ne jamais logger les clés** dans les fichiers de log
2. **Effacer la mémoire** après utilisation des clés
3. **Utiliser des timeouts** pour les connexions aux nœuds
4. **Valider toutes les entrées** avant traitement
5. **Limiter les tentatives** de scan pour éviter les abus

## Nœuds Monero Recommandés

- `http://node.monerooutreach.org:18089` (Principal)
- `http://xmr-node.cakewallet.com:18089` (Alternative)
- `http://node.supportxmr.com:18089` (Sauvegarde)

## Limitations Connues

1. **Premier scan long** : Le premier scan de la blockchain peut prendre du temps
2. **Dépendance aux nœuds** : Requiert une connexion à un nœud Monero
3. **Pas de création de wallet** : Se connecte uniquement à des wallets existants
4. **Spend key optionnelle** : Sans spend key, impossible de dépenser (mais possible de voir la balance)

## Roadmap Future

- [ ] Intégration avec Monero Wallet RPC pour plus de fonctionnalités
- [ ] Support pour les sous-adresses Monero
- [ ] Notifications pour les nouvelles transactions entrantes
- [ ] Historique complet des transactions avec détails
- [ ] Export des données Monero au format CSV
- [ ] Intégration avec les hardware wallets (Ledger, Trezor)

## Tests

Exécuter les tests unitaires :

```bash
node test_monero_integration.js
```

Exécuter les tests complets :

```bash
node run_monero_tests.js
```

## Dépannage

### Problèmes Courants

1. **"Nœud Monero inaccessible"** :
   - Vérifier votre connexion Internet
   - Essayer un autre nœud de la liste
   - Le nœud peut être temporairement hors ligne

2. **"Clé invalide"** :
   - Vérifier que la clé fait exactement 64 caractères hexadécimaux
   - Vérifier qu'il n'y a pas d'espaces ou de caractères spéciaux
   - La clé doit être en minuscules

3. **"Balance ne se met pas à jour"** :
   - Attendre plus de confirmations (10 par défaut)
   - Vérifier que l'adresse est correcte
   - Essayer un autre nœud

## Ressources

- [Documentation Monero officielle](https://www.getmonero.org/resources/developer-guides/)
- [Monero StackExchange](https://monero.stackexchange.com/)
- [Monero RPC Documentation](https://www.getmonero.org/resources/developer-guides/daemon-rpc.html)
- [Cake Wallet (exemple d'intégration)](https://cakewallet.com/)

## Licence

Ce code est sous licence MIT. Voir le fichier LICENCE pour plus de détails.

---

*© 2024 Janus Monitor - Extraction 60% • Recapitalisation 40%*