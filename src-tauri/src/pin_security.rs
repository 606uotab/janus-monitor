// =============================================================================
// 🔒 PIN SECURITY MODULE - JANUS Monitor v2.2.1
// =============================================================================
// Argon2id hashing, rate limiting, timing-safe comparison, legacy migration
// FIXES: CRIT-01, CRIT-11, MAJ-05
// =============================================================================

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2, Algorithm, Version, Params,
};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const MAX_FAILED_ATTEMPTS: u32 = 10;
const BASE_DELAY_MS: u64 = 1000;
const MAX_DELAY_MS: u64 = 300_000;
const LOCKOUT_DURATION_SECS: u64 = 900;
const ARGON2_M_COST: u32 = 65536;
const ARGON2_T_COST: u32 = 3;
const ARGON2_P_COST: u32 = 4;

pub struct RateLimitEntry {
    pub failed_attempts: u32,
    pub last_attempt: Instant,
    pub locked_until: Option<Instant>,
}

impl Default for RateLimitEntry {
    fn default() -> Self {
        Self {
            failed_attempts: 0,
            last_attempt: Instant::now(),
            locked_until: None,
        }
    }
}

lazy_static::lazy_static! {
    static ref RATE_LIMIT_STATE: Mutex<HashMap<String, RateLimitEntry>> =
        Mutex::new(HashMap::new());
}

fn get_argon2_hasher() -> Argon2<'static> {
    let params = Params::new(ARGON2_M_COST, ARGON2_T_COST, ARGON2_P_COST, Some(32))
        .expect("Invalid Argon2 params");
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
}

/// Hash a raw PIN with Argon2id. Returns PHC-format string.
pub fn hash_pin(raw_pin: &str) -> Result<String, String> {
    if raw_pin.is_empty() {
        return Err("PIN cannot be empty".to_string());
    }
    if raw_pin.len() < 4 {
        return Err("PIN must be at least 4 characters".to_string());
    }
    if raw_pin.len() > 128 {
        return Err("PIN too long (max 128 characters)".to_string());
    }
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = get_argon2_hasher();
    let hash = argon2
        .hash_password(raw_pin.as_bytes(), &salt)
        .map_err(|e| format!("PIN hashing failed: {}", e))?;
    Ok(hash.to_string())
}

/// Verify a raw PIN against stored Argon2id hash (constant-time).
pub fn verify_pin(raw_pin: &str, stored_hash: &str) -> Result<bool, String> {
    if raw_pin.is_empty() || stored_hash.is_empty() {
        return Ok(false);
    }
    let parsed_hash = PasswordHash::new(stored_hash)
        .map_err(|e| format!("Invalid stored hash format: {}", e))?;
    let argon2 = get_argon2_hasher();
    match argon2.verify_password(raw_pin.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(format!("PIN verification error: {}", e)),
    }
}

pub fn check_rate_limit(profile_name: &str) -> Result<(), String> {
    let mut state = RATE_LIMIT_STATE.lock().map_err(|e| format!("Lock error: {}", e))?;
    let entry = state.entry(profile_name.to_string()).or_insert_with(RateLimitEntry::default);

    if let Some(locked_until) = entry.locked_until {
        if Instant::now() < locked_until {
            let remaining = locked_until.duration_since(Instant::now());
            return Err(format!("Profil verrouillé. Réessayez dans {} secondes.", remaining.as_secs()));
        } else {
            entry.locked_until = None;
            entry.failed_attempts = 0;
        }
    }

    if entry.failed_attempts > 0 {
        let delay_ms = calculate_delay(entry.failed_attempts);
        let elapsed = entry.last_attempt.elapsed();
        if elapsed < Duration::from_millis(delay_ms) {
            let remaining = Duration::from_millis(delay_ms) - elapsed;
            return Err(format!("Trop de tentatives. Réessayez dans {} secondes.", remaining.as_secs() + 1));
        }
    }
    Ok(())
}

pub fn record_failed_attempt(profile_name: &str) -> Result<u32, String> {
    let mut state = RATE_LIMIT_STATE.lock().map_err(|e| format!("Lock error: {}", e))?;
    let entry = state.entry(profile_name.to_string()).or_insert_with(RateLimitEntry::default);
    entry.failed_attempts += 1;
    entry.last_attempt = Instant::now();
    if entry.failed_attempts >= MAX_FAILED_ATTEMPTS {
        entry.locked_until = Some(Instant::now() + Duration::from_secs(LOCKOUT_DURATION_SECS));
        println!("[SECURITY] Profile '{}' locked for {}s after {} failed attempts",
            profile_name, LOCKOUT_DURATION_SECS, entry.failed_attempts);
    }
    Ok(MAX_FAILED_ATTEMPTS.saturating_sub(entry.failed_attempts))
}

pub fn record_successful_attempt(profile_name: &str) -> Result<(), String> {
    let mut state = RATE_LIMIT_STATE.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(entry) = state.get_mut(profile_name) {
        entry.failed_attempts = 0;
        entry.locked_until = None;
    }
    Ok(())
}

fn calculate_delay(failed_attempts: u32) -> u64 {
    if failed_attempts == 0 { return 0; }
    let delay = BASE_DELAY_MS * 2u64.pow(failed_attempts.saturating_sub(1).min(20));
    delay.min(MAX_DELAY_MS)
}

/// Detect legacy SHA-256 hex hash (64 hex chars, no $argon2 prefix)
pub fn is_legacy_sha256_hash(stored_hash: &str) -> bool {
    stored_hash.len() == 64
        && stored_hash.chars().all(|c| c.is_ascii_hexdigit())
        && !stored_hash.starts_with("$argon2")
}

/// Re-hash PIN from legacy SHA-256 to Argon2id
pub fn migrate_pin_hash(raw_pin: &str) -> Result<String, String> {
    println!("[SECURITY] Migrating PIN hash from SHA-256 to Argon2id");
    hash_pin(raw_pin)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify() {
        let pin = "1234";
        let hash = hash_pin(pin).unwrap();
        assert!(hash.starts_with("$argon2id$"));
        assert!(verify_pin(pin, &hash).unwrap());
        assert!(!verify_pin("wrong", &hash).unwrap());
    }

    #[test]
    fn test_different_hashes() {
        let pin = "test1234";
        let h1 = hash_pin(pin).unwrap();
        let h2 = hash_pin(pin).unwrap();
        assert_ne!(h1, h2);
        assert!(verify_pin(pin, &h1).unwrap());
        assert!(verify_pin(pin, &h2).unwrap());
    }

    #[test]
    fn test_legacy_detection() {
        assert!(is_legacy_sha256_hash("a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"));
        assert!(!is_legacy_sha256_hash("$argon2id$v=19$m=65536,t=3,p=4$salt$hash"));
    }
}
