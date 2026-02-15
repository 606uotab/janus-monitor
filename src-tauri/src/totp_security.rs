// =============================================================================
// 🔒 TOTP 2FA MODULE — JANUS Monitor v2.3.0
// =============================================================================
// RFC 6238 TOTP: secret generation, QR URI, code verification, encrypted storage
// =============================================================================

use totp_rs::{Algorithm, Secret, TOTP};
use sodiumoxide::crypto::secretbox;
use sodiumoxide::randombytes::randombytes;

const TOTP_DIGITS: usize = 6;
const TOTP_STEP: u64 = 30;
const TOTP_SKEW: u8 = 1; // ±1 window = 90s tolerance
const TOTP_ISSUER: &str = "JANUS Monitor";
const SECRET_BYTES: usize = 20; // 160-bit secret (RFC 4226 recommended)

/// Generate a new random TOTP secret (base32-encoded).
pub fn generate_totp_secret() -> Result<String, String> {
    sodiumoxide::init().map_err(|_| "sodiumoxide init failed".to_string())?;
    let raw = randombytes(SECRET_BYTES);
    let secret = Secret::Raw(raw);
    Ok(secret.to_encoded().to_string())
}

/// Build a TOTP instance from a base32 secret + profile name.
fn build_totp(secret_b32: &str, account: &str) -> Result<TOTP, String> {
    let secret_bytes = Secret::Encoded(secret_b32.to_string())
        .to_bytes()
        .map_err(|e| format!("Invalid TOTP secret: {}", e))?;
    TOTP::new(
        Algorithm::SHA1,
        TOTP_DIGITS,
        TOTP_SKEW,
        TOTP_STEP,
        secret_bytes,
        Some(TOTP_ISSUER.to_string()),
        account.to_string(),
    )
    .map_err(|e| format!("TOTP init failed: {}", e))
}

/// Generate otpauth:// URI for QR code scanning.
pub fn generate_totp_uri(secret_b32: &str, profile_name: &str) -> Result<String, String> {
    let totp = build_totp(secret_b32, profile_name)?;
    Ok(totp.get_url())
}

/// Verify a 6-digit TOTP code against the secret.
pub fn verify_totp_code(secret_b32: &str, profile_name: &str, code: &str) -> Result<bool, String> {
    if code.len() != TOTP_DIGITS || !code.chars().all(|c| c.is_ascii_digit()) {
        return Ok(false);
    }
    let totp = build_totp(secret_b32, profile_name)?;
    totp.check_current(code)
        .map_err(|e| format!("TOTP check error: {}", e))
}

/// Encrypt a TOTP secret using the app-level key from SecureKeyStorage.
/// This uses a STATIC key (not the session key) because the TOTP secret must
/// be decrypted BEFORE the user authenticates (chicken-and-egg problem).
pub fn encrypt_totp_secret(secret: &str) -> Result<String, String> {
    let storage = crate::secure_key_storage::get_secure_key_storage()?;
    let key = storage.get_key();
    let nonce = secretbox::gen_nonce(); // unique nonce per encryption
    let ciphertext = secretbox::seal(secret.as_bytes(), &nonce, &key);
    Ok(format!("{}:{}", hex::encode(nonce.as_ref()), hex::encode(&ciphertext)))
}

/// Decrypt a TOTP secret using the app-level key from SecureKeyStorage.
pub fn decrypt_totp_secret(encrypted: &str) -> Result<String, String> {
    if encrypted.is_empty() {
        return Err("Empty encrypted secret".to_string());
    }
    let storage = crate::secure_key_storage::get_secure_key_storage()?;
    let key = storage.get_key();
    let parts: Vec<&str> = encrypted.splitn(2, ':').collect();
    if parts.len() != 2 {
        return Err("Invalid encrypted TOTP format".to_string());
    }
    let nonce_bytes = hex::decode(parts[0])
        .map_err(|e| format!("Invalid nonce hex: {}", e))?;
    let nonce = secretbox::Nonce::from_slice(&nonce_bytes)
        .ok_or_else(|| "Invalid nonce length".to_string())?;
    let ciphertext = hex::decode(parts[1])
        .map_err(|e| format!("Invalid ciphertext hex: {}", e))?;
    let plaintext = secretbox::open(&ciphertext, &nonce, &key)
        .map_err(|_| "Failed to decrypt TOTP secret".to_string())?;
    String::from_utf8(plaintext)
        .map_err(|e| format!("Invalid UTF-8 in decrypted secret: {}", e))
}
