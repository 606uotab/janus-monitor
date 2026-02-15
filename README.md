# JANUS Monitor v2.2.1

Application de bureau pour suivre en temps réel un portefeuille crypto selon la stratégie JANUS : **85 % Bitcoin** en réserve de valeur, **15 % diversification** entre hedging et altcoins.

![Tauri](https://img.shields.io/badge/Tauri%202-Rust%20%2B%20React-blue)
![Platform](https://img.shields.io/badge/Platform-Linux%20Debian-orange)
![Version](https://img.shields.io/badge/Version-2.2.1-green)
![Security](https://img.shields.io/badge/Security-Argon2id%20%2B%20libsodium-red)

---

## Fonctionnalités

### Suivi de portefeuille
- Récupération automatique des soldes on-chain pour 30+ cryptomonnaies
- Prix en temps réel via Binance et Bitfinex (XMR, XAUT)
- Calcul dynamique des allocations par catégorie personnalisable
- Affichage en BTC, EUR, USD et once d'or (XAU)
- Terminal de prix Bloomberg-style (`Ctrl+Shift+P`)

### Pending Transactions *(v2.0)*
- Monitoring en temps réel des transactions entrantes
- Suivi des confirmations (0/6 → 6/6 BTC, 0/12 ETH, etc.)
- Notifications sonores et toast persistant
- Panneau latéral avec cards détaillées par wallet
- Liens explorer multi-sites (Blockstream, Mempool, Etherscan, etc.)

### Catégories dynamiques *(v2.0)*
- Création, renommage et suppression de catégories
- Réorganisation par flèches haut/bas
- Barre de recherche de tokens intégrée par catégorie
- Template par défaut JANUS (85/7/5) chargé au premier lancement

### Sécurité *(v2.0 + renforcée v2.2.1)*
- Protection par PIN / mot de passe au démarrage
- Hashage Argon2id (pas de stockage en clair)
- Chiffrement des logs sensibles via libsodium (secretbox)
- Validation stricte de toutes les entrées (adresses, noms, profils)
- Verrouillage automatique après inactivité configurable
- Démarrage sécurisé : profil `default_template` vierge (thème sombre, aucun wallet chargé)
- Le thème et les données ne sont jamais affichés avant l'authentification

### Historique blockchain *(v2.0)*
- Récupération des 10 dernières transactions par wallet
- Export CSV avec filtres (plage de dates, sélection de wallets)

### Gestion multi-wallet
- Plusieurs wallets par cryptomonnaie
- Adresses masquées par défaut (mode confidentialité)
- QR code pour chaque adresse
- Édition inline avec sauvegarde automatique

### Profils
- Profils multiples sauvegardés indépendamment
- Profil anonyme temporaire (non sauvegardé, mode sombre)
- Auto-save toutes les 2 minutes

### Thèmes
| Thème | Type | Description |
|-------|------|-------------|
| Sombre | Standard | Interface sombre classique |
| Clair | Standard | Interface lumineuse |
| Sépia | Standard | Tons chauds parchemin |
| Noctali | Special Edition v1.0 | Ultra-sombre, voie lactée animée, croissant de lune plasma, illustrations Umbreon |
| Lunar Punk | Special Edition v2.2 | Désert dystopique, dunes violettes ondulantes, ruines de cité, dômes-abris, lune plasma, poussière cosmique |
| Solarpunk | Special Edition v2.2.1 | Fond JPEG Art Nouveau avec ville cyberpunk en ombre floue, collines verdoyantes, pollen doré animé |

### Intégrations blockchain *(v2.2)*
- **Monero (XMR)** — Intégration noeud RPC (view key + spend key), saisie manuelle, prix Bitfinex
- **PIVX** — Intégration noeud RPC (balance régulière + zPIV), saisie manuelle
- Architecture par famille de blockchains

---

## Cryptomonnaies supportées

### Hedging (fetch automatique)
| Crypto | API |
|--------|-----|
| **BTC** | Blockstream (fallback Blockcypher → Blockchair) |
| **BCH** | Blockchair |
| **LTC** | Blockchair |
| **XMR** | Saisie manuelle (blockchain privée) + noeud RPC optionnel |
| **PIVX** | Saisie manuelle + noeud RPC optionnel |

### Altcoins (fetch automatique)
| Crypto | API |
|--------|-----|
| **ETH** | Etherscan (fallback RPC public) |
| **ERC-20** (LINK, UNI, AAVE, MKR, CRV, WBTC, PAR, etc.) | Etherscan |
| **Stablecoins** (USDT, USDC, DAI, EURC, RAI, FRAX, LUSD) | Etherscan (ERC-20) |
| **Or tokenisé** (XAUT, PAXG) | Etherscan (ERC-20) |
| **ETC** | Blockscout |
| **DOT** | Subscan |
| **ADA** | Koios |
| **SOL** | Solana RPC |
| **XRP** | XRPL JSON-RPC |
| **DOGE** | Blockcypher |
| **DASH** | Blockchair |
| **AVAX** | Routescan |
| **NEAR** | NEAR RPC |
| **QTUM** | Qtum.info |
| **MATIC, ARB** | Etherscan (ERC-20) |

---

## Installation

### Depuis une release (.deb)

```bash
sudo dpkg -i janus-monitor_2.2.1_amd64.deb
```

### Depuis une release (AppImage)

```bash
chmod +x janus-monitor_2.2.1_amd64.AppImage
./janus-monitor_2.2.1_amd64.AppImage
```

> L'AppImage ne nécessite aucune installation. Il suffit de le rendre exécutable et de le lancer.

---

## Mise à jour depuis une version antérieure

### Mise à jour .deb (v1.x / v2.x → v2.2.1)

```bash
# Le .deb remplace automatiquement l'ancienne version
sudo dpkg -i janus-monitor_2.2.1_amd64.deb
```

Vos données (profils, wallets, catégories) sont conservées automatiquement — elles sont stockées dans le répertoire de données Tauri (`~/.local/share/com.janus.monitor/`) et ne sont pas touchées par la mise à jour du paquet.

### Mise à jour AppImage

```bash
# 1. Supprimer l'ancien AppImage
rm janus-monitor_*_amd64.AppImage

# 2. Rendre le nouveau exécutable et lancer
chmod +x janus-monitor_2.2.1_amd64.AppImage
./janus-monitor_2.2.1_amd64.AppImage
```

### Mise à jour depuis les sources (git pull)

```bash
cd janus-monitor
git pull origin main
npm install
cargo tauri build
```

Les nouveaux bundles sont générés dans `src-tauri/target/release/bundle/`.

---

## Build depuis les sources

### Prérequis système (Debian / Ubuntu)

```bash
# Dépendances système pour Tauri 2
sudo apt update
sudo apt install -y \
    build-essential \
    curl \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libwebkit2gtk-4.1-dev \
    pkg-config
```

### Rust (stable)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustup update stable
```

### Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Tauri CLI

```bash
cargo install tauri-cli
```

### Cloner et installer

```bash
git clone https://github.com/606uotab/janus-monitor.git
cd janus-monitor
npm install
```

### Lancer en mode développement

```bash
cargo tauri dev
```

L'application se lance avec hot-reload frontend (Vite) et recompilation backend (Cargo).

### Créer les paquets de distribution

```bash
cargo tauri build
```

Cette commande produit deux fichiers dans `src-tauri/target/release/bundle/` :

| Format | Chemin | Usage |
|--------|--------|-------|
| **AppImage** | `bundle/appimage/janus-monitor_2.2.1_amd64.AppImage` | Exécutable portable, aucune installation requise |
| **Debian (.deb)** | `bundle/deb/janus-monitor_2.2.1_amd64.deb` | Installation système via `dpkg -i` |

> **Note** : Le build release active LTO (Link-Time Optimization), strip des symboles et optimise la taille du binaire. La première compilation peut prendre plusieurs minutes.

### Installer le .deb local après build

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/janus-monitor_2.2.1_amd64.deb
```

### Lancer l'AppImage après build

```bash
chmod +x src-tauri/target/release/bundle/appimage/janus-monitor_2.2.1_amd64.AppImage
./src-tauri/target/release/bundle/appimage/janus-monitor_2.2.1_amd64.AppImage
```

### Désinstaller

```bash
# Si installé via .deb
sudo dpkg -r janus-monitor
```

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + Tailwind CSS + Vite |
| Backend | Rust (Tauri 2) |
| Base de données | SQLite (rusqlite) |
| HTTP | reqwest (async) |
| Prix | Binance API + Bitfinex (XMR, XAUT) |
| Sécurité | Argon2id (PIN hashing) + libsodium/sodiumoxide (chiffrement logs) |
| Distribution | AppImage + .deb (Debian/Ubuntu) |

---

## Structure du projet

```
janus-monitor/
├── src/
│   ├── App.jsx                       # Application principale React
│   ├── PendingTransactionsPanel.jsx   # Panneau TX en attente
│   ├── TokenSearch.jsx               # Recherche de tokens
│   ├── secureBackend.js              # Appels Tauri sécurisés
│   ├── assets/
│   │   ├── solarpunk_bg.jpg          # Fond Solarpunk (Art Nouveau + ville cyberpunk)
│   │   └── generate_solarpunk_bg.py  # Script Cairo pour régénérer le fond
│   └── themes/
│       ├── index.js                  # Barrel exports
│       ├── NoctaliTheme.jsx          # Thème Noctali (v1.0) — Umbreon starfield
│       ├── LunarPunkTheme.jsx        # Thème Lunar Punk (v2.2) — Désert dystopique
│       └── SolarpunkTheme.jsx        # Thème Solarpunk (v2.2.1) — Nature meets technology
├── src-tauri/
│   └── src/
│       ├── main.rs                   # Point d'entrée Tauri
│       ├── lib.rs                    # Backend principal (commandes, API, DB)
│       ├── pin_security.rs           # Hashage PIN Argon2id
│       ├── input_validation.rs       # Validation des entrées
│       ├── secure_key_storage.rs     # Stockage de clés chiffré
│       ├── monero_integration.rs     # Intégration noeud Monero RPC
│       └── pivx_integration.rs       # Intégration noeud PIVX RPC
├── scripts/
│   └── dependency-management.mjs     # Audit de sécurité des dépendances
├── .github/
│   └── workflows/
│       └── security-scan.yml         # Scan de sécurité hebdomadaire (GitHub Actions)
├── CHANGELOG.md
└── README.md
```

---

## Configuration

Au premier lancement, l'application crée une base SQLite dans `~/.local/share/com.janus.monitor/`.

**Paramètres** (menu hamburger) :
- **Clé API Etherscan** — améliore la fiabilité des requêtes ETH/ERC-20
- **Thème** — 3 thèmes principaux + 3 Special Edition
- **Notifications** — activer/désactiver les alertes de transactions entrantes
- **Sécurité** — PIN/mot de passe + timer d'inactivité

---

## Stratégie JANUS

La stratégie repose sur deux phases complémentaires appliquées au Bitcoin :

- **Extraction 60 %** — prise de profits régulière
- **Recapitalisation 40 %** — renforcement des positions

L'allocation cible par défaut est 85 % BTC / 15 % diversification. Les catégories sont entièrement personnalisables depuis la v2.

---

## Régénérer le fond Solarpunk

Le fond JPEG du thème Solarpunk est généré programmatiquement via un script Python/Cairo :

```bash
# Prérequis
pip install pycairo Pillow

# Vérifier qu'ImageMagick est installé (pour le flou gaussien de la ville)
convert --version

# Générer le fond
cd src/assets
python generate_solarpunk_bg.py
```

Le script produit `solarpunk_bg.jpg` (Art Nouveau, collines, ville cyberpunk en silhouette floue, pollen doré).

---

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+Shift+P` | Terminal de prix Bloomberg-style |
| Triple-clic sur "JANUS Monitor" | Whitepaper Bitcoin (easter egg) |

---

## Licence

Usage personnel.

---

*La lumiere nourrit ce que l'ombre protege*
