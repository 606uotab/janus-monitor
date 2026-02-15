// Test simple pour vérifier les fonctions de PIN
// À exécuter dans la console du navigateur une fois l'application lancée

async function testPinFunctions() {
    console.log('🔍 Test des fonctions de PIN...');
    
    try {
        // 1. Tester get_profile_security
        console.log('1. Test get_profile_security...');
        const security = await invoke('get_profile_security', { profileName: 'test' });
        console.log('✅ get_profile_security fonctionne:', security);
        
        // 2. Tester set_profile_pin
        console.log('2. Test set_profile_pin...');
        const testPin = '1234';
        const testHash = await hashPin(testPin); // Utiliser la fonction hashPin du frontend
        console.log('Hash du PIN:', testHash);
        
        const setResult = await invoke('set_profile_pin', {
            profileName: 'test',
            pinHash: testHash,
            inactivityMinutes: 5
        });
        console.log('✅ set_profile_pin fonctionne:', setResult);
        
        // 3. Tester verify_profile_pin
        console.log('3. Test verify_profile_pin...');
        const verifyResult = await invoke('verify_profile_pin', {
            profileName: 'test',
            pinHash: testHash
        });
        console.log('✅ verify_profile_pin fonctionne:', verifyResult);
        
        console.log('🎉 Tous les tests de PIN ont réussi !');
        return true;
        
    } catch (error) {
        console.error('❌ Erreur dans les tests de PIN:', error);
        return false;
    }
}

// Exécuter le test (à copier-coller dans la console)
// testPinFunctions();