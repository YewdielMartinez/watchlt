import React, { useEffect, useState } from 'react';
import Navbar from '../layout/Navbar';
import { Movie, Genre, getPopularMovies, getTopRatedMovies, getUpcomingMovies, getNowPlayingMovies, getTrendingMovies, getMovieGenres, discoverMoviesByGenres } from '../../services/tmdbApi';
import HorizontalCarousel from './HorizontalCarousel';
import MovieSearch from './MovieSearch';
import { useNavigate } from 'react-router-dom';

const MoviesPage: React.FC = () => {
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Estado para géneros y sus carruseles
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState<boolean>(false);
  const [genreMovies, setGenreMovies] = useState<Record<number, Movie[]>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [p, t, n, u, tr] = await Promise.all([
          getPopularMovies(),
          getTopRatedMovies(),
          getNowPlayingMovies(),
          getUpcomingMovies(),
          getTrendingMovies('week')
        ]);
        setPopular(p); setTopRated(t); setNowPlaying(n); setUpcoming(u); setTrending(tr);
        setError('');
      } catch (e) {
        console.error(e);
        setError('No se pudieron cargar las listas de películas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Cargar géneros y sus películas para los carruseles
  useEffect(() => {
    const loadGenres = async () => {
      try {
        setGenresLoading(true);
        const gs = await getMovieGenres();
        setGenres(gs);
        const pairs = await Promise.all(
          gs.map(async (g) => {
            const items = await discoverMoviesByGenres([g.id], 1);
            return [g.id, items] as const;
          })
        );
        const map: Record<number, Movie[]> = {};
        pairs.forEach(([id, items]) => { map[id] = items; });
        setGenreMovies(map);
      } catch (e) {
        console.error(e);
      } finally {
        setGenresLoading(false);
      }
    };
    loadGenres();
  }, []);

  const openDetails = (movie: Movie) => navigate(`/movie/${movie.id}`);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <h1 className="text-3xl font-bold text-tertiary mb-6 section-title">Películas</h1>
        <div className="glass-panel p-6 mb-6">
          <h2 className="card-title mb-4">Buscar películas</h2>
          <MovieSearch onMovieSelect={openDetails} selectedMovies={[]} />
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {!loading && (
          <>
            {[
              { title: 'Tendencias', movies: trending },
              { title: 'Populares', movies: popular },
              { title: 'Mejor calificadas', movies: topRated },
              { title: 'En cartelera', movies: nowPlaying },
              { title: 'Próximos estrenos', movies: upcoming },
            ].map((sec, i) => (
              <HorizontalCarousel
                key={sec.title}
                title={sec.title}
                movies={sec.movies}
                onSelect={openDetails}
                variant={i % 2 === 0 ? 'wide' : 'poster'}
              />
            ))}
            {/* Carruseles por género */}
            {!genresLoading && genres.length > 0 && (
              <>
                {genres.map((g) => (
                  <HorizontalCarousel
                    key={`genre-${g.id}`}
                    title={g.name}
                    movies={genreMovies[g.id] || []}
                    onSelect={openDetails}
                    variant="poster"
                    viewMoreTo={`/movies/genre/${g.id}`}
                  />
                ))}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MoviesPage;