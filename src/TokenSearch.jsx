import { useState, useRef, useEffect } from 'react';

export default function TokenSearch({ category, altcoins, onAddToken }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Fermer si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus l'input quand on ouvre
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filtered = altcoins.filter(a =>
    a.symbol.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (token) => {
    onAddToken(category.id, token.symbol, token.name);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton déclencheur — style compact inline */}
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1 px-2 py-1 rounded border border-zinc-700/50 hover:border-amber-500/30"
      >
        <span className="text-sm leading-none">+</span>
        Token
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Menu déroulant */}
      {open && (
        <div className="absolute right-0 z-20 w-80 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Champ de recherche intégré */}
          <div className="p-2 border-b border-zinc-700">
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher un token..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 text-zinc-100 border border-zinc-600 rounded text-sm focus:outline-none focus:border-amber-500/50 placeholder:text-zinc-500"
            />
            {search && (
              <div className="text-xs text-zinc-500 mt-1 px-1">
                {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Liste des résultats */}
          <div className="max-h-56 overflow-y-auto">
            {(search ? filtered : altcoins.slice(0, 20)).map(token => (
              <div
                key={token.symbol}
                onClick={() => handleSelect(token)}
                className="px-3 py-2.5 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-0 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-sm text-zinc-100">{token.symbol.toUpperCase()}</span>
                  <span className="text-xs text-zinc-500 ml-2">{token.name}</span>
                </div>
                <div className="flex-shrink-0">
                  {token.can_fetch ? (
                    <span className="text-xs text-green-500">✓ Auto</span>
                  ) : (
                    <span className="text-xs text-orange-400">✍ Manuel</span>
                  )}
                </div>
              </div>
            ))}

            {search && filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-zinc-500">
                Aucun token trouvé pour "{search}"
              </div>
            )}

            {!search && altcoins.length > 20 && (
              <div className="px-3 py-2 text-center text-xs text-zinc-600">
                Tapez pour filtrer parmi {altcoins.length} tokens
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
