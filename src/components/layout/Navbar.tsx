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
  const [searchOpen, setSearchOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Opacidad dinámica del navbar según el scroll
  const [navOpacity, setNavOpacity] = useState(1);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const o = Math.max(0.25, 1 - y / 300); // entre 1 (sin scroll) y 0.25
      setNavOpacity(o);
    };
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navPill = ({ isActive }: { isActive: boolean }) =>
    `${isActive ? 'glass-strong text-tertiary' : 'btn-primary'} px-4 py-1.5 text-sm rounded-full whitespace-nowrap`;

  return (
    <nav
      className="glass-nav sticky top-0 left-0 right-0 border-primary/20 shadow-md z-[200]"
      style={{
        ['--glass-bg' as any]: `rgba(244,244,244,${0.012 * navOpacity})`,
        ['--glass-border' as any]: `rgba(244,244,244,${0.08 * navOpacity})`,
      }}
    >
      <div className="w-full px-4 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16 gap-8 sm:gap-12">
          {/* Izquierda: Logo de la app */}
          <div className="flex items-center min-w-[160px]">
            <Link to="/" aria-label="Inicio" className="ml-2 sm:ml-4 inline-flex items-center">
              <img src="/Black Minimalist Tie Film Logo.svg" alt="Watchlt" className="h-8 sm:h-10 w-auto" />
            </Link>
          </div>

          {/* Centro: Navegación + Buscador */}
          <div className="flex-1 flex items-center justify-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <NavLink to="/dashboard" className={navPill}>Inicio</NavLink>
              <NavLink to="/movies" className={navPill}>Películas</NavLink>
              <NavLink to="/compare" className={navPill}>Comparaciones</NavLink>
            </div>

            {/* Buscador inline animado */}
            <div className="relative">
              <div className={`flex items-center gap-2 glass-strong rounded-full shadow-md transition-all duration-300 overflow-hidden ${searchOpen ? 'w-80 px-2' : 'w-10'}`}>
                <button
                  aria-label={searchOpen ? 'Buscar' : 'Abrir buscador'}
                  className="w-10 h-10 flex items-center justify-center"
                  aria-expanded={searchOpen}
                  onClick={() => {
                    if (!searchOpen) {
                      setSearchOpen(true);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    } else {
                      handleSubmitUniversal();
                    }
                  }}
                >
                  <MagnifyingGlassIcon className="w-5 h-5 text-tertiary transition-transform duration-200" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  onFocus={() => term.length >= 2 && setOpenSuggest(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitUniversal(); }}
                  placeholder="Buscar: película, serie o persona..."
                  className={`glass-input h-9 rounded-full flex-1 placeholder:text-tertiary/70 bg-transparent transition-opacity duration-200 ${searchOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                />
              </div>
              {openSuggest && (suggestions.length > 0 || loadingSuggest) && searchOpen && (
                <div className="absolute left-0 top-12 w-80 glass-panel p-3 border border-primary/60 rounded-xl shadow-xl">
                  {loadingSuggest && (
                    <div className="p-2 text-sm text-tertiary/80">Buscando...</div>
                  )}
                  {suggestions.map((s) => (
                    <button
                      key={`${s.media_type}-${s.id}`}
                      className="w-full text-left px-3 py-2 hover:bg-primary/60 transition-colors flex items-center gap-3 rounded-lg"
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
          <div className="flex items-center justify-end min-w-[200px]">
            {currentUser && !isGuest ? (
              <div className="relative flex items-center gap-3" ref={menuRef}>
                <span className="hidden sm:inline text-tertiary">Hola, {displayName}</span>
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
                <div
                  className={`absolute right-0 top-full mt-2 w-56 glass-panel p-2 border border-primary/60 rounded-xl shadow-xl z-[300] transition-all duration-200 ease-out origin-top transform ${menuOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}`}
                  aria-hidden={!menuOpen}
                >
                  <div className="px-2 py-1 text-xs text-tertiary/70">{displayName}</div>
                  <button className="w-full text-left btn-primary px-3 py-2 mb-1" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>Mi perfil</button>
                  <button className="w-full text-left btn-primary px-3 py-2 mb-1" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>Configuraciones</button>
                  <button className="w-full text-left btn-accent px-3 py-2" onClick={handleLogout}>Cerrar sesión</button>
                </div>
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