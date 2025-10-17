import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { multiSearch, MultiResult } from '../../services/tmdbApi';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Navbar: React.FC = () => {
  const { currentUser, logout, isGuest } = useAuth();
  const navigate = useNavigate();
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';
  const avatarUrl = (currentUser as any)?.photoURL as string | undefined;
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Estado búsqueda universal
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState<MultiResult[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [openSuggest, setOpenSuggest] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!term || term.trim().length < 2) {
      setSuggestions([]);
      setOpenSuggest(false);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoadingSuggest(true);
        const res = await multiSearch(term.trim());
        setSuggestions(res.slice(0, 8));
        setOpenSuggest(true);
      } catch (e) {
        // silencioso
      } finally {
        setLoadingSuggest(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [term]);

  const handleSelect = (item: MultiResult) => {
    setOpenSuggest(false);
    setTerm('');
    if (item.media_type === 'movie') navigate(`/movie/${item.id}`);
    else if (item.media_type === 'tv') navigate(`/tv/${item.id}`);
    else navigate(`/person/${item.id}`);
  };

  const handleSubmitUniversal = async () => {
    if (!term || term.trim().length < 2) return;
    try {
      setLoadingSuggest(true);
      const res = await multiSearch(term.trim());
      setSuggestions(res.slice(0, 8));
      setOpenSuggest(true);
    } finally {
      setLoadingSuggest(false);
    }
  };

  // Menú de usuario
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const navPill = ({ isActive }: { isActive: boolean }) =>
    `${isActive ? 'glass-strong text-tertiary' : 'btn-primary'} px-4 py-1.5 text-sm rounded-full whitespace-nowrap`;

  return (
    <nav className="glass-nav bg-opacity-30 border-primary/20 shadow-md relative z-[100]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Izquierda: Nombre de la app */}
          <div className="flex items-center min-w-[96px]">
            <Link to="/" aria-label="Inicio" className="text-tertiary text-xl font-bold">
              WatchIt
            </Link>
          </div>

          {/* Centro: Navegación + Buscador */}
          <div className="flex-1 flex items-center justify-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <NavLink to="/dashboard" className={navPill}>Inicio</NavLink>
              <NavLink to="/movies" className={navPill}>Películas</NavLink>
              <NavLink to="/compare" className={navPill}>Comparaciones</NavLink>
            </div>

            {/* Buscador universal */}
            <div className="relative w-full max-w-md">
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onFocus={() => term.length >= 2 && setOpenSuggest(true)}
                placeholder="Buscar: película, serie o persona..."
                className="glass-input search-input w-full pl-4 pr-10 h-[40px] rounded-[20px] placeholder:text-tertiary/70"
              />
              <button aria-label="Buscar" className="search-icon-btn" onClick={handleSubmitUniversal}>
                <MagnifyingGlassIcon className="w-5 h-5 text-tertiary" />
              </button>
              {openSuggest && (suggestions.length > 0 || loadingSuggest) && (
                <div className="absolute z-[200] mt-2 w-full glass-panel bg-primary/90 border border-primary/60 shadow-xl rounded-xl max-h-96 overflow-auto">
                  {loadingSuggest && (
                    <div className="p-3 text-sm text-tertiary/80">Buscando...</div>
                  )}
                  {suggestions.map((s) => (
                    <button
                      key={`${s.media_type}-${s.id}`}
                      className="w-full text-left px-3 py-2 hover:bg-primary/60 transition-colors flex items-center gap-3"
                      onClick={() => handleSelect(s)}
                    >
                      <img
                        src={
                          (s as any).poster_path
                            ? `https://image.tmdb.org/t/p/w92${(s as any).poster_path}`
                            : (s as any).profile_path
                            ? `https://image.tmdb.org/t/p/w92${(s as any).profile_path}`
                            : 'https://via.placeholder.com/92x138?text=No+Image'
                        }
                        alt={(s.media_type === 'movie' ? (s as any).title : (s as any).name) as string}
                        className="w-8 h-12 object-cover rounded"
                      />
                      <div>
                        <div className="text-sm text-tertiary truncate">
                          {s.media_type === 'movie' ? (s as any).title : (s as any).name}
                        </div>
                        <div className="text-xs text-tertiary/70 truncate">
                          {s.media_type === 'movie'
                            ? 'Película'
                            : s.media_type === 'tv'
                            ? 'Serie'
                            : `Persona${(s as any).known_for_department ? ' • ' + (s as any).known_for_department : ''}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Derecha: Perfil */}
          <div className="flex items-center justify-end min-w-[120px]">
            {currentUser && !isGuest ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="btn-primary flex items-center gap-2 px-3 py-1.5"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full border border-primary/40" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/30 border border-accent/40 flex items-center justify-center text-tertiary font-bold">
                      {initial}
                    </div>
                  )}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass-panel p-2">
                    <div className="px-2 py-1 text-xs text-tertiary/70">{displayName}</div>
                    <button className="w-full text-left btn-primary px-3 py-2 mb-1" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>Mi perfil</button>
                    <button className="w-full text-left btn-primary px-3 py-2 mb-1" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>Configuraciones</button>
                    <button className="w-full text-left btn-accent px-3 py-2" onClick={handleLogout}>Cerrar sesión</button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary inline-block text-white text-sm font-medium"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;