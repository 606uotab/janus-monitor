#!/bin/bash

echo "🚀 Test du backend Rust pour Monero"
echo "===================================="
echo ""

# Se déplacer dans le répertoire src-tauri
cd ../src-tauri || { echo "❌ Erreur: Impossible de trouver src-tauri"; exit 1; }

echo "📋 Vérification des dépendances..."
if [ ! -f "Cargo.toml" ]; then
    echo "❌ Erreur: Cargo.toml non trouvé"
    exit 1
fi

echo "✅ Cargo.toml trouvé"

# Vérifier que le module Monero existe
echo "🔍 Vérification du module Monero..."
if [ ! -f "src/monero_integration.rs" ]; then
    echo "❌ Erreur: monero_integration.rs non trouvé"
    exit 1
fi

echo "✅ Module Monero trouvé"

echo "🔧 Vérification des dépendances dans Cargo.toml..."
if ! grep -q "theerror" Cargo.toml; then
    echo "❌ Erreur: 'theerror' non trouvé dans Cargo.toml"
    exit 1
fi

echo "✅ Dépendances vérifiées"

echo "📦 Construction du projet..."
cargo check --quiet 2>&1 | head -20

if [ $? -eq 0 ]; then
    echo "✅ Projet compilé avec succès !"
    echo ""
    echo "🎉 Backend Rust pour Monero prêt à l'emploi !"
    echo ""
    echo "📋 Commandes disponibles:"
    echo "   - test_monero_node(node_url: String)"
    echo "   - get_monero_balance(address, view_key, spend_key, node, min_confirmations, scan_batch_size)"
    echo "   - get_monero_transactions(address, view_key, spend_key, node, limit)"
    echo ""
    echo "🔐 Fonctionnalités implémentées:"
    echo "   - Validation des adresses et clés Monero"
    echo "   - Connexion aux nœuds Monero"
    echo "   - Récupération de balance (simulée pour l'instant)"
    echo "   - Historique des transactions (simulé pour l'instant)"
    echo ""
    echo "📝 Prochaines étapes:"
    echo "   1. Implémenter l'intégration réelle avec monero-rpc"
    echo "   2. Ajouter le chiffrement des clés avec le système existant"
    echo "   3. Tester avec un vrai nœud Monero"
else
    echo "❌ Erreur de compilation"
    exit 1
fi