// monero_integration.rs — Monero RPC integration for Janus Monitor
// Supports: monero daemon RPC (get_info) and monero-wallet-rpc (get_balance, get_transfers)

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoneroNodeInfo {
    pub url: String,
    pub height: u64,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: String,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
}

#[tauri::command]
pub async fn test_monero_node(node_url: String) -> Result<MoneroNodeInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    // Try daemon RPC get_info first
    let rpc_request = JsonRpcRequest {
        jsonrpc: "2.0".to_string(),
        id: "0".to_string(),
        method: "get_info".to_string(),
        params: None,
    };

    match client.post(format!("{}/json_rpc", node_url))
        .json(&rpc_request)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                if let Ok(data) = response.json::<serde_json::Value>().await {
                    if let Some(result) = data.get("result") {
                        let height = result.get("height")
                            .and_then(|h| h.as_u64())
                            .unwrap_or(0);
                        return Ok(MoneroNodeInfo {
                            url: node_url,
                            height,
                            success: true,
                            error: None,
                        });
                    }
                }
            }
            Ok(MoneroNodeInfo {
                url: node_url,
                height: 0,
                success: false,
                error: Some("Réponse invalide du nœud".to_string()),
            })
        }
        Err(e) => {
            Ok(MoneroNodeInfo {
                url: node_url,
                height: 0,
                success: false,
                error: Some(format!("Nœud inaccessible: {}", e)),
            })
        }
    }
}

#[tauri::command]
pub async fn get_monero_balance(
    _address: String,
    _view_key: String,
    _spend_key: Option<String>,
    node: String,
) -> Result<f64, String> {
    // Monero wallet-rpc get_balance — requires wallet-rpc running with wallet loaded
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let rpc_request = JsonRpcRequest {
        jsonrpc: "2.0".to_string(),
        id: "0".to_string(),
        method: "get_balance".to_string(),
        params: Some(serde_json::json!({ "account_index": 0 })),
    };

    match client.post(format!("{}/json_rpc", node))
        .json(&rpc_request)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                if let Ok(data) = response.json::<serde_json::Value>().await {
                    if let Some(result) = data.get("result") {
                        // Balance is in atomic units (piconero = 1e-12 XMR)
                        let balance_atomic = result.get("balance")
                            .and_then(|b| b.as_u64())
                            .unwrap_or(0);
                        let balance_xmr = balance_atomic as f64 / 1_000_000_000_000.0;
                        return Ok(balance_xmr);
                    }
                    if let Some(error) = data.get("error") {
                        let msg = error.get("message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("Erreur RPC inconnue");
                        return Err(format!("Erreur wallet-rpc: {}", msg));
                    }
                }
            }
            Err("Réponse invalide du wallet-rpc Monero".to_string())
        }
        Err(e) => Err(format!("Nœud wallet-rpc inaccessible: {}", e)),
    }
}

#[tauri::command]
pub async fn get_monero_transactions(
    _address: String,
    _view_key: String,
    _spend_key: Option<String>,
    node: String,
) -> Result<Vec<serde_json::Value>, String> {
    // Monero wallet-rpc get_transfers
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let rpc_request = JsonRpcRequest {
        jsonrpc: "2.0".to_string(),
        id: "0".to_string(),
        method: "get_transfers".to_string(),
        params: Some(serde_json::json!({
            "in": true,
            "out": true,
            "pending": true,
            "account_index": 0
        })),
    };

    match client.post(format!("{}/json_rpc", node))
        .json(&rpc_request)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                if let Ok(data) = response.json::<serde_json::Value>().await {
                    if let Some(result) = data.get("result") {
                        let mut txs: Vec<serde_json::Value> = Vec::new();

                        for direction in &["in", "out", "pending"] {
                            if let Some(transfers) = result.get(direction).and_then(|t| t.as_array()) {
                                for tx in transfers {
                                    let amount_atomic = tx.get("amount")
                                        .and_then(|a| a.as_u64())
                                        .unwrap_or(0);
                                    let amount_xmr = amount_atomic as f64 / 1_000_000_000_000.0;

                                    txs.push(serde_json::json!({
                                        "hash": tx.get("txid").and_then(|t| t.as_str()).unwrap_or(""),
                                        "amount": amount_xmr,
                                        "direction": direction,
                                        "height": tx.get("height").and_then(|h| h.as_u64()).unwrap_or(0),
                                        "timestamp": tx.get("timestamp").and_then(|t| t.as_u64()).unwrap_or(0),
                                        "confirmations": tx.get("confirmations").and_then(|c| c.as_u64()).unwrap_or(0),
                                    }));
                                }
                            }
                        }

                        // Sort by timestamp descending, take last 10
                        txs.sort_by(|a, b| {
                            let ta = a.get("timestamp").and_then(|t| t.as_u64()).unwrap_or(0);
                            let tb = b.get("timestamp").and_then(|t| t.as_u64()).unwrap_or(0);
                            tb.cmp(&ta)
                        });
                        txs.truncate(10);

                        return Ok(txs);
                    }
                }
            }
            Err("Réponse invalide du wallet-rpc Monero".to_string())
        }
        Err(e) => Err(format!("Nœud wallet-rpc inaccessible: {}", e)),
    }
}
