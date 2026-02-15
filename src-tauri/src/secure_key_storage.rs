// Secure Key Storage Module
// Provides secure storage and management of cryptographic keys

use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use sodiumoxide::crypto::secretbox;
use once_cell::sync::OnceCell;

/// Secure key storage in a protected file
pub struct SecureKeyStorage {
    key: secretbox::Key,
}

impl SecureKeyStorage {
    pub fn new() -> Result<Self, String> {
        sodiumoxide::init().map_err(|_| "sodiumoxide init failed".to_string())?;

        let data_dir = crate::get_data_base_dir().join("security");

        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create security directory: {}", e))?;

        let key_file_path = data_dir.join("logging_key.bin");

        if key_file_path.exists() {
            let mut file = File::open(&key_file_path)
                .map_err(|e| format!("Failed to open key file: {}", e))?;

            let mut key_bytes = vec![0u8; secretbox::KEYBYTES];
            file.read_exact(&mut key_bytes)
                .map_err(|e| format!("Failed to read key: {}", e))?;

            let key = secretbox::Key::from_slice(&key_bytes)
                .ok_or_else(|| "Invalid key length".to_string())?;

            Ok(SecureKeyStorage { key })
        } else {
            let key = secretbox::gen_key();

            let mut file = OpenOptions::new()
                .create(true)
                .write(true)
                .open(&key_file_path)
                .map_err(|e| format!("Failed to create key file: {}", e))?;

            file.write_all(key.as_ref())
                .map_err(|e| format!("Failed to write key: {}", e))?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let perms = std::fs::Permissions::from_mode(0o600);
                std::fs::set_permissions(&key_file_path, perms).ok();
            }

            Ok(SecureKeyStorage { key })
        }
    }

    pub fn get_key(&self) -> secretbox::Key {
        secretbox::Key::from_slice(self.key.as_ref()).unwrap()
    }
}

// Global secure key storage (initialized on first use)
static SECURE_KEY_STORAGE: OnceCell<SecureKeyStorage> = OnceCell::new();

pub fn get_secure_key_storage() -> Result<&'static SecureKeyStorage, String> {
    SECURE_KEY_STORAGE.get_or_try_init(SecureKeyStorage::new)
}
