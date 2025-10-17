import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getPopularMovies, getTopRatedMovies, getUpcomingMovies, getNowPlayingMovies, getTrendingMovies, Movie } from '../../services/tmdbApi';
import { getFavoriteGenres, } from '../../services/userData';
import MovieSearch from '../movies/MovieSearch';
import Navbar from '../layout/Navbar';
import { useUI } from '../../contexts/UIContext';
import HorizontalCarousel from '../movies/HorizontalCarousel';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { currentUser, isGuest } = useAuth();
  const navigate = useNavigate();
  const { setBackgroundFromMovie } = useUI();

  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [recommended, setRecommended] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLocalLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pop, top, upc, now, trend] = await Promise.all([
          getPopularMovies(),
          getTopRatedMovies(),
          getUpcomingMovies(),
          getNowPlayingMovies(),
          getTrendingMovies(),
        ]);
        setPopular(pop);
        setTopRated(top);
        setUpcoming(upc);
        setNowPlaying(now);
        setTrendingMovies(trend);
        if (pop && pop[0]) setBackgroundFromMovie(pop[0]);

        try {
          if (currentUser?.uid) {
            const favGenres = await getFavoriteGenres(currentUser.uid);
            if (favGenres && favGenres.length) {
              const { discoverMoviesByGenres } = await import('../../services/tmdbApi');
              const rec = await discoverMoviesByGenres(favGenres.slice(0, 3));
              setRecommended(rec);
            } else {
              setRecommended([]);
            }
          } else {
            setRecommended([]);
          }
        } catch {
          // silencioso para recomendaciones
        }
      } catch (e) {
        setError('No se pudieron cargar datos');
      } finally {
        setLocalLoading(false);
      }
    };
    fetchData();
  }, [setBackgroundFromMovie, currentUser?.uid]);

  const handleOpenDetails = (movie: Movie) => {
    navigate(`/movie/${movie.id}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 content-container">
        <h1 className="text-3xl font-bold text-tertiary mb-6 section-title">
          {currentUser?.email ? `Bienvenido, ${currentUser.email}` : isGuest ? 'Bienvenido, Invitado' : 'Bienvenido'}
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="glass-panel p-6 mb-6">
              <h2 className="card-title mb-4">Buscar películas</h2>
              <MovieSearch onMovieSelect={handleOpenDetails} selectedMovies={[]} />
            </div>
            {/* Carruseles debajo del buscador */}
            {!loading && (
              <>
                {(() => {
                  const sections: { title: string; movies: Movie[] }[] = [];
                  if (recommended.length > 0) sections.push({ title: 'Recomendado para ti', movies: recommended });
                  sections.push(
                    { title: 'Tendencias', movies: trendingMovies },
                    { title: 'Populares', movies: popular },
                    { title: 'Mejor calificadas', movies: topRated },
                    { title: 'En cartelera', movies: nowPlaying },
                    { title: 'Próximos estrenos', movies: upcoming },
                  );
                  return sections.map((sec, i) => (
                    <HorizontalCarousel
                      key={sec.title}
                      title={sec.title}
                      movies={sec.movies}
                      onSelect={handleOpenDetails}
                      selectedIds={[]}
                      variant={i % 2 === 0 ? 'wide' : 'poster'}
                    />
                  ));
                })()}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;