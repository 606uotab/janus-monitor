// =============================================================================
// 🔒 INPUT VALIDATION MODULE - JANUS Monitor v2.2.1
// FIXES: CRIT-04
// =============================================================================

const MAX_NAME_LEN: usize = 100;
const MAX_PROFILE_NAME_LEN: usize = 100;
const MAX_ADDRESS_LEN: usize = 256;
const MAX_ASSET_LEN: usize = 20;
const MAX_SETTING_VALUE_LEN: usize = 2048;

pub fn validate_string(field_name: &str, value: &str, max_len: usize) -> Result<(), String> {
    if value.len() > max_len {
        return Err(format!("{} too long ({} chars, max {})", field_name, value.len(), max_len));
    }
    Ok(())
}

pub fn validate_non_empty(field_name: &str, value: &str, max_len: usize) -> Result<(), String> {
    if value.is_empty() { return Err(format!("{} cannot be empty", field_name)); }
    validate_string(field_name, value, max_len)
}

pub fn validate_profile_name(name: &str) -> Result<(), String> {
    validate_non_empty("Profile name", name, MAX_PROFILE_NAME_LEN)?;
    if !name.chars().all(|c| c.is_alphanumeric() || " -_.àâéèêëïîôùûüÿçÀÂÉÈÊËÏÎÔÙÛÜŸÇ".contains(c)) {
        return Err("Profile name contains invalid characters".to_string());
    }
    Ok(())
}

pub fn validate_wallet_name(name: &str) -> Result<(), String> {
    validate_string("Wallet name", name, MAX_NAME_LEN)
}

pub fn validate_asset(asset: &str) -> Result<(), String> {
    validate_non_empty("Asset", asset, MAX_ASSET_LEN)
}

pub fn validate_address(asset: &str, address: &str) -> Result<(), String> {
    if address.is_empty() { return Ok(()); }
    validate_string("Address", address, MAX_ADDRESS_LEN)?;
    match asset.to_uppercase().as_str() {
        "BTC" => validate_btc_address(address),
        "ETH" | "LINK" | "UNI" | "AAVE" | "MKR" | "CRV" | "WBTC" | "USDT" | "USDC" |
        "DAI" | "EURC" | "RAI" | "FRAX" | "LUSD" | "XAUT" | "PAXG" | "MATIC" | "ARB" => validate_eth_address(address),
        "XMR" => validate_xmr_address(address),
        "BCH" => validate_bch_address(address),
        "LTC" => validate_ltc_address(address),
        "DOT" => validate_dot_address(address),
        _ => Ok(())
    }
}

fn validate_btc_address(addr: &str) -> Result<(), String> {
    if (addr.starts_with("bc1") || addr.starts_with('1') || addr.starts_with('3'))
        && addr.len() >= 26 && addr.len() <= 90 { return Ok(()); }
    Err(format!("Invalid BTC address: {:.10}...", addr))
}

fn validate_eth_address(addr: &str) -> Result<(), String> {
    if addr.starts_with("0x") && addr.len() == 42
        && addr[2..].chars().all(|c| c.is_ascii_hexdigit()) { return Ok(()); }
    Err(format!("Invalid ETH address: {:.10}...", addr))
}

fn validate_xmr_address(addr: &str) -> Result<(), String> {
    if (addr.starts_with('4') || addr.starts_with('8'))
        && (addr.len() == 95 || addr.len() == 106) { return Ok(()); }
    Err(format!("Invalid XMR address: {:.10}...", addr))
}

fn validate_bch_address(addr: &str) -> Result<(), String> {
    if (addr.starts_with("bitcoincash:") || addr.starts_with('1') || addr.starts_with('3')
        || addr.starts_with('q') || addr.starts_with('p'))
        && addr.len() >= 25 && addr.len() <= 120 { return Ok(()); }
    Err(format!("Invalid BCH address: {:.10}...", addr))
}

fn validate_ltc_address(addr: &str) -> Result<(), String> {
    if (addr.starts_with('L') || addr.starts_with('M') || addr.starts_with('3') || addr.starts_with("ltc1"))
        && addr.len() >= 26 && addr.len() <= 90 { return Ok(()); }
    Err(format!("Invalid LTC address: {:.10}...", addr))
}

fn validate_dot_address(addr: &str) -> Result<(), String> {
    if addr.starts_with('1') && addr.len() >= 46 && addr.len() <= 50 { return Ok(()); }
    Err(format!("Invalid DOT address: {:.10}...", addr))
}

pub fn validate_balance(balance: Option<f64>) -> Result<(), String> {
    if let Some(b) = balance {
        if b.is_nan() || b.is_infinite() { return Err("Invalid balance (NaN/Infinite)".to_string()); }
        if b < 0.0 { return Err("Balance cannot be negative".to_string()); }
        if b > 1e18 { return Err("Balance too large".to_string()); }
    }
    Ok(())
}

pub fn validate_setting_key(key: &str) -> Result<(), String> {
    validate_non_empty("Setting key", key, 100)?;
    if !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.') {
        return Err(format!("Invalid setting key: '{}'", key));
    }
    Ok(())
}

pub fn validate_setting_value(value: &str) -> Result<(), String> {
    validate_string("Setting value", value, MAX_SETTING_VALUE_LEN)
}
