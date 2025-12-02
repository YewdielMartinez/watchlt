import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../layout/Navbar";
import MovieSearch from "../movies/MovieSearch";
import MovieComparison from "../movies/MovieComparison";
import { Movie, TVShow } from "../../services/tmdbApi";
import TVSearch from "../tv/TVSearch";
import TVComparison from "../tv/TVComparison";
import {
  getCompareList,
  setCompareList,
  clearCompare,
  getCompareLimit,
} from "../../services/compareStore";
import { XMarkIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { GlassElement } from "../shared/Liquid Glass/GlassElement";
import Alert from "../shared/Alert";

const Compare: React.FC = () => {
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [selectedShows, setSelectedShows] = useState<TVShow[]>([]);
  const [mode, setMode] = useState<"movies" | "tv">("movies");
  const [isComparing, setIsComparing] = useState<boolean>(false); // Nuevo estado para controlar si está en modo comparación
  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");

  // Cargar selección persistida
  useEffect(() => {
    const init = async () => {
      try {
        const movies = getCompareList("movie");
        const shows = getCompareList("tv");
        // Los objetos persistidos son mínimos; dejamos que los componentes de comparación completen si hace falta
        setSelectedMovies(movies as any);
        setSelectedShows(shows as any);
        // No iniciar automáticamente la comparación al cargar
      } catch {}
    };
    init();
  }, []);

  const handleMovieSelect = useCallback(
    (movie: Movie) => {
      const movieLimit = getCompareLimit("movie");
      const exists = selectedMovies.find((m) => m.id === movie.id);
      if (exists) {
        const list = selectedMovies.filter((m) => m.id !== movie.id);
        setSelectedMovies(list);
        setCompareList(
          "movie",
          list.map((m) => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            vote_average: m.vote_average,
            release_date: m.release_date,
          }))
        );
      } else if (selectedMovies.length < movieLimit) {
        const list = [...selectedMovies, movie];
        setSelectedMovies(list);
        setCompareList(
          "movie",
          list.map((m) => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            vote_average: m.vote_average,
            release_date: m.release_date,
          }))
        );
      } else {
        setLimitMessage(
          `Has alcanzado el límite máximo de ${movieLimit} películas. Elimina una para agregar otra.`
        );
        setShowLimitAlert(true);
      }
    },
    [selectedMovies]
  );

  const handleShowSelect = (show: TVShow) => {
    const exists = selectedShows.find((s) => s.id === show.id);
    if (exists) {
      const list = selectedShows.filter((s) => s.id !== show.id);
      setSelectedShows(list);
      setCompareList(
        "tv",
        list.map((s) => ({
          id: s.id,
          name: s.name,
          poster_path: s.poster_path,
          vote_average: s.vote_average,
          first_air_date: s.first_air_date,
        }))
      );
    } else if (selectedShows.length < 15) {
      const list = [...selectedShows, show];
      setSelectedShows(list);
      setCompareList(
        "tv",
        list.map((s) => ({
          id: s.id,
          name: s.name,
          poster_path: s.poster_path,
          vote_average: s.vote_average,
          first_air_date: s.first_air_date,
        }))
      );
    } else {
      setLimitMessage(
        "Has alcanzado el límite máximo de 15 series. Elimina una para agregar otra."
      );
      setShowLimitAlert(true);
    }
  };

  const clearSelection = useCallback(() => {
    setSelectedMovies([]);
    setSelectedShows([]);
    clearCompare();
    setIsComparing(false);
  }, []);

  const newComparison = useCallback(() => {
    // Limpiar selección y volver al buscador para una nueva comparación
    setSelectedMovies([]);
    setSelectedShows([]);
    clearCompare();
    setIsComparing(false);
  }, []);

  const startComparison = useCallback(() => {
    // Verificar que se tengan al menos 2 películas
    const movieLimit = getCompareLimit("movie");
    if (mode === "movies" && selectedMovies.length >= 2) {
      setIsComparing(true);
    } else {
      setLimitMessage(
        `Selecciona al menos 2 películas para comenzar la comparación (hasta ${movieLimit}).`
      );
      setShowLimitAlert(true);
    }
  }, [mode, selectedMovies.length]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-tertiary section-title">
            Comparaciones
          </h1>
          {(selectedMovies.length > 0 || selectedShows.length > 0) && (
            <button className="btn text-sm" onClick={clearSelection}>
              Limpiar selección
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Mostrar buscador solo si NO está en modo comparación */}
          {!isComparing && (
            <GlassElement
              width={0}
              height={0}
              radius={16}
              depth={8}
              strength={70}
              chromaticAberration={3}
              blur={3}
            >
              <div className="p-6">
                {mode === "movies" ? (
                  <>
                    <h2 className="card-title mb-4">
                      Busca y selecciona hasta {getCompareLimit("movie")}{" "}
                      películas
                    </h2>
                    {selectedMovies.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {selectedMovies.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-primary/30"
                          >
                            <img
                              src={
                                m.poster_path
                                  ? `https://image.tmdb.org/t/p/w92${m.poster_path}`
                                  : "https://via.placeholder.com/92x138?text=No+Image"
                              }
                              alt={m.title}
                              className="w-6 h-6 rounded object-cover"
                            />
                            <span
                              className="text-sm text-tertiary max-w-[160px] truncate"
                              title={m.title}
                            >
                              {m.title}
                            </span>
                            <button
                              className="p-1 hover:bg-primary/30 rounded-full"
                              aria-label="Quitar"
                              onClick={() => handleMovieSelect(m)}
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <MovieSearch
                      onMovieSelect={handleMovieSelect}
                      selectedMovies={selectedMovies}
                    />

                    {/* Botón para iniciar comparación */}
                    {selectedMovies.length >= 2 && (
                      <div className="mt-4 flex justify-center">
                        <button
                          className="btn-primary px-8 py-3 text-base font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
                          onClick={startComparison}
                        >
                          Iniciar comparación ({selectedMovies.length}{" "}
                          películas)
                        </button>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </GlassElement>
          )}

          {/* Mostrar comparación cuando está en modo comparación */}
          {mode === "movies" && selectedMovies.length >= 2 && isComparing && (
            <GlassElement
              width={0}
              height={0}
              radius={16}
              depth={8}
              strength={70}
              chromaticAberration={3}
              blur={3}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title">Comparación</h2>
                  <button
                    className="btn-accent px-4 py-2 flex items-center gap-2 hover:scale-105 transition-transform"
                    onClick={newComparison}
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                    Nueva comparación
                  </button>
                </div>
                <MovieComparison movies={selectedMovies} />
              </div>
            </GlassElement>
          )}

          {/* Sección de series oculta temporalmente */}
        </div>
      </main>

      {/* Alerta de límite */}
      <Alert
        isOpen={showLimitAlert}
        onClose={() => setShowLimitAlert(false)}
        title="Límite alcanzado"
        message={limitMessage}
        type="warning"
      />
    </div>
  );
};

export default Compare;
