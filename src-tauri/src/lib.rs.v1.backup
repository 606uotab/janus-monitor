use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

// ============================================================================
// STRUCTURES DE DONNÉES
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Wallet {
    pub id: i64,
    pub category: String,
    pub asset: String,
    pub name: String,
    pub address: String,
    pub balance: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AssetPrice {
    pub eur: f64,
    pub usd: f64,
    pub btc: f64,
    pub eth: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ProfileData {
    wallets: Vec<Wallet>,
    #[serde(default)]
    theme: Option<String>,
}

#[derive(Debug, Serialize)]
struct LoadProfileResult {
    theme: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Prices {
    pub btc: AssetPrice,
    pub xmr: AssetPrice,
    pub bch: AssetPrice,
    pub ltc: AssetPrice,
    pub eth: AssetPrice,
    pub etc: AssetPrice,
    pub link: AssetPrice,
    pub dot: AssetPrice,
    pub qtum: AssetPrice,
    pub pivx: AssetPrice,
    pub ada: AssetPrice,
    pub sol: AssetPrice,
    pub avax: AssetPrice,
    pub doge: AssetPrice,
    pub xrp: AssetPrice,
    pub uni: AssetPrice,
    pub aave: AssetPrice,
    pub near: AssetPrice,
    pub dash: AssetPrice,
    // Forex & Gold
    pub forex_jpy_per_usd: f64,
    pub forex_cny_per_usd: f64,
    pub forex_cad_per_usd: f64,
    pub forex_chf_per_usd: f64,
    pub forex_aud_per_usd: f64,
    pub forex_nzd_per_usd: f64,
    pub forex_sgd_per_usd: f64,
    pub forex_sek_per_usd: f64,
    pub forex_nok_per_usd: f64,
    pub forex_hkd_per_usd: f64,
    pub forex_krw_per_usd: f64,
    pub forex_gbp_per_usd: f64,
    pub forex_brl_per_usd: f64,
    pub forex_zar_per_usd: f64,
    pub forex_rub_per_usd: f64,
    pub gold_usd_per_oz: f64,
    pub brent_usd: f64,
    pub dxy: f64,
    pub vix: f64,
    pub eurusd: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AltcoinInfo {
    pub symbol: String,
    pub name: String,
    pub can_fetch: bool,
    pub fetch_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub etherscan_api_key: String,
    pub theme: String,
}

pub struct DbState(pub Mutex<Connection>);

// ============================================================================
// BASE DE DONNÉES
// ============================================================================

fn get_db_path() -> String {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("janus-monitor");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("janus.db").to_string_lossy().to_string()
}

fn init_db(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS wallets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL DEFAULT 'bitcoin',
            asset TEXT NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            balance REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )", [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )", [],
    )?;

    let has_category: bool = conn
        .prepare("SELECT COUNT(*) FROM pragma_table_info('wallets') WHERE name='category'")?
        .query_row([], |row| row.get::<_, i64>(0))
        .map(|count| count > 0)
        .unwrap_or(false);

    if !has_category {
        conn.execute("ALTER TABLE wallets ADD COLUMN category TEXT NOT NULL DEFAULT 'bitcoin'", [])?;
        conn.execute("UPDATE wallets SET category = 'bitcoin' WHERE asset = 'btc'", [])?;
        conn.execute("UPDATE wallets SET category = 'hedging' WHERE asset IN ('xmr', 'bch', 'ltc')", [])?;
        conn.execute("UPDATE wallets SET category = 'altcoins' WHERE asset NOT IN ('btc', 'xmr', 'bch', 'ltc')", [])?;
    }

    let count: i64 = conn.query_row("SELECT COUNT(*) FROM wallets", [], |row| row.get(0))?;
    if count == 0 {
        // Bitcoin - 85%
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('bitcoin', 'btc', 'Cold Wallet 1', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('bitcoin', 'btc', 'Cold Wallet 2', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('bitcoin', 'btc', 'Cold Wallet 3', '')", [])?;
        // Hedging - 7%
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'xmr', 'Monero Reserve 1', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'xmr', 'Monero Reserve 2', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'bch', 'BCH Wallet 1', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'bch', 'BCH Wallet 2', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'ltc', 'LTC Wallet', '')", [])?;
        // Altcoins - 5%
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('altcoins', 'eth', 'Ethereum Wallet', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('altcoins', 'uni', 'Uniswap Wallet', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('altcoins', 'sol', 'Solana Wallet', '')", [])?;
        conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('altcoins', 'near', 'NEAR Wallet', '')", [])?;
    }

    conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('etherscan_api_key', '')", [])?;
    conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark')", [])?;
    Ok(())
}

// ============================================================================
// COMMANDES TAURI - WALLETS
// ============================================================================

#[tauri::command]
fn get_wallets(state: State<DbState>) -> Result<Vec<Wallet>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, category, asset, name, address, balance FROM wallets ORDER BY id")
        .map_err(|e| e.to_string())?;
    let wallets = stmt
        .query_map([], |row| {
            Ok(Wallet {
                id: row.get(0)?,
                category: row.get(1)?,
                asset: row.get(2)?,
                name: row.get(3)?,
                address: row.get(4)?,
                balance: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(wallets)
}

#[tauri::command]
fn update_wallet(state: State<DbState>, id: i64, name: String, address: String, balance: Option<f64>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE wallets SET name = ?1, address = ?2, balance = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
        params![name, address, balance, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_wallet(state: State<DbState>, category: String, asset: String, name: String) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO wallets (category, asset, name, address) VALUES (?1, ?2, ?3, '')",
        params![category, asset, name],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn delete_wallet(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM wallets WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// COMMANDES TAURI - SETTINGS
// ============================================================================

#[tauri::command]
fn get_settings(state: State<DbState>) -> Result<Settings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let api_key: String = conn
        .query_row("SELECT value FROM settings WHERE key = 'etherscan_api_key'", [], |row| row.get(0))
        .unwrap_or_default();
    let theme: String = conn
        .query_row("SELECT value FROM settings WHERE key = 'theme'", [], |row| row.get(0))
        .unwrap_or_else(|_| "dark".to_string());
    Ok(Settings { etherscan_api_key: api_key, theme })
}

#[tauri::command]
fn save_settings(state: State<DbState>, settings: Settings) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('etherscan_api_key', ?1)",
        params![settings.etherscan_api_key],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?1)",
        params![settings.theme],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_setting(state: State<DbState>, key: String) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_setting(state: State<DbState>, key: String, value: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// COMMANDES TAURI - LISTE DES ALTCOINS
// ============================================================================

#[tauri::command]
fn get_altcoins_list() -> Vec<AltcoinInfo> {
    vec![
        AltcoinInfo { symbol: "eth".to_string(), name: "Ethereum".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "etc".to_string(), name: "Ethereum Classic".to_string(), can_fetch: true, fetch_type: "blockchair".to_string() },
        AltcoinInfo { symbol: "link".to_string(), name: "Chainlink".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "uni".to_string(), name: "Uniswap".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "aave".to_string(), name: "Aave".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "dot".to_string(), name: "Polkadot".to_string(), can_fetch: true, fetch_type: "subscan".to_string() },
        AltcoinInfo { symbol: "qtum".to_string(), name: "Qtum".to_string(), can_fetch: true, fetch_type: "qtum.info".to_string() },
        AltcoinInfo { symbol: "pivx".to_string(), name: "PIVX".to_string(), can_fetch: false, fetch_type: "manual".to_string() },
        AltcoinInfo { symbol: "ada".to_string(), name: "Cardano".to_string(), can_fetch: true, fetch_type: "koios".to_string() },
        AltcoinInfo { symbol: "sol".to_string(), name: "Solana".to_string(), can_fetch: true, fetch_type: "solana-rpc".to_string() },
        AltcoinInfo { symbol: "avax".to_string(), name: "Avalanche".to_string(), can_fetch: true, fetch_type: "routescan".to_string() },
        AltcoinInfo { symbol: "doge".to_string(), name: "Dogecoin".to_string(), can_fetch: true, fetch_type: "blockcypher".to_string() },
        AltcoinInfo { symbol: "xrp".to_string(), name: "XRP".to_string(), can_fetch: true, fetch_type: "xrpl".to_string() },
        AltcoinInfo { symbol: "near".to_string(), name: "NEAR Protocol".to_string(), can_fetch: true, fetch_type: "near-rpc".to_string() },
        AltcoinInfo { symbol: "dash".to_string(), name: "Dash".to_string(), can_fetch: true, fetch_type: "blockchair".to_string() },
    ]
}

// ============================================================================
// COMMANDES TAURI - PRIX (BINANCE + BITFINEX XMR + FOREX + GOLD)
// ============================================================================

#[derive(Debug, Deserialize)]
struct BinanceTicker {
    #[allow(dead_code)]
    symbol: String,
    price: String,
}

#[tauri::command]
async fn get_prices() -> Result<Prices, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let symbols = vec![
        "BTCUSDT", "BTCEUR", "BTCJPY",
        "BCHUSDT", "BCHEUR", "BCHBTC",
        "LTCUSDT", "LTCEUR", "LTCBTC",
        "ETHUSDT", "ETHEUR", "ETHBTC",
        "ETCUSDT", "ETCEUR", "ETCBTC", "ETCETH",
        "LINKUSDT", "LINKEUR", "LINKBTC", "LINKETH",
        "DOTUSDT", "DOTEUR", "DOTBTC", "DOTETH",
        "QTUMUSDT", "QTUMEUR", "QTUMBTC",
        "PIVXBTC", "PIVXETH",
        "ADAUSDT", "ADAEUR", "ADABTC",
        "SOLUSDT", "SOLEUR", "SOLBTC",
        "AVAXUSDT", "AVAXEUR", "AVAXBTC",
        "DOGEUSDT", "DOGEEUR", "DOGEBTC",
        "XRPUSDT", "XRPEUR", "XRPBTC",
        "UNIUSDT", "UNIEUR", "UNIBTC",
        "AAVEUSDT", "AAVEEUR", "AAVEBTC",
        // NEAR
        "NEARUSDT", "NEAREUR", "NEARBTC",
        // DASH
        "DASHUSDT", "DASHBTC",
        // PAXG = 1 troy oz gold tokenized
        "PAXGUSDT",
    ];

    let mut prices = Prices::default();

    for symbol in symbols {
        let url = format!("https://api.binance.com/api/v3/ticker/price?symbol={}", symbol);
        if let Ok(response) = client.get(&url).send().await {
            if response.status().is_success() {
                if let Ok(ticker) = response.json::<BinanceTicker>().await {
                    if let Ok(price) = ticker.price.parse::<f64>() {
                        match symbol {
                            "BTCUSDT" => prices.btc.usd = price,
                            "BTCEUR" => prices.btc.eur = price,
                            "BCHUSDT" => prices.bch.usd = price,
                            "BCHEUR" => prices.bch.eur = price,
                            "BCHBTC" => prices.bch.btc = price,
                            "LTCUSDT" => prices.ltc.usd = price,
                            "LTCEUR" => prices.ltc.eur = price,
                            "LTCBTC" => prices.ltc.btc = price,
                            "ETHUSDT" => prices.eth.usd = price,
                            "ETHEUR" => prices.eth.eur = price,
                            "ETHBTC" => prices.eth.btc = price,
                            "ETCUSDT" => prices.etc.usd = price,
                            "ETCEUR" => prices.etc.eur = price,
                            "ETCBTC" => prices.etc.btc = price,
                            "ETCETH" => prices.etc.eth = price,
                            "LINKUSDT" => prices.link.usd = price,
                            "LINKEUR" => prices.link.eur = price,
                            "LINKBTC" => prices.link.btc = price,
                            "LINKETH" => prices.link.eth = price,
                            "DOTUSDT" => prices.dot.usd = price,
                            "DOTEUR" => prices.dot.eur = price,
                            "DOTBTC" => prices.dot.btc = price,
                            "DOTETH" => prices.dot.eth = price,
                            "QTUMUSDT" => prices.qtum.usd = price,
                            "QTUMEUR" => prices.qtum.eur = price,
                            "QTUMBTC" => prices.qtum.btc = price,
                            "PIVXBTC" => prices.pivx.btc = price,
                            "PIVXETH" => prices.pivx.eth = price,
                            "ADAUSDT" => prices.ada.usd = price,
                            "ADAEUR" => prices.ada.eur = price,
                            "ADABTC" => prices.ada.btc = price,
                            "SOLUSDT" => prices.sol.usd = price,
                            "SOLEUR" => prices.sol.eur = price,
                            "SOLBTC" => prices.sol.btc = price,
                            "AVAXUSDT" => prices.avax.usd = price,
                            "AVAXEUR" => prices.avax.eur = price,
                            "AVAXBTC" => prices.avax.btc = price,
                            "DOGEUSDT" => prices.doge.usd = price,
                            "DOGEEUR" => prices.doge.eur = price,
                            "DOGEBTC" => prices.doge.btc = price,
                            "XRPUSDT" => prices.xrp.usd = price,
                            "XRPEUR" => prices.xrp.eur = price,
                            "XRPBTC" => prices.xrp.btc = price,
                            "UNIUSDT" => prices.uni.usd = price,
                            "UNIEUR" => prices.uni.eur = price,
                            "UNIBTC" => prices.uni.btc = price,
                            "AAVEUSDT" => prices.aave.usd = price,
                            "AAVEEUR" => prices.aave.eur = price,
                            "AAVEBTC" => prices.aave.btc = price,
                            // NEAR
                            "NEARUSDT" => prices.near.usd = price,
                            "NEAREUR" => prices.near.eur = price,
                            "NEARBTC" => prices.near.btc = price,
                            // DASH
                            "DASHUSDT" => prices.dash.usd = price,
                            "DASHBTC" => prices.dash.btc = price,
                            // Gold (PAXG = 1 troy oz)
                            "PAXGUSDT" => prices.gold_usd_per_oz = price,
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    // XMR from Bitfinex
    let bitfinex_url = "https://api-pub.bitfinex.com/v2/tickers?symbols=tXMRUSD,tXMRBTC";
    if let Ok(response) = client.get(bitfinex_url).send().await {
        if response.status().is_success() {
            if let Ok(text) = response.text().await {
                if let Some(start) = text.find("[\"tXMRUSD\"") {
                    let substr = &text[start..];
                    let parts: Vec<&str> = substr.split(',').collect();
                    if parts.len() >= 8 {
                        if let Ok(usd_price) = parts[7].parse::<f64>() {
                            prices.xmr.usd = usd_price;
                        }
                    }
                }
                if let Some(start) = text.find("[\"tXMRBTC\"") {
                    let substr = &text[start..];
                    let parts: Vec<&str> = substr.split(',').collect();
                    if parts.len() >= 8 {
                        if let Ok(btc_price) = parts[7].parse::<f64>() {
                            prices.xmr.btc = btc_price;
                        }
                    }
                }
                if prices.xmr.usd > 0.0 && prices.btc.eur > 0.0 && prices.btc.usd > 0.0 {
                    prices.xmr.eur = prices.xmr.usd * (prices.btc.eur / prices.btc.usd);
                }
            }
        }
    }

    // Derived EUR prices for assets without EUR pairs on Binance
    if prices.btc.eur > 0.0 && prices.btc.usd > 0.0 {
        let eur_per_usd = prices.btc.eur / prices.btc.usd;
        // DASH: has USD and BTC but no EUR
        if prices.dash.usd > 0.0 {
            prices.dash.eur = prices.dash.usd * eur_per_usd;
        }
        // PIVX: only has BTC/ETH pairs, compute USD and EUR from BTC
        if prices.pivx.btc > 0.0 {
            prices.pivx.usd = prices.pivx.btc * prices.btc.usd;
            prices.pivx.eur = prices.pivx.btc * prices.btc.eur;
        }
    }

    // Forex via frankfurter.app (free, no key) — all currencies from USD
    let forex_url = "https://api.frankfurter.app/latest?from=USD&to=JPY,CNY,CAD,CHF,AUD,NZD,SGD,SEK,NOK,HKD,KRW,GBP,BRL,ZAR";
    if let Ok(response) = client.get(forex_url).send().await {
        if response.status().is_success() {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                if let Some(rates) = data.get("rates") {
                    if let Some(v) = rates.get("JPY").and_then(|v| v.as_f64()) { prices.forex_jpy_per_usd = v; }
                    if let Some(v) = rates.get("CNY").and_then(|v| v.as_f64()) { prices.forex_cny_per_usd = v; }
                    if let Some(v) = rates.get("CAD").and_then(|v| v.as_f64()) { prices.forex_cad_per_usd = v; }
                    if let Some(v) = rates.get("CHF").and_then(|v| v.as_f64()) { prices.forex_chf_per_usd = v; }
                    if let Some(v) = rates.get("AUD").and_then(|v| v.as_f64()) { prices.forex_aud_per_usd = v; }
                    if let Some(v) = rates.get("NZD").and_then(|v| v.as_f64()) { prices.forex_nzd_per_usd = v; }
                    if let Some(v) = rates.get("SGD").and_then(|v| v.as_f64()) { prices.forex_sgd_per_usd = v; }
                    if let Some(v) = rates.get("SEK").and_then(|v| v.as_f64()) { prices.forex_sek_per_usd = v; }
                    if let Some(v) = rates.get("NOK").and_then(|v| v.as_f64()) { prices.forex_nok_per_usd = v; }
                    if let Some(v) = rates.get("HKD").and_then(|v| v.as_f64()) { prices.forex_hkd_per_usd = v; }
                    if let Some(v) = rates.get("KRW").and_then(|v| v.as_f64()) { prices.forex_krw_per_usd = v; }
                    if let Some(v) = rates.get("GBP").and_then(|v| v.as_f64()) { prices.forex_gbp_per_usd = v; }
                    if let Some(v) = rates.get("BRL").and_then(|v| v.as_f64()) { prices.forex_brl_per_usd = v; }
                    if let Some(v) = rates.get("ZAR").and_then(|v| v.as_f64()) { prices.forex_zar_per_usd = v; }
                }
            }
        }
    }

    // RUB: frankfurter doesn't support RUB (ECB sanctions)
    // Use Binance: fetch EURUSDT already have it, try EURRUB or compute from other source
    // Alternative: use a dedicated forex API for RUB
    // Try: open exchange rates via exchangerate-api.com free tier
    let rub_url = "https://open.er-api.com/v6/latest/USD";
    if let Ok(response) = client.get(rub_url).send().await {
        if response.status().is_success() {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                if let Some(rates) = data.get("rates") {
                    if let Some(v) = rates.get("RUB").and_then(|v| v.as_f64()) {
                        prices.forex_rub_per_usd = v;
                    }
                    // Also backfill any missing rates from this source
                    if prices.forex_jpy_per_usd == 0.0 {
                        if let Some(v) = rates.get("JPY").and_then(|v| v.as_f64()) { prices.forex_jpy_per_usd = v; }
                    }
                }
            }
        }
    }

    // Gold price: fetched via PAXGUSDT from Binance (PAXG = 1 troy oz gold tokenized)
    // Already handled in the Binance loop above

    // EUR/USD: inverse of USD/EUR rate from frankfurter
    // frankfurter gives us how many EUR per 1 USD, but EUR/USD = 1 / (EUR per USD)
    // Actually frankfurter gives: from=USD to=... so forex_gbp_per_usd = how many GBP per 1 USD
    // We need EUR per 1 USD from Binance: BTC_EUR / BTC_USD gives EUR/USD indirectly
    if prices.btc.eur > 0.0 && prices.btc.usd > 0.0 {
        prices.eurusd = prices.btc.usd / prices.btc.eur;
        // Actually EUR/USD means "1 EUR = X USD", so:
        prices.eurusd = prices.btc.usd / prices.btc.eur;
        // Wait: if BTCUSD=67000 and BTCEUR=57000, then 1 EUR = 67000/57000 = 1.175 USD
        // That's correct: EUR/USD = BTCUSD / BTCEUR
    }

    // DXY (US Dollar Index) — synthetic calculation from official ICE weights:
    // DXY = 50.14348112 × (EURUSD)^(-0.576) × (USDJPY)^(0.136) × (GBPUSD)^(-0.119)
    //       × (USDCAD)^(0.091) × (USDSEK)^(0.042) × (USDCHF)^(0.036)
    {
        let eur_usd = if prices.eurusd > 0.0 { prices.eurusd } else { 1.0 };
        let usd_jpy = prices.forex_jpy_per_usd;
        let gbp_usd = if prices.forex_gbp_per_usd > 0.0 { 1.0 / prices.forex_gbp_per_usd } else { 1.0 };
        let usd_cad = prices.forex_cad_per_usd;
        let usd_sek = prices.forex_sek_per_usd;
        let usd_chf = prices.forex_chf_per_usd;

        if usd_jpy > 0.0 && usd_cad > 0.0 && usd_sek > 0.0 && usd_chf > 0.0 {
            prices.dxy = 50.14348112
                * eur_usd.powf(-0.576)
                * usd_jpy.powf(0.136)
                * gbp_usd.powf(-0.119)
                * usd_cad.powf(0.091)
                * usd_sek.powf(0.042)
                * usd_chf.powf(0.036);
        }
    }

    // VIX via Yahoo Finance (free, no key)
    let vix_url = "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d";
    if let Ok(response) = client.get(vix_url)
        .header("User-Agent", "Mozilla/5.0")
        .send().await
    {
        if response.status().is_success() {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                // Navigate: chart.result[0].meta.regularMarketPrice
                if let Some(price) = data
                    .get("chart")
                    .and_then(|c| c.get("result"))
                    .and_then(|r| r.get(0))
                    .and_then(|r| r.get("meta"))
                    .and_then(|m| m.get("regularMarketPrice"))
                    .and_then(|p| p.as_f64())
                {
                    prices.vix = price;
                }
            }
        }
    }

    // Brent Crude Oil via Yahoo Finance (BZ=F)
    let brent_url = "https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=1d";
    if let Ok(response) = client.get(brent_url)
        .header("User-Agent", "Mozilla/5.0")
        .send().await
    {
        if response.status().is_success() {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                if let Some(price) = data
                    .get("chart")
                    .and_then(|c| c.get("result"))
                    .and_then(|r| r.get(0))
                    .and_then(|r| r.get("meta"))
                    .and_then(|m| m.get("regularMarketPrice"))
                    .and_then(|p| p.as_f64())
                {
                    prices.brent_usd = price;
                }
            }
        }
    }

    Ok(prices)
}

// ============================================================================
// COMMANDES TAURI - FETCH BALANCE ON-CHAIN
// ============================================================================

#[derive(Debug, Deserialize)]
struct BlockstreamUtxo {
    value: u64,
}

// Blockcypher response
#[derive(Debug, Deserialize)]
struct BlockcypherAddress {
    balance: Option<u64>,
    final_balance: Option<u64>,
}

fn get_token_contract(token: &str) -> Option<&'static str> {
    match token {
        "link" => Some("0x514910771af9ca656af840dff83e8264ecf986ca"),
        "uni" => Some("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"),
        "aave" => Some("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"),
        _ => None,
    }
}

#[tauri::command]
async fn fetch_balance(state: State<'_, DbState>, asset: String, address: String) -> Result<f64, String> {
    let address = address.trim().to_string();
    if address.is_empty() {
        return Err("Adresse vide".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    match asset.as_str() {
        // ── BTC via Blockstream + fallbacks Blockcypher + Blockchair ──
        "btc" => {
            println!("[BTC] Fetching balance for: '{}'", address);

            // 1) Blockstream
            let url1 = format!("https://blockstream.info/api/address/{}/utxo", address);
            println!("[BTC] Try Blockstream: {}", url1);
            match client.get(&url1).send().await {
                Ok(resp) => {
                    let status = resp.status();
                    println!("[BTC] Blockstream status: {}", status);
                    if status.is_success() {
                        match resp.json::<Vec<BlockstreamUtxo>>().await {
                            Ok(utxos) => {
                                let total_sats: u64 = utxos.iter().map(|u| u.value).sum();
                                println!("[BTC] Blockstream OK: {} sats ({} utxos)", total_sats, utxos.len());
                                return Ok(total_sats as f64 / 100_000_000.0);
                            }
                            Err(e) => println!("[BTC] Blockstream parse error: {}", e),
                        }
                    } else {
                        let body = resp.text().await.unwrap_or_default();
                        println!("[BTC] Blockstream error body: {}", body);
                    }
                }
                Err(e) => println!("[BTC] Blockstream network error: {}", e),
            }

            // 2) Blockcypher (excellent legacy P2PKH support)
            let url2 = format!("https://api.blockcypher.com/v1/btc/main/addrs/{}/balance", address);
            println!("[BTC] Try Blockcypher: {}", url2);
            match client.get(&url2).send().await {
                Ok(resp) => {
                    let status = resp.status();
                    println!("[BTC] Blockcypher status: {}", status);
                    if status.is_success() {
                        match resp.json::<BlockcypherAddress>().await {
                            Ok(data) => {
                                if let Some(bal) = data.final_balance.or(data.balance) {
                                    println!("[BTC] Blockcypher OK: {} sats", bal);
                                    return Ok(bal as f64 / 100_000_000.0);
                                }
                            }
                            Err(e) => println!("[BTC] Blockcypher parse error: {}", e),
                        }
                    } else {
                        let body = resp.text().await.unwrap_or_default();
                        println!("[BTC] Blockcypher error body: {}", body);
                    }
                }
                Err(e) => println!("[BTC] Blockcypher network error: {}", e),
            }

            // 3) Blockchair
            let url3 = format!("https://api.blockchair.com/bitcoin/dashboards/address/{}", address);
            println!("[BTC] Try Blockchair: {}", url3);
            match client.get(&url3).send().await {
                Ok(resp) => {
                    let status = resp.status();
                    println!("[BTC] Blockchair status: {}", status);
                    if status.is_success() {
                        if let Ok(raw) = resp.json::<serde_json::Value>().await {
                            if let Some(data) = raw.get("data").and_then(|d| d.as_object()) {
                                for (_key, addr_data) in data {
                                    if let Some(addr_info) = addr_data.get("address") {
                                        if let Some(b) = addr_info.get("balance").and_then(|v| v.as_i64()) {
                                            println!("[BTC] Blockchair OK: {} sats", b);
                                            return Ok(b as f64 / 100_000_000.0);
                                        }
                                        if let Some(b) = addr_info.get("balance").and_then(|v| v.as_f64()) {
                                            println!("[BTC] Blockchair OK: {} sats (f64)", b);
                                            return Ok(b / 100_000_000.0);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        let body = resp.text().await.unwrap_or_default();
                        println!("[BTC] Blockchair error body: {}", body);
                    }
                }
                Err(e) => println!("[BTC] Blockchair network error: {}", e),
            }

            println!("[BTC] ALL 3 APIs FAILED for: {}", address);
            Err("Balance BTC introuvable (3 APIs testées) — vérifiez l'adresse".to_string())
        }

        // ── BCH via multiple APIs (legacy & cashaddr support) ──
        "bch" => {
            // Try Blockchair first (supports both legacy and cashaddr)
            let url = format!("https://api.blockchair.com/bitcoin-cash/dashboards/address/{}", address);
            if let Ok(response) = client.get(&url).send().await {
                if response.status().is_success() {
                    if let Ok(raw) = response.json::<serde_json::Value>().await {
                        if let Some(data) = raw.get("data").and_then(|d| d.as_object()) {
                            for (_key, addr_data) in data {
                                if let Some(addr_info) = addr_data.get("address") {
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_i64()) {
                                        return Ok(b as f64 / 100_000_000.0);
                                    }
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_f64()) {
                                        return Ok(b / 100_000_000.0);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: bitcoin.com REST API (supports legacy addresses)
            let url2 = format!("https://rest1.biggestfan.net/v2/address/details/{}", address);
            if let Ok(resp2) = client.get(&url2).send().await {
                if resp2.status().is_success() {
                    if let Ok(data) = resp2.json::<serde_json::Value>().await {
                        if let Some(bal) = data.get("balance").and_then(|b| b.as_f64()) {
                            return Ok(bal);
                        }
                    }
                }
            }

            // Fallback: Blockcypher
            let url3 = format!("https://api.blockcypher.com/v1/bch/main/addrs/{}/balance", address);
            if let Ok(resp3) = client.get(&url3).send().await {
                if resp3.status().is_success() {
                    if let Ok(data) = resp3.json::<BlockcypherAddress>().await {
                        if let Some(bal) = data.final_balance.or(data.balance) {
                            return Ok(bal as f64 / 100_000_000.0);
                        }
                    }
                }
            }

            Err("Balance BCH non trouvée — essayez le format cashaddr (ex: bitcoincash:qq...)".to_string())
        }

        // ── LTC via Blockcypher (primary) + fallback Blockchair ──
        "ltc" => {
            // Primary: Blockcypher
            let url = format!("https://api.blockcypher.com/v1/ltc/main/addrs/{}/balance", address);
            if let Ok(response) = client.get(&url).send().await {
                if response.status().is_success() {
                    if let Ok(data) = response.json::<BlockcypherAddress>().await {
                        if let Some(bal) = data.final_balance.or(data.balance) {
                            return Ok(bal as f64 / 100_000_000.0);
                        }
                    }
                }
            }

            // Fallback: Blockchair with raw JSON
            let url2 = format!("https://api.blockchair.com/litecoin/dashboards/address/{}", address);
            if let Ok(resp2) = client.get(&url2).send().await {
                if resp2.status().is_success() {
                    if let Ok(raw) = resp2.json::<serde_json::Value>().await {
                        if let Some(data) = raw.get("data").and_then(|d| d.as_object()) {
                            for (_key, addr_data) in data {
                                if let Some(addr_info) = addr_data.get("address") {
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_i64()) {
                                        return Ok(b as f64 / 100_000_000.0);
                                    }
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_f64()) {
                                        return Ok(b / 100_000_000.0);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Err("Balance LTC non trouvée — vérifiez le format d'adresse".to_string())
        }

        // ── ETH via Etherscan v2 ──
        "eth" => {
            println!("[ETH] Fetching balance for: '{}'", address);
            // 1) Try Etherscan API
            let api_key = {
                let conn = state.0.lock().map_err(|e| e.to_string())?;
                conn.query_row("SELECT value FROM settings WHERE key = 'etherscan_api_key'", [], |row| row.get::<_, String>(0))
                    .unwrap_or_default()
            };
            if !api_key.is_empty() {
                // Try v1 API first (more stable)
                let url = format!(
                    "https://api.etherscan.io/api?module=account&action=balance&address={}&tag=latest&apikey={}",
                    address, api_key
                );
                println!("[ETH] Trying Etherscan v1...");
                match client.get(&url).send().await {
                    Ok(response) if response.status().is_success() => {
                        if let Ok(data) = response.json::<serde_json::Value>().await {
                            println!("[ETH] Etherscan response: {}", serde_json::to_string(&data).unwrap_or_default().chars().take(300).collect::<String>());
                            let status = data.get("status").and_then(|s| s.as_str()).unwrap_or("0");
                            if status == "1" {
                                let wei = match data.get("result") {
                                    Some(serde_json::Value::String(s)) => s.parse::<f64>().unwrap_or(0.0),
                                    Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0),
                                    _ => 0.0,
                                };
                                let eth_bal = wei / 1_000_000_000_000_000_000.0;
                                println!("[ETH] Etherscan OK: {} ETH", eth_bal);
                                return Ok(eth_bal);
                            }
                            println!("[ETH] Etherscan status != 1: {:?}", data.get("result"));
                        }
                    }
                    Ok(resp) => println!("[ETH] Etherscan HTTP error: {}", resp.status()),
                    Err(e) => println!("[ETH] Etherscan network error: {}", e),
                }
            } else {
                println!("[ETH] No Etherscan API key, skipping to RPC");
            }

            // 2) Fallback: direct RPC eth_getBalance
            let rpc_urls = [
                "https://eth.llamarpc.com",
                "https://ethereum-rpc.publicnode.com",
                "https://rpc.ankr.com/eth",
            ];
            for rpc_url in &rpc_urls {
                println!("[ETH] Trying RPC: {}", rpc_url);
                let body = serde_json::json!({
                    "jsonrpc": "2.0", "method": "eth_getBalance",
                    "params": [&address, "latest"], "id": 1
                });
                match client.post(*rpc_url).json(&body).send().await {
                    Ok(resp) if resp.status().is_success() => {
                        if let Ok(data) = resp.json::<serde_json::Value>().await {
                            if let Some(hex_str) = data.get("result").and_then(|r| r.as_str()) {
                                let hex_clean = hex_str.trim_start_matches("0x");
                                if !hex_clean.is_empty() {
                                    if let Ok(wei) = u128::from_str_radix(hex_clean, 16) {
                                        let eth_bal = wei as f64 / 1_000_000_000_000_000_000.0;
                                        println!("[ETH] RPC OK: {} ETH", eth_bal);
                                        return Ok(eth_bal);
                                    }
                                }
                            }
                            if let Some(err) = data.get("error") {
                                println!("[ETH] RPC error: {:?}", err);
                            }
                        }
                    }
                    Ok(resp) => println!("[ETH] RPC HTTP error: {}", resp.status()),
                    Err(e) => println!("[ETH] RPC network error: {}", e),
                }
            }
            Err("Balance ETH non trouvée — vérifiez l'adresse et la clé Etherscan".to_string())
        }

        // ── ETC via RPC (primary) + Blockchair (fallback) ──
        "etc" => {
            println!("[ETC] Fetching balance for: '{}'", address);

            // 1) ETC RPC direct (eth_getBalance) — multiple reliable endpoints
            let rpc_urls = [
                "https://etc.rivet.link",
                "https://geth-de.etc-network.info",
                "https://besu-de.etc-network.info",
            ];
            for rpc_url in rpc_urls {
                let body = serde_json::json!({
                    "jsonrpc": "2.0",
                    "method": "eth_getBalance",
                    "params": [&address, "latest"],
                    "id": 1
                });
                println!("[ETC] Try RPC: {}", rpc_url);
                match client.post(rpc_url)
                    .header("Content-Type", "application/json")
                    .json(&body)
                    .send().await
                {
                    Ok(resp) => {
                        println!("[ETC] RPC status: {}", resp.status());
                        if resp.status().is_success() {
                            if let Ok(data) = resp.json::<serde_json::Value>().await {
                                println!("[ETC] RPC response: {}", serde_json::to_string(&data).unwrap_or_default().chars().take(300).collect::<String>());
                                if let Some(hex_str) = data.get("result").and_then(|r| r.as_str()) {
                                    let hex_clean = hex_str.trim_start_matches("0x");
                                    if !hex_clean.is_empty() {
                                        if let Ok(wei) = u128::from_str_radix(hex_clean, 16) {
                                            let bal = wei as f64 / 1_000_000_000_000_000_000.0;
                                            println!("[ETC] RPC OK: {} ETC", bal);
                                            return Ok(bal);
                                        }
                                    }
                                }
                                if let Some(err) = data.get("error") {
                                    println!("[ETC] RPC error: {:?}", err);
                                }
                            }
                        }
                    }
                    Err(e) => println!("[ETC] RPC network error: {}", e),
                }
            }

            // 2) Blockscout ETC API
            let url2 = format!("https://blockscout.com/etc/mainnet/api?module=account&action=balance&address={}", address);
            println!("[ETC] Try Blockscout: {}", url2);
            if let Ok(resp) = client.get(&url2).send().await {
                println!("[ETC] Blockscout status: {}", resp.status());
                if resp.status().is_success() {
                    if let Ok(data) = resp.json::<serde_json::Value>().await {
                        if data.get("status").and_then(|s| s.as_str()) == Some("1") {
                            if let Some(result) = data.get("result").and_then(|r| r.as_str()) {
                                if let Ok(wei) = result.parse::<u128>() {
                                    let bal = wei as f64 / 1_000_000_000_000_000_000.0;
                                    println!("[ETC] Blockscout OK: {} ETC", bal);
                                    return Ok(bal);
                                }
                            }
                        }
                    }
                }
            }

            // 3) Blockchair fallback
            let url3 = format!("https://api.blockchair.com/ethereum/classic/dashboards/address/{}", address);
            println!("[ETC] Try Blockchair: {}", url3);
            if let Ok(response) = client.get(&url3).send().await {
                println!("[ETC] Blockchair status: {}", response.status());
                if response.status().is_success() {
                    if let Ok(raw) = response.json::<serde_json::Value>().await {
                        if let Some(data) = raw.get("data").and_then(|d| d.as_object()) {
                            for (_key, addr_data) in data {
                                if let Some(addr_info) = addr_data.get("address") {
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_i64()) {
                                        println!("[ETC] Blockchair OK: {} wei", b);
                                        return Ok(b as f64 / 1_000_000_000_000_000_000.0);
                                    }
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_f64()) {
                                        return Ok(b / 1_000_000_000_000_000_000.0);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err("Balance ETC non trouvée — adresse 0x... requise".to_string())
        }

        // ── ERC-20 tokens (LINK, UNI, AAVE) via Etherscan + RPC fallback ──
        "link" | "uni" | "aave" => {
            println!("[ERC20] Fetching {} balance for: '{}'", asset, address);
            let contract = get_token_contract(&asset).ok_or("Token non supporté")?;

            // 1) Try Etherscan API first
            let api_key = {
                let conn = state.0.lock().map_err(|e| e.to_string())?;
                conn.query_row("SELECT value FROM settings WHERE key = 'etherscan_api_key'", [], |row| row.get::<_, String>(0))
                    .unwrap_or_default()
            };
            if !api_key.is_empty() {
                let url = format!(
                    "https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress={}&address={}&tag=latest&apikey={}",
                    contract, address, api_key
                );
                println!("[ERC20] Trying Etherscan v1...");
                match client.get(&url).send().await {
                    Ok(resp) if resp.status().is_success() => {
                        if let Ok(data) = resp.json::<serde_json::Value>().await {
                            println!("[ERC20] Etherscan response: {}", serde_json::to_string(&data).unwrap_or_default().chars().take(300).collect::<String>());
                            let status = data.get("status").and_then(|s| s.as_str()).unwrap_or("0");
                            if status == "1" {
                                let raw = match data.get("result") {
                                    Some(serde_json::Value::String(s)) => s.parse::<f64>().unwrap_or(0.0),
                                    Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0),
                                    _ => 0.0,
                                };
                                let token_bal = raw / 1_000_000_000_000_000_000.0;
                                println!("[ERC20] Etherscan OK: {} {}", token_bal, asset.to_uppercase());
                                return Ok(token_bal);
                            }
                            println!("[ERC20] Etherscan error: {:?}", data.get("result"));
                        }
                    }
                    Ok(resp) => println!("[ERC20] Etherscan HTTP error: {}", resp.status()),
                    Err(e) => println!("[ERC20] Etherscan network error: {}", e),
                }
            } else {
                println!("[ERC20] No Etherscan key, skipping to RPC");
            }

            // 2) Fallback: RPC eth_call with balanceOf(address)
            let addr_clean = address.trim_start_matches("0x");
            let call_data = format!("0x70a08231000000000000000000000000{}", addr_clean);
            let rpc_urls = [
                "https://ethereum-rpc.publicnode.com",
                "https://eth.llamarpc.com",
                "https://rpc.ankr.com/eth",
            ];
            for rpc_url in &rpc_urls {
                println!("[ERC20] Try RPC: {}", rpc_url);
                let body = serde_json::json!({
                    "jsonrpc": "2.0",
                    "method": "eth_call",
                    "params": [{"to": contract, "data": &call_data}, "latest"],
                    "id": 1
                });
                match client.post(*rpc_url).json(&body).send().await {
                    Ok(resp) if resp.status().is_success() => {
                        if let Ok(data) = resp.json::<serde_json::Value>().await {
                            if let Some(hex_str) = data.get("result").and_then(|r| r.as_str()) {
                                let hex_clean = hex_str.trim_start_matches("0x");
                                if !hex_clean.is_empty() && hex_clean != "0" {
                                    if let Ok(raw) = u128::from_str_radix(hex_clean, 16) {
                                        let token_bal = raw as f64 / 1_000_000_000_000_000_000.0;
                                        println!("[ERC20] RPC OK: {} {}", token_bal, asset.to_uppercase());
                                        return Ok(token_bal);
                                    }
                                }
                            }
                            if let Some(err) = data.get("error") {
                                println!("[ERC20] RPC error: {:?}", err);
                            }
                        }
                    }
                    Ok(resp) => println!("[ERC20] RPC HTTP error: {}", resp.status()),
                    Err(e) => println!("[ERC20] RPC network error: {}", e),
                }
            }
            Err(format!("Balance {} non trouvée", asset.to_uppercase()))
        }

        // ── Manual entry ──
        "xmr" => Err("Monero: saisie manuelle requise (blockchain privée)".to_string()),

        // ── DOT via multiple APIs (balances migrated to Asset Hub Nov 2025) ──
        "dot" => {
            // 1) Blockchair Polkadot (free, REST, supports SS58 addresses)
            let url1 = format!("https://api.blockchair.com/polkadot/raw/address/{}", address);
            if let Ok(response) = client.get(&url1).send().await {
                if response.status().is_success() {
                    if let Ok(data) = response.json::<serde_json::Value>().await {
                        if let Some(addr_data) = data.get("data").and_then(|d| d.get(&address)) {
                            if let Some(account) = addr_data.get("account") {
                                // balance in planck (string or number)
                                if let Some(bal_str) = account.get("balance").and_then(|b| b.as_str()) {
                                    if let Ok(planck) = bal_str.parse::<f64>() {
                                        return Ok(planck / 10_000_000_000.0);
                                    }
                                }
                                if let Some(bal) = account.get("balance").and_then(|b| b.as_f64()) {
                                    return Ok(bal / 10_000_000_000.0);
                                }
                                if let Some(bal) = account.get("balance").and_then(|b| b.as_i64()) {
                                    return Ok(bal as f64 / 10_000_000_000.0);
                                }
                            }
                        }
                    }
                }
            }

            // 2) Parity Sidecar public (Asset Hub — balances live here since Nov 2025)
            let url2 = format!(
                "https://polkadot-asset-hub-public-sidecar.parity-chains.parity.io/accounts/{}/balance-info",
                address
            );
            if let Ok(response) = client.get(&url2)
                .header("Accept", "application/json")
                .send().await
            {
                if response.status().is_success() {
                    if let Ok(data) = response.json::<serde_json::Value>().await {
                        if let Some(free_str) = data.get("free").and_then(|f| f.as_str()) {
                            if let Ok(planck) = free_str.parse::<f64>() {
                                return Ok(planck / 10_000_000_000.0);
                            }
                        }
                    }
                }
            }

            // 3) Subscan account tokens
            let url3 = "https://polkadot.api.subscan.io/api/scan/account/tokens";
            let body3 = serde_json::json!({ "address": address });
            if let Ok(response) = client.post(url3)
                .header("Content-Type", "application/json")
                .json(&body3)
                .send().await
            {
                if response.status().is_success() {
                    if let Ok(data) = response.json::<serde_json::Value>().await {
                        if let Some(native_arr) = data.get("data").and_then(|d| d.get("native")).and_then(|n| n.as_array()) {
                            for token in native_arr {
                                let sym = token.get("symbol").and_then(|s| s.as_str()).unwrap_or("");
                                if sym == "DOT" {
                                    if let Some(bal_str) = token.get("balance").and_then(|b| b.as_str()) {
                                        if let Ok(bal) = bal_str.parse::<f64>() {
                                            return Ok(bal);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err("Balance DOT non trouvée — vérifiez l'adresse Polkadot (format SS58)".to_string())
        }

        // ── DOGE via Blockcypher + Blockchair ──
        "doge" => {
            println!("[DOGE] Fetching balance for: '{}'", address);

            // 1) Blockcypher
            let url1 = format!("https://api.blockcypher.com/v1/doge/main/addrs/{}/balance", address);
            println!("[DOGE] Try Blockcypher: {}", url1);
            if let Ok(resp) = client.get(&url1).send().await {
                if resp.status().is_success() {
                    if let Ok(data) = resp.json::<BlockcypherAddress>().await {
                        if let Some(bal) = data.final_balance.or(data.balance) {
                            println!("[DOGE] Blockcypher OK: {} satoshis", bal);
                            return Ok(bal as f64 / 100_000_000.0);
                        }
                    }
                }
            }

            // 2) Blockchair
            let url2 = format!("https://api.blockchair.com/dogecoin/dashboards/address/{}", address);
            println!("[DOGE] Try Blockchair: {}", url2);
            if let Ok(resp) = client.get(&url2).send().await {
                if resp.status().is_success() {
                    if let Ok(raw) = resp.json::<serde_json::Value>().await {
                        if let Some(data) = raw.get("data").and_then(|d| d.as_object()) {
                            for (_key, addr_data) in data {
                                if let Some(addr_info) = addr_data.get("address") {
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_i64()) {
                                        println!("[DOGE] Blockchair OK: {} satoshis", b);
                                        return Ok(b as f64 / 100_000_000.0);
                                    }
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_f64()) {
                                        return Ok(b / 100_000_000.0);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err("Balance DOGE non trouvée — vérifiez l'adresse".to_string())
        }

        // ── DASH via Blockchair ──
        "dash" => {
            println!("[DASH] Fetching balance for: '{}'", address);
            let url = format!("https://api.blockchair.com/dash/dashboards/address/{}", address);
            if let Ok(resp) = client.get(&url).send().await {
                if resp.status().is_success() {
                    if let Ok(raw) = resp.json::<serde_json::Value>().await {
                        if let Some(data) = raw.get("data").and_then(|d| d.as_object()) {
                            for (_key, addr_data) in data {
                                if let Some(addr_info) = addr_data.get("address") {
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_i64()) {
                                        println!("[DASH] Blockchair OK: {} duffs", b);
                                        return Ok(b as f64 / 100_000_000.0);
                                    }
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_f64()) {
                                        return Ok(b / 100_000_000.0);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err("Balance DASH non trouvée — vérifiez l'adresse".to_string())
        }

        // ── NEAR via RPC + nearblocks fallback ──
        "near" => {
            println!("[NEAR] Fetching balance for: '{}'", address);

            // 1) NEAR RPC mainnet (multiple endpoints)
            let near_body = serde_json::json!({
                "jsonrpc": "2.0",
                "id": "janus",
                "method": "query",
                "params": {
                    "request_type": "view_account",
                    "finality": "final",
                    "account_id": &address
                }
            });
            println!("[NEAR] Request body: {}", serde_json::to_string(&near_body).unwrap_or_default());
            let rpc_urls = [
                "https://rpc.mainnet.near.org",
                "https://rpc.fastnear.com",
                "https://near.lava.build",
            ];
            for rpc_url in rpc_urls {
                println!("[NEAR] Try RPC: {}", rpc_url);
                match client.post(rpc_url)
                    .header("Content-Type", "application/json")
                    .json(&near_body)
                    .send().await
                {
                    Ok(resp) => {
                        println!("[NEAR] RPC status: {}", resp.status());
                        if resp.status().is_success() {
                            if let Ok(data) = resp.json::<serde_json::Value>().await {
                                let resp_str: String = serde_json::to_string(&data).unwrap_or_default().chars().take(500).collect();
                                println!("[NEAR] RPC response: {}", resp_str);
                                if let Some(amount_str) = data.get("result")
                                    .and_then(|r| r.get("amount"))
                                    .and_then(|a| a.as_str())
                                {
                                    println!("[NEAR] Found amount: {}", amount_str);
                                    if let Ok(yocto) = amount_str.parse::<u128>() {
                                        let near_bal = yocto as f64 / 1_000_000_000_000_000_000_000_000.0;
                                        println!("[NEAR] RPC OK: {} NEAR", near_bal);
                                        return Ok(near_bal);
                                    }
                                }
                                if let Some(err) = data.get("error") {
                                    println!("[NEAR] RPC error: {:?}", err);
                                }
                            }
                        }
                    }
                    Err(e) => println!("[NEAR] RPC network error: {}", e),
                }
            }

            // 2) NearBlocks API fallback
            let url2 = format!("https://api.nearblocks.io/v1/account/{}", address);
            println!("[NEAR] Try NearBlocks: {}", url2);
            match client.get(&url2).send().await {
                Ok(resp) => {
                    println!("[NEAR] NearBlocks status: {}", resp.status());
                    if resp.status().is_success() {
                        if let Ok(data) = resp.json::<serde_json::Value>().await {
                            let resp_str: String = serde_json::to_string(&data).unwrap_or_default().chars().take(500).collect();
                            println!("[NEAR] NearBlocks response: {}", resp_str);
                            if let Some(acc_arr) = data.get("account").and_then(|a| a.as_array()) {
                                if let Some(first) = acc_arr.first() {
                                    if let Some(amount_str) = first.get("amount").and_then(|a| a.as_str()) {
                                        if let Ok(yocto) = amount_str.parse::<u128>() {
                                            let near_bal = yocto as f64 / 1_000_000_000_000_000_000_000_000.0;
                                            println!("[NEAR] NearBlocks OK: {} NEAR", near_bal);
                                            return Ok(near_bal);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => println!("[NEAR] NearBlocks network error: {}", e),
            }
            Err("Balance NEAR non trouvée — utilisez le nom de compte (ex: moncompte.near)".to_string())
        }

        // ── ADA via Koios (free, no API key) ──
        "ada" => {
            println!("[ADA] Fetching balance for: '{}'", address);
            let url = "https://api.koios.rest/api/v1/address_info";
            let body = serde_json::json!({ "_addresses": [address] });
            if let Ok(resp) = client.post(url)
                .header("Content-Type", "application/json")
                .json(&body)
                .send().await
            {
                println!("[ADA] Koios status: {}", resp.status());
                if resp.status().is_success() {
                    if let Ok(data) = resp.json::<serde_json::Value>().await {
                        // Returns array: [{ "balance": "123456789", ... }]
                        if let Some(arr) = data.as_array() {
                            if let Some(first) = arr.first() {
                                if let Some(bal_str) = first.get("balance").and_then(|b| b.as_str()) {
                                    if let Ok(lovelace) = bal_str.parse::<f64>() {
                                        let ada_bal = lovelace / 1_000_000.0;
                                        println!("[ADA] Koios OK: {} ADA", ada_bal);
                                        return Ok(ada_bal);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: Blockfrost public (limited)
            let url2 = format!("https://cardano-mainnet.blockfrost.io/api/v0/addresses/{}", address);
            if let Ok(resp) = client.get(&url2)
                .header("project_id", "mainnetpublic")
                .send().await
            {
                if resp.status().is_success() {
                    if let Ok(data) = resp.json::<serde_json::Value>().await {
                        if let Some(amounts) = data.get("amount").and_then(|a| a.as_array()) {
                            for item in amounts {
                                if item.get("unit").and_then(|u| u.as_str()) == Some("lovelace") {
                                    if let Some(qty_str) = item.get("quantity").and_then(|q| q.as_str()) {
                                        if let Ok(lovelace) = qty_str.parse::<f64>() {
                                            return Ok(lovelace / 1_000_000.0);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err("Balance ADA non trouvée — vérifiez l'adresse (format addr1...)".to_string())
        }

        // ── QTUM via qtum.info ──
        "qtum" => {
            println!("[QTUM] Fetching balance for: '{}'", address);
            let url = format!("https://qtum.info/api/address/{}", address);
            if let Ok(resp) = client.get(&url).send().await {
                println!("[QTUM] Status: {}", resp.status());
                if resp.status().is_success() {
                    if let Ok(data) = resp.json::<serde_json::Value>().await {
                        // balance is string like "123.45678900"
                        if let Some(bal_str) = data.get("balance").and_then(|b| b.as_str()) {
                            if let Ok(bal) = bal_str.parse::<f64>() {
                                println!("[QTUM] OK: {} QTUM", bal);
                                return Ok(bal);
                            }
                        }
                    }
                }
            }

            // Fallback: Blockchair
            let url2 = format!("https://api.blockchair.com/qtum/dashboards/address/{}", address);
            if let Ok(resp) = client.get(&url2).send().await {
                if resp.status().is_success() {
                    if let Ok(raw) = resp.json::<serde_json::Value>().await {
                        if let Some(data) = raw.get("data").and_then(|d| d.as_object()) {
                            for (_key, addr_data) in data {
                                if let Some(addr_info) = addr_data.get("address") {
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_i64()) {
                                        return Ok(b as f64 / 100_000_000.0);
                                    }
                                    if let Some(b) = addr_info.get("balance").and_then(|v| v.as_f64()) {
                                        return Ok(b / 100_000_000.0);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Err("Balance QTUM non trouvée — vérifiez l'adresse".to_string())
        }

        // ── AVAX via C-Chain RPC (primary) + Routescan (fallback) ──
        "avax" => {
            println!("[AVAX] Fetching balance for: '{}'", address);

            // 1) Direct C-Chain JSON-RPC (eth_getBalance) — multiple endpoints
            let avax_body = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "eth_getBalance",
                "params": [&address, "latest"],
                "id": 1
            });
            let avax_rpcs = [
                "https://api.avax.network/ext/bc/C/rpc",
                "https://avalanche-c-chain-rpc.publicnode.com",
            ];
            for rpc_url in avax_rpcs {
                println!("[AVAX] Try RPC: {}", rpc_url);
                match client.post(rpc_url)
                    .header("Content-Type", "application/json")
                    .json(&avax_body)
                    .send().await
                {
                    Ok(resp) => {
                        println!("[AVAX] RPC status: {}", resp.status());
                        if resp.status().is_success() {
                            if let Ok(data) = resp.json::<serde_json::Value>().await {
                                let resp_str: String = serde_json::to_string(&data).unwrap_or_default().chars().take(300).collect();
                                println!("[AVAX] RPC response: {}", resp_str);
                                if let Some(hex_str) = data.get("result").and_then(|r| r.as_str()) {
                                    let hex_clean = hex_str.trim_start_matches("0x");
                                    if !hex_clean.is_empty() {
                                        if let Ok(wei) = u128::from_str_radix(hex_clean, 16) {
                                            let avax_bal = wei as f64 / 1_000_000_000_000_000_000.0;
                                            println!("[AVAX] RPC OK: {} AVAX", avax_bal);
                                            return Ok(avax_bal);
                                        }
                                    }
                                }
                                if let Some(err) = data.get("error") {
                                    println!("[AVAX] RPC error: {:?}", err);
                                }
                            }
                        }
                    }
                    Err(e) => println!("[AVAX] RPC network error: {}", e),
                }
            }

            // 2) Routescan fallback (Etherscan-compatible)
            let url2 = format!(
                "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api?module=account&action=balance&address={}&tag=latest",
                address
            );
            println!("[AVAX] Try Routescan: {}", url2);
            match client.get(&url2).send().await {
                Ok(resp) => {
                    println!("[AVAX] Routescan status: {}", resp.status());
                    if resp.status().is_success() {
                        if let Ok(data) = resp.json::<serde_json::Value>().await {
                            println!("[AVAX] Routescan response: {}", serde_json::to_string(&data).unwrap_or_default().chars().take(300).collect::<String>());
                            if data.get("status").and_then(|s| s.as_str()) == Some("1") {
                                if let Some(result) = data.get("result").and_then(|r| r.as_str()) {
                                    if let Ok(wei) = result.parse::<u128>() {
                                        let avax_bal = wei as f64 / 1_000_000_000_000_000_000.0;
                                        println!("[AVAX] Routescan OK: {} AVAX", avax_bal);
                                        return Ok(avax_bal);
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => println!("[AVAX] Routescan network error: {}", e),
            }
            Err("Balance AVAX non trouvée — utilisez une adresse C-Chain (0x...)".to_string())
        }

        // ── XRP via XRPL public JSON-RPC ──
        "xrp" => {
            println!("[XRP] Fetching balance for: '{}'", address);
            let body = serde_json::json!({
                "method": "account_info",
                "params": [{
                    "account": address,
                    "strict": true,
                    "ledger_index": "current"
                }]
            });

            // 1) Ripple public node
            let url1 = "https://s1.ripple.com:51234/";
            if let Ok(resp) = client.post(url1)
                .header("Content-Type", "application/json")
                .json(&body)
                .send().await
            {
                if resp.status().is_success() {
                    if let Ok(data) = resp.json::<serde_json::Value>().await {
                        if let Some(balance_str) = data
                            .get("result")
                            .and_then(|r| r.get("account_data"))
                            .and_then(|a| a.get("Balance"))
                            .and_then(|b| b.as_str())
                        {
                            if let Ok(drops) = balance_str.parse::<f64>() {
                                let xrp_bal = drops / 1_000_000.0;
                                println!("[XRP] Ripple OK: {} XRP", xrp_bal);
                                return Ok(xrp_bal);
                            }
                        }
                    }
                }
            }

            // 2) XRPL cluster fallback
            let url2 = "https://xrplcluster.com/";
            if let Ok(resp) = client.post(url2)
                .header("Content-Type", "application/json")
                .json(&body)
                .send().await
            {
                if resp.status().is_success() {
                    if let Ok(data) = resp.json::<serde_json::Value>().await {
                        if let Some(balance_str) = data
                            .get("result")
                            .and_then(|r| r.get("account_data"))
                            .and_then(|a| a.get("Balance"))
                            .and_then(|b| b.as_str())
                        {
                            if let Ok(drops) = balance_str.parse::<f64>() {
                                return Ok(drops / 1_000_000.0);
                            }
                        }
                    }
                }
            }
            Err("Balance XRP non trouvée — vérifiez l'adresse (format r...)".to_string())
        }

        // ── SOL via Solana JSON-RPC ──
        "sol" => {
            println!("[SOL] Fetching balance for: '{}'", address);
            let sol_body = serde_json::json!({
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getBalance",
                "params": [&address]
            });
            println!("[SOL] Request body: {}", serde_json::to_string(&sol_body).unwrap_or_default());
            let rpc_urls = [
                "https://api.mainnet-beta.solana.com",
                "https://solana-rpc.publicnode.com",
            ];
            for rpc_url in rpc_urls {
                println!("[SOL] Try RPC: {}", rpc_url);
                match client.post(rpc_url)
                    .header("Content-Type", "application/json")
                    .json(&sol_body)
                    .send().await
                {
                    Ok(resp) => {
                        println!("[SOL] RPC status: {}", resp.status());
                        if resp.status().is_success() {
                            if let Ok(data) = resp.json::<serde_json::Value>().await {
                                let resp_str: String = serde_json::to_string(&data).unwrap_or_default().chars().take(500).collect();
                                println!("[SOL] RPC response: {}", resp_str);
                                // { "result": { "context": {...}, "value": 123456789 } }
                                if let Some(lamports) = data.get("result")
                                    .and_then(|r| r.get("value"))
                                    .and_then(|v| v.as_u64())
                                {
                                    let sol_bal = lamports as f64 / 1_000_000_000.0;
                                    println!("[SOL] RPC OK: {} SOL", sol_bal);
                                    return Ok(sol_bal);
                                }
                                if let Some(err) = data.get("error") {
                                    println!("[SOL] RPC error: {:?}", err);
                                }
                            }
                        }
                    }
                    Err(e) => println!("[SOL] RPC network error: {}", e),
                }
            }
            Err("Balance SOL non trouvée — vérifiez la clé publique Solana".to_string())
        }

        // ── Manual only ──
        "pivx" => Err("PIVX: saisie manuelle requise".to_string()),

        _ => Err(format!("Asset non supporté: {}", asset)),
    }
}

// ============================================================================
// COMMANDES TAURI - PROFILES (SAVE / LOAD / RESET / LIST)
// ============================================================================

fn get_profiles_dir() -> std::path::PathBuf {
    let dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("janus-monitor")
        .join("profiles");
    std::fs::create_dir_all(&dir).ok();
    dir
}

#[tauri::command]
fn list_profiles() -> Result<Vec<String>, String> {
    let dir = get_profiles_dir();
    let mut profiles = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".json") {
                    profiles.push(name.trim_end_matches(".json").to_string());
                }
            }
        }
    }
    profiles.sort();
    Ok(profiles)
}

#[tauri::command]
fn save_profile(state: State<DbState>, name: String, theme: Option<String>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, category, asset, name, address, balance FROM wallets ORDER BY id")
        .map_err(|e| e.to_string())?;
    let wallets: Vec<Wallet> = stmt
        .query_map([], |row| {
            Ok(Wallet {
                id: row.get(0)?,
                category: row.get(1)?,
                asset: row.get(2)?,
                name: row.get(3)?,
                address: row.get(4)?,
                balance: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let data = ProfileData { wallets, theme };
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    let path = get_profiles_dir().join(format!("{}.json", name));
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_profile(state: State<DbState>, name: String) -> Result<LoadProfileResult, String> {
    let path = get_profiles_dir().join(format!("{}.json", name));
    let json = std::fs::read_to_string(&path).map_err(|e| format!("Profil introuvable: {}", e))?;

    // Try new format (ProfileData with theme) first, then old format (Vec<Wallet>)
    let (wallets, saved_theme) = if let Ok(data) = serde_json::from_str::<ProfileData>(&json) {
        (data.wallets, data.theme)
    } else {
        let wallets: Vec<Wallet> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        (wallets, None)
    };

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM wallets", []).map_err(|e| e.to_string())?;
    for w in wallets {
        conn.execute(
            "INSERT INTO wallets (category, asset, name, address, balance) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![w.category, w.asset, w.name, w.address, w.balance],
        ).map_err(|e| e.to_string())?;
    }
    Ok(LoadProfileResult { theme: saved_theme })
}

#[tauri::command]
fn delete_profile(name: String) -> Result<(), String> {
    let path = get_profiles_dir().join(format!("{}.json", name));
    std::fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn reset_wallets(state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM wallets", []).map_err(|e| e.to_string())?;

    // Re-insert default template
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('bitcoin', 'btc', 'Cold Wallet 1', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('bitcoin', 'btc', 'Cold Wallet 2', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('bitcoin', 'btc', 'Cold Wallet 3', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'xmr', 'Monero Reserve 1', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'xmr', 'Monero Reserve 2', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'bch', 'BCH Wallet 1', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'bch', 'BCH Wallet 2', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('hedging', 'ltc', 'LTC Wallet', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('altcoins', 'eth', 'Ethereum Wallet', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('altcoins', 'uni', 'Uniswap Wallet', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('altcoins', 'sol', 'Solana Wallet', '')", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category, asset, name, address) VALUES ('altcoins', 'near', 'NEAR Wallet', '')", []).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// RUN
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).expect("Impossible d'ouvrir la base de données");
    init_db(&conn).expect("Impossible d'initialiser la base de données");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            get_wallets,
            update_wallet,
            add_wallet,
            delete_wallet,
            get_prices,
            fetch_balance,
            get_altcoins_list,
            get_settings,
            save_settings,
            get_setting,
            set_setting,
            list_profiles,
            save_profile,
            load_profile,
            delete_profile,
            reset_wallets,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application");
}
