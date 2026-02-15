// Test script to demonstrate secure logging system
// This would normally be in a test module, but we'll create a standalone example

use sodiumoxide::crypto::secretbox;
use hex;
use lazy_static::lazy_static;

lazy_static! {
    static ref LOG_KEY: secretbox::Key = {
        secretbox::gen_key()
    };
    static ref LOG_NONCE: secretbox::Nonce = {
        secretbox::gen_nonce()
    };
}

fn secure_log(message: &str, sensitive_data: &str) {
    let encrypted = secretbox::seal(sensitive_data.as_bytes(), &LOG_NONCE, &LOG_KEY);
    let encrypted_hex = hex::encode(encrypted);
    println!("[SECURE_LOG] {} [ENCRYPTED: {}]", message, encrypted_hex);
}

fn log_address(tag: &str, address: &str) {
    if address.is_empty() {
        println!("[{}][EMPTY_ADDRESS]", tag);
        return;
    }
    
    let display_addr = if address.len() > 10 {
        format!("{}...{}", &address[..6], &address[address.len()-4..])
    } else {
        "[SHORT_ADDR]".to_string()
    };
    
    secure_log(&format!("[{}] Address", tag), address);
    println!("[{}] Display address: {}", tag, display_addr);
}

fn log_balance(tag: &str, balance: f64) {
    let rounded = (balance * 100_000_000.0).round() / 100_000_000.0;
    let balance_str = rounded.to_string();
    
    let display_balance = if balance_str.len() > 6 {
        format!("{:.6}", rounded)
    } else {
        balance_str.clone()
    };
    
    secure_log(&format!("[{}] Balance", tag), &balance_str);
    println!("[{}] Display balance: {}", tag, display_balance);
}

fn main() {
    println!("=== Secure Logging System Demo ===\n");
    
    // Test address logging
    println!("1. Testing address logging:");
    let btc_address = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    log_address("BTC", btc_address);
    println!();
    
    // Test balance logging
    println!("2. Testing balance logging:");
    let btc_balance = 0.12345678;
    log_balance("BTC", btc_balance);
    println!();
    
    // Test with short address
    println!("3. Testing short address:");
    let short_address = "abc123";
    log_address("TEST", short_address);
    println!();
    
    // Test with empty address
    println!("4. Testing empty address:");
    log_address("TEST", "");
    println!();
    
    // Test with large balance
    println!("5. Testing large balance:");
    let large_balance = 123.456789012345;
    log_balance("BTC", large_balance);
    println!();
    
    println!("=== Demo Complete ===");
    println!("\nIn a real application, the encrypted data can be decrypted later");
    println!("using the same key and nonce for debugging purposes, while keeping");
    println!("sensitive information out of plaintext logs.");
}
