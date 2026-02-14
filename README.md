# 🔱 JANUS Monitor v2.0

Application de bureau pour suivre en temps réel un portefeuille crypto selon la stratégie JANUS : **85% Bitcoin** en réserve de valeur, **15% diversification** entre hedging et altcoins.

![Tauri](https://img.shields.io/badge/Tauri%202-Rust%20%2B%20React-blue)
![Platform](https://img.shields.io/badge/Platform-Linux%20Debian-orange)
![Version](https://img.shields.io/badge/Version-2.0-green)

---

## Fonctionnalités

**Suivi de portefeuille**
- Récupération automatique des soldes on-chain pour 30+ cryptomonnaies
- Prix en temps réel via Binance et Bitfinex (XMR)
- Calcul dynamique des allocations par catégorie personnalisable
- Affichage en BTC, EUR, USD et once d'or (XAU)
- Terminal de prix Bloomberg-style (`Ctrl+Shift+P`)

**Pending Transactions** *(nouveau v2)*
- Monitoring en temps réel des transactions entrantes
- Suivi des confirmations (0/6 → 6/6 BTC, 0/12 ETH, etc.)
- Notifications sonores et toast persistant
- Panneau latéral avec cards détaillées par wallet
- Liens explorer multi-sites (Blockstream, Mempool, Etherscan, etc.)

**Catégories dynamiques** *(nouveau v2)*
- Création, renommage et suppression de catégories
- Réorganisation par flèches ▲/▼
- Barre de recherche de tokens intégrée par catégorie
- Template par défaut JANUS (85/7/5) chargé au premier lancement

**Sécurité** *(nouveau v2)*
- Protection par PIN / mot de passe au démarrage
- Verrouillage automatique après inactivité configurable
- Bouton de verrouillage manuel

**Historique blockchain** *(nouveau v2)*
- Récupération des 10 dernières transactions par wallet
- Export CSV avec filtres (plage de dates, sélection de wallets)

**Gestion multi-wallet**
- Plusieurs wallets par cryptomonnaie
- Adresses masquées par défaut (mode confidentialité)
- QR code pour chaque adresse
- Édition inline avec sauvegarde automatique

**Profils**
- Profils multiples sauvegardés indépendamment
- Profil anonyme temporaire (non sauvegardé, mode sombre)
- Auto-save toutes les 2 minutes

**Thèmes**
- ☀️ Clair — interface lumineuse
- 🌙 Sombre — thème sombre classique
- 📜 Sépia — tons chauds parchemin
- 🌑 Noctali — *Spécial Édition v1.0* — Ultra-sombre, voie lactée animée, croissant de lune plasma, illustrations Umbreon
- 🔮 Lunar Punk — *Spécial Édition v2.0* — Désert dystopique, dunes violettes ondulantes, ruines de cité, dômes-abris, lune plasma, poussière cosmique

---

## Cryptomonnaies supportées

### Hedging (fetch automatique)
| Crypto | API |
|--------|-----|
| **BTC** | Blockstream (fallback Blockcypher → Blockchair) |
| **BCH** | Blockchair |
| **LTC** | Blockcypher |
| **XMR** | Saisie manuelle (blockchain privée) |

### Altcoins (fetch automatique)
| Crypto | API |
|--------|-----|
| **ETH** | Etherscan (fallback RPC public) |
| **ERC-20** (LINK, UNI, AAVE, MKR, CRV, WBTC, etc.) | Etherscan |
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

### Depuis la release (.deb)

```bash
sudo dpkg -i janus-monitor_2.0.0_amd64.deb
```

Mise à jour depuis la v1 : même commande, le .deb remplace automatiquement l'ancienne version.

### Depuis la release (AppImage)

```bash
chmod +x janus-monitor_2.0.0_amd64.AppImage
./janus-monitor_2.0.0_amd64.AppImage
```

### Depuis les sources

**Prérequis système (Debian/Ubuntu) :**

```bash
sudo apt install -y build-essential curl libssl-dev libgtk-3-dev \
    libayatana-appindicator3-dev librsvg2-dev libwebkit2gtk-4.1-dev
```

**Rust :**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Node.js 20+ :**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Cloner, installer et lancer :**

```bash
git clone https://github.com/606uotab/janus-monitor.git
cd janus-monitor
npm install
cargo tauri dev
```

**Build pour distribution (.deb + AppImage) :**

```bash
cargo tauri build
```

Les bundles sont générés dans `src-tauri/target/release/bundle/`.

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + Tailwind CSS |
| Backend | Rust (Tauri 2) |
| Base de données | SQLite (rusqlite) |
| HTTP | reqwest |
| Prix | Binance API + Bitfinex (XMR) |
| Distribution | AppImage + .deb |

---

## Structure du projet

```
janus-monitor/
├── src/
│   ├── App.jsx                    # Application principale
│   ├── PendingTransactionsPanel.jsx  # Panneau TX en attente
│   ├── TokenSearch.jsx            # Recherche de tokens
│   └── themes/
│       ├── index.js               # Barrel exports
│       ├── NoctaliTheme.jsx       # Thème Noctali (v1.0)
│       └── LunarPunkTheme.jsx     # Thème Lunar Punk (v2.0)
├── src-tauri/
│   └── src/lib.rs                 # Backend Rust
├── CHANGELOG.md
└── README.md
```

---

## Configuration

Au premier lancement, l'application crée une base SQLite dans le répertoire de données Tauri.

**Paramètres** (⚙ dans l'interface) :
- **Clé API Etherscan** — améliore la fiabilité des requêtes ETH/ERC-20
- **Thème** — 3 thèmes principaux + 2 Spécial Édition
- **Notifications** — activer/désactiver les alertes de transactions entrantes
- **Sécurité** — PIN/mot de passe + timer d'inactivité

---

## Stratégie JANUS

La stratégie repose sur deux phases complémentaires appliquées au Bitcoin :

- **Extraction 60%** — prise de profits régulière
- **Recapitalisation 40%** — renforcement des positions

L'allocation cible par défaut est 85% BTC / 15% diversification. Les catégories sont entièrement personnalisables depuis la v2.

---

## Licence

Usage personnel.

---

*Les anneaux brillent au clair de lune* 🌙
