import React, { useEffect, useState, useCallback, useMemo } from "react";
import Navbar from "../layout/Navbar";
import {
  Movie,
  Genre,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getNowPlayingMovies,
  getTrendingMovies,
  getMovieGenres,
  discoverMoviesByGenres,
} from "../../services/tmdbApi";
import HorizontalCarousel from "./HorizontalCarousel";
import MovieSearch from "./MovieSearch";
import { useNavigate } from "react-router-dom";

const MoviesPage: React.FC = () => {
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  const [upcoming, setUpcoming] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
          getTrendingMovies("week"),
        ]);
        setPopular(p);
        setTopRated(t);
        setNowPlaying(n);
        setUpcoming(u);
        setTrending(tr);
        setError("");
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar las listas de películas");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Cargar solo géneros primero (lazy loading de películas)
  useEffect(() => {
    const loadGenres = async () => {
      try {
        const gs = await getMovieGenres();
        setGenres(gs.slice(0, 5)); // Solo primeros 5 géneros inicialmente
      } catch (e) {
        console.error(e);
      }
    };
    loadGenres();
  }, []);

  // Cargar películas de géneros de forma lazy
  useEffect(() => {
    if (genres.length === 0) return;

    const loadGenreMovies = async () => {
      try {
        setGenresLoading(true);
        const pairs = await Promise.all(
          genres.map(async (g) => {
            const items = await discoverMoviesByGenres([g.id], 1);
            return [g.id, items] as const;
          })
        );
        const map: Record<number, Movie[]> = {};
        pairs.forEach(([id, items]) => {
          map[id] = items;
        });
        setGenreMovies(map);
      } catch (e) {
        console.error(e);
      } finally {
        setGenresLoading(false);
      }
    };

    // Delay para cargar géneros después de las secciones principales
    const timer = setTimeout(loadGenreMovies, 1000);
    return () => clearTimeout(timer);
  }, [genres]);

  const sections = useMemo(
    () => [
      { title: "Tendencias", movies: trending },
      { title: "Populares", movies: popular },
      { title: "Mejor calificadas", movies: topRated },
      { title: "En cartelera", movies: nowPlaying },
      { title: "Próximos estrenos", movies: upcoming },
    ],
    [trending, popular, topRated, nowPlaying, upcoming]
  );

  const openDetails = useCallback(
    (movie: Movie) => navigate(`/movie/${movie.id}`),
    [navigate]
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 content-container">
        <h1 className="text-3xl font-bold text-tertiary mb-6 section-title">
          Películas
        </h1>
        <div className="glass-panel p-6 mb-6">
          <h2 className="card-title mb-4">Buscar películas</h2>
          <MovieSearch onMovieSelect={openDetails} selectedMovies={[]} />
        </div>
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-accent/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-tertiary text-lg font-medium">
              Cargando películas...
            </p>
          </div>
        )}
        {!loading && (
          <>
            {sections.map((sec, i) => (
              <HorizontalCarousel
                key={sec.title}
                title={sec.title}
                movies={sec.movies}
                onSelect={openDetails}
                variant={i % 2 === 0 ? "wide" : "poster"}
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
