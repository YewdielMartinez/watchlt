import React, { useEffect, useState } from 'react';
import Navbar from '../layout/Navbar';
import MovieSearch from '../movies/MovieSearch';
import MovieComparison from '../movies/MovieComparison';
import { Movie, TVShow } from '../../services/tmdbApi';
import TVSearch from '../tv/TVSearch';
import TVComparison from '../tv/TVComparison';
import { getCompareList, setCompareList, clearCompare, getCompareLimit } from '../../services/compareStore';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Compare: React.FC = () => {
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [selectedShows, setSelectedShows] = useState<TVShow[]>([]);
  const [mode, setMode] = useState<'movies' | 'tv'>('movies');

  // Cargar selección persistida
  useEffect(() => {
    const init = async () => {
      try {
        const movies = getCompareList('movie');
        const shows = getCompareList('tv');
        // Los objetos persistidos son mínimos; dejamos que los componentes de comparación completen si hace falta
        setSelectedMovies(movies as any);
        setSelectedShows(shows as any);
      } catch {}
    };
    init();
  }, []);

  const handleMovieSelect = (movie: Movie) => {
    const movieLimit = getCompareLimit('movie');
    const exists = selectedMovies.find(m => m.id === movie.id);
    if (exists) {
      const list = selectedMovies.filter(m => m.id !== movie.id);
      setSelectedMovies(list);
      setCompareList('movie', list.map(m => ({ id: m.id, title: m.title, poster_path: m.poster_path, vote_average: m.vote_average, release_date: m.release_date })));
    } else if (selectedMovies.length < movieLimit) {
      const list = [...selectedMovies, movie];
      setSelectedMovies(list);
      setCompareList('movie', list.map(m => ({ id: m.id, title: m.title, poster_path: m.poster_path, vote_average: m.vote_average, release_date: m.release_date })));
    } else {
      alert(`Solo puedes seleccionar hasta ${movieLimit} películas para comparar`);
    }
  };

  const handleShowSelect = (show: TVShow) => {
    const exists = selectedShows.find(s => s.id === show.id);
    if (exists) {
      const list = selectedShows.filter(s => s.id !== show.id);
      setSelectedShows(list);
      setCompareList('tv', list.map(s => ({ id: s.id, name: s.name, poster_path: s.poster_path, vote_average: s.vote_average, first_air_date: s.first_air_date })));
    } else if (selectedShows.length < 15) {
      const list = [...selectedShows, show];
      setSelectedShows(list);
      setCompareList('tv', list.map(s => ({ id: s.id, name: s.name, poster_path: s.poster_path, vote_average: s.vote_average, first_air_date: s.first_air_date })));
    } else {
      alert('Solo puedes seleccionar hasta 15 series para comparar');
    }
  };

  const clearSelection = () => {
    setSelectedMovies([]);
    setSelectedShows([]);
    clearCompare();
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-tertiary section-title">Comparaciones</h1>
          {(selectedMovies.length > 0 || selectedShows.length > 0) && (
            <button className="btn text-sm" onClick={clearSelection}>Limpiar selección</button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <section className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <button
                className={`btn-primary ${mode === 'movies' ? 'bg-opacity-60' : 'bg-opacity-30'}`}
                onClick={() => setMode('movies')}
              >Películas</button>
            </div>
            {mode === 'movies' ? (
              <>
                <h2 className="card-title mb-4">Busca y selecciona hasta {getCompareLimit('movie')} películas</h2>
                <MovieSearch onMovieSelect={handleMovieSelect} selectedMovies={selectedMovies} />
                {selectedMovies.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMovies.map(m => (
                      <span key={m.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-primary/30">
                        <img
                          src={m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : 'https://via.placeholder.com/92x138?text=No+Image'}
                          alt={m.title}
                          className="w-6 h-6 rounded object-cover"
                        />
                        <span className="text-sm text-tertiary max-w-[160px] truncate" title={m.title}>{m.title}</span>
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
              </>
            ) : null}
          </section>

          {mode === 'movies' && selectedMovies.length > 1 && (
            <section className="glass-panel p-6">
              <h2 className="card-title mb-4">Comparación</h2>
              <MovieComparison movies={selectedMovies} />
            </section>
          )}

          {/* Sección de series oculta temporalmente */}
        </div>
      </main>
    </div>
  );
};

export default Compare;