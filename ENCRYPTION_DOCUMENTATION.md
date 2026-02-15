# 🔐 Système de Chiffrement JANUS - Documentation

## 📋 Table des Matières
- [🔐 Système de Chiffrement JANUS - Documentation](#🔐-système-de-chiffrement-janus---documentation)
- [📋 Table des Matières](#📋-table-des-matières)
- [🎯 Introduction](#🎯-introduction)
- [🔒 Architecture de Sécurité](#🔒-architecture-de-sécurité)
- [🛠️ Composants Techniques](#🛠️-composants-techniques)
- [📦 API de Chiffrement](#📦-api-de-chiffrement)
- [🚀 Utilisation du Système](#🚀-utilisation-du-système)
- [🔧 Configuration Avancée](#🔧-configuration-avancée)
- [📊 Exemples de Code](#📊-exemples-de-code)
- [⚠️ Bonnes Pratiques de Sécurité](#⚠️-bonnes-pratiques-de-sécurité)
- [🔬 Tests et Vérification](#🔬-tests-et-vérification)
- [📚 Références Techniques](#📚-références-techniques)

## 🎯 Introduction

Le système de chiffrement JANUS offre une protection avancée pour les données sensibles de votre portefeuille crypto. Il utilise des algorithmes de chiffrement modernes pour sécuriser les adresses de wallet et autres informations confidentielles.

**Fonctionnalités clés :**
- Chiffrement AES-GCM (Authenticated Encryption with Associated Data)
- Dérivation de clés Argon2 (résistant aux attaques par force brute)
- Gestion sécurisée des sels uniques par wallet
- Intégration transparente avec le système existant
- Activation progressive (opt-in)

## 🔒 Architecture de Sécurité

### 🔐 Modèle de Chiffrement

```
PIN Utilisateur + Sel Unique → Argon2 → Clé de Chiffrement → AES-GCM → Données Chiffrées
```

### 🔑 Gestion des Clés

1. **Dérivation de clé** : Utilise Argon2 avec les paramètres suivants :
   - Mémoire : 192 Mo (par défaut)
   - Itérations : 3
   - Parallélisme : 4
   - Sortie : 32 bytes (clé AES-256)

2. **Sels uniques** : Chaque wallet a son propre sel aléatoire de 16 bytes

3. **Stockage sécurisé** : Seuls les données chiffrées et les sels sont stockés

### 🛡️ Niveaux de Protection

| Niveau | Méthode | Description |
|--------|---------|-------------|
| 1 | Chiffrement AES-GCM | Protège les données au repos |
| 2 | Sel unique par wallet | Empêche les attaques par rainbow table |
| 3 | Argon2 key derivation | Ralentit les attaques par force brute |
| 4 | Nonces uniques | Empêche la réutilisation des clés |
| 5 | Authentification intégrée | Détecte les altérations des données |

## 🛠️ Composants Techniques

### Backend (Rust)

**Dépendances principales :**
- `sodiumoxide` 0.2 - Implémentation Rust de libsodium
- `argon2` 0.5 - Dérivation de clés sécurisée
- `hex` 0.4 - Encodage hexadécimal

**Structures de données :**

```rust
// Wallet standard (peut être chiffré ou non)
pub struct Wallet {
    pub id: i64,
    pub category_id: i64,
    pub asset: String,
    pub name: String,
    pub address: String,  // Peut être en clair ou chiffré
    pub balance: Option<f64>,
    pub encrypted: bool,         // Indique si chiffré
    pub encryption_salt: Option<String>, // Sel pour la dérivation
}

// Wallet explicitement chiffré
pub struct EncryptedWallet {
    pub id: i64,
    pub category_id: i64,
    pub asset: String,
    pub name: String,
    pub encrypted_address: String, // Toujours chiffré
    pub balance: Option<f64>,
    pub encrypted: bool,
    pub encryption_salt: String,   // Toujours présent
}
```

### Frontend (React)

**État principal :**
- `encryptionEnabled`: booléen pour activer/désactiver
- `encryptionSalt`: chaîne hexadécimale du sel actuel
- `testEncryptionResult`: résultats des tests de chiffrement

## 📦 API de Chiffrement

### Commandes Tauri Disponibles

#### Initialisation
```javascript
await invoke('init_encryption_system')
// Initialise le système de chiffrement (libsodium)
```

#### Gestion des Sels
```javascript
const salt = await invoke('generate_new_salt')
// Génère un nouveau sel aléatoire (hex encoded)
```

#### Dérivation de Clé
```javascript
const keyHex = await invoke('derive_encryption_key', {
    pin: 'votre_pin_ici',
    salt: 'votre_sel_ici'
})
// Dérive une clé de chiffrement à partir du PIN + sel
```

#### Chiffrement/Déchiffrement Générique
```javascript
// Chiffrer
const encrypted = await invoke('encrypt_sensitive_data', {
    data: 'données_sensibles',
    keyHex: 'clé_hex',
    salt: 'sel_hex'
})

// Déchiffrer
const decrypted = await invoke('decrypt_sensitive_data', {
    encryptedData: 'données_chiffrées',
    keyHex: 'clé_hex'
})
```

#### Chiffrement de Wallets
```javascript
// Chiffrer un wallet
const encryptedWallet = await invoke('encrypt_wallet_data', {
    wallet: { id: 1, category_id: 1, asset: 'BTC', name: 'Mon Wallet', address: 'bc1q...', balance: 0.1 },
    pin: 'votre_pin'
})

// Déchiffrer un wallet
const decryptedWallet = await invoke('decrypt_wallet_data', {
    encryptedWallet: encryptedWallet,
    pin: 'votre_pin'
})

// Vérifier si un wallet est chiffré
const isEncrypted = await invoke('is_wallet_encrypted_data', {
    wallet: yourWallet
})
```

## 🚀 Utilisation du Système

### Guide Utilisateur

1. **Accéder aux paramètres** : Cliquez sur ⚙ dans le menu principal

2. **Faire défiler jusqu'à la section Chiffrement** : 🔐 Chiffrement des données

3. **Initialiser le système** : Cliquez sur "⚡ Initialiser"

4. **Générer un sel** : Cliquez sur 🎲 pour créer un sel aléatoire

5. **Tester le chiffrement** : Cliquez sur "🔐 Tester le chiffrement"

6. **Vérifier les résultats** : Vous devriez voir "✅ Chiffrement fonctionnel !"

### Guide Développeur

#### Activer le chiffrement pour un wallet

```javascript
async function encryptWallet(wallet, pin) {
    try {
        // 1. Générer un sel si nécessaire
        const salt = wallet.encryption_salt || await invoke('generate_new_salt')
        
        // 2. Chiffrer le wallet
        const encryptedWallet = await invoke('encrypt_wallet_data', {
            wallet,
            pin
        })
        
        // 3. Sauvegarder le wallet chiffré
        // (implémentation spécifique à votre système de stockage)
        
        return encryptedWallet
    } catch (error) {
        console.error('Erreur de chiffrement:', error)
        throw error
    }
}
```

#### Déchiffrer un wallet

```javascript
async function decryptWallet(encryptedWallet, pin) {
    try {
        const decryptedWallet = await invoke('decrypt_wallet_data', {
            encryptedWallet,
            pin
        })
        return decryptedWallet
    } catch (error) {
        console.error('Erreur de déchiffrement:', error)
        // Gérer l'erreur (mauvais PIN, données corrompues, etc.)
        throw error
    }
}
```

## 🔧 Configuration Avancée

### Personnalisation des Paramètres

**Paramètres Argon2 (dans le code Rust) :**

```rust
// Dans derive_key_from_pin()
let argon2 = Argon2::default(); // Utilise les paramètres par défaut

// Pour des paramètres personnalisés :
let argon2 = Argon2::new(
    argon2::Algorithm::Argon2id, // Meilleur pour le chiffrement de mots de passe
    argon2::Version::V0x13,      // Version la plus récente
    argon2::Params::new(
        192 * 1024,  // m_cost (mémoire en KiB)
        3,           // t_cost (itérations)
        4,           // p_cost (parallélisme)
        Some(32)     // longueur de sortie
    ).unwrap()
);
```

### Intégration avec la Base de Données

Pour stocker les wallets chiffrés dans SQLite :

```rust
// 1. Ajouter des colonnes à la table wallets :
// ALTER TABLE wallets ADD COLUMN encrypted BOOLEAN DEFAULT 0;
// ALTER TABLE wallets ADD COLUMN encryption_salt TEXT;
// ALTER TABLE wallets ADD COLUMN encrypted_address TEXT;

// 2. Modifier les fonctions de sauvegarde/lecture pour gérer le chiffrement
```

## 📊 Exemples de Code

### Exemple 1 : Chiffrement complet d'un profil

```javascript
async function encryptAllWallets(wallets, pin) {
    const encryptedWallets = []
    
    for (const wallet of wallets) {
        try {
            const encrypted = await invoke('encrypt_wallet_data', {
                wallet,
                pin
            })
            encryptedWallets.push(encrypted)
        } catch (error) {
            console.error(`Échec du chiffrement du wallet ${wallet.id}:`, error)
            // Continuer avec les autres wallets
        }
    }
    
    return encryptedWallets
}
```

### Exemple 2 : Vérification de l'intégrité

```javascript
async function verifyEncryptionIntegrity(encryptedWallet, pin) {
    try {
        const decrypted = await invoke('decrypt_wallet_data', {
            encryptedWallet,
            pin
        })
        
        // Vérifier que le déchiffrement a fonctionné
        if (decrypted.address && decrypted.address.length > 0) {
            return {
                valid: true,
                wallet: decrypted
            }
        } else {
            return {
                valid: false,
                error: 'Adresse invalide après déchiffrement'
            }
        }
    } catch (error) {
        return {
            valid: false,
            error: error.toString()
        }
    }
}
```

## ⚠️ Bonnes Pratiques de Sécurité

### Pour les Utilisateurs

1. **Utilisez un PIN fort** : Minimum 8 caractères, mélange de lettres, chiffres et symboles
2. **Ne partagez jamais votre PIN** : Il est la clé de tous vos wallets chiffrés
3. **Sauvegardez votre sel** : Sans le sel, les données ne peuvent pas être déchiffrées
4. **Testez avant d'activer** : Vérifiez que le chiffrement fonctionne avant de l'utiliser en production
5. **Faites des sauvegardes** : Exportez vos wallets avant d'activer le chiffrement

### Pour les Développeurs

1. **Ne jamais logger les données sensibles** : Pas de `console.log()` pour les PINs, clés ou adresses
2. **Utiliser toujours des sels uniques** : Un sel par wallet, jamais réutilisé
3. **Valider toutes les entrées** : Vérifier les données avant chiffrement/déchiffrement
4. **Gérer les erreurs gracieusement** : Ne pas exposer d'informations sur les échecs de déchiffrement
5. **Nettoyer la mémoire** : Écrasez les clés en mémoire après utilisation

### Gestion des Erreurs

**Erreurs courantes et solutions :**

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Invalid key size" | Clé hexadécimale invalide | Vérifier la taille (64 caractères pour AES-256) |
| "Decryption failed" | Mauvais PIN ou données corrompues | Vérifier le PIN et réessayer |
| "Invalid nonce" | Données chiffrées corrompues | Rechiffrer les données |
| "Hex decode error" | Format hexadécimal invalide | Vérifier l'encodage des données |

## 🔬 Tests et Vérification

### Tests Unitaires (Rust)

```rust
#[test]
fn test_encryption_roundtrip() {
    init_crypto();
    
    let test_data = "bc1qtestaddress1234567890";
    let pin = "testpin123";
    let salt = generate_salt();
    
    let key = derive_key_from_pin(pin, &salt).unwrap();
    let encrypted = encrypt_data(test_data, &key).unwrap();
    let decrypted = decrypt_data(&encrypted, &key).unwrap();
    
    assert_eq!(test_data, decrypted);
}

#[test]
fn test_wrong_pin_fails() {
    init_crypto();
    
    let test_data = "test data";
    let correct_pin = "correctpin";
    let wrong_pin = "wrongpin";
    let salt = generate_salt();
    
    let correct_key = derive_key_from_pin(correct_pin, &salt).unwrap();
    let wrong_key = derive_key_from_pin(wrong_pin, &salt).unwrap();
    
    let encrypted = encrypt_data(test_data, &correct_key).unwrap();
    let result = decrypt_data(&encrypted, &wrong_key);
    
    assert!(result.is_err()); // Should fail with wrong PIN
}
```

### Tests d'Intégration (Frontend)

```javascript
async function testFullEncryptionCycle() {
    // 1. Initialiser
    await invoke('init_encryption_system')
    
    // 2. Générer un sel
    const salt = await invoke('generate_new_salt')
    
    // 3. Créer un wallet de test
    const testWallet = {
        id: 1,
        category_id: 1,
        asset: 'BTC',
        name: 'Test Wallet',
        address: 'bc1qtestaddress1234567890',
        balance: 0.1,
        encrypted: false,
        encryption_salt: null
    }
    
    // 4. Chiffrer le wallet
    const encrypted = await invoke('encrypt_wallet_data', {
        wallet: testWallet,
        pin: 'testpin'
    })
    
    // 5. Déchiffrer le wallet
    const decrypted = await invoke('decrypt_wallet_data', {
        encryptedWallet: encrypted,
        pin: 'testpin'
    })
    
    // 6. Vérifier
    console.assert(decrypted.address === testWallet.address, 'Chiffrement échoué')
    console.assert(decrypted.encrypted === true, 'Wallet devrait être marqué comme chiffré')
    console.assert(decrypted.encryption_salt === encrypted.encryption_salt, 'Sel devrait être préservé')
    
    return { success: true, encrypted, decrypted }
}
```

## 📚 Références Techniques

### Algorithmes Utilisés

1. **AES-GCM** (Advanced Encryption Standard - Galois/Counter Mode)
   - Standard : NIST SP 800-38D
   - Taille de clé : 256 bits
   - Taille de nonce : 24 bytes (192 bits)
   - Authentification : Tag de 16 bytes

2. **Argon2id**
   - Vainqueur du Password Hashing Competition (2015)
   - Résistant aux attaques par GPU/ASIC
   - Combinaison de Argon2i et Argon2d

3. **libsodium**
   - Bibliothèque crypto moderne et sécurisée
   - Utilisée par Signal, WireGuard, etc.
   - Auditée et testée en production

### Ressources Externes

- [Documentation libsodium](https://doc.libsodium.org/)
- [Spécification Argon2](https://github.com/P-H-C/phc-winner-argon2)
- [NIST AES Standard](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [RustCrypto](https://github.com/RustCrypto)

### Benchmarks de Performance

**Sur un CPU moderne (approximatif) :**
- Dérivation de clé Argon2 : ~500ms (paramètres par défaut)
- Chiffrement AES-GCM : ~0.1ms par wallet
- Déchiffrement AES-GCM : ~0.1ms par wallet
- Initialisation : ~10ms (une seule fois)

**Consommation mémoire :**
- Argon2 : ~192 Mo par dérivation (configurable)
- AES-GCM : ~few Ko par opération

---

📅 **Dernière mise à jour** : 14 février 2026
🔒 **Version** : 1.0.0
📝 **Auteur** : Système JANUS

*"La sécurité n'est pas un produit, mais un processus."* — Bruce Schneier