# Changelog

## [2.3.0] — 2026-02-15

### 2FA TOTP Authentication
- Authentification a deux facteurs via TOTP (RFC 6238)
- Compatible Google Authenticator, Authy, Microsoft Authenticator
- QR code pour configuration rapide + cle manuelle en fallback
- Secret TOTP chiffre au repos avec cle app-level (libsodium secretbox)
- Tolerance +-1 fenetre (90 secondes) pour decalages d'horloge

### Multi-Factor Authentication
- Nouveau facteur : mot de passe (min 8 caracteres, Argon2id)
- Combinaisons flexibles : mot de passe seul, PIN seul, MDP + PIN, MDP + 2FA, PIN + 2FA, MDP + PIN + 2FA
- Ecran de verrouillage multi-etapes avec indicateur de progression (dots vert/amber/gris)
- Commande unifiee `verify_profile_auth` qui verifie tous les facteurs en une transaction
- Session key derivee uniquement apres validation de tous les facteurs
- Rate limiting partage entre tous les facteurs (10 echecs = lockout 15min)

### Security Settings UI
- Panneau securite reorganise en 3 blocs : Mot de passe / PIN / 2FA
- Indicateur d'etat par facteur (vert = actif, gris = inactif)
- Modal de configuration TOTP avec QR code integre
- Bouton 2FA desactive si aucun PIN/mot de passe configure

### Backend
- Nouveau module `totp_security.rs` (generation, verification, chiffrement)
- Migration DB automatique v2.2 → v2.3 (colonnes password_hash, totp_secret_encrypted, totp_enabled)
- 6 nouvelles commandes Tauri : set_profile_password, remove_profile_password, setup_totp, enable_totp, disable_totp, verify_profile_auth
- Dependance `totp-rs` v5 avec feature `otpauth`

---

## [2.2.1] — 2026-02-15

### Solarpunk Theme (Special Edition)
- Nouveau thème clair Solarpunk avec fond JPEG Art Nouveau
- Ville cyberpunk en silhouette floue (Cairo + ImageMagick Gaussian blur)
- Collines verdoyantes recouvrant partiellement la ville (nature reprend ses droits)
- Particules de pollen doré animées (45 particules, 3 variantes d'animation)
- Palette ivoire-vert transparente pour laisser le fond visible
- Script Python/Cairo pour régénérer le fond (`src/assets/generate_solarpunk_bg.py`)

### Security Hardening
- Hashage PIN via Argon2id (remplace le stockage en clair)
- Chiffrement des logs sensibles via libsodium secretbox
- Validation stricte de toutes les entrées utilisateur (adresses, noms de profil, catégories)
- Nonce unique par message de log (correction de réutilisation de nonce)
- Suppression des fuites console.log/console.error (frontend et backend)
- Suppression du fallback clipboard non sécurisé

### Secure Startup Flow
- Démarrage toujours sur profil `default_template` vierge (thème sombre, aucun wallet)
- `reset_wallets` + `save_profile` exécutés à chaque cold start
- Le thème du profil n'est jamais appliqué avant l'authentification PIN
- Pattern `savedThemeRef` : le thème est stocké en ref et appliqué uniquement après unlock
- Tous les handlers de verrouillage forcent le thème sombre

### Monero & PIVX Integration (v2.2)
- Intégration noeud RPC Monero (view key + spend key)
- Intégration noeud RPC PIVX (balance régulière + zPIV)
- Architecture par famille de blockchains
- Prix Bitfinex pour XMR et XAUT

---

## [2.0.0] — 2026-02-14

### 🔔 Pending Transactions Monitor (Phase 3)
- Real-time monitoring of incoming transactions on all wallet addresses
- Confirmation progress tracking (0/6 → 6/6 for BTC, 0/12 → 12/12 for ETH, etc.)
- Collapsible sidebar panel with live transaction cards
- Each card shows: wallet name, asset badge, amount, truncated address, confirmation bar
- Expandable card details: full TX hash (copyable), full address (copyable), multi-explorer dropdown
- Explorer links per asset: Blockstream/Mempool (BTC), Etherscan (ETH/ERC-20), Blockchair (BCH/LTC), Subscan (DOT), Blockscout (ETC)
- Sound notification on new incoming transaction
- Persistent toast notification with dismiss button
- Toggle to disable pending notifications in Settings
- Notification bar at bottom with close (✕) button, re-appears on new TX
- Backend stores `wallet_name` in `PendingTransaction` struct for reliable display

### 🔐 Security System
- PIN code / password protection at startup
- Configurable inactivity timer (auto-lock after idle)
- Lock screen overlay with unlock prompt
- Manual lock button in dedicated Security menu section
- Security settings moved to its own top-level menu entry (separate from Settings)

### 📜 Transaction History
- Blockchain-fetched history: last 10 transactions per wallet
- Supported chains: BTC (Blockstream), ETH/ERC-20 (Etherscan), LTC/BCH (Blockchair), DOT (Subscan), ETC (Blockscout)
- `fetch_address_history` backend command with `HistoryTx` struct (hash, from, to, amount, confirmations, timestamp)
- CSV export with date range filter and wallet selection
- Saves directly to `~/Téléchargements/` (no dialog plugin dependency)

### ✏️ Dynamic Categories & Inline Editing
- Click on any category name to rename it inline (double-click to edit)
- Create new categories with custom names and colors
- Arrow-based category reordering (▲/▼ buttons, replaced broken HTML5 drag API on WebKitGTK/Tauri)
- Delete categories with confirmation prompt
- `default_template` profile loaded at startup as default portfolio structure
- Categories are fully user-customizable, decoupled from the original fixed JANUS strategy

### 💰 Expanded Cryptocurrency Support
- 16 new ERC-20 tokens added:
  - **Stablecoins**: USDT, USDC, DAI, EURC, RAI (Reflex Index)
  - **Tokenized Gold**: XAUT (Tether Gold), PAXG (PAX Gold)
  - **DeFi**: PAR (Parallel), WBTC, MKR, CRV, FRAX, LUSD
  - **Layer 2**: MATIC (Polygon), ARB (Arbitrum)
- All use Etherscan ERC-20 balance API with contract addresses
- Inline token search bar within each category cartouche

### 🔭 Blockchain API Integration
- **Polkadot (DOT)**: Subscan API (`polkadot.api.subscan.io`)
- **Ethereum Classic (ETC)**: Blockscout API (`etc.blockscout.com`)
- **Bitcoin**: Blockstream API
- **BCH / LTC**: Blockchair API
- **ETH / ERC-20**: Etherscan API
- **Prices**: Binance API (USD + EUR pairs)

### 📊 Price Terminal (Easter Egg)
- Bloomberg-style price overlay: `Ctrl+Shift+P`
- Dense monospace grid with all asset prices (USD/EUR/BTC)
- Real-time data from Binance feed
- Bitcoin whitepaper easter egg: triple-click on JANUS title

### 🎨 Theme System
- 5 themes: Sombre, Clair, Sépia, Noctali (Special Edition), Lunar Punk (Special Edition)
- **Theme code refactored** into dedicated `src/themes/` folder:
  - `NoctaliTheme.jsx` — Umbreon-inspired: crescent moon SVG, golden starfield, Noctali illustrations
  - `LunarPunkTheme.jsx` — Dystopian desert: plasma sphere moon, rolling purple dunes, ruined city skyline, Tatooine-style dome shelters, floating cosmic dust particles
  - `index.js` — barrel exports
- Theme selector reorganized: 3 main themes + "✨ Spécial Édition" dropdown with Noctali (v1.0) and Lunar Punk (v2.0)
- Each special theme shows version tag and description

### 🖥️ UI / UX Improvements
- Header consolidated: all icons same size (18px), unified icon row
- Hamburger menu with categorized sections (Profiles, Settings, Security, History)
- Back arrow navigation within menu sections
- Category cartouches with bordered sections and hover effects
- Per-profile transaction filtering in pending panel
- Wallet expand/collapse system with arrow toggles
- Mini price cards in header for BTC, ETH, XMR, BCH, LTC
- QR code display for wallet addresses
- Version display in header: `Réserve sécurisée · v2.0 · {profile}`

### 🏗️ Architecture
- **Frontend**: React (App.jsx reduced from ~2200 to ~1860 lines via theme extraction)
- **Backend**: Rust/Tauri with SQLite
- **Components**: `PendingTransactionsPanel.jsx`, `TokenSearch.jsx`, `themes/` folder
- **Distribution**: .deb + AppImage via `cargo tauri build`
- Removed `tauri-plugin-dialog` dependency (CSV export uses direct file write)

---

## [1.0.0] — 2026-02-03

### Initial Release
- Tauri desktop application (Rust + React) for Debian Linux
- Bitcoin-first portfolio monitoring based on JANUS 85/15 strategy
- Automatic on-chain balance fetching: BTC (Blockstream), BCH/LTC (Blockchair), ETH/ERC-20 (Etherscan)
- Real-time price feeds from Binance API (USD/EUR pairs)
- Dynamic percentage calculations based on actual holdings
- Multi-profile support with SQLite storage
- Manual balance entry for privacy coins (XMR)
- Noctali theme (Umbreon-inspired dark theme with starfield)
- 3 base themes: Sombre, Clair, Sépia
- AppImage distribution for Debian Linux
