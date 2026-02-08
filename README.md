# 🔱 JANUS Monitor v1.0

Application de bureau pour suivre en temps réel un portefeuille crypto selon la stratégie JANUS : **85% Bitcoin** en réserve de valeur, **15% diversification** entre hedging et altcoins.

![Tauri](https://img.shields.io/badge/Tauri%202-Rust%20%2B%20React-blue)
![Platform](https://img.shields.io/badge/Platform-Linux%20Debian-orange)
![Version](https://img.shields.io/badge/Version-1.0-green)

---

## Fonctionnalités

**Suivi de portefeuille**
- Récupération automatique des soldes on-chain pour 17+ cryptomonnaies
- Prix en temps réel via Binance et Bitfinex (XMR)
- Calcul dynamique des allocations Bitcoin / Hedging / Altcoins
- Affichage en BTC, EUR, USD et once d'or (XAU)
- Conversion entre devises fiat (EUR, USD, GBP, CHF, JPY)

**Gestion multi-wallet**
- Plusieurs wallets par cryptomonnaie
- Adresses masquées par défaut (mode confidentialité)
- QR code pour chaque adresse
- Édition inline avec sauvegarde automatique

**Profils**
- Profils multiples sauvegardés indépendamment
- Profil anonyme temporaire (non sauvegardé, mode sombre)
- Restauration automatique du dernier profil utilisé
- Auto-save sur le profil actif toutes les 2 minutes

**Thèmes**
- ☀️ Clair
- 🌙 Sombre
- 📜 Sépia
- 🌑 Noctali spécial édition — thème ultra-sombre inspiré d'Umbreon avec voie lactée animée, croissant de lune plasma et illustrations

---

## Cryptomonnaies supportées

### Hedging (fetch automatique)
| Crypto | API | Fallback |
|--------|-----|----------|
| **BTC** | Blockstream | Blockcypher → Blockchair |
| **BCH** | Blockchair | — |
| **LTC** | Blockcypher | — |
| **XMR** | ❌ Saisie manuelle | Blockchain privée |

### Altcoins (fetch automatique)
| Crypto | API | Fallback |
|--------|-----|----------|
| **ETH** | Etherscan | RPC public (3 endpoints) |
| **LINK / UNI / AAVE** | Etherscan (ERC-20) | RPC `eth_call` + `balanceOf` |
| **ETC** | Blockscout | — |
| **DOT** | Blockchair | Subscan |
| **ADA** | Koios | — |
| **SOL** | Solana RPC | Fallback RPC |
| **XRP** | XRPL JSON-RPC | — |
| **DOGE** | Blockcypher | Blockchair → API publique |
| **DASH** | Blockchair | — |
| **AVAX** | Routescan | SnowTrace |
| **NEAR** | NEAR RPC | — |
| **QTUM** | Qtum.info | — |
| **PIVX** | ❌ Saisie manuelle | — |

> Les tokens ERC-20 fonctionnent sans clé API via fallback RPC, mais une clé Etherscan est recommandée pour la fiabilité.

---

## Installation

### Depuis la release (.deb)

```bash
sudo dpkg -i janus-monitor_1.0.0_amd64.deb
```

### Depuis la release (AppImage)

```bash
chmod +x janus-monitor_1.0.0_amd64.AppImage
./janus-monitor_1.0.0_amd64.AppImage
```

### Depuis les sources

**Prérequis :** Node.js, Rust, Cargo, dépendances Tauri 2

```bash
git clone https://github.com/606uotab/janus-monitor.git
cd janus-monitor
npm install
cargo tauri dev        # Mode développement
npm run tauri build    # Build .deb + AppImage
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

## Configuration

Au premier lancement, l'application crée une base SQLite dans le répertoire de données Tauri.

**Paramètres optionnels** (⚙ dans l'interface) :
- **Clé API Etherscan** — améliore la fiabilité des requêtes ETH/ERC-20
- **Thème** — choix parmi 4 thèmes
- **Devises** — sélection de la devise fiat affichée

---

## Stratégie JANUS

La stratégie repose sur deux phases complémentaires appliquées au Bitcoin :

- **Extraction 60%** — prise de profits régulière
- **Recapitalisation 40%** — renforcement des positions

L'allocation cible est 85% BTC / 15% diversification, avec un suivi en temps réel des pourcentages réels.

---

## Licence

Usage personnel.

---

*Les anneaux brillent au clair de lune* 🌙
