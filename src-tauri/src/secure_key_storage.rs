// Secure Key Storage Module
// Provides secure storage and management of cryptographic keys for logging

use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::os::unix::fs::PermissionsExt;
use std::time::SystemTime;
use sodiumoxide::crypto::secretbox;
use once_cell::sync::OnceCell;

/// Secure key storage in a protected file
pub struct SecureKeyStorage {
    key: secretbox::Key,
    nonce: secretbox::Nonce,
    key_file_path: PathBuf,
}

impl SecureKeyStorage {
    pub fn new() -> Result<Self, String> {
        // Initialize sodiumoxide (required for crypto operations)
        sodiumoxide::init().map_err(|e| e.to_string())?;
        
        // Create secure directory
        let data_dir = dirs::data_local_dir()
            .ok_or("Cannot determine data directory".to_string())?
            .join("janus-monitor")
            .join("security");
        
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create security directory: {}", e))?;
        
        let key_file_path = data_dir.join("logging_key.bin");
        
        // Try to load existing key
        if key_file_path.exists() {
            let mut file = File::open(&key_file_path)
                .map_err(|e| format!("Failed to open key file: {}", e))?;
            
            let mut key_bytes = vec![0u8; secretbox::KEYBYTES];
            let mut nonce_bytes = vec![0u8; secretbox::NONCEBYTES];
            
            file.read_exact(&mut key_bytes)
                .map_err(|e| format!("Failed to read key: {}", e))?;
            file.read_exact(&mut nonce_bytes)
                .map_err(|e| format!("Failed to read nonce: {}", e))?;
            
            let key = secretbox::Key(key_bytes);
            let nonce = secretbox::Nonce(nonce_bytes);
            
            Ok(SecureKeyStorage { key, nonce, key_file_path })
        } else {
            // Generate new key and nonce
            let key = secretbox::gen_key();
            let nonce = secretbox::gen_nonce();
            
            // Save to secure file
            let mut file = OpenOptions::new()
                .create(true)
                .write(true)
                .mode(0o600) // Owner read/write only
                .open(&key_file_path)
                .map_err(|e| format!("Failed to create key file: {}", e))?;
            
            file.write_all(key.as_ref())
                .map_err(|e| format!("Failed to write key: {}", e))?;
            file.write_all(nonce.as_ref())
                .map_err(|e| format!("Failed to write nonce: {}", e))?;
            
            // Set restrictive permissions (owner only)
            let mut perms = file.metadata()
                .map_err(|e| e.to_string())?
                .permissions();
            perms.set_mode(0o600);
            
            Ok(SecureKeyStorage { key, nonce, key_file_path })
        }
    }
    
    pub fn get_key(&self) -> secretbox::Key {
        self.key
    }
    
    pub fn get_nonce(&self) -> secretbox::Nonce {
        self.nonce
    }
    
    pub fn secure_wipe(&self) -> Result<(), String> {
        // Overwrite the key file with zeros before deletion
        let mut file = OpenOptions::new()
            .write(true)
            .truncate(true)
            .open(&self.key_file_path)
            .map_err(|e| format!("Failed to open key file for wiping: {}", e))?;
        
        let zero_bytes = vec![0u8; secretbox::KEYBYTES + secretbox::NONCEBYTES];
        file.write_all(&zero_bytes)
            .map_err(|e| format!("Failed to wipe key file: {}", e))?;
        
        std::fs::remove_file(&self.key_file_path)
            .map_err(|e| format!("Failed to delete key file: {}", e))?;
        
        Ok(())
    }
    
    /// Rotate the encryption key (generate new key while preserving old one for re-encryption)
    pub fn rotate_key(&self) -> Result<(), String> {
        // Generate new key and nonce
        let new_key = secretbox::gen_key();
        let new_nonce = secretbox::gen_nonce();
        
        // Create backup of old key (for re-encryption if needed)
        let backup_path = self.key_file_path.with_extension("bak");
        std::fs::copy(&self.key_file_path, &backup_path)
            .map_err(|e| format!("Failed to create key backup: {}", e))?;
        
        // Set restrictive permissions on backup
        let mut perms = std::fs::metadata(&backup_path)
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_mode(0o600);
        
        // Save new key
        let mut file = OpenOptions::new()
            .write(true)
            .truncate(true)
            .mode(0o600)
            .open(&self.key_file_path)
            .map_err(|e| format!("Failed to open key file for rotation: {}", e))?;
        
        file.write_all(new_key.as_ref())
            .map_err(|e| format!("Failed to write new key: {}", e))?;
        file.write_all(new_nonce.as_ref())
            .map_err(|e| format!("Failed to write new nonce: {}", e))?;
        
        // Update the global storage (this is a simplified approach)
        // In a real application, you might want to restart or reinitialize
        Ok(())
    }
    
    /// Re-encrypt existing logs with new key (after rotation)
    pub fn reencrypt_data(&self, old_key: &secretbox::Key, old_nonce: &secretbox::Nonce, 
                         encrypted_data: &str) -> Result<String, String> {
        // Decrypt with old key
        let encrypted_bytes = hex::decode(encrypted_data)
            .map_err(|e| format!("Failed to decode hex: {}", e))?;
        
        let decrypted = secretbox::open(&encrypted_bytes, old_nonce, old_key)
            .map_err(|e| format!("Failed to decrypt with old key: {}", e))?;
        
        // Re-encrypt with new key
        let new_encrypted = secretbox::seal(&decrypted, &self.nonce, &self.key);
        let new_encrypted_hex = hex::encode(new_encrypted);
        
        Ok(new_encrypted_hex)
    }
}

// Global secure key storage (initialized on first use)
static SECURE_KEY_STORAGE: OnceCell<SecureKeyStorage> = OnceCell::new();

pub fn get_secure_key_storage() -> Result<&'static SecureKeyStorage, String> {
    SECURE_KEY_STORAGE.get_or_try_init(SecureKeyStorage::new)
}

pub fn init_secure_logging() -> Result<(), String> {
    // Initialize the key storage (will be used by secure_log)
    get_secure_key_storage()?;
    Ok(())
}

pub fn shutdown_secure_logging() -> Result<(), String> {
    if let Some(storage) = SECURE_KEY_STORAGE.get() {
        storage.secure_wipe()?;
    }
    Ok(())
}

/// Rotate the encryption key and optionally re-encrypt existing data
pub fn rotate_encryption_key() -> Result<(), String> {
    let old_storage = get_secure_key_storage()?;
    
    // Rotate the key
    old_storage.rotate_key()?;
    
    // In a real application, you would:
    // 1. Load old key from backup
    // 2. Re-encrypt all sensitive data
    // 3. Update the global storage with new key
    // 4. Clean up old key backup
    
    // For now, we'll just force reinitialization on next use
    SECURE_KEY_STORAGE.take();
    
    Ok(())
}

/// Get key rotation status and information
pub fn get_key_rotation_info() -> Result<KeyRotationInfo, String> {
    let storage = get_secure_key_storage()?;
    
    let key_file_metadata = std::fs::metadata(&storage.key_file_path)
        .map_err(|e| format!("Failed to get key file metadata: {}", e))?;
    
    let backup_exists = storage.key_file_path.with_extension("bak").exists();
    
    Ok(KeyRotationInfo {
        key_file_exists: true,
        key_file_size: key_file_metadata.len(),
        key_file_modified: key_file_metadata.modified()
            .map_err(|e| e.to_string())?,
        backup_exists,
        rotation_supported: true,
    })
}

/// Key rotation information structure
#[derive(Debug, Clone)]
pub struct KeyRotationInfo {
    pub key_file_exists: bool,
    pub key_file_size: u64,
    pub key_file_modified: std::time::SystemTime,
    pub backup_exists: bool,
    pub rotation_supported: bool,
}
