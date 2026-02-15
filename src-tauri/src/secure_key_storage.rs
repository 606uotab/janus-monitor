// Secure Key Storage Module
// Provides secure storage and management of cryptographic keys for logging

use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::path::PathBuf;
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
        sodiumoxide::init().map_err(|_| "sodiumoxide init failed".to_string())?;

        let data_dir = dirs::data_local_dir()
            .ok_or_else(|| "Cannot determine data directory".to_string())?
            .join("janus-monitor")
            .join("security");

        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create security directory: {}", e))?;

        let key_file_path = data_dir.join("logging_key.bin");

        if key_file_path.exists() {
            let mut file = File::open(&key_file_path)
                .map_err(|e| format!("Failed to open key file: {}", e))?;

            let mut key_bytes = vec![0u8; secretbox::KEYBYTES];
            let mut nonce_bytes = vec![0u8; secretbox::NONCEBYTES];

            file.read_exact(&mut key_bytes)
                .map_err(|e| format!("Failed to read key: {}", e))?;
            file.read_exact(&mut nonce_bytes)
                .map_err(|e| format!("Failed to read nonce: {}", e))?;

            let key = secretbox::Key::from_slice(&key_bytes)
                .ok_or_else(|| "Invalid key length".to_string())?;
            let nonce = secretbox::Nonce::from_slice(&nonce_bytes)
                .ok_or_else(|| "Invalid nonce length".to_string())?;

            Ok(SecureKeyStorage { key, nonce, key_file_path })
        } else {
            let key = secretbox::gen_key();
            let nonce = secretbox::gen_nonce();

            let mut file = OpenOptions::new()
                .create(true)
                .write(true)
                .open(&key_file_path)
                .map_err(|e| format!("Failed to create key file: {}", e))?;

            file.write_all(key.as_ref())
                .map_err(|e| format!("Failed to write key: {}", e))?;
            file.write_all(nonce.as_ref())
                .map_err(|e| format!("Failed to write nonce: {}", e))?;

            // Set restrictive permissions (owner only) on Unix
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let perms = std::fs::Permissions::from_mode(0o600);
                std::fs::set_permissions(&key_file_path, perms).ok();
            }

            Ok(SecureKeyStorage { key, nonce, key_file_path })
        }
    }

    pub fn get_key(&self) -> secretbox::Key {
        secretbox::Key::from_slice(self.key.as_ref()).unwrap()
    }

    pub fn get_nonce(&self) -> secretbox::Nonce {
        secretbox::Nonce::from_slice(self.nonce.as_ref()).unwrap()
    }

    pub fn secure_wipe(&self) -> Result<(), String> {
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

    pub fn rotate_key(&self) -> Result<(), String> {
        let new_key = secretbox::gen_key();
        let new_nonce = secretbox::gen_nonce();

        let backup_path = self.key_file_path.with_extension("bak");
        std::fs::copy(&self.key_file_path, &backup_path)
            .map_err(|e| format!("Failed to create key backup: {}", e))?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o600);
            std::fs::set_permissions(&backup_path, perms).ok();
        }

        let mut file = OpenOptions::new()
            .write(true)
            .truncate(true)
            .open(&self.key_file_path)
            .map_err(|e| format!("Failed to open key file for rotation: {}", e))?;

        file.write_all(new_key.as_ref())
            .map_err(|e| format!("Failed to write new key: {}", e))?;
        file.write_all(new_nonce.as_ref())
            .map_err(|e| format!("Failed to write new nonce: {}", e))?;

        Ok(())
    }

    pub fn reencrypt_data(&self, old_key: &secretbox::Key, old_nonce: &secretbox::Nonce,
                         encrypted_data: &str) -> Result<String, String> {
        let encrypted_bytes = hex::decode(encrypted_data)
            .map_err(|e| format!("Failed to decode hex: {}", e))?;

        let decrypted = secretbox::open(&encrypted_bytes, old_nonce, old_key)
            .map_err(|_| "Failed to decrypt with old key".to_string())?;

        let new_encrypted = secretbox::seal(&decrypted, &self.nonce, &self.key);
        Ok(hex::encode(new_encrypted))
    }
}

// Global secure key storage (initialized on first use)
static SECURE_KEY_STORAGE: OnceCell<SecureKeyStorage> = OnceCell::new();

pub fn get_secure_key_storage() -> Result<&'static SecureKeyStorage, String> {
    SECURE_KEY_STORAGE.get_or_try_init(SecureKeyStorage::new)
}

pub fn init_secure_logging() -> Result<(), String> {
    get_secure_key_storage()?;
    Ok(())
}
