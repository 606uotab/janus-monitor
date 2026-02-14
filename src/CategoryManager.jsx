import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Couleurs prédéfinies pour les catégories
const PRESET_COLORS = [
  { name: 'Or', color: 'text-amber-500', bar: '#f59e0b' },
  { name: 'Rouge', color: 'text-red-700', bar: '#b91c1c' },
  { name: 'Violet', color: 'text-violet-500', bar: '#8b5cf6' },
  { name: 'Bleu', color: 'text-blue-500', bar: '#3b82f6' },
  { name: 'Vert', color: 'text-emerald-500', bar: '#10b981' },
  { name: 'Rose', color: 'text-pink-500', bar: '#ec4899' },
  { name: 'Indigo', color: 'text-indigo-500', bar: '#6366f1' },
  { name: 'Cyan', color: 'text-cyan-500', bar: '#06b6d4' },
];

export default function CategoryManager({ show, onClose, categories, onUpdate, wallets, showToast }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editBarColor, setEditBarColor] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0].color);
  const [newBarColor, setNewBarColor] = useState(PRESET_COLORS[0].bar);

  if (!show) return null;

  const handleStartEdit = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setEditBarColor(category.bar_color);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showToast('⚠️ Le nom ne peut pas être vide', 2000);
      return;
    }

    try {
      await invoke('update_category', {
        id: editingId,
        name: editName.trim(),
        color: editColor,
        barColor: editBarColor,
      });
      
      setEditingId(null);
      await onUpdate();
      showToast('✅ Catégorie modifiée', 2000);
    } catch (e) {
      showToast(`❌ Erreur: ${e}`, 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (category) => {
    if (categories.length === 1) {
      showToast('⚠️ Impossible de supprimer la dernière catégorie', 3000);
      return;
    }

    const walletsCount = wallets.filter(w => w.category_id === category.id).length;
    
    let message = `Supprimer la catégorie "${category.name}" ?`;
    if (walletsCount > 0) {
      message += `\n\n⚠️ Cela supprimera aussi ${walletsCount} wallet(s) associé(s).`;
    }
    
    if (!confirm(message)) return;

    try {
      await invoke('delete_category', { id: category.id });
      await onUpdate();
      showToast(`✅ Catégorie "${category.name}" supprimée`, 2000);
    } catch (e) {
      showToast(`❌ Erreur: ${e}`, 3000);
    }
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      showToast('⚠️ Le nom ne peut pas être vide', 2000);
      return;
    }

    try {
      await invoke('add_category', {
        name: newName.trim(),
        color: newColor,
        barColor: newBarColor,
      });
      
      setNewName('');
      setNewColor(PRESET_COLORS[0].color);
      setNewBarColor(PRESET_COLORS[0].bar);
      await onUpdate();
      showToast(`✅ Catégorie "${newName}" créée`, 2000);
    } catch (e) {
      showToast(`❌ Erreur: ${e}`, 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold dark:text-white">Gérer les catégories</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              ✕
            </button>
          </div>

          {/* Liste des catégories existantes */}
          <div className="space-y-3 mb-6">
            {categories.map(cat => {
              const isEditing = editingId === cat.id;
              const walletsCount = wallets.filter(w => w.category_id === cat.id).length;

              return (
                <div key={cat.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500"
                        placeholder="Nom de la catégorie"
                      />
                      
                      <select
                        value={editColor}
                        onChange={e => {
                          const preset = PRESET_COLORS.find(p => p.color === e.target.value);
                          setEditColor(e.target.value);
                          if (preset) setEditBarColor(preset.bar);
                        }}
                        className="px-3 py-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500"
                      >
                        {PRESET_COLORS.map(p => (
                          <option key={p.color} value={p.color}>{p.name}</option>
                        ))}
                      </select>

                      <button onClick={handleSaveEdit} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                        ✓ Sauver
                      </button>
                      <button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400">
                        ✕ Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${cat.color}`}>{cat.name}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({walletsCount} wallet{walletsCount > 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="h-2 rounded-full mt-1" style={{ backgroundColor: cat.bar_color, width: '100px' }} />
                      </div>

                      <button onClick={() => handleStartEdit(cat)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        ✏️ Renommer
                      </button>
                      
                      <button
                        onClick={() => handleDelete(cat)}
                        disabled={categories.length === 1}
                        className={`px-4 py-2 rounded ${
                          categories.length === 1
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        🗑️ Supprimer
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Formulaire nouvelle catégorie */}
          <div className="border-t dark:border-gray-600 pt-6">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">➕ Nouvelle catégorie</h3>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddCategory()}
                className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="Nom de la catégorie"
              />
              
              <select
                value={newColor}
                onChange={e => {
                  const preset = PRESET_COLORS.find(p => p.color === e.target.value);
                  setNewColor(e.target.value);
                  if (preset) setNewBarColor(preset.bar);
                }}
                className="px-3 py-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                {PRESET_COLORS.map(p => (
                  <option key={p.color} value={p.color}>{p.name}</option>
                ))}
              </select>

              <button onClick={handleAddCategory} className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                Créer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
