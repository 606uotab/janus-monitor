// monero_integration.rs - Intégration Monero pour Janus Monitor
// Ce module gère les appels RPC Monero et la gestion des wallets Monero

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use reqwest::Client;
use crate::{secure_log, log_address, log_balance};
use std::collections::HashMap;

// ============================================================================
// STRUCTURES DE DONNÉES MONERO
// ============================================================================

/// Informations sur un nœud Monero
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoneroNodeInfo {
    pub url: String,
    pub height: u64,
    pub version: String,
    pub response_time_ms: u64,
    pub is_healthy: bool,
}

/// Résultat de balance Monero
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoneroBalanceResult {
    pub balance: f64,
    pub unlocked_balance: f64,
    pub last_scanned_height: u64,
    pub network_height: u64,
    pub transactions: Vec<MoneroTransaction>,
}

/// Transaction Monero
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoneroTransaction {
    pub tx_hash: String,
    pub amount: f64,
    pub timestamp: i64,
    pub confirmations: u64,
    pub is_incoming: bool,
    pub unlocked: bool,
}

/// Données de wallet Monero pour les appels backend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoneroWalletData {
    pub address: String,
    pub view_key: String,
    pub spend_key: Option<String>,
    pub node: String,
    pub min_confirmations: u64,
    pub scan_batch_size: u64,
}

/// Erreur Monero personnalisée
#[derive(Debug, thiserror::Error)]
pub enum MoneroError {
    #[error("Adresse Monero invalide: {0}")]
    InvalidAddress(String),
    
    #[error("View key invalide: {0}")]
    InvalidViewKey(String),
    
    #[error("Spend key invalide: {0}")]
    InvalidSpendKey(String),
    
    #[error("Échec de la connexion au nœud Monero: {0}")]
    NodeConnectionFailed(String),
    
    #[error("Échec de l'appel RPC: {0}")]
    RpcCallFailed(String),
    
    #[error("Balance introuvable pour l'adresse")]
    BalanceNotFound,
    
    #[error("Timeout de la requête")]
    RequestTimeout,
}

impl Serialize for MoneroError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

// ============================================================================
// VALIDATION MONERO
// ============================================================================

/// Valider une adresse Monero
pub fn validate_monero_address(address: &str) -> Result<(), MoneroError> {
    // Une adresse Monero valide commence par 4 et fait 95 caractères
    if address.len() != 95 {
        return Err(MoneroError::InvalidAddress(format!(
            "Longueur incorrecte: {} (attendu: 95)", address.len()
        )));
    }
    
    if !address.starts_with('4') {
        return Err(MoneroError::InvalidAddress(
            "Les adresses Monero doivent commencer par '4'".to_string()
        ));
    }
    
    // Vérifier que tous les caractères sont valides (base58)
    for c in address.chars() {
        if !c.is_ascii_alphanumeric() {
            return Err(MoneroError::InvalidAddress(
                format!("Caractère invalide: {}", c)
            ));
        }
    }
    
    Ok(())
}

/// Valider une view key Monero (64 caractères hexadécimaux)
pub fn validate_view_key(view_key: &str) -> Result<(), MoneroError> {
    if view_key.len() != 64 {
        return Err(MoneroError::InvalidViewKey(format!(
            "Longueur incorrecte: {} (attendu: 64)", view_key.len()
        )));
    }
    
    if !view_key.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(MoneroError::InvalidViewKey(
            "La view key doit être en hexadécimal".to_string()
        ));
    }
    
    Ok(())
}

/// Valider une spend key Monero (64 caractères hexadécimaux, optionnelle)
pub fn validate_spend_key(spend_key: &Option<String>) -> Result<(), MoneroError> {
    if let Some(key) = spend_key {
        if key.len() != 64 {
            return Err(MoneroError::InvalidSpendKey(format!(
                "Longueur incorrecte: {} (attendu: 64)", key.len()
            )));
        }
        
        if !key.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(MoneroError::InvalidSpendKey(
                "La spend key doit être en hexadécimal".to_string()
            ));
        }
    }
    
    Ok(())
}

/// Valider les données complètes du wallet Monero
pub fn validate_monero_wallet_data(data: &MoneroWalletData) -> Result<(), MoneroError> {
    validate_monero_address(&data.address)?;
    validate_view_key(&data.view_key)?;
    validate_spend_key(&data.spend_key)?;
    
    if data.node.is_empty() {
        return Err(MoneroError::NodeConnectionFailed(
            "URL du nœud vide".to_string()
        ));
    }
    
    Ok(())
}

// ============================================================================
// CLIENT MONERO RPC
// ============================================================================

/// Client pour les appels RPC Monero
pub struct MoneroRpcClient {
    client: Client,
    node_url: String,
    timeout: std::time::Duration,
}

impl MoneroRpcClient {
    /// Créer un nouveau client Monero RPC
    pub fn new(node_url: &str) -> Self {
        Self {
            client: Client::new(),
            node_url: node_url.to_string(),
            timeout: std::time::Duration::from_secs(30),
        }
    }
    
    /// Tester la connexion au nœud
    pub async fn test_connection(&self) -> Result<MoneroNodeInfo, MoneroError> {
        let start_time = SystemTime::now();
        
        let request_body = serde_json::json!({
            "jsonrpc": "2.0",
            "id": "janus-monitor",
            "method": "get_info",
            "params": {}
        });
        
        let response = self.client
            .post(&self.node_url)
            .json(&request_body)
            .timeout(self.timeout)
            .send()
            .await
            .map_err(|e| MoneroError::NodeConnectionFailed(e.to_string()))?;
            
        if !response.status().is_success() {
            return Err(MoneroError::NodeConnectionFailed(format!(
                "Statut HTTP {}: {}", 
                response.status(), 
                response.text().await.unwrap_or_default()
            )));
        }
        
        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| MoneroError::RpcCallFailed(e.to_string()))?;
            
        let response_time = start_time.elapsed().unwrap_or_default().as_millis() as u64;
        
        // Extraire les informations
        let height = response_json["result"]["height"].as_u64().unwrap_or(0);
        let version = response_json["result"]["version"].as_str().unwrap_or("inconnu").to_string();
        
        secure_log("Monero", &format!("Connexion réussie au nœud {} - hauteur: {}", self.node_url, height));
        
        Ok(MoneroNodeInfo {
            url: self.node_url.clone(),
            height,
            version,
            response_time_ms: response_time,
            is_healthy: true,
        })
    }
    
    /// Obtenir la balance pour un wallet Monero
    pub async fn get_balance(
        &self,
        address: &str,
        view_key: &str,
        spend_key: &Option<String>,
    ) -> Result<MoneroBalanceResult, MoneroError> {
        // TODO: Implémentation réelle avec monero-rpc
        // Pour l'instant, retournons des données de test
        
        log_address("Monero", address);
        
        // Simuler un délai de scan
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        
        // Données de test - à remplacer par l'appel RPC réel
        Ok(MoneroBalanceResult {
            balance: 12.5,
            unlocked_balance: 10.2,
            last_scanned_height: 2850000,
            network_height: 2850050,
            transactions: vec![
                MoneroTransaction {
                    tx_hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6".to_string(),
                    amount: 5.0,
                    timestamp: UNIX_EPOCH.elapsed().unwrap().as_secs() as i64 - 86400, // Hier
                    confirmations: 15,
                    is_incoming: true,
                    unlocked: true,
                },
                MoneroTransaction {
                    tx_hash: "f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1".to_string(),
                    amount: 7.5,
                    timestamp: UNIX_EPOCH.elapsed().unwrap().as_secs() as i64 - 172800, // Avant-hier
                    confirmations: 25,
                    is_incoming: true,
                    unlocked: true,
                }
            ],
        })
    }
    
    /// Obtenir l'historique des transactions
    pub async fn get_transactions(
        &self,
        address: &str,
        view_key: &str,
        spend_key: &Option<String>,
        limit: u64,
    ) -> Result<Vec<MoneroTransaction>, MoneroError> {
        // TODO: Implémentation réelle
        
        log_address("Monero", address);
        
        // Simuler un délai
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        
        // Données de test
        Ok(vec![
            MoneroTransaction {
                tx_hash: "tx1_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6".to_string(),
                amount: 2.5,
                timestamp: UNIX_EPOCH.elapsed().unwrap().as_secs() as i64 - 3600, // Il y a 1 heure
                confirmations: 5,
                is_incoming: true,
                unlocked: false,
            },
            MoneroTransaction {
                tx_hash: "tx2_f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1".to_string(),
                amount: 1.8,
                timestamp: UNIX_EPOCH.elapsed().unwrap().as_secs() as i64 - 7200, // Il y a 2 heures
                confirmations: 10,
                is_incoming: true,
                unlocked: true,
            }
        ])
    }
}

// ============================================================================
// COMMANDES TAURI - MONERO
// ============================================================================

/// Tester un nœud Monero
#[tauri::command]
pub async fn test_monero_node(node_url: String) -> Result<MoneroNodeInfo, String> {
    secure_log("Monero", &format!("Test du nœud: {}", node_url));
    
    let client = MoneroRpcClient::new(&node_url);
    
    match client.test_connection().await {
        Ok(node_info) => {
            log_balance("Monero", node_info.height as f64);
            Ok(node_info)
        },
        Err(e) => {
            Err(format!("Erreur test nœud Monero: {}", e.to_string()))
        }
    }
}

/// Obtenir la balance Monero
#[tauri::command]
pub async fn get_monero_balance(
    address: String,
    view_key: String,
    spend_key: Option<String>,
    node: String,
    min_confirmations: u64,
    scan_batch_size: u64,
) -> Result<MoneroBalanceResult, String> {
    secure_log("Monero", &format!("Récupération balance pour: {}", address));
    
    // Valider les données
    let wallet_data = MoneroWalletData {
        address: address.clone(),
        view_key: view_key.clone(),
        spend_key: spend_key.clone(),
        node: node.clone(),
        min_confirmations,
        scan_batch_size,
    };
    
    if let Err(e) = validate_monero_wallet_data(&wallet_data) {
        return Err(format!("Données wallet invalides: {}", e.to_string()));
    }
    
    let client = MoneroRpcClient::new(&node);
    
    match client.get_balance(&address, &view_key, &spend_key).await {
        Ok(balance_result) => {
            log_balance("Monero", balance_result.balance);
            Ok(balance_result)
        },
        Err(e) => {
            Err(format!("Erreur balance Monero: {}", e.to_string()))
        }
    }
}

/// Obtenir l'historique des transactions Monero
#[tauri::command]
pub async fn get_monero_transactions(
    address: String,
    view_key: String,
    spend_key: Option<String>,
    node: String,
    limit: u64,
) -> Result<Vec<MoneroTransaction>, String> {
    secure_log("Monero", &format!("Récupération historique pour: {}", address));
    
    let client = MoneroRpcClient::new(&node);
    
    match client.get_transactions(&address, &view_key, &spend_key, limit).await {
        Ok(transactions) => {
            Ok(transactions)
        },
        Err(e) => {
            Err(format!("Erreur historique Monero: {}", e.to_string()))
        }
    }
}

// ============================================================================
// FONCTIONS D'UTILITAIRE
// ============================================================================

/// Masquer une clé sensible (pour les logs)
pub fn mask_monero_key(key: &str) -> String {
    if key.len() <= 8 {
        return "••••••••".to_string();
    }
    
    format!("{}••••••{}", &key[..4], &key[key.len()-4..])
}

/// Obtenir les nœuds par défaut
pub fn get_default_monero_nodes() -> Vec<String> {
    vec![
        "http://node.monerooutreach.org:18089".to_string(),
        "http://xmr-node.cakewallet.com:18089".to_string(),
        "http://node.supportxmr.com:18089".to_string(),
    ]
}

// ============================================================================
// TESTS UNITAIRES
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_monero_address() {
        // Adresse valide
        assert!(validate_monero_address("49vVtTzXfG7G6X8n6X7T8Y9U7V6W5X4Y3Z2W1X0Y9Z8X7Y6W5V4U3T2S1R0Q9P8O7N6M5L4K3J2I1H0G").is_ok());
        
        // Adresse trop courte
        assert!(validate_monero_address("49vVtTzXfG7G6X8n6X7T8Y9U7V6W5X4Y3Z2W1X0Y9Z8X7Y6W5V4U3T2S1R0Q9P8O7N6M5L4K3J2I1H0").is_err());
        
        // Adresse ne commençant pas par 4
        assert!(validate_monero_address("59vVtTzXfG7G6X8n6X7T8Y9U7V6W5X4Y3Z2W1X0Y9Z8X7Y6W5V4U3T2S1R0Q9P8O7N6M5L4K3J2I1H0G").is_err());
    }
    
    #[test]
    fn test_validate_view_key() {
        // View key valide
        assert!(validate_view_key("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6").is_ok());
        
        // View key trop courte
        assert!(validate_view_key("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f").is_err());
        
        // View key avec caractères invalides
        assert!(validate_view_key("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5g!").is_err());
    }
    
    #[test]
    fn test_mask_key() {
        assert_eq!(mask_monero_key("a1b2c3d4e5f6"), "a1b2••••••e5f6");
        assert_eq!(mask_monero_key("short"), "••••••••");
    }
}