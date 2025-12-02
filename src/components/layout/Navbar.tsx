import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { multiSearch, MultiResult } from "../../services/tmdbApi";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { GlassElement } from "../shared/Liquid Glass/GlassElement";

const Navbar: React.FC = () => {
  const { currentUser, logout, isGuest } = useAuth();
  const navigate = useNavigate();
  const displayName = useMemo(
    () =>
      currentUser?.displayName ||
      currentUser?.email?.split("@")[0] ||
      "Usuario",
    [currentUser]
  );
  const avatarUrl = useMemo(
    () => (currentUser as any)?.photoURL as string | undefined,
    [currentUser]
  );
  const initial = useMemo(
    () => displayName.charAt(0).toUpperCase(),
    [displayName]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, [logout, navigate]);

  // Estado búsqueda universal
  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState<MultiResult[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [openSuggest, setOpenSuggest] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce para búsqueda automática (Typeahead)
  useEffect(() => {
    if (!term || term.trim().length < 2) {
      setSuggestions([]);
      setOpenSuggest(false);
      setSelectedIndex(-1);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoadingSuggest(true);
        const res = await multiSearch(term.trim());
        setSuggestions(res.slice(0, 8));
        setOpenSuggest(true);
        setSelectedIndex(-1);
      } catch (e) {
        // silencioso
      } finally {
        setLoadingSuggest(false);
      }
    }, 600); // 0.6 segundos como los otros buscadores
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [term]);

  const handleSelect = useCallback(
    (item: MultiResult) => {
      setOpenSuggest(false);
      setTerm("");
      setSelectedIndex(-1);
      if (item.media_type === "movie") navigate(`/movie/${item.id}`);
      else if (item.media_type === "tv") navigate(`/tv/${item.id}`);
      else navigate(`/person/${item.id}`);
    },
    [navigate]
  );

  const handleSubmitUniversal = useCallback(async () => {
    if (!term || term.trim().length < 2) return;

    // Si hay una opción seleccionada o sugerencias, navegar a la primera
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelect(suggestions[selectedIndex]);
      return;
    }

    if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
      return;
    }

    // Si no hay sugerencias, buscar
    try {
      setLoadingSuggest(true);
      const res = await multiSearch(term.trim());
      setSuggestions(res.slice(0, 8));
      setOpenSuggest(true);
      if (res.length > 0) {
        handleSelect(res[0]);
      }
    } finally {
      setLoadingSuggest(false);
    }
  }, [term, selectedIndex, suggestions, handleSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitUniversal();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Escape") {
        setOpenSuggest(false);
        setSelectedIndex(-1);
      }
    },
    [handleSubmitUniversal, suggestions.length]
  );

  // Menú de usuario
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Opacidad dinámica del navbar según el scroll (optimizado con throttle)
  const [navOpacity, setNavOpacity] = useState(1);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        rafRef.current = window.requestAnimationFrame(() => {
          const y = window.scrollY;
          const o = Math.max(0.25, 1 - y / 300);
          setNavOpacity(o);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Detectar si el fondo es claro u oscuro (optimizado con throttle y cache)
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const detectionRafRef = useRef<number | null>(null);

  useEffect(() => {
    let ticking = false;
    const detectBackground = () => {
      if (!ticking) {
        detectionRafRef.current = window.requestAnimationFrame(() => {
          const navElement = document.querySelector("nav");
          if (!navElement) {
            ticking = false;
            return;
          }

          const rect = navElement.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;

          navElement.style.pointerEvents = "none";
          const elementBehind = document.elementFromPoint(x, y);
          navElement.style.pointerEvents = "";

          if (elementBehind) {
            const styles = window.getComputedStyle(elementBehind);
            const bgImage = styles.backgroundImage;

            if (bgImage && bgImage !== "none") {
              setIsDarkBackground(true);
              ticking = false;
              return;
            }

            const bgColor = styles.backgroundColor;
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const r = parseInt(rgb[0]);
              const g = parseInt(rgb[1]);
              const b = parseInt(rgb[2]);
              const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
              setIsDarkBackground(luminance < 0.5);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    detectBackground();
    // Reducir frecuencia de detección en scroll/resize
    let scrollTimeout: number;
    const throttledDetect = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(detectBackground, 150);
    };

    window.addEventListener("scroll", throttledDetect, { passive: true });
    window.addEventListener("resize", throttledDetect);

    return () => {
      window.removeEventListener("scroll", throttledDetect);
      window.removeEventListener("resize", throttledDetect);
      clearTimeout(scrollTimeout);
      if (detectionRafRef.current)
        window.cancelAnimationFrame(detectionRafRef.current);
    };
  }, []);

  const navPill = useCallback(
    ({ isActive }: { isActive: boolean }) =>
      `${
        isActive
          ? "glass-strong text-tertiary font-semibold shadow-lg border-2 border-accent/60"
          : "btn-primary"
      } px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-all duration-200`,
    []
  );

  // Memoizar el icono del buscador para evitar re-renders
  const searchIcon = useMemo(
    () => (
      <MagnifyingGlassIcon
        className={`w-6 h-6 transition-all duration-300 ${
          isDarkBackground ? "text-tertiary" : "text-white"
        }`}
      />
    ),
    [isDarkBackground]
  );

  // Memoizar el texto de saludo
  const greetingText = useMemo(() => `Hola, ${displayName}`, [displayName]);

  return (
    <nav className="fixed bottom-0 inset-x-0 sm:sticky sm:top-0 shadow-lg z-[200]">
      <GlassElement
        width={0}
        height={64}
        radius={0}
        depth={6}
        strength={60}
        chromaticAberration={2}
        blur={2}
      >
        <div className="w-full px-4 sm:px-8 lg:px-10">
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center justify-between h-16 gap-8 sm:gap-12 px-2">
            {/* Izquierda: Logo de la app */}
            <div className="hidden sm:flex items-center min-w-[160px]">
              <Link
                to="/"
                aria-label="Inicio"
                className="ml-2 sm:ml-4 inline-flex items-center"
              >
                <img
                  src="/Black Minimalist Tie Film Logo.svg"
                  alt="Watchlt"
                  className="h-8 sm:h-10 w-auto"
                />
              </Link>
            </div>

            {/* Centro: Navegación + Buscador */}
            <div className="flex-1 flex items-center justify-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <NavLink to="/dashboard" className={navPill}>
                  Inicio
                </NavLink>
                <NavLink to="/movies" className={navPill}>
                  Películas
                </NavLink>
                <NavLink to="/compare" className={navPill}>
                  Comparaciones
                </NavLink>
              </div>

              {/* Buscador inline animado */}
              <GlassElement
                width={searchOpen ? 384 : 48}
                height={48}
                radius={24}
                depth={6}
                strength={70}
                chromaticAberration={2}
                blur={3}
              >
                <div
                  className={`relative hidden sm:flex items-center transition-all duration-300 ${
                    searchOpen ? "w-96 px-3 gap-2" : "w-12 h-12 justify-center"
                  }`}
                >
                  <button
                    aria-label={searchOpen ? "Buscar" : "Abrir buscador"}
                    className={`flex items-center justify-center flex-shrink-0 ${
                      searchOpen ? "w-8 h-8" : "w-full h-full"
                    }`}
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
                    {searchIcon}
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onFocus={() => term.length >= 2 && setOpenSuggest(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar: película, serie o persona..."
                    className={`flex-1 h-10 bg-transparent outline-none transition-all duration-200 overflow-hidden text-ellipsis whitespace-nowrap ${
                      isDarkBackground
                        ? "text-tertiary placeholder:text-tertiary/70"
                        : "text-white placeholder:text-white/70"
                    } ${
                      searchOpen
                        ? "opacity-100 w-full"
                        : "opacity-0 w-0 pointer-events-none"
                    }`}
                    style={{ fontSize: "15px", fontWeight: "500" }}
                  />
                  {openSuggest &&
                    (suggestions.length > 0 || loadingSuggest) &&
                    searchOpen && (
                      <div
                        className="absolute left-0 top-14 w-96 p-3 border border-white/10 rounded-xl shadow-xl"
                        style={{
                          background: "rgba(0, 0, 0, 0.75)",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                        }}
                      >
                        {loadingSuggest && (
                          <div className="p-2 text-sm text-white/80">
                            Buscando...
                          </div>
                        )}
                        {suggestions.map((s, index) => (
                          <button
                            key={`${s.media_type}-${s.id}`}
                            className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-3 rounded-lg ${
                              index === selectedIndex
                                ? "bg-white/20"
                                : "hover:bg-white/10"
                            }`}
                            onClick={() => handleSelect(s)}
                          >
                            <img
                              src={
                                (s as any).poster_path
                                  ? `https://image.tmdb.org/t/p/w92${
                                      (s as any).poster_path
                                    }`
                                  : (s as any).profile_path
                                  ? `https://image.tmdb.org/t/p/w92${
                                      (s as any).profile_path
                                    }`
                                  : "https://via.placeholder.com/92x138?text=No+Image"
                              }
                              alt={
                                (s.media_type === "movie"
                                  ? (s as any).title
                                  : (s as any).name) as string
                              }
                              className="w-8 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">
                                {s.media_type === "movie"
                                  ? (s as any).title
                                  : (s as any).name}
                              </div>
                              <div className="text-xs text-white/70 truncate">
                                {s.media_type === "movie"
                                  ? "Película"
                                  : s.media_type === "tv"
                                  ? "Serie"
                                  : `Persona${
                                      (s as any).known_for_department
                                        ? " • " +
                                          (s as any).known_for_department
                                        : ""
                                    }`}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </GlassElement>
            </div>

            {/* Derecha: Perfil */}
            <div className="flex items-center justify-end min-w-[200px]">
              {currentUser && !isGuest ? (
                <div className="relative flex items-center gap-2" ref={menuRef}>
                  <span
                    className={`hidden sm:inline transition-colors duration-300 ${
                      isDarkBackground ? "text-tertiary" : "text-white"
                    }`}
                  >
                    {greetingText}
                  </span>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="btn-primary flex items-center gap-2 px-3 py-1.5"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-7 h-7 rounded-full border border-primary/40"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-accent/30 border border-accent/40 flex items-center justify-center text-tertiary font-bold">
                        {initial}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => navigate("/settings")}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 transition-all hover:scale-105"
                    aria-label="Configuraciones"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      className="w-6 h-6 text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  </button>
                  {/* Menú desplegable con fondo oscuro */}
                  {menuOpen && (
                    <div className="absolute right-0 sm:top-full sm:mt-2 sm:origin-top bottom-full mb-2 origin-bottom z-[300]">
                      <GlassElement
                        width={208}
                        height={0}
                        radius={12}
                        depth={10}
                        strength={80}
                        chromaticAberration={3}
                        blur={4}
                      >
                        <div className="w-52 transition-all duration-200 ease-out transform opacity-100 translate-y-0 scale-100">
                          <div className="px-4 py-3 text-base text-white font-bold border-b border-white/30 mb-1">
                            {displayName}
                          </div>
                          <div className="p-2">
                            <button
                              className="w-full text-left text-white hover:bg-white/20 px-4 py-3 rounded-lg mb-1 transition-all font-medium text-sm flex items-center gap-2"
                              onClick={() => {
                                setMenuOpen(false);
                                navigate("/profile");
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-5 h-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                                />
                              </svg>
                              Mi perfil
                            </button>
                            <button
                              className="w-full text-left text-white hover:bg-red-600/50 px-4 py-3 rounded-lg transition-all font-medium text-sm flex items-center gap-2"
                              onClick={handleLogout}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-5 h-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                                />
                              </svg>
                              Cerrar sesión
                            </button>
                          </div>
                        </div>
                      </GlassElement>
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
          {/* Mobile Navigation */}
          <div className="sm:hidden h-16 px-4 flex items-center justify-around">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${
                  isActive
                    ? "glass-strong border-2 border-accent/60 shadow-lg"
                    : "btn-primary"
                } w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200`
              }
              aria-label="Inicio"
            >
              <img
                src="/home_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Inicio"
                className="w-6 h-6"
              />
            </NavLink>
            <NavLink
              to="/movies"
              className={({ isActive }) =>
                `${
                  isActive
                    ? "glass-strong border-2 border-accent/60 shadow-lg"
                    : "btn-primary"
                } w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200`
              }
              aria-label="Películas"
            >
              <img
                src="/movie_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Películas"
                className="w-6 h-6"
              />
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) =>
                `${
                  isActive
                    ? "glass-strong border-2 border-accent/60 shadow-lg"
                    : "btn-primary"
                } w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200`
              }
              aria-label="Comparaciones"
            >
              <img
                src="/compare_arrows_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg"
                alt="Comparaciones"
                className="w-6 h-6"
              />
            </NavLink>
            {currentUser && !isGuest && avatarUrl ? (
              <Link
                to="/profile"
                className="w-12 h-12 rounded-full overflow-hidden border border-primary/40"
                aria-label="Perfil"
              >
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              </Link>
            ) : (
              <Link
                to="/login"
                className="btn-primary w-12 h-12 rounded-full flex items-center justify-center"
                aria-label="Iniciar sesión"
              >
                <img
                  src="/account_circle_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg"
                  alt="Cuenta"
                  className="w-6 h-6"
                />
              </Link>
            )}
          </div>
        </div>
      </GlassElement>
    </nav>
  );
};

export default Navbar;
