import React, { useState, useEffect, useRef, useCallback } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { searchTV, TVShow } from "../../services/tmdbApi";

interface TVSearchProps {
  onSelect: (show: TVShow) => void;
  selectedShows: TVShow[];
}

const TVSearch: React.FC<TVSearchProps> = ({ onSelect, selectedShows }) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await searchTV(searchTerm);
      setResults(res);
      setSelectedIndex(-1);
    } catch (e) {
      console.error(e);
      setError("Error al buscar series");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Cancelar debounce pendiente
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Si hay una serie seleccionada o resultados, seleccionar la primera
    if (selectedIndex >= 0 && results[selectedIndex]) {
      onSelect(results[selectedIndex]);
      setTerm("");
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    if (results.length > 0) {
      onSelect(results[0]);
      setTerm("");
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    // Si no hay resultados, buscar inmediatamente
    executeSearch(term);
  };

  const handleSearchClick = () => {
    // Cancelar debounce pendiente
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Si hay resultados, seleccionar el primero
    if (results.length > 0) {
      onSelect(results[0]);
      setTerm("");
      setResults([]);
      setSelectedIndex(-1);
    } else {
      executeSearch(term);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setResults([]);
      setSelectedIndex(-1);
    }
  };

  // Debounce para autocompletar mientras se escribe (Typeahead)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (term.trim()) {
      debounceTimer.current = setTimeout(() => {
        executeSearch(term);
      }, 600); // 0.6 segundos
    } else {
      setResults([]);
      setSelectedIndex(-1);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [term, executeSearch]);

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative w-full">
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar series..."
            className="glass-input search-input w-full pl-4 pr-10 h-[44px] rounded-[34px] placeholder:text-tertiary/70"
          />
          <button
            type="button"
            aria-label="Buscar"
            className="search-icon-btn"
            disabled={loading}
            onClick={handleSearchClick}
          >
            <MagnifyingGlassIcon className="w-5 h-5 text-tertiary" />
          </button>
        </div>
      </form>

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-tertiary mb-2 section-title">
            Resultados de búsqueda
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {results.map((show, index) => (
              <div
                key={show.id}
                className={`glass-card overflow-hidden cursor-pointer transition-all transform hover:scale-105 ${
                  selectedShows.find((s) => s.id === show.id)
                    ? "border-accent shadow-lg"
                    : index === selectedIndex
                    ? "border-accent/60 shadow-md ring-2 ring-accent/40"
                    : "border-primary"
                }`}
                onClick={() => onSelect(show)}
              >
                <div className="relative pb-[150%]">
                  <img
                    src={
                      show.poster_path
                        ? `https://image.tmdb.org/t/p/w342${show.poster_path}`
                        : "https://via.placeholder.com/342x513?text=No+Image"
                    }
                    alt={show.name}
                    className="absolute h-full w-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <h4 className="font-medium text-tertiary truncate text-xs">
                    {show.name}
                  </h4>
                  <p className="text-[11px] text-tertiary opacity-80">
                    {show.first_air_date
                      ? new Date(show.first_air_date).getFullYear()
                      : "N/A"}{" "}
                    • {show.vote_average?.toFixed?.(1) ?? "—"}⭐
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TVSearch;
