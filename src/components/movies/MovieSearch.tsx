import React, { useState, useEffect, useRef, useCallback } from "react";
import { searchMovies, Movie } from "../../services/tmdbApi";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface MovieSearchProps {
  onMovieSelect: (movie: Movie) => void;
  selectedMovies: Movie[];
}

const MovieSearch: React.FC<MovieSearchProps> = ({
  onMovieSelect,
  selectedMovies,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setLoading(true);
      setError("");
      console.log("Buscando películas con término:", term);
      const results = await searchMovies(term);
      console.log("Resultados obtenidos:", results.length);
      setSearchResults(results);
      setSelectedIndex(-1);
    } catch (err) {
      setError("Error al buscar películas");
      console.error("Error en búsqueda:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      // Cancelar debounce pendiente
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Si hay una película seleccionada o resultados, seleccionar la primera
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        onMovieSelect(searchResults[selectedIndex]);
        setSearchTerm("");
        setSearchResults([]);
        setSelectedIndex(-1);
        return;
      }

      if (searchResults.length > 0) {
        onMovieSelect(searchResults[0]);
        setSearchTerm("");
        setSearchResults([]);
        setSelectedIndex(-1);
        return;
      }

      // Si no hay resultados, buscar inmediatamente
      executeSearch(searchTerm);
    },
    [selectedIndex, searchResults, onMovieSelect, executeSearch, searchTerm]
  );

  const handleSearchClick = useCallback(() => {
    // Cancelar debounce pendiente
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Si hay resultados, seleccionar el primero
    if (searchResults.length > 0) {
      onMovieSelect(searchResults[0]);
      setSearchTerm("");
      setSearchResults([]);
      setSelectedIndex(-1);
    } else {
      executeSearch(searchTerm);
    }
  }, [searchResults, onMovieSelect, executeSearch, searchTerm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Escape") {
        setSearchResults([]);
        setSelectedIndex(-1);
      }
    },
    [searchResults.length]
  );

  // Debounce para autocompletar mientras se escribe (Typeahead)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchTerm.trim()) {
      debounceTimer.current = setTimeout(() => {
        executeSearch(searchTerm);
      }, 600); // 0.6 segundos
    } else {
      setSearchResults([]);
      setSelectedIndex(-1);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm, executeSearch]);

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar películas..."
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

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <span className="ml-3 text-tertiary">Buscando películas...</span>
        </div>
      )}

      {!loading && searchResults.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-tertiary mb-2 section-title">
            Resultados de búsqueda
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {searchResults.map((movie, index) => (
              <div
                key={movie.id}
                className={`glass-card overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  selectedMovies.find((m) => m.id === movie.id)
                    ? "border-2 border-accent shadow-2xl ring-4 ring-accent/50 scale-105 bg-accent/10"
                    : index === selectedIndex
                    ? "border-accent/60 shadow-md ring-2 ring-accent/40"
                    : "border-primary"
                }`}
                onClick={() => onMovieSelect(movie)}
              >
                <div className="relative pb-[150%]">
                  <img
                    src={
                      movie.poster_path
                        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                        : "https://via.placeholder.com/342x513?text=No+Image"
                    }
                    alt={movie.title}
                    className="absolute h-full w-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <h4 className="font-medium text-tertiary truncate text-xs">
                    {movie.title}
                  </h4>
                  <p className="text-[11px] text-tertiary opacity-80">
                    {movie.release_date
                      ? new Date(movie.release_date).getFullYear()
                      : "N/A"}{" "}
                    • {movie.vote_average.toFixed(1)}⭐
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

export default MovieSearch;
