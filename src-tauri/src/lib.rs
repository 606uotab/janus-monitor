use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use sodiumoxide::crypto::secretbox;
use hex;
use lazy_static::lazy_static;
use reqwest;

mod pin_security;
mod input_validation;

// 
// SECURE LOGGING SYSTEM
// 

lazy_static! {
    static ref LOG_KEY: secretbox::Key = {
        // In production, this should come from a secure source
        // For now, we'll generate a key at startup
        secretbox::gen_key()
    };
}

/// Secure logger that encrypts sensitive information
fn secure_log(message: &str, sensitive_data: &str) {
    // ✅ FIXED: Generate unique nonce per message (was reusing single nonce)
    let nonce = secretbox::gen_nonce();
    let encrypted = secretbox::seal(sensitive_data.as_bytes(), &nonce, &LOG_KEY);

    // Prepend nonce to ciphertext for later decryption
    let mut result = Vec::with_capacity(secretbox::NONCEBYTES + encrypted.len());
    result.extend_from_slice(nonce.as_ref());
    result.extend_from_slice(&encrypted);

    let encrypted_hex = hex::encode(&result);
    println!("[SECURE_LOG] {} [ENCRYPTED: {}]", message, encrypted_hex);
}

/// Log sensitive address information
fn log_address(tag: &str, address: &str) {
    if address.is_empty() {
        println!("[{}][EMPTY_ADDRESS]", tag);
        return;
    }
    
    // Only show first 6 and last 4 characters in clear
    let display_addr = if address.len() > 10 {
        format!("{}...{}", &address[..6], &address[address.len()-4..])
    } else {
        "[SHORT_ADDR]".to_string()
    };
    
    secure_log(&format!("[{}] Address", tag), address);
    println!("[{}] Display address: {}", tag, display_addr);
}

/// Log sensitive balance information
fn log_balance(tag: &str, balance: f64) {
    // Round to 8 decimal places to avoid precision leaks
    let rounded = (balance * 100_000_000.0).round() / 100_000_000.0;
    let balance_str = rounded.to_string();
    
    // Only show first 6 characters of the balance in clear
    let display_balance = if balance_str.len() > 6 {
        format!("{:.6}", rounded)
    } else {
        balance_str.clone()
    };
    
    secure_log(&format!("[{}] Balance", tag), &balance_str);
    println!("[{}] Display balance: {}", tag, display_balance);
}

/// Log API responses in a secure way (truncated and without sensitive data)
fn log_api_response(tag: &str, response: &str, max_length: usize) {
    // Only show first 100 characters and mask any potential sensitive data
    let truncated = if response.len() > max_length {
        format!("{}...", &response[..max_length])
    } else {
        response.to_string()
    };
    
    // Mask potential API keys, addresses, etc.
    let masked = truncated
        .replace(|c: char| c.is_ascii_hexdigit(), "*")
        .replace(|c: char| c.is_numeric(), "*");
    
    println!("[{}] API response (masked): {}", tag, masked);
    
    // Also log the full response encrypted
    secure_log(&format!("[{}] Full API response", tag), response);
}

// 
// STRUCTURES DE DONNÉES V2
// 

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub bar_color: String,
    pub display_order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Wallet {
    pub id: i64,
    pub category_id: i64,
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
    categories: Vec<Category>,
    wallets: Vec<Wallet>,
    #[serde(default)]
    theme: Option<String>,
}

#[derive(Debug, Serialize)]
struct LoadProfileResult {
    theme: Option<String>,
}

// 
// PHASE 3: PENDING TRANSACTIONS MONITORING
// 
// 
// PHASE 3 : PENDING TRANSACTIONS MONITORING
// À ajouter dans lib.rs après les structures existantes
// 

use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex as TokioMutex;
use tokio::time::{interval, Duration};
use tauri::AppHandle;
use tauri::Emitter;  // ✨ AJOUTER CETTE LIGNE
use chrono::{Utc, NaiveDateTime};

// Structure pour une transaction en attente
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingTransaction {
    pub tx_hash: String,
    pub wallet_id: i64,
    pub wallet_name: String,
    pub asset: String,
    pub address: String,
    pub amount: f64,
    pub confirmations: u32,
    pub required_confirmations: u32,
    pub timestamp: i64, // Unix timestamp
    pub completed: bool,
}

// État du système de monitoring
pub struct MonitoringState {
    pub enabled: bool,
    pub pending_txs: Vec<PendingTransaction>,
    pub monitored_addresses: HashMap<String, MonitoredWallet>, // address -> wallet info
}

#[derive(Clone)]
pub struct MonitoredWallet {
    pub wallet_id: i64,
    pub wallet_name: String,
    pub asset: String,
    pub last_check: i64,
}

impl Default for MonitoringState {
    fn default() -> Self {
        Self {
            enabled: true,
            pending_txs: Vec::new(),
            monitored_addresses: HashMap::new(),
        }
    }
}

// 
// COMMANDES TAURI - PENDING TRANSACTIONS
// 

#[tauri::command]
fn get_pending_transactions(
    monitoring_state: State<Arc<TokioMutex<MonitoringState>>>,
) -> Result<Vec<PendingTransaction>, String> {
    // Utiliser block_on car on est dans un contexte sync
    let state = tauri::async_runtime::block_on(async {
        monitoring_state.lock().await
    });
    
    Ok(state.pending_txs.clone())
}

#[tauri::command]
fn set_monitoring_enabled(
    monitoring_state: State<Arc<TokioMutex<MonitoringState>>>,
    db_state: State<DbState>,
    enabled: bool,
) -> Result<(), String> {
    // Mettre à jour l'état
    tauri::async_runtime::block_on(async {
        let mut state = monitoring_state.lock().await;
        state.enabled = enabled;
    });
    
    // Sauvegarder dans la DB
    let conn = db_state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('monitoring_enabled', ?1)",
        params![if enabled { "true" } else { "false" }],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn start_monitoring_wallet(
    monitoring_state: State<Arc<TokioMutex<MonitoringState>>>,
    wallet_id: i64,
    address: String,
    asset: String,
    wallet_name: String,
) -> Result<(), String> {
    if address.trim().is_empty() {
        return Ok(()); // Pas d'adresse, rien à monitorer
    }

    input_validation::validate_asset(&asset)?;
    input_validation::validate_address(&asset, &address)?;
    log_address("MONITOR_START", &address);

    tauri::async_runtime::block_on(async {
        let mut state = monitoring_state.lock().await;
        
        state.monitored_addresses.insert(
            address.clone(),
            MonitoredWallet {
                wallet_id,
                wallet_name,
                asset: asset.to_lowercase(),
                last_check: 0,
            },
        );
    });
    
    Ok(())
}

#[tauri::command]
fn stop_monitoring_wallet(
    monitoring_state: State<Arc<TokioMutex<MonitoringState>>>,
    address: String,
) -> Result<(), String> {
    tauri::async_runtime::block_on(async {
        let mut state = monitoring_state.lock().await;
        state.monitored_addresses.remove(&address);
        
        // Retirer aussi les pending TX de cette adresse
        state.pending_txs.retain(|tx| tx.address != address);
    });
    
    Ok(())
}

#[tauri::command]
fn clear_pending_transaction(
    monitoring_state: State<Arc<TokioMutex<MonitoringState>>>,
    tx_hash: String,
) -> Result<(), String> {
    tauri::async_runtime::block_on(async {
        let mut state = monitoring_state.lock().await;
        state.pending_txs.retain(|tx| tx.tx_hash != tx_hash);
    });
    
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TxHistoryEntry {
    pub id: i64,
    pub tx_hash: String,
    pub wallet_id: i64,
    pub asset: String,
    pub address: String,
    pub amount: f64,
    pub confirmations: u32,
    pub timestamp: i64,
    pub completed_at: i64,
}

#[tauri::command]
fn get_tx_history(state: State<DbState>, limit: Option<u32>) -> Result<Vec<TxHistoryEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(50);
    let mut stmt = conn.prepare(
        "SELECT id, tx_hash, wallet_id, asset, address, amount, confirmations, timestamp, completed_at FROM tx_history ORDER BY completed_at DESC LIMIT ?1"
    ).map_err(|e| e.to_string())?;
    let entries = stmt.query_map(params![lim], |row| {
        Ok(TxHistoryEntry {
            id: row.get(0)?,
            tx_hash: row.get(1)?,
            wallet_id: row.get(2)?,
            asset: row.get(3)?,
            address: row.get(4)?,
            amount: row.get(5)?,
            confirmations: row.get::<_, i64>(6)? as u32,
            timestamp: row.get(7)?,
            completed_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(entries)
}

// 
// BLOCKCHAIN TX HISTORY (DIRECT FETCH)
// 

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryTx {
    pub tx_hash: String,
    pub asset: String,
    pub address: String,
    pub wallet_name: String,
    pub amount: f64,
    pub direction: String, // "in" or "out"
    pub from_address: String,
    pub to_address: String,
    pub confirmations: u32,
    pub timestamp: i64,
    pub block_height: u64,
}

#[tauri::command]
async fn fetch_address_history(
    address: String,
    asset: String,
    wallet_name: String,
    etherscan_key: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<HistoryTx>, String> {
    let lim = limit.unwrap_or(10) as usize;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    match asset.as_str() {
        "btc" => fetch_btc_history(&client, &address, &wallet_name, lim).await,
        "eth" => fetch_eth_history(&client, &address, &wallet_name, &etherscan_key.unwrap_or_default(), lim).await,
        "ltc" => fetch_blockchair_history(&client, &address, &wallet_name, "litecoin", "ltc", lim).await,
        "bch" => fetch_blockchair_history(&client, &address, &wallet_name, "bitcoin-cash", "bch", lim).await,
        "dot" => fetch_dot_history(&client, &address, &wallet_name, lim).await,
        "etc" => fetch_etc_history(&client, &address, &wallet_name, lim).await,
        _ => Ok(vec![]),
    }
}

async fn fetch_btc_history(
    client: &reqwest::Client,
    address: &str,
    wallet_name: &str,
    limit: usize,
) -> Result<Vec<HistoryTx>, String> {
    let tip_height: u64 = client
        .get("https://blockstream.info/api/blocks/tip/height")
        .send().await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?
        .trim().parse().map_err(|e: std::num::ParseIntError| e.to_string())?;

    let url = format!("https://blockstream.info/api/address/{}/txs", address);
    let resp: serde_json::Value = client
        .get(&url).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let txs = resp.as_array().ok_or("Invalid BTC response")?;
    let mut results = Vec::new();

    for tx in txs.iter().take(limit) {
        let hash = tx["txid"].as_str().unwrap_or_default().to_string();
        let status = &tx["status"];
        let confirmed = status["confirmed"].as_bool().unwrap_or(false);
        let block_h = status["block_height"].as_u64().unwrap_or(0);
        let timestamp = status["block_time"].as_i64().unwrap_or(0);
        let confs = if confirmed && block_h > 0 { (tip_height - block_h + 1) as u32 } else { 0 };

        // Calculate amount for this address
        let mut received: f64 = 0.0;
        let mut sent: f64 = 0.0;
        if let Some(vouts) = tx["vout"].as_array() {
            for vout in vouts {
                if vout["scriptpubkey_address"].as_str() == Some(address) {
                    received += vout["value"].as_u64().unwrap_or(0) as f64 / 1e8;
                }
            }
        }
        if let Some(vins) = tx["vin"].as_array() {
            for vin in vins {
                if vin["prevout"]["scriptpubkey_address"].as_str() == Some(address) {
                    sent += vin["prevout"]["value"].as_u64().unwrap_or(0) as f64 / 1e8;
                }
            }
        }
        let net = received - sent;
        let (amount, direction) = if net >= 0.0 { (net, "in") } else { (net.abs(), "out") };

        // Extract from/to addresses
        let first_sender = tx["vin"].as_array()
            .and_then(|vins| vins.first())
            .and_then(|v| v["prevout"]["scriptpubkey_address"].as_str())
            .unwrap_or_default().to_string();
        let first_recipient = tx["vout"].as_array()
            .and_then(|vouts| vouts.iter().find(|v| v["scriptpubkey_address"].as_str() != Some(address)))
            .or_else(|| tx["vout"].as_array().and_then(|v| v.first()))
            .and_then(|v| v["scriptpubkey_address"].as_str())
            .unwrap_or_default().to_string();
        let (from_addr, to_addr) = if direction == "in" {
            (first_sender, address.to_string())
        } else {
            (address.to_string(), first_recipient)
        };

        results.push(HistoryTx {
            tx_hash: hash,
            asset: "btc".into(),
            address: address.to_string(),
            wallet_name: wallet_name.to_string(),
            amount,
            direction: direction.into(),
            from_address: from_addr,
            to_address: to_addr,
            confirmations: confs,
            timestamp,
            block_height: block_h,
        });
    }
    Ok(results)
}

async fn fetch_eth_history(
    client: &reqwest::Client,
    address: &str,
    wallet_name: &str,
    api_key: &str,
    limit: usize,
) -> Result<Vec<HistoryTx>, String> {
    if api_key.is_empty() {
        return Err("Etherscan API key required".into());
    }
    let url = format!(
        "https://api.etherscan.io/api?module=account&action=txlist&address={}&startblock=0&endblock=99999999&page=1&offset={}&sort=desc&apikey={}",
        address, limit, api_key
    );
    let resp: serde_json::Value = client.get(&url).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let tip_url = format!(
        "https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey={}", api_key
    );
    let tip_resp: serde_json::Value = client.get(&tip_url).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let tip_hex = tip_resp["result"].as_str().unwrap_or("0x0").trim_start_matches("0x");
    let tip_height = u64::from_str_radix(tip_hex, 16).unwrap_or(0);

    let txs = resp["result"].as_array().ok_or("Invalid ETH response")?;
    let addr_lower = address.to_lowercase();
    let mut results = Vec::new();

    for tx in txs.iter().take(limit) {
        let hash = tx["hash"].as_str().unwrap_or_default().to_string();
        let from = tx["from"].as_str().unwrap_or_default().to_lowercase();
        let to = tx["to"].as_str().unwrap_or_default().to_lowercase();
        let value_str = tx["value"].as_str().unwrap_or("0");
        let value_wei: f64 = value_str.parse().unwrap_or(0.0);
        let amount = value_wei / 1e18;
        let block_h: u64 = tx["blockNumber"].as_str().unwrap_or("0").parse().unwrap_or(0);
        let timestamp: i64 = tx["timeStamp"].as_str().unwrap_or("0").parse().unwrap_or(0);
        let confs = if block_h > 0 { (tip_height - block_h + 1) as u32 } else { 0 };
        let direction = if to == addr_lower { "in" } else { "out" };

        results.push(HistoryTx {
            tx_hash: hash,
            asset: "eth".into(),
            address: address.to_string(),
            wallet_name: wallet_name.to_string(),
            amount,
            direction: direction.into(),
            from_address: from,
            to_address: to,
            confirmations: confs,
            timestamp,
            block_height: block_h,
        });
    }
    Ok(results)
}

async fn fetch_blockchair_history(
    client: &reqwest::Client,
    address: &str,
    wallet_name: &str,
    chain: &str,
    asset: &str,
    limit: usize,
) -> Result<Vec<HistoryTx>, String> {
    let url = format!(
        "https://api.blockchair.com/{}/dashboards/address/{}?transaction_details=true&limit={}", chain, address, limit
    );
    let resp: serde_json::Value = client.get(&url).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let data = &resp["data"];
    let addr_data = data.as_object()
        .and_then(|m| m.values().next())
        .ok_or("Invalid Blockchair response")?;

    let txs = addr_data["transactions"].as_array().ok_or("No transactions")?;
    let mut results = Vec::new();

    for tx in txs.iter().take(limit) {
        let hash = tx["hash"].as_str().unwrap_or_default().to_string();
        let balance_change = tx["balance_change"].as_f64().unwrap_or(0.0);
        let amount = (balance_change.abs()) / 1e8;
        let direction = if balance_change >= 0.0 { "in" } else { "out" };
        let block_h = tx["block_id"].as_u64().unwrap_or(0);
        let time_str = tx["time"].as_str().unwrap_or_default();
        let timestamp = NaiveDateTime::parse_from_str(time_str, "%Y-%m-%d %H:%M:%S")
            .map(|dt| dt.and_utc().timestamp())
            .unwrap_or(0);

        results.push(HistoryTx {
            tx_hash: hash,
            asset: asset.to_string(),
            address: address.to_string(),
            wallet_name: wallet_name.to_string(),
            amount,
            direction: direction.into(),
            from_address: if balance_change >= 0.0 { String::new() } else { address.to_string() },
            to_address: if balance_change >= 0.0 { address.to_string() } else { String::new() },
            confirmations: 9999,
            timestamp,
            block_height: block_h,
        });
    }
    Ok(results)
}

async fn fetch_dot_history(
    client: &reqwest::Client,
    address: &str,
    wallet_name: &str,
    limit: usize,
) -> Result<Vec<HistoryTx>, String> {
    let url = "https://polkadot.api.subscan.io/api/scan/transfers";
    let body = serde_json::json!({
        "address": address,
        "row": limit,
        "page": 0
    });
    let resp: serde_json::Value = client.post(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let transfers = resp["data"]["transfers"].as_array();
    let mut results = Vec::new();
    let addr_lower = address.to_lowercase();

    if let Some(txs) = transfers {
        for tx in txs.iter().take(limit) {
            let hash = tx["hash"].as_str().unwrap_or_default().to_string();
            let from = tx["from"].as_str().unwrap_or_default().to_lowercase();
            let to_addr = tx["to"].as_str().unwrap_or_default().to_lowercase();
            let amount_str = tx["amount"].as_str().unwrap_or("0");
            let amount: f64 = amount_str.parse().unwrap_or(0.0);
            let direction = if from == addr_lower { "out" } else { "in" };
            let block_h = tx["block_num"].as_u64().unwrap_or(0);
            let timestamp = tx["block_timestamp"].as_i64().unwrap_or(0);

            results.push(HistoryTx {
                tx_hash: hash,
                asset: "dot".into(),
                address: address.to_string(),
                wallet_name: wallet_name.to_string(),
                amount,
                direction: direction.into(),
                from_address: from,
                to_address: to_addr,
                confirmations: 9999,
                timestamp,
                block_height: block_h,
            });
        }
    }
    Ok(results)
}

async fn fetch_etc_history(
    client: &reqwest::Client,
    address: &str,
    wallet_name: &str,
    limit: usize,
) -> Result<Vec<HistoryTx>, String> {
    let url = format!(
        "https://blockscout.com/etc/mainnet/api?module=account&action=txlist&address={}&page=1&offset={}&sort=desc",
        address, limit
    );
    let resp: serde_json::Value = client.get(&url).send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;

    let txs = resp["result"].as_array().ok_or("Invalid ETC response")?;
    let addr_lower = address.to_lowercase();
    let mut results = Vec::new();

    for tx in txs.iter().take(limit) {
        let hash = tx["hash"].as_str().unwrap_or_default().to_string();
        let from = tx["from"].as_str().unwrap_or_default().to_lowercase();
        let to = tx["to"].as_str().unwrap_or_default().to_lowercase();
        let value_str = tx["value"].as_str().unwrap_or("0");
        let value_wei: f64 = value_str.parse().unwrap_or(0.0);
        let amount = value_wei / 1e18;
        let block_h: u64 = tx["blockNumber"].as_str().unwrap_or("0").parse().unwrap_or(0);
        let timestamp: i64 = tx["timeStamp"].as_str().unwrap_or("0").parse().unwrap_or(0);
        let direction = if to == addr_lower { "in" } else { "out" };

        results.push(HistoryTx {
            tx_hash: hash,
            asset: "etc".into(),
            address: address.to_string(),
            wallet_name: wallet_name.to_string(),
            amount,
            direction: direction.into(),
            from_address: from,
            to_address: to,
            confirmations: 9999,
            timestamp,
            block_height: block_h,
        });
    }
    Ok(results)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfileSecurity {
    pub has_pin: bool,
    pub inactivity_minutes: u32,
}

#[tauri::command]
fn get_profile_security(state: State<DbState>, profile_name: String) -> Result<ProfileSecurity, String> {
    input_validation::validate_profile_name(&profile_name)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    match conn.query_row(
        "SELECT pin_hash, inactivity_minutes FROM profile_security WHERE profile_name = ?1",
        params![profile_name],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
    ) {
        Ok((_, mins)) => Ok(ProfileSecurity { has_pin: true, inactivity_minutes: mins as u32 }),
        Err(_) => Ok(ProfileSecurity { has_pin: false, inactivity_minutes: 0 }),
    }
}

// ✅ PATCHED: Argon2id server-side hashing (was receiving pre-hashed SHA-256)
#[tauri::command]
fn set_profile_pin(state: State<DbState>, profile_name: String, raw_pin: String, inactivity_minutes: Option<u32>) -> Result<(), String> {
    input_validation::validate_profile_name(&profile_name)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mins = inactivity_minutes.unwrap_or(0) as i64;
    if raw_pin == "__KEEP__" {
        conn.execute(
            "UPDATE profile_security SET inactivity_minutes = ?1 WHERE profile_name = ?2",
            params![mins, profile_name],
        ).map_err(|e| e.to_string())?;
    } else {
        let argon2_hash = pin_security::hash_pin(&raw_pin)?;
        conn.execute(
            "INSERT OR REPLACE INTO profile_security (profile_name, pin_hash, inactivity_minutes) VALUES (?1, ?2, ?3)",
            params![profile_name, argon2_hash, mins],
        ).map_err(|e| e.to_string())?;
        println!("[SECURITY] PIN set for profile '{}' using Argon2id", profile_name);
    }
    Ok(())
}

// ✅ PATCHED: Argon2id + rate limiting + legacy migration (was SHA-256 == compare)
#[tauri::command]
fn verify_profile_pin(state: State<DbState>, profile_name: String, raw_pin: String) -> Result<bool, String> {
    input_validation::validate_profile_name(&profile_name)?;
    if raw_pin.is_empty() { return Err("PIN cannot be empty".to_string()); }

    // Rate limit check
    pin_security::check_rate_limit(&profile_name)?;

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let stored_hash = match conn.query_row(
        "SELECT pin_hash FROM profile_security WHERE profile_name = ?1",
        params![profile_name],
        |row| row.get::<_, String>(0),
    ) {
        Ok(hash) => hash,
        Err(_) => return Ok(true), // No PIN set = always valid
    };

    // Legacy SHA-256 migration
    if pin_security::is_legacy_sha256_hash(&stored_hash) {
        let legacy_hash = sha256_hex(&raw_pin);
        if legacy_hash == stored_hash {
            let new_hash = pin_security::migrate_pin_hash(&raw_pin)?;
            conn.execute(
                "UPDATE profile_security SET pin_hash = ?1 WHERE profile_name = ?2",
                params![new_hash, profile_name],
            ).map_err(|e| e.to_string())?;
            println!("[SECURITY] Migrated '{}' from SHA-256 to Argon2id", profile_name);
            pin_security::record_successful_attempt(&profile_name)?;
            return Ok(true);
        } else {
            let remaining = pin_security::record_failed_attempt(&profile_name)?;
            if remaining > 0 {
                println!("[SECURITY] Failed PIN for '{}' ({} remaining)", profile_name, remaining);
            }
            return Ok(false);
        }
    }

    // Argon2id verification (constant-time)
    let is_valid = pin_security::verify_pin(&raw_pin, &stored_hash)?;
    if is_valid {
        pin_security::record_successful_attempt(&profile_name)?;
    } else {
        let remaining = pin_security::record_failed_attempt(&profile_name)?;
        if remaining > 0 {
            println!("[SECURITY] Failed PIN for '{}' ({} remaining)", profile_name, remaining);
        }
    }
    Ok(is_valid)
}

// SHA-256 helper for legacy migration only
fn sha256_hex(input: &str) -> String {
    let hash = sodiumoxide::crypto::hash::sha256::hash(input.as_bytes());
    hex::encode(hash.as_ref())
}

// ✅ NEW: Rate limit status for frontend feedback
#[derive(Debug, Serialize)]
pub struct PinStatus {
    pub is_locked: bool,
    pub max_attempts: u32,
    pub retry_after_secs: u64,
}

#[tauri::command]
fn get_pin_status(profile_name: String) -> Result<PinStatus, String> {
    input_validation::validate_profile_name(&profile_name)?;
    match pin_security::check_rate_limit(&profile_name) {
        Ok(()) => Ok(PinStatus { is_locked: false, max_attempts: 10, retry_after_secs: 0 }),
        Err(msg) => {
            let secs = msg.split_whitespace().filter_map(|w: &str| w.parse::<u64>().ok()).next().unwrap_or(0);
            Ok(PinStatus { is_locked: secs > 60, max_attempts: 10, retry_after_secs: secs })
        }
    }
}

#[tauri::command]
fn remove_profile_pin(state: State<DbState>, profile_name: String) -> Result<(), String> {
    input_validation::validate_profile_name(&profile_name)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM profile_security WHERE profile_name = ?1", params![profile_name])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// 
// BACKGROUND MONITORING TASK
// 

pub fn start_monitoring_task(
    monitoring_state: Arc<TokioMutex<MonitoringState>>,
    app_handle: AppHandle,
    db_path: std::path::PathBuf,
) {
    tauri::async_runtime::spawn(async move {
        let mut check_interval = interval(Duration::from_secs(30)); // Vérifier toutes les 30s
        
        loop {
            check_interval.tick().await;
            
            // Vérifier si le monitoring est activé
            let enabled = {
                let state = monitoring_state.lock().await;
                state.enabled
            };
            
            if !enabled {
                continue;
            }
            
            // Récupérer les adresses à monitorer
            let addresses = {
                let state = monitoring_state.lock().await;
                state.monitored_addresses.clone()
            };
            
            // Read etherscan API key from DB for ETH monitoring
            let etherscan_key = {
                if let Ok(conn) = Connection::open(&db_path) {
                    conn.query_row(
                        "SELECT value FROM settings WHERE key = 'etherscan_api_key'",
                        [], |row| row.get::<_, String>(0),
                    ).unwrap_or_default()
                } else { String::new() }
            };

            // Vérifier chaque adresse
            for (address, wallet_info) in addresses {
                match check_address_transactions(&address, &wallet_info.asset, &etherscan_key).await {
                    Ok(transactions) => {
                        // Traiter les transactions
                        process_transactions(
                            &monitoring_state,
                            &app_handle,
                            &db_path,
                            transactions,
                            wallet_info.wallet_id,
                            &wallet_info.wallet_name,
                            &address,
                            &wallet_info.asset,
                        ).await;
                    }
                    Err(e) => {
                        log_api_response("MONITORING_ERROR", &format!("{}: {}", wallet_info.asset, e), 100);
                        log_address("MONITORING_ERROR", &address);
                    }
                }
                
                // Pause courte entre chaque adresse pour éviter rate limits
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }
    });
}

async fn process_transactions(
    monitoring_state: &Arc<TokioMutex<MonitoringState>>,
    app_handle: &AppHandle,
    db_path: &std::path::Path,
    transactions: Vec<BlockchainTransaction>,
    wallet_id: i64,
    wallet_name: &str,
    address: &str,
    asset: &str,
) {
    let mut state = monitoring_state.lock().await;
    let mut has_changes = false;
    
    for tx in transactions {
        // Chercher si cette TX existe déjà
        if let Some(existing) = state.pending_txs.iter_mut().find(|t| t.tx_hash == tx.hash) {
            // Mettre à jour les confirmations
            if existing.confirmations != tx.confirmations {
                existing.confirmations = tx.confirmations;
                existing.completed = existing.confirmations >= existing.required_confirmations;
                has_changes = true;
            }
        } else {
            // Nouvelle transaction
            let required_confs = match asset {
                "btc" | "bch" | "ltc" => 6,
                "eth" => 12,
                _ => 6,
            };
            
            let pending_tx = PendingTransaction {
                tx_hash: tx.hash.clone(),
                wallet_id,
                wallet_name: wallet_name.to_string(),
                asset: asset.to_string(),
                address: address.to_string(),
                amount: tx.amount,
                confirmations: tx.confirmations,
                required_confirmations: required_confs,
                timestamp: tx.timestamp,
                completed: tx.confirmations >= required_confs,
            };
            
            state.pending_txs.push(pending_tx);
            has_changes = true;
        }
    }
    
    // Save newly completed TXs to history database
    let newly_completed: Vec<PendingTransaction> = state.pending_txs.iter()
        .filter(|tx| tx.completed)
        .cloned()
        .collect();
    
    if !newly_completed.is_empty() {
        if let Ok(conn) = Connection::open(db_path) {
            for tx in &newly_completed {
                conn.execute(
                    "INSERT OR IGNORE INTO tx_history (tx_hash, wallet_id, asset, address, amount, confirmations, timestamp, completed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![tx.tx_hash, tx.wallet_id, tx.asset, tx.address, tx.amount, tx.confirmations, tx.timestamp, Utc::now().timestamp()],
                ).ok();
            }
        }
    }

    // Retirer les TX terminées depuis plus de 1h
    let cutoff = Utc::now().timestamp() - 3600;
    state.pending_txs.retain(|tx| {
        !tx.completed || tx.timestamp > cutoff
    });
    
    // Notifier le frontend si changements
    if has_changes {
        let txs = state.pending_txs.clone();
        drop(state); // Release le lock avant d'émettre
        
        app_handle.emit("pending-tx-update", &txs).ok();
    }
}

// 
// BLOCKCHAIN QUERIES
// 

#[derive(Debug, Clone)]
struct BlockchainTransaction {
    hash: String,
    amount: f64,
    confirmations: u32,
    timestamp: i64,
}

async fn check_address_transactions(
    address: &str,
    asset: &str,
    etherscan_key: &str,
) -> Result<Vec<BlockchainTransaction>, String> {
    match asset {
        "btc" => check_btc_transactions(address).await,
        "eth" => check_eth_transactions(address, etherscan_key).await,
        "ltc" => check_ltc_transactions(address).await,
        "bch" => check_bch_transactions(address).await,
        _ => Ok(vec![]),
    }
}

async fn check_btc_transactions(address: &str) -> Result<Vec<BlockchainTransaction>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    // 1) Get current tip height
    let tip_height: u64 = client
        .get("https://blockstream.info/api/blocks/tip/height")
        .send().await.map_err(|e| format!("tip: {}", e))?
        .text().await.map_err(|e| format!("tip parse: {}", e))?
        .trim().parse().unwrap_or(0);

    if tip_height == 0 {
        return Err("Impossible de récupérer la hauteur du bloc".into());
    }

    // 2) Get recent transactions for address
    let url = format!("https://blockstream.info/api/address/{}/txs", address);
    let response = client.get(&url).send().await
        .map_err(|e| format!("Erreur réseau: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }
    
    let txs: Vec<serde_json::Value> = response.json().await
        .map_err(|e| format!("Erreur parsing JSON: {}", e))?;
    
    let mut result = Vec::new();
    
    for tx in txs.iter().take(10) {
        let tx_hash = tx["txid"].as_str().unwrap_or("").to_string();
        let status = &tx["status"];
        let confirmed = status["confirmed"].as_bool().unwrap_or(false);
        
        let confirmations = if confirmed {
            let block_h = status["block_height"].as_u64().unwrap_or(0);
            if block_h > 0 { (tip_height - block_h + 1) as u32 } else { 0 }
        } else {
            0 // unconfirmed (in mempool)
        };
        
        // Calculer le montant reçu par cette adresse
        let mut amount = 0.0;
        if let Some(vout) = tx["vout"].as_array() {
            for output in vout {
                if let Some(addr) = output["scriptpubkey_address"].as_str() {
                    if addr == address {
                        amount += output["value"].as_f64().unwrap_or(0.0) / 100_000_000.0;
                    }
                }
            }
        }
        
        // Only include recent TX (< 6 confirmations, or unconfirmed)
        if amount > 0.0 && confirmations < 6 {
            result.push(BlockchainTransaction {
                hash: tx_hash,
                amount,
                confirmations,
                timestamp: status["block_time"].as_i64().unwrap_or(chrono::Utc::now().timestamp()),
            });
        }
    }
    
    Ok(result)
}

async fn check_eth_transactions(address: &str, api_key: &str) -> Result<Vec<BlockchainTransaction>, String> {
    if api_key.is_empty() {
        return Ok(vec![]); // Can't monitor without API key
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build().map_err(|e| e.to_string())?;

    // Get current block number
    let tip_url = format!(
        "https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey={}", api_key
    );
    let tip_resp: serde_json::Value = client.get(&tip_url).send().await
        .map_err(|e| format!("eth tip: {}", e))?
        .json().await.map_err(|e| format!("eth tip json: {}", e))?;
    let tip_hex = tip_resp["result"].as_str().unwrap_or("0x0");
    let tip_height = u64::from_str_radix(tip_hex.trim_start_matches("0x"), 16).unwrap_or(0);

    // Get recent normal transactions
    let url = format!(
        "https://api.etherscan.io/api?module=account&action=txlist&address={}&startblock={}&endblock=99999999&page=1&offset=10&sort=desc&apikey={}",
        address, tip_height.saturating_sub(100), api_key // last ~100 blocks
    );
    let resp: serde_json::Value = client.get(&url).send().await
        .map_err(|e| format!("eth txlist: {}", e))?
        .json().await.map_err(|e| format!("eth json: {}", e))?;

    let mut result = Vec::new();
    if let Some(txs) = resp["result"].as_array() {
        for tx in txs.iter().take(10) {
            let to = tx["to"].as_str().unwrap_or("");
            if to.to_lowercase() != address.to_lowercase() { continue; } // only incoming
            
            let value_wei = tx["value"].as_str().unwrap_or("0");
            let amount = value_wei.parse::<f64>().unwrap_or(0.0) / 1e18;
            if amount <= 0.0 { continue; }

            let tx_block = tx["blockNumber"].as_str().unwrap_or("0").parse::<u64>().unwrap_or(0);
            let confirmations = if tx_block > 0 { (tip_height - tx_block + 1) as u32 } else { 0 };
            
            if confirmations < 12 {
                result.push(BlockchainTransaction {
                    hash: tx["hash"].as_str().unwrap_or("").to_string(),
                    amount,
                    confirmations,
                    timestamp: tx["timeStamp"].as_str().unwrap_or("0").parse::<i64>().unwrap_or(0),
                });
            }
        }
    }
    Ok(result)
}

async fn check_ltc_transactions(address: &str) -> Result<Vec<BlockchainTransaction>, String> {
    check_blockchair_transactions(address, "litecoin", 6).await
}

async fn check_bch_transactions(address: &str) -> Result<Vec<BlockchainTransaction>, String> {
    check_blockchair_transactions(address, "bitcoin-cash", 6).await
}

async fn check_blockchair_transactions(address: &str, chain: &str, required_confs: u32) -> Result<Vec<BlockchainTransaction>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build().map_err(|e| e.to_string())?;

    let url = format!(
        "https://api.blockchair.com/{}/dashboards/address/{}?transaction_details=true&limit=10",
        chain, address
    );
    let resp: serde_json::Value = client.get(&url).send().await
        .map_err(|e| format!("{} network: {}", chain, e))?
        .json().await.map_err(|e| format!("{} json: {}", chain, e))?;

    // Get current block height from context
    let tip_height = resp["context"]["state"].as_u64().unwrap_or(0);

    let mut result = Vec::new();
    let addr_data = &resp["data"][address];
    
    if let Some(txs) = addr_data["transactions"].as_array() {
        for tx in txs.iter().take(10) {
            let balance_change = tx["balance_change"].as_i64().unwrap_or(0);
            if balance_change <= 0 { continue; } // only incoming
            
            let amount = balance_change as f64 / 100_000_000.0;
            let tx_block = tx["block_id"].as_u64().unwrap_or(0);
            
            let confirmations = if tx_block > 0 && tip_height > 0 {
                (tip_height - tx_block + 1) as u32
            } else {
                0 // unconfirmed
            };
            
            if confirmations < required_confs {
                result.push(BlockchainTransaction {
                    hash: tx["hash"].as_str().unwrap_or("").to_string(),
                    amount,
                    confirmations,
                    timestamp: NaiveDateTime::parse_from_str(
                        tx["time"].as_str().unwrap_or("2000-01-01 00:00:00"),
                        "%Y-%m-%d %H:%M:%S"
                    ).map(|dt| dt.and_utc().timestamp()).unwrap_or(Utc::now().timestamp()),
                });
            }
        }
    }
    Ok(result)
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
    pub xaut: AssetPrice,
    pub rai: AssetPrice,
    pub crv: AssetPrice,
    pub paxg: AssetPrice,
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

// 
// BASE DE DONNÉES
// 

fn get_db_path() -> String {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("janus-monitor");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("janus.db").to_string_lossy().to_string()
}

fn init_db(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            bar_color TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )", [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS wallets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            asset TEXT NOT NULL,
            name TEXT NOT NULL,
            address TEXT,
            balance REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )", [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
    )", [],
    )?;

    // Transaction history
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tx_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL UNIQUE,
            wallet_id INTEGER,
            asset TEXT NOT NULL,
            address TEXT NOT NULL,
            amount REAL NOT NULL,
            confirmations INTEGER DEFAULT 0,
            timestamp INTEGER NOT NULL,
            completed_at INTEGER NOT NULL
        )", [],
    )?;

    // Profile security (PIN/password)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS profile_security (
            profile_name TEXT PRIMARY KEY,
            pin_hash TEXT NOT NULL,
            inactivity_minutes INTEGER DEFAULT 0
        )", [],
    )?;

    let has_old_category: bool = conn
    .prepare("SELECT COUNT(*) FROM pragma_table_info('wallets') WHERE name='category' AND type='TEXT'")?
    .query_row([], |row| row.get::<_, i64>(0))
    .map(|count| count > 0)
    .unwrap_or(false);

    if has_old_category {
        println!("[MIGRATION V1→V2] Détection ancienne structure, migration en cours...");

        let cat_count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0)).unwrap_or(0);
        if cat_count == 0 {
            conn.execute(
                "INSERT INTO categories (id, name, color, bar_color, display_order) VALUES (1, 'Bitcoin', 'text-amber-500', '#f59e0b', 0)",
                         [],
            )?;
            conn.execute(
                "INSERT INTO categories (id, name, color, bar_color, display_order) VALUES (2, 'Hedging', 'text-red-700', '#b91c1c', 1)",
                         [],
            )?;
            conn.execute(
                "INSERT INTO categories (id, name, color, bar_color, display_order) VALUES (3, 'Altcoins', 'text-violet-500', '#8b5cf6', 2)",
                         [],
            )?;
        }

        let has_category_id: bool = conn
        .prepare("SELECT COUNT(*) FROM pragma_table_info('wallets') WHERE name='category_id'")?
        .query_row([], |row| row.get::<_, i64>(0))
        .map(|count| count > 0)
        .unwrap_or(false);

        if !has_category_id {
            conn.execute("ALTER TABLE wallets ADD COLUMN category_id INTEGER", [])?;
        }

        conn.execute("UPDATE wallets SET category_id = 1 WHERE category = 'bitcoin'", [])?;
        conn.execute("UPDATE wallets SET category_id = 2 WHERE category IN ('hedging', 'Hedging')", [])?;
        conn.execute("UPDATE wallets SET category_id = 3 WHERE category IN ('altcoins', 'Altcoins')", [])?;

        conn.execute(
            "CREATE TABLE wallets_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL,
                asset TEXT NOT NULL,
                name TEXT NOT NULL,
                address TEXT,
                balance REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        )", [],
        )?;

        conn.execute(
            "INSERT INTO wallets_new (id, category_id, asset, name, address, balance, created_at, updated_at)
        SELECT id, category_id, asset, name, address, balance, created_at, updated_at FROM wallets",
        [],
        )?;

        conn.execute("DROP TABLE wallets", [])?;
        conn.execute("ALTER TABLE wallets_new RENAME TO wallets", [])?;

        println!("[MIGRATION V1→V2] Migration terminée !");
    }

    let wallet_count: i64 = conn.query_row("SELECT COUNT(*) FROM wallets", [], |row| row.get(0))?;
    let cat_count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0)).unwrap_or(0);

    if cat_count == 0 {
        conn.execute(
            "INSERT INTO categories (name, color, bar_color, display_order) VALUES ('Bitcoin', 'text-amber-500', '#f59e0b', 0)",
                     [],
        )?;
        conn.execute(
            "INSERT INTO categories (name, color, bar_color, display_order) VALUES ('Hedging', 'text-red-700', '#b91c1c', 1)",
                     [],
        )?;
        conn.execute(
            "INSERT INTO categories (name, color, bar_color, display_order) VALUES ('Altcoins', 'text-violet-500', '#8b5cf6', 2)",
                     [],
        )?;
    }

    if wallet_count == 0 {
        // Bitcoin
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (1, 'btc', 'Cold Wallet 1', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (1, 'btc', 'Cold Wallet 2', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (1, 'btc', 'Cold Wallet 3', \"\")", [])?;
        // Hedging
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (2, 'bch', 'BCH Wallet 1', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (2, 'bch', 'BCH Wallet 2', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (2, 'ltc', 'LTC Wallet', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (2, 'xmr', 'Monero Reserve', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (2, 'xaut', 'Tether Gold', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (2, 'rai', 'RAI Wallet', \"\")", [])?;
        // Altcoins
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (3, 'eth', 'Ethereum Wallet', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (3, 'crv', 'Curve DAO Wallet', \"\")", [])?;
        conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (3, 'dot', 'Polkadot Wallet', \"\")", [])?;
    }

    conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('etherscan_api_key', \"\")", [])?;
    conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark')", [])?;
    Ok(())
}


// 
// COMMANDES TAURI - CATEGORIES
// 

#[tauri::command]
fn get_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, color, bar_color, display_order FROM categories ORDER BY display_order")
        .map_err(|e| e.to_string())?;
    let categories = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                bar_color: row.get(3)?,
                display_order: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(categories)
}

#[tauri::command]
fn add_category(
    state: State<DbState>,
    name: String,
    color: String,
    bar_color: String,
) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(display_order), -1) FROM categories",
            [],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO categories (name, color, bar_color, display_order) VALUES (?1, ?2, ?3, ?4)",
        params![name, color, bar_color, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_category(
    state: State<DbState>,
    id: i64,
    name: String,
    color: String,
    bar_color: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE categories SET name = ?1, color = ?2, bar_color = ?3 WHERE id = ?4",
        params![name, color, bar_color, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_category(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    
    if count <= 1 {
        return Err("Impossible de supprimer la dernière catégorie".to_string());
    }
    
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn reorder_categories(state: State<DbState>, category_ids: Vec<i64>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    for (index, category_id) in category_ids.iter().enumerate() {
        conn.execute(
            "UPDATE categories SET display_order = ?1 WHERE id = ?2",
            params![index as i32, category_id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

// 
// COMMANDES TAURI - WALLETS
// 

#[tauri::command]
fn get_wallets(state: State<DbState>) -> Result<Vec<Wallet>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, category_id, asset, name, address, balance FROM wallets ORDER BY id")
        .map_err(|e| e.to_string())?;
    let wallets = stmt
        .query_map([], |row| {
            Ok(Wallet {
                id: row.get(0)?,
                category_id: row.get(1)?,
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
    input_validation::validate_wallet_name(&name)?;
    input_validation::validate_balance(balance)?;
    if let Some(b) = balance { log_balance("UPDATE_WALLET", b); }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE wallets SET name = ?1, address = ?2, balance = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
        params![name, address, balance, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_wallet(state: State<DbState>, category_id: i64, asset: String, name: String) -> Result<i64, String> {
    input_validation::validate_asset(&asset)?;
    input_validation::validate_wallet_name(&name)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, ?2, ?3, \"\")",
        params![category_id, asset, name],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn delete_wallet(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM wallets WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// 
// COMMANDES TAURI - SETTINGS
// 

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
    input_validation::validate_setting_key(&key)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_setting(state: State<DbState>, key: String, value: String) -> Result<(), String> {
    input_validation::validate_setting_key(&key)?;
    input_validation::validate_setting_value(&value)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// 
// COMMANDES TAURI - LISTE DES ALTCOINS
// 

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

        // Stablecoins
        AltcoinInfo { symbol: "usdt".to_string(), name: "Tether USD".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "usdc".to_string(), name: "USD Coin".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "dai".to_string(), name: "Dai Stablecoin".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "eurc".to_string(), name: "Euro Coin".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "rai".to_string(), name: "Rai Reflex Index".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },

        // Or tokenisé
        AltcoinInfo { symbol: "xaut".to_string(), name: "Tether Gold".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "paxg".to_string(), name: "PAX Gold".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },

        // DeFi
        AltcoinInfo { symbol: "par".to_string(), name: "Parallel".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "wbtc".to_string(), name: "Wrapped Bitcoin".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "mkr".to_string(), name: "Maker".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "crv".to_string(), name: "Curve DAO".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "frax".to_string(), name: "Frax".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "lusd".to_string(), name: "Liquity USD".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },

        // Layer 2
        AltcoinInfo { symbol: "matic".to_string(), name: "Polygon".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
        AltcoinInfo { symbol: "arb".to_string(), name: "Arbitrum".to_string(), can_fetch: true, fetch_type: "etherscan".to_string() },
    ]
}

// 
// COMMANDES TAURI - PRIX (BINANCE + BITFINEX XMR + FOREX + GOLD)
// 

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
        // CRV (Curve DAO)
        "CRVUSDT", "CRVBTC",
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
                            // CRV (Curve DAO)
                            "CRVUSDT" => prices.crv.usd = price,
                            "CRVBTC" => prices.crv.btc = price,
                            // Gold (PAXG = 1 troy oz)
                            "PAXGUSDT" => { prices.gold_usd_per_oz = price; prices.paxg.usd = price; },
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    // XMR + XAUT from Bitfinex
    let bitfinex_url = "https://api-pub.bitfinex.com/v2/tickers?symbols=tXMRUSD,tXMRBTC,tXAUTUSD,tXAUTBTC";
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
                // XAUT (Tether Gold)
                if let Some(start) = text.find("[\"tXAUTUSD\"") {
                    let substr = &text[start..];
                    let parts: Vec<&str> = substr.split(',').collect();
                    if parts.len() >= 8 {
                        if let Ok(usd_price) = parts[7].parse::<f64>() {
                            prices.xaut.usd = usd_price;
                        }
                    }
                }
                if let Some(start) = text.find("[\"tXAUTBTC\"") {
                    let substr = &text[start..];
                    let parts: Vec<&str> = substr.split(',').collect();
                    if parts.len() >= 8 {
                        if let Ok(btc_price) = parts[7].parse::<f64>() {
                            prices.xaut.btc = btc_price;
                        }
                    }
                }
            }
        }
    }

    // RAI from CoinGecko (free, no key)
    let rai_url = "https://api.coingecko.com/api/v3/simple/price?ids=rai&vs_currencies=usd,btc";
    if let Ok(response) = client.get(rai_url).send().await {
        if response.status().is_success() {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                if let Some(rai_data) = data.get("rai") {
                    if let Some(v) = rai_data.get("usd").and_then(|v| v.as_f64()) { prices.rai.usd = v; }
                    if let Some(v) = rai_data.get("btc").and_then(|v| v.as_f64()) { prices.rai.btc = v; }
                }
            }
        }
    }

    // Generic EUR derivation for ALL assets missing EUR price
    if prices.btc.eur > 0.0 && prices.btc.usd > 0.0 {
        let eur_per_usd = prices.btc.eur / prices.btc.usd;

        // Helper macro: derive EUR from USD, or from BTC if no USD
        macro_rules! derive_eur {
            ($asset:expr) => {
                if $asset.eur == 0.0 {
                    if $asset.usd > 0.0 {
                        $asset.eur = $asset.usd * eur_per_usd;
                    } else if $asset.btc > 0.0 {
                        $asset.usd = $asset.btc * prices.btc.usd;
                        $asset.eur = $asset.btc * prices.btc.eur;
                    }
                }
            };
        }

        derive_eur!(prices.dash);
        derive_eur!(prices.pivx);
        derive_eur!(prices.xaut);
        derive_eur!(prices.rai);
        derive_eur!(prices.crv);
        derive_eur!(prices.paxg);
        derive_eur!(prices.qtum);
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
        // EUR/USD: if BTCUSD=67000 and BTCEUR=57000, then 1 EUR = 67000/57000 = 1.175 USD
        prices.eurusd = prices.btc.usd / prices.btc.eur;
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

// 
// COMMANDES TAURI - FETCH BALANCE ON-CHAIN
// 

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

// 
// COMMANDES TAURI - PROFILES (SAVE / LOAD / RESET / LIST)
// 

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
    
    let mut cat_stmt = conn
        .prepare("SELECT id, name, color, bar_color, display_order FROM categories ORDER BY display_order")
        .map_err(|e| e.to_string())?;
    let categories: Vec<Category> = cat_stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                bar_color: row.get(3)?,
                display_order: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    let mut wallet_stmt = conn
        .prepare("SELECT id, category_id, asset, name, address, balance FROM wallets ORDER BY id")
        .map_err(|e| e.to_string())?;
    let wallets: Vec<Wallet> = wallet_stmt
        .query_map([], |row| {
            Ok(Wallet {
                id: row.get(0)?,
                category_id: row.get(1)?,
                asset: row.get(2)?,
                name: row.get(3)?,
                address: row.get(4)?,
                balance: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let data = ProfileData { categories, wallets, theme };
    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    let path = get_profiles_dir().join(format!("{}.json", name));
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_profile(state: State<DbState>, name: String) -> Result<LoadProfileResult, String> {
    let path = get_profiles_dir().join(format!("{}.json", name));
    let json = std::fs::read_to_string(&path).map_err(|e| format!("Profil introuvable: {}", e))?;

    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if let Ok(data) = serde_json::from_str::<ProfileData>(&json) {
        conn.execute("DELETE FROM categories", []).map_err(|e| e.to_string())?;
        for cat in data.categories {
            conn.execute(
                "INSERT INTO categories (id, name, color, bar_color, display_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![cat.id, cat.name, cat.color, cat.bar_color, cat.display_order],
            ).map_err(|e| e.to_string())?;
        }
        
        conn.execute("DELETE FROM wallets", []).map_err(|e| e.to_string())?;
        for w in data.wallets {
            conn.execute(
                "INSERT INTO wallets (category_id, asset, name, address, balance) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![w.category_id, w.asset, w.name, w.address, w.balance],
            ).map_err(|e| e.to_string())?;
        }
        
        return Ok(LoadProfileResult { theme: data.theme });
    }
    
    Err("Format de profil non supporté - utilisez un profil V2".to_string())
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
    conn.execute("DELETE FROM categories", []).map_err(|e| e.to_string())?;

    // Re-insert default_template categories
    conn.execute("INSERT INTO categories (name, color, bar_color, display_order) VALUES ('Bitcoin', 'text-amber-500', '#f59e0b', 0)", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO categories (name, color, bar_color, display_order) VALUES ('Hedging', 'text-red-700', '#b91c1c', 1)", []).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO categories (name, color, bar_color, display_order) VALUES ('Altcoins', 'text-violet-500', '#8b5cf6', 2)", []).map_err(|e| e.to_string())?;

    // Get the new category IDs
    let cat_btc: i64 = conn.query_row("SELECT id FROM categories WHERE name = 'Bitcoin'", [], |row| row.get(0)).map_err(|e| e.to_string())?;
    let cat_hedge: i64 = conn.query_row("SELECT id FROM categories WHERE name = 'Hedging'", [], |row| row.get(0)).map_err(|e| e.to_string())?;
    let cat_alt: i64 = conn.query_row("SELECT id FROM categories WHERE name = 'Altcoins'", [], |row| row.get(0)).map_err(|e| e.to_string())?;

    // Re-insert default_template wallets
    // Bitcoin
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'btc', 'Cold Wallet 1', \"\")", params![cat_btc]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'btc', 'Cold Wallet 2', \"\")", params![cat_btc]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'btc', 'Cold Wallet 3', \"\")", params![cat_btc]).map_err(|e| e.to_string())?;
    // Hedging
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'bch', 'BCH Wallet 1', \"\")", params![cat_hedge]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'bch', 'BCH Wallet 2', \"\")", params![cat_hedge]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'ltc', 'LTC Wallet', \"\")", params![cat_hedge]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'xmr', 'Monero Reserve', \"\")", params![cat_hedge]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'xaut', 'Tether Gold', \"\")", params![cat_hedge]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'rai', 'RAI Wallet', \"\")", params![cat_hedge]).map_err(|e| e.to_string())?;
    // Altcoins
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'eth', 'Ethereum Wallet', \"\")", params![cat_alt]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'crv', 'Curve DAO Wallet', \"\")", params![cat_alt]).map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO wallets (category_id, asset, name, address) VALUES (?1, 'dot', 'Polkadot Wallet', \"\")", params![cat_alt]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn save_csv_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    std::env::var("HOME").map_err(|_| "HOME not set".into())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    std::process::Command::new("xdg-open")
        .arg(&url)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

// 
// RUN
// 

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).expect("Impossible d'ouvrir la base de données");
    init_db(&conn).expect("Impossible d'initialiser la base de données");

    // Charger le setting monitoring_enabled
    let monitoring_enabled = conn
    .query_row(
        "SELECT value FROM settings WHERE key = 'monitoring_enabled'",
        [],
        |row| row.get::<_, String>(0),
    )
    .unwrap_or("true".to_string()) == "true";

    // Créer l'état de monitoring
    let monitoring_state = Arc::new(TokioMutex::new(MonitoringState {
        enabled: monitoring_enabled,
        ..Default::default()
    }));

    tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .manage(DbState(Mutex::new(conn)))
    .manage(monitoring_state.clone())  // ✨ NOUVEAU
    .setup(move |app| {
        // Démarrer la tâche de monitoring
        start_monitoring_task(monitoring_state.clone(), app.handle().clone(), std::path::PathBuf::from(db_path.clone()));
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
            get_categories,
            add_category,
            update_category,
            delete_category,
            reorder_categories,
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
            open_url,
            get_pending_transactions,        // ✨ NOUVEAU
            set_monitoring_enabled,          // ✨ NOUVEAU
            start_monitoring_wallet,         // ✨ NOUVEAU
            stop_monitoring_wallet,          // ✨ NOUVEAU
            clear_pending_transaction,       // ✨ NOUVEAU
            get_tx_history,                  // ✨ HISTORIQUE TX
            fetch_address_history,           // ✨ HISTORIQUE BLOCKCHAIN
            save_csv_file,                   // 📄 EXPORT CSV
            get_home_dir,                    // 🏠 HOME DIR
            get_profile_security,            // 🔒 PIN
            set_profile_pin,
            verify_profile_pin,
            remove_profile_pin,
            get_pin_status,             // 🔒 Rate limit status
            test_monero_node,               // 🪙 MONERO: Test nœud
            get_monero_balance,             // 🪙 MONERO: Balance
            get_monero_transactions,        // 🪙 MONERO: Historique
            test_pivx_node,                // 🪙 PIVX: Test nœud
            get_pivx_balance,               // 🪙 PIVX: Balance
            get_pivx_transactions,          // 🪙 PIVX: Historique
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application");
}

// ============================================================================
// MODULES DE CRYPTOMONNAIES PRIVÉES
// ============================================================================
mod monero_integration;
pub use monero_integration::*;

mod pivx_integration;
pub use pivx_integration::*;
