# Système de Logging Sécurisé - Documentation

## Table des Matières

1. [Aperçu](#aperçu)
2. [Fonctionnalités](#fonctionnalités)
3. [Implémentation](#implémentation)
4. [Utilisation](#utilisation)
5. [Exemples](#exemples)
6. [Sécurité](#sécurité)
7. [Extensibilité](#extensibilité)
8. [Bonnes Pratiques](#bonnes-pratiques)
9. [Limitations](#limitations)

## Aperçu

Le système de logging sécurisé est conçu pour protéger les informations sensibles dans les logs tout en permettant un débogage efficace. Il chiffre les données sensibles avant de les logger et n'affiche que des versions masquées dans les logs en clair.

## Fonctionnalités

### 1. Chiffrement des Données Sensibles
- Utilise l'algorithme XSalsa20-Poly1305 via la bibliothèque sodiumoxide
- Chiffre les adresses de portefeuilles, les soldes et les réponses API
- Stocke les données chiffrées dans les logs

### 2. Masquage des Données
- Adresses : Affiche seulement les 6 premiers et 4 derniers caractères
- Soldes : Affiche seulement les 6 premiers chiffres
- Réponses API : Masque les caractères hexadécimaux et numériques

### 3. Journalisation Structurée
- Format cohérent pour tous les logs sécurisés
- Balises claires pour identifier le type de données
- Séparation des données affichables et des données chiffrées

## Implémentation

### Dépendances

Le système utilise les bibliothèques suivantes :

```toml
sodiumoxide = "0.2"  # Pour le chiffrement
hex = "0.4"          # Pour la sérialisation hexadécimale
lazy_static = "1.4" # Pour l'initialisation statique
```

### Composants Principaux

#### 1. Clé de Chiffrement Statique

```rust
lazy_static! {
    static ref LOG_KEY: secretbox::Key = {
        secretbox::gen_key()
    };
    static ref LOG_NONCE: secretbox::Nonce = {
        secretbox::gen_nonce()
    };
}
```

#### 2. Fonction de Logging Sécurisé de Base

```rust
fn secure_log(message: &str, sensitive_data: &str) {
    let encrypted = secretbox::seal(sensitive_data.as_bytes(), &LOG_NONCE, &LOG_KEY);
    let encrypted_hex = hex::encode(encrypted);
    println!("[SECURE_LOG] {} [ENCRYPTED: {}]", message, encrypted_hex);
}
```

#### 3. Fonctions Spécialisées

- `log_address(tag: &str, address: &str)` : Pour logger les adresses
- `log_balance(tag: &str, balance: f64)` : Pour logger les soldes
- `log_api_response(tag: &str, response: &str, max_length: usize)` : Pour logger les réponses API

## Utilisation

### Logging d'Adresses

```rust
// Avant (non sécurisé)
println!("[BTC] Fetching balance for: '{}'", address);

// Après (sécurisé)
log_address("BTC", &address);
println!("[BTC] Fetching balance");
```

### Logging de Soldes

```rust
// Avant (non sécurisé)
println!("[BTC] Balance: {} BTC", balance);

// Après (sécurisé)
log_balance("BTC", balance);
println!("[BTC] Balance retrieved");
```

### Logging de Réponses API

```rust
// Avant (non sécurisé)
println!("[ETH] API response: {}", response);

// Après (sécurisé)
log_api_response("ETH", &response, 100);
```

## Exemples

### Exemple 1 : Logging d'Adresse Bitcoin

**Avant :**
```
[BTC] Fetching balance for: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
```

**Après :**
```
[SECURE_LOG] [BTC] Address [ENCRYPTED: a1b2c3d4e5f6...]
[BTC] Display address: 1A1zP1...fNa
[BTC] Fetching balance
```

### Exemple 2 : Logging de Solde

**Avant :**
```
[BTC] Blockstream OK: 12345678 sats (3 utxos)
```

**Après :**
```
[SECURE_LOG] [BTC] Balance [ENCRYPTED: 987654...]
[BTC] Display balance: 0.123457
[BTC] Blockstream OK: 3 utxos
```

### Exemple 3 : Logging de Réponse API

**Avant :**
```
[ETH] Etherscan response: {"status":"1","message":"OK","result":"1000000000000000000"}
```

**Après :**
```
[ETH] API response (masked): {"status":"****","message":"**","result":"************"}
[SECURE_LOG] [ETH] Full API response [ENCRYPTED: f7e6d5...]
```

## Sécurité

### Avantages

1. **Protection des Données** : Les informations sensibles ne sont jamais stockées en clair
2. **Conformité** : Meilleure conformité avec les réglementations sur la protection des données
3. **Audit** : Les logs peuvent être partagés en toute sécurité pour le débogage
4. **Débogage** : Les informations masquées permettent toujours un débogage efficace

### Considérations

1. **Gestion des Clés** : La clé de chiffrement est générée statiquement. Dans un environnement de production, envisagez :
   - Stocker la clé dans un keystore sécurisé
   - Rotater les clés périodiquement
   - Utiliser des clés différentes pour différents environnements

2. **Nonce** : Le système utilise actuellement un nonce fixe. Pour une sécurité optimale :
   - Utilisez un nonce unique pour chaque message
   - Stockez le nonce avec le message chiffré pour permettre le déchiffrement

3. **Niveau de Logging** : Envisagez d'implémenter différents niveaux de logging pour différentes sensibilités de données

## Extensibilité

### Ajouter de Nouveaux Types de Données

Pour ajouter un nouveau type de données sensibles :

```rust
fn log_sensitive_data(tag: &str, data_type: &str, data: &str) {
    // Masquage spécifique au type de données
    let display_data = match data_type {
        "email" => mask_email(data),
        "phone" => mask_phone(data),
        "ip" => mask_ip(data),
        _ => "[MASKED]".to_string()
    };
    
    // Logging sécurisé
    secure_log(&format!("[{}] {}", tag, data_type), data);
    println!("[{}] {}: {}", tag, data_type, display_data);
}
```

### Intégration avec des Systèmes de Logging Externes

Le système peut être facilement adapté pour fonctionner avec des bibliothèques de logging comme `log`, `slog` ou `tracing` :

```rust
#[macro_use]
extern crate log;

fn secure_log(message: &str, sensitive_data: &str) {
    let encrypted = secretbox::seal(sensitive_data.as_bytes(), &LOG_NONCE, &LOG_KEY);
    let encrypted_hex = hex::encode(encrypted);
    
    // Utiliser le système de logging standard
    info!("[SECURE_LOG] {} [ENCRYPTED: {}]", message, encrypted_hex);
}
```

## Bonnes Pratiques

### 1. Toujours Utiliser le Logging Sécurisé pour les Données Sensibles

- Adresses de portefeuilles
- Soldes et valeurs financières
- Clés API et tokens
- Informations personnelles (PII)
- Données de transaction

### 2. Éviter de Logger des Données Sensibles en Clair

Même dans les messages de débogage temporaires, utilisez toujours le système sécurisé.

### 3. Documenter les Données Sensibles

Maintenez une liste des types de données considérés comme sensibles et nécessitant un logging sécurisé.

### 4. Revues de Code

Incluez la vérification des pratiques de logging dans vos revues de code de sécurité.

### 5. Tests

Testez régulièrement que :
- Les données sensibles sont correctement chiffrées
- Les données masquées n'exposent pas d'informations sensibles
- Le système de déchiffrement fonctionne correctement

## Limitations

### 1. Déchiffrement des Logs

Le système actuel ne fournit pas de mécanisme intégré pour déchiffrer les logs. Pour déchiffrer :

```rust
fn decrypt_log(encrypted_hex: &str) -> Result<String, String> {
    let encrypted = hex::decode(encrypted_hex)
        .map_err(|e| e.to_string())?;
    
    let decrypted = secretbox::open(&encrypted, &LOG_NONCE, &LOG_KEY)
        .map_err(|e| e.to_string())?;
    
    String::from_utf8(decrypted)
        .map_err(|e| e.to_string())
}
```

### 2. Performances

Le chiffrement/déchiffrement ajoute une légère surcharge. Pour les applications avec des volumes de logs très élevés, envisagez :
- Mettre en cache les résultats chiffrés
- Utiliser un pool de threads pour le chiffrement
- Limiter le chiffrement aux données les plus sensibles

### 3. Compatibilité

Les logs chiffrés ne peuvent être lus que par des systèmes ayant accès à la clé de chiffrement.

## Migration vers le Système Sécurisé

### Étapes de Migration

1. **Identifier** : Trouver tous les messages de log contenant des données sensibles
2. **Catégoriser** : Classer les données par type (adresses, soldes, API, etc.)
3. **Remplacer** : Utiliser les fonctions de logging sécurisé appropriées
4. **Tester** : Vérifier que les logs sont toujours utiles pour le débogage
5. **Documenter** : Mettre à jour la documentation sur les pratiques de logging

### Outils de Migration

Utilisez grep pour trouver les messages de log sensibles :

```bash
# Trouver les logs d'adresses
grep -r "Fetching balance for" src/

# Trouver les logs de soldes
grep -r "OK:.*BTC\|OK:.*ETH" src/

# Trouver les logs de réponses API
grep -r "response:" src/
```

## Conclusion

Le système de logging sécurisé fournit une solution robuste pour protéger les informations sensibles tout en permettant un débogage efficace. En suivant les bonnes pratiques et en étendant le système selon les besoins, vous pouvez maintenir un haut niveau de sécurité tout en conservant la capacité de diagnostiquer les problèmes.

Pour des questions ou des améliorations, veuillez consulter le code source ou ouvrir une issue dans le système de suivi des problèmes.
