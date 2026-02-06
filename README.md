# JANUS Monitor

Application de monitoring de réserve crypto pour la stratégie JANUS.

- Lecture on-chain automatique des balances (BTC, BCH, LTC)
- Prix en temps réel (rafraîchissement chaque seconde)
- Stockage SQLite local
- Interface sobre et professionnelle

## Installation sur Debian/Ubuntu

### 1. Prérequis système

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer les dépendances de build
sudo apt install -y \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libwebkit2gtk-4.1-dev \
    libjavascriptcoregtk-4.1-dev \
    libsoup-3.0-dev \
    libglib2.0-dev \
    patchelf
```

### 2. Installer Rust

```bash
# Installer Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Choisir l'option 1 (installation par défaut)
# Puis recharger le shell
source $HOME/.cargo/env

# Vérifier l'installation
rustc --version
cargo --version
```

### 3. Installer Node.js (v18+)

```bash
# Via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier
node --version
npm --version
```

### 4. Installer Tauri CLI

```bash
# Installer le CLI Tauri
cargo install tauri-cli

# Vérifier
cargo tauri --version
```

### 5. Cloner et installer le projet

```bash
# Se placer dans le dossier du projet
cd janus-monitor

# Installer les dépendances Node
npm install

# Vérifier que tout est prêt
cargo tauri info
```

## Lancer en mode développement

```bash
cargo tauri dev
```

L'application se lance avec hot-reload pour le frontend.

## Build AppImage pour distribution

```bash
# Build release
cargo tauri build

# L'AppImage sera dans:
# src-tauri/target/release/bundle/appimage/janus-monitor_X.X.X_amd64.AppImage
```

### Rendre l'AppImage exécutable

```bash
chmod +x janus-monitor_*.AppImage
./janus-monitor_*.AppImage
```

## Structure du projet

```
janus-monitor/
├── src-tauri/           # Backend Rust
│   ├── src/
│   │   ├── main.rs      # Point d'entrée + commandes Tauri
│   │   ├── db.rs        # Gestion SQLite
│   │   ├── api.rs       # Appels APIs (prix, balances)
│   │   └── models.rs    # Structures de données
│   ├── Cargo.toml       # Dépendances Rust
│   └── tauri.conf.json  # Config Tauri
├── src/                 # Frontend React
│   ├── App.jsx          # Composant principal
│   ├── main.jsx         # Point d'entrée React
│   └── styles.css       # Styles
├── index.html           # HTML racine
├── package.json         # Dépendances Node
├── vite.config.js       # Config Vite
└── README.md
```

## Fonctionnalités

### Lecture on-chain
- **BTC**: Blockstream API (mempool.space backup)
- **BCH**: Blockchair API
- **LTC**: Blockchair API
- **XMR**: Manuel (confidentialité Monero)
- **Alts**: Manuel (valeur EUR agrégée)

### Prix temps réel
- Source: CoinGecko API
- Rafraîchissement: 1 seconde
- Devises: EUR et USD

### Stockage
- SQLite local (~/.local/share/janus-monitor/janus.db)
- Sauvegarde automatique des adresses et balances
- Historique des prix (optionnel)

## Dépannage

### Erreur WebKit2GTK
```bash
sudo apt install libwebkit2gtk-4.1-dev
```

### Erreur OpenSSL
```bash
sudo apt install libssl-dev pkg-config
```

### Permission denied sur AppImage
```bash
chmod +x *.AppImage
```

### L'app ne se lance pas
```bash
# Vérifier les logs
cargo tauri dev 2>&1 | tee debug.log
```

## Licence

Usage personnel - Stratégie JANUS
